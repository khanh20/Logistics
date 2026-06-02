// MV3 Service Worker — cầu nối content script ↔ backend MuaHo.
// Auth: JWT nằm trong cookie HttpOnly `muaho.access` do Auth service set (FE login).
// Extension đọc cookie bằng chrome.cookies.get (đọc được cả HttpOnly), rồi gửi Bearer
// tới Module1. On 401 → gọi Auth /refresh (gửi cookie refresh) → đọc lại cookie → retry.

var DEFAULTS = {
  backendHost: "https://localhost:7167",
  webHost: "http://localhost:5173",
  authHost: "https://localhost:7237",
};

var ACCESS_COOKIE = "muaho.access";
var REFRESH_COOKIE = "muaho.refresh";

function getConfig() {
  return new Promise(function (resolve) {
    chrome.storage.sync.get(DEFAULTS, function (items) {
      resolve({
        backendHost: (items.backendHost || DEFAULTS.backendHost).replace(/\/+$/, ""),
        webHost: (items.webHost || DEFAULTS.webHost).replace(/\/+$/, ""),
        authHost: (items.authHost || DEFAULTS.authHost).replace(/\/+$/, ""),
      });
    });
  });
}

// Đọc giá trị 1 cookie theo tên. Thử lần lượt nhiều URL (authHost, backendHost, webHost)
// vì cookie domain "localhost" áp cho mọi port — nhưng chrome.cookies.get cần đúng url match.
// Fallback cuối: getAll theo name (quét mọi cookie extension có quyền đọc).
function getCookie(cfg, name) {
  function tryUrl(url) {
    return new Promise(function (resolve) {
      try {
        chrome.cookies.get({ url: url, name: name }, function (c) {
          resolve(c ? c.value : null);
        });
      } catch (e) {
        resolve(null);
      }
    });
  }
  function tryGetAll() {
    return new Promise(function (resolve) {
      try {
        chrome.cookies.getAll({ name: name }, function (list) {
          resolve(list && list.length ? list[0].value : null);
        });
      } catch (e) {
        resolve(null);
      }
    });
  }
  var urls = [cfg.authHost, cfg.backendHost, cfg.webHost].filter(Boolean);
  return urls
    .reduce(function (p, url) {
      return p.then(function (v) {
        return v || tryUrl(url);
      });
    }, Promise.resolve(null))
    .then(function (v) {
      if (v) return v;
      return tryGetAll();
    })
    .then(function (v) {
      console.log("[MuaHo] getCookie", name, "→", v ? "FOUND" : "not found",
        "(tried:", urls.join(", "), "+ getAll)");
      return v;
    });
}

function getToken(cfg) {
  return getCookie(cfg, ACCESS_COOKIE);
}

chrome.runtime.onMessage.addListener(function (req, sender, sendResponse) {
  if (req.action === "addToCart") {
    handleAddToCart(req).then(sendResponse);
    return true;
  }
  if (req.action === "getExchangeRate") {
    handleGetExchangeRate().then(sendResponse);
    return true;
  }
  if (req.action === "getCategories") {
    handleGetCategories().then(sendResponse);
    return true;
  }
  if (req.action === "getAuthState") {
    getConfig()
      .then(getToken)
      .then(function (token) {
        sendResponse({ loggedIn: !!token });
      });
    return true;
  }
  return false;
});

// ── Web MuaHo gọi extension (externally_connectable) ─────────────────────────
// Web dán URL → extension tự mở tab ẩn trang sàn → content script scrape → trả data.
chrome.runtime.onMessageExternal.addListener(function (req, sender, sendResponse) {
  if (!req || !req.action) return false;

  if (req.action === "ping") {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
    return false;
  }

  if (req.action === "scrapeUrl" && req.url) {
    scrapeUrlInHiddenTab(req.url).then(sendResponse);
    return true; // async
  }

  return false;
});

// Mở tab ẩn, chờ content script scrape xong, đóng tab. Timeout 15s.
function scrapeUrlInHiddenTab(url) {
  return new Promise(function (resolve) {
    var settled = false;
    var tabId = null;
    var timer = null;

    function cleanup(result) {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (tabId != null) {
        try { chrome.tabs.remove(tabId); } catch (e) {}
      }
      resolve(result);
    }

    try {
      chrome.tabs.create({ url: url, active: false }, function (tab) {
        if (chrome.runtime.lastError || !tab) {
          cleanup({ ok: false, reason: "cannot_open_tab" });
          return;
        }
        tabId = tab.id;

        // Timeout 15s — trang sàn load chậm / SPA chưa render.
        timer = setTimeout(function () {
          cleanup({ ok: false, reason: "timeout" });
        }, 15000);

        // Chờ tab load xong rồi yêu cầu content script scrape.
        function onUpdated(updatedTabId, info) {
          if (updatedTabId !== tabId || info.status !== "complete") return;
          chrome.tabs.onUpdated.removeListener(onUpdated);

          // Content script đã được inject (matches domain sàn). Nhờ nó scrape.
          // Cho trang 1.2s để window object / SPA kịp khởi tạo trước khi hỏi.
          setTimeout(function () {
            chrome.tabs.sendMessage(tabId, { action: "scrapeNow" }, function (resp) {
              if (chrome.runtime.lastError) {
                cleanup({ ok: false, reason: "no_content_script" });
                return;
              }
              if (resp && resp.ok && resp.data) cleanup({ ok: true, data: resp.data });
              else cleanup({ ok: false, reason: (resp && resp.reason) || "scrape_failed" });
            });
          }, 1200);
        }
        chrome.tabs.onUpdated.addListener(onUpdated);
      });
    } catch (e) {
      cleanup({ ok: false, reason: String(e) });
    }
  });
}

// Refresh: đọc cookie muaho.refresh → gửi trong body cho Auth (Auth đọc refreshToken từ body).
// Auth set lại cookie access mới → đọc lại để retry.
async function tryRefresh(cfg) {
  var refresh = await getCookie(cfg, REFRESH_COOKIE);
  if (!refresh) return null;
  try {
    var res = await fetch(cfg.authHost + "/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) return null;
    return await getToken(cfg);
  } catch (e) {
    return null;
  }
}

async function postAddToCart(cfg, token, data) {
  return fetch(cfg.backendHost + "/api/cart/add-from-extension", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify(data),
  });
}

async function handleAddToCart(req) {
  var cfg = await getConfig();
  var token = await getToken(cfg);
  if (!token) return { ok: false, status: "login_required" };

  try {
    var res = await postAddToCart(cfg, token, req.data);

    if (res.status === 401) {
      var newToken = await tryRefresh(cfg);
      if (!newToken) return { ok: false, status: "login_required", httpStatus: 401 };
      res = await postAddToCart(cfg, newToken, req.data);
      if (res.status === 401) return { ok: false, status: "login_required", httpStatus: 401 };
    }

    var body = null;
    try {
      body = await res.json();
    } catch (e) {
      body = null;
    }
    return { ok: res.ok, httpStatus: res.status, body: body };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function handleGetExchangeRate() {
  var cfg = await getConfig();
  try {
    var res = await fetch(cfg.backendHost + "/api/exchange-rates/current");
    var body = await res.json();
    var rate = body && body.data && body.data.rateVndPerCny;
    return { ok: res.ok && !!rate, rateVndPerCny: rate };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function handleGetCategories() {
  var cfg = await getConfig();
  try {
    var res = await fetch(cfg.backendHost + "/api/categories");
    var body = await res.json();
    var cats = body && body.data ? body.data : [];
    return { ok: res.ok, categories: cats };
  } catch (e) {
    return { ok: false, error: String(e), categories: [] };
  }
}
