import { useEffect } from "react";
import { Link } from "react-router";
import { Spin, Table } from "antd";
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

  const vipTiers = [...vipTiersRaw].sort((a, b) => a.level - b.level);

  const getTierMeta = (tierName: string, level: number) => {
    const nameLower = (tierName || "").toLowerCase();

    // 1. Prioritize name matching first to prevent level overlaps
    if (nameLower.includes("đồng") || nameLower.includes("bronze")) {
      return { color: "#d97706" };
    }
    if (nameLower.includes("bạc") || nameLower.includes("silver")) {
      return { color: "#6b7280" };
    }
    if (nameLower.includes("vàng") || nameLower.includes("gold")) {
      return { color: "#ca8a04" };
    }
    if (nameLower.includes("kim cương") || nameLower.includes("diamond")) {
      return { color: "#2563eb" };
    }

    // 2. Fallback to level if name does not match
    if (level === 1) return { color: "#d97706" };
    if (level === 2) return { color: "#6b7280" };
    if (level === 3) return { color: "#ca8a04" };
    if (level >= 4) return { color: "#2563eb" };

    return { color: "#9ca3af" };
  };

  const isLoading = profileStatus === "loading" || !vipTiers.length;

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center bg-[#F7F6F3]">
        <Spin size="large" />
      </div>
    );
  }

  const totalSpend = profile?.lifetimeValueVnd ?? 0;

  let currentTier = vipTiers.find(t => t.id === profile?.vipTierId);
  if (!currentTier) {
    const eligibleTiers = vipTiers.filter(t => t.minSpendVnd <= totalSpend);
    currentTier = eligibleTiers.length > 0 ? eligibleTiers[eligibleTiers.length - 1] : vipTiers[0];
  }

  const currentTierIndex = vipTiers.findIndex(t => t.id === currentTier?.id);
  const nextTier = currentTierIndex !== -1 && currentTierIndex < vipTiers.length - 1
    ? vipTiers[currentTierIndex + 1]
    : null;

  let progressPct = 0;
  let remainingSpend = 0;
  if (nextTier) {
    const endSpend = nextTier.minSpendVnd;
    progressPct = endSpend > 0
      ? Math.max(0, Math.min(100, Math.round((totalSpend / endSpend) * 100)))
      : 0;
    remainingSpend = Math.max(0, endSpend - totalSpend);
  }

  const comparisonColumns = [
    {
      title: "Quyền lợi",
      dataIndex: "benefit",
      key: "benefit",
      className: "font-serif text-neutral-800",
    },
    ...vipTiers.map(t => {
      const meta = getTierMeta(t.name, t.level);
      const activeColor = formatColor(t.colorHex, meta.color);
      return {
        title: (
          <div className="flex flex-col items-center justify-center py-2">
            <span className="font-serif text-base text-neutral-900">
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
        acc[t.id] = t.freeInspection ? "✓" : "—";
        return acc;
      }, {} as Record<string, any>)
    },
    {
      key: "freeStorage",
      benefit: "Số ngày lưu kho",
      ...vipTiers.reduce((acc, t) => {
        acc[t.id] = t.freeStorageDays > 0 ? `${t.freeStorageDays} ngày` : "—";
        return acc;
      }, {} as Record<string, string>)
    },
    {
      key: "prioritySupport",
      benefit: "Hỗ trợ ưu tiên 24/7",
      ...vipTiers.reduce((acc, t) => {
        acc[t.id] = t.prioritySupport ? "✓" : "—";
        return acc;
      }, {} as Record<string, any>)
    },
    {
      key: "depositOverride",
      benefit: "Tỷ lệ cọc tối thiểu",
      ...vipTiers.reduce((acc, t) => {
        const deposit = formatPct(t.depositPctOverride);
        acc[t.id] = t.depositPctOverride && deposit < 100
          ? `${deposit}%`
          : "Mặc định";
        return acc;
      }, {} as Record<string, string>)
    }
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-24 text-neutral-900 bg-[#FFFFFF] min-h-screen">

      {/* ── BACK BUTTON ── */}
      <div className="mb-12">
        <Link to="/profile" className="inline-flex items-center text-sm font-mono uppercase tracking-widest text-neutral-400 hover:text-neutral-900 transition-colors">
          <span className="mr-2">←</span> Trang cá nhân
        </Link>
      </div>

      {/* ── EDITORIAL HEADER ── */}
      <div className="mb-20 pt-10 pb-12 text-center border-b border-[#EAEAEA]">
        <h1 className="text-5xl md:text-6xl font-serif tracking-tight text-neutral-900 mb-6">Hạng Thành Viên</h1>
        <p className="mx-auto max-w-xl text-sm md:text-base text-neutral-500 font-sans leading-relaxed">
          Nâng cấp thứ hạng tài khoản thông qua tích lũy chi tiêu để mở khóa các đặc quyền ưu đãi về phí dịch vụ mua hộ.
        </p>
      </div>

      {/* ── CURRENT STATUS BENTO ── */}
      {currentTier && (
        <div className="mb-24 rounded-xl border border-[#EAEAEA] bg-[#FBFBFA] p-8 md:p-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-10">
            {/* Left Col */}
            <div className="flex items-start gap-6">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg text-white font-serif text-2xl font-bold"
                style={{ backgroundColor: formatColor(currentTier.colorHex, getTierMeta(currentTier.name, currentTier.level).color) }}
              >
                {currentTier.name.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-neutral-400 mb-2">Hạng hiện tại</p>
                <div className="flex items-baseline gap-3 mb-2">
                  <h2 className="text-4xl font-serif text-neutral-900 leading-none">
                    {currentTier.name}
                  </h2>
                </div>
                <p className="text-sm text-neutral-500 mt-4">
                  Tổng chi tiêu: <span className="font-mono font-medium text-neutral-900">{formatVND(totalSpend)}</span>
                </p>
              </div>
            </div>

            {/* Right Col */}
            {nextTier ? (
              <div className="flex-1 md:max-w-md bg-white p-6 rounded-lg border border-[#EAEAEA]">
                <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-neutral-500 mb-4">
                  <span>Tiến độ lên hạng {nextTier.name}</span>
                  <span className="font-bold text-neutral-900">{progressPct}%</span>
                </div>
                {/* Minimalist Progress Bar */}
                <div className="w-full bg-[#EAEAEA] h-1 rounded-full overflow-hidden mb-4">
                  <div className="bg-neutral-900 h-full transition-all duration-700 ease-out" style={{ width: `${progressPct}%` }}></div>
                </div>
                <p className="text-xs text-neutral-500 font-sans mb-0">
                  Cần thêm <span className="font-mono font-medium text-neutral-900">{formatVND(remainingSpend)}</span>
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-end">
                <span className="text-[10px] bg-[#FBF3DB] text-[#956400] font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-2 border border-[#EAEAEA]">
                  Tối cao
                </span>
                <p className="text-sm text-neutral-500 font-sans">Bạn đã đạt hạng cao nhất.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MINIMAL TIMELINE ── */}
      <div className="mb-24 px-4 overflow-x-auto">
        <div className="min-w-[600px] flex items-center justify-between relative py-6">
          {/* Background track */}
          <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-[#EAEAEA] -translate-y-1/2 z-0"></div>

          {/* Per-segment progress lines */}
          {vipTiers.length > 1 && vipTiers.map((_, idx) => {
            if (idx >= vipTiers.length - 1) return null; // no segment after last tier
            const segLeft = (idx / (vipTiers.length - 1)) * 100;
            const segWidth = (1 / (vipTiers.length - 1)) * 100;

            const startSpend = vipTiers[idx].minSpendVnd;
            const endSpend = vipTiers[idx + 1].minSpendVnd;
            const range = endSpend - startSpend;

            let fillPct = 0;
            if (totalSpend >= endSpend) {
              fillPct = 100;
            } else if (totalSpend > startSpend && range > 0) {
              fillPct = Math.max(0, Math.min(100, ((totalSpend - startSpend) / range) * 100));
            }

            if (fillPct <= 0) return null;

            return (
              <div
                key={`seg-${idx}`}
                className="absolute top-1/2 h-[1px] bg-neutral-900 -translate-y-1/2 z-0 transition-all duration-500"
                style={{
                  left: `${segLeft}%`,
                  width: `${segWidth * (fillPct / 100)}%`,
                }}
              />
            );
          })}

          {vipTiers.map((t, idx) => {
            const isPassed = idx <= currentTierIndex;
            const isCurrent = idx === currentTierIndex;

            return (
              <div key={t.id} className="flex flex-col items-center z-10 relative group">
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded-full transition-all duration-300 ${isCurrent ? "ring-2 ring-offset-4 ring-neutral-900 scale-125" : ""}`}
                  style={{
                    backgroundColor: isPassed ? "#111111" : "#FFFFFF",
                    border: isPassed ? "none" : "1px solid #EAEAEA"
                  }}
                />
                <span className={`text-xs font-mono uppercase tracking-widest mt-6 mb-1 ${isPassed ? "text-neutral-900" : "text-neutral-400"}`}>
                  {t.name}
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {formatShortVnd(t.minSpendVnd)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── BENTO PRIVILEGES ── */}
      <h3 className="text-3xl font-serif text-neutral-900 mb-10 text-center">Đặc Quyền Từng Hạng</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
        {vipTiers.map((t, idx) => {
          const meta = getTierMeta(t.name, t.level);
          const isCurrent = t.id === currentTier?.id;
          const isPassed = idx < currentTierIndex;
          const activeColor = formatColor(t.colorHex, meta.color);
          const nextRange = idx < vipTiers.length - 1 ? vipTiers[idx + 1].minSpendVnd : null;

          const discount = formatPct(t.serviceFeeDiscountPct);
          const deposit = formatPct(t.depositPctOverride);

          const privileges = [
            { label: `Giảm ${discount}% phí dịch vụ`, active: discount > 0 },
            { label: "Miễn phí kiểm hàng", active: t.freeInspection },
            { label: `${t.freeStorageDays} ngày lưu kho`, active: t.freeStorageDays > 0 },
            { label: "Hỗ trợ ưu tiên 24/7", active: t.prioritySupport },
            { label: `Cọc từ ${deposit}%`, active: t.depositPctOverride !== undefined && deposit < 100 }
          ];

          return (
            <div
              key={t.id}
              className={`relative flex flex-col rounded-xl border bg-white transition-all duration-300 ${isCurrent ? "border-neutral-900" : "border-[#EAEAEA]"}`}
            >
              {isCurrent && (
                <div className="absolute right-4 top-4 bg-[#EDF3EC] text-[#346538] text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-widest border border-[#EAEAEA]">
                  Hiện tại
                </div>
              )}

              <div className="p-8 border-b border-[#EAEAEA]">
                <div className="flex h-10 w-10 items-center justify-center rounded text-white mb-6 font-serif font-bold text-xl" style={{ backgroundColor: activeColor }}>
                  {t.name.charAt(0)}
                </div>
                <h4 className="text-xl font-serif text-neutral-900 mb-4">{t.name}</h4>
                <div className="text-xs font-mono text-neutral-500">
                  {formatRangeVnd(t.minSpendVnd, nextRange)}
                </div>
              </div>

              <div className="p-8 flex-1 flex flex-col justify-between bg-[#FBFBFA] rounded-b-xl">
                <ul className="space-y-4 mb-10">
                  {privileges.map((p, pIdx) => (
                    <li key={pIdx} className="flex items-start gap-3 text-sm text-neutral-600">
                      <span className="mt-0.5">
                        {p.active ? (
                          <div className="w-4 h-4 rounded-sm bg-[#EDF3EC] text-[#346538] flex items-center justify-center text-[10px] border border-[#EAEAEA]">✓</div>
                        ) : (
                          <div className="w-4 h-4 rounded-sm bg-[#EAEAEA] text-transparent flex items-center justify-center text-[10px]">−</div>
                        )}
                      </span>
                      <span className={p.active ? "text-neutral-800" : "text-neutral-400"}>{p.label}</span>
                    </li>
                  ))}
                </ul>

                <div>
                  {isCurrent ? (
                    <div className="w-full text-center py-3 rounded text-white text-[10px] font-mono font-bold uppercase tracking-widest bg-neutral-900">
                      Đang sử dụng
                    </div>
                  ) : isPassed ? (
                    <div className="w-full text-center py-3 rounded text-neutral-400 text-[10px] font-mono font-bold uppercase tracking-widest bg-[#F7F6F3] border border-[#EAEAEA]">
                      Đã vượt qua
                    </div>
                  ) : (
                    <div className="w-full text-center py-3 rounded text-neutral-400 text-[10px] font-mono font-bold uppercase tracking-widest bg-white border border-[#EAEAEA]">
                      Chưa đạt
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── BẢNG SO SÁNH QUYỀN LỢI CHI TIẾT ── */}
      <div className="rounded-xl border border-[#EAEAEA] bg-white p-8 md:p-12 mb-24">
        <h3 className="text-3xl font-serif text-neutral-900 mb-10 text-center">So Sánh Chi Tiết</h3>
        <div className="overflow-x-auto">
          <Table
            columns={comparisonColumns}
            dataSource={comparisonDataSource}
            pagination={false}
          />
        </div>
      </div>
    </div>
  );
}
