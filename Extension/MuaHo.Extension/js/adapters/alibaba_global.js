// Adapter Alibaba.com (B2B quốc tế) — Expose window.MuaHoAdapters["ALIBABA"].
// Khác 1688: giá thường niêm yết USD, có MOQ + ladder price (bậc giá theo SL).
// Nguồn data: window.runParams.data (getGlobalData → MUAHO_PAGE_DATA) + DOM fallback.

(function () {
  var C = window.MuaHoCommon;

  var adapter = {
    platform: "ALIBABA",

    // productId từ URL: www.alibaba.com/product-detail/..._{id}.html
    getProductId: function () {
      var m =
        location.href.match(/_(\d{6,})\.html/) ||
        location.href.match(/product-detail\/[^/]*?(\d{6,})/) ||
        location.href.match(/[?&]productId=(\d+)/);
      return m ? m[1] : "";
    },

    scrape: function () {
      var page = C.getPageData() || {};
      var confidence = "high";

      // ── Title ────────────────────────────────────────────────────────────
      var title =
        page.title ||
        this.domText("h1.product-title-container, h1[class*='title'], .id-mt-0") ||
        document.title;

      // ── Giá + ladder tiers ───────────────────────────────────────────────
      var currency = page.currency || "USD";
      var priceTiers = [];
      var priceOriginal = 0;
      if (Array.isArray(page.priceRange) && page.priceRange.length) {
        var sorted = page.priceRange
          .slice()
          .sort(function (a, b) {
            return a[0] - b[0];
          })
          .filter(function (pair, idx, arr) {
            return idx === 0 || (Number(pair[0]) || 1) !== (Number(arr[idx - 1][0]) || 1);
          });
        sorted.forEach(function (pair, idx, arr) {
          var min = Math.max(Number(pair[0]) || 1, 1);
          var max = idx + 1 < arr.length ? Math.max(Number(arr[idx + 1][0]) || 1, 1) - 1 : null;
          if (max != null && max < min) return; 
          priceTiers.push({ minQuantity: min, maxQuantity: max, priceOriginal: pair[1] });
        });
        if (priceTiers.length) priceOriginal = priceTiers[0].priceOriginal;
      } else {
        // DOM fallback — Alibaba dùng US$ trên trang
        var priceText = this.domText(
          "[class*='price'] [class*='value'], .product-price, [class*='Price'] span"
        );
        priceOriginal = C.parsePrice(priceText);
        confidence = "medium";
      }

      // ── Ảnh ──────────────────────────────────────────────────────────────
      var images = [];
      if (Array.isArray(page.imageList)) images = page.imageList.map(C.normalizeImage);
      else if (page.image) images = [C.normalizeImage(page.image)];
      if (!images.length) {
        document
          .querySelectorAll("[class*='gallery'] img, [class*='thumb'] img, .detail-gallery img")
          .forEach(function (img) {
            var src = img.getAttribute("src") || img.getAttribute("data-src");
            if (src) images.push(C.normalizeImage(src));
          });
      }
      images = images.filter(function (v, i, a) {
        return v && a.indexOf(v) === i;
      });

      // ── Shop ─────────────────────────────────────────────────────────────
      var shopName =
        page.companyName ||
        this.domText("[class*='company-name'], a[class*='companyName'], .company-name") ||
        "Alibaba Supplier";
      var sellerId = (page.sellerId && String(page.sellerId)) || "";

      // ── Variant ──────────────────────────────────────────────────────────
      var selectedProps = this.readSelectedProps();

      return {
        platform: "ALIBABA",
        platformProductId: this.getProductId(),
        shopIdOnPlatform: sellerId || "unknown",
        shopName: shopName,
        shopUrl: null,
        titleOriginal: (title || "").trim(),
        titleTranslated: null,
        priceOriginal: priceOriginal,
        pricePromotion: null,
        currency: currency,
        stock: null,
        primaryImageUrl: images[0] || null,
        imageUrls: images,
        propertiesOriginal: selectedProps || null,
        propertiesTranslated: selectedProps ? C.translateProps(selectedProps) : null,
        selectedSkuId: "",
        priceTiers: priceTiers,
        originalUrl: location.href.split("?")[0],
        confidence: priceOriginal > 0 ? confidence : "low",
      };
    },

    readSelectedProps: function () {
      var parts = [];
      document
        .querySelectorAll("[class*='sku-item'], [class*='attribute'] [class*='selected']")
        .forEach(function (g) {
          if (/selected|active/i.test(g.className)) parts.push(g.textContent.trim());
        });
      return parts.join(";");
    },

    domText: function (selector) {
      var el = document.querySelector(selector);
      return el ? el.textContent.trim() : "";
    },

    watchVariantChange: function (callback) {
      var self = this;
      var target =
        document.querySelector("[class*='sku'], [class*='price'], [class*='ladder']") ||
        document.body;
      var debounce;
      var obs = new MutationObserver(function () {
        clearTimeout(debounce);
        debounce = setTimeout(function () {
          callback(self.scrape());
        }, 400);
      });
      obs.observe(target, { subtree: true, childList: true, attributes: true });
    },
  };

  window.MuaHoAdapters = window.MuaHoAdapters || {};
  window.MuaHoAdapters["ALIBABA"] = adapter;
})();
