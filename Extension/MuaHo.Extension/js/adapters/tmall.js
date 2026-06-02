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
      var jsonLd = C.readJsonLdProduct();
      var confidence = "high";

      // ── Title ──
      var title =
        page.title ||
        (jsonLd && jsonLd.name) ||
        this.titleFromDom() ||
        C.metaContent("og:title") ||
        C.stripSiteSuffix(document.title);

      // ── Giá ──────────────────────────────────────────────────────────────
      var priceOriginal = 0;
      if (jsonLd && jsonLd.offers && jsonLd.offers.price) {
        priceOriginal = C.parsePrice(jsonLd.offers.price);
      } else {
        // Legacy id + modern partial-match class (có "--" để né class ngắn)
        var priceText =
          this.domText("#J_PromoPrice .tm-price, #J_StrPrice .tm-price, #J_StrPriceModBox .tm-price") ||
          this.domText('[class*="priceText--"], [class*="highlightPrice--"], [class*="Price--priceText"]');
        priceOriginal = C.parsePrice(priceText);
        if (priceOriginal > 0) confidence = "medium";
      }

      // ── Ảnh ──────────────────────────────────────────────────────────────
      var images = [];
      if (jsonLd && jsonLd.image) {
        images = [].concat(jsonLd.image).map(C.normalizeImage);
      }
      if (!images.length) {
        var ogImg = C.metaContent("og:image");
        if (ogImg) images = [C.normalizeImage(ogImg)];
      }
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

      // ── Shop ──
      var shopName = page.companyName || page.shopName || this.shopFromDom() || "Shop Tmall";
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

    titleFromDom: function () {
      var t = document.querySelector(".tb-main-title");
      if (t) {
        var dt = t.getAttribute("data-text");
        if (dt && dt.trim()) return dt.trim();
        if (t.textContent.trim()) return t.textContent.trim();
      }
      t = document.querySelector(".tb-detail-hd h3, .tb-detail-hd h1, h3.tb-item-title, .tb-item-title");
      if (t && t.textContent.trim()) return t.textContent.trim();
      t = document.querySelector(
        ".ItemHeader--mainTitle--1rJcXZz, .ItemTitle--mainTitle--2OrrwrD, .mainTitle--O1XCl8e2"
      );
      if (t && t.textContent.trim()) return t.textContent.trim();
      var cands = document.querySelectorAll('[class*="mainTitle--"]');
      var best = "";
      for (var i = 0; i < cands.length; i++) {
        var txt = cands[i].textContent.trim();
        if (txt.length > best.length) best = txt;
      }
      return best;
    },

    shopFromDom: function () {
      var s = document.querySelector(".tb-seller-name");
      if (s && s.textContent.trim()) return s.textContent.trim();
      var nick = document.querySelector("[data-nick]");
      if (nick) {
        var dn = nick.getAttribute("data-nick");
        if (dn && dn.trim()) return dn.trim();
      }
      s = document.querySelector(".ShopHeader--shopName--zZ3913d, .shopName--mTDZGIPO");
      if (s && s.textContent.trim()) return s.textContent.trim();
      s = document.querySelector('[class*="shopName--"]');
      if (s && s.textContent.trim()) return s.textContent.trim();
      s = document.querySelector(".slogo-shopname");
      if (s && s.textContent.trim()) return s.textContent.trim();
      return "";
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
