# LG.Module2.Seeder — dữ liệu tổng hợp cho bài toán ML dự báo lead time

Hệ thống chưa vận hành nên chưa có dữ liệu thật — tool này sinh dữ liệu **tổng hợp có
pattern thật** để phát triển model trước (ML.NET, thay heuristic Phase 8). Khi có dữ
liệu vận hành thật thì train lại trên `ContainerTrip`/`TrackingEvent`, bỏ seeder.

## Sinh dataset CSV (dev ML — mặc định)

```bash
cd BE/Logistics/Services/Module2/LG.Module2.Seeder
dotnet run -- --rows 50000 --seed 42 --out data/transit_50k.csv
```

Thư mục `data/` đã gitignore — chỗ chuẩn để chứa dataset (tái lập được bằng `--seed`,
không commit). EDA: `python3 eda.py data/transit_50k.csv`.

Mỗi dòng = 1 kiện, cột khớp 1:1 input `TransitForecastRequest` + label:
`departure_date, origin_province_cn, carrier_cn, border_crossing, weight_kg, month,
season, is_tet_window, congestion_active, transit_days(label)`

## Seed ContainerTrip vào DB (test scan tắc biên — bài toán 2)

```bash
dotnet run -- --db --trips 3000 --conn "Host=localhost;Port=5432;Database=muaho_mod2;Username=postgres;Password=..."
```

⚠️ Chỉ chạy vào **DB local** — tool từ chối connection string không phải localhost
(ghi đè bằng `--force-remote` nếu thật sự muốn). Trip seed có `TripCode` prefix `SEED`
để dọn dễ: `DELETE FROM mod2.container_trips WHERE "TripCode" LIKE 'SEED%';`

## "Sự thật ngầm" của thế giới mô phỏng (chỉnh trong `TransitDataGenerator.cs`)

| Yếu tố | Hệ số |
|---|---|
| Baseline cửa khẩu | Hữu Nghị N(3.8, 0.7) · Lào Cai N(4.7, 0.9) · Móng Cái N(5.3, 1.1) — khớp heuristic Phase 8 |
| Cận Tết (−14..+7 ngày quanh mùng 1) | +N(3.5, 1.0) ngày |
| Golden Week TQ (1–7/10) | +1.5 ngày |
| Hè (T6–T8) | +0.3 · Cuối tuần +0.4 |
| Tỉnh gửi | Quảng Châu +0 → Thành Đô +1.5 (khoảng cách tới biên) |
| Carrier TQ | SF −0.4 → Best Express +0.5 |
| Hàng lô ≥500kg | +0.8 |
| Đợt tắc biên | ~8 đợt/năm/cửa khẩu, dài 3–10 ngày, nhân 1.3–2.5× (cột `congestion_active` = ground truth cho bài toán 2) |
| Nhiễu | N(0, 0.5) + 2% outlier +2–6 ngày |

Model tốt phải học lại được các hệ số trên từ dataset — đó là cách kiểm tra pipeline
trước khi có dữ liệu thật. Sanity check in ra sau mỗi lần sinh (avg theo cửa khẩu,
Tết vs thường, tắc vs thường).

## Lưu ý phương pháp

- **Chia train/test theo THỜI GIAN** (train quá khứ, test tương lai) — không random split,
  vì bài toán thật là dự báo tương lai.
- Model train trên data tổng hợp **không dùng được cho production** — mục đích là dựng
  pipeline (feature engineering, train, eval, precompute, API) chạy thông trước.
- Khi hệ thống vận hành: bảng `ai_transit_forecasts` + job đối chiếu actual (xem roadmap
  ML trong note) sẽ thay thế nguồn dữ liệu này.
