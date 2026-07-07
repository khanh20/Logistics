# PLAN — FE Module 2 (Logistics & Tracking)

Kế hoạch triển khai Frontend cho **Module 2** (vận chuyển TQ → VN → khách hàng).
BE đã xong; FE bắt đầu từ 0. Tài liệu này chia công việc theo **phase**, mỗi phase
độc lập, demo được, và bám sát convention sẵn có của repo FE.

- BE base URL: `https://localhost:7280` (env `VITE_MODULE2_API_URL`)
- Use case nguồn: `BE/Logistics/Services/Module2/API_FLOW.md` + `CLAUDE.md`
- Map endpoint chi tiết: xem [API_INTEGRATION.md](./API_INTEGRATION.md)

---

## Trạng thái (cập nhật 2026-07-02)

- ✅ **Phase 0–5 đã build xong toàn bộ** (Foundation, Customer tracking, Customer delivery, Staff warehouse/fee, Staff sack/container/customs, Claims & bảo hiểm). Verify bằng `tsc` + `typegen` (0 lỗi); **chưa chạy app thật** với BE.

### Đính chính so với tài liệu ban đầu (verify từ controller/DTO BE thật)

Một số điểm trong tài liệu gốc đoán sai shape — code đã build theo **BE thật**, không theo doc:

| Mục | Tài liệu gốc | Thực tế BE |
|-----|--------------|-----------|
| `GET /api/my/packages/{id}` (chi tiết kiện cho khách) | "có thể có" | **Không tồn tại** — khách chỉ có `list` + `{id}/tracking`. FE detail lấy summary từ `list()` rồi `.find()`. |
| `GET /api/packages/{id}` & `/fee` | dùng được cho khách | **Staff-only** (`warehouse.read`). Khách (`order.read`) không gọi được → **trang khách không hiển thị cước**. |
| `CreatePackageRequest` | `{ customerId, platformOrderId, description, declaredValueCny, insuranceLevel, packagingType }` | `{ customerId, orderId, packagingType?, insuranceOpted?, insuranceLevel? }` — không có description/declaredValueCny/platformOrderId. |
| List carrier (`domestic_carriers`) | "confirm với BE" | **Không có endpoint** → FE hard-code seed GUID (`B0000000-…-0001..0004`). Chỉ GHTK là API thật. |
| List warehouse zone | "confirm với BE" | **Không có endpoint** → `zoneCode` nhập tay khi receive-vn. |
| GET ảnh kiện | (ngầm định có) | **Không có** GET images → upload-only, chỉ hiển thị ảnh vừa thêm trong phiên. |
| List-all kiện cho staff | "có cần không?" | **Không có** → staff tra cứu theo barcode. |
| `assign-sacks` body | `{ sackIds: string[] }` | `{ sackCodes: string[] }` — **mã bao**, không phải id. |
| `reach-border` body | `ReachBorderRequest { arrivedAt? }` | **Không có body** — chỉ POST rỗng. |
| `CreateTripRequest` | `{ vehicleCode; driverName; borderCrossing; departureEta }` | `{ tripCode; borderCrossing; vehiclePlate?; driverPhone?; etaVnAt? }`. `depart`/`arrive-vn` cần `{ departureAt }`/`{ arrivedAt }`. |
| Quyền customs | warehouse.* | **`shipment.read` / `shipment.manage`** (sack/container vẫn warehouse.*). |
| List sack/trip/customs | (ngầm filter) | Lọc theo **1 status mỗi lần** (mặc định Packing/Loading/Pending) → FE có Segmented chọn status, không có "tất cả". |
| Status enum casing | "confirm" | **PascalCase** (string) cho mọi status; `TrackingEvent.occuredAt` (sic, thiếu chữ r). |
| Detail claim cho khách | "chỉ staff xem được?" | Customer **có `complaint.read`** (Permissions.cs) → khách gọi được `GET /missing-claims/{id}` và `GET /insurance-claims/{id}`. |
| `MissingClaimStatus` | `Submitted/Investigating/Resolved/Rejected` | Enum BE có thêm **`Confirmed`** nhưng `ClaimService` không bao giờ set → FE bỏ khỏi Segmented. |
| `InsuranceClaimStatus` | `UnderReview/Approved/Rejected` | Thực tế **5 trạng thái**: `Submitted/UnderReview/Approved/Rejected/Paid` (mặc định khi tạo là `Submitted`, `Paid` qua endpoint `/pay`). |
| List insurance-claims | (ngầm định có) | **Không có endpoint list** (cả staff lẫn khách) — chỉ `GET /{id}`. FE: staff tra theo ID / theo link từ missing claim; khách chỉ xem qua URL detail sau khi tạo. |
| `InsuranceClaimResponse` | (đủ field) | **Không trả `description`/`claimedAmountVnd`** — FE không hiển thị 2 field này sau khi tạo. |
| Resolve missing claim = Refund | (tách bước) | BE **tự động** tạo InsuranceClaim (Approve + MarkPaid luôn) + hoàn ví (stub Module3), đánh dấu kiện `Lost` + ghi tracking. Số hoàn = giá trị × coverage (basic 50%/full 100%). |
| Body claims | `ResolveClaimRequest`, `ReviewInsuranceClaimRequest` | Tên thật: `ResolveMissingClaimRequest { resolution; claimedValueVnd?; staffNote? }`, `UpdateInsuranceClaimRequest { status; approvedAmountVnd?; notes? }`; investigate có body `{ staffNote? }`. |
| Quyền list missing-claims (staff) | complaint.read | **`complaint.manage`** (staff chỉ có read sẽ 403 khi list). |

> ~~Lưu ý BE-side cần báo team~~ — **ĐÃ FIX TOÀN BỘ (2026-07-07):**
> - ✅ `GET /api/my/packages/{id}/tracking` giờ check ownership (kiện khác chủ → 404).
> - ✅ `GET /api/missing-claims/{id}` và `GET /api/insurance-claims/{id}`: staff (`complaint.manage`) xem mọi claim; khách chỉ xem claim của mình (khác chủ → 404, không lộ tồn tại).
> - ✅ Đã có `GET /api/my/insurance-claims` — FE thêm `insuranceClaimsApi.listMine()` + section "Yêu cầu bồi thường bảo hiểm" trong trang `customer/claims`.

---

## 0. Convention FE cần tuân theo (đọc trước khi code)

Repo đã có pattern rõ ràng — **bám theo, không tự tạo style mới**:

| Hạng mục | Pattern | Vị trí mẫu |
|----------|---------|-----------|
| API layer | object export, method gọi axios client, generic `<unknown, ApiResponse<T>>` | `app/lib/api/orders.ts` |
| HTTP client | axios instance riêng theo service, có refresh-token interceptor | `app/lib/api/client.ts` |
| Types | interface/type theo domain | `app/lib/types/order.ts`, `common.ts` |
| Enum/constant | union type + label map + helper | `app/lib/constants/orderStatus.ts` |
| Data fetch | `clientLoader()` cho lần đầu + local state cho filter/paging | `app/routes/customer/orders._index.tsx` |
| Route | khai báo trong `app/routes.ts` (`route()`, `prefix()`) | `app/routes.ts` |
| Layout/guard | `clientLoader` check `store.getState().authState`, redirect nếu thiếu quyền | `app/layouts/admin-layout.tsx` |
| Nav | item trong `AdminSidebar.tsx`, label qua i18n `t("nav.*")` | `app/components/admin/AdminSidebar.tsx` |
| UI | AntD v6 (`ConfigProvider` colorPrimary `#ef4444`) + Tailwind + components `ui/` | `app/components/ui/*` |
| Format | `formatVND`, `formatDate`, `formatCNY` | `app/lib/utils/format.ts` |
| Badge | `StatusBadge` | `app/components/shared/StatusBadge.tsx` |
| i18n | `useTranslation()` + key trong `app/locales` | mọi route |

---

## Phase 0 — Foundation (bắt buộc, ~0.5–1 ngày) — ✅ DONE

> Lưu ý: chỉ thêm enum/constant **được dùng tới** (package, delivery, warehouse, receipt, image…). Các enum customs/claims sẽ bổ sung ở Phase 4–5. Chưa tạo file `.env` (theo Module3, dùng fallback URL trong code).

Mục tiêu: hạ tầng dùng chung cho mọi màn hình Module 2.

- [ ] **Client**: thêm `apiModule2Client` (port 7280) vào `app/lib/api/client.ts` + `.env` `VITE_MODULE2_API_URL`.
- [ ] **Types**: tạo `app/lib/types/logistics.ts` — Package, TrackingEvent, Sack, ContainerTrip, CustomsClearance, DeliveryRequest, DomesticWaybill, MissingClaim, InsuranceClaim, Warehouse, PackageFee, các Request DTO.
- [ ] **Enums/constants**: `app/lib/constants/logistics.ts` — label + màu badge cho:
  - `PackageStatus`, `CustomsStatus`, `ClearanceType`, `DeliveryRequestStatus`, `WaybillStatus`, `MissingClaimStatus`/`Resolution`, `InsuranceClaimStatus`, `InsuranceLevel`, `PackagingType`, `TrackingEventType`.
- [ ] **i18n**: thêm namespace `logistics.*` và `nav.*` (warehouses, packages, sacks, container_trips, customs, delivery, claims) vào `app/locales`.
- [ ] **Reuse `StatusBadge`** cho status mới (mapping màu trong constants).
- [ ] (tuỳ chọn) helper `formatWeight(kg)` trong `utils/format.ts`.

> Định nghĩa enum/status chính xác: xem bảng cuối [API_INTEGRATION.md](./API_INTEGRATION.md).

---

## Phase 1 — Customer: Tracking đơn hàng (UC tracking, ~1–1.5 ngày) — ✅ DONE

> Khác kế hoạch: không có endpoint detail cho khách → detail lấy từ `list()` + `.find()`; **không hiển thị cước/kích thước/vol** (chỉ có trong `PackageDetail` staff-only). Có thêm link "Xem đơn" về `/orders/{orderId}`.

Giá trị cao nhất, read-only, demo được ngay. Đây là phần khách xem hành trình kiện hàng.

**API**: `GET /api/my/packages`, `GET /api/my/packages/{id}`, `GET /api/my/packages/{id}/tracking`

- [ ] `app/lib/api/logistics.ts` → `myPackagesApi` (list, getDetail, getTracking).
- [ ] Route `route("packages", ".../customer/packages._index.tsx")` — danh sách kiện của tôi, filter theo `PackageStatus`, badge trạng thái, cân nặng, mã barcode.
- [ ] Route `route("packages/:id", ".../customer/packages.$id.tsx")` — chi tiết kiện:
  - Thông tin: barcode, cân nặng (actual/vol/charged), kích thước, gói bảo hiểm, cước (nếu đã tính).
  - **Timeline tracking**: dùng AntD `Timeline`/`Steps` map từ `TrackingEvent[]` (type → label + icon + thời gian + location + note).
- [ ] Component `components/customer/PackageTimeline.tsx` (tái sử dụng).
- [ ] Thêm nav "Đơn vận chuyển" vào `customer-layout`/sidebar customer.

**Definition of done**: khách đăng nhập → thấy danh sách kiện → mở chi tiết → thấy timeline từ "Nhập kho TQ" đến "Đã giao".

---

## Phase 2 — Customer: Yêu cầu giao nội địa (UC-2.08, ~1.5 ngày) — ✅ DONE

> Đã làm: `delivery-requests.{_index,$id,new}.tsx` + `deliveryRequestsApi` + `DeliveryStatusBadge`. Carrier hard-code seed (GHN/VTP/J&T gắn nhãn "demo", GHTK mặc định); cảnh báo vượt `maxWeightKg` trước khi submit; map đủ 7 errorCode; cước hiển thị "tạm tính", không đụng ví. **province/district/ward nhập tay** (sổ địa chỉ Module3 chỉ lưu mã, không có tên text).

> ⚠️ **BE Phase 6 đang DỞ DANG.** Luồng lõi (báo giá/tạo đơn GHTK/webhook) chạy được nhờ stub fallback nên FE
> vẫn build được, nhưng cần biết các giới hạn hiện tại của BE:
> - **Huỷ đơn** chỉ update DB, chưa gọi cancel trên GHTK → FE cứ gọi `DELETE` bình thường, nhưng đừng hứa "đã huỷ trên hãng vận chuyển".
> - **Trừ ví khách = stub** (chờ Module3) → FE không hiển thị/đối soát số dư ví trong luồng này (hoặc đánh dấu "tạm tính").
> - **GHN/Viettel Post/J&T = stub**, chỉ **GHTK** là API thật → demo nên ưu tiên GHTK.
> - Địa chỉ lấy trực tiếp từ body request, **chưa reconcile sổ địa chỉ** → FE vẫn gửi đủ `recipient*`/`province/district/ward/address`.
> → Có thể làm **sau** Phase 3 (warehouse) nếu muốn chờ BE hoàn thiện Phase 6; không chặn các phase khác.

**API**: `POST/GET/DELETE /api/delivery-requests`, `GET /api/delivery-requests/{id}`

- [ ] `deliveryRequestsApi` (create, list, getDetail, cancel).
- [ ] Route `delivery-requests` (list của tôi) + `delivery-requests/:id` (chi tiết + trạng thái vận đơn).
- [ ] Form tạo yêu cầu giao (modal hoặc route `delivery-requests/new`):
  - Chọn `packageIds` (chỉ kiện `InVnWarehouse`), chọn carrier (`GET` danh sách carrier — dùng list seed; nếu chưa có endpoint list carrier thì hard-code GHTK/GHN/VTP/J&T theo seed BE).
  - Chọn địa chỉ (reuse `app/routes/customer/addresses.tsx` / address API), `preferredTimeSlot`, `codAmount`.
  - **Bắt buộc**: `recipientName, recipientTel, province, district, ward, address` (để tạo vận đơn GHTK).
  - Hiển thị `shipFeeVnd` trả về sau khi tạo.
- [ ] Map lỗi BE → toast: `EMPTY_DELIVERY_REQUEST`, `PACKAGE_NOT_READY_FOR_DELIVERY`, `CARRIER_INACTIVE`, `PACKAGE_WEIGHT_EXCEEDED`.
- [ ] Nút huỷ chỉ enable khi status `Pending`/`Confirmed`.

> ⚠️ Cần xác nhận với BE: có endpoint **list carrier** (`domestic_carriers`) cho FE không? Nếu không, FE hard-code theo seed. Xem mục "Câu hỏi cho BE".

---

## Phase 3 — Staff: Nhập kho & Cân đo & Cước (UC-2.01, 2.06, 2.07, ~2 ngày) — ✅ DONE

> Đã làm: `admin/warehouses._index.tsx` (list + modal receive-cn/vn, cảnh báo lệch cân), `admin/packages._index.tsx` (tra cứu barcode + tạo kiện), `admin/packages.$id.tsx` (chi tiết + tính cước + ảnh + timeline). `BarcodeScanInput` tái sử dụng. Nút mutating gated bằng `hasPermission("warehouse.manage")`. Giới hạn: không list-all kiện, không GET ảnh, không list zone (xem bảng đính chính ở đầu file).

Nhóm thao tác vận hành kho — màn hình staff/admin (`prefix("admin")`).

**API**: `GET /api/warehouses`, `POST /api/packages`, `POST /api/warehouses/{id}/receive-cn`,
`POST /api/warehouses/{id}/receive-vn`, `POST /api/packages/{id}/images`,
`POST /api/packages/{id}/calculate-fee`, `GET /api/packages/{id}/fee`,
`GET /api/packages/{id}`, `GET /api/packages/barcode/{barcode}`, `GET /api/packages/{id}/tracking`

- [ ] `warehouseApi`, `packagesApi` trong `logistics.ts`.
- [ ] Route `admin/warehouses` — danh sách kho (type, sức chứa).
- [ ] Route `admin/packages` — **tra cứu theo barcode** (BE không có list-all cho staff → search box theo barcode/id) + tạo package mới (`POST /api/packages`).
- [ ] Route `admin/packages/:id` — chi tiết kiện cho staff: thông tin, ảnh, tracking, **nút tính cước** (`calculate-fee` với `ratePerKgVnd`, `insuranceRate`), xem `fee`.
- [ ] **Nhập kho TQ** (UC-2.01): form `receive-cn` (barcode, actualWeightKg, L/W/H, chinaWaybillCode) → hiển thị cảnh báo nếu variance > 10%.
- [ ] **Nhập kho VN** (UC-2.06): form `receive-vn` (barcode, zoneCode, cân lại) → toast "đã về kho VN".
- [ ] Upload ảnh kiện (`images`: type receipt/dispatch/damage/inspection).
- [ ] Component `BarcodeScanInput` (nhập tay/quét) tái sử dụng cho receive-cn/vn & sack.

---

## Phase 4 — Staff: Đóng bao + Chuyến container + Thông quan (UC-2.03, 2.04, 2.05, ~2.5 ngày) — ✅ DONE

> Đã làm: `admin/sacks._index.tsx` (list theo status + tạo bao + Drawer: thêm/rã kiện theo barcode, kẹp chì — chỉ khi `Packing`), `admin/container-trips._index.tsx` (list + tạo + Drawer: gán bao theo **mã bao**, `StatusStepper`, nút wizard depart→reach-border→arrive-vn theo status), `admin/customs._index.tsx` (list theo status + tạo theo `containerTripId` + cập nhật status/heldReason/duty). Mọi list lọc theo **1 status** (Segmented). Sack/container gated `warehouse.manage`; customs gated `shipment.manage`. Error map `SHIPMENT_ERROR_MESSAGE` (SACK_SEALED, SACK_MIXED_FRAGILE, …). `depart`/`arrive-vn` gửi timestamp hiện tại.

**API**:
- Sack: `POST /api/sacks`, `GET /api/sacks`, `GET /api/sacks/{id}`, `GET /api/sacks/code/{code}`, `POST /api/sacks/{id}/packages`, `DELETE /api/sacks/{id}/packages/{barcode}`, `POST /api/sacks/{id}/seal`
- Container: `POST /api/container-trips`, `GET /api/container-trips`, `GET /api/container-trips/{id}`, `POST .../assign-sacks`, `POST .../depart`, `POST .../reach-border`, `POST .../arrive-vn`
- Customs: `POST /api/customs-clearances`, `GET /api/customs-clearances?status=`, `GET /api/customs-clearances/{id}`, `GET /api/customs-clearances/by-trip/{tripId}`, `PUT /api/customs-clearances/{id}`

- [ ] `sacksApi`, `containerTripsApi`, `customsApi`.
- [ ] Route `admin/sacks` — list + tạo bao, thêm/xoá package theo barcode, **kẹp chì** (`seal` + sealCode). Cảnh báo không trộn fragile + normal.
- [ ] Route `admin/container-trips` — list + tạo chuyến, gán bao (`assign-sacks`), và **action chuyển trạng thái** theo wizard: `depart → reach-border → arrive-vn` (nút theo status hiện tại).
- [ ] Route `admin/customs` — list theo status, tạo hồ sơ (theo `containerTripId`), cập nhật kết quả (`status`: Pending/Processing/Cleared/Held, `heldReason`, `dutyPaidVnd`). Xem theo chuyến.
- [ ] Component `StatusStepper` cho luồng container trip (loading → departed → border → arrived_vn).

---

## Phase 5 — Khiếu nại & Bảo hiểm (UC-2.10, ~2 ngày) — ✅ DONE

> Đã làm: `customer/claims.{_index,$id}.tsx` + `customer/claims.insurance.$id.tsx` (list khiếu nại của tôi + modal tạo missing/insurance claim, detail 2 chiều link nhau qua `insuranceClaimId`/`missingClaimId`), `admin/claims._index.tsx` (Segmented 4 status + Điều tra/Xử lý/Từ chối; Drawer bồi thường tra theo ID với Thẩm định/Duyệt/Từ chối/Chi trả), `missingClaimsApi` + `insuranceClaimsApi`, `ClaimStatusBadge` (2 badge), `CLAIM_ERROR_MESSAGE`. Action staff gated `hasPermission("complaint.manage")`. Modal bồi thường chỉ cho chọn kiện `insuranceOpted`; form Xử lý cảnh báo trước khi Refund kiện không bảo hiểm. Giới hạn từ BE: không list insurance-claims (khách phải giữ link detail), response bồi thường không có description/claimedAmountVnd.

Cả 2 phía: khách tạo, staff xử lý.

**API**:
- Missing: `POST /api/missing-claims`, `GET /api/missing-claims/{id}`, `GET /api/my/missing-claims`, `GET /api/missing-claims?status=`, `POST .../investigate`, `POST .../resolve`, `POST .../reject`
- Insurance: `POST /api/insurance-claims`, `GET /api/insurance-claims/{id}`, `PUT /api/insurance-claims/{id}`, `POST /api/insurance-claims/{id}/pay`

**Customer:**
- [ ] Route `customer/claims` — tạo khiếu nại thất lạc (`packageId`, mô tả, `evidenceUrls`, `claimedValueVnd`), danh sách `my/missing-claims`, chi tiết + trạng thái xử lý.
- [ ] Tạo yêu cầu bảo hiểm (`insurance-claims`) cho kiện đã mua bảo hiểm — xử lý lỗi `PACKAGE_NOT_INSURED`.

**Staff (admin):**
- [ ] Route `admin/claims` — list theo status, nút **Điều tra / Xử lý (Refund/Reship/Reject) / Từ chối**.
- [ ] Quản lý insurance-claim: duyệt/từ chối (`PUT` status Approved/Rejected/UnderReview, `approvedAmountVnd`), **chi trả** (`pay`, chỉ khi Approved — chặn nếu `INVALID_CLAIM_STATE`).
- [ ] Hiển thị mức bồi thường theo `insuranceLevel` (basic 50% / full 100%).

---

## Tổng hợp Route mới

```ts
// Customer (trong customer-layout)
route("packages",              "routes/customer/packages._index.tsx"),
route("packages/:id",          "routes/customer/packages.$id.tsx"),
route("delivery-requests",     "routes/customer/delivery-requests._index.tsx"),
route("delivery-requests/:id", "routes/customer/delivery-requests.$id.tsx"),
route("claims",                "routes/customer/claims._index.tsx"),
route("claims/insurance/:id",  "routes/customer/claims.insurance.$id.tsx"),
route("claims/:id",            "routes/customer/claims.$id.tsx"),

// Admin/Staff (trong prefix("admin"))
route("warehouses",      "routes/admin/warehouses._index.tsx"),
route("packages",        "routes/admin/packages._index.tsx"),
route("packages/:id",    "routes/admin/packages.$id.tsx"),
route("sacks",           "routes/admin/sacks._index.tsx"),
route("container-trips", "routes/admin/container-trips._index.tsx"),
route("customs",         "routes/admin/customs._index.tsx"),
route("claims",          "routes/admin/claims._index.tsx"),
```

## File mới (gợi ý cấu trúc)

```
app/lib/api/logistics.ts          # tất cả API method Module 2
app/lib/types/logistics.ts        # types/DTO
app/lib/constants/logistics.ts    # enum label + màu badge
app/components/customer/PackageTimeline.tsx
app/components/admin/BarcodeScanInput.tsx
app/components/admin/StatusStepper.tsx
app/routes/customer/packages._index.tsx ...
app/routes/admin/warehouses._index.tsx ...
```

---

## Phân quyền FE (khớp BE)

| Màn hình | Guard |
|----------|-------|
| `customer/packages`, `delivery-requests`, `claims` | đăng nhập (customer) — `customer-layout` đã check token |
| `admin/*` Module 2 | `STAFF_ROLES` — `admin-layout` đã check |
| Action staff (receive, seal, customs, resolve claim) | kiểm tra `hasPermission` (`warehouse.manage`, `shipment.manage`, `complaint.manage`) bằng `useAuth()` để ẩn/disable nút |

> Permission string lấy từ API_FLOW: `warehouse.manage`, `shipment.manage`/`shipment.read`, `order.create`/`order.read`, `complaint.manage`.

---

## Ước lượng & thứ tự

| Phase | Nội dung | Ưu tiên | Ước lượng |
|-------|----------|---------|-----------|
| 0 | Foundation | P0 | 0.5–1d |
| 1 | Customer tracking | P0 | 1–1.5d |
| 2 | Customer delivery request | P1 | 1.5d |
| 3 | Staff warehouse + fee | P1 | 2d |
| 4 | Staff sack/container/customs | P2 | 2.5d |
| 5 | Claims (2 phía) | P2 | 2d |

Tổng ~9.5–11.5 ngày-người. Có thể song song: Phase 1–2 (customer) và Phase 3–4 (staff) chạy độc lập sau khi xong Phase 0.

---

## Câu hỏi cần chốt với BE (bạn)

1. **List carrier**: có endpoint `GET /api/domestic-carriers` cho FE chọn không? (Phase 2 cần)
2. **List package cho staff**: BE chỉ có get theo id/barcode. Có cần endpoint list/paginate + filter cho màn quản lý kho không?
3. **List warehouse zone** theo kho (cho dropdown `zoneCode` khi receive-vn)?
4. **Shape response chính xác** của từng entity (field names) — FE sẽ dựng `types/logistics.ts` từ DTO ở `LG.Module2.ApplicationServices/DTOs/*`. Cần BE confirm hoặc share Swagger.
5. **Swagger/OpenAPI** của Module 2 có bật không (port 7280)? Nếu có, FE có thể gen type nhanh.
6. CORS cho FE origin đã mở trên Module2 API chưa?

---

## Rủi ro & lưu ý

- **Self-signed HTTPS** (localhost:7280): dev cần trust cert hoặc dùng http port `5080`.
- **Webhook GHTK/GHN**: hoàn toàn server-side, FE không đụng tới — chỉ hiển thị kết quả qua tracking/waybill status.
- **Field naming**: dựng type theo DTO thực tế, đừng đoán; verify bằng Swagger/response thật trước khi build UI.
- BE có **stub fallback** khi chưa cấu hình GHTK Token → luồng end-to-end vẫn chạy được khi demo FE.
