import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router";
import { formatColor } from "~/lib/utils/format";
import { Skeleton, SkeletonPanel } from "~/components/shared/Skeleton";
import {
  Camera,
  CaretRight,
  Crown,
  IdentificationCard,
  Lightning,
  ShieldCheck,
  Star,
  User,
} from "~/components/shared/icons";
import { GENDER_LABELS } from "~/lib/constants/finance";
import { useProfileForm } from "~/components/customer/profile/useProfileForm";
import { AccountTab } from "~/components/customer/profile/AccountTab";
import { KycTab } from "~/components/customer/profile/KycTab";

/* ── Scroll Reveal Hook (IntersectionObserver) ── */
function useScrollReveal(deps: any[] = []) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Small delay to let React finish rendering new tab content
    const timer = setTimeout(() => {
      const targets = container.querySelectorAll(
        ".reveal-hidden:not(.reveal-visible)"
      );
      if (targets.length === 0) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("reveal-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.05, rootMargin: "0px 0px -60px 0px" }
      );

      targets.forEach((el) => observer.observe(el));

      // Cleanup observer on effect teardown
      return () => observer.disconnect();
    }, 50);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return containerRef;
}

function ProfilePageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="md:col-span-1 p-6 flex flex-col items-center justify-center bg-white border border-slate-200/70 rounded-xl space-y-4">
          <Skeleton className="w-28 h-28 rounded-full" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-40 rounded-full" />
        </div>
        <div className="md:col-span-2 p-6 flex flex-col justify-center bg-white border border-slate-200/70 rounded-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col py-2 border-b border-gray-100/70 space-y-2"
              >
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-40" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mb-8 flex gap-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8">
          <SkeletonPanel rows={8} cols={1} />
        </div>
      </div>
    </div>
  );
}

export default function CustomerProfilePage() {
  const form = useProfileForm();
  const {
    profile,
    status,
    addresses,
    user,
    vipTiers,
    avatarInputRef,
    isUploadingAvatar,
    handleAvatarSelect,
  } = form;

  // Global Page Tabs — declare early so scrollRef can depend on it
  const [activePageTab, setActivePageTab] = useState<"account" | "kyc">(
    "account"
  );

  const scrollRef = useScrollReveal([activePageTab, status]);

  // VIP Tier display config
  const getTierIcon = (level: number, tierName: string) => {
    const nameLower = tierName.toLowerCase();
    if (
      nameLower.includes("đồng") ||
      nameLower.includes("bronze") ||
      level === 1
    ) {
      return <ShieldCheck />;
    }
    if (
      nameLower.includes("bạc") ||
      nameLower.includes("silver") ||
      level === 2
    ) {
      return <Star />;
    }
    if (
      nameLower.includes("vàng") ||
      nameLower.includes("gold") ||
      level === 3
    ) {
      return <Crown />;
    }
    if (
      nameLower.includes("kim cương") ||
      nameLower.includes("diamond") ||
      level >= 4
    ) {
      return <Lightning />;
    }
    return <ShieldCheck />;
  };

  const currentTier =
    vipTiers.find((t) => t.id === profile?.vipTierId) ||
    (vipTiers.length > 0
      ? [...vipTiers].sort((a, b) => a.level - b.level)[0]
      : null);
  const currentTierName = currentTier?.name || "";
  const tierColor = formatColor(currentTier?.colorHex, "#2F3437");
  const tierIcon = currentTier ? (
    getTierIcon(currentTier.level, currentTier.name)
  ) : (
    <Crown />
  );

  // Formatting helpers
  const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];
  const addressString = defaultAddress
    ? [
        defaultAddress.addressLine,
        defaultAddress.wardCode,
        defaultAddress.districtCode,
        defaultAddress.provinceCode,
      ]
        .filter(Boolean)
        .join(", ")
    : "Chưa cập nhật địa chỉ";

  const formatVnd = (val: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(val);

  return (
    <div
      ref={scrollRef}
      className="min-h-screen py-12 px-6 sm:px-8"
      style={{ backgroundColor: "var(--mu-canvas)" }}
    >
      {!profile ? (
        <ProfilePageSkeleton />
      ) : (
        <div className="mx-auto max-w-5xl">
          {/* ── SECTION 1: Profile Asymmetric Header ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* Card 1: Avatar + VIP Badge */}
            <div
              className="reveal-hidden md:col-span-1 p-6 flex flex-col items-center justify-center bg-white transition-shadow duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
              style={{
                border: "1px solid var(--mu-border)",
                borderRadius: "12px",
                transitionDelay: "50ms",
              }}
            >
              {/* Circular Avatar */}
              <div className="relative w-28 h-28 mb-4">
                <div
                  className="w-full h-full rounded-full flex items-center justify-center overflow-hidden relative group border bg-gray-50 cursor-pointer"
                  style={{ borderColor: "var(--mu-border)" }}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400 font-mono text-sm text-center leading-tight">
                      NO IMAGE
                    </span>
                  )}
                  {isUploadingAvatar ? (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-20">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="text-white text-lg" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-black text-white p-1.5 rounded-full shadow hover:bg-gray-800 transition flex items-center justify-center z-10 border border-white cursor-pointer w-7 h-7"
                >
                  <Camera className="text-sm" />
                </button>
                <input
                  type="file"
                  accept="image/jpeg, image/png, image/webp"
                  className="hidden"
                  ref={avatarInputRef}
                  onChange={handleAvatarSelect}
                />
              </div>

              {/* User Meta info */}
              <div className="text-center w-full">
                <h2
                  className="text-lg font-bold uppercase tracking-tight mb-0.5 truncate"
                  style={{ color: "var(--mu-text)" }}
                >
                  {user?.fullName ||
                    user?.email?.split("@")[0] ||
                    "KHÁCH HÀNG"}
                </h2>
                <span
                  className="text-sm font-mono uppercase tracking-wider block mb-4"
                  style={{ color: "var(--mu-text-secondary)" }}
                >
                  {user?.roles?.length ? user.roles.join(", ") : "Customer"}
                </span>

                {/* VIP Tier Badge */}
                {profile && currentTierName && (
                  <div className="px-1 max-w-[190px] mx-auto">
                    <Link
                      to="/vip-tier"
                      className="relative flex items-center rounded-full pl-1 pr-3 py-1 overflow-hidden transition-all duration-200 group hover:scale-[1.01] active:scale-[0.99] w-full border"
                      style={{
                        background: `${tierColor}08`,
                        borderColor: `${tierColor}30`,
                      }}
                    >
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${tierColor}, ${tierColor}cc)`,
                        }}
                      >
                        <span className="text-sm flex items-center justify-center">
                          {tierIcon}
                        </span>
                      </div>
                      <span className="flex-1 text-center text-base font-semibold text-gray-800 tracking-wide pr-1">
                        {currentTierName}
                      </span>
                      <CaretRight
                        className="shrink-0 text-sm transition-transform duration-200 group-hover:translate-x-0.5"
                        style={{ color: tierColor }}
                      />
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Account Metadata Grid */}
            <div
              className="reveal-hidden md:col-span-2 p-6 flex flex-col justify-center bg-white transition-shadow duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
              style={{
                border: "1px solid var(--mu-border)",
                borderRadius: "12px",
                transitionDelay: "150ms",
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div className="flex flex-col py-2 border-b border-gray-100/70">
                  <span className="font-mono text-sm uppercase tracking-wider text-gray-400 mb-1">
                    Giới tính
                  </span>
                  <span className="font-medium text-black">
                    {profile?.gender !== undefined
                      ? GENDER_LABELS[
                          profile.gender as unknown as keyof typeof GENDER_LABELS
                        ]
                      : "Chưa cập nhật"}
                  </span>
                </div>

                <div className="flex flex-col py-2 border-b border-gray-100/70">
                  <span className="font-mono text-sm uppercase tracking-wider text-gray-400 mb-1">
                    Số điện thoại
                  </span>
                  <span className="font-medium text-black">
                    {user?.phone || "Chưa cập nhật"}
                  </span>
                </div>

                <div className="flex flex-col py-2 border-b border-gray-100/70">
                  <span className="font-mono text-sm uppercase tracking-wider text-gray-400 mb-1">
                    Địa chỉ Email
                  </span>
                  <span
                    className="font-medium text-black truncate"
                    title={user?.email}
                  >
                    {user?.email || "Chưa cập nhật"}
                  </span>
                </div>

                <div className="flex flex-col py-2 border-b border-gray-100/70">
                  <span className="font-mono text-sm uppercase tracking-wider text-gray-400 mb-1">
                    Địa chỉ mặc định
                  </span>
                  <span
                    className="font-medium text-black truncate"
                    title={addressString}
                  >
                    {addressString}
                  </span>
                </div>

                <div className="flex flex-col py-2 border-b sm:border-none border-gray-100/70">
                  <span className="font-mono text-sm uppercase tracking-wider text-gray-400 mb-1">
                    Tổng tiền đã thanh toán
                  </span>
                  <span className="font-serif font-bold text-red-600 text-sm">
                    {formatVnd(profile?.lifetimeValueVnd || 0)}
                  </span>
                </div>

                <div className="flex flex-col py-2">
                  <span className="font-mono text-sm uppercase tracking-wider text-gray-400 mb-1">
                    Mã khách hàng
                  </span>
                  <span className="font-mono font-semibold text-black">
                    {profile?.customerCode || "Chưa tạo"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Tabs Segmented Header ── */}
          <div className="reveal-hidden border-b border-[#EAEAEA] mb-8">
            <div className="flex gap-6 text-sm">
              <button
                onClick={() => setActivePageTab("account")}
                className={`pb-3 border-b-2 font-semibold transition-all flex items-center gap-2 ${
                  activePageTab === "account"
                    ? "border-black text-black"
                    : "border-transparent text-gray-400 hover:text-black"
                }`}
              >
                <User className="text-base" />
                Thông tin tài khoản
              </button>
              <button
                onClick={() => setActivePageTab("kyc")}
                className={`pb-3 border-b-2 font-semibold transition-all flex items-center gap-2 ${
                  activePageTab === "kyc"
                    ? "border-black text-black"
                    : "border-transparent text-gray-400 hover:text-black"
                }`}
              >
                <IdentificationCard className="text-base" />
                Xác minh danh tính (KYC)
              </button>
            </div>
          </div>

          {/* ── TAB PAGE CONTENT ── */}
          {activePageTab === "account" ? (
            <AccountTab {...form} />
          ) : (
            <KycTab {...form} />
          )}
        </div>
      )}
    </div>
  );
}
