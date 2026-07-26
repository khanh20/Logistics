// MV3 Service Worker — cầu nối content script ↔ backend MuaHo.
// Auth: JWT nằm trong cookie HttpOnly `muaho.access` do Auth service set (FE login).
// Extension đọc cookie bằng chrome.cookies.get (đọc được cả HttpOnly), rồi gửi Bearer
// tới Module1. On 401 → gọi Auth /refresh (gửi cookie refresh) → đọc lại cookie → retry.

var DEFAULTS = {
  backendHost: "http://localhost:5066",
  webHost: "http://localhost:5173",
  authHost: "http://localhost:5016",
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

// Token do web MuaHo (FE) đẩy sang qua onMessageExternal — ưu tiên hơn cookie.
// Giải quyết trường hợp FE deploy (Vercel): cookie nằm ở domain ngrok / bị chặn third-party.
function getPushedToken() {
  return new Promise(function (resolve) {
    try {
      chrome.storage.local.get({ pushedToken: null, pushedTokenExp: 0 }, function (o) {
        var t = o.pushedToken;
        if (t && o.pushedTokenExp && Date.now() > o.pushedTokenExp) t = null; // hết hạn → bỏ
        resolve(t || null);
      });
    } catch (e) { resolve(null); }
  });
}

function getToken(cfg) {
  // 1) Token FE đẩy sang (không cần cookie). 2) fallback cookie (dev local).
  return getPushedToken().then(function (t) {
    return t || getCookie(cfg, ACCESS_COOKIE);
  });
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

  // FE đẩy access token sang (thay cho việc extension phải đọc cookie).
  if (req.action === "setAuth" && req.token) {
    chrome.storage.local.set({
      pushedToken: req.token,
      pushedTokenExp: req.expiresAt ? new Date(req.expiresAt).getTime() : 0,
    }, function () { sendResponse({ ok: true }); });
    return true; // async
  }

  if (req.action === "clearAuth") {
    chrome.storage.local.remove(["pushedToken", "pushedTokenExp"], function () {
      sendResponse({ ok: true });
    });
    return true; // async
  }

  if (req.action === "scrapeUrl" && req.url) {
    scrapeUrlInHiddenTab(req.url).then(sendResponse);
    return true; // async
  }

  return false;
});

// Mở tab ẩn, hỏi content script tới khi có data, rồi đóng tab.
//
// Vòng thử lại đặt ở service worker chứ không phải setInterval trong content
// script: tab nền bị Chrome ép timer >=1s, còn service worker thì không. Cũng
// không dùng tabs.onUpdated nữa — nếu tab đạt "complete" trước lúc listener kịp
// gắn thì event mất luôn và cả lượt scrape treo tới hết timeout.
var SCRAPE_DEADLINE_MS = 30000;
var SCRAPE_PROBE_MS = 800;
// platformProductId lấy từ URL và giá có thể đọc được từ DOM trước khi window
// data (chứa imageList) kịp có. Nên snapshot "có giá" chưa chắc đã đủ ảnh: giữ
// nó lại làm dự phòng và hỏi thêm chừng này nữa để đợi ảnh, hết thì trả tạm.
var SCRAPE_IMAGE_GRACE_MS = 15000;

function scrapeUrlInHiddenTab(url) {
  return new Promise(function (resolve) {
    var settled = false;
    var tabId = null;
    var timer = null;
    var probeTimer = null;
    var startedAt = Date.now();
    var probes = 0;
    var lastErr = "";
    var best = null;      // snapshot có giá nhưng chưa đủ ảnh
    var bestAt = 0;

    function cleanup(result) {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (probeTimer) clearTimeout(probeTimer);
      if (tabId != null) {
        try { chrome.tabs.remove(tabId); } catch (e) {}
      }
      console.log("[MuaHo] scrape", (Date.now() - startedAt) + "ms",
        result.ok ? (result.partial ? "OK(thieu anh)" : "OK") : ("FAIL:" + result.reason),
        "probes=" + probes, url);
      resolve(result);
    }

    function hasImages(d) {
      return !!(d && d.imageUrls && d.imageUrls.length);
    }

    // Hết giờ mà vẫn chưa có ảnh thì trả snapshot tốt nhất còn hơn trả lỗi.
    function finishWithBest(reasonIfNone) {
      if (best) cleanup({ ok: true, data: best, partial: true });
      else cleanup({ ok: false, reason: reasonIfNone });
    }

    // Hỏi liên tục từ lúc tab vừa tạo. Các lượt đầu chắc chắn trượt (content
    // script chưa inject / trang chưa có window data) — đó là chuyện bình thường.
    function probe() {
      if (settled) return;
      probes++;
      chrome.tabs.sendMessage(tabId, { action: "scrapeOnce" }, function (resp) {
        if (settled) return;
        if (chrome.runtime.lastError) {
          lastErr = chrome.runtime.lastError.message || "no_content_script";
        } else if (resp && resp.ok && resp.data) {
          if (hasImages(resp.data)) {
            cleanup({ ok: true, data: resp.data });
            return;
          }
          // Có giá nhưng window data (imageList) chưa tới — đợi thêm chút.
          best = resp.data;
          if (!bestAt) bestAt = Date.now();
          if (Date.now() - bestAt >= SCRAPE_IMAGE_GRACE_MS) {
            finishWithBest("no_data");
            return;
          }
          lastErr = "no_images";
        } else if (resp && resp.reason) {
          lastErr = resp.reason;
        }
        probeTimer = setTimeout(probe, SCRAPE_PROBE_MS);
      });
    }

    try {
      chrome.tabs.create({ url: url, active: false }, function (tab) {
        if (chrome.runtime.lastError || !tab) {
          cleanup({ ok: false, reason: "cannot_open_tab" });
          return;
        }
        tabId = tab.id;

        timer = setTimeout(function () {
          finishWithBest("timeout" + (lastErr ? " (" + lastErr + ")" : ""));
        }, SCRAPE_DEADLINE_MS);

        probe();
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
      headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
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
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true", // demo qua ngrok: né trang cảnh báo HTML
      Authorization: "Bearer " + token,
    },
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
    var res = await fetch(cfg.backendHost + "/api/exchange-rates/current", {
      headers: { "ngrok-skip-browser-warning": "true" },
    });
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
    var res = await fetch(cfg.backendHost + "/api/categories", {
      headers: { "ngrok-skip-browser-warning": "true" },
    });
    var body = await res.json();
    var cats = body && body.data ? body.data : [];
    return { ok: res.ok, categories: cats };
  } catch (e) {
    return { ok: false, error: String(e), categories: [] };
  }
}
