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
      var sellerId =
        (page.sellerId && String(page.sellerId)) ||
        this.sellerFromDom() ||
        C.getUrlParam("user_id") ||
        "";

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
      var shop_name = "";
      // 1. .hd-shop-name a → innerText ; fallback .shop-intro a
      try {
        shop_name = document.getElementsByClassName("hd-shop-name")[0]
          .getElementsByTagName("a")[0].innerText;
        if (shop_name == "" || shop_name == undefined) {
          shop_name = document.getElementsByClassName("shop-intro")[0]
            .getElementsByTagName("a")[0].innerText;
        }
      } catch (ex) {}

      // 2. .slogo-shopname strong
      if (!shop_name) {
        try {
          shop_name = document.getElementsByClassName("slogo-shopname")[0]
            .getElementsByTagName("strong")[0].innerText;
        } catch (ex) {}
      }

      // 3. input[type=hidden][name=seller_nickname]
      if (!shop_name) {
        try {
          shop_name = document.querySelectorAll(
            '[type="hidden"][name="seller_nickname"]'
          )[0].value;
        } catch (ex) {}
      }

      // 4. .ShopHeader--title--2qsBE1A
      if (!shop_name) {
        var t = document.querySelector(".ShopHeader--title--2qsBE1A");
        if (t != null) shop_name = t.innerHTML;
      }

      // 5. React shopName class-hash
     
      if (!shop_name) {
        var s1 = document.querySelector(
          '[class*="shopName--"], [class*="ShopHeader--shopName"], [class*="ShopHeader--title"]'
        );
        if (s1) shop_name = s1.getAttribute("title") || s1.textContent;
      }

      // 6. mở rộng: ShopHeader link[title] (layout mới)
      if (!shop_name) {
        var shl = document.querySelector('[class*="ShopHeader--"] a[title]');
        if (shl) shop_name = shl.getAttribute("title") || shl.textContent;
      }

      return (shop_name || "").replace(/<[^>]*>/g, "").trim();
    },

    // Seller id từ DOM — microscope-data userid (legacy) + link shop href (ICE).
    sellerFromDom: function () {
      try {
        var meta = document.querySelector('meta[name="microscope-data"]');
        if (meta) {
          var c = meta.getAttribute("content") || "";
          var parts = c.split(";");
          for (var i = 0; i < parts.length; i++) {
            var kv = parts[i].split("=");
            if (kv[0] && kv[0].trim() === "userid" && kv[1]) return kv[1].trim();
          }
        }
        // Layout ICE: link shop chứa shopId=/user_id=/userId=
        var link = document.querySelector(
          '[class*="shopName"] a[href*="shopId="], [class*="ShopHeader--"] a[href*="shopId="], a[href*="shop"][href*="user_id="], a[href*="userId="]'
        );
        if (link) {
          var href = link.getAttribute("href") || "";
          var mm = href.match(/[?&](?:shopId|user_id|userId|sellerId)=(\d{3,20})/);
          if (mm) return mm[1];
        }
      } catch (e) {}
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
