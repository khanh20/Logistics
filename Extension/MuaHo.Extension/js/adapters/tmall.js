// Adapter Tmall — chạy trong content script. Expose window.MuaHoAdapters["TMALL"].
// Tmall (Taobao React UI) dùng class names có hash suffix thay đổi liên tục,
// nên ưu tiên partial-match selectors [class*="..."] + JSON-LD + og meta fallback.
// (Cũng dùng cho tmall.hk.)

(function () {
  var C = window.MuaHoCommon;

  var adapter = {
    platform: "TMALL",

    // itemId từ URL: detail.tmall.com/item.htm?id=XXXX
    getProductId: function () {
      return C.getUrlParam("id") || C.getUrlParam("itemId") || "";
    },

    scrape: function () {
      var page = C.getPageData() || {};
      var jsonLd = this.readJsonLd();
      var og = this.readOpenGraph();
      var confidence = "high";

      // ── Title ────────────────────────────────────────────────────────────
      var title =
        (jsonLd && jsonLd.name) ||
        page.title ||
        this.domText(
          '[class*="mainTitle"], .tb-main-title, .ItemHeader--mainTitle, [class*="ItemTitle"]'
        ) ||
        (og && og.title) ||
        document.title;

      // ── Giá ──────────────────────────────────────────────────────────────
      var priceOriginal = 0;
      if (jsonLd && jsonLd.offers && jsonLd.offers.price) {
        priceOriginal = C.parsePrice(jsonLd.offers.price);
      } else {
        // Legacy id + modern partial-match class
        var priceText =
          this.domText("#J_PromoPrice .tm-price, #J_StrPrice .tm-price, #J_StrPriceModBox .tm-price") ||
          this.domText('[class*="priceText"], [class*="highlightPrice"], [class*="Price--priceText"]');
        priceOriginal = C.parsePrice(priceText);
        if (priceOriginal > 0) confidence = "medium";
      }

      // ── Ảnh ──────────────────────────────────────────────────────────────
      var images = [];
      if (jsonLd && jsonLd.image) {
        images = [].concat(jsonLd.image).map(C.normalizeImage);
      }
      if (!images.length && og && og.image) images = [C.normalizeImage(og.image)];
      if (!images.length) {
        document
          .querySelectorAll('[class*="thumbnail"] img, #J_UlThumb img, .tb-thumb img')
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
        this.domText('[class*="ShopHeader--shopName"], .slogo-shopname, .shop-name') ||
        "Tmall Shop";
      var sellerId = (page.sellerId && String(page.sellerId)) || C.getUrlParam("user_id") || "";

      // ── Variant đang chọn ────────────────────────────────────────────────
      var selectedProps = this.readSelectedProps();
      var skuId = C.getUrlParam("skuId");

      return {
        platform: "TMALL",
        platformProductId: this.getProductId(),
        shopIdOnPlatform: sellerId || "unknown",
        shopName: shopName,
        shopUrl: null,
        titleOriginal: (title || "").trim(),
        titleTranslated: null,
        priceOriginal: priceOriginal,
        pricePromotion: null,
        currency: "CNY",
        stock: null,
        primaryImageUrl: images[0] || null,
        imageUrls: images,
        propertiesOriginal: selectedProps || null,
        propertiesTranslated: selectedProps ? C.translateProps(selectedProps) : null,
        selectedSkuId: skuId || "",
        priceTiers: [],
        originalUrl: location.href.split("&")[0],
        confidence: priceOriginal > 0 ? confidence : "low",
      };
    },

    // Đọc <script type="application/ld+json"> Product
    readJsonLd: function () {
      var scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (var i = 0; i < scripts.length; i++) {
        try {
          var data = JSON.parse(scripts[i].textContent);
          var arr = Array.isArray(data) ? data : [data];
          for (var j = 0; j < arr.length; j++) {
            if (arr[j] && (arr[j]["@type"] === "Product" || arr[j].name)) return arr[j];
          }
        } catch (e) {
          // skip invalid JSON
        }
      }
      return null;
    },

    readOpenGraph: function () {
      function meta(prop) {
        var el = document.querySelector('meta[property="' + prop + '"]');
        return el ? el.getAttribute("content") : null;
      }
      return { title: meta("og:title"), image: meta("og:image") };
    },

    // Variant selection: legacy #J_DetailMeta .tb-prop + modern [class*="SkuContent"]
    readSelectedProps: function () {
      var parts = [];
      // Legacy
      document
        .querySelectorAll("#J_DetailMeta .tb-sku dl.tb-prop:not(.tb-hidden)")
        .forEach(function (dl) {
          var label = dl.querySelector(".tb-metatit");
          var sel = dl.querySelector(".tb-selected a");
          if (label && sel) parts.push(label.textContent.trim() + ":" + sel.textContent.trim());
        });
      // Modern React
      if (!parts.length) {
        document.querySelectorAll('[class*="SkuContent"] [class*="valueItem"]').forEach(function (g) {
          // chỉ lấy item được chọn
          if (/isSelected|active|selected/i.test(g.className)) {
            parts.push(g.textContent.trim());
          }
        });
      }
      return parts.join(";");
    },

    domText: function (selector) {
      var el = document.querySelector(selector);
      return el ? el.textContent.trim() : "";
    },

    watchVariantChange: function (callback) {
      var self = this;
      var target =
        document.querySelector('#J_DetailMeta, [class*="SkuContent"], [class*="Price"]') ||
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
  window.MuaHoAdapters["TMALL"] = adapter;
})();
