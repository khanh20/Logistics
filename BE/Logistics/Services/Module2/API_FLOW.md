# Module 2 — API Flow theo Use Case

## Tổng quan luồng hàng: Trung Quốc → Việt Nam → Khách hàng

```
Shop TQ gửi hàng
    ↓
[UC-2.01] Nhập kho TQ (cân đo, gắn barcode)
    ↓
[UC-2.03] Đóng bao / kẹp chì
    ↓
[UC-2.04] Chuyến container: Xuất phát → Cửa khẩu → Đến VN
    ↓
[UC-2.05] Thông quan hải quan
    ↓
[UC-2.06] Nhập kho VN (phân zone, tái cân)
    ↓
[UC-2.07] Tính cước quốc tế
    ↓
[UC-2.08] Tạo yêu cầu giao nội địa (GHTK/GHN)
    ↓
[UC-2.09] Webhook carrier cập nhật tracking
    ↓
Khách nhận hàng ✅
```

---

## UC-2.01 — Nhập kho Trung Quốc (Cân đo & Barcode)

**Actors:** Staff kho TQ

| Bước | Method | Endpoint | Body / Params |
|------|--------|----------|---------------|
| 1. Tạo package mới | `POST` | `/api/packages` | `{ customerId, platformOrderId, description, declaredValueCny, insuranceLevel, packagingType }` |
| 2. Nhập kho TQ — cân đo | `POST` | `/api/warehouses/{warehouseId}/receive-cn` | `{ barcode, actualWeightKg, lengthCm, widthCm, heightCm, chinaWaybillCode? }` |
| 3. Upload ảnh (tuỳ chọn) | `POST` | `/api/packages/{id}/images` | `{ imageUrl, imageType }` |

**Kết quả:**
- Package chuyển sang status `InCnWarehouse`
- `WarehouseReceipt` (type=ChinaIn) được tạo
- `TrackingEvent` (type=CnWarehouseIn) được ghi
- Nếu chênh lệch cân >10% so với khai báo → `WeightVarianceAlert` log

---

## UC-2.03 — Đóng bao / Kẹp chì

**Actors:** Staff kho TQ

| Bước | Method | Endpoint | Body / Params |
|------|--------|----------|---------------|
| 1. Tạo bao mới | `POST` | `/api/sacks` | `{ code?, maxWeightKg?, notes? }` |
| 2. Thêm package vào bao | `POST` | `/api/sacks/{sackId}/packages` | `{ packageBarcode }` — lặp lại cho từng kiện |
| 3. Kẹp chì / niêm phong | `POST` | `/api/sacks/{sackId}/seal` | `{ sealCode }` |

**Kết quả:**
- Package chuyển sang `InSack`
- Sack status → `Sealed`
- Không thể trộn hàng fragile và normal trong cùng 1 bao

---

## UC-2.04 — Chuyến Container

**Actors:** Staff điều vận

| Bước | Method | Endpoint | Body / Params |
|------|--------|----------|---------------|
| 1. Tạo chuyến | `POST` | `/api/container-trips` | `{ vehicleCode, driverName, borderCrossing, departureEta }` |
| 2. Gắn bao vào chuyến | `POST` | `/api/container-trips/{id}/assign-sacks` | `{ sackIds: [...] }` |
| 3. Xuất phát | `POST` | `/api/container-trips/{id}/depart` | `{}` |
| 4. Đến cửa khẩu | `POST` | `/api/container-trips/{id}/reach-border` | `{ arrivedAt? }` |
| 5. Đến Việt Nam | `POST` | `/api/container-trips/{id}/arrive-vn` | `{ arrivedAt? }` |

**Kết quả theo từng bước:**
- `/depart` → tất cả packages → `InTransit`, TrackingEvent `CnWarehouseOut`
- `/reach-border` → TrackingEvent `BorderCustoms` cho tất cả packages
- `/arrive-vn` → tất cả Sacks → `Arrived`

---

## UC-2.05 — Thông quan Hải quan *(Phase 5 — sắp triển khai)*

**Actors:** Staff hải quan / customs broker

| Bước | Method | Endpoint | Body |
|------|--------|----------|------|
| 1. Tạo hồ sơ hải quan | `POST` | `/api/customs-clearances` | `{ containerTripId, declarationCode, totalDeclaredValueCny }` |
| 2. Cập nhật kết quả | `PUT` | `/api/customs-clearances/{id}` | `{ status, taxAmount, clearedAt, notes }` |
| 3. Lấy thông tin | `GET` | `/api/customs-clearances/{id}` | — |

---

## UC-2.06 — Nhập kho Việt Nam

**Actors:** Staff kho VN

| Bước | Method | Endpoint | Body / Params |
|------|--------|----------|---------------|
| Nhập kho VN — quét barcode | `POST` | `/api/warehouses/{vnWarehouseId}/receive-vn` | `{ barcode, zoneCode, actualWeightKg?, lengthCm?, widthCm?, heightCm? }` |

*(Lặp lại cho từng kiện hàng)*

**Kết quả:**
- Package → `InVnWarehouse`
- `WarehouseReceipt` (type=VnIn) được tạo
- `TrackingEvent` (type=VnWarehouseIn)
- Notification gửi đến khách hàng: "Hàng đã về kho VN"

---

## UC-2.07 — Tính cước quốc tế *(Phase 5 — sắp triển khai)*

**Actors:** Hệ thống (tự động sau khi nhập kho VN)

| Bước | Method | Endpoint | Body |
|------|--------|----------|------|
| Tính cước | `POST` | `/api/packages/{id}/calculate-fee` | `{ ratePerKg, insuranceRate }` |
| Xem chi tiết cước | `GET` | `/api/packages/{id}/fee` | — |

**Logic tính:**
- `chargedWeightKg` = max(actualWeight, volWeight, 0.3 kg)
- `volWeightKg` = L×W×H / 8000
- `shippingFee` = chargedWeightKg × ratePerKg
- `insuranceFee` = declaredValueVnd × insuranceRate (nếu có bảo hiểm)

---

## UC-2.08 — Giao hàng nội địa *(Phase 6 — pending)*

**Actors:** Staff kho VN / Hệ thống

| Bước | Method | Endpoint | Body |
|------|--------|----------|------|
| Tạo yêu cầu giao | `POST` | `/api/delivery-requests` | `{ packageId, carrierId, recipientName, recipientPhone, deliveryAddress }` |
| Xem trạng thái | `GET` | `/api/delivery-requests/{id}` | — |
| Huỷ yêu cầu | `DELETE` | `/api/delivery-requests/{id}` | — |

**Carrier hỗ trợ:** GHTK, GHN, Viettel Post, J&T Express

---

## UC-2.09 — Webhook Carrier & Tracking *(Phase 6 — pending)*

**Actors:** GHTK / GHN (gọi vào hệ thống)

| Endpoint | Mô tả |
|----------|-------|
| `POST /api/webhooks/ghtk` | GHTK push trạng thái giao hàng |
| `POST /api/webhooks/ghn` | GHN push trạng thái giao hàng |

**Kết quả:** Tạo `TrackingEvent` tương ứng, cập nhật `DomesticWaybill.status`

---

## UC-2.10 — Khiếu nại & Bảo hiểm *(Phase 7 — pending)*

**Actors:** Khách hàng / Staff

| Bước | Method | Endpoint | Body |
|------|--------|----------|------|
| Tạo khiếu nại mất hàng | `POST` | `/api/missing-claims` | `{ packageId, description, evidenceUrls }` |
| Tạo yêu cầu bảo hiểm | `POST` | `/api/insurance-claims` | `{ packageId, claimedAmountVnd, description }` |
| Cập nhật kết quả | `PUT` | `/api/insurance-claims/{id}` | `{ status, approvedAmountVnd, notes }` |

---

## Tracking từ phía Khách hàng

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/my/packages` | Danh sách tất cả đơn hàng của tôi |
| `GET` | `/api/my/packages/{id}` | Chi tiết một đơn |
| `GET` | `/api/my/packages/{id}/tracking` | Lịch sử tracking events |

**Package Status Timeline:**
```
PendingCn → InCnWarehouse → InSack → InTransit → InVnWarehouse → OutForDelivery → Delivered
                                                                                 → Lost
                                                                                 → Returned
```

---

## Ví dụ Timeline đầy đủ

```
[2026-05-10 09:00] Khách đặt hàng từ shop TQ → Package tạo (PendingCn)
[2026-05-11 14:00] Shop gửi hàng → Staff kho TQ nhận + cân đo (InCnWarehouse)
[2026-05-12 10:00] Đóng vào bao SACK-20260512-001234 (InSack)
[2026-05-13 06:00] Container CONT-20260513-001 xuất phát (InTransit)
[2026-05-14 08:00] Đến cửa khẩu Hữu Nghị — chờ thông quan
[2026-05-14 16:00] Thông quan xong — xe qua biên giới
[2026-05-15 10:00] Đến kho Hà Nội (InVnWarehouse) — SMS thông báo khách
[2026-05-16 09:00] Giao cho GHN giao nội địa (OutForDelivery)
[2026-05-16 15:30] Khách nhận hàng ✅ (Delivered)
```

---

## Phân quyền (Permissions)

| Role | Quyền truy cập |
|------|---------------|
| `Staff` | Tất cả `/api/warehouses`, `/api/packages`, `/api/sacks`, `/api/container-trips` |
| `Customer` | Chỉ `/api/my/packages/**` (xem đơn của mình) |
| `Admin` | Toàn bộ hệ thống |
| `Carrier (webhook)` | `POST /api/webhooks/**` (no-auth hoặc HMAC signature) |
