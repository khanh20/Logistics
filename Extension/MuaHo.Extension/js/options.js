// Options page — lưu/đọc cấu hình vào chrome.storage.sync.

var DEFAULTS = {
  backendHost: "http://localhost:5066",
  webHost: "http://localhost:3000",
  authHost: "http://localhost:5016",
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
