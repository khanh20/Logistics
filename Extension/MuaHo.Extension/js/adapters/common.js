// CommonTool — tiện ích dùng chung cho mọi adapter (chạy trong content script ISOLATED world).
// Expose qua window.MuaHoCommon.

(function () {
  // ── Dict dịch CN→VN cho keyword thuộc tính thường gặp ─────────────────────
  var TRANSLATE_LIB = {
    "颜色": "Màu",
    "颜色分类": "Phân loại màu",
    "尺码": "Kích cỡ",
    "尺寸": "Kích thước",
    "鞋码": "Size giày",
    "规格": "Quy cách",
    "型号": "Model",
    "套餐": "Combo",
    "版本": "Phiên bản",
    "容量": "Dung lượng",
    "数量": "Số lượng",
    "价格": "Giá",
    "材质": "Chất liệu",
    "风格": "Phong cách",
    "品牌": "Thương hiệu",
    "默认": "Mặc định",
  };

  // ── Cache data từ page context (getGlobalData.js → CustomEvent) ────────────
  var pageData = null;
  document.addEventListener("MUAHO_PAGE_DATA", function (e) {
    if (e && e.detail) pageData = e.detail;
  });

  var Common = {
    // Lấy data mới nhất mà page context đã dispatch.
    getPageData: function () {
      return pageData;
    },

    // Detect sàn từ URL hiện tại.
    getHomeLand: function () {
      var url = location.href;
      if (/1688\.com/.test(url)) return "1688";
      if (/tmall\.com|tmall\.hk/.test(url)) return "TMALL";
      if (/taobao\.com/.test(url)) return "TAOBAO";
      if (/rakuten\.co\.jp/.test(url)) return "RAKUTEN";
      return null;
    },

    // Extension context còn sống không? Sau khi reload extension nhưng tab cũ chưa F5,
    // chrome.runtime.id == undefined và getURL() trả "chrome-extension://invalid/".
    isAlive: function () {
      try {
        return !!(chrome && chrome.runtime && chrome.runtime.id);
      } catch (e) {
        return false;
      }
    },

    // getURL an toàn — trả null nếu context đã chết (tránh request "invalid").
    getURL: function (path) {
      if (!Common.isAlive()) return null;
      try {
        return chrome.runtime.getURL(path);
      } catch (e) {
        return null;
      }
    },

    // Inject 1 script file (page-context) vào trang. Dùng cho getGlobalData / inject_script.
    injectPageScript: function (file) {
      var url = Common.getURL(file);
      if (!url) return;
      try {
        var s = document.createElement("script");
        s.src = url;
        s.onload = function () {
          this.remove();
        };
        (document.head || document.documentElement).appendChild(s);
      } catch (e) {
        // ignore
      }
    },

    // Dịch 1 keyword qua dict; không match thì trả nguyên.
    translateKeyword: function (key) {
      if (!key) return key;
      var k = String(key).trim();
      return TRANSLATE_LIB[k] || k;
    },

    // Dịch chuỗi properties dạng "颜色:红色;尺码:XL" → "Màu:红色;Kích cỡ:XL"
    translateProps: function (props) {
      if (!props) return props;
      return String(props)
        .split(";")
        .map(function (pair) {
          var kv = pair.split(":");
          if (kv.length === 2) return Common.translateKeyword(kv[0]) + ":" + kv[1];
          return pair;
        })
        .join(";");
    },

    // Parse số từ text giá: "￥1,299.00" → 1299.00
    parsePrice: function (text) {
      if (text == null) return 0;
      var m = String(text).match(/[0-9]+[.,]?[0-9]*/g);
      if (!m || !m.length) return 0;
      return parseFloat(m[0].replace(/,/g, "")) || 0;
    },

    // Format số VND có dấu chấm phân cách: 350000 → "350.000"
    formatVnd: function (n) {
      var x = Math.round(Number(n) || 0);
      return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    },

    // Quy đổi CNY → VND theo tỉ giá hiện tại trong MUAHO config.
    cnyToVnd: function (cny) {
      return (Number(cny) || 0) * (MUAHO.exchangeRateVndPerCny || 3480);
    },

    // Chuẩn hoá ảnh: bỏ suffix resize của Alibaba CDN để lấy ảnh gốc.
    normalizeImage: function (url) {
      if (!url) return url;
      var u = String(url);
      if (u.indexOf("//") === 0) u = "https:" + u;
      return u
        .replace(/\.\d+x\d+(\.\w+)?$/, "")
        .replace(/\.jpg_\d+x\d+.*$/, ".jpg")
        .replace(/_\d+x\d+\.jpg$/, ".jpg");
    },

    // Đọc query param từ URL hiện tại.
    getUrlParam: function (name) {
      var n = name.replace(/[[]/, "\\[").replace(/[\]]/, "\\]");
      var r = new RegExp("[?&]" + n + "=([^&#]*)").exec(location.search);
      return r === null ? "" : decodeURIComponent(r[1].replace(/\+/g, " "));
    },

    // Đọc <meta property=...> hoặc <meta name=...> → content.
    metaContent: function (prop) {
      var el =
        document.querySelector('meta[property="' + prop + '"]') ||
        document.querySelector('meta[name="' + prop + '"]');
      return el ? (el.getAttribute("content") || "").trim() : "";
    },

    // Tìm <script type="application/ld+json"> có @type=Product → {name, image, offers}.
    readJsonLdProduct: function () {
      var scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (var i = 0; i < scripts.length; i++) {
        try {
          var data = JSON.parse(scripts[i].textContent);
          var arr = Array.isArray(data) ? data : [data];
          for (var j = 0; j < arr.length; j++) {
            var o = arr[j];
            if (o && (o["@type"] === "Product" || o.name)) return o;
          }
        } catch (e) {
          // skip invalid JSON
        }
      }
      return null;
    },

    // Bỏ hậu tố tên sàn khỏi document.title (vd "Áo thun - 淘宝网" → "Áo thun").
    stripSiteSuffix: function (title) {
      if (!title) return "";
      return String(title)
        .replace(/[-_|]\s*(淘宝网|淘宝|天猫|Tmall|Taobao|TMALL|1688|阿里巴巴)\s*$/i, "")
        .replace(/^\s*【.*?】\s*/, "") // bỏ tag 【...】 đầu nếu có
        .trim();
    },

    // Merge nhiều kết quả tier theo priority (phần tử đầu ưu tiên cao nhất).
    // Mỗi field: lấy giá trị non-empty đầu tiên theo thứ tự.
    mergePriority: function (results) {
      var out = {};
      var valid = results.filter(Boolean);
      var keys = {};
      valid.forEach(function (r) {
        Object.keys(r).forEach(function (k) {
          keys[k] = true;
        });
      });
      Object.keys(keys).forEach(function (k) {
        for (var i = 0; i < valid.length; i++) {
          var v = valid[i][k];
          var empty =
            v == null ||
            v === "" ||
            (Array.isArray(v) && v.length === 0);
          if (!empty) {
            out[k] = v;
            break;
          }
        }
      });
      return out;
    },
  };

  window.MuaHoCommon = Common;
})();
