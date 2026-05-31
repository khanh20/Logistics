// CHẠY TRONG PAGE CONTEXT (inject qua <script src> bởi common.js).
// Content script (ISOLATED world) KHÔNG đọc được window.* của trang sàn,
// nên file này chạy trong page context, đọc window object rồi dispatch CustomEvent
// "MUAHO_PAGE_DATA" để content script nhận qua document.addEventListener.
//
// 1688:  window.context.result.global.globalData.model | window.__INIT_DATA | window.iDetailData
// Tmall: window.__GLOBAL_DATA | window.__INIT_DATA (React) | DOM legacy
(function () {
  function dispatch(detail) {
    document.dispatchEvent(new CustomEvent("MUAHO_PAGE_DATA", { detail: detail }));
  }

  // ── 1688 ──────────────────────────────────────────────────────────────────
  function read1688() {
    try {
      // Path A: window.iDetailData (legacy)
      if (window.iDetailData && window.iDetailData.sku) {
        var d = window.iDetailData;
        return {
          site: "1688",
          sellerId: d.sellerModel && d.sellerModel.userId,
          companyName: d.sellerModel && d.sellerModel.companyName,
          price: d.sku && d.sku.price,
          image: d.images && d.images[0] && d.images[0].fullPathImageURI,
          skuProps: d.sku && d.sku.skuProps,
          skuMap: d.sku && d.sku.skuMap,
        };
      }

      // Path B: window.context.result.global.globalData.model (current 1688 detail)
      if (window.context && window.context.result && window.context.result.global) {
        var m = window.context.result.global.globalData.model;
        var priceRange =
          m.tradeModel.offerPriceModel &&
          m.tradeModel.offerPriceModel.currentPrices &&
          m.tradeModel.offerPriceModel.currentPrices.map(function (x) {
            return [Number(x.beginAmount) || 0, Number(x.price) || 0];
          });
        return {
          site: "1688",
          sellerId: m.sellerModel.userId,
          companyName: m.sellerModel.companyName,
          price: m.tradeModel.priceDisplay,
          priceRange: priceRange,
          image:
            m.offerDetail.imageList &&
            m.offerDetail.imageList[0] &&
            m.offerDetail.imageList[0].fullPathImageURI,
          imageList: (m.offerDetail.imageList || []).map(function (x) {
            return x.fullPathImageURI;
          }),
          skuProps: m.offerDetail.skuProps,
          skuMap: m.tradeModel.skuMap,
          title: m.offerDetail.subject,
        };
      }

      // Path C: window.__INIT_DATA.globalData (alt 1688)
      if (window.__INIT_DATA && window.__INIT_DATA.globalData) {
        var g = window.__INIT_DATA.globalData;
        var pr =
          g.orderParamModel &&
          g.orderParamModel.orderParam.skuParam.skuRangePrices &&
          g.orderParamModel.orderParam.skuParam.skuRangePrices.map(function (x) {
            return [Number(x.beginAmount) || 0, Number(x.price) || 0];
          });
        return {
          site: "1688",
          sellerId: g.tempModel && g.tempModel.sellerUserId,
          companyName: g.tempModel && g.tempModel.companyName,
          price: g.skuModel && g.skuModel.skuPriceScale,
          priceRange: pr,
          image: g.images && g.images[0] && g.images[0].fullPathImageURI,
          imageList: (g.images || []).map(function (x) {
            return x.fullPathImageURI;
          }),
          skuProps: g.skuModel && g.skuModel.skuProps,
          skuMap: g.skuModel && g.skuModel.skuInfoMap,
          title: g.tempModel && g.tempModel.offerTitle,
        };
      }
    } catch (e) {
      return { site: "1688", error: String(e) };
    }
    return null;
  }

  // ── Taobao ────────────────────────────────────────────────────────────────
  function readTaobao() {
    try {
      var out = { site: "TAOBAO" };
      // g_config: global của trang item.taobao.com legacy
      if (window.g_config) {
        out.sellerId = window.g_config.sellerId || (window.g_config.shopId);
        out.shopName = window.g_config.shopName;
        out.title = window.g_config.itemTitle || window.g_config.title;
      }
      // Hub.config.get('sku') — skuId/price (modern Taobao)
      try {
        if (window.Hub && window.Hub.config && window.Hub.config.get) {
          var sku = window.Hub.config.get("sku");
          if (sku) {
            out.skuId = sku.skuId;
            if (sku.valItemInfo) out.skuMap = sku.valItemInfo.skuMap;
          }
        }
      } catch (e) {}
      // __INIT_DATA (Taobao React)
      if (window.__INIT_DATA && window.__INIT_DATA.globalData) {
        var g = window.__INIT_DATA.globalData;
        if (g.item) {
          out.title = out.title || g.item.title;
          out.image = g.item.images && g.item.images[0];
          out.imageList = g.item.images || [];
        }
        if (g.seller) {
          out.sellerId = out.sellerId || g.seller.userId || g.seller.shopId;
          out.shopName = out.shopName || g.seller.shopName;
        }
      }
      return out;
    } catch (e) {
      return { site: "TAOBAO", error: String(e) };
    }
  }

  // ── Alibaba.com (B2B quốc tế) ──────────────────────────────────────────────
  function readAlibaba() {
    try {
      // window.runParams.data — cấu trúc detail alibaba.com kinh điển
      var data =
        (window.runParams && window.runParams.data) ||
        (window.detailData && window.detailData) ||
        (window.__INIT_DATA && window.__INIT_DATA.globalData) ||
        null;
      if (!data) return { site: "ALIBABA" };

      var globalData = data.globalData || data;
      var priceModel =
        (globalData.productView && globalData.productView.ladderPrice) ||
        (globalData.tradeModel && globalData.tradeModel.offerPriceModel) ||
        null;
      var priceRange = null;
      if (priceModel && priceModel.currentPrices) {
        priceRange = priceModel.currentPrices.map(function (x) {
          return [Number(x.beginAmount || x.quantity) || 0, Number(x.price || x.value) || 0];
        });
      }

      var info = globalData.productBasicInfo || globalData.offerDetail || globalData.productView || {};
      var company = globalData.companyModule || globalData.sellerModel || {};

      return {
        site: "ALIBABA",
        sellerId: company.userId || company.memberId || company.companyId,
        companyName: company.companyName || company.name,
        title: info.subject || info.title || info.productTitle,
        priceRange: priceRange,
        image: (info.mediaItems && info.mediaItems[0] && info.mediaItems[0].imageUrl) ||
               (info.images && info.images[0]),
        imageList:
          (info.mediaItems && info.mediaItems.map(function (m) { return m.imageUrl; })) ||
          info.images ||
          [],
        currency: priceModel && priceModel.currency,
      };
    } catch (e) {
      return { site: "ALIBABA", error: String(e) };
    }
  }

  // ── Tmall ─────────────────────────────────────────────────────────────────
  function readTmall() {
    try {
      // Path A: window.__GLOBAL_DATA / window.__INIT_DATA (Tmall React detail)
      var root =
        (window.__INIT_DATA && window.__INIT_DATA) ||
        (window.__GLOBAL_DATA && window.__GLOBAL_DATA) ||
        null;
      if (root) {
        // Cấu trúc Tmall thay đổi theo phiên bản — chỉ lấy được phần phổ biến.
        var item = root.item || (root.data && root.data.item) || {};
        var seller = root.seller || (root.data && root.data.seller) || {};
        return {
          site: "TMALL",
          sellerId: seller.userId || seller.shopId,
          companyName: seller.shopName || seller.title,
          title: item.title,
          image: item.images && item.images[0],
          imageList: item.images || [],
        };
      }
    } catch (e) {
      return { site: "TMALL", error: String(e) };
    }
    return null;
  }

  function poll() {
    var host = location.href;
    var data = null;
    if (/1688\.com/.test(host)) data = read1688();
    else if (/alibaba\.com/.test(host)) data = readAlibaba();
    else if (/tmall\.com|tmall\.hk/.test(host)) data = readTmall();
    else if (/taobao\.com/.test(host)) data = readTaobao();

    if (data) dispatch(data);
  }

  // Poll 500ms × 12 lần đầu (SPA load chậm), rồi mỗi 2s để bắt variant change.
  var count = 0;
  var fast = setInterval(function () {
    poll();
    if (++count >= 12) {
      clearInterval(fast);
      setInterval(poll, 2000);
    }
  }, 500);
})();
