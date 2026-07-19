// Options page — lưu/đọc cấu hình vào chrome.storage.sync.

var DEFAULTS = {
  backendHost: "http://localhost:5066",
  webHost: "http://localhost:3000",
  authHost: "http://localhost:5016",
  isTranslate: true,
};

// backendHost để THẲNG localhost (extension ở máy local gọi backend trực tiếp, nhanh,
// khỏi qua ngrok/trang cảnh báo). Riêng authHost ở preset "demo" trỏ domain NGROK vì
// khi đăng nhập trên Vercel, cookie muaho.access bị set trên domain ngrok (host-only),
// nên phải đọc cookie từ đó. webHost = FE để "mở giỏ / đăng nhập" trỏ đúng.
var NGROK = "https://climatologic-engrained-dann.ngrok-free.dev";
var PRESETS = {
  local: { backendHost: "http://localhost:5066", webHost: "http://localhost:3000",      authHost: "http://localhost:5016" },
  demo:  { backendHost: "http://localhost:5066", webHost: "https://muaho-fe.vercel.app", authHost: NGROK },
};

document.addEventListener("DOMContentLoaded", function () {
  chrome.storage.sync.get(DEFAULTS, function (items) {
    document.getElementById("backendHost").value = items.backendHost;
    document.getElementById("webHost").value = items.webHost;
    document.getElementById("authHost").value = items.authHost;
    document.getElementById("isTranslate").checked = items.isTranslate;
  });

  // Chọn preset → tự điền 3 ô (người dùng bấm "Lưu cài đặt" để áp).
  document.getElementById("preset").addEventListener("change", function () {
    var p = PRESETS[this.value];
    if (!p) return;
    document.getElementById("backendHost").value = p.backendHost;
    document.getElementById("webHost").value = p.webHost;
    document.getElementById("authHost").value = p.authHost;
  });

  document.getElementById("save").addEventListener("click", function () {
    var data = {
      backendHost: document.getElementById("backendHost").value.trim().replace(/\/+$/, ""),
      webHost: document.getElementById("webHost").value.trim().replace(/\/+$/, ""),
      authHost: document.getElementById("authHost").value.trim().replace(/\/+$/, ""),
      isTranslate: document.getElementById("isTranslate").checked,
    };
    chrome.storage.sync.set(data, function () {
      var s = document.getElementById("saved");
      s.style.display = "inline";
      setTimeout(function () {
        s.style.display = "none";
      }, 1500);
    });
  });
});
