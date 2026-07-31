# Báo cáo: Mô hình dự báo thời gian vận chuyển (Lead Time) Trung Quốc → Việt Nam

*Module 2 — Logistics & Tracking · Nhánh `dungta/ai` · Ngày: 2026-07-08 · Cập nhật: 2026-07-23*
*Mã nguồn: `LG.Module2.Seeder` (sinh dữ liệu), `LG.Module2.Trainer` (huấn luyện),
`LeadTimeModelService` (suy luận) · Nhật ký chi tiết từng bước: `LeadTime.md`*

---

## 1. Bài toán và lý do xây dựng

Hệ thống mua hộ vận hành chuỗi vận chuyển xuyên biên giới: shop Trung Quốc gửi hàng
→ kho trung chuyển TQ → đóng bao, lên xe container → qua cửa khẩu (Hữu Nghị / Lào Cai /
Móng Cái) → kho Việt Nam → giao tới tay khách. Câu hỏi khách hàng đặt ra nhiều nhất
trong toàn bộ vòng đời đơn hàng là: **"bao giờ hàng của tôi về?"**

Thời gian vận chuyển tuyến này dao động rất mạnh và phụ thuộc nhiều yếu tố: cửa khẩu
đi qua, mùa trong năm (đặc biệt cận Tết âm lịch), các đợt ùn tắc biên giới bất chợt,
tỉnh gửi hàng và đơn vị vận chuyển nội địa phía TQ. Hiện hệ thống trả lời câu hỏi này
bằng một **công thức kinh nghiệm** (heuristic — Phase 8 của Module 2): lấy khoảng ngày
cơ sở theo cửa khẩu, cộng thêm hệ số nếu là mùa Tết/mùa đông/hàng nặng. Cách này có
ba điểm yếu đo đếm được:

1. **Sai lệch có hệ thống**: công thức chỉ ước lượng chặng biên giới, trong khi thời
   gian khách cảm nhận là *toàn hành trình* (gồm cả chặng nội địa TQ) — kết quả đo cho
   thấy công thức **hụt trung bình +1,03 ngày** so với thực tế.
2. **Khoảng dự báo không có căn cứ**: khoảng min–max chỉ phủ **58,9%** số ca thực tế,
   và độ tin cậy công bố (60%) là con số gán cứng, không được kiểm chứng.
3. **Không tự cải thiện**: muốn chỉnh phải sửa mã nguồn; không tận dụng được dữ liệu
   vận hành (mốc thời gian nhập/xuất kho, chuyến container) mà hệ thống đang tự tích luỹ.

**Mục tiêu của bài toán**: thay ruột công thức kinh nghiệm bằng một mô hình học máy
huấn luyện trên dữ liệu, giữ nguyên giao diện API (`TransitForecastRequest` /
`TransitForecastResponse`) để phần giao diện người dùng không phải đổi một dòng nào.
Mốc chất lượng đặt ra trước khi làm: sai số tuyệt đối trung bình (MAE) giảm ≥15%,
khoảng dự báo phủ ≥80% thực tế với độ rộng hợp lý (≤3,5 ngày), hết sai lệch hệ thống.

---

## 2. Khái niệm và nguyên lý hoạt động của mô hình (cơ sở lý thuyết)

### 2.1. Khái niệm và nguyên lý hoạt động

**Bài toán thuộc lớp hồi quy có giám sát trên dữ liệu bảng** (supervised tabular
regression): từ các cột đặc trưng đầu vào (cửa khẩu, tỉnh gửi, đơn vị vận chuyển TQ,
cân nặng, mùa...), mô hình học cách ước lượng một giá trị số liên tục — số ngày vận
chuyển. "Có giám sát" nghĩa là mô hình học từ các ví dụ đã biết đáp án: mỗi kiện hàng
lịch sử đều có nhãn (label) là số ngày thực tế đã đi, tính từ lúc shop gửi hàng đến
lúc nhập kho Việt Nam.

**Mô hình chính: rừng cây quyết định tăng cường theo độ dốc** (Gradient Boosted
Decision Trees — GBDT, cài đặt FastTree của ML.NET). Nguyên lý hoạt động:

- Một **cây quyết định** chia dữ liệu bằng chuỗi câu hỏi rẽ nhánh ("cửa khẩu có phải
  Móng Cái không?", "có phải mùa Tết không?"...) và trả về giá trị dự báo ở lá cây.
  Một cây đơn lẻ dự báo thô, nhưng ưu điểm là bắt được **quan hệ phi tuyến** và
  **tương tác giữa các đặc trưng** một cách tự nhiên.
- **Tăng cường (boosting)**: thay vì dùng một cây, mô hình xây hàng trăm cây *nối
  tiếp nhau* — cây sau không học lại từ đầu mà học **phần sai số còn lại** (residual)
  của tổng các cây trước. Cứ thế, sai số được "bào mòn" dần qua từng vòng. Tốc độ
  bào mòn do hệ số học (learning rate) điều khiển: hệ số nhỏ học chậm nhưng ổn định.
- Dự báo cuối cùng = tổng đóng góp của tất cả các cây. Cấu hình sau tinh chỉnh của
  bài toán này: 200 cây × 16 lá, hệ số học 0,03.

Viết dưới dạng toán học, mô hình sau \(M\) vòng boosting là:

\[
F_M(x)=F_0(x)+\eta\sum_{m=1}^{M}h_m(x)
\]

Trong đó \(F_0\) là dự báo khởi đầu, \(h_m\) là cây thứ \(m\), \(M=200\), và
\(\eta=0{,}03\) là hệ số học. Ở vòng \(m\), cây mới học **gradient âm của hàm mất
mát** tại dự báo hiện có:

\[
r_{im}=
-\left.
\frac{\partial L(y_i,F(x_i))}{\partial F(x_i)}
\right|_{F=F_{m-1}}
\qquad;\qquad
F_m(x)=F_{m-1}(x)+\eta h_m(x)
\]

Với hồi quy bình phương sai số, \(r_{im}\) tương ứng với phần sai số còn lại giữa
giá trị thực và dự báo. Vì vậy có thể hiểu cây sau đang sửa phần mà tổng các cây
trước chưa giải thích được. Learning rate nhỏ làm mỗi cây chỉ điều chỉnh một bước
ngắn, giúp mô hình ổn định hơn.

**Sinh khoảng dự báo: phương pháp dự đoán bảo hình** (conformal prediction). Mô hình
GBDT chỉ trả một con số (dự báo điểm), nhưng nghiệp vụ cần **một khoảng ngày kèm độ
tin cậy** ("3–5 ngày, tin cậy 80%"). Nguyên lý conformal:

- Giữ riêng một **tập hiệu chỉnh** (calibration) mà mô hình chưa từng nhìn thấy khi
  huấn luyện. Trên tập này, đo độ lệch tuyệt đối giữa dự báo và thực tế của từng mẫu.
- Lấy **phân vị 80%** của các độ lệch đó (ký hiệu q80): nghĩa là 80% số ca lệch không
  quá q80 ngày. Khoảng dự báo = [dự báo điểm − q80, dự báo điểm + q80].
- Điểm mạnh của phương pháp: **có bảo chứng toán học về độ phủ** — nếu dữ liệu tương
  lai cùng phân phối với tập hiệu chỉnh thì khoảng này phủ đúng ~80% thực tế, không
  cần giả định dữ liệu tuân theo phân phối chuẩn hay bất kỳ dạng nào.
- Biến thể dùng trong bài: **Mondrian conformal** — tính q80 *riêng cho từng nhóm*
  (cửa khẩu × chế-độ-Tết) thay vì gộp chung, vì độ nhiễu của các nhóm khác nhau rõ
  rệt (Móng Cái mùa Tết lệch ±6,98 ngày trong khi mùa thường chỉ ±1,62). Độ tin cậy
  công bố cho khách từ đây là **con số đo được**, không phải gán cứng.

Chi tiết công thức: với dự báo điểm \(\hat y_i=F_M(x_i)\), nonconformity score trên
tập hiệu chỉnh là:

\[
r_i=|y_i-\hat y_i|
\qquad;\qquad
q_{0.8}=\operatorname{Quantile}_{0.8}(r_1,\ldots,r_n)
\]

Khoảng trả về trước khi làm tròn là:

\[
[L,U]=[\max(1,\hat y-q_{0.8}),\ \hat y+q_{0.8}]
\]

Khi serve, hệ thống trả ngày nguyên:

\[
\operatorname{Min}=\max(1,\lfloor L\rfloor)
\qquad;\qquad
\operatorname{Max}=\max(\operatorname{Min}+1,\lceil U\rceil)
\]

Code hiện lấy empirical percentile tại chỉ số
\(\lfloor0{,}8(n-1)\rfloor\) của residual đã sắp xếp. Đây là cách hiệu chỉnh thực
dụng và coverage đã được đo trên tập test. Nếu cần bảo chứng finite-sample bảo thủ
hơn, có thể dùng hạng:

\[
k=\left\lceil(n+1)(1-\alpha)\right\rceil,\quad \alpha=0{,}2
\]

thay cho percentile hiện tại, đồng thời chặn \(k\) trong kích thước tập hiệu chỉnh.

**Nguyên tắc chống rò rỉ dữ liệu** (data leakage) — xuyên suốt thiết kế:

- **Chia dữ liệu theo thời gian**, tuyệt đối không trộn ngẫu nhiên: tập huấn luyện là
  quá khứ, tập kiểm tra là đoạn thời gian sau cùng. Trộn ngẫu nhiên sẽ cho mô hình
  "nhìn trộm" các đợt ùn tắc trong tương lai (vì có mẫu cùng tuần nằm trong tập huấn
  luyện) và cho điểm số ảo.
- **Chỉ dùng đặc trưng khả dụng tại thời điểm dự báo**: cờ "đang tắc biên thật"
  (`congestion_active`) hay "ngày xuất kho rơi vào cuối tuần" đều có tín hiệu trong
  dữ liệu nhưng bị loại, vì lúc khách hỏi dự báo ta không thể biết trước. Thay vào đó
  dùng cờ "hệ thống cảnh báo tắc biên đang bật" — thứ có thật tại thời điểm dự báo.

### 2.2. Ưu điểm của học máy trong việc giải quyết bài toán

So với công thức kinh nghiệm, mô hình học máy đem lại các lợi thế đã kiểm chứng bằng
số liệu trong chính bài toán này:

1. **Học được yếu tố mà công thức bỏ sót.** Công thức chỉ biết cửa khẩu + mùa; mô hình
   học thêm ảnh hưởng của tỉnh gửi (Quảng Châu nhanh hơn Thành Đô ~1,5 ngày) và đơn vị
   vận chuyển TQ (SF Express nhanh hơn Best Express ~1 ngày) — chính là nguồn gốc của
   sai lệch hệ thống +1,03 ngày. Kết quả: sai lệch của mô hình gần như bằng 0.
2. **Bắt được tương tác phi tuyến.** Hiệu ứng Tết không cộng đều: Lào Cai chỉ +3,3 ngày
   trong khi Hữu Nghị/Móng Cái +4,7 ngày; đợt tắc biên tác động theo cấp số nhân chứ
   không cộng thêm. Mô hình dạng cây học được các tương tác này, mô hình tuyến tính
   và công thức cộng dồn thì không (xem mục 5.3).
3. **Khoảng tin cậy trung thực.** Độ phủ thực đo được 80,9% khớp độ tin cậy công bố
   80% — khách được hứa đúng cái hệ thống làm được.
4. **Tự cải thiện theo dữ liệu.** Khi hệ thống vận hành, mỗi kiện hàng về kho là một
   mẫu huấn luyện mới; mô hình huấn luyện lại định kỳ sẽ tự bám theo thay đổi của
   thực tế (chính sách biên, tuyến mới) mà không cần sửa mã nguồn.
5. **Đường lùi an toàn.** Kiến trúc giữ công thức kinh nghiệm làm phương án dự phòng:
   thiếu tệp mô hình hoặc lỗi lúc chạy thì tự động rơi về công thức cũ — rủi ro triển
   khai gần như bằng không.

---

## 3. Dữ liệu sử dụng cho bài toán

### 3.1. Nguồn dữ liệu

Hệ thống **chưa vận hành chính thức** nên chưa có dữ liệu lịch sử thật. Để phát triển
mô hình trước, nhóm xây dựng bộ **dữ liệu tổng hợp** (synthetic data) bằng công cụ
`LG.Module2.Seeder` — mô phỏng thế giới vận hành với các quy luật được mã hoá tường
minh (gọi là "sự thật ngầm"):

| Quy luật mô phỏng | Giá trị |
|---|---|
| Thời gian cơ sở theo cửa khẩu | Hữu Nghị ~N(3,8; 0,7) · Lào Cai ~N(4,7; 0,9) · Móng Cái ~N(5,3; 1,1) ngày — khớp khoảng của công thức kinh nghiệm hiện hành |
| Cận Tết âm lịch (−14 → +7 ngày quanh mùng 1) | cộng ~N(3,5; 1,0) ngày |
| Tuần lễ vàng TQ (1–7/10), hè, cuối tuần | +1,5 · +0,3 · +0,4 ngày |
| Tỉnh gửi hàng (6 tỉnh) | +0 (Quảng Châu) → +1,5 (Thành Đô) theo khoảng cách tới biên |
| Đơn vị vận chuyển TQ (5 hãng) | −0,4 (SF Express) → +0,5 (Best Express) |
| Hàng lô lớn ≥500kg | +0,8 ngày |
| Đợt ùn tắc biên ngẫu nhiên | ~8 đợt/năm/cửa khẩu, kéo dài 3–10 ngày, **nhân** hệ số 1,3–2,5 |
| Nhiễu vận hành + ngoại lệ | N(0; 0,5) + 2% số ca bị giữ hàng lẻ tẻ (+2–6 ngày) |

Có thể tóm tắt công thức sinh nhãn như sau. Trước tiên lấy thời gian cơ sở theo cửa
khẩu:

\[
D_0\sim\mathcal{N}(\mu_{\text{border}},\sigma_{\text{border}})
\]

Sau đó cộng các ảnh hưởng biết trước:

\[
D_1=D_0
+P_{\text{province}}
+C_{\text{carrier}}
+0{,}8I_{\text{bulk}}
+T_{\text{tet}}
+H_{\text{holiday}}
+S_{\text{summer}}
+W_{\text{weekend}}
\]

Nếu ngày gửi nằm trong một đợt tắc biên, toàn bộ thời gian tại thời điểm đó bị nhân
với \(M_{\text{congestion}}\in[1{,}3;2{,}5]\). Nhãn cuối cùng là:

\[
Y=\max(1,\ D_1M_{\text{congestion}}+\epsilon+O)
\]

với \(\epsilon\sim\mathcal{N}(0;0{,}5)\), còn \(O\) là 2–6 ngày cộng thêm cho 2% ca
ngoại lệ. Khi không tắc biên, \(M_{\text{congestion}}=1\). Cờ `alert_active` không
bật ngay lúc tắc mà trễ 2 ngày, mô phỏng thời gian hệ thống cần tích luỹ đủ tín hiệu.

Cách tiếp cận này có hai giá trị: (1) dựng và kiểm chứng toàn bộ quy trình trước khi
có dữ liệu thật — vì đã biết "sự thật ngầm", ta kiểm tra được mô hình có học lại đúng
các quy luật hay không (một dạng kiểm thử cho quy trình học máy); (2) khi hệ vận hành,
chỉ cần thay nguồn dữ liệu (bảng `TrackingEvent`, `ContainerTrip`) — quy trình giữ nguyên.
Dữ liệu sinh **tái lập được hoàn toàn** nhờ hạt giống ngẫu nhiên cố định (seed 42).

**Lưu ý trung thực**: mô hình huấn luyện từ dữ liệu tổng hợp *không dùng cho khách
thật* — nó chỉ chứng minh quy trình; con số chất lượng cuối cùng phải đo lại trên dữ
liệu vận hành.

### 3.2. Mô tả dữ liệu

Bộ dữ liệu: **50.000 dòng**, mỗi dòng là một kiện hàng, trải từ 01/2024 đến 07/2026,
không có giá trị khuyết. Cấu trúc cột:

| Cột | Kiểu | Vai trò | Ghi chú |
|---|---|---|---|
| `departure_date` | ngày | chia tập theo thời gian | không phải đặc trưng |
| `origin_province_cn` | phân loại (6 giá trị) | đặc trưng | tỉnh gửi hàng TQ |
| `carrier_cn` | phân loại (5) | đặc trưng | đơn vị vận chuyển nội địa TQ |
| `border_crossing` | phân loại (3) | đặc trưng | cửa khẩu |
| `weight_kg` | số thực | đặc trưng | cân nặng kiện |
| `month` | số nguyên 1–12 | đặc trưng | tháng gửi |
| `season` | phân loại (5) | đặc trưng | xuân/hạ/thu/đông/tết |
| `is_tet_window` | 0/1 | không dùng | trùng nghĩa với `season=tet` |
| `congestion_active` | 0/1 | **không dùng — rò rỉ** | sự thật tắc biên, không biết trước được |
| `alert_active` | 0/1 | đặc trưng | cảnh báo tắc biên hệ thống bật (mô phỏng phát hiện **trễ 2 ngày**, phủ 67% ca tắc — trung thực với hệ cảnh báo thật) |
| `transit_days` | số thực | **nhãn** | số ngày toàn hành trình shop → kho VN |

Kết quả khảo sát dữ liệu (EDA) trên 50.000 dòng — các con số chính:

- Nhãn `transit_days`: trung bình 5,87 · trung vị 5,3 · độ lệch chuẩn 2,57 · **lệch
  phải rõ** (skewness +2,42), phân vị 99% = 15,9 ngày, 2% ngoại lệ >13,6 ngày.
- Cửa khẩu là tín hiệu mạnh nhất: 5,22 / 6,29 / 7,10 ngày; độ nhiễu cũng tăng dần
  theo cùng thứ tự (độ lệch chuẩn 2,20 → 3,04).
- Tết: 9,90 so với 5,55 ngày thường (+4,35). **Tương tác Tết × cửa khẩu không đồng
  đều** (Lào Cai +3,3; hai cửa kia +4,7) — căn cứ chọn mô hình dạng cây.
- Cân nặng gần như không mang tin dưới 100kg; chỉ nhóm ≥500kg chậm hơn (+0,85 ngày);
  phân phối có khoảng trống 26→500kg (hai cụm tách biệt).

### 3.3. Tiền xử lý dữ liệu

1. **Nạp thủ công** từng dòng CSV (không dùng bộ nạp tự động) để kiểm soát định dạng
   số theo chuẩn bất biến (invariant culture) và tính đặc trưng dẫn xuất ngay lúc nạp.
2. **Đặc trưng dẫn xuất** `is_bulk` = (cân nặng ≥ 500kg) — thay cho giá trị cân nặng
   thô vốn ít thông tin do phân phối hai cụm.
3. **Loại đặc trưng rò rỉ / trùng lặp**: bỏ `congestion_active` (không biết trước
   tại thời điểm dự báo), bỏ ngày-trong-tuần (không biết trước kiện xuất kho thứ mấy),
   bỏ `is_tet_window` (trùng `season`).
4. **Mã hoá one-hot** cho 4 cột phân loại (cửa khẩu, tỉnh, hãng vận chuyển, mùa);
   các cột số giữ nguyên — mô hình dạng cây không cần chuẩn hoá thang đo.
   Với một biến phân loại có \(K\) giá trị, giá trị thứ \(k\) được biến đổi thành
   vector chỉ báo:
   \[
   x_j^{(k)}=I(x_j=k),\quad k=1,\ldots,K
   \]
   Ví dụ `HuuNghi`, `LaoCai`, `MongCai` lần lượt thành `[1,0,0]`, `[0,1,0]`,
   `[0,0,1]`. Vector cuối cùng ghép one-hot với `weight_kg`, `month`, `is_bulk`
   và `alert_active`.
5. **Chia tập theo thời gian** (hai kịch bản kiểm tra chéo tiến — walk-forward):
   - **Kịch bản 1**: huấn luyện <01/2026 (39.731 mẫu) · hiệu chỉnh quý 1/2026 (4.943)
     · kiểm tra ≥04/2026 (5.326 — toàn mùa thường).
   - **Kịch bản 2**: huấn luyện <12/2025 · hiệu chỉnh 12/2025 · kiểm tra quý 1/2026
     (4.943, trong đó **1.208 mẫu mùa Tết**) — chấm điểm riêng chế độ khó nhất, và
     giả lập đúng tình huống hệ thống đi qua mùa Tết đầu tiên mà tập hiệu chỉnh
     chưa từng thấy Tết.
6. **Giữ nguyên ngoại lệ** (không cắt bỏ các ca giữ hàng): đời thật có, và thước đo
   chính MAE vốn ít nhạy với ngoại lệ.

---

## 4. Mô hình và pipeline xử lý

### 4.1. Lựa chọn mô hình

**Mô hình chính: FastTree (GBDT) của ML.NET**, với các lý do:

- Phù hợp nhất cho dữ liệu bảng cỡ nhỏ–vừa; bắt tương tác phi tuyến (đã chứng minh
  cần thiết ở mục 3.2) mà không cần thiết kế đặc trưng thủ công.
- **Chạy trong tiến trình .NET 8** — hệ thống BE toàn bộ là .NET, không phải dựng
  thêm dịch vụ Python riêng, không thêm chi phí hạ tầng và độ trễ mạng.
- Suy luận cực nhanh (xem 5.1), tệp mô hình nhỏ, nạp bằng thư viện chính thức.

**Cấu hình sau tinh chỉnh**: 200 cây × 16 lá, hệ số học 0,03, tối thiểu 20 mẫu/lá.
Việc tinh chỉnh quét 27 tổ hợp siêu tham số trên **tập kiểm định riêng** (quý 4/2025,
tách từ tập huấn luyện — tuyệt đối không dùng tập kiểm tra để chọn tham số). Kết quả
đáng chú ý: mặt điểm số gần như **phẳng** giữa các tổ hợp (chênh <0,015 ngày) — chất
lượng bài toán này không nằm ở siêu tham số mà ở **đặc trưng**, cụ thể là:

**Hai biến thể mô hình được so sánh** — khác nhau đúng một đặc trưng:
- **v2**: không có thông tin cảnh báo tắc biên.
- **v3 (chọn triển khai)**: thêm `alert_active` — cờ cảnh báo tắc biên của chính hệ
  thống (Module 2 có sẵn tính năng quét phát hiện tắc biên). Để trung thực, dữ liệu
  mô phỏng cờ này **phát hiện trễ 2 ngày** sau khi đợt tắc bắt đầu, không giả định
  cảnh báo hoàn hảo. Đây hoá ra là quyết định quan trọng nhất toàn bài (xem 5.2).

**Khoảng dự báo**: Mondrian conformal theo nhóm (cửa khẩu × chế-độ-Tết), phân vị 80%,
nhóm dưới 80 mẫu tự rơi về mức cửa khẩu rồi mức toàn cục.

### 4.2. Pipeline xử lý

**Quy trình huấn luyện — đánh giá (đã chạy):**

```
CSV 50.000 dòng (Seeder, seed 42)
   │  nạp thủ công + đặc trưng dẫn xuất is_bulk, loại đặc trưng rò rỉ
   ▼
Chia theo thời gian ──── kịch bản 1 (mùa thường) ─── kịch bản 2 (chứa Tết)
   │
   ▼
Mã hoá one-hot (4 cột phân loại) + ghép vector đặc trưng
   │
   ▼
Tinh chỉnh siêu tham số (27 tổ hợp, chấm trên tập kiểm định Q4/2025)
   │
   ▼
Huấn luyện FastTree cấu hình tốt nhất trên toàn tập huấn luyện
   │
   ▼
Hiệu chỉnh khoảng: Mondrian conformal q80 trên tập hiệu chỉnh
   │
   ▼
Đánh giá 1 lần duy nhất trên tập kiểm tra ── so với công thức kinh nghiệm
   │                                          + mô hình tuyến tính đối chứng
   ▼
Kiểm tra hợp lý: xáo trộn từng đặc trưng đo mức tăng sai số
   (permutation importance) — đối chiếu với "sự thật ngầm" của bộ sinh dữ liệu
   │
   ▼
Xuất models/leadtime.zip + conformal.csv (border, regime, q80)
```

**Quy trình vận hành hiện tại (đã tích hợp):**

```
POST /api/ai/transit-forecasts
   │
   ├─ suy mùa từ thời điểm hiện tại
   ├─ đọc AIBorderAlert đang active của cửa khẩu
   ├─ tạo vector feature, trong đó AlertActive = 0/1
   ├─ FastTree dự báo điểm
   ├─ conformal.csv chọn q80 theo cửa khẩu × chế độ
   ├─ tạo khoảng ngày nguyên + confidence 0,80
   └─ lưu kết quả vào bảng ai_transit_forecasts

Thiếu cấu hình / thiếu file / nạp model lỗi / predict lỗi
   └─ tự động rơi về heuristic Phase 8
```

`LeadTimeModelService` là singleton được khởi tạo lazy: đăng ký khi Module 2 startup
nhưng chỉ nạp `leadtime.zip` và `conformal.csv` khi service AI được resolve lần đầu.
Trainer không chạy cùng API; huấn luyện là tác vụ vận hành riêng. Background job
precompute ban đêm vẫn là hướng nâng cấp, chưa có trong code hiện tại. Giao diện API
giữ nguyên hoàn toàn nên phần giao diện người dùng không phải thay đổi.

---

## 5. Đánh giá kết quả và so sánh

### 5.1. Đánh giá thời gian phản hồi

Đo trên máy phát triển (cùng máy chạy toàn bộ thí nghiệm):

| Khâu | Thời gian đo được |
|---|---|
| Huấn luyện FastTree (39.731 mẫu) | **0,7–0,8 giây** |
| Huấn luyện tuyến tính SDCA (đối chứng) | 1,6–2,9 giây |
| Suy luận theo lô (5.326 mẫu) | 8 ms — **~1,6 µs/mẫu** |
| Suy luận từng mẫu (PredictionEngine, 10.000 lần) | **~8,5 µs/mẫu** |

Nhận xét: suy luận nhanh hơn yêu cầu thực tế nhiều bậc — một yêu cầu API thông thường
cho phép hàng chục mili giây, mô hình chỉ cần ~0,0085 ms. Huấn luyện dưới 1 giây nghĩa
là có thể huấn luyện lại **hàng đêm** nếu sau này bổ sung job. Hiện API suy luận trực
tiếp theo request rồi lưu dự báo; thời gian suy luận khoảng 8,5 µs nhỏ hơn nhiều so
với thời gian truy vấn DB và xử lý HTTP nên không phải nút thắt.

### 5.2. Đánh giá chất lượng kết quả trả về

Thước đo: **MAE** (sai số tuyệt đối trung bình, ngày — càng thấp càng tốt), **bias**
(sai lệch hệ thống, ~0 là tốt), **PICP** (tỉ lệ ca thực tế rơi trong khoảng dự báo —
phải khớp độ tin cậy công bố 80%), **width** (độ rộng khoảng — hẹp mà vẫn đủ phủ là tốt).

Với \(y_i\) là thời gian thật, \(\hat y_i\) là dự báo điểm và
\([L_i,U_i]\) là khoảng dự báo:

\[
\operatorname{MAE}=\frac{1}{n}\sum_{i=1}^{n}|y_i-\hat y_i|
\]

\[
\operatorname{Bias}=\frac{1}{n}\sum_{i=1}^{n}(y_i-\hat y_i)
\]

\[
\operatorname{PICP}=\frac{1}{n}\sum_{i=1}^{n}I(L_i\le y_i\le U_i)
\]

\[
\operatorname{Width}=\frac{1}{n}\sum_{i=1}^{n}(U_i-L_i)
\]

Bias dương nghĩa là model có xu hướng dự báo thấp hơn thực tế; bias âm nghĩa là
dự báo cao hơn thực tế. PICP không được xem riêng lẻ: một khoảng rất rộng có thể
đạt coverage cao nhưng không còn giá trị nghiệp vụ.

**Kịch bản 1 — kiểm tra mùa thường (5.326 mẫu):**

| Phương án | MAE | Bias | PICP | Width | Mốc đặt ra |
|---|---|---|---|---|---|
| Công thức kinh nghiệm | 1,491 | +1,033 | 58,9% | 2,22 | |
| Mô hình v2 (không cảnh báo) | 1,322 | +0,015 | 82,5% | 4,14 | trượt mốc width |
| **Mô hình v3 (có cảnh báo)** | **1,090** | **+0,060** | **80,9%** | **3,13** | **✅ đạt cả 3 mốc** |

Mô hình v3 giảm sai số **26,9%** so với công thức, xoá sạch sai lệch hệ thống, khoảng
dự báo phủ đúng như công bố (80,9% ≈ 80%) với độ rộng chấp nhận được.

**Kịch bản 2 — kiểm tra quý chứa Tết (4.943 mẫu, 1.208 mẫu Tết):**

| Phương án | MAE tổng | MAE riêng Tết | PICP riêng Tết |
|---|---|---|---|
| Công thức kinh nghiệm | 1,346 | — | — |
| Mô hình v2 (không cảnh báo) | **1,626 — thua cả công thức** | 2,536 | 46,8% |
| **Mô hình v3 (có cảnh báo)** | **1,138 — thắng** | 1,397 | 67,5% |

Hai bài học rút ra từ kịch bản khó:
- Mùa Tết trùng mùa tắc biên — mô hình **không có** thông tin cảnh báo thua cả công
  thức kinh nghiệm. Đặc trưng cảnh báo tắc biên là **điều kiện thắng**, không phải
  tính năng phụ; đồng nghĩa chất lượng mô hình phụ thuộc chất lượng của hệ cảnh báo
  (bài toán số 2 trong lộ trình ML của Module 2).
- PICP nhóm Tết 67,5% dưới mức công bố vì tập hiệu chỉnh (12/2025) **chưa từng thấy
  chế độ Tết** — đúng tình huống hệ thật đi qua Tết đầu tiên. Biện pháp đã ghi nhận:
  cửa sổ hiệu chỉnh trượt 12–14 tháng để luôn bao trùm ít nhất một mùa Tết.

**Kiểm tra hợp lý (xáo trộn từng đặc trưng, đo mức tăng sai số):** thứ tự tầm quan
trọng mô hình học được — cửa khẩu (+0,32) ≈ cảnh báo tắc biên (+0,32) > tỉnh gửi
(+0,11) > hãng vận chuyển (+0,08) > cân nặng (+0,01) — **khớp đúng thứ tự "sự thật
ngầm"** đã mã hoá trong bộ sinh dữ liệu. Đây là bằng chứng quy trình học đúng quy luật
chứ không học nhiễu.

Với feature \(j\), permutation importance được tính bằng:

\[
\operatorname{Importance}_j=
\operatorname{MAE}(\operatorname{shuffle}(X_j))
-\operatorname{MAE}(X)
\]

Model được giữ nguyên; chỉ xáo trộn feature \(j\) giữa các mẫu để phá quan hệ của
feature đó với nhãn. MAE tăng càng nhiều thì model càng phụ thuộc vào feature đó.

### 5.3. So sánh với phương pháp khác

| Phương pháp | MAE mùa thường | MAE quý Tết (riêng Tết) | Nhận xét |
|---|---|---|---|
| Công thức kinh nghiệm (hiện hành) | 1,491 | 1,346 | Sai lệch hệ thống +1 ngày; khoảng tin cậy không kiểm chứng; không tự cải thiện |
| Hồi quy tuyến tính (SDCA, cùng đặc trưng với v3) | 1,119 | 1,227 (**1,689**) | Đối thủ mạnh bất ngờ ở chế độ thường (thế giới mô phỏng phần lớn cộng tính), nhưng **thua rõ ở chế độ có tương tác**: mùa Tết kém FastTree 21% (1,689 so với 1,397) vì không bắt được tương tác Tết × cửa khẩu và hiệu ứng nhân của tắc biên |
| **FastTree GBDT — v3 (chọn)** | **1,090** | **1,138 (1,397)** | Tốt nhất ở mọi kịch bản; huấn luyện nhanh hơn cả tuyến tính (0,7s so với 1,6–2,9s) |

Bài học từ phép so sánh tuyến tính: trên dữ liệu "hiền" (mùa thường, quan hệ gần cộng
tính) mô hình đơn giản bám rất sát — giá trị của mô hình dạng cây chỉ lộ ra ở **các
chế độ có tương tác**, mà đó lại chính là lúc dự báo sai gây thiệt hại lớn nhất
(mùa cao điểm). Chọn mô hình phải nhìn vào kịch bản khó, không nhìn trung bình.

**Các phương án đã cân nhắc nhưng không chọn:**
- **Mạng nơ-ron**: cần nhiều dữ liệu hơn hẳn để vượt GBDT trên dữ liệu bảng (các so
  sánh công khai trên dữ liệu bảng cỡ này đều nghiêng về cây tăng cường), khó giải
  thích, thêm phức tạp hạ tầng — không tương xứng lợi ích ở quy mô hiện tại.
- **Mô hình ngôn ngữ lớn (LLM)**: sai công cụ cho hồi quy số — chi phí cao, kết quả
  không tái lập, không có bảo chứng khoảng tin cậy. LLM chỉ phù hợp cho nhánh khác
  của lộ trình (đọc tin tức tắc biên phi cấu trúc).

---

## 6. Trạng thái tích hợp và giới hạn

- Model production hiện là **v3 có `AlertActive`**, xuất thành `leadtime.zip`; bảng
  hiệu chỉnh khoảng nằm trong `conformal.csv`.
- API không tự train khi khởi động. Trainer phải được chạy riêng, sau đó cấu hình
  `Ai:ModelDirectory` trỏ tới thư mục chứa hai file trên.
- Model được nạp một lần khi service AI được resolve lần đầu. Mỗi request dự báo
  chạy inference trực tiếp, đọc cảnh báo biên đang active và lưu kết quả để audit.
- Cảnh báo tắc biên hiện vẫn là thuật toán rule-based; chất lượng của feature
  `AlertActive` phụ thuộc vào độ trễ và độ chính xác của thuật toán cảnh báo này.
- Kết quả hiện tại đo trên **dữ liệu tổng hợp**, vì vậy chứng minh pipeline và tính
  đúng kỹ thuật chứ chưa chứng minh độ chính xác ngoài thực tế.
- Coverage riêng mùa Tết trong fold khó chỉ đạt 67,5%. Khi có dữ liệu thật, tập
  calibration nên dùng cửa sổ trượt 12–14 tháng để luôn chứa ít nhất một mùa Tết.
- Cần lưu ground truth khi kiện nhập kho VN, theo dõi MAE/bias/PICP theo thời gian,
  phát hiện drift và retrain bằng dữ liệu vận hành thật trước khi dùng kết quả cho
  cam kết SLA với khách hàng.

---

## Phụ lục — Tái lập toàn bộ kết quả

```bash
# 1. Sinh dữ liệu (tái lập từng byte nhờ seed cố định)
cd BE/Logistics/Services/Module2/LG.Module2.Seeder
dotnet run -- --rows 50000 --seed 42 --out data/transit_50k.csv

# 2. Khảo sát dữ liệu + đo công thức kinh nghiệm
python3 eda.py data/transit_50k.csv
python3 baseline.py data/transit_50k.csv

# 3. Huấn luyện + đánh giá toàn bộ (2 kịch bản × 4 phương án + benchmark)
cd ../LG.Module2.Trainer
dotnet run
```
