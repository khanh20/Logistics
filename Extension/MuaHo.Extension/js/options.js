// Options page — lưu/đọc cấu hình vào chrome.storage.sync.

var DEFAULTS = {
  backendHost: "https://localhost:7167",
  webHost: "http://localhost:5173",
  authHost: "https://localhost:7237",
  isTranslate: true,
};

document.addEventListener("DOMContentLoaded", function () {
  chrome.storage.sync.get(DEFAULTS, function (items) {
    document.getElementById("backendHost").value = items.backendHost;
    document.getElementById("webHost").value = items.webHost;
    document.getElementById("authHost").value = items.authHost;
    document.getElementById("isTranslate").checked = items.isTranslate;
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
