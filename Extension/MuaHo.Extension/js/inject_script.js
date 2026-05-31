// CHẠY TRONG PAGE CONTEXT (inject qua <script src> bởi common.js).
// Fallback path: ghi snapshot window data vào hidden div để content script đọc qua DOM
// nếu CustomEvent (getGlobalData.js) vì lý do nào đó không reach được.
(function () {
  if (document.getElementById("_muahoData")) return;

  var raw = null;
  try {
    if (window.iDetailData) raw = window.iDetailData;
    else if (window.context && window.context.result) raw = window.context.result.global;
    else if (window.__INIT_DATA) raw = window.__INIT_DATA;
    else if (window.__GLOBAL_DATA) raw = window.__GLOBAL_DATA;
  } catch (e) {
    raw = null;
  }

  if (!raw) return;

  var el = document.createElement("div");
  el.id = "_muahoData";
  el.style.display = "none";
  try {
    el.textContent = JSON.stringify(raw);
  } catch (e) {
    el.textContent = "";
  }
  document.body.insertBefore(el, document.body.firstChild);
})();
