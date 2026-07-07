# Note — Hỏi đáp về Phase 8 (Module 2 BE)

*Ngày: 2026-07-02*

---

## Câu hỏi 1: Phân tích Phase 8, tại sao lại cần Phase 8?

### Phase 8 là gì

Theo `BE/Logistics/Services/Module2/PLAN.md`, Phase 8 là phase cuối của Module 2: **"AI forecast entities + stub service"**, gồm 2 nghiệp vụ:

- **`AITransitForecast`** — dự báo lead time vận chuyển TQ→VN: input là tỉnh gửi hàng TQ, cân nặng, carrier TQ, cửa khẩu, mùa; output là `est_days_min/max` + `confidence_pct`.
- **`AIBorderAlert`** — cảnh báo tắc biên: mức độ (low→critical), cửa khẩu bị ảnh hưởng, số ngày delay ước tính, nguồn (scrape tin tức / dữ liệu nội bộ), số khách đã được notify.

### Hiện trạng trong code

Hai entity này **đã tồn tại từ Phase 1** (`LG.Module2.Domain/Entities/AIEntities.cs`), đã có cấu hình EF Core và bảng trong DB từ migration `InitialModule2Schema`. Nhưng ngoài Domain + Infrastructure ra thì **chưa có gì dùng đến chúng** — không service, không controller, không repository nào tham chiếu. Hiện tại đó là schema "chết": bảng có trong DB nhưng không luồng nghiệp vụ nào ghi/đọc.

### Tại sao cần Phase 8

1. **Hoàn tất scope đã cam kết trong spec.** CLAUDE.md của Module 2 đặc tả 25 entity, trong đó #24 và #25 chính là 2 entity AI này. Không làm Phase 8 thì Module 2 chưa "đóng" được.

2. **Giá trị nghiệp vụ thực sự.** Vận chuyển xuyên biên giới TQ→VN có lead time rất dao động (hải quan giữ hàng, tắc cửa khẩu, mùa Tết). Câu hỏi khách hỏi nhiều nhất là *"bao giờ hàng về?"* — `AITransitForecast` trả lời câu đó. `AIBorderAlert` chuyển từ thế **bị động** (khách khiếu nại khi hàng trễ → ClaimService Phase 7 xử lý) sang **chủ động** (báo trước "cửa khẩu Hữu Nghị đang tắc, delay ~3 ngày"), giảm tải cho CSKH và luồng khiếu nại.

3. **Vì sao đứng cuối (phase 8).** Nó là tầng *giá trị gia tăng* xây trên dữ liệu vận hành mà các phase 3–7 sinh ra: `TrackingEvent`, `ContainerTrip` (cửa khẩu, thời điểm qua biên), timestamps nhập/xuất kho, kết quả giao hàng. Nguồn `InternalData` của alert chính là dữ liệu này. Core flow không phụ thuộc vào nó nên làm cuối là đúng thứ tự phụ thuộc.

4. **Vì sao là "stub service" chứ chưa phải AI thật.** Hệ thống chưa có dữ liệu lịch sử đủ để train model. Stub service (dự báo theo rule/heuristic) chốt được **API contract** ngay: FE xây UI được luôn, sau này thay ruột bằng model thật mà không vỡ contract — giống pattern `StubCarrierGateway` ở Phase 6.

Điểm cộng: Phase 8 gần như chắc chắn **không cần migration mới** (bảng đã có từ Phase 1–2), phạm vi chỉ là ApplicationServices + Controllers.

Lưu ý: Phase 6 vẫn dở dang (cancel GHTK, idempotency, tách HTTP call khỏi transaction) nhưng Phase 8 không phụ thuộc các hạng mục đó — làm trước hay sau đều được.

---

## Câu hỏi 2: Đề xuất dùng model AI nào cho Phase 8, chạy theo hình thức nào?

Tách theo 2 bài toán — **không phải cả hai đều cần LLM**.

### 1. `AITransitForecast` — dự báo lead time: KHÔNG dùng LLM

Đây là bài toán **hồi quy trên dữ liệu bảng**. LLM là công cụ sai — đắt, không ổn định về số học, cần kết quả tái lập được.

**Lộ trình 2 bước:**
- **Bước 1 (Phase 8 stub):** rule-based thuần C# trong `AIForecastService` — baseline theo cửa khẩu, phụ trội theo mùa (`tet` +3–5 ngày), theo `packaging_type`. Confidence gán tĩnh ~0.5–0.6.
- **Bước 2 (khi có ~vài nghìn chuyến dữ liệu thật):** train model hồi quy bằng **ML.NET** (LightGBM/FastTree) trên dữ liệu `ContainerTrip` + `TrackingEvent`. ML.NET chạy **in-process trong .NET 8** — không cần microservice Python riêng.

**Hình thức chạy:** **batch precompute** — `BackgroundService` chạy hàng đêm, tính forecast cho từng tổ hợp (tỉnh gửi × cửa khẩu × carrier × mùa), ghi vào bảng `ai_transit_forecasts`. API của FE chỉ lookup bảng.

### 2. `AIBorderAlert` — cảnh báo tắc biên: lai 2 nguồn

**Nguồn `InternalData` — rule-based, không cần AI.** Background job so thời gian qua biên thực tế của các `ContainerTrip` gần đây với baseline trượt 30 ngày; lệch quá ngưỡng (ví dụ p50 tăng >50%) → tạo `AIBorderAlert` với severity theo mức lệch.

**Nguồn `NewsScrape` — chỗ dùng LLM.** Tin tức tiếng Việt/Trung không cấu trúc → JSON có cấu trúc (`affected_border`, `severity`, `estimated_delay_days`, `description`). Đây là classification/extraction — đúng sở trường của LLM.

- **Model:** đề xuất mặc định **Claude Opus 4.8** (`claude-opus-4-8`, $5/$25 per triệu token). Nếu ưu tiên chi phí: **Haiku 4.5** (`claude-haiku-4-5`, $1/$5) đủ cho task extraction đơn giản — với volume vài chục bài/ngày, chênh lệch thực tế chỉ vài nghìn đồng/ngày nên Opus 4.8 là lựa chọn an toàn.
- **Kỹ thuật gọi:** **structured outputs** (`output_config.format` với JSON schema khớp entity `AIBorderAlert`) để output luôn parse được.
- **Hình thức chạy:** scheduled job mỗi 2–4 giờ: scrape RSS/nguồn tin → lọc bài liên quan cửa khẩu → gọi Messages API → ghi alert → `NotificationService` fan-out. Volume lớn + không cần realtime thì chuyển **Batch API** (giảm 50% giá, hoàn thành ~1 giờ).
- **Tích hợp .NET:** official Anthropic C# SDK (`Anthropic` trên NuGet) — có typed exceptions, retry sẵn; hoặc typed `HttpClient` giống pattern `GhtkCarrierGateway`.

### Tóm tắt kiến trúc

| Thành phần | Công nghệ | Hình thức chạy |
|---|---|---|
| Transit forecast (stub → thật) | Rule-based C# → ML.NET | Batch hàng đêm, precompute vào bảng, API lookup |
| Border alert — dữ liệu nội bộ | Rule-based C# (so baseline) | Background job mỗi vài giờ |
| Border alert — scrape tin tức | Claude Opus 4.8 + structured outputs (Haiku 4.5 nếu ưu tiên chi phí) | Scheduled job 2–4h/lần, Messages API; Batch API khi volume lớn |

**Điểm mấu chốt:** Phase 8 stub không cần chi phí AI nào — toàn bộ chạy rule-based đúng tinh thần PLAN.md. LLM chỉ vào ở nguồn news-scrape của BorderAlert, và ML.NET chỉ vào khi đã tích lũy đủ dữ liệu vận hành thật. Cả hai đều thay ruột được mà không đổi API contract.
