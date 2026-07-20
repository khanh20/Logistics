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
| Phase 6 | Delivery + Carrier integration GHTK/GHN (UC-2.08, UC-2.09) | ✅ Done (2026-07-07 — A1-A3, B4-B6 xong; còn mục C phụ thuộc Module3/carrier khác) |
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
- Không còn — **Phase 6 đã hoàn thành 2026-07-07** (mục A+B dưới đây). Chỉ còn nhóm C chờ phụ thuộc ngoài (Module3 Finance, API carrier khác).

### Phase 6 — checklist hoàn thiện (A+B xong 2026-07-07)
**A. Hoàn thiện GHTK (functional):**
- [x] A1 — Huỷ đơn trên GHTK ✅ (2026-07-07): `ICarrierGateway.CancelWaybillAsync` mới; GHTK gọi `POST /services/shipment/cancel/{label}`, stub trả true. `DeliveryService.CancelAsync` viết lại: cho huỷ cả `Shipping` khi mọi waybill còn `Created` (trước đó đơn có waybill không bao giờ huỷ được vì luôn ở Shipping); gọi carrier **trước** khi mở DB transaction (không giữ tx qua HTTP — cùng tinh thần B4); carrier từ chối → `CarrierCancelFailedException` (422, `CARRIER_CANCEL_FAILED`, FE đã map message); huỷ xong: waybill → `Cancelled` (method `DomesticWaybill.Cancel()` mới), package `Dispatched → InVnWarehouse` + TrackingEvent trả về kho
- [x] A2 — Query trạng thái chủ động ✅ (2026-07-07): `ICarrierGateway.GetWaybillStatusAsync` mới — GHTK gọi `GET /services/shipment/v2/{label}`, stub trả null. `TrackingService` refactor: webhook + đối soát dùng chung pipeline `ApplyStatusUpdateAsync` (đối soát bỏ qua verify signature vì mình chủ động gọi carrier); `SyncWaybillAsync` query ngoài transaction, bỏ qua khi trạng thái không đổi (tránh ghi trùng TrackingEvent). Endpoint staff mới: `POST /api/domestic-waybills/{trackingNo}/sync` (`shipment.manage`)
- [x] A3 — Idempotency tạo đơn ✅ (2026-07-07): `GhtkCarrierGateway.CreateWaybillAsync` khi GHTK báo trùng id (message chứa "tồn tại"/"exist"/"trùng") → trace `GET /services/shipment/v2/partner_id:{code}` lấy lại label thay vì fail. Đi kèm B4 (PartnerOrderCode ổn định nhờ chốt request vào DB trước khi gọi carrier)

**B. Độ bền / production:**
- [x] B4 — Tách HTTP khỏi transaction ✅ (2026-07-07): `CreateAsync` cấu trúc lại — validate (chỉ đọc) → quote (HTTP, không side-effect) → **Tx1** chốt request → **HTTP** tạo vận đơn → **Tx2** waybill + xuất kho + tracking + notify. Fail sau Tx1 → compensation: huỷ carrier theo partner code (`ICarrierGateway.CancelByPartnerCodeAsync` mới, GHTK dùng prefix `partner_id:`) + request → `Cancelled`, chạy với `CancellationToken.None` (best-effort, log error nếu chính compensation fail → đối soát tay)
- [x] B5 — Chống webhook trùng/đi lùi ✅ (2026-07-07): `DomesticWaybill.CanApplyStatus` — trạng thái kết thúc (Delivered/Returned/Cancelled) khoá vĩnh viễn; trùng trạng thái bỏ qua (trừ DeliveryFailed: mỗi webhook failed = 1 lần thử mới); pha tuyến tính Created→PickedUp→InTransit→OutForDelivery không đi lùi, riêng DeliveryFailed được quay lại InTransit/OutForDelivery (hoãn giao → giao lại). `UpdateFromWebhook` trả bool, TrackingService bỏ qua sớm + log khi guard từ chối. `SetCarrierFee` mới cho fee lúc tạo đơn (không đi qua guard)
- [x] B6 — Unit test ✅ (2026-07-07): project mới `LG.Module2.Tests` (xUnit + Moq, đã thêm vào solution) — **57 test, pass 100%**: bảng map status_id GHTK đầy đủ, verify webhook token (DB secret ưu tiên config), `GhtkOptions.Enabled`, công thức phí stub (bậc thang + COD + bảo hiểm + tối thiểu 0.5kg), guard B5 trên `DomesticWaybill` (trùng/đi lùi/kết thúc/failed-lặp), luồng webhook end-to-end qua `TrackingService` (delivered/duplicate/đến trễ/failed >2 lần alert CSKH/returned/not-found). Chạy: `dotnet test Services/Module2/LG.Module2.Tests/LG.Module2.Tests.csproj`

**C. Phụ thuộc phase/module khác:**
- [x] Trừ ví khách + hoàn tiền ✅ (2026-07-07): "Module3 Finance" hoá ra là **Services/Core** (port 7215) — tích hợp thật qua `IWalletService`/`WalletHttpService` (typed HttpClient `Core:BaseUrl`, cùng pattern Module1, gọi `api/wallet-payment/deduct|refund`):
  - **Tạo yêu cầu giao**: Tx1 chốt request → **trừ ví** (thiếu số dư → 422 `WALLET_OPERATION_FAILED`, không tạo đơn carrier) → tạo vận đơn → Tx2. Compensation khi fail: hoàn ví + huỷ carrier theo partner code + request Cancelled
  - **Khách huỷ yêu cầu**: hoàn phí ship sau khi huỷ chốt DB (best-effort — fail thì log ERROR đối soát tay, không chặn việc huỷ)
  - **Claims**: ResolveMissingClaim (Refund) + PayInsuranceClaim hoàn ví thật **sau khi commit** (không giữ transaction qua HTTP call); fail → log ERROR đối soát tay qua Core FinanceManagement
  - Lưu ý: deduct/refund phía Core **không idempotent** → không retry mù; 5 unit test trong `WalletIntegrationTests`
  - ⚠️ `WalletPaymentController` phía Core đang `[AllowAnonymous]` — cần báo team chủ Core chuyển sang X-Internal-Key
- [x] **Thu cước quốc tế thật ✅ (2026-07-20)**: trước đây `calculate-fee` chỉ TÍNH và lưu lên kiện, chưa bao giờ trừ tiền khách (FE ghi "tạm tính, không đụng ví"). Nay thêm:
  - `POST /api/packages/{id}/charge-fee` (`warehouse.manage`) → `FeeCalculationService.ChargeAsync`: trừ ví khách `ShipIntl + InsuranceFee` qua `IWalletService.DeductAsync` (referenceType `PackageIntlFee`)
  - `Package.FeePaidAt` + `MarkFeePaid()` guard: chống thu 2 lần (`FeeAlreadyPaidException` 409), yêu cầu đã tính cước (`FeeNotCalculatedException` 422); `CalculateAsync` chặn tính lại sau khi đã thu
  - Ordering an toàn giống DeliveryService: trừ ví ngoài transaction → Tx đánh dấu; commit fail → **hoàn lại (compensation)** rồi ném lỗi, tránh khách bị trừ mà kiện chưa đánh dấu
  - Thiếu số dư → 422 `WALLET_OPERATION_FAILED`; notify `SendIntlFeeChargedAsync`
  - Migration `AddPackageFeePaidAt` (1 cột nullable); FE: `chargeFee()` + nút "Thu cước" (Popconfirm) + badge "Đã thu" trong `admin/packages/:id`; 6 test `FeeChargeTests` (tổng 91 pass)
  - ⬜ Chưa làm (ngoài phạm vi mục này): đọc đơn giá từ `FeeRule` Core thay vì nhập tay; tự động tính cước sau receive-vn; đẩy `remaining_amount` sang Module1; `StoragePenalty` (phí lưu kho)
- [x] ~~GHN/Viettel Post/J&T API thật~~ — **CHỐT SCOPE (2026-07-07): chỉ tích hợp GHTK, các carrier khác XOÁ HẲN.** 2 bước: migration `DeactivateNonGhtkCarriers` (tắt IsActive) rồi `RemoveNonGhtkCarriers` (xoá 3 row seed; dọn trước waybill demo tham chiếu + gỡ `DomesticCarrierId` ở delivery_requests — phần dọn này không khôi phục được khi Down). FE chỉ còn GHTK trong `DOMESTIC_CARRIERS`. `StubCarrierGateway` giữ lại làm fallback dev cho GHTK khi chưa cấu hình Token (prefix đơn giản hoá GHTK/DOM). Muốn thêm carrier mới sau này: seed row mới + viết gateway riêng implement `ICarrierGateway`
- [x] Reconcile `DeliveryAddressId` với sổ địa chỉ ✅ (2026-07-07): `ICustomerAddressService`/`CustomerAddressHttpService` gọi Core `GET /api/CustomerAddress/me` với **JWT của khách forward nguyên vẹn** (`IUserTokenAccessor` — implement `HttpUserTokenAccessor` ở API, Core tự lọc theo user trong token nên không lộ sổ người khác). Validate khi tạo yêu cầu giao: id không có trong sổ/inactive → 404 `DELIVERY_ADDRESS_NOT_FOUND`; Core không gọi được → 422 `ADDRESS_LOOKUP_FAILED`. Tên/SĐT/địa chỉ chi tiết lấy từ **sổ làm chuẩn** (body làm fallback); tỉnh/huyện/xã vẫn theo body vì sổ chỉ lưu mã code còn GHTK cần tên chữ. FE form vốn đã chọn từ sổ thật nên tương thích sẵn; 2 test mới (tổng 72 pass)

### Còn pending
- Phase 6 nhóm C (chờ phụ thuộc ngoài, xem checklist trên)
- ~~3 lỗ hổng ownership FE phát hiện~~ ✅ ĐÃ FIX (2026-07-07): tracking/missing-claim/insurance-claim check chủ sở hữu (khác chủ → 404); thêm `GET /api/my/insurance-claims`; 8 unit test ownership trong `OwnershipGuardTests`
- Phase 8 nâng cấp sau (không chặn): thay heuristic bằng ML.NET khi đủ dữ liệu; nguồn NewsScrape cho border alert (Claude API structured outputs); chuyển scan tắc biên từ endpoint thủ công sang BackgroundService định kỳ
- ~~FE: chưa có UI cho endpoint đối soát A2~~ ✅ (2026-07-08): FE đã có đủ — tool đối soát vận đơn trong `admin/packages`, trang `customer/forecast` + `admin/border-alerts` cho Phase 8 (xem FE/docs/module2/PLAN.md)

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
