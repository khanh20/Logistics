// Popup logic — kiểm tra kết nối backend + hiển thị tỉ giá, link giỏ hàng / cài đặt.

var DEFAULTS = {
  backendHost: "https://localhost:7167",
  webHost: "http://localhost:5173",
};

document.addEventListener("DOMContentLoaded", function () {
  chrome.storage.sync.get(DEFAULTS, function (cfg) {
    var backendHost = (cfg.backendHost || DEFAULTS.backendHost).replace(/\/+$/, "");
    var webHost = (cfg.webHost || DEFAULTS.webHost).replace(/\/+$/, "");

    document.getElementById("open-cart").setAttribute("href", webHost + "/cart");

    // Health check
    fetch(backendHost + "/api/cart/extension/health")
      .then(function (r) {
        return r.ok ? r.json() : Promise.reject();
      })
      .then(function () {
        setStatus(true, "Đã kết nối MuaHo");
      })
      .catch(function () {
        setStatus(false, "Không kết nối được backend");
      });

    // Exchange rate
    fetch(backendHost + "/api/exchange-rates/current")
      .then(function (r) {
        return r.json();
      })
      .then(function (body) {
        var rate = body && body.data && body.data.rateVndPerCny;
        document.getElementById("rate-val").textContent = rate
          ? "1¥ = " + formatVnd(rate) + "₫"
          : "—";
      })
      .catch(function () {});
  });

  document.getElementById("open-options").addEventListener("click", function (e) {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
});

function setStatus(ok, text) {
  var dot = document.getElementById("conn-dot");
  dot.className = "dot " + (ok ? "ok" : "off");
  document.getElementById("conn-text").textContent = text;
}

function formatVnd(n) {
  return Math.round(Number(n) || 0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
