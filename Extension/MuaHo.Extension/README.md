# MuaHo Extension

Chrome Extension hỗ trợ mua hộ: khi duyệt sản phẩm trên **1688**, **Taobao**, **Tmall** hoặc **Alibaba.com**, một bảng MuaHo hiện ở góc dưới phải cho phép thêm sản phẩm vào giỏ hàng MuaHo bằng 1 click.

> Manifest V3 · Vanilla JS + jQuery · không bundler.

---

## Kiến trúc

```
Trang sàn (1688 / Taobao / Tmall / Alibaba)
   │  getGlobalData.js (page context) đọc window.__INIT_DATA / window.context / runParams
   │        └── CustomEvent "MUAHO_PAGE_DATA" ──▶ common.js (content script, cache)
   │  adapter.scrape() = pageData + DOM fallback
   ▼
script.js  → render overlay (giá VND realtime) → click "Thêm giỏ"
   │  chrome.runtime.sendMessage({action:"addToCart"})
   ▼
background.js (service worker)
   │  token ← chrome.cookies.get("muaho.access")   (cookie HttpOnly do Auth set)
   │  POST {backendHost}/api/cart/add-from-extension  (Bearer JWT)
   │  401 → đọc cookie muaho.refresh → Auth /refresh → đọc lại cookie → retry
   ▼
Backend MuaHo Module1 → tạo Product + thêm CartItem
```

**Auth qua cookie HttpOnly:** Khi user login web MuaHo, Auth service set cookie `muaho.access` + `muaho.refresh` (HttpOnly). Extension đọc cookie bằng `chrome.cookies.get` (đọc được cả HttpOnly) rồi gửi `Authorization: Bearer` tới Module1. Extension **mượn phiên đăng nhập** của web — user phải login web MuaHo trước.

---

## Cấu trúc thư mục

```
MuaHo.Extension/
├── manifest.json              # MV3
├── background.js              # Service worker — auth + gọi API backend
├── popup.html / js/popup.js   # Popup: trạng thái kết nối + tỉ giá
├── options.html / js/options.js # Cấu hình backend/web/auth URL
├── template/index.html        # HTML overlay sidebar
├── css/main.css               # Style overlay (theme cam MuaHo)
├── images/                    # icon16/48/128
└── js/
    ├── jquery.js, md5.min.js  # vendor
    ├── config.js              # MUAHO config (đọc storage)
    ├── getGlobalData.js       # (page ctx) đọc window object sàn → CustomEvent
    ├── inject_script.js       # (page ctx) fallback window data → hidden div
    ├── script.js              # entry: dispatcher + AddonTool overlay
    └── adapters/
        ├── common.js          # CommonTool: detect site, currency, dịch, merge
        ├── alibaba.js         # adapter 1688 (key "1688", price tiers B2B)
        ├── alibaba_global.js  # adapter Alibaba.com (key "ALIBABA", USD ladder price)
        ├── taobao.js          # adapter Taobao (#J_isku + window + DOM)
        └── tmall.js           # adapter Tmall (JSON-LD + og + DOM)
```

---

## Cài đặt (Developer mode)

1. Mở `chrome://extensions`
2. Bật **Developer mode** (góc trên phải)
3. **Load unpacked** → chọn thư mục `Extension/MuaHo.Extension`
4. Ghim icon MuaHo lên thanh công cụ

### Cấu hình (nếu không chạy localhost mặc định)

Chuột phải icon MuaHo → **Options**, chỉnh:

| Trường | Mặc định (dev) | Ý nghĩa |
|---|---|---|
| Backend API URL | `http://localhost:5187` | API Module1 |
| Web MuaHo URL | `http://localhost:5173` | FE (giỏ hàng/login) |
| Auth API URL | `https://localhost:7237` | Service refresh token |

---

## Cách dùng

1. Chạy backend Module1 + Auth + web FE.
2. Đăng nhập web MuaHo (mở tab `localhost:5173` và login) — Auth set cookie `muaho.access`, extension đọc được ngay.
3. Mở 1 trang sản phẩm trên `1688.com`, `taobao.com`, `tmall.com` hoặc `alibaba.com`.
4. Bảng MuaHo hiện góc dưới phải: tiêu đề, giá ¥/$ → ₫ (theo tỉ giá hiện tại).
5. (Tùy chọn) chọn danh mục + số lượng → **Thêm vào giỏ MuaHo**.
6. Toast xác nhận → mở **Xem giỏ hàng** để checkout trên web.

Nếu chưa đăng nhập: bảng hiện nút **Đăng nhập để mua hộ** → mở tab login.

---

## Test checklist

- [ ] Load unpacked không lỗi (Service worker `Active`).
- [ ] Popup hiển thị "Đã kết nối MuaHo" + tỉ giá.
- [ ] Login web → cookie `muaho.access` xuất hiện (DevTools → Application → Cookies).
- [ ] Trang 1688 → overlay hiện < 3s, giá ¥ và ₫ đúng, có bậc giá B2B.
- [ ] Trang Taobao → overlay hiện, title + giá đúng.
- [ ] Trang Tmall → overlay hiện, title + giá đúng.
- [ ] Trang Alibaba.com → overlay hiện, giá USD → ₫.
- [ ] Đổi phân loại (màu/size) → giá cập nhật.
- [ ] Chưa login → hiện banner đăng nhập.
- [ ] Đã login → "Thêm vào giỏ" → toast thành công → item xuất hiện trong giỏ web.
- [ ] Token hết hạn → tự refresh, không phải login lại.

---

## Giới hạn hiện tại (dev)

- Hỗ trợ **1688, Taobao, Tmall, Alibaba.com**. Rakuten chưa có adapter.
- Selector các sàn có thể vỡ khi sàn đổi layout → cập nhật `adapters/*.js`.
- Adapter phần lớn dựa DOM + window object — cần test trên trang thật để chỉnh selector.
- Cookie auth: dev dùng `Secure=false`; production cần HTTPS + cấu hình `Cookie:Domain=.muaho.vn` trong appsettings Auth.
- Logo lấy từ `images/logo (2).png` gốc — kiểm tra hiển thị thực tế trên Chrome.
- Chưa submit Chrome Web Store (cần privacy policy + screenshots).
