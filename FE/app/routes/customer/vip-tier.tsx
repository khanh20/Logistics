import { useEffect } from "react";
import { Link } from "react-router";
import { Card, Progress, Table, Tag, Button, Spin } from "antd";
import {
  CrownOutlined,
  StarOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  CheckCircleFilled,
  LockOutlined,
  LeftOutlined
} from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import { fetchMyProfile } from "~/lib/feature/customerProfile/customerProfileThunk";
import { fetchVipTiers } from "~/lib/feature/adminFinance/adminFinanceThunk";
import { selectProfile, selectProfileStatus } from "~/lib/feature/customerProfile/customerProfileSelector";
import { selectVipTiers } from "~/lib/feature/adminFinance/adminFinanceSelector";
import { formatVND, formatColor, formatPct, formatShortVnd, formatRangeVnd } from "~/lib/utils/format";

export default function VipTierPage() {
  const dispatch = useAppDispatch();
  const profile = useAppSelector(selectProfile);
  const vipTiersRaw = useAppSelector(selectVipTiers);
  const profileStatus = useAppSelector(selectProfileStatus);

  useEffect(() => {
    dispatch(fetchMyProfile());
    dispatch(fetchVipTiers());
  }, [dispatch]);

  // Sắp xếp các hạng VIP theo Level tăng dần từ Database
  const vipTiers = [...vipTiersRaw].sort((a, b) => a.level - b.level);

  // Định nghĩa màu sắc mặc định và icon tương ứng theo tên/level của hạng nếu backend không trả về
  const getTierMeta = (tierName: string, level: number) => {
    const nameLower = tierName.toLowerCase();
    if (nameLower.includes("đồng") || nameLower.includes("bronze") || level === 1) {
      return {
        color: "#d97706", // Cam đậm
        bgClass: "bg-amber-600",
        borderClass: "border-amber-600",
        textClass: "text-amber-600",
        icon: <SafetyCertificateOutlined className="text-4xl text-white" />,
        iconSm: <SafetyCertificateOutlined />,
        nameEn: "Bronze"
      };
    }
    if (nameLower.includes("bạc") || nameLower.includes("silver") || level === 2) {
      return {
        color: "#6b7280", // Xám bạc
        bgClass: "bg-gray-500",
        borderClass: "border-gray-500",
        textClass: "text-gray-600",
        icon: <StarOutlined className="text-4xl text-white" />,
        iconSm: <StarOutlined />,
        nameEn: "Silver"
      };
    }
    if (nameLower.includes("vàng") || nameLower.includes("gold") || level === 3) {
      return {
        color: "#ca8a04", // Vàng gold
        bgClass: "bg-yellow-600",
        borderClass: "border-yellow-600",
        textClass: "text-yellow-600",
        icon: <CrownOutlined className="text-4xl text-white" />,
        iconSm: <CrownOutlined />,
        nameEn: "Gold"
      };
    }
    if (nameLower.includes("kim cương") || nameLower.includes("diamond") || level >= 4) {
      return {
        color: "#2563eb", // Xanh dương
        bgClass: "bg-blue-600",
        borderClass: "border-blue-600",
        textClass: "text-blue-600",
        icon: <ThunderboltOutlined className="text-4xl text-white" />,
        iconSm: <ThunderboltOutlined />,
        nameEn: "Diamond"
      };
    }
    // Mặc định (Standard / Cấp 0)
    return {
      color: "#9ca3af",
      bgClass: "bg-slate-400",
      borderClass: "border-slate-400",
      textClass: "text-slate-500",
      icon: <SafetyCertificateOutlined className="text-4xl text-white" />,
      iconSm: <SafetyCertificateOutlined />,
      nameEn: "Standard"
    };
  };

  const isLoading = profileStatus === "loading" || !vipTiers.length;

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spin size="large" tip="Đang tải thông tin hạng thành viên..." />
      </div>
    );
  }

  // Lấy tổng chi tiêu tích lũy thực tế từ BE
  const totalSpend = profile?.lifetimeValueVnd ?? 0;

  // Xác định hạng hiện tại của khách hàng dựa trên vipTierId hoặc minSpend
  let currentTier = vipTiers.find(t => t.id === profile?.vipTierId);
  if (!currentTier) {
    // Fallback: Tìm hạng cao nhất có minSpendVnd <= totalSpend
    const eligibleTiers = vipTiers.filter(t => t.minSpendVnd <= totalSpend);
    currentTier = eligibleTiers.length > 0 ? eligibleTiers[eligibleTiers.length - 1] : vipTiers[0];
  }

  // Xác định hạng tiếp theo
  const currentTierIndex = vipTiers.findIndex(t => t.id === currentTier?.id);
  const nextTier = currentTierIndex !== -1 && currentTierIndex < vipTiers.length - 1
    ? vipTiers[currentTierIndex + 1]
    : null;

  // Tính toán tiến trình thăng hạng (%)
  let progressPct = 0;
  let remainingSpend = 0;
  if (nextTier) {
    const startSpend = currentTier?.minSpendVnd ?? 0;
    const endSpend = nextTier.minSpendVnd;
    const spendInRange = totalSpend - startSpend;
    const rangeSize = endSpend - startSpend;
    progressPct = Math.max(0, Math.min(100, Math.round((spendInRange / rangeSize) * 100)));
    remainingSpend = endSpend - totalSpend;
  }



  // Dữ liệu cho bảng so sánh quyền lợi
  const comparisonColumns = [
    {
      title: "Quyền lợi",
      dataIndex: "benefit",
      key: "benefit",
      className: "font-semibold text-slate-700",
    },
    ...vipTiers.map(t => {
      const meta = getTierMeta(t.name, t.level);
      const activeColor = formatColor(t.colorHex, meta.color);
      return {
        title: (
          <div className="flex flex-col items-center justify-center py-1">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm mb-1"
              style={{ backgroundColor: activeColor }}
            >
              {meta.iconSm}
            </span>
            <span className="font-bold text-sm" style={{ color: activeColor }}>
              {t.name}
            </span>
          </div>
        ),
        dataIndex: t.id,
        key: t.id,
        align: "center" as const,
      };
    })
  ];

  const comparisonDataSource = [
    {
      key: "serviceFee",
      benefit: "Giảm phí dịch vụ mua hộ",
      ...vipTiers.reduce((acc, t) => {
        const discount = formatPct(t.serviceFeeDiscountPct);
        acc[t.id] = discount > 0 ? `${discount}%` : "—";
        return acc;
      }, {} as Record<string, string>)
    },
    {
      key: "freeInspection",
      benefit: "Miễn phí kiểm hàng",
      ...vipTiers.reduce((acc, t) => {
        acc[t.id] = t.freeInspection ? (
          <CheckCircleFilled className="text-emerald-500 text-lg" />
        ) : "—";
        return acc;
      }, {} as Record<string, any>)
    },
    {
      key: "freeStorage",
      benefit: "Số ngày lưu kho miễn phí",
      ...vipTiers.reduce((acc, t) => {
        acc[t.id] = t.freeStorageDays > 0 ? `${t.freeStorageDays} ngày` : "—";
        return acc;
      }, {} as Record<string, string>)
    },
    {
      key: "prioritySupport",
      benefit: "Hỗ trợ ưu tiên 24/7",
      ...vipTiers.reduce((acc, t) => {
        acc[t.id] = t.prioritySupport ? (
          <CheckCircleFilled className="text-emerald-500 text-lg" />
        ) : "—";
        return acc;
      }, {} as Record<string, any>)
    },
    {
      key: "cashback",
      benefit: "Tỷ lệ hoàn tiền chi tiêu",
      ...vipTiers.reduce((acc, t) => {
        const cashback = formatPct(t.cashbackPct);
        acc[t.id] = cashback > 0 ? `${cashback}%` : "—";
        return acc;
      }, {} as Record<string, string>)
    },
    {
      key: "depositOverride",
      benefit: "Tỷ lệ cọc tối thiểu đặc quyền",
      ...vipTiers.reduce((acc, t) => {
        const deposit = formatPct(t.depositPctOverride);
        acc[t.id] = t.depositPctOverride && deposit < 100
          ? `Chỉ ${deposit}%`
          : "Mặc định";
        return acc;
      }, {} as Record<string, string>)
    }
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 text-slate-800">
      {/* Nút quay lại trang Profile */}
      <div className="mb-6">
        <Link to="/profile">
          <Button icon={<LeftOutlined />} className="hover:text-red-500 hover:border-red-500 flex items-center transition-colors">
            Quay lại trang cá nhân
          </Button>
        </Link>
      </div>

      {/* ── HEADER BANNER ── */}
      <div className="relative mb-10 overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 to-red-500 px-8 py-14 text-center text-white shadow-xl shadow-red-100">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-xl"></div>
        <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-red-800/20 blur-xl"></div>

        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl mb-3">Hạng Thành Viên</h1>
        <p className="mx-auto max-w-xl text-sm md:text-base text-red-100/90 font-light">
          Tích lũy chi tiêu để nâng cấp hạng và nhận nhiều ưu đãi độc quyền hơn từ MuaHo Logistics.
        </p>
      </div>

      {/* ── CARD THÔNG TIN HẠNG HIỆN TẠI ── */}
      {currentTier && (
        <Card className="mb-10 rounded-2xl border border-slate-100 shadow-md shadow-slate-100/50 p-2">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

            {/* Cột trái: Tên hạng hiện tại */}
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-md transition-transform hover:scale-105"
                style={{ backgroundColor: formatColor(currentTier.colorHex, getTierMeta(currentTier.name, currentTier.level).color) }}
              >
                {getTierMeta(currentTier.name, currentTier.level).icon}
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium mb-0.5">Hạng hiện tại của bạn</p>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-extrabold text-slate-800 mb-0 leading-none">
                    {currentTier.name}
                  </h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wider">
                    {getTierMeta(currentTier.name, currentTier.level).nameEn}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-600 mt-2 mb-0">
                  Tổng chi tiêu tích lũy: <span className="font-bold text-red-600">{formatVND(totalSpend)}</span>
                </p>
              </div>
            </div>

            {/* Cột phải: Tiến độ nâng hạng */}
            {nextTier ? (
              <div className="flex-1 md:max-w-md">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
                  <span>Tiến độ lên hạng <span className="text-red-500 font-bold">{nextTier.name}</span></span>
                  <span className="text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded-full">{progressPct}%</span>
                </div>
                <Progress
                  percent={progressPct}
                  showInfo={false}
                  strokeColor="#ef4444"
                  trailColor="#f3f4f6"
                  strokeWidth={10}
                  className="mb-2"
                />
                <p className="text-xs text-slate-400 mb-0 font-medium text-right">
                  Còn <span className="font-bold text-slate-700">{formatVND(remainingSpend)}</span> nữa để lên hạng {nextTier.name}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-end">
                <Tag color="gold" className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-1">
                  Hạng Tối Cao
                </Tag>
                <p className="text-xs text-slate-400 mb-0 font-semibold">Bạn đã đạt hạng thành viên cao nhất!</p>
              </div>
            )}

          </div>
        </Card>
      )}

      {/* ── TIMELINE TIẾN TRÌNH HẠNG THÀNH VIÊN ── */}
      <div className="mb-14 px-4 overflow-x-auto">
        <div className="min-w-[600px] flex items-center justify-between relative py-6">
          {/* Thanh nối xám ở dưới */}
          <div className="absolute left-0 right-0 top-1/2 h-1 bg-slate-100 -translate-y-1/2 z-0 rounded-full"></div>

          {/* Thanh nối màu đỏ thể hiện tiến trình đã đi qua */}
          {currentTierIndex !== -1 && vipTiers.length > 1 && (
            <div
              className="absolute left-0 top-1/2 h-1 bg-gradient-to-r from-red-500 to-red-400 -translate-y-1/2 z-0 transition-all duration-500 rounded-full"
              style={{
                width: `${(currentTierIndex / (vipTiers.length - 1)) * 100 + (nextTier ? (progressPct / (vipTiers.length - 1)) : 0)}%`
              }}
            ></div>
          )}

          {/* Các mốc Hạng */}
          {vipTiers.map((t, idx) => {
            const meta = getTierMeta(t.name, t.level);
            const isPassed = idx <= currentTierIndex;
            const isCurrent = idx === currentTierIndex;
            const activeColor = formatColor(t.colorHex, meta.color);

            return (
              <div key={t.id} className="flex flex-col items-center z-10 relative">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-md transition-all duration-300 ${isCurrent ? "scale-110 ring-4 ring-white" : ""
                    }`}
                  style={{
                    backgroundColor: isPassed ? activeColor : "#e2e8f0",
                    border: isCurrent ? `2px solid ${activeColor}` : "none"
                  }}
                >
                  {meta.iconSm}
                </div>
                <span className={`text-sm font-bold mt-2 ${isPassed ? "text-slate-800" : "text-slate-400"}`}>
                  {t.name}
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  {formatShortVnd(t.minSpendVnd)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── DANH SÁCH THẺ VIP CHI TIẾT ── */}
      <h3 className="text-xl font-extrabold text-slate-800 mb-6 text-center">Các Đặc Quyền Hạng Thành Viên</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {vipTiers.map((t, idx) => {
          const meta = getTierMeta(t.name, t.level);
          const isCurrent = t.id === currentTier?.id;
          const isPassed = idx < currentTierIndex;
          const activeColor = formatColor(t.colorHex, meta.color);
          const nextRange = idx < vipTiers.length - 1 ? vipTiers[idx + 1].minSpendVnd : null;

          const discount = formatPct(t.serviceFeeDiscountPct);
          const cashback = formatPct(t.cashbackPct);
          const deposit = formatPct(t.depositPctOverride);

          // Các đặc quyền thực tế có trong DB của VIP Tier
          const privileges = [
            { label: `Giảm ${discount}% phí dịch vụ`, active: discount > 0 },
            { label: "Miễn phí kiểm hàng", active: t.freeInspection },
            { label: `${t.freeStorageDays} ngày lưu kho miễn phí`, active: t.freeStorageDays > 0 },
            { label: "Hỗ trợ ưu tiên 24/7", active: t.prioritySupport },
            { label: `Hoàn tiền ${cashback}% chi tiêu`, active: cashback > 0 },
            { label: `Đặt cọc chỉ từ ${deposit}%`, active: t.depositPctOverride !== undefined && deposit < 100 }
          ];

          return (
            <div
              key={t.id}
              className={`relative flex flex-col rounded-3xl border transition-all duration-300 overflow-hidden bg-white hover:shadow-xl ${isCurrent
                ? "border-red-500 shadow-lg shadow-red-50/50 scale-[1.02] z-10"
                : "border-slate-100 shadow-sm"
                }`}
            >
              {/* Nhãn tag đặc biệt trên đầu card */}
              {isCurrent && (
                <div className="absolute right-3 top-3 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  Hạng của bạn
                </div>
              )}
              {t.level === 2 && !isCurrent && (
                <div className="absolute right-3 top-3 bg-yellow-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  Phổ biến
                </div>
              )}

              {/* Phần header của thẻ VIP */}
              <div
                className="p-6 text-white text-center flex flex-col items-center justify-center"
                style={{ backgroundColor: activeColor }}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 shadow-inner mb-3">
                  {meta.icon}
                </div>
                <h4 className="text-lg font-black tracking-wide mb-1 leading-none">{t.name}</h4>
                <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest leading-none mb-3">
                  {meta.nameEn}
                </p>
                <div className="bg-white/20 text-white font-bold text-xs px-3 py-1 rounded-full border border-white/10 shadow-sm">
                  {formatRangeVnd(t.minSpendVnd, nextRange)}
                </div>
              </div>

              {/* Danh sách đặc quyền của thẻ */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <ul className="space-y-3 mb-6">
                  {privileges.map((p, pIdx) => (
                    <li
                      key={pIdx}
                      className={`flex items-start gap-2.5 text-xs font-semibold ${p.active ? "text-slate-700" : "text-slate-300"
                        }`}
                    >
                      <span className="flex items-center justify-center mt-0.5">
                        {p.active ? (
                          <CheckCircleFilled className="text-emerald-500 text-sm" />
                        ) : (
                          <LockOutlined className="text-slate-300 text-sm" />
                        )}
                      </span>
                      <span>{p.label}</span>
                    </li>
                  ))}
                </ul>

                {/* Nút trạng thái cuối card */}
                <div>
                  {isCurrent ? (
                    <Button
                      type="primary"
                      danger
                      block
                      size="large"
                      className="rounded-xl font-bold bg-red-500 border-red-500 shadow-md shadow-red-100"
                    >
                      ✓ Hạng hiện tại
                    </Button>
                  ) : isPassed ? (
                    <Button
                      block
                      disabled
                      size="large"
                      className="rounded-xl font-bold bg-emerald-50 text-emerald-600 border-emerald-100"
                    >
                      ✓ Đã đạt được
                    </Button>
                  ) : (
                    <Button
                      block
                      size="large"
                      className="rounded-xl font-bold border-slate-200 hover:border-red-500 hover:text-red-500 text-slate-500"
                      disabled
                    >
                      Chưa kích hoạt
                    </Button>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* ── BẢNG SO SÁNH QUYỀN LỢI CHI TIẾT ── */}
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-md shadow-slate-100/50">
        <h3 className="text-lg font-black text-slate-800 mb-4">So sánh quyền lợi chi tiết</h3>
        <Table
          columns={comparisonColumns}
          dataSource={comparisonDataSource}
          pagination={false}
          bordered
          className="vip-comparison-table border-slate-100 overflow-hidden rounded-2xl"
          rowClassName={() => "hover:bg-slate-50/50 transition-colors"}
        />
      </div>
    </div>
  );
}
