# FE — Module 2 (Logistics & Tracking)

Bộ tài liệu cho phần **Frontend** tích hợp với BE Module 2 (vận chuyển TQ → VN → khách,
tracking, giao nội địa GHTK/GHN, khiếu nại & bảo hiểm).

> **Trạng thái BE (2026-06-25):** Phase 1–5 ✅ + Phase 7 ✅ done; **Phase 6 (giao nội địa UC-2.08/2.09) 🚧 dở dang**; Phase 8 (AI) 🔲 pending.

### Tiến độ FE (cập nhật 2026-07-02)

| FE Phase | Nội dung | Trạng thái |
|----------|----------|-----------|
| 0 | Foundation (client, types, constants, nav, badge) | ✅ Done |
| 1 | Customer tracking (danh sách kiện + chi tiết + timeline) | ✅ Done |
| 2 | Customer delivery request (tạo/list/chi tiết/huỷ) | ✅ Done |
| 3 | Staff warehouse + nhập kho TQ/VN + tính cước + ảnh | ✅ Done |
| 4 | Staff sack / container / customs | ✅ Done |
| 5 | Claims (khách + staff) | ✅ Done |

> ⚠️ Tất cả mới verify bằng `tsc` + `react-router typegen` (0 lỗi); **chưa chạy app thật** với BE `:7280`.

**Đã build (file thực tế):** `lib/api/logistics.ts`, `lib/types/logistics.ts`, `lib/constants/logistics.ts`;
`components/customer/PackageTimeline.tsx`, `components/shared/PackageStatusBadge.tsx`, `components/shared/DeliveryStatusBadge.tsx`, `components/shared/ClaimStatusBadge.tsx`, `components/admin/BarcodeScanInput.tsx`, `components/admin/StatusStepper.tsx`;
`routes/customer/packages._index.tsx` + `packages.$id.tsx`, `routes/customer/delivery-requests.{_index,$id,new}.tsx`, `routes/customer/claims.{_index,$id}.tsx` + `claims.insurance.$id.tsx`;
`routes/admin/warehouses._index.tsx`, `routes/admin/packages._index.tsx` + `packages.$id.tsx`,
`routes/admin/sacks._index.tsx`, `routes/admin/container-trips._index.tsx`, `routes/admin/customs._index.tsx`, `routes/admin/claims._index.tsx`.

### Trạng thái BE theo Use Case (đối chiếu khi build FE)

| Phase | Use Case | BE | FE build được? |
|-------|----------|-----|----------------|
| 3 | UC-2.01 nhập kho TQ, UC-2.06 nhập kho VN | ✅ | ✅ |
| 4 | UC-2.03 đóng bao, UC-2.04 container | ✅ | ✅ |
| 5 | UC-2.05 hải quan, UC-2.07 tính cước | ✅ | ✅ |
| 6 | UC-2.08 giao nội địa, UC-2.09 webhook | 🚧 dở dang | ⚠️ luồng lõi chạy (stub fallback), xem lưu ý |
| 7 | UC-2.10 khiếu nại & bảo hiểm | ✅ | ✅ |
| 8 | AI forecast | 🔲 | — chưa có API |

**Phase 6 — BE còn thiếu (ảnh hưởng FE delivery):** huỷ đơn chưa gọi GHTK; chưa query trạng thái chủ động; **trừ ví khách = stub** (chờ Module3); **GHN/VTP/J&T = stub** (chỉ GHTK thật); địa chỉ lấy từ body, chưa reconcile sổ địa chỉ.

## Tài liệu

| File | Nội dung |
|------|----------|
| [PLAN.md](./PLAN.md) | Kế hoạch triển khai FE theo phase, danh sách màn hình, component, checklist công việc |
| [API_INTEGRATION.md](./API_INTEGRATION.md) | Map endpoint BE → FE API method, code mẫu client/types, bảng enum & status |

## Tóm tắt nhanh (TL;DR)

- BE Module 2 chạy ở `https://localhost:7280` → thêm `apiModule2Client` vào `app/lib/api/client.ts`.
- 2 nhóm người dùng:
  - **Customer**: xem đơn + tracking timeline, tạo yêu cầu giao nội địa, khiếu nại/bảo hiểm.
  - **Staff/Admin**: nhập kho TQ/VN, đóng bao, chuyến container, thông quan, tính cước, xử lý khiếu nại.
- Webhook (GHTK/GHN) là server-to-server → **FE không làm gì**.

## Thứ tự ưu tiên đề xuất

1. ✅ **Foundation** (client, types, enums, nav, status badge) — bắt buộc trước.
2. ✅ **Customer tracking** (read-only, giá trị cao, demo được ngay).
3. ✅ **Customer delivery request** (UC-2.08).
4. ✅ **Staff warehouse ops** (UC-2.01, 2.06, 2.07).
5. ✅ **Staff sack / container / customs** (UC-2.03, 2.04, 2.05).
6. ✅ **Claims** (UC-2.10) cả 2 phía.

**Còn lại:** chạy end-to-end với BE thật (`:7280`) để smoke-test toàn bộ 6 phase; chờ BE hoàn thiện Phase 6 (delivery) và Phase 8 (AI).
