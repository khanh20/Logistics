// Adapter 1688 — chạy trong content script. Expose window.MuaHoAdapters["1688"].
// Nguồn data chính: window object qua bridge (getGlobalData.js → MUAHO_PAGE_DATA),
// fallback DOM selectors. 1688 là B2B nên có price tiers (bậc giá theo số lượng).

(function () {
  var C = window.MuaHoCommon;

  var adapter = {
    platform: "1688",

    // Lấy itemId (offerId) từ URL: detail.1688.com/offer/{id}.html
    getProductId: function () {
      var m = location.href.match(/offer\/(\d+)\.html/) || location.href.match(/[?&]offerId=(\d+)/);
      return m ? m[1] : "";
    },

    scrape: function () {
      var page = C.getPageData() || {};
      var confidence = "high";

      // ── Title ────────────────────────────────────────────────────────────
      var title =
        page.title ||
        this.domText("h1.title-text, .od-pc-offer-title, .title-content h1, .mod-detail-title h1") ||
        document.title;

      // ── Shop / seller ────────────────────────────────────────────────────
      var sellerId = page.sellerId ? String(page.sellerId) : "";
      var shopName =
        page.companyName ||
        this.domText(".company-name, .shop-name, .店铺名称") ||
        "1688 Shop";

      // ── Giá ──────────────────────────────────────────────────────────────
      // priceRange: [[minQty, price], ...] — bậc giá B2B.
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
        // Giá hiển thị mặc định = bậc thấp nhất (mua ít nhất).
        if (priceTiers.length) priceOriginal = priceTiers[0].priceOriginal;
      } else if (page.price) {
        priceOriginal = C.parsePrice(page.price);
      } else {
        // DOM fallback
        priceOriginal = C.parsePrice(
          this.domText(".price, .currency, .price-now, .discountPrice-price")
        );
        confidence = "medium";
      }

      // ── Ảnh ──────────────────────────────────────────────────────────────
      var images = [];
      if (Array.isArray(page.imageList)) {
        images = page.imageList.map(C.normalizeImage);
      } else if (page.image) {
        images = [C.normalizeImage(page.image)];
      }
      if (!images.length) {
        // DOM fallback: gallery thumbnails
        document.querySelectorAll(".detail-gallery-img, .tab-trigger img, .od-gallery-img img").forEach(
          function (img) {
            var src = img.getAttribute("src") || img.getAttribute("data-lazy-src");
            if (src) images.push(C.normalizeImage(src));
          }
        );
      }
      images = images.filter(function (v, i, a) {
        return v && a.indexOf(v) === i;
      });

      // ── Variant đang chọn ────────────────────────────────────────────────
      // 1688 SKU selection nằm trong DOM (.sku-item.selected). Đọc text active.
      var selectedProps = this.readSelectedProps();
      var selectedSkuId = "";

      return {
        platform: "1688",
        platformProductId: this.getProductId(),
        shopIdOnPlatform: sellerId || "unknown",
        shopName: shopName,
        shopUrl: page.sellerId ? "https://detail.1688.com/" : null,
        titleOriginal: (title || "").trim(),
        titleTranslated: null, // backend tự dịch CN→VN
        priceOriginal: priceOriginal,
        pricePromotion: null,
        currency: "CNY",
        stock: null,
        primaryImageUrl: images[0] || null,
        imageUrls: images,
        propertiesOriginal: selectedProps || null,
        propertiesTranslated: selectedProps ? C.translateProps(selectedProps) : null,
        selectedSkuId: selectedSkuId,
        priceTiers: priceTiers,
        originalUrl: location.href.split("?")[0],
        confidence: priceOriginal > 0 ? confidence : "low",
      };
    },

    // Đọc thuộc tính variant đang được chọn từ DOM.
    readSelectedProps: function () {
      var parts = [];
      document
        .querySelectorAll(".sku-wrapper .sku-line, .obj-sku .prop-list, .sku-prop-module")
        .forEach(function (group) {
          var label = group.querySelector(".sku-title, .prop-title, dt");
          var selected = group.querySelector(".selected, .active, [aria-checked='true']");
          if (label && selected) {
            parts.push(label.textContent.trim() + ":" + selected.textContent.trim());
          }
        });
      return parts.join(";");
    },

    domText: function (selector) {
      var el = document.querySelector(selector);
      return el ? el.textContent.trim() : "";
    },

    // MutationObserver: khi user đổi variant → callback(newScrapedData)
    watchVariantChange: function (callback) {
      var self = this;
      var target =
        document.querySelector(".sku-module-wrapper, .obj-sku, .od-pc-offer-price") ||
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
  window.MuaHoAdapters["1688"] = adapter;
})();
