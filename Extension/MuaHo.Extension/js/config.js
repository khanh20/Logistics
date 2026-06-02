// Config toàn cục cho content script. Được load đầu tiên trong content_scripts.
// Các biến này dùng chung giữa common.js / adapters / script.js.

var MUAHO = {
  // Backend domain — đọc từ chrome.storage.sync (options page), fallback localhost dev.
  backendHost: "https://localhost:7167",
  // Web app domain (để mở giỏ hàng / login).
  webHost: "http://localhost:5173",
  // Endpoint API.
  addToCartPath: "/api/cart/add-from-extension",
  healthPath: "/api/cart/extension/health",
  exchangeRatePath: "/api/exchange-rates/current",
  categoryTreePath: "/api/categories",
  // Tỉ giá VND/CNY — cache lại sau khi fetch từ backend, fallback tạm 3480.
  exchangeRateVndPerCny: 3480,
  // Bật dịch tiêu đề/thuộc tính CN→VN bằng dict built-in.
  isTranslate: true,
  // Version tool — gửi kèm payload để backend log.
  version: "1.0.0",
};

// Override từ settings người dùng (options page).
try {
  chrome.storage.sync.get(
    {
      backendHost: MUAHO.backendHost,
      webHost: MUAHO.webHost,
      isTranslate: MUAHO.isTranslate,
    },
    function (items) {
      MUAHO.backendHost = (items.backendHost || MUAHO.backendHost).replace(/\/+$/, "");
      MUAHO.webHost = (items.webHost || MUAHO.webHost).replace(/\/+$/, "");
      MUAHO.isTranslate = items.isTranslate;
    }
  );
} catch (e) {
}

// Helper build full URL.
MUAHO.api = function (path) {
  return MUAHO.backendHost.replace(/\/+$/, "") + path;
};
