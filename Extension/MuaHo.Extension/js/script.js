// Entry content script — chạy sau common.js + adapters.
// Nhiệm vụ: detect sàn → chọn adapter → inject overlay → render data → wire nút "Thêm giỏ".

(function () {
  var C = window.MuaHoCommon;
  var site = C.getHomeLand();
  if (!site) return;

  var adapter = (window.MuaHoAdapters || {})[site];
  if (!adapter) return;

  // Inject page-context scripts (bridge đọc window object) cho 1688 + Tmall.
  C.injectPageScript("js/getGlobalData.js");
  C.injectPageScript("js/inject_script.js");

  var AddonTool = {
    currentData: null,
    categories: [],
    loggedIn: false,

    init: function () {
      var self = this;
      this.injectOverlay(function () {
        self.checkAuth();
        self.fetchExchangeRate();
        self.fetchCategories();
        self.refresh();
        // Re-scrape khi user đổi variant.
        if (adapter.watchVariantChange) {
          adapter.watchVariantChange(function (data) {
            self.currentData = data;
            self.renderData(data);
          });
        }
        // Bắt đầu chậm (SPA): refresh vài lần đầu để bắt data load muộn.
        var n = 0;
        var iv = setInterval(function () {
          self.refresh();
          if (++n >= 6) clearInterval(iv);
        }, 1500);
      });
    },

    // Tải template overlay từ web_accessible_resources rồi append vào body.
    injectOverlay: function (done) {
      var url = C.getURL("template/index.html");
      if (!url) return; // extension context đã chết (cần F5 lại trang)
      fetch(url)
        .then(function (r) {
          return r.text();
        })
        .then(function (html) {
          var wrap = document.createElement("div");
          wrap.id = "muaho-overlay-root";
          wrap.innerHTML = html;
          document.body.appendChild(wrap);
          AddonTool.wireEvents();
          if (done) done();
        })
        .catch(function () {});
    },

    wireEvents: function () {
      var self = this;
      var btn = document.querySelector("#muaho-overlay-root .muaho-btn-add");
      if (btn) {
        btn.addEventListener("click", function () {
          self.onAddToCart();
        });
      }
      var viewCart = document.querySelector("#muaho-overlay-root .muaho-btn-view-cart");
      if (viewCart) viewCart.setAttribute("href", MUAHO.webHost + "/cart");

      var loginLink = document.querySelector("#muaho-overlay-root .muaho-btn-login");
      if (loginLink) {
        loginLink.setAttribute("href", MUAHO.webHost + "/login");
        // Sau khi mở tab login, poll nhanh để overlay tự ẩn banner khi user đăng nhập xong.
        loginLink.addEventListener("click", function () {
          self.startFastAuthPoll();
        });
      }

      var logoImg = document.querySelector("#muaho-overlay-root .muaho-logo-img");
      var logoUrl = C.getURL("images/logo.png");
      if (logoImg && logoUrl) logoImg.setAttribute("src", logoUrl);

      var closeBtn = document.querySelector("#muaho-overlay-root .muaho-close");
      if (closeBtn) {
        closeBtn.addEventListener("click", function () {
          var bar = document.querySelector("#muaho-overlay-root .muaho-sidebar");
          if (bar) bar.style.display = "none";
        });
      }
    },

    refresh: function () {
      try {
        var data = adapter.scrape();
        this.currentData = data;
        this.renderData(data);
      } catch (e) {
        // ignore scrape lỗi tạm thời (SPA chưa load xong)
      }
    },

    // Gửi message tới background an toàn. Nếu extension context đã chết (reload extension
    // nhưng tab chưa F5) thì im lặng thay vì throw "Extension context invalidated".
    // Trả false nếu không gửi được → caller có thể dừng polling.
    safeSend: function (msg, cb) {
      if (!C.isAlive()) {
        clearInterval(this._authTimer);
        return false;
      }
      try {
        chrome.runtime.sendMessage(msg, function (resp) {
          if (chrome.runtime.lastError) return; // nuốt lỗi context
          if (cb) cb(resp);
        });
        return true;
      } catch (e) {
        return false;
      }
    },

    // Gọi background 1 lần để cập nhật trạng thái đăng nhập.
    pollAuthOnce: function () {
      var self = this;
      this.safeSend({ action: "getAuthState" }, function (resp) {
        self.setLoggedIn(resp && resp.loggedIn);
      });
    },

    // Hỏi background xem đã đăng nhập MuaHo chưa → toggle banner login.
    checkAuth: function () {
      var self = this;
      this.pollAuthOnce();

      // Re-check định kỳ (user có thể đăng nhập ở tab khác).
      clearInterval(this._authTimer);
      this._authTimer = setInterval(function () {
        self.pollAuthOnce();
      }, 5000);

      // Re-check NGAY khi user quay lại tab sàn (vd vừa login ở tab khác xong).
      if (!this._visBound) {
        this._visBound = true;
        document.addEventListener("visibilitychange", function () {
          if (!document.hidden) self.pollAuthOnce();
        });
        window.addEventListener("focus", function () {
          self.pollAuthOnce();
        });
      }
    },

    // Sau khi user bấm "Đăng nhập": poll dày (1.5s) trong ~30s để bắt thời điểm login xong.
    startFastAuthPoll: function () {
      var self = this;
      clearInterval(this._fastAuthTimer);
      var n = 0;
      this._fastAuthTimer = setInterval(function () {
        self.safeSend({ action: "getAuthState" }, function (resp) {
          var loggedIn = resp && resp.loggedIn;
          self.setLoggedIn(loggedIn);
          if (loggedIn) clearInterval(self._fastAuthTimer); // đã login → dừng poll dày
        });
        if (++n >= 20) clearInterval(self._fastAuthTimer); // tối đa ~30s
      }, 1500);
    },

    setLoggedIn: function (loggedIn) {
      this.loggedIn = !!loggedIn;
      var root = document.querySelector("#muaho-overlay-root");
      if (!root) return;
      var banner = root.querySelector(".muaho-login-banner");
      var body = root.querySelector(".muaho-sidebar__body");
      if (banner) banner.style.display = this.loggedIn ? "none" : "block";
      if (body) body.style.display = this.loggedIn ? "block" : "none";
    },

    renderData: function (data) {
      if (!data) return;
      var root = document.querySelector("#muaho-overlay-root");
      if (!root) return;

      var cny = data.pricePromotion || data.priceOriginal || 0;
      var vnd = C.cnyToVnd(cny);

      this.setText(root, ".muaho-price-cny", cny ? "¥" + cny : "—");
      this.setText(root, ".muaho-price-vnd", vnd ? "≈ ₫" + C.formatVnd(vnd) : "");
      this.setText(root, ".muaho-rate", "Tỉ giá: " + C.formatVnd(MUAHO.exchangeRateVndPerCny));
      this.setText(root, ".muaho-title", data.titleOriginal || "");

      // Cảnh báo confidence thấp
      var warn = root.querySelector(".muaho-warn");
      if (warn) warn.style.display = data.confidence === "low" ? "block" : "none";
    },

    setText: function (root, sel, text) {
      var el = root.querySelector(sel);
      if (el) el.textContent = text;
    },

    fetchExchangeRate: function () {
      this.safeSend({ action: "getExchangeRate" }, function (resp) {
        if (resp && resp.ok && resp.rateVndPerCny) {
          MUAHO.exchangeRateVndPerCny = resp.rateVndPerCny;
          AddonTool.renderData(AddonTool.currentData);
        }
      });
    },

    fetchCategories: function () {
      var self = this;
      this.safeSend({ action: "getCategories" }, function (resp) {
        if (resp && resp.ok && Array.isArray(resp.categories)) {
          self.categories = resp.categories;
          self.renderCategorySelect();
        }
      });
    },

    renderCategorySelect: function () {
      var sel = document.querySelector("#muaho-overlay-root .muaho-category-select");
      if (!sel) return;
      var html = '<option value="">-- Chọn danh mục (tùy chọn) --</option>';
      function walk(nodes, depth) {
        nodes.forEach(function (n) {
          var pad = new Array(depth + 1).join("— ");
          html += '<option value="' + n.id + '">' + pad + n.nameVn + "</option>";
          if (n.children && n.children.length) walk(n.children, depth + 1);
        });
      }
      walk(this.categories, 0);
      sel.innerHTML = html;
    },

    onAddToCart: function () {
      var self = this;
      var data = this.currentData || adapter.scrape();
      if (!data || !data.priceOriginal) {
        this.toast("Chưa lấy được thông tin sản phẩm. Thử lại sau giây lát.", "error");
        return;
      }

      var btn = document.querySelector("#muaho-overlay-root .muaho-btn-add");
      if (btn) {
        btn.disabled = true;
        btn.classList.add("loading");
      }

      var catSel = document.querySelector("#muaho-overlay-root .muaho-category-select");
      var qtyInput = document.querySelector("#muaho-overlay-root .muaho-qty");
      var quantity = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;

      var payload = {
        platform: data.platform,
        platformProductId: data.platformProductId,
        shopIdOnPlatform: data.shopIdOnPlatform,
        shopName: data.shopName,
        shopUrl: data.shopUrl,
        titleOriginal: data.titleOriginal,
        titleTranslated: data.titleTranslated,
        priceOriginal: data.priceOriginal,
        pricePromotion: data.pricePromotion,
        currency: data.currency,
        quantity: quantity,
        stock: data.stock,
        primaryImageUrl: data.primaryImageUrl,
        imageUrls: data.imageUrls,
        propertiesTranslated: data.propertiesTranslated,
        propertiesOriginal: data.propertiesOriginal,
        selectedSkuId: data.selectedSkuId,
        priceTiers: data.priceTiers,
        categoryId: catSel && catSel.value ? catSel.value : null,
        originalUrl: data.originalUrl,
        customerNote: null,
        extensionVersion: MUAHO.version,
        scrapedAt: new Date().toISOString(),
        confidenceTier: data.confidence,
      };

      var sent = this.safeSend({ action: "addToCart", data: payload }, function (resp) {
        if (btn) {
          btn.disabled = false;
          btn.classList.remove("loading");
        }
        if (!resp) {
          self.toast("Không kết nối được MuaHo. Kiểm tra mạng.", "error");
          return;
        }
        if (resp.status === "login_required" || resp.httpStatus === 401) {
          self.toast("Bạn chưa đăng nhập MuaHo. Đang mở trang đăng nhập...", "error");
          window.open(MUAHO.webHost + "/login", "_blank");
          return;
        }
        if (resp.httpStatus === 403) {
          self.toast("Tài khoản không có quyền thêm giỏ.", "error");
          return;
        }
        if (resp.ok && resp.body && resp.body.success) {
          var d = resp.body.data;
          self.toast(
            "Đã thêm vào giỏ! (" + d.cartTotalItemCount + " sản phẩm trong giỏ)",
            "success"
          );
        } else {
          var msg = (resp.body && resp.body.message) || "Thêm giỏ thất bại.";
          self.toast(msg, "error");
        }
      });

      // Context extension đã chết (vừa reload extension) → không gửi được.
      if (!sent) {
        if (btn) {
          btn.disabled = false;
          btn.classList.remove("loading");
        }
        this.toast("Extension vừa được cập nhật. Vui lòng tải lại trang (F5).", "error");
      }
    },

    toast: function (msg, type) {
      var root = document.querySelector("#muaho-overlay-root");
      if (!root) return;
      var t = root.querySelector(".muaho-toast");
      if (!t) {
        t = document.createElement("div");
        t.className = "muaho-toast";
        root.appendChild(t);
      }
      t.textContent = msg;
      t.className = "muaho-toast show " + (type || "");
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(function () {
        t.className = "muaho-toast";
      }, 4000);
    },
  };

  // jQuery ready hoặc DOM sẵn sàng.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      AddonTool.init();
    });
  } else {
    AddonTool.init();
  }
})();
