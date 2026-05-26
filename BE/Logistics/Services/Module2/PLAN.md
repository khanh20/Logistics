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
| Phase 5 | Customs + FeeCalculation (UC-2.05, UC-2.07) | 🔲 Pending |
| Phase 6 | Delivery + Carrier integration GHTK/GHN (UC-2.08, UC-2.09) | 🔲 Pending |
| Phase 7 | Claims + Insurance (UC-2.10) | 🔲 Pending |
| Phase 8 | AI forecast entities + stub service | 🔲 Pending |

---

## Tiến độ hiện tại

**Cập nhật:** 2026-05-25

### Đã hoàn thành
- Thiết kế tài liệu (CLAUDE.md): Đặc tả đầy đủ 24 entities, 10 use cases, business rules
- PLAN.md: Lên kế hoạch triển khai 8 phase

### Đang triển khai
- Phase 5: Customs + FeeCalculation (UC-2.05, UC-2.07) — sắp bắt đầu

### Còn pending
- Phase 5 → Phase 8

### Ghi chú
- Module1 (Catalog + Ordering) đã hoàn thành và là pattern tham chiếu
- Phase 1 hoàn thành: build 0 warning, 0 error — 24 entities, 15 domain exceptions
- Phase 2 hoàn thành: build 0 warning, 0 error — migration `InitialModule2Schema` đã tạo, 14 repositories + UnitOfWork
- Phase 3 hoàn thành: build 0 warning, 0 error — WarehouseService (UC-2.01, UC-2.06), PackageService, BarcodeService
- Phase 4 hoàn thành: build 0 warning, 0 error — SackService (UC-2.03), ContainerService (UC-2.04), toàn bộ API project với 4 controllers
- Tất cả 4 projects đã thêm vào solution: Domain, Infrastructure, ApplicationServices, API
- global.json cần dùng SDK 8.0.127 (máy không có 8.0.404)
