// Adapter Taobao — chạy trong content script. Expose window.MuaHoAdapters["TAOBAO"].
// Taobao có cả layout legacy (#J_isku, #J_StrPrice) lẫn React mới ([class*="mainTitle"]).
// Nguồn data: window bridge (getGlobalData → MUAHO_PAGE_DATA) + DOM fallback.

(function () {
  var C = window.MuaHoCommon;

  var adapter = {
    platform: "TAOBAO",

    // itemId từ URL: item.taobao.com/item.htm?id=XXXX
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
      var priceText =
        this.domText("#J_PromoPrice .tb-rmb-num, #J_StrPrice .tb-rmb-num, #J_StrPriceModBox .tb-rmb-num") ||
        this.domText("[class*='priceText--'], [class*='highlightPrice--'], [class*='Price--priceText']");
      var priceOriginal = C.parsePrice(priceText);
      if (jsonLd && jsonLd.offers && jsonLd.offers.price && priceOriginal === 0)
        priceOriginal = C.parsePrice(jsonLd.offers.price);
      if (priceOriginal > 0 && !page.title) confidence = "medium";

      // ── Ảnh ──────────────────────────────────────────────────────────────
      var images = [];
      if (Array.isArray(page.imageList)) images = page.imageList.map(C.normalizeImage);
      else if (page.image) images = [C.normalizeImage(page.image)];
      if (!images.length) {
        document
          .querySelectorAll("#J_UlThumb img, [class*='thumbnail'] img, .tb-thumb img")
          .forEach(function (img) {
            var src = img.getAttribute("data-src") || img.getAttribute("src");
            if (src) images.push(C.normalizeImage(src));
          });
      }
      images = images.filter(function (v, i, a) {
        return v && a.indexOf(v) === i;
      });

      // ── Shop ──
      var shopName = page.shopName || this.shopFromDom() || "Shop Taobao";
      var sellerId =
        (page.sellerId && String(page.sellerId)) ||
        this.sellerFromDom() ||
        C.getUrlParam("user_id") ||
        C.getUrlParam("seller_id") ||
        "";

      // ── Variant ──────────────────────────────────────────────────────────
      var selectedProps = this.readSelectedProps();
      var skuId = (page.skuId && String(page.skuId)) || C.getUrlParam("skuId") || "";

      return {
        platform: "TAOBAO",
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
        selectedSkuId: skuId,
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

    // Port ĐẦY ĐỦ getShopName của Giang Huy (đúng thứ tự + data-nick trong context cụ thể).
    shopFromDom: function () {
      function txt(el) { return el && el.textContent ? el.textContent.trim() : ""; }
      function nick(sel) {
        var el = document.querySelector(sel);
        if (el) { var n = el.getAttribute("data-nick"); if (n && n.trim()) return n.trim(); }
        return "";
      }
      var v;
      // 1. Legacy seller name
      v = txt(document.querySelector(".tb-seller-name")); if (v) return v;
      // 2. data-nick TRONG context cụ thể (không generic — tránh lấy nhầm)
      v = nick(".shop-card .ww-light[data-nick]"); if (v) return v;
      v = nick(".base-info .seller .J_WangWang[data-nick]"); if (v) return v;
      v = nick(".base-info .seller .ww-light[data-nick]"); if (v) return v;
      v = nick("#J_tab_shopDetail span[data-nick]"); if (v) return v;
      // 3. .tb-shop-name h3 a[title]
      var a = document.querySelector(".tb-shop-name h3 a[title]");
      if (a && a.getAttribute("title")) return a.getAttribute("title").trim();
      // 4. shop title link text
      v = txt(document.querySelector(".shop-title-text, .shop-name-text")); if (v) return v;
      // 5. React shopName classes (cụ thể Giang Huy + wildcard)
      v = txt(document.querySelector(
        ".ShopHeader--shopName--zZ3913d, .shopName--mTDZGIPO, .shopName--cSjM9uKk, [class*='shopName--']"
      )); if (v) return v;
      // 6. React ShopHeader link/title (layout mới)
      a = document.querySelector("[class*='ShopHeader--'] a[title], [class*='shopHeader--'] a[title]");
      if (a) { var t = a.getAttribute("title") || a.textContent; if (t && t.trim()) return t.trim(); }
      v = txt(document.querySelector("[class*='ShopHeader--shopName'], [class*='shopHeader--shopName']"));
      if (v) return v;
      // 7. slogo
      v = txt(document.querySelector(".slogo-shopname")); if (v) return v;
      return "";
    },

    // Seller id từ DOM — port getSellerId Giang Huy (để shopIdOnPlatform không bị "unknown").
    sellerFromDom: function () {
      // 1. microscope-data userid (đáng tin, có sẵn ở head)
      var meta = document.querySelector('meta[name="microscope-data"]');
      if (meta) {
        var c = meta.getAttribute("content") || "";
        var parts = c.split(";");
        for (var i = 0; i < parts.length; i++) {
          var kv = parts[i].split("=");
          if (kv[0] && kv[0].trim() === "userid" && kv[1]) return kv[1].trim();
        }
      }
      // 2. #J_Pine[data-sellerid]
      var pine = document.querySelector("#J_Pine");
      if (pine && pine.getAttribute("data-sellerid")) return pine.getAttribute("data-sellerid");
      // 3. #J_listBuyerOnView[data-api] → seller_num_id
      var bv = document.querySelector("#J_listBuyerOnView");
      if (bv) {
        var api = bv.getAttribute("data-api") || "";
        var m = api.match(/seller_num_id=(\d+)/);
        if (m) return m[1];
      }
      return "";
    },

    // Variant đang chọn: legacy #J_isku .J_Prop + modern [class*="SkuContent"]
    readSelectedProps: function () {
      var parts = [];
      document.querySelectorAll("#J_isku .J_Prop").forEach(function (prop) {
        var label = prop.querySelector(".tb-property-type");
        var sel = prop.querySelector(".tb-selected a");
        if (label && sel) parts.push(label.textContent.trim() + ":" + sel.textContent.trim());
      });
      if (!parts.length) {
        document.querySelectorAll('[class*="SkuContent"] [class*="valueItem"]').forEach(function (g) {
          if (/isSelected|active|selected/i.test(g.className)) parts.push(g.textContent.trim());
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
        document.querySelector("#J_isku, [class*='SkuContent'], [class*='Price']") || document.body;
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
  window.MuaHoAdapters["TAOBAO"] = adapter;
})();
