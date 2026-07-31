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

  // ── ICE / SSR (Taobao + Tmall layout) ──────────────────────────────────
  function deepFindSeller(obj, depth) {
    if (!obj || typeof obj !== "object" || depth > 6) return null;
    if (obj.shopName && (obj.sellerId || obj.shopId || obj.userId)) return obj;
    for (var k in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
      var v = obj[k];
      if (v && typeof v === "object") {
        var found = deepFindSeller(v, depth + 1);
        if (found) return found;
      }
    }
    return null;
  }

  function readIceContext() {
    try {
      var ctx = window.__ICE_APP_CONTEXT__;
      var ld = ctx && ctx.loaderData;
      if (!ld) return null;

      // Tìm node .data.res chứa seller/titleVO (route id "home" có thể đổi).
      var res = null;
      for (var key in ld) {
        if (!Object.prototype.hasOwnProperty.call(ld, key)) continue;
        var node = ld[key];
        var r = node && node.data && node.data.res;
        if (r && (r.seller || r.titleVO)) { res = r; break; }
      }
      if (!res) return null;

      var seller = res.seller || {};
      // titleVO.title có thể là string hoặc object {title:"..."}
      var titleVO = res.titleVO || {};
      var title =
        (titleVO.title && (titleVO.title.title || titleVO.title)) ||
        (res.item && res.item.title) ||
        null;

      var out = {
        sellerId: seller.sellerId || seller.userId || seller.shopId || null,
        shopId: seller.shopId || null,
        shopName: seller.shopName || seller.shopTitle || seller.nick || null,
        title: typeof title === "string" ? title : null,
        // Full SKU model để liệt kê mọi variant (không chỉ variant đang chọn).
        skuBase: res.skuBase || (res.skuCore && res.skuCore.skuBase) || null,
        sku2info: (res.skuCore && res.skuCore.sku2info) || res.sku2info || null,
      };

      // Ảnh (nếu có trong res.skuBase / res.componentsVO mainPic)
      var pics =
        (res.mainPicVO && res.mainPicVO.list) ||
        (res.componentsVO && res.componentsVO.mainPicVO && res.componentsVO.mainPicVO.picList) ||
        null;
      if (pics && pics.length) {
        out.imageList = pics
          .map(function (p) { return p && (p.url || p.picUrl || p.imgUrl); })
          .filter(Boolean);
        out.image = out.imageList[0];
      }

      // Nếu thiếu seller theo path, thử deep-search toàn bộ ICE context.
      if (!out.shopName || !out.sellerId) {
        var ds = deepFindSeller(res, 0) || deepFindSeller(ld, 0);
        if (ds) {
          out.shopName = out.shopName || ds.shopName || null;
          out.sellerId = out.sellerId || ds.sellerId || ds.userId || ds.shopId || null;
          out.shopId = out.shopId || ds.shopId || null;
        }
      }
      return out;
    } catch (e) {
      return null;
    }
  }

  // Fallback cuối: regex trên text inline script (data SSR tĩnh, bền nhất).
  function readShopFromScripts() {
    try {
      var html = document.documentElement.innerHTML;
      var out = {};
      var m;
      m = html.match(/"shopName"\s*:\s*"([^"]{1,80})"/);
      if (m) out.shopName = m[1];
      m = html.match(/"sellerId"\s*:\s*"?(\d{3,20})"?/);
      if (m) out.sellerId = m[1];
      m = html.match(/"shopId"\s*:\s*"?(\d{3,20})"?/);
      if (m) out.shopId = m[1];
      m = html.match(/"titleVO"\s*:\s*\{[^}]*?"title"\s*:\s*\{?\s*"title"\s*:\s*"([^"]{4,200})"/);
      if (m) out.title = decodeUnicode(m[1]);
      return out;
    } catch (e) {
      return {};
    }
  }

  function decodeUnicode(s) {
    try {
      return s.replace(/\\u([\dA-Fa-f]{4})/g, function (_, g) {
        return String.fromCharCode(parseInt(g, 16));
      });
    } catch (e) {
      return s;
    }
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
      // Ưu tiên cao nhất: ICE context (layout SSR mới) — seller/title gốc, có ngay.
      var ice = readIceContext();
      if (ice) {
        out.sellerId = ice.sellerId || out.sellerId;
        out.shopName = ice.shopName || out.shopName;
        out.title = ice.title || out.title;
        if (ice.skuBase) out.skuBase = ice.skuBase;
        if (ice.sku2info) out.sku2info = ice.sku2info;
        if (ice.imageList && ice.imageList.length) {
          out.imageList = ice.imageList;
          out.image = ice.image;
        }
      }
      // g_config: global của trang item.taobao.com legacy (chỉ điền nếu ICE chưa có)
      if (window.g_config) {
        out.sellerId = out.sellerId || window.g_config.sellerId || window.g_config.shopId;
        out.shopName = out.shopName || window.g_config.shopName;
        out.title = out.title || window.g_config.itemTitle || window.g_config.title;
      }
      // Hub.config.get('sku'/'item') — skuId/title (modern Taobao)
      try {
        if (window.Hub && window.Hub.config && window.Hub.config.get) {
          var sku = window.Hub.config.get("sku");
          if (sku) {
            out.skuId = sku.skuId;
            if (sku.valItemInfo) out.skuMap = sku.valItemInfo.skuMap;
            if (sku.skuBase) out.skuBase = out.skuBase || sku.skuBase;
            if (sku.sku2info) out.sku2info = out.sku2info || sku.sku2info;
          }
          var item = window.Hub.config.get("item");
          if (item) {
            out.title = out.title || item.title;
            out.image = out.image || (item.images && item.images[0]);
          }
          var seller = window.Hub.config.get("seller");
          if (seller) {
            out.sellerId = out.sellerId || seller.userId || seller.shopId;
            out.shopName = out.shopName || seller.shopName || seller.nick;
          }
        }
      } catch (e) {}
      // __INIT_DATA / __GLOBAL_DATA (Taobao React) — nhiều path theo version
      var g =
        (window.__INIT_DATA && window.__INIT_DATA.globalData) ||
        (window.__GLOBAL_DATA && window.__GLOBAL_DATA) ||
        null;
      if (g) {
        var itemDO = g.item || g.itemDO || (g.data && g.data.item) || null;
        if (itemDO) {
          out.title = out.title || itemDO.title || itemDO.subtitle;
          out.image = out.image || (itemDO.images && itemDO.images[0]);
          out.imageList = out.imageList || itemDO.images || [];
        }
        var sellerDO = g.seller || g.sellerDO || (g.data && g.data.seller) || null;
        if (sellerDO) {
          out.sellerId = out.sellerId || sellerDO.userId || sellerDO.shopId || sellerDO.sellerId;
          out.shopName = out.shopName || sellerDO.shopName || sellerDO.nick || sellerDO.title;
        }
      }
      // Fallback cuối: regex text inline script.
      if (!out.shopName || !out.sellerId) {
        var s = readShopFromScripts();
        out.shopName = out.shopName || s.shopName;
        out.sellerId = out.sellerId || s.sellerId || s.shopId;
        out.title = out.title || s.title;
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
      var out = { site: "TMALL" };
      // Ưu tiên cao nhất: ICE context (Tmall chia sẻ UI ICE với Taobao).
      var ice = readIceContext();
      if (ice) {
        out.sellerId = ice.sellerId || out.sellerId;
        out.companyName = ice.shopName || out.companyName; // adapter Tmall đọc companyName trước
        out.title = ice.title || out.title;
        if (ice.skuBase) out.skuBase = ice.skuBase;
        if (ice.sku2info) out.sku2info = ice.sku2info;
        if (ice.imageList && ice.imageList.length) {
          out.imageList = ice.imageList;
          out.image = ice.image;
        }
      }
      // Hub.config (Tmall cũng dùng Hub trên một số version)
      try {
        if (window.Hub && window.Hub.config && window.Hub.config.get) {
          var hItem = window.Hub.config.get("item");
          if (hItem) {
            out.title = out.title || hItem.title;
            out.image = out.image || (hItem.images && hItem.images[0]);
          }
          var hSeller = window.Hub.config.get("seller");
          if (hSeller) {
            out.sellerId = out.sellerId || hSeller.userId || hSeller.shopId;
            out.companyName = out.companyName || hSeller.shopName || hSeller.nick;
          }
        }
      } catch (e) {}
      // __INIT_DATA / __GLOBAL_DATA (Tmall React detail) — nhiều nhánh
      var root =
        (window.__INIT_DATA && (window.__INIT_DATA.globalData || window.__INIT_DATA)) ||
        (window.__GLOBAL_DATA && window.__GLOBAL_DATA) ||
        null;
      if (root) {
        var item = root.item || root.itemDO || (root.data && root.data.item) || {};
        var seller = root.seller || root.sellerDO || (root.data && root.data.seller) || {};
        out.title = out.title || item.title || item.subtitle;
        out.image = out.image || (item.images && item.images[0]);
        out.imageList = item.images || out.imageList || [];
        out.sellerId = out.sellerId || seller.userId || seller.shopId || seller.sellerId;
        out.companyName =
          out.companyName || seller.shopName || seller.title || seller.nick;
      }
      // Fallback cuối: regex text inline script.
      if (!out.companyName || !out.sellerId) {
        var s = readShopFromScripts();
        out.companyName = out.companyName || s.shopName;
        out.sellerId = out.sellerId || s.sellerId || s.shopId;
        out.title = out.title || s.title;
      }
      return out;
    } catch (e) {
      return { site: "TMALL", error: String(e) };
    }
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
