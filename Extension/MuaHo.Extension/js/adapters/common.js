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

    // ── Liệt kê TẤT CẢ variant (không chỉ variant đang chọn) ──────────────────
    // Nguồn: skuProps + skuMap (1688) hoặc skuBase + sku2info (Taobao/Tmall) mà
    // getGlobalData đã bắc cầu qua window. Trả [] nếu SP không có SKU (default) —
    // khi đó backend tự dựng 1 variant "Default" như cũ. fallbackPrice: giá gốc
    // (CNY) adapter đã tính, dùng khi entry skuMap không kèm giá riêng.
    buildVariants: function (page, fallbackPrice) {
      if (!page) return [];
      try {
        var fromBase = Common._variantsFromSkuBase(page); // Taobao/Tmall
        if (fromBase.length) return Common._dedupeVariants(fromBase);
        var fromMap = Common._variantsFromSkuMap(page, fallbackPrice); // 1688
        return Common._dedupeVariants(fromMap);
      } catch (e) {
        return [];
      }
    },

    _dedupeVariants: function (list) {
      var seen = {};
      var out = [];
      list.forEach(function (v) {
        if (!v || !(v.priceOriginal > 0)) return;
        var key = v.skuId || v.name;
        if (!key || seen[key]) return;
        seen[key] = true;
        out.push(v);
      });
      return out.slice(0, 200); // chặn SP dị thường có hàng nghìn tổ hợp
    },

    // 1688: skuMap là object keyed "颜色>尺码" HOẶC array item có specAttrs.
    // Token trong key là TÊN giá trị (khớp thứ tự skuProps) → ghép nhãn thành
    // "颜色:红色;尺码:S". Bỏ qua nếu key là propPath dạng id (pvid:vid) — để
    // nhánh skuBase (Taobao/Tmall) xử lý.
    _variantsFromSkuMap: function (page, fallbackPrice) {
      var skuMap = page.skuMap;
      if (!skuMap) return [];
      var labels = (page.skuProps || []).map(function (p) {
        return p.prop || p.propName || p.name || "";
      });

      var entries = [];
      if (Array.isArray(skuMap)) {
        skuMap.forEach(function (s) {
          if (s) entries.push({ key: s.specAttrs || s.specAttr || s.spec || "", sku: s });
        });
      } else {
        Object.keys(skuMap).forEach(function (k) {
          entries.push({ key: k, sku: skuMap[k] });
        });
      }

      var out = [];
      for (var i = 0; i < entries.length; i++) {
        var sku = entries[i].sku || {};
        var raw = String(entries[i].key || "").replace(/&gt;/g, ">").replace(/^>+/, "");
        // propPath id-based (Taobao) → không đọc được tên ở đây, nhường skuBase.
        if (/\d+:\d+/.test(raw)) return [];
        var tokens = raw.split(">").map(function (t) { return t.trim(); }).filter(Boolean);
        var parts = tokens.map(function (t, idx) {
          return labels[idx] ? labels[idx] + ":" + t : t;
        });
        var name = parts.join(";") || "Default";

        var priceRaw = sku.price != null && sku.price !== "" ? sku.price
                     : (sku.discountPrice != null ? sku.discountPrice : null);
        var price = priceRaw != null ? Common.parsePrice(priceRaw) : 0;
        if (!(price > 0)) price = Number(fallbackPrice) || 0;

        out.push(Common._mkVariant(name, sku.skuId || sku.specId, price,
          Common._pickStock(sku), sku.imageUrl || sku.image));
      }
      return out;
    },

    // Taobao/Tmall: skuBase.props (pid→{name, values:[{vid,name,image}]}) +
    // skuBase.skus (propPath "pid:vid;pid:vid") + sku2info (skuId→{price,quantity}).
    _variantsFromSkuBase: function (page) {
      var base = page.skuBase;
      if (!base || !Array.isArray(base.props) || !Array.isArray(base.skus)) return [];
      var info = page.sku2info || {};

      var valMap = {};
      base.props.forEach(function (p) {
        (p.values || []).forEach(function (v) {
          valMap[p.pid + ":" + v.vid] = { label: p.name, value: v.name, image: v.image };
        });
      });

      var out = [];
      base.skus.forEach(function (s) {
        var pairs = String(s.propPath || "").split(";").filter(Boolean);
        var parts = [];
        var image = null;
        pairs.forEach(function (pair) {
          var m = valMap[pair];
          if (m) {
            parts.push(m.label ? m.label + ":" + m.value : m.value);
            if (m.image && !image) image = m.image;
          }
        });
        var name = parts.join(";") || "Default";

        var meta = info[s.skuId] || {};
        var priceObj = meta.price || {};
        // Taobao lưu priceMoney theo "phân" (cents) → chia 100.
        var price = priceObj.priceMoney != null
          ? Number(priceObj.priceMoney) / 100
          : Common.parsePrice(priceObj.price != null ? priceObj.price : (meta.priceText || ""));
        var stock = meta.quantity != null ? Number(meta.quantity) : Common._pickStock(meta);

        out.push(Common._mkVariant(name, s.skuId, price || 0, stock, image));
      });
      return out;
    },

    _pickStock: function (o) {
      var s = o.canBookCount != null ? o.canBookCount
            : (o.stock != null ? o.stock : (o.quantity != null ? o.quantity : null));
      return s != null && !isNaN(Number(s)) ? Number(s) : null;
    },

    _mkVariant: function (name, skuId, price, stock, image) {
      return {
        name: name || "Default",
        nameTranslated: MUAHO.isTranslate ? Common.translateProps(name) : null,
        skuId: skuId != null && String(skuId) !== "" ? String(skuId) : null,
        priceOriginal: Number(price) || 0,
        stock: stock,
        imageUrl: image ? Common.normalizeImage(image) : null,
      };
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
