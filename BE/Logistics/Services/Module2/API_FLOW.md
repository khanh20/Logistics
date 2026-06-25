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

## UC-2.05 — Thông quan Hải quan *(Phase 5 — ✅ done)*

**Actors:** Staff hải quan / customs broker — quyền `shipment.manage` (ghi) / `shipment.read` (đọc)

| Bước | Method | Endpoint | Body |
|------|--------|----------|------|
| 1. Tạo hồ sơ hải quan | `POST` | `/api/customs-clearances` | `{ containerTripId, clearanceType, declaredValueVnd?, hsCodeSummary? }` |
| 2. Cập nhật kết quả | `PUT` | `/api/customs-clearances/{id}` | `{ status, heldReason?, customsOfficerName?, dutyPaidVnd? }` |
| 3. Lấy thông tin | `GET` | `/api/customs-clearances/{id}` | — |
| 4. Lấy theo chuyến | `GET` | `/api/customs-clearances/by-trip/{tripId}` | — |
| 5. Lọc theo trạng thái | `GET` | `/api/customs-clearances?status=Pending` | — |

**`clearanceType`:** `Tmdt` / `TieuNgach` / `ChinhNgach` — **`status`:** `Pending` / `Processing` / `Cleared` / `Held`

**Kết quả khi cập nhật status:**
- `Held` → mỗi package trong chuyến: `InTransit→Customs`, ghi `TrackingEvent (BorderCustoms)` "Hàng bị giữ tại hải quan", notify khách
- `Cleared` → ghi `TrackingEvent` "Đã thông quan, hàng tiếp tục về kho VN"; set `ClearedAt`
- `Processing` → ghi `TrackingEvent` "Đang làm thủ tục thông quan"

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

## UC-2.07 — Tính cước quốc tế *(Phase 5 — ✅ done)*

**Actors:** Staff kho (`warehouse.manage`) — gọi sau khi cân tại kho VN

| Bước | Method | Endpoint | Body |
|------|--------|----------|------|
| Tính cước | `POST` | `/api/packages/{id}/calculate-fee` | `{ ratePerKgVnd, insuranceRate?, declaredValueVnd? }` |
| Xem chi tiết cước | `GET` | `/api/packages/{id}/fee` | — |

**Logic tính (lưu vào `packages`):**
- `chargedWeightKg` = max(actualWeight, volWeight, 0.3 kg) — đã tính sẵn khi cân
- `volWeightKg` = L×W×H / 8000
- `shipIntlVnd` = chargedWeightKg × ratePerKgVnd
- `insuranceFeeVnd` = declaredValueVnd × insuranceRate (chỉ khi `insuranceOpted = true`)
- `totalFeeVnd` = shipIntlVnd + insuranceFeeVnd
- Lỗi `PACKAGE_NOT_WEIGHED` nếu kiện chưa được cân (`chargedWeightKg` null)
- `GET /fee` trả `totalFeeVnd = null` nếu chưa từng tính cước

---

## UC-2.08 — Giao hàng nội địa *(Phase 6 — ✅ done)*

**Actors:** Khách hàng (`order.create` để tạo/huỷ, `order.read` để xem) — thao tác trên package của chính mình

| Bước | Method | Endpoint | Body |
|------|--------|----------|------|
| Tạo yêu cầu giao | `POST` | `/api/delivery-requests` | `{ packageIds: [], carrierId, deliveryAddressId, preferredTimeSlot?, codAmount? }` |
| Danh sách của tôi | `GET` | `/api/delivery-requests` | — |
| Xem chi tiết | `GET` | `/api/delivery-requests/{id}` | — |
| Huỷ yêu cầu | `DELETE` | `/api/delivery-requests/{id}` | — (chỉ khi `Pending`/`Confirmed`) |

**Carrier hỗ trợ:** GHTK (API thật), GHN/Viettel Post/J&T (stub) — seed sẵn trong `domestic_carriers`

**Body bắt buộc thêm thông tin người nhận** (để tạo vận đơn GHTK): `recipientName, recipientTel, province, district, ward, address`

**Luồng tạo (1 transaction):**
1. Validate package thuộc khách + đang `InVnWarehouse`; tổng `charged_weight ≤ MaxWeightKg` của carrier
2. `ICarrierGatewayResolver.Resolve(carrier)` → GHTK gateway (nếu đã cấu hình Token) hoặc stub
3. `gateway.QuoteAsync` → `ShipFeeVnd`; (stub) trừ ví khách
4. `gateway.CreateWaybillAsync` → tạo `DomesticWaybill` (lưu mã `label` GHTK), request → `Shipping`
5. Package `InVnWarehouse→Dispatched`, ghi `TrackingEvent (OutForDelivery)`, notify khách
- Lỗi: `EMPTY_DELIVERY_REQUEST`, `PACKAGE_NOT_READY_FOR_DELIVERY`, `CARRIER_INACTIVE`, `PACKAGE_WEIGHT_EXCEEDED`

### Tích hợp GHTK thật (`services.giaohangtietkiem.vn`)
| Mục đích | GHTK API |
|---|---|
| Báo giá | `GET /services/shipment/fee` (header `Token`, `X-Client-Source`; `weight` đơn vị gram) |
| Tạo đơn | `POST /services/shipment/order/?ver=1.5` → trả `order.label` = mã vận đơn |
| Webhook | GHTK `POST` form-urlencoded tới `/api/webhooks/ghtk`: `label_id, status_id, fee, reason...` |

- Cấu hình qua env/appsettings `Ghtk:Token`, `Ghtk:ClientSource`, `Ghtk:WebhookToken`, `Ghtk:Pick:*` (địa chỉ kho lấy hàng). Lấy Token tại trang cấu hình API GHTK.
- **Bỏ trống Token → tự fallback sang stub** (chạy được luồng end-to-end khi dev).
- Map `status_id` GHTK → enum nội bộ: `-1`→Cancelled, `1/2`→Created, `3/12`→PickedUp, `4`→OutForDelivery, `5/6`→Delivered, `9`→DeliveryFailed, `7/8/10`→InTransit, `11/13/20/21`→Returned.

---

## UC-2.09 — Webhook Carrier & Tracking *(Phase 6 — ✅ done)*

**Actors:** GHTK / GHN (gọi vào hệ thống) — `[AllowAnonymous]`, xác thực bằng HMAC signature

| Endpoint | Mô tả |
|----------|-------|
| `POST /api/webhooks/ghtk` | GHTK push trạng thái giao hàng |
| `POST /api/webhooks/ghn` | GHN push trạng thái giao hàng |

**Body GHN (JSON, stub):** `{ trackingNo, status, feeVnd?, reason?, signature? }` — `signature` = HMAC-SHA256(`trackingNo|status|feeVnd`, carrier.WebhookSecret), hex uppercase.

**Body GHTK (form-urlencoded, thật):** `label_id, status_id, fee, pick_money, reason, action_time, weight` — token GHTK gửi qua header `X-Apitoken` hoặc query `?token=`, so khớp `Ghtk:WebhookToken`.

Carrier chưa cấu hình secret/token → bỏ qua xác thực (dev).

**Xử lý:** xác thực chữ ký → map `status` raw→enum → cập nhật `DomesticWaybill` → đẩy `TrackingEvent`:
- `Delivered` → package `Dispatched→Delivered`, request `Delivered`, notify khách
- `DeliveryFailed` → `TrackingEvent`; nếu `attemptCount > 2` → request `Failed` + alert CSKH
- `Returned` → package `Dispatched→Returned`
- `PickedUp`/`InTransit`/`OutForDelivery` → `TrackingEvent` cập nhật hành trình
- Lỗi: `DOMESTIC_WAYBILL_NOT_FOUND` (404), `INVALID_WEBHOOK_SIGNATURE` (401)

---

## UC-2.10 — Khiếu nại & Bảo hiểm *(Phase 7 — ✅ done)*

**Actors:** Khách hàng (tạo, `order.create`) / Staff CSKH (xử lý, `complaint.manage`)

### Khiếu nại thất lạc (MissingClaim)
| Bước | Method | Endpoint | Body |
|------|--------|----------|------|
| Tạo khiếu nại | `POST` | `/api/missing-claims` | `{ packageId, description, evidenceUrls?, claimedValueVnd? }` |
| Xem chi tiết | `GET` | `/api/missing-claims/{id}` | — |
| DS của tôi | `GET` | `/api/my/missing-claims` | — |
| DS theo trạng thái (staff) | `GET` | `/api/missing-claims?status=Submitted` | — |
| Điều tra (staff) | `POST` | `/api/missing-claims/{id}/investigate` | `{ staffNote? }` |
| Xử lý (staff) | `POST` | `/api/missing-claims/{id}/resolve` | `{ resolution, claimedValueVnd?, staffNote? }` |
| Từ chối (staff) | `POST` | `/api/missing-claims/{id}/reject` | `{ reason }` |

**`resolution`:** `Refund` / `Reship` / `Rejected`. Khi `Refund`:
- Bồi thường = `claimedValue × coverage` (`Basic`=50%, `Full`=100%; kiện không mua bảo hiểm → lỗi `PACKAGE_NOT_INSURED`)
- Kiện `→ Lost` + `TrackingEvent (Exception)`; **tự sinh `InsuranceClaim` đã duyệt + chi trả** (stub RefundProcess → Module3), notify khách

### Bồi thường bảo hiểm (InsuranceClaim)
| Bước | Method | Endpoint | Body |
|------|--------|----------|------|
| Tạo yêu cầu | `POST` | `/api/insurance-claims` | `{ packageId, claimedAmountVnd, description, damagePhotos?, missingClaimId? }` |
| Xem chi tiết | `GET` | `/api/insurance-claims/{id}` | — |
| Duyệt/từ chối (staff) | `PUT` | `/api/insurance-claims/{id}` | `{ status, approvedAmountVnd?, notes? }` |
| Chi trả → hoàn ví (staff) | `POST` | `/api/insurance-claims/{id}/pay` | — |

- Tạo yêu cầu yêu cầu kiện đã mua bảo hiểm (`PACKAGE_NOT_INSURED` nếu không).
- `status` nhận `Approved` / `Rejected` / `UnderReview`. `pay` chỉ khi đã `Approved` (ngược lại `INVALID_CLAIM_STATE`).

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
