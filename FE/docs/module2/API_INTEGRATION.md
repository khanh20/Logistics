# API_INTEGRATION — FE ⇄ BE Module 2

Hướng dẫn tích hợp FE với BE Module 2. Base URL: `https://localhost:7280`
(`VITE_MODULE2_API_URL`). Mọi response bọc trong `ApiResponse<T>` (`app/lib/types/common.ts`).

> Nguồn endpoint: controllers tại `BE/.../Module2/LG.Module2.API/Controllers/*` và `API_FLOW.md`.

---

## 1. Thêm client (`app/lib/api/client.ts`)

```ts
// Module2 service — port 7280 (with refresh interceptor)
export const apiModule2Client = createClient(
  import.meta.env.VITE_MODULE2_API_URL ?? "https://localhost:7280",
);
```

`.env` (tuỳ chọn — hiện FE **chưa có file `.env`**, dùng fallback URL trong code như Module1/3):
```
VITE_MODULE2_API_URL=https://localhost:7280
```

---

## 2. Map endpoint → FE API method

Toàn bộ gom vào `app/lib/api/logistics.ts`, theo style `orders.ts`
(`apiModule2Client.get<unknown, ApiResponse<T>>(...)`).

### Customer

| Nhóm | Method API | Endpoint | FE method |
|------|-----------|----------|-----------|
| Packages | GET | `/api/my/packages` *(KHÔNG phân trang)* | `myPackagesApi.list()` |
| | GET | `/api/my/packages/{id}` | ❌ **không tồn tại** — detail lấy từ `list()` + `.find()` |
| | GET | `/api/my/packages/{id}/tracking` | `myPackagesApi.getTracking(id)` |
| Delivery | POST | `/api/delivery-requests` | `deliveryRequestsApi.create(req)` |
| | GET | `/api/delivery-requests` | `deliveryRequestsApi.list()` |
| | GET | `/api/delivery-requests/{id}` | `deliveryRequestsApi.getDetail(id)` |
| | DELETE | `/api/delivery-requests/{id}` | `deliveryRequestsApi.cancel(id)` |
| Missing claim | POST | `/api/missing-claims` | `missingClaimsApi.create(req)` |
| | GET | `/api/my/missing-claims` | `missingClaimsApi.listMine()` |
| | GET | `/api/missing-claims/{id}` | `missingClaimsApi.getDetail(id)` — khách gọi được (`complaint.read`) |
| Insurance claim | POST | `/api/insurance-claims` | `insuranceClaimsApi.create(req)` |
| | GET | `/api/insurance-claims/{id}` | `insuranceClaimsApi.getDetail(id)` — khách gọi được (`complaint.read`) |

> ✅ **Đã confirm (Phase 5):** Customer có `complaint.read` (Permissions.cs) → gọi được 2 detail trên.
> ⚠️ **KHÔNG có** `GET /api/my/insurance-claims` (không list được) → FE điều hướng thẳng vào
> `/claims/insurance/{id}` sau khi tạo và nhắc user giữ link; xem lại được qua
> `missingClaim.insuranceClaimId` nếu là claim sinh từ khiếu nại thất lạc.

> ✅ **Đã confirm:** `MyPackagesController` chỉ có `GET /api/my/packages` (list) và `GET /api/my/packages/{id}/tracking`.
> **Không có** detail cho khách. `GET /api/packages/{id}` và `/fee` là **staff-only** (`warehouse.read`),
> khách (`order.read`) gọi sẽ 403. → FE detail khách dựng từ `list()` + `.find()`, **không hiển thị cước**.

### Staff / Admin

| Nhóm | Method | Endpoint | FE method |
|------|--------|----------|-----------|
| Warehouse | GET | `/api/warehouses` | `warehouseApi.list()` |
| | GET | `/api/warehouses/{id}` | `warehouseApi.getDetail(id)` |
| | POST | `/api/warehouses/{id}/receive-cn` | `warehouseApi.receiveCn(id, req)` |
| | POST | `/api/warehouses/{id}/receive-vn` | `warehouseApi.receiveVn(id, req)` |
| Package | POST | `/api/packages` | `packagesApi.create(req)` |
| | GET | `/api/packages/{id}` | `packagesApi.getDetail(id)` |
| | GET | `/api/packages/barcode/{barcode}` | `packagesApi.getByBarcode(barcode)` |
| | GET | `/api/packages/{id}/tracking` | `packagesApi.getTracking(id)` |
| | POST | `/api/packages/{id}/images` | `packagesApi.addImage(id, req)` |
| | POST | `/api/packages/{id}/calculate-fee` | `packagesApi.calculateFee(id, req)` |
| | GET | `/api/packages/{id}/fee` | `packagesApi.getFee(id)` |
| Sack | POST | `/api/sacks` | `sacksApi.create(req)` |
| | GET | `/api/sacks` | `sacksApi.list()` |
| | GET | `/api/sacks/{id}` / `/code/{code}` | `sacksApi.getDetail` / `getByCode` |
| | POST | `/api/sacks/{id}/packages` | `sacksApi.addPackage(id, req)` |
| | DELETE | `/api/sacks/{id}/packages/{barcode}` | `sacksApi.removePackage(id, barcode)` |
| | POST | `/api/sacks/{id}/seal` | `sacksApi.seal(id, req)` |
| Container | POST | `/api/container-trips` | `containerTripsApi.create(req)` |
| | GET | `/api/container-trips` / `{id}` | `containerTripsApi.list` / `getDetail` |
| | POST | `/api/container-trips/{id}/assign-sacks` | `containerTripsApi.assignSacks(id, req)` |
| | POST | `.../{id}/depart` | `containerTripsApi.depart(id)` |
| | POST | `.../{id}/reach-border` | `containerTripsApi.reachBorder(id, req)` |
| | POST | `.../{id}/arrive-vn` | `containerTripsApi.arriveVn(id, req)` |
| Customs | POST | `/api/customs-clearances` | `customsApi.create(req)` |
| | GET | `/api/customs-clearances?status=` | `customsApi.list(params)` |
| | GET | `/api/customs-clearances/{id}` | `customsApi.getDetail(id)` |
| | GET | `/api/customs-clearances/by-trip/{tripId}` | `customsApi.getByTrip(tripId)` |
| | PUT | `/api/customs-clearances/{id}` | `customsApi.update(id, req)` |
| Missing claim (staff) | GET | `/api/missing-claims?status=` (1 status, default Submitted; quyền **complaint.manage**) | `missingClaimsApi.list(status)` |
| | POST | `.../{id}/investigate` | `missingClaimsApi.investigate(id, req)` |
| | POST | `.../{id}/resolve` | `missingClaimsApi.resolve(id, req)` |
| | POST | `.../{id}/reject` | `missingClaimsApi.reject(id, req)` |
| Insurance claim (staff) | PUT | `/api/insurance-claims/{id}` | `insuranceClaimsApi.review(id, req)` |
| | POST | `/api/insurance-claims/{id}/pay` | `insuranceClaimsApi.pay(id)` — chỉ khi `Approved` |
| Webhook | POST | `/api/webhooks/ghtk` `/ghn` | **FE không gọi** (server-to-server) |

---

## 3. Code mẫu API module

```ts
// app/lib/api/logistics.ts
import { apiModule2Client } from "./client";
import type { ApiResponse, Paginated } from "~/lib/types/common";
import type {
  PackageSummary, PackageDetail, TrackingEvent, PackageFee,
  CalculateFeeRequest, ReceiveCnRequest, ReceiveVnRequest,
  CreateDeliveryRequest, DeliveryRequestDetail,
  CustomsClearance, CreateCustomsRequest, UpdateCustomsRequest, CustomsStatus,
  MissingClaim, CreateMissingClaimRequest, ResolveClaimRequest,
  InsuranceClaim, CreateInsuranceClaimRequest, ReviewInsuranceClaimRequest,
  // ...
} from "~/lib/types/logistics";

// ⚠️ Đã verify: list KHÔNG nhận params, trả mảng phẳng (không Paginated). Filter status làm ở client.
export const myPackagesApi = {
  list: () =>
    apiModule2Client.get<unknown, ApiResponse<PackageSummary[]>>(
      "/api/my/packages"),
  getTracking: (id: string) =>
    apiModule2Client.get<unknown, ApiResponse<TrackingEvent[]>>(
      `/api/my/packages/${id}/tracking`),
};

export const packagesApi = {
  getDetail: (id: string) =>
    apiModule2Client.get<unknown, ApiResponse<PackageDetail>>(`/api/packages/${id}`),
  calculateFee: (id: string, req: CalculateFeeRequest) =>
    apiModule2Client.post<unknown, ApiResponse<PackageFee>>(
      `/api/packages/${id}/calculate-fee`, req),
  getFee: (id: string) =>
    apiModule2Client.get<unknown, ApiResponse<PackageFee>>(`/api/packages/${id}/fee`),
  // ...
};

export const customsApi = {
  list: (params: { status?: CustomsStatus }) =>
    apiModule2Client.get<unknown, ApiResponse<CustomsClearance[]>>(
      "/api/customs-clearances", { params }),
  update: (id: string, req: UpdateCustomsRequest) =>
    apiModule2Client.put<unknown, ApiResponse<CustomsClearance>>(
      `/api/customs-clearances/${id}`, req),
  // ...
};
```

---

## 4. Request body chính (theo API_FLOW)

> ✅ Các body dưới đây đã **verify lại từ DTO thật** cho phần Phase 1–3. Phần Phase 4–5 (sack/container/customs/claims) vẫn theo API_FLOW — verify khi build.

```ts
// Package & warehouse — ĐÃ VERIFY (DTOs/Package, DTOs/Warehouse)
CreatePackageRequest      { customerId; orderId; packagingType?="Normal"; insuranceOpted?=false; insuranceLevel? }
CnWarehouseReceiveRequest { barcode; waybillNo?; actualWeightKg; lengthCm?; widthCm?; heightCm?; condition; note?; deviceId? }
VnWarehouseReceiveRequest { barcode; zoneCode; actualWeightKg?; lengthCm?; widthCm?; heightCm?; condition; note?; deviceId? }
CalculateFeeRequest       { ratePerKgVnd; insuranceRate?; declaredValueVnd? }
UploadPackageImageRequest { type; url; note? }   // chỉ URL, không upload file; không có GET images
// condition ∈ Ok|Damaged|Missing ; receive trả ReceiveScanResult (có weightVarianceAlert + variancePct)

// Sack — ĐÃ VERIFY (DTOs/Sack). List GET /api/sacks?status= (1 status, default Packing).
CreateSackRequest      { sackCode? }              // bỏ trống = BE tự sinh
AddPackageToSackRequest{ barcode }
SealSackRequest        { sealCode }

// Container trip — ĐÃ VERIFY (DTOs/Container). List ?status= (default Loading).
CreateTripRequest      { tripCode; borderCrossing; vehiclePlate?; driverPhone?; etaVnAt? }
AssignSacksRequest     { sackCodes: string[] }    // ⚠️ MÃ bao, không phải id
DepartTripRequest      { departureAt }            // arrive-vn: { arrivedAt }
// reach-border: KHÔNG body. borderCrossing ∈ HuuNghi|LaoCai|MongCai

// Customs — ĐÃ VERIFY (DTOs/Customs). Quyền shipment.read/manage. List ?status= (default Pending).
CreateCustomsClearanceRequest { containerTripId; clearanceType; declaredValueVnd?; hsCodeSummary? }
UpdateCustomsClearanceRequest { status; heldReason?; customsOfficerName?; dutyPaidVnd? }
// clearanceType ∈ Tmdt|TieuNgach|ChinhNgach ; status ∈ Pending|Processing|Cleared|Held

// Delivery — ĐÃ VERIFY (DTOs/Delivery). Status response = string PascalCase.
CreateDeliveryRequest { packageIds: string[]; carrierId; deliveryAddressId; recipientName; recipientTel;
                        province; district; ward; address; preferredTimeSlot?; codAmount? }
// ⚠️ Không có endpoint list carrier → hard-code seed GUID (EntityConfigurations.cs):
//   GHTK         B0000000-0000-0000-0000-000000000001  (max 30kg / 20tr)  ← API thật, ưu tiên
//   GHN          B0000000-0000-0000-0000-000000000002  (max 30kg / 20tr)  ← stub
//   Viettel Post B0000000-0000-0000-0000-000000000003  (max 50kg / 50tr)  ← stub
//   J&T Express  B0000000-0000-0000-0000-000000000004  (max 50kg / 30tr)  ← stub
// Warehouse seed: A0000000-…-0001 (Quảng Châu/CN), -0002 Lạng Sơn, -0003 Hà Nội, -0004 HCM (đều VnHub).

// Claims — ĐÃ VERIFY (DTOs/Claim/ClaimDTOs.cs)
CreateMissingClaimRequest     { packageId; description; evidenceUrls?: string[]; claimedValueVnd? }
InvestigateClaimRequest       { staffNote? }
ResolveMissingClaimRequest    { resolution: Refund|Reship|Rejected; claimedValueVnd?; staffNote? }
RejectClaimRequest            { reason }
CreateInsuranceClaimRequest   { packageId; claimedAmountVnd; description; damagePhotos?: string[]; missingClaimId? }
UpdateInsuranceClaimRequest   { status: Approved|Rejected|UnderReview; approvedAmountVnd?; notes? }
// MissingClaimResponse có insuranceClaimId (claim sinh tự động khi resolve=Refund).
// ⚠️ InsuranceClaimResponse KHÔNG trả description/claimedAmountVnd.
// Resolve = Refund: BE tự tạo InsuranceClaim (Approved + Paid luôn), hoàn ví stub,
// đánh dấu kiện Lost + ghi TrackingEvent. Refund kiện không bảo hiểm → PACKAGE_NOT_INSURED.
```

> ✅ Toàn bộ body Phase 1–5 ở trên đã verify từ DTO thật.

---

## 5. Bảng Enum / Status (cho `constants/logistics.ts`)

| Enum | Giá trị | Ghi chú UI |
|------|---------|-----------|
| **PackageStatus** | `PendingCn`, `InCnWarehouse`, `InSack`, `InTransit`, `Customs`, `InVnWarehouse`, `Dispatched`, `Delivered`, `Lost`, `Returned` | timeline; `Dispatched` = đang giao nội địa |
| **PackagingType** | `normal`, `fragile`, `oversized`, `liquid_risk` | `fragile` không trộn bao với `normal` |
| **InsuranceLevel** | `basic` (bồi thường 50%), `full` (100%) | hiển thị mức coverage |
| **TrackingEventType** | `cn_warehouse_in`, `cn_warehouse_out`, `border_customs`, `vn_warehouse_in`, `out_for_delivery`, `delivered`, `exception` | map sang label + icon timeline |
| **CustomsStatus** | `Pending`, `Processing`, `Cleared`, `Held` | `Held` = giữ hàng (đỏ) |
| **ClearanceType** | `Tmdt`, `TieuNgach`, `ChinhNgach` | loại hình thông quan |
| **DeliveryRequestStatus** | `Pending`, `Confirmed`, `Shipping`, `Delivered`, `Failed` | huỷ chỉ khi Pending/Confirmed |
| **WaybillStatus** (GHTK→nội bộ) | `Cancelled`, `Created`, `PickedUp`, `OutForDelivery`, `Delivered`, `DeliveryFailed`, `InTransit`, `Returned` | trạng thái vận đơn nội địa |
| **MissingClaimStatus** | `Submitted`, `Investigating`, `Confirmed`, `Resolved`, `Rejected` | ✅ verified — `Confirmed` có trong enum nhưng service không bao giờ set (FE bỏ khỏi filter) |
| **MissingClaimResolution** | `Refund`, `Reship`, `Rejected` | ✅ verified — hành động staff |
| **InsuranceClaimStatus** | `Submitted`, `UnderReview`, `Approved`, `Rejected`, `Paid` | ✅ verified — mặc định `Submitted`; PUT chỉ nhận 3 status giữa; `pay` chỉ khi `Approved` |

> ✅ **Đã verify (Phase 1–3):** **toàn bộ** enum serialize **PascalCase** dạng string — kể cả `PackagingType` (`Normal/Fragile/Oversized/LiquidRisk`), `InsuranceLevel` (`Basic/Full`), `TrackingEventType` (`CnWarehouseIn`…), `DeliveryRequestStatus`, `DomesticWaybillStatus`, `ReceiptCondition` (`Ok/Damaged/Missing`), `WarehouseType` (`ChinaTransit/VnHub/VnLastMile`), `PackageImageType`.
> Lưu ý field: `TrackingEvent.occuredAt` (BE viết thiếu chữ "r" — đúng theo DTO).
> `MissingClaimStatus`/`InsuranceClaimStatus` (Phase 5) đã verify từ `ClaimEntities.cs` — cũng PascalCase.

---

## 6. Map mã lỗi → thông báo (toast)

> ✅ Các code dưới đây đã **verify khớp** `Module2Exceptions.cs` (FE map sẵn trong `constants/logistics.ts` → `DELIVERY_ERROR_MESSAGE` + `SHIPMENT_ERROR_MESSAGE` + `CLAIM_ERROR_MESSAGE`). Phase 5 thêm: `MISSING_CLAIM_NOT_FOUND`, `INSURANCE_CLAIM_NOT_FOUND`.

| `errorCode` | Ý nghĩa | Gợi ý message |
|-------------|---------|---------------|
| `PACKAGE_NOT_WEIGHED` | Kiện chưa cân khi tính cước | "Kiện chưa được cân, không thể tính cước" |
| `EMPTY_DELIVERY_REQUEST` | Không chọn kiện | "Vui lòng chọn ít nhất 1 kiện" |
| `PACKAGE_NOT_READY_FOR_DELIVERY` | Kiện chưa ở kho VN | "Kiện chưa sẵn sàng giao" |
| `CARRIER_INACTIVE` | Đơn vị vận chuyển ngừng | "Đơn vị vận chuyển không khả dụng" |
| `PACKAGE_WEIGHT_EXCEEDED` | Vượt tải carrier | "Tổng cân nặng vượt giới hạn đơn vị vận chuyển" |
| `SACK_SEALED` | Bao đã kẹp chì | "Bao đã kẹp chì, không thể thêm/xoá kiện" |
| `SACK_MIXED_FRAGILE` | Trộn fragile + thường | "Không được gộp kiện dễ vỡ với kiện thường" |
| `PACKAGE_ALREADY_IN_SACK` | Kiện đã ở bao khác | "Kiện này đã nằm trong một bao khác" |
| `DUPLICATE_CUSTOMS_CLEARANCE` | Chuyến đã có hồ sơ HQ | "Chuyến này đã có hồ sơ hải quan" |
| `PACKAGE_NOT_INSURED` | Kiện chưa mua bảo hiểm | "Kiện không có bảo hiểm, không thể bồi thường" |
| `DELIVERY_NOT_CANCELLABLE` | Huỷ khi không ở `Pending`/`Confirmed` | "Yêu cầu không thể huỷ ở trạng thái hiện tại" |
| `INVALID_CLAIM_STATE` | Sai trạng thái khi chi trả | "Yêu cầu chưa được duyệt" |
| `DOMESTIC_WAYBILL_NOT_FOUND` | (webhook) | n/a — FE không gặp |
| `INVALID_WEBHOOK_SIGNATURE` | (webhook) | n/a — FE không gặp |

Dùng `apiModule2Client` đã unwrap `err.response?.data` → đọc `errorCode`/`message`
(tham khảo `app/lib/utils/errors.ts`).

---

## 7. Lưu ý dev

- **HTTPS self-signed**: trust cert `localhost:7280` hoặc dùng `http://localhost:5080` cho dev.
- **Swagger**: nếu Module2 API bật Swagger (`/swagger`), dùng để lấy chính xác shape DTO & casing — ưu tiên hơn tài liệu.
- **CORS**: đảm bảo origin Vite dev (vd `https://localhost:5173`) nằm trong CORS policy của Module2 API.
- **Auth**: cùng JWT với các service khác (token Redux) — `createClient` đã tự gắn Bearer + refresh.
