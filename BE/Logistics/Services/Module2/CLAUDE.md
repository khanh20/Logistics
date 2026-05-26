PHẦN 4: MODULE 2 — VẬN CHUYỂN & LOGISTICS
MODULE 2  — Logistics & Tracking (China → Vietnam)

Mục tiêu: Theo dõi toàn bộ hành trình vật lý của kiện hàng từ kho Trung Quốc → Cửa khẩu → Kho Việt Nam → Tay khách. Mỗi kiện hàng có barcode nội bộ, cân đo chính xác (tính cước), tracking realtime cho khách xem. Tích hợp API GHTK/GHN để giao nội địa.
4.1 Danh sách Entity
STT	Entity	Bảng DB	Trạng thái	Mô tả & Trường quan trọng
1	Warehouse	warehouses	GIỮ	Kho bãi (Quảng Châu TQ, Lạng Sơn, Hà Nội, HCM). type: china_transit / vn_hub / vn_last_mile. max_capacity_m3.
2	WarehouseZone	warehouse_zones	GIỮ	Khu/Kệ trong kho (Khu A - Kệ 3 - Hàng 2). Hỗ trợ định vị hàng nhanh.
3	WarehouseStaff	warehouse_staff	MỚI	Gắn nhân viên kho với kho cụ thể. role: receiver / packer / dispatcher / manager. Dùng để audit ai quét mã vạch.
4	ChinaWaybill	china_waybills	GIỮ	Mã vận đơn nội địa TQ (do shop cung cấp). carrier_cn (SF Express, ZTO...), status, expected_cn_arrival.
5	Package	packages	NÂNG CẤP	Kiện hàng (entity trung tâm M2). Thêm: barcode (mã vạch nội bộ tự sinh), actual_weight_kg, length_cm, width_cm, height_cm, vol_weight_kg (L×W×H/8000), charged_weight_kg=max(actual, vol), packaging_type (normal/fragile/oversized), zone_id (vị trí trong kho).
6	PackageItemMap	package_item_maps	GIỮ	Map kiện hàng ↔ sản phẩm trong đơn khách. Cho phép 1 kiện chứa nhiều item.
7	PackageDimension	package_dimensions	NÂNG CẤP	Lịch sử cân/đo (tại kho TQ và đối soát tại kho VN). Thêm: measured_by (staff_id), device_id, variance_kg (chênh lệch để flag cảnh báo nếu > 10%).
8	PackageImage	package_images	GIỮ	Ảnh kiện hàng: nhập kho, xuất kho, sự cố. type: receipt / dispatch / damage / inspection.
9	Sack	sacks	NÂNG CẤP	Bao/Lô hàng. Thêm: total_weight_kg, total_packages, seal_code, status: packing/sealed/in_transit/arrived/opened.
10	SackPackageMap	sack_package_maps	MỚI	Map nhiều-nhiều giữa Sack và Package (vì gộp/tách bao). Ghi nhận thời điểm đóng/rã bao.
11	ContainerTrip	container_trips	NÂNG CẤP	Chuyến xe container. Thêm: vehicle_plate, driver_phone, departure_cn_at, border_crossing (Hữu Nghị/Lào Cai/Móng Cái), status: loading/departed/border/arrived_vn.
12	CustomsClearance	customs_clearances	NÂNG CẤP	Hồ sơ hải quan. Thêm: declared_value_vnd, hs_code_summary, customs_officer_name, duty_paid_vnd, clearance_type (TMDT/tieu_ngach/chinh_ngach), cleared_at.
13	TrackingEvent	tracking_events	GIỮ	Log hành trình hiển thị cho khách. type: cn_warehouse_in / cn_warehouse_out / border_customs / vn_warehouse_in / out_for_delivery / delivered. location, note.
14	WarehouseReceipt	warehouse_receipts	GIỮ	Phiếu nhập kho (NV quét mã vạch). scanned_by (staff_id), received_at, condition: ok/damaged/missing.
15	WarehouseDispatch	warehouse_dispatches	GIỮ	Phiếu xuất kho. dispatched_by, reason: customer_request/return_cn/transfer.
16	DeliveryRequest	delivery_requests	NÂNG CẤP	Khách yêu cầu giao hàng nội địa. Thêm: delivery_address_id, preferred_time_slot, cod_amount (thu hộ nếu có), ship_fee_vnd (trừ ví tự động).
17	DeliveryPackage	delivery_packages	GIỮ	Các kiện trong 1 yêu cầu giao hàng.
18	DomesticCarrier	domestic_carriers	GIỮ	Đơn vị ship nội địa (GHTK, GHN, Viettel Post, J&T). Lưu: api_endpoint, webhook_secret, max_weight_kg, max_value_vnd.
19	DomesticWaybill	domestic_waybills	NÂNG CẤP	Mã vận đơn GHTK/GHN. Thêm: carrier_fee_vnd (phí thực tế carrier báo về qua webhook), delivery_attempt_count, failed_reason, last_status_at.
20	SplitMergeHistory	split_merge_histories	GIỮ	Lịch sử tách/gộp kiện. action: split/merge, reason, done_by (staff_id), parent_package_id, child_package_ids[].
21	MissingClaim	missing_claims	NÂNG CẤP	Khiếu nại mất/thất lạc hàng. Thêm: claimed_value_vnd, insurance_coverage_pct (dựa vào gói bảo hiểm), resolved_amount_vnd, resolution: refund/reship/rejected.
22	InsuranceClaim	insurance_claims	MỚI	Yêu cầu bồi thường bảo hiểm (tách riêng khỏi MissingClaim). Liên kết: package_id, order_id. Ghi: damage_photos, adjuster_note, approved_amount.
23	StoragePenalty	storage_penalties	NÂNG CẤP	Phí lưu kho quá hạn (sau 7 ngày free). Thêm: free_days (cấu hình theo VIP tier), daily_rate_vnd, total_days, total_fee_vnd, auto_charged_at.
24	AITransitForecast	ai_transit_forecasts	GIỮ	AI dự báo lead time. Input: origin_province_cn, weight_kg, carrier_cn, border_crossing, season. Output: est_days_min/max, confidence_pct.
25	AIBorderAlert	ai_border_alerts	NÂNG CẤP	Cảnh báo tắc biên. Thêm: severity (low/medium/high/critical), affected_border, estimated_delay_days, source (news_scrape/internal_data), notified_customers_count.

4.2 Thuộc tính chi tiết — Package (Entity trung tâm)
Thuộc tính	Kiểu DL	Ràng buộc	Mô tả
id	UUID	PK	Khóa chính
barcode	VARCHAR(30)	UNIQUE	Mã vạch nội bộ tự sinh (in và dán vào kiện)
waybill_id	UUID	FK→china_waybills	Mã vận đơn TQ nội địa
sack_id	UUID	FK→sacks	Bao chứa kiện này
zone_id	UUID	FK→warehouse_zones	Vị trí trong kho (cập nhật khi scan nhập kho)
status	ENUM	NOT NULL	pending_cn / in_cn_warehouse / in_sack / in_transit / customs / in_vn_warehouse / dispatched / delivered / lost / returned
actual_weight_kg	DECIMAL(8,3)		Cân nặng thực tế sau khi cân tại kho
length_cm	DECIMAL(8,1)		Chiều dài
width_cm	DECIMAL(8,1)		Chiều rộng
height_cm	DECIMAL(8,1)		Chiều cao
vol_weight_kg	DECIMAL(8,3)	GENERATED	Cân nặng thể tích = L×W×H/8000
charged_weight_kg	DECIMAL(8,3)	GENERATED	max(actual, vol) – dùng để tính cước. Tối thiểu 0.3kg
packaging_type	ENUM	DEFAULT normal	normal / fragile (yêu cầu đóng gỗ) / oversized / liquid_risk
insurance_opted	BOOL	DEFAULT false	Khách có chọn gói bảo hiểm không
insurance_level	ENUM		basic (50% bồi thường) / full (100% bồi thường)
created_at	TIMESTAMP	NOT NULL	Thời điểm tạo bản ghi kiện hàng

4.3 Use Cases Module 2
#	Use Case	Tác nhân & Điều kiện	Luồng chính & Business rule
UC-2.01	Nhập kho TQ & cân đo	NV Kho TQ	Quét barcode Package → Xác nhận mã vận đơn TQ → Cân/đo thực tế → Chụp ảnh → Hệ thống tính vol_weight và charged_weight → Ghi WarehouseReceipt → Cập nhật PackageDimension. Alert nếu variance > 10% so với shop khai báo.
UC-2.02	Kiểm tra hàng cấm tại kho	NV Kho TQ	Mở kiện kiểm tra → Nếu phát hiện hàng cấm (thực phẩm, chất lỏng > quy định, pin lithium không đúng quy cách) → Mark package flagged_forbidden → Notify NV CSKH → Liên hệ khách xử lý.
UC-2.03	Đóng bao & kẹp chì	NV Kho TQ	Chọn các Package để đóng Sack → Hệ thống tính tổng trọng lượng → In manifest → Nhập seal_code → Status Sack → sealed. Ràng buộc: Không cho gộp kiện có packaging_type=fragile với kiện thường.
UC-2.04	Ghi nhận chuyến container	NV Kho TQ / Dispatcher	Tạo ContainerTrip → Gán các Sack vào chuyến → Nhập: biển số, tài xế, cửa khẩu dự kiến. Notify NV kho VN về ETA.
UC-2.05	Cập nhật trạng thái hải quan	NV Hải Quan / NV Kho	Cập nhật CustomsClearance: declared_value, clearance_type, status (pending/processing/cleared/held). Nếu bị giữ hàng → Notify khách + Admin → Ghi nguyên nhân. Auto push TrackingEvent cho khách xem.
UC-2.06	Nhập kho VN & rã bao	NV Kho VN	Chuyến về kho VN → Cắt Seal, xác nhận seal_code → Rã bao → Quét từng Package → Ghi WarehouseReceipt + zone_id → Ghi TrackingEvent "Hàng về kho VN" → Auto push Zalo/in-app notify cho khách.
UC-2.07	Tính cước vận chuyển quốc tế	System (auto sau khi cân tại kho VN)	Lấy charged_weight_kg (max actual/vol, tối thiểu 0.3kg) × đơn giá/kg theo FeeRule → Cộng vào OrderFeeDetail (ship_intl_vnd) → Tính remaining_amount_vnd = final_amount - deposit - ship_intl → Thông báo khách thanh toán nốt.
UC-2.08	Khách tạo yêu cầu giao nội địa	Khách hàng	Chọn package(s) muốn lấy → Chọn địa chỉ từ sổ địa chỉ → Chọn thời gian → Hệ thống tính ship_fee qua API GHTK/GHN → Trừ ví tự động (PaymentLock) → Tạo DomesticWaybill qua API carrier.
UC-2.09	Tracking hành trình giao nội địa	System (webhook từ GHTK/GHN)	Nhận webhook → Cập nhật DomesticWaybill.status → Ghi TrackingEvent → Push notify Zalo/app cho khách. Nếu delivery_attempt > 2 → Alert CSKH xử lý.
UC-2.10	Xử lý thất lạc & bảo hiểm	Khách hàng / NV CSKH	Khách tạo MissingClaim → NV điều tra (so sánh ảnh nhập kho vs xuất kho) → Nếu xác nhận thất lạc → Tạo InsuranceClaim → Hoàn tiền: 50% (basic) hoặc 100% (full) giá trị hàng về ví khách qua RefundProcess.
