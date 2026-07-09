# Phát triển model dự báo Lead Time TQ→VN (Module 2 — bài toán 1)

*Ngày: 2026-07-08 · Nhánh: `dungta/ai` · Mục tiêu: thay heuristic Phase 8 trong
`AIForecastService` bằng model ML thật, giữ nguyên API contract.*

## Tiến độ

| Bước | Trạng thái | Kết quả chính |
|---|---|---|
| 0 — Sinh dữ liệu | ✅ 2026-07-08 | Seeder + 50k dòng `data/transit_50k.csv` (seed 42); đã audit khớp contract BE |
| 1 — EDA | ✅ 2026-07-08 | Tín hiệu khớp thiết kế; 3 quyết định mới: conformal theo cửa khẩu, thêm `is_bulk`, loại `weekday` |
| 2 — Baseline heuristic | ✅ 2026-07-08 | **MAE 1.491 · bias +1.03 · PICP 58.9%** — mốc phải vượt: MAE ≤ 1.27, PICP ≥ 80% |
| 3 — Time split | ✅ chốt thiết kế | Train <2026 · Calib Q1/26 · Test ≥T4/26 + fold 2 test Q1/26 (Tết) |
| 4 — Trainer ML.NET | ⬜ | |
| 5 — Train + tune | ⬜ | |
| 6 — Conformal interval | ⬜ | |
| 7 — Đánh giá vs baseline | ⬜ | |
| 8 — Tích hợp AIForecastService | ⬜ | |
| 9 — Ground truth thật | ⬜ chờ hệ vận hành | |

---

## 1. Định nghĩa bài toán

**Input** (khớp `TransitForecastRequest`): tỉnh gửi TQ, carrier TQ, cửa khẩu, cân nặng, thời điểm gửi (→ mùa/Tết).
**Output** (khớp `TransitForecastResponse`): khoảng ngày `est_days_min`–`est_days_max` + `confidence_pct`.

Đây là bài toán **hồi quy có giám sát trên dữ liệu bảng** (supervised tabular regression):
- **Label** `transit_days`: số ngày **toàn hành trình — shop gửi hàng → nhập kho VN**
  (bao gồm chặng nội địa TQ; vì thế tỉnh gửi/carrier TQ mới có mặt trong input).
  Ground truth từ dữ liệu vận hành: mức kiện = `ChinaWaybill`/`CnWarehouseIn` →
  `VnWarehouseIn` (TrackingEvent); riêng chặng biên đối chiếu bằng
  `ContainerTrip.DepartureCnAt → ArrivedVnAt`.
- Vì output là **khoảng** chứ không phải một số → cần dự báo **khoảng tin cậy**
  (prediction interval), không chỉ point estimate.

**Nguồn dữ liệu hiện tại**: hệ chưa vận hành → dùng dữ liệu tổng hợp từ
`LG.Module2.Seeder` (CSV mức kiện hàng, pattern thật: baseline cửa khẩu, Tết,
tắc biên, tỉnh gửi, carrier, hàng lô). Khi có dữ liệu thật thì train lại — pipeline
không đổi.

---

## 2. Lý thuyết áp dụng (và vì sao)

| Lý thuyết / kỹ thuật | Áp dụng vào đâu | Vì sao chọn |
|---|---|---|
| **Gradient Boosted Decision Trees** (LightGBM / FastTree trong ML.NET) | Model chính | Vô địch trên dữ liệu bảng nhỏ-vừa: bắt được quan hệ phi tuyến (Tết nhân hệ số, không cộng đều) và **tương tác feature** (Móng Cái × Tết tệ hơn Hữu Nghị × Tết); không cần scale số liệu; xử lý categorical tốt |
| **One-hot encoding** | Feature categorical (cửa khẩu, tỉnh, carrier, season) | Chuẩn cho tree-based trong ML.NET (`OneHotEncoding` transform) |
| **Time-based split** (không random split!) | Chia train/test | Bài toán thật là dự báo *tương lai* — random split làm **rò rỉ thời gian** (temporal leakage): model "nhìn trộm" đợt tắc biên trong test vì có mẫu train cùng tuần → điểm ảo. Train = quá khứ, test = đoạn cuối |
| **Split Conformal Prediction** | Sinh khoảng min–max + confidence | Thay vì train nhiều model quantile (ML.NET không có pinball loss trực tiếp): giữ một **tập calibration** riêng, lấy phân vị của residual (\|thực tế − dự báo\|) → cộng/trừ vào point estimate. Có **bảo chứng lý thuyết về coverage** (khoảng p80 phủ ≈80% thực tế) mà không cần giả định phân phối |
| **Baseline trước model** | Bước bắt buộc trước khi train | Heuristic Phase 8 chính là baseline. Model không thắng baseline = không deploy. Không có mốc so sánh thì "MAE 1.2 ngày" vô nghĩa |
| **Metrics: MAE + coverage/width** | Đánh giá | MAE (ngày) dễ hiểu với nghiệp vụ hơn RMSE; với khoảng dự báo đo **PICP** (tỉ lệ thực tế rơi trong khoảng — phải ≈ confidence công bố) và **độ rộng khoảng** (khoảng 1–30 ngày phủ 100% nhưng vô dụng) |
| **Feature importance / sanity check** | Kiểm tra model học đúng | Với data tổng hợp ta **biết trước sự thật ngầm** (hệ số trong `TransitDataGenerator.cs`) → model tốt phải học lại được: cửa khẩu & Tết quan trọng nhất, SF nhanh hơn ZTO... Đây là unit test cho pipeline ML |
| **Overfitting control** | Train | Early stopping trên validation set, giới hạn depth/leaves, learning rate nhỏ |
| **Concept drift + retrain định kỳ** | Vận hành sau này | Thế giới đổi (chính sách biên, carrier mới) → model cũ dần sai. Job đối chiếu prediction vs actual (ground-truth job trong roadmap) vừa là monitor drift vừa là nguồn train mới; retrain theo lịch (tuần/tháng) |
| **Batch precompute** | Serving | Không infer realtime: `BackgroundService` chạy đêm, tính sẵn mọi tổ hợp (tỉnh × cửa khẩu × carrier × mùa × bucket cân nặng) ghi vào `ai_transit_forecasts` → API chỉ lookup, nhanh và rẻ |

---

## 3. Step-by-step

### Bước 0 — Sinh dữ liệu — ✅ DONE 2026-07-08

```bash
cd BE/Logistics/Services/Module2/LG.Module2.Seeder
dotnet run -- --rows 50000 --seed 42 --out data/transit_50k.csv
```

**Kết quả:**
- Project `LG.Module2.Seeder` (console, đã vào solution): sinh CSV mức kiện hàng
  deterministic theo `--seed`; mode `--db` ghi `ContainerTrip` vào DB local (chặn
  non-localhost) phục vụ test scan tắc biên.
- Dataset chuẩn: **`LG.Module2.Seeder/data/transit_50k.csv`** — 50.000 dòng, seed 42,
  2024-01-01 → 2026-07-08 (thư mục `data/` đã gitignore, mất thì sinh lại y hệt).
- Sanity stats khớp "sự thật ngầm": Hữu Nghị 5.22 < Lào Cai 6.29 < Móng Cái 7.10 ngày;
  Tết 9.90 vs thường 5.55; tắc biên 9.78 vs 5.33.
- **Audit khớp contract BE** (2026-07-08): cột CSV ↔ `TransitForecastRequest` 1:1;
  enum `border_crossing` PascalCase + `season` lowercase đúng format BE; baseline seeder
  nằm trong khoảng heuristic. 2 điểm lệch đã xử lý: định nghĩa label sửa thành *toàn
  hành trình shop→kho VN*; ghi cảnh báo `InferSeason` của BE quá thô (cả T1+T2 = "tet")
  vào Bước 8. `is_tet_window` ≡ `season=="tet"` — train chỉ dùng 1 trong 2.

### Bước 1 — EDA (khám phá dữ liệu) — ✅ DONE 2026-07-08

Script: `LG.Module2.Seeder/eda.py` (Python thuần, không cần pandas). Chạy:
```bash
# trong LG.Module2.Seeder — data/ đã gitignore, là chỗ chuẩn cho Trainer đọc sau này
dotnet run -- --rows 50000 --seed 42 --out data/transit_50k.csv
python3 eda.py data/transit_50k.csv
```

**Kết quả trên 50.000 dòng (seed 42, 2024-01-01 → 2026-07-08, 0 missing):**

| Khía cạnh | Số liệu | Ý nghĩa cho model |
|---|---|---|
| Label `transit_days` | mean 5.87, median 5.3, std 2.57, **skewness +2.42**, p99 = 15.9, max 30.5 | Lệch phải rõ (đuôi dài do tắc biên/giữ hàng). Outlier >mean+3σ = 2.0% — **giữ nguyên**, đời thật có; dùng MAE (robust) làm metric chính |
| Cửa khẩu | Hữu Nghị 5.22 < Lào Cai 6.29 < Móng Cái 7.10; **std tăng dần** (2.20 → 3.04) | Feature mạnh nhất. Std khác nhau → khoảng dự báo nên **calibrate riêng theo cửa khẩu** (Bước 6 nâng cao là bắt buộc, không phải tuỳ chọn) |
| Tết | 9.90 vs 5.55 (+4.35 ngày) | Feature mạnh thứ hai; nhóm chỉ chiếm 7.3% nhưng n=3.673 đủ mẫu |
| **Tương tác cửa khẩu × Tết** | chênh Tết: Hữu Nghị +4.74, Lào Cai **+3.31**, Móng Cái +4.66 | Hiệu ứng Tết KHÔNG đồng đều giữa cửa khẩu → mô hình tuyến tính bỏ sót, **xác nhận chọn tree-based đúng** |
| Tỉnh gửi | Quảng Châu 5.52 → Thành Đô 7.10, thứ tự đúng khoảng cách | Tín hiệu rõ, nhóm nhỏ nhất (Thành Đô) vẫn có n=2.006 → one-hot an toàn |
| Carrier TQ | SF 5.32 → Best Express 6.30 | Tín hiệu vừa, thứ tự đúng thiết kế |
| Cân nặng | 0–100kg gần như phẳng (5.77–5.86); ≥500kg = 6.68 | Phân phối **bimodal có khoảng trống** (~26kg → 500kg, không có hàng ở giữa) → cân nặng thô ít thông tin, thêm **feature dẫn xuất `is_bulk` (≥500kg)** thay vì dựa vào giá trị thô |
| Theo tháng | T1 6.97 / T2 7.40 (Tết), T10 6.04 (Golden Week) nổi rõ | Mùa vụ hiện diện đúng; `month` + `season` + `is_tet` là đủ, không cần Fourier |
| Cuối tuần | T7/CN +0.45 ngày so với T2–T6 | Có tín hiệu NHƯNG **không dùng làm feature**: lúc dự báo không biết trước kiện xuất kho thứ mấy (feature không khả dụng tại thời điểm predict — cùng loại lỗi leakage như `congestion_active`) |
| Tắc biên | 9.78 vs 5.33; nhóm = 12.1% | Không dùng trực tiếp (leakage); thay bằng "border alert đang active" lúc predict |

**Quyết định rút ra cho Bước 4–6:**
1. Giữ outlier, metric chính = MAE; thử nghiệm phụ: train trên `log(days)` xem có cải thiện đuôi phải không.
2. Features: `border`, `province`, `carrier`, `season`, `is_tet_window`, `month`, `weight_kg` + **`is_bulk`**; loại `weekday` và `congestion_active` (không khả dụng lúc predict).
3. Conformal calibration **theo từng cửa khẩu** (std lệch nhau 1.4×).

### Bước 2 — Đo baseline (heuristic Phase 8) — ✅ DONE 2026-07-08

Script: `LG.Module2.Seeder/baseline.py` — tái lập heuristic `ForecastTransitAsync`
từng dòng (base theo cửa khẩu, Tết +3/+5, đông +1/+1, ≥500kg max+1, alert +delay),
đo trên tập test time-split (departure ≥ 2026-04-01, n=5.326).

| Variant | MAE | Bias (actual−pred) | PICP (khoảng phủ thực tế) | Width TB |
|---|---|---|---|---|
| **V1 — không biết alert** (thực tế) | **1.491 ngày** | **+1.033** | 58.9% | 2.22 ngày |
| V2 — alert hoàn hảo (+2) — trần của heuristic | 1.342 ngày | +0.875 | 59.5% | 2.22 ngày |
| Theo cửa khẩu (V1) | Hữu Nghị 0.99 · **Lào Cai 2.25** · Móng Cái 1.88 | | Lào Cai chỉ **45%** | |

**4 phát hiện:**
1. **Bias dương có hệ thống +1.0 ngày** — heuristic dự báo *chặng biên* nhưng label là
   *toàn hành trình* (gồm chặng nội địa TQ mà heuristic không mô hình hoá qua
   tỉnh gửi/carrier). Đây chính là dư địa lớn nhất cho model ML.
2. **Lào Cai tệ nhất** (MAE 2.25, PICP 45%) — baseline (4,6) hụt xa thực tế 6.29;
   khẳng định lại kết luận EDA: phải calibrate khoảng theo từng cửa khẩu.
3. PICP 58.9% ≈ confidence công bố 0.60 — heuristic "thành thật" một cách tình cờ,
   nhưng 59% là quá thấp cho trải nghiệm khách; mục tiêu khoảng p80.
4. ⚠️ **Tập test Q2/2026 không chứa mẫu Tết nào** (Tết 2026 rơi vào tháng 2 = tập
   calibration) → đánh giá hiện tại chưa nói gì về mùa khó nhất. Bước 7 phải thêm
   **walk-forward fold thứ hai** lấy Q1/2026 làm test (train đến 2025) để chấm điểm
   riêng chế độ Tết.

**Mốc model phải vượt (trên cùng tập test):**
- MAE ≤ **1.27** (thắng V1 ≥15%; kỳ vọng thực tế với GBT: ~0.7–0.9 vì nhiễu không nén
  được của thế giới mô phỏng là σ≈0.5 + tắc biên không biết trước)
- PICP ≥ **80%** với width trung bình không quá ~3.5 ngày (phình khoảng vô hạn thì
  coverage cao mấy cũng vô nghĩa)
- Bias ≈ 0 (hết hụt hệ thống)

### Bước 3 — Chia dữ liệu theo thời gian
- Train: `departure_date` < 2026-01-01
- Calibration (cho conformal): Q1/2026
- Test: ≥ 2026-04-01 (khớp baseline Bước 2)
Tuyệt đối không shuffle trộn thời gian.
- **Bổ sung từ Bước 2:** fold walk-forward thứ hai — train đến 2025-11-30,
  calibration 12/2025, test Q1/2026 (chứa Tết 2026-02-17) — để chấm điểm riêng
  chế độ Tết, vì fold chính không có mẫu Tết.

### Bước 4 — Pipeline ML.NET (project mới `LG.Module2.Trainer`, console)
```
LoadFromTextFile<TransitRow>(csv)
→ OneHotEncoding(border, province, carrier, season)
→ Concatenate(features số: weight_kg, month, is_tet_window)
→ FastTreeRegression (hoặc LightGbmRegression)   // point estimate
```
Lưu ý: **không đưa `congestion_active` vào feature** — lúc dự báo tương lai ta không
biết trước có tắc hay không (leakage!). Thông tin đó đi vào model qua đường khác:
feature "đang có border alert active" tại thời điểm dự báo (như heuristic đang làm).

### Bước 5 — Train + tune
Early stopping trên validation; tune sơ numberOfLeaves / learningRate / numberOfTrees
(vài chục tổ hợp là đủ, đừng sa đà). Xuất model `.zip` bằng `mlContext.Model.Save`.

### Bước 6 — Sinh khoảng dự báo bằng conformal
Trên tập calibration: tính residual `r = |actual − predicted|`, lấy phân vị 80%
(hoặc theo confidence muốn công bố) → `min = pred − q80`, `max = pred + q80`
(chặn min ≥ 1 ngày). Nâng cao: tính q theo từng cửa khẩu để khoảng hẹp hơn ở
tuyến ổn định.

### Bước 7 — Đánh giá & sanity check
- MAE model vs MAE baseline (phải thắng rõ, VD ≥15%).
- PICP ≈ confidence công bố; độ rộng khoảng ≤ heuristic.
- Feature importance khớp "sự thật ngầm" của seeder → pipeline đúng.

### Bước 8 — Tích hợp vào Module 2 (thay ruột, giữ contract)
- Model `.zip` load bằng `PredictionEnginePool` (thread-safe) trong ApplicationServices.
- `AIForecastService.ForecastTransitAsync`: có model → dùng model; không có/lỗi →
  **fallback heuristic** (giống pattern GHTK thật ↔ stub).
- ⚠️ Sửa `InferSeason` khi tích hợp: BE hiện coi **cả tháng 1+2 = "tet"** trong khi
  seeder (và thực tế) chỉ tính cửa sổ −14..+7 ngày quanh mùng 1 âm lịch. Serve model
  với InferSeason thô sẽ gán feature tet sai cho ~6 tuần/năm → thay bằng bảng ngày
  Tết âm lịch (như `TransitDataGenerator.TetDates`).
- `BackgroundService` precompute đêm ghi `ai_transit_forecasts`; API lookup.
- Confidence trả về = coverage đo được trên calibration (con số thật, hết gán tĩnh).

### Bước 9 — Chuẩn bị cho dữ liệu thật (làm ngay khi hệ vận hành)
- Job đối chiếu mỗi forecast với actual khi kiện về kho VN → bảng sai số.
- Dashboard MAE theo tuần (drift monitor). Retrain định kỳ khi đủ mẫu thật
  (~vài nghìn chuyến), thay dần data tổng hợp bằng data thật.

---

## 4. Cấu trúc project dự kiến

```
Services/Module2/
├── LG.Module2.Seeder/     ✅ sinh dữ liệu tổng hợp (CSV / DB local) + eda.py (Bước 1) + baseline.py (Bước 2)
├── LG.Module2.Trainer/    ⬜ console: load CSV → train → eval vs baseline → xuất model.zip + metrics
└── LG.Module2.ApplicationServices/
    └── Services/AIForecastService.cs   ⬜ load model.zip, fallback heuristic
```

**Nguyên tắc xuyên suốt:** contract Phase 8 đã chốt — mọi bước chỉ "thay ruột",
FE không đổi một dòng. Model train từ data tổng hợp chỉ để dựng pipeline chạy thông;
**không dùng số liệu của nó cho khách thật** cho tới khi retrain bằng dữ liệu vận hành.
