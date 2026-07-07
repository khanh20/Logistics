# Deploy FE lên Vercel và nối tới BE chạy local

Hướng dẫn đưa FE (React Router v7, SPA `ssr: false`) lên Vercel, rồi cho nó gọi
được BE đang chạy trên máy local thông qua Cloudflare Tunnel.

## Tổng quan luồng

FE trên Vercel chạy trong trình duyệt của người xem qua HTTPS, nên không thể gọi
`localhost` của máy bạn. Cách nối:

1. Mở tunnel HTTPS công khai cho từng BE service (Cloudflare Tunnel).
2. Điền URL tunnel vào Environment Variables trên Vercel.
3. Thêm origin của Vercel vào CORS của BE.
4. Redeploy FE để nhúng lại env.

Ghi chú: FE xác thực bằng Bearer token (header `Authorization`, lấy từ Redux store),
không dựa vào cookie cho luồng chính. Do đó không cần chỉnh `SameSite` cookie.
Cookie HttpOnly chỉ dùng cho Chrome extension.

## Bản đồ service

FE gọi 3 base URL. "Module3" trong FE thực chất trỏ tới service Core.

| Env FE                 | Service | Cổng HTTPS | Cổng HTTP |
| ---------------------- | ------- | ---------- | --------- |
| `VITE_AUTH_API_URL`    | Auth    | 7237       | 5016      |
| `VITE_MODULE1_API_URL` | Module1 | 7167       | 5066      |
| `VITE_MODULE3_API_URL` | Core    | 7215       | 5170      |

Tunnel nên trỏ vào cổng HTTP để tránh lỗi self-signed cert của HTTPS dev.

## Thông số deploy FE trên Vercel

| Mục               | Giá trị       |
| ----------------- | ------------- |
| Root Directory    | `FE`          |
| Framework Preset  | Vite hoặc Other |
| Build Command     | `npm run build` |
| Output Directory  | `build/client` |
| Install Command   | `npm install` |

File `FE/vercel.json` cần có rewrite cho SPA:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "build/client",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## Phần 1. Deploy FE bằng Vercel CLI

Dùng CLI vì repo thuộc tài khoản người khác (bạn là collaborator) nên không hiện
khi import qua Git.

```
npm i -g vercel
vercel login
cd D:\MonHoc\DoAnTotNghiep2\FE
vercel
```

Trả lời các câu hỏi:

- Which team: chọn team của bạn
- Project: Create new project
- Name: đặt chữ thường, ví dụ `muaho-fe`
- Customize settings: no (dùng cấu hình trong `vercel.json`)
- Customize advanced settings: no

Kết quả cho ra Production URL và alias cố định dạng `https://muaho-fe.vercel.app`.

Các lần cập nhật sau (CLI không auto-deploy theo git push):

```
cd D:\MonHoc\DoAnTotNghiep2\FE
vercel --prod
```

Nếu sau deploy trang bị trắng hoặc 404 do preset React Router (SSR) chen vào:
vào Project, Settings, Build and Deployment, đổi Framework Preset sang Other,
Save, rồi deploy lại.

## Phần 2. Giới hạn quyền truy cập (tùy chọn)

Trên gói Hobby (miễn phí), Vercel Authentication chỉ bảo vệ được các bản Preview,
không bảo vệ được domain Production. Lựa chọn:

- Để Production public trong lúc phát triển. Giai đoạn này FE chưa có dữ liệu thật
  nên rủi ro thấp. Đây là lựa chọn đơn giản nhất.
- Dùng bản Preview: chạy `vercel` (không có `--prod`), lấy URL preview. URL này
  được Standard Protection chặn, chỉ tài khoản trong team mới xem được. Nhược điểm:
  URL đổi mỗi lần deploy, và CORS phải khớp đúng origin đó.

## Phần 3. Mở Cloudflare Tunnel cho BE

Cài cloudflared một lần:

```
winget install --id Cloudflare.cloudflared
```

Chạy đủ các BE service (profile HTTPS, nó vẫn lắng nghe cổng HTTP bên dưới).
Mở 3 cửa sổ terminal riêng, mỗi cửa sổ một tunnel:

```
cloudflared tunnel --url http://localhost:5016
cloudflared tunnel --url http://localhost:5066
cloudflared tunnel --url http://localhost:5170
```

Mỗi lệnh in ra một URL trong khung, dạng `https://<ngau-nhien>.trycloudflare.com`.
Ghi lại 3 URL tương ứng:

| Tunnel trỏ tới       | Dùng cho env           |
| -------------------- | ---------------------- |
| `http://localhost:5016` | `VITE_AUTH_API_URL`    |
| `http://localhost:5066` | `VITE_MODULE1_API_URL` |
| `http://localhost:5170` | `VITE_MODULE3_API_URL` |

Giữ nguyên 3 cửa sổ terminal khi đang sử dụng. Đóng cửa sổ nào thì tunnel đó chết.

Lưu ý: URL quick tunnel đổi mỗi lần khởi động lại. Vì env `VITE_` được nhúng lúc
build, mỗi lần URL đổi phải cập nhật env trên Vercel và chạy lại `vercel --prod`.

## Phần 4. Cấu hình CORS ở BE (đã sửa sẵn)

Origin của Vercel đã được thêm vào `Cors:AllowedOrigins` trong 3 file appsettings:

- `BE/Logistics/Services/Authentication/LG.Authentication.API/appsettings.json`
- `BE/Logistics/Services/Module1/LG.Module1.API/appsettings.json`
- `BE/Logistics/Services/Core/LG.Core.API/appsettings.json`

Mỗi file có dòng `"https://muaho-fe.vercel.app"` trong mảng AllowedOrigins.

Sau khi sửa, restart lại 3 service để nạp cấu hình mới.

Nếu bạn truy cập app qua URL Production cố định thì cấu hình trên là đủ. Nếu bạn
dùng URL Preview (thay đổi liên tục), CORS khớp đúng origin sẽ chặn; khi đó cần
sửa code CORS để cho phép mọi tên miền con `*.vercel.app`.

## Phần 5. Điền Environment Variables trên Vercel

Vào Project muaho-fe, Settings, Environment Variables. Thêm các biến, scope cho cả
Production và Preview:

| Key                    | Value                                  |
| ---------------------- | -------------------------------------- |
| `VITE_AUTH_API_URL`    | URL tunnel của cổng 5016               |
| `VITE_MODULE1_API_URL` | URL tunnel của cổng 5066               |
| `VITE_MODULE3_API_URL` | URL tunnel của cổng 5170               |
| `VITE_EXTENSION_ID`    | ID extension Chrome (nếu dùng)         |

Quy tắc:

- Không có dấu `/` ở cuối URL.
- Env `VITE_` nhúng lúc build, nên mỗi lần thêm hoặc đổi env phải deploy lại.

Sau khi điền xong:

```
cd D:\MonHoc\DoAnTotNghiep2\FE
vercel --prod
```

## Phần 6. Kiểm tra end-to-end

Mở `https://muaho-fe.vercel.app`, bật DevTools, tab Network:

1. Đăng nhập: request tới `<auth-tunnel>/api/auth/login` trả 200.
2. Trang sản phẩm và giỏ hàng: request tới `<module1-tunnel>` trả 200.
3. Chatbot: SSE tới `<module1-tunnel>` chạy được. Module1 gọi Python gateway ở phía
   sau, không bị ảnh hưởng bởi phần này.

## Xử lý sự cố

| Triệu chứng | Nguyên nhân và cách xử lý |
| ----------- | -------------------------- |
| Lỗi CORS trong console | Origin Vercel chưa khớp trong appsettings, hoặc chưa restart service. Kiểm tra đúng chính tả và đã restart. |
| Mixed content | Còn URL `http://` ở đâu đó. Mọi URL phải là `https` (trycloudflare đã là https). |
| Trang trắng hoặc 404 khi F5 deep-link | Thiếu rewrite SPA hoặc preset SSR. Kiểm tra `vercel.json`, đổi Framework Preset sang Other. |
| Request tới trycloudflare timeout | Tunnel đã chết hoặc service BE chưa chạy. Mở lại tunnel, chạy lại BE. |
| API vẫn đỏ sau khi điền env | Chưa `vercel --prod` sau khi đổi env, hoặc URL còn dấu `/` ở cuối. |

## Điều kiện vận hành

- Máy local phải bật và chạy đủ các BE service cùng database trong suốt thời gian dùng.
- URL quick tunnel không cố định. Muốn URL cố định để khỏi sửa env mỗi lần: dùng
  Cloudflare Named Tunnel với một domain riêng (miễn phí nếu đã có domain), tạo 3
  subdomain cố định cho 3 service.
