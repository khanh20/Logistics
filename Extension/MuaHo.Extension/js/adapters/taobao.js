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

    
    shopFromDom: function () {
      var v = this.getShopNameGH();
      if (v && v.trim()) return v.trim();
      v = this.getWangwangGH();
      return (v || "").trim();
    },

    getShopNameGH: function () {
      try {
        var shop_name = "";
        if (document.getElementsByClassName("tb-seller-name").length > 0) {
          shop_name = document.getElementsByClassName("tb-seller-name")[0].textContent;

          if (shop_name == "" || shop_name == null) {
            var shop_card = document.getElementsByClassName("shop-card");
            var data_nick =
              shop_card.length > 0 ? shop_card[0].getElementsByClassName("ww-light") : "";
            shop_name = data_nick.length > 0 ? data_nick[0].getAttribute("data-nick") : "";
            if (shop_name == "") {
              // base-info → seller → J_WangWang / ww-light
              var baseInfos = document.getElementsByClassName("base-info");
              for (var i = 0; i < baseInfos.length; i++) {
                var sellers = baseInfos[i].getElementsByClassName("seller");
                if (sellers.length > 0) {
                  var ww = sellers[0].getElementsByClassName("J_WangWang");
                  if (ww.length > 0) {
                    shop_name = ww[0].getAttribute("data-nick");
                    break;
                  }
                  var wl = sellers[0].getElementsByClassName("ww-light");
                  if (wl.length > 0) {
                    shop_name = wl[0].getAttribute("data-nick");
                    break;
                  }
                }
              }
            }
          }
        } else if (document.querySelector("#J_tab_shopDetail")) {
          var span = document.querySelector("#J_tab_shopDetail span");
          if (span) shop_name = span.getAttribute("data-nick") || "";
        }
        shop_name = (shop_name || "").trim();

        // .tb-shop-name h3 a[title]
        if (!shop_name) {
          var element = document.querySelectorAll(".tb-shop-name");
          if (element != null && element.length > 0) {
            try {
              shop_name = element[0]
                .getElementsByTagName("h3")[0]
                .getElementsByTagName("a")[0]
                .getAttribute("title");
            } catch (e) {}
          }
        }
        // React shopName class-hash 
        if (!shop_name) {
          try {
            var s1 = document.querySelector(".ShopHeader--shopName--zZ3913d");
            if (s1 != null) shop_name = s1.innerHTML;
            else {
              s1 = document.querySelector(".shopName--mTDZGIPO");
              if (s1 != null) shop_name = s1.innerHTML;
              else {
                s1 = document.querySelector('[class*="shopName--ccf81bdd"]');
                if (s1 != null) shop_name = s1.innerHTML;
                else {
                  s1 = document.querySelector(".shopName--cSjM9uKk");
                  if (s1 != null) shop_name = s1.innerHTML;
                  else {
                    // mở rộng: bất kỳ class shopName-- nào (layout mới hash khác)
                    s1 = document.querySelector('[class*="shopName--"]');
                    if (s1 != null) shop_name = s1.innerHTML;
                  }
                }
              }
            }
          } catch (e) {}
        }
        // mở rộng: ShopHeader title/link (layout mới)
        if (!shop_name) {
          var sh = document.querySelector(
            '[class*="ShopHeader--shopName"], [class*="ShopHeader--title"]'
          );
          if (sh) shop_name = sh.textContent;
          if (!shop_name) {
            var shl = document.querySelector('[class*="ShopHeader--"] a[title]');
            if (shl) shop_name = shl.getAttribute("title") || shl.textContent;
          }
        }
        return (shop_name || "").replace(/<[^>]*>/g, "").trim();
      } catch (ex) {
        return "";
      }
    },

    getWangwangGH: function () {
      var wangwang = "";
      try {
        var sw = document.querySelector(".tb-shop-ww .ww-light");
        if (sw && sw.getAttribute("data-nick")) wangwang = sw.getAttribute("data-nick");

        if (wangwang == "") {
          var span = document.querySelectorAll("span.seller");
          if (!span || span.length == 0) {
            var div = document.getElementsByClassName("slogo-extraicon");
            if (div && div.length > 0) span = div[0].getElementsByClassName("ww-light");
          }
          if (!span || span.length == 0) {
            span = document.querySelectorAll("div.hd-shop-desc span.ww-light");
          }
          if (span && span.length > 0) {
            var inner = span[0].getElementsByTagName("span");
            var raw =
              inner && inner.length > 0
                ? inner[0].getAttribute("data-nick")
                : span[0].getAttribute("data-nick");
            if (raw) {
              try {
                wangwang = decodeURIComponent(raw);
              } catch (e) {
                wangwang = raw;
              }
            }
          }
        }
      } catch (ex) {
        wangwang = "";
      }
      return wangwang;
    },

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
