# Plan: Module 2 — Vận chuyển & Logistics

## Kiến trúc (theo pattern Module 1)

```
Services/Module2/
├── LG.Module2.Domain/              — Entities, Enums, Exceptions
├── LG.Module2.ApplicationServices/ — Services, DTOs, Interfaces
├── LG.Module2.Infrastructure/      — DbContext, Migrations, Repositories
└── LG.Module2.API/                 — Controllers, Program.cs
```

---

## Giai đoạn 1 — Domain Layer (Entities + Enums)

Tạo 24 entity theo CLAUDE.md, chia thành các file:

| File | Entities |
|---|---|
| `WarehouseEntities.cs` | `Warehouse`, `WarehouseZone`, `WarehouseStaff` |
| `PackageEntities.cs` | `Package`, `PackageItemMap`, `PackageDimension`, `PackageImage` |
| `SackEntities.cs` | `Sack`, `SackPackageMap` |
| `TransitEntities.cs` | `ContainerTrip`, `CustomsClearance`, `ChinaWaybill` |
| `TrackingEntities.cs` | `TrackingEvent`, `WarehouseReceipt`, `WarehouseDispatch` |
| `DeliveryEntities.cs` | `DeliveryRequest`, `DeliveryPackage`, `DomesticCarrier`, `DomesticWaybill` |
| `ClaimEntities.cs` | `SplitMergeHistory`, `MissingClaim`, `InsuranceClaim`, `StoragePenalty` |
| `AIEntities.cs` | `AITransitForecast`, `AIBorderAlert` |

---

## Giai đoạn 2 — Infrastructure Layer

- `Module2DbContext` + cấu hình EF Core (Fluent API, generated columns cho `vol_weight_kg`, `charged_weight_kg`)
- Migration đầu tiên tạo toàn bộ schema
- Repositories cho từng aggregate

---

## Giai đoạn 3 — Application Services (theo Use Case)

| Service | Use Case |
|---|---|
| `WarehouseService` | UC-2.01 Nhập kho TQ & cân đo, UC-2.06 Nhập kho VN |
| `SackService` | UC-2.03 Đóng bao / kẹp chì |
| `ContainerService` | UC-2.04 Chuyến container |
| `CustomsService` | UC-2.05 Hải quan |
| `FeeCalculationService` | UC-2.07 Tính cước quốc tế |
| `DeliveryService` | UC-2.08 Yêu cầu giao nội địa (gọi API GHTK/GHN) |
| `TrackingService` | UC-2.09 Webhook carrier + push TrackingEvent |
| `ClaimService` | UC-2.10 Khiếu nại & bảo hiểm |
| `BarcodeService` | Sinh barcode nội bộ tự động |

---

## Giai đoạn 4 — API Layer

Controllers tương ứng từng nhóm use case, Swagger doc, webhook endpoint cho GHTK/GHN.

---

## Thứ tự triển khai

| Phase | Nội dung | Trạng thái |
|---|---|---|
| Phase 1 | Domain entities (24 entities) → compile clean | ✅ Done |
| Phase 2 | Infrastructure (DbContext + Migration) | ✅ Done |
| Phase 3 | Warehouse + Package services (UC-2.01, UC-2.06) — core flow | ✅ Done |
| Phase 4 | Sack + ContainerTrip services (UC-2.03, UC-2.04) | ✅ Done |
| Phase 5 | Customs + FeeCalculation (UC-2.05, UC-2.07) | ✅ Done |
| Phase 6 | Delivery + Carrier integration GHTK/GHN (UC-2.08, UC-2.09) | 🚧 Dở dang (luồng lõi + GHTK create/fee/webhook xong; còn cancel/query/idempotency) |
| Phase 7 | Claims + Insurance (UC-2.10) | ✅ Done |
| Phase 8 | AI forecast entities + stub service | ✅ Done |

---

## Tiến độ hiện tại

**Cập nhật:** 2026-07-02

### Đã hoàn thành
- Thiết kế tài liệu (CLAUDE.md): Đặc tả đầy đủ 24 entities, 10 use cases, business rules
- PLAN.md: Lên kế hoạch triển khai 8 phase
- Phase 1 → Phase 5, Phase 7, Phase 8 (xem chi tiết phần Ghi chú)

### Đang triển khai
- **Phase 6 — CHƯA XONG, sẽ quay lại sau.** Luồng lõi UC-2.08/2.09 + tích hợp GHTK (báo giá/tạo đơn/webhook) đã chạy được. Còn các hạng mục dưới đây.

### Phase 6 — việc còn lại (TODO khi quay lại)
**A. Hoàn thiện GHTK (functional):**
- [ ] A1 — Huỷ đơn trên GHTK: `CancelAsync` mới chỉ update DB, chưa gọi `POST /services/shipment/cancel/{label}`
- [ ] A2 — Query trạng thái chủ động `GET /services/shipment/v2/{label}` để đối soát khi webhook miss (GHTK chỉ retry 1 lần)
- [ ] A3 — Idempotency tạo đơn theo `PartnerOrderCode` (= request.Id) để tránh tạo trùng

**B. Độ bền / production:**
- [ ] B4 — Tách HTTP call GHTK ra ngoài DB transaction (tránh đơn GHTK mồ côi nếu commit DB fail)
- [ ] B5 — Chống webhook trùng lặp (bỏ qua khi trạng thái không tiến → tránh double-transition/double-notify)
- [ ] B6 — Unit test: map status, tính phí, luồng webhook

**C. Phụ thuộc phase/module khác:**
- [ ] Trừ ví khách (PaymentLock) — chờ Module3 Finance (hiện log stub)
- [ ] GHN/Viettel Post/J&T API thật — hiện stub
- [ ] Reconcile `DeliveryAddressId` với sổ địa chỉ (hiện địa chỉ lấy trực tiếp từ body request)

### Còn pending
- Phase 6 (phần còn lại ở trên)
- Phase 8 nâng cấp sau (không chặn): thay heuristic bằng ML.NET khi đủ dữ liệu; nguồn NewsScrape cho border alert (Claude API structured outputs); chuyển scan tắc biên từ endpoint thủ công sang BackgroundService định kỳ

### Ghi chú
- Module1 (Catalog + Ordering) đã hoàn thành và là pattern tham chiếu
- Phase 1 hoàn thành: build 0 warning, 0 error — 24 entities, 15 domain exceptions
- Phase 2 hoàn thành: build 0 warning, 0 error — migration `InitialModule2Schema` đã tạo, 14 repositories + UnitOfWork
- Phase 3 hoàn thành: build 0 warning, 0 error — WarehouseService (UC-2.01, UC-2.06), PackageService, BarcodeService
- Phase 4 hoàn thành: build 0 warning, 0 error — SackService (UC-2.03), ContainerService (UC-2.04), toàn bộ API project với 4 controllers
- Phase 5 hoàn thành: build 0 warning, 0 error
  - `CustomsService` (UC-2.05): tạo/cập nhật hồ sơ hải quan, đẩy `TrackingEvent` cho toàn bộ package trong chuyến; khi `Held` → chuyển package `InTransit→Customs` + notify khách; khi `Cleared`/`Processing` → ghi tracking tương ứng
  - `FeeCalculationService` (UC-2.07): tính cước quốc tế = `charged_weight × đơn giá/kg` + phí bảo hiểm = `declared_value × tỉ lệ` (nếu mua bảo hiểm); yêu cầu kiện đã cân
  - `Package` nâng cấp: thêm `DeclaredValueVnd`, `FeeRatePerKgVnd`, `ShipIntlVnd`, `InsuranceFeeVnd`, `FeeCalculatedAt` + method `CalculateInternationalFee`
  - 3 exception mới: `CustomsClearanceNotFoundException`, `DuplicateCustomsClearanceException`, `PackageNotWeighedException`
  - `INotificationService` thêm `SendCustomsHeldAlertAsync`
  - Migration `AddPackageInternationalFee` (thêm 5 cột vào `mod2.packages`)
  - Controller `CustomsClearancesController` + 2 endpoint fee (`POST /api/packages/{id}/calculate-fee`, `GET /api/packages/{id}/fee`)
- Phase 6 (CHƯA XONG — phần đã làm, build 0 warning, 0 error; việc còn lại xem mục "Phase 6 — việc còn lại"):
  - `DeliveryService` (UC-2.08): khách tạo yêu cầu giao nội địa — validate package (thuộc khách + `InVnWarehouse`), kiểm trọng lượng ≤ `MaxWeightKg` carrier, báo giá phí ship, (stub) trừ ví, tạo vận đơn, chuyển package `InVnWarehouse→Dispatched` + `TrackingEvent (OutForDelivery)`; hỗ trợ huỷ (trả package về kho)
  - `TrackingService` (UC-2.09): xử lý webhook GHTK/GHN — xác thực HMAC, map trạng thái raw→enum, cập nhật `DomesticWaybill`, đẩy `TrackingEvent`; `Delivered`→package `Delivered`+notify, `DeliveryFailed`>2 lần→alert CSKH, `Returned`→package `Returned`
  - **Tích hợp GHTK API thật** (`services.giaohangtietkiem.vn`): `GhtkCarrierGateway` (typed `HttpClient`) gọi `GET /services/shipment/fee` (báo giá) + `POST /services/shipment/order/?ver=1.5` (tạo đơn, lưu mã `label`); map đầy đủ `status_id` GHTK → enum; webhook GHTK form-urlencoded
  - Kiến trúc đa-carrier: `ICarrierGateway` (Supports/IsFallback) + `ICarrierGatewayResolver` → GHTK thật khi cấu hình `Ghtk:Token`/`ClientSource`, ngược lại fallback `StubCarrierGateway` (GHN/VTP/J&T + GHTK dev)
  - Cấu hình `GhtkOptions` bind từ section `Ghtk` (Token, ClientSource, WebhookToken, Pick:* địa chỉ kho); đã thêm vào `appsettings.json` + `.env.example`
  - 6 exception mới (Empty/NotReady/CarrierInactive/WaybillNotFound/InvalidSignature/NotCancellable); ExceptionMiddleware map đầy đủ status code Phase 5+6
  - `INotificationService` thêm 3 method (OutForDelivery / Delivered / DeliveryFailedAlert)
  - Controllers: `DeliveryRequestsController` (khách, `/api/delivery-requests`), `WebhookController` (`/api/webhooks/ghtk` form-urlencoded + token, `/api/webhooks/ghn` JSON+HMAC, `[AllowAnonymous]`)
  - Không cần migration mới (entity Delivery/Waybill đã có từ Phase 1)
  - **Lưu ý kỹ thuật:** call GHTK nằm trong DB transaction → nếu commit DB fail sau khi GHTK tạo đơn thành công sẽ có đơn GHTK mồ côi; cần idempotency theo `PartnerOrderCode` (= request.Id) khi hoàn thiện. Trừ ví khách vẫn là stub (chờ Module3).
- Phase 7 hoàn thành: build 0 warning, 0 error
  - `ClaimService` (UC-2.10): khiếu nại thất lạc (`MissingClaim`) + bồi thường bảo hiểm (`InsuranceClaim`)
  - MissingClaim: khách `Submit` → staff `Investigate` → `Resolve` (Refund/Reship/Reject). Khi `Refund`: tính bồi thường = `claimedValue × coverage` (Basic 50% / Full 100%), chuyển kiện `→Lost` + `TrackingEvent`, **tự tạo InsuranceClaim đã duyệt + chi trả** (stub RefundProcess), notify hoàn tiền
  - InsuranceClaim: khách tạo (yêu cầu kiện có mua bảo hiểm) → staff `Update` (Approved/Rejected/UnderReview) → `Pay` (hoàn ví, stub Module3)
  - `MissingClaim` nâng cấp: `Description`, `EvidenceUrls`; `InsuranceClaim` nâng cấp: `ClaimedAmountVnd`, `Description`, method `SetUnderReview`
  - 2 exception mới (`InvalidClaimState`, `PackageNotInsured`); `INotificationService` thêm `SendClaimResolved`, `SendRefundIssued`
  - Migration `AddClaimFields` (4 cột); Controllers: `MissingClaimsController`, `MyMissingClaimsController`, `InsuranceClaimsController`
  - Quyền: khách tạo (`order.create`) + xem của mình (`order.read`/`complaint.read`); staff CSKH xử lý (`complaint.manage`)
  - **Lưu ý:** hoàn tiền/RefundProcess vẫn stub (chờ Module3 Finance)
- Phase 8 hoàn thành: build 0 warning, 0 error — **stub rule-based, chưa gọi AI thật** (API contract giữ nguyên khi thay ruột sau này)
  - `AIForecastService` (UC AItransit/AIborder):
    - **Transit forecast**: heuristic baseline theo cửa khẩu (Hữu Nghị 3–5 / Lào Cai 4–6 / Móng Cái 4–7 ngày) + phụ trội mùa (`tet` +3/+5, tự suy mùa từ tháng nếu không truyền) + hàng ≥500kg + cộng delay nếu cửa khẩu có cảnh báo active; confidence 0.30–0.90; lưu `ai_transit_forecasts`
    - **Border alert**: staff tạo/gỡ thủ công; `POST /scan` quét dữ liệu nội bộ — so avg thời gian qua biên (`DepartureCnAt→ArrivedVnAt`) 7 ngày gần nhất vs baseline 30 ngày trước, chậm ≥1.5× (≥3 chuyến) → tự tạo alert (1.5×=Medium / 2×=High / 3×=Critical, source=InternalData), không tạo trùng khi border đã có alert active
    - Alert mức High/Critical → notify khách có kiện `InTransit`/`Customs` (stub log) + `MarkNotified(count)`
  - 2 repositories mới: `AITransitForecastRepository`, `AIBorderAlertRepository`; `ContainerTripRepository` thêm `GetArrivedBetweenAsync` (phục vụ scan)
  - 2 exception mới (`BorderAlertNotFound` 404, `BorderAlertAlreadyResolved` 422); `INotificationService` thêm `SendBorderAlertAsync`
  - Controllers: `AITransitForecastsController` (`POST /api/ai/transit-forecasts` khách+staff, `GET /recent` staff), `AIBorderAlertsController` (`GET /api/ai/border-alerts` khách xem active, `POST`/`POST {id}/resolve`/`POST /scan` staff `shipment.manage`)
  - Không cần migration mới (bảng đã có từ Phase 1–2)
  - **Hướng nâng cấp (đã chốt thiết kế, xem Note.md gốc repo):** forecast → ML.NET (LightGBM) train trên dữ liệu `ContainerTrip`/`TrackingEvent` khi đủ ~vài nghìn chuyến, batch precompute hàng đêm; border alert thêm nguồn `NewsScrape` → Claude API (`claude-opus-4-8`) + structured outputs; scan chuyển thành `BackgroundService` chạy định kỳ
- Tất cả 4 projects đã thêm vào solution: Domain, Infrastructure, ApplicationServices, API
- **SDK:** global.json yêu cầu **8.0.420** (giữ nguyên, không sửa). Máy dev này chỉ có 8.0.127 hệ thống → cài song song bằng:
  `curl -sSL https://dot.net/v1/dotnet-install.sh | bash -s -- --version 8.0.420 --install-dir $HOME/.dotnet`
  rồi build với `DOTNET_ROOT=$HOME/.dotnet PATH=$HOME/.dotnet:$PATH`. `dotnet-ef` 8.0.11 cài dạng local tool (`.config/dotnet-tools.json`).
