import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router";
import { message } from "antd";
import dayjs from "dayjs";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import {
  fetchMyProfile,
  updateProfile,
  createMyProfile,
  fetchKyc,
  submitKyc,
  fetchMyAddresses,
} from "~/lib/feature/customerProfile/customerProfileThunk";
import { fetchVipTiers } from "~/lib/feature/adminFinance/adminFinanceThunk";
import { updateUserLocal } from "~/lib/feature/auth/authSlice";
import {
  selectProfile,
  selectKyc,
  selectProfileStatus,
  selectAddresses,
} from "~/lib/feature/customerProfile/customerProfileSelector";
import { selectVipTiers } from "~/lib/feature/adminFinance/adminFinanceSelector";
import { formatColor } from "~/lib/utils/format";
import { customerProfileApi } from "~/lib/api/customerProfile";
import { financeApi } from "~/lib/api/finance";
import { authApi } from "~/lib/api/auth";
import { PreferredChannel, KycStatus, Gender } from "~/lib/enums/finance";
import {
  GENDER_LABELS,
  PREFERRED_CHANNEL_LABELS,
} from "~/lib/constants/finance";
import { VIETNAM_BANKS } from "~/lib/constants/banks";
import type { UpdateKycFromOcrRequest } from "~/lib/types/customerProfile";

import {
  PiCameraBold,
  PiUploadSimpleBold,
  PiFloppyDiskBold,
  PiTrashBold,
  PiPlusBold,
  PiCrownBold,
  PiShieldCheckBold,
  PiStarBold,
  PiLightningBold,
  PiCaretRightBold,
  PiUserBold,
  PiEnvelopeBold,
  PiPhoneBold,
  PiMapPinBold,
  PiWarningBold,
  PiInfoBold,
  PiClockBold,
  PiBankBold,
  PiGenderIntersexBold,
  PiIdentificationCardBold,
  PiGlobeBold
} from "react-icons/pi";

/* ── Scroll Reveal Hook (IntersectionObserver) ── */
function useScrollReveal(deps: any[] = []) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Small delay to let React finish rendering new tab content
    const timer = setTimeout(() => {
      const targets = container.querySelectorAll(".reveal-hidden:not(.reveal-visible)");
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

export default function CustomerProfilePage() {
  const dispatch = useAppDispatch();
  const profile = useAppSelector(selectProfile);
  const kyc = useAppSelector(selectKyc);
  const status = useAppSelector(selectProfileStatus);
  const addresses = useAppSelector(selectAddresses);
  const user = useAppSelector((state: any) => state.authState.user);
  const vipTiers = useAppSelector(selectVipTiers);

  // Global Page Tabs — declare early so scrollRef can depend on it
  const [activePageTab, setActivePageTab] = useState<"account" | "kyc">("account");

  const scrollRef = useScrollReveal([activePageTab]);

  // VIP Tier display config
  const getTierIcon = (level: number, tierName: string) => {
    const nameLower = tierName.toLowerCase();
    if (nameLower.includes("đồng") || nameLower.includes("bronze") || level === 1) {
      return <PiShieldCheckBold />;
    }
    if (nameLower.includes("bạc") || nameLower.includes("silver") || level === 2) {
      return <PiStarBold />;
    }
    if (nameLower.includes("vàng") || nameLower.includes("gold") || level === 3) {
      return <PiCrownBold />;
    }
    if (nameLower.includes("kim cương") || nameLower.includes("diamond") || level >= 4) {
      return <PiLightningBold />;
    }
    return <PiShieldCheckBold />;
  };

  const currentTier =
    vipTiers.find((t) => t.id === profile?.vipTierId) ||
    (vipTiers.length > 0 ? [...vipTiers].sort((a, b) => a.level - b.level)[0] : null);
  const currentTierName = currentTier?.name || "";
  const tierColor = formatColor(currentTier?.colorHex, "#2F3437");
  const tierIcon = currentTier ? getTierIcon(currentTier.level, currentTier.name) : <PiCrownBold />;



  // Personal Info Form State
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<number | "">("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [preferredChannel, setPreferredChannel] = useState<number>(PreferredChannel.App);
  const [zaloUserId, setZaloUserId] = useState("");
  const [personalValidationError, setPersonalValidationError] = useState<string | null>(null);
  const [isUpdatingPersonal, setIsUpdatingPersonal] = useState(false);

  // Contact Info Form State
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactValidationError, setContactValidationError] = useState<string | null>(null);
  const [isUpdatingContact, setIsUpdatingContact] = useState(false);

  // Bank Form State
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankCode, setBankCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branch, setBranch] = useState("");
  const [bankValidationError, setBankValidationError] = useState<string | null>(null);
  const [isAddingBank, setIsAddingBank] = useState(false);

  // KYC File upload & OCR states
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreviewUrl, setFrontPreviewUrl] = useState<string | null>(null);
  const [backPreviewUrl, setBackPreviewUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [ocrData, setOcrData] = useState<UpdateKycFromOcrRequest | null>(null);

  // OCR Form edits
  const [ocrFullName, setOcrFullName] = useState("");
  const [ocrDob, setOcrDob] = useState("");
  const [ocrGender, setOcrGender] = useState("");
  const [ocrNationality, setOcrNationality] = useState("");
  const [ocrOrigin, setOcrOrigin] = useState("");
  const [ocrResidence, setOcrResidence] = useState("");
  const [kycValidationError, setKycValidationError] = useState<string | null>(null);
  const [isSubmittingKyc, setIsSubmittingKyc] = useState(false);

  const fetchBanks = async () => {
    setLoadingBanks(true);
    try {
      const res = await financeApi.getMyBankAccounts();
      if (res.data) {
        setBankAccounts(res.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingBanks(false);
    }
  };

  useEffect(() => {
    dispatch(fetchMyProfile());
    dispatch(fetchKyc());
    dispatch(fetchMyAddresses());
    dispatch(fetchVipTiers());
    fetchBanks();
  }, [dispatch]);

  // Synchronize profile data into personal form fields
  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || "");
      setGender(profile.gender !== undefined ? profile.gender : "");
      setDateOfBirth(profile.dateOfBirth ? dayjs(profile.dateOfBirth).format("YYYY-MM-DD") : "");
      setPreferredChannel(profile.preferredChannel ?? PreferredChannel.App);
      setZaloUserId(profile.zaloUserId || "");
    }
  }, [profile]);

  // Synchronize user authentication data into contact form fields
  useEffect(() => {
    if (user) {
      setPhone(user.phone || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleUpdate = async (payload: any) => {
    try {
      setIsUpdatingPersonal(true);
      if (profile?.id) {
        await dispatch(updateProfile({ id: profile.id, data: payload })).unwrap();
        if (payload.phone !== undefined || payload.email !== undefined) {
          dispatch(updateUserLocal({ phone: payload.phone, email: payload.email }));
        }
        dispatch(fetchMyProfile());
        message.success("Cập nhật thông tin thành công");
      } else {
        await dispatch(
          createMyProfile({ ...payload, customerCode: `CUST-${Date.now()}` })
        ).unwrap();
        if (payload.phone !== undefined || payload.email !== undefined) {
          dispatch(updateUserLocal({ phone: payload.phone, email: payload.email }));
        }
        dispatch(fetchMyProfile());
        message.success("Tạo thông tin thành công");
      }
    } catch (error: any) {
      message.error(error || "Lỗi cập nhật thông tin");
    } finally {
      setIsUpdatingPersonal(false);
    }
  };

  const onPersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.length > 255) {
      setPersonalValidationError("Họ tên không được vượt quá 255 ký tự");
      return;
    }
    if (zaloUserId.length > 100) {
      setPersonalValidationError("Zalo User ID không được vượt quá 100 ký tự");
      return;
    }

    setPersonalValidationError(null);
    const payload = {
      fullName,
      gender: gender !== "" ? Number(gender) : undefined,
      dateOfBirth: dateOfBirth ? `${dateOfBirth}T00:00:00Z` : undefined,
      preferredChannel,
      zaloUserId: zaloUserId || undefined
    };
    await handleUpdate(payload);
  };

  const onContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      setContactValidationError("Số điện thoại là bắt buộc");
      return;
    }
    if (phone.length > 20) {
      setContactValidationError("Số điện thoại không được vượt quá 20 ký tự");
      return;
    }
    const phoneRegex = /^[0-9+\-\s]+$/;
    if (!phoneRegex.test(phone)) {
      setContactValidationError("Số điện thoại không hợp lệ");
      return;
    }

    setContactValidationError(null);
    try {
      setIsUpdatingContact(true);
      const name = fullName || profile?.fullName || user?.fullName || "Khách hàng";
      await authApi.updateMe({ fullName: name, phone });
      dispatch(updateUserLocal({ phone }));
      message.success("Cập nhật thông tin liên hệ thành công");
    } catch (error: any) {
      message.error(error?.message || "Lỗi cập nhật thông tin liên hệ");
    } finally {
      setIsUpdatingContact(false);
    }
  };

  const onBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankCode) {
      setBankValidationError("Vui lòng chọn ngân hàng");
      return;
    }
    if (!accountHolder) {
      setBankValidationError("Vui lòng nhập tên chủ tài khoản");
      return;
    }
    if (accountHolder.length > 255) {
      setBankValidationError("Tên chủ tài khoản quá dài (tối đa 255 ký tự)");
      return;
    }
    if (!accountNumber) {
      setBankValidationError("Vui lòng nhập số tài khoản");
      return;
    }
    if (accountNumber.length > 50) {
      setBankValidationError("Số tài khoản quá dài (tối đa 50 ký tự)");
      return;
    }
    if (branch.length > 255) {
      setBankValidationError("Chi nhánh quá dài (tối đa 255 ký tự)");
      return;
    }

    setBankValidationError(null);
    const selectedBank = VIETNAM_BANKS.find((b) => b.code === bankCode);
    const nameOfBank = selectedBank ? selectedBank.shortName : bankCode;

    try {
      setIsAddingBank(true);
      await financeApi.createBankAccount({
        bankCode,
        bankName: nameOfBank,
        accountHolder: accountHolder.toUpperCase(),
        accountNumber,
        branch: branch || undefined
      });
      message.success("Thêm tài khoản ngân hàng thành công");
      // Reset bank form
      setBankCode("");
      setBankName("");
      setAccountHolder("");
      setAccountNumber("");
      setBranch("");
      setShowBankForm(false);
      fetchBanks();
    } catch (err: any) {
      message.error(err?.message || "Lỗi khi thêm ngân hàng");
    } finally {
      setIsAddingBank(false);
    }
  };

  const handleDeleteBank = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa tài khoản ngân hàng này không?")) {
      return;
    }
    try {
      await financeApi.deleteBankAccount(id);
      message.success("Đã xóa tài khoản ngân hàng");
      fetchBanks();
    } catch (err: any) {
      message.error(err?.message || "Lỗi khi xóa ngân hàng");
    }
  };

  // CCCD OCR Upload & Processing
  const handleFrontFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFrontFile(file);
      setFrontPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleBackFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBackFile(file);
      setBackPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleScan = async () => {
    if (!frontFile) {
      message.error("Vui lòng tải lên ảnh mặt trước CCCD");
      return;
    }
    setScanning(true);
    try {
      const res = await customerProfileApi.scanCccd(frontFile, backFile || undefined);
      if (res.data) {
        const { rawText, message: msg, customerId, expiryDate, ...parsed } = res.data;
        setOcrData(parsed);

        // Prepopulate ocr edit states
        setOcrFullName(parsed.fullNameOnId || "");
        setOcrDob(parsed.dateOfBirthOnId ? dayjs(parsed.dateOfBirthOnId).format("YYYY-MM-DD") : "");
        setOcrGender(parsed.gender || "");
        setOcrNationality(parsed.nationality || "");
        setOcrOrigin(parsed.placeOfOrigin || "");
        setOcrResidence(parsed.placeOfResidence || "");

        message.success("Quét CCCD thành công. Vui lòng kiểm tra lại thông tin!");
      }
    } catch (err: any) {
      message.error(err?.message || "Lỗi quét CCCD");
    } finally {
      setScanning(false);
    }
  };

  const onKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ocrData) return;

    if (!ocrFullName) {
      setKycValidationError("Họ tên trên giấy tờ là bắt buộc");
      return;
    }
    if (ocrFullName.length > 255) {
      setKycValidationError("Họ tên không được vượt quá 255 ký tự");
      return;
    }
    if (!ocrDob) {
      setKycValidationError("Ngày sinh trên giấy tờ là bắt buộc");
      return;
    }

    setKycValidationError(null);
    const payload: UpdateKycFromOcrRequest = {
      ...ocrData,
      fullNameOnId: ocrFullName,
      dateOfBirthOnId: ocrDob ? `${ocrDob}T00:00:00Z` : undefined,
      gender: ocrGender || undefined,
      nationality: ocrNationality || undefined,
      placeOfOrigin: ocrOrigin || undefined,
      placeOfResidence: ocrResidence || undefined
    };

    try {
      setIsSubmittingKyc(true);
      await dispatch(submitKyc(payload)).unwrap();
      message.success("Gửi hồ sơ KYC thành công");
      dispatch(fetchKyc());
      setOcrData(null);
      setFrontFile(null);
      setBackFile(null);
      setFrontPreviewUrl(null);
      setBackPreviewUrl(null);
    } catch (err: any) {
      message.error(err || "Lỗi gửi hồ sơ KYC");
    } finally {
      setIsSubmittingKyc(false);
    }
  };

  // Parse KYC status styles
  const kycStatusStr = kyc?.status?.toString() || "";
  const isPendingOrApproved =
    kycStatusStr === "Pending" ||
    kycStatusStr === KycStatus.Pending.toString() ||
    kycStatusStr === "Approved" ||
    kycStatusStr === KycStatus.Approved.toString();

  const isRejected =
    kycStatusStr === "Rejected" ||
    kycStatusStr === KycStatus.Rejected.toString();

  let kycAlertMsg = "Trạng thái xác minh CCCD: Chờ duyệt";
  let kycAlertColorClass = "border-[#F8E3A1] bg-[#FBF3DB] text-[#956400]";

  if (kycStatusStr === "Approved" || kycStatusStr === KycStatus.Approved.toString()) {
    kycAlertMsg = "Tài khoản của bạn đã được xác minh danh tính thành công.";
    kycAlertColorClass = "border-[#D1E7DD] bg-[#EDF3EC] text-[#346538]";
  } else if (isRejected) {
    kycAlertMsg = "Hồ sơ xác minh CCCD của bạn đã bị từ chối.";
    kycAlertColorClass = "border-[#F5C2C7] bg-[#FDEBEC] text-[#9F2F2D]";
  }

  // Formatting helpers
  const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];
  const addressString = defaultAddress
    ? [
      defaultAddress.addressLine,
      defaultAddress.wardCode,
      defaultAddress.districtCode,
      defaultAddress.provinceCode
    ]
      .filter(Boolean)
      .join(", ")
    : "Chưa cập nhật địa chỉ";

  const formatVnd = (val: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

  return (
    <div
      ref={scrollRef}
      className="min-h-screen py-12 px-6 sm:px-8"
      style={{ backgroundColor: "var(--mu-canvas)" }}
    >
      <div className="mx-auto max-w-5xl">
        {/* ── SECTION 1: Profile Asymmetric Header ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Card 1: Avatar + VIP Badge */}
          <div
            className="reveal-hidden md:col-span-1 p-6 flex flex-col items-center justify-center bg-white transition-shadow duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
            style={{
              border: "1px solid var(--mu-border)",
              borderRadius: "12px",
              transitionDelay: "50ms"
            }}
          >
            {/* Circular Avatar */}
            <div className="relative w-28 h-28 mb-4">
              <div
                className="w-full h-full rounded-full flex items-center justify-center overflow-hidden relative group border bg-gray-50"
                style={{ borderColor: "var(--mu-border)" }}
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-400 font-mono text-sm text-center leading-tight">
                    NO IMAGE
                  </span>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <PiCameraBold className="text-white text-lg" />
                </div>
              </div>
              <button
                type="button"
                className="absolute bottom-0 right-0 bg-black text-white p-1.5 rounded-full shadow hover:bg-gray-800 transition flex items-center justify-center z-10 border border-white cursor-pointer w-7 h-7"
              >
                <PiCameraBold className="text-sm" />
              </button>
            </div>

            {/* User Meta info */}
            <div className="text-center w-full">
              <h2
                className="text-lg font-bold uppercase tracking-tight mb-0.5 truncate"
                style={{ color: "var(--mu-text)" }}
              >
                {user?.fullName || user?.email?.split("@")[0] || "KHÁCH HÀNG"}
              </h2>
              <span className="text-sm font-mono uppercase tracking-wider block mb-4" style={{ color: "var(--mu-text-secondary)" }}>
                {user?.roles?.length ? user.roles.join(", ") : "Customer"}
              </span>

              {/* VIP Tier Badge */}
              {profile && currentTierName && (
                <div className="px-1 max-w-[190px] mx-auto">
                  <Link
                    to="/vip-tier"
                    className="relative flex items-center justify-between rounded-full pl-1 pr-3 py-1 overflow-hidden transition-all duration-200 group hover:scale-[1.01] active:scale-[0.99] w-full border"
                    style={{
                      background: `${tierColor}08`,
                      borderColor: `${tierColor}30`
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${tierColor}, ${tierColor}cc)`
                        }}
                      >
                        <span className="text-sm flex items-center justify-center">{tierIcon}</span>
                      </div>
                      <span className="text-base font-semibold text-gray-800 tracking-wide">
                        {currentTierName}
                      </span>
                    </div>
                    <PiCaretRightBold className="text-sm transition-transform duration-200 group-hover:translate-x-0.5" style={{ color: tierColor }} />
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
              transitionDelay: "150ms"
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div className="flex flex-col py-2 border-b border-gray-100/70">
                <span className="font-mono text-sm uppercase tracking-wider text-gray-400 mb-1">
                  Giới tính
                </span>
                <span className="font-medium text-black">
                  {profile?.gender !== undefined
                    ? GENDER_LABELS[profile.gender as unknown as keyof typeof GENDER_LABELS]
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
                <span className="font-medium text-black truncate" title={user?.email}>
                  {user?.email || "Chưa cập nhật"}
                </span>
              </div>

              <div className="flex flex-col py-2 border-b border-gray-100/70">
                <span className="font-mono text-sm uppercase tracking-wider text-gray-400 mb-1">
                  Địa chỉ mặc định
                </span>
                <span className="font-medium text-black truncate" title={addressString}>
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
              className={`pb-3 border-b-2 font-semibold transition-all flex items-center gap-2 ${activePageTab === "account"
                  ? "border-black text-black"
                  : "border-transparent text-gray-400 hover:text-black"
                }`}
            >
              <PiUserBold className="text-base" />
              Thông tin tài khoản
            </button>
            <button
              onClick={() => setActivePageTab("kyc")}
              className={`pb-3 border-b-2 font-semibold transition-all flex items-center gap-2 ${activePageTab === "kyc"
                  ? "border-black text-black"
                  : "border-transparent text-gray-400 hover:text-black"
                }`}
            >
              <PiIdentificationCardBold className="text-base" />
              Xác minh danh tính (KYC)
            </button>
          </div>
        </div>

        {/* ── TAB PAGE CONTENT: ACCOUNT INFO ── */}
        {activePageTab === "account" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Col: Personal & Contact Forms */}
            <div className="lg:col-span-8 space-y-8">
              {/* Box 1: Personal Info */}
              <div
                className="reveal-hidden p-6 bg-white transition-shadow duration-200"
                style={{
                  border: "1px solid var(--mu-border)",
                  borderRadius: "12px",
                  transitionDelay: "50ms"
                }}
              >
                <h3 className="text-base font-bold uppercase tracking-wider text-gray-800 mb-6 flex items-center gap-2">
                  <PiUserBold className="text-gray-400" />
                  Thông tin cá nhân
                </h3>

                <form onSubmit={onPersonalSubmit} className="space-y-5">
                  {personalValidationError && (
                    <div className="p-3 text-sm rounded border border-[#F5C2C7] bg-[#FDEBEC] text-[#9F2F2D]">
                      {personalValidationError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-mono uppercase tracking-wider text-gray-400 mb-2">
                        Username (Email)
                      </label>
                      <input
                        type="text"
                        value={user?.email?.split("@")[0] || ""}
                        disabled
                        className="block w-full rounded-md border border-[#EAEAEA] bg-gray-50 px-3 py-2 text-base text-gray-400 cursor-not-allowed outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-mono uppercase tracking-wider text-gray-500 mb-2">
                        Họ & tên
                      </label>
                      <input
                        type="text"
                        placeholder="Nhập họ và tên"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="block w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-base text-black focus:border-black focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-mono uppercase tracking-wider text-gray-500 mb-2">
                        Giới tính
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value === "" ? "" : Number(e.target.value))}
                        className="block w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-base text-black focus:border-black focus:outline-none"
                      >
                        <option value="">-- Chọn giới tính --</option>
                        {Object.entries(GENDER_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-mono uppercase tracking-wider text-gray-500 mb-2">
                        Ngày sinh
                      </label>
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="block w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-base text-black focus:border-black focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-mono uppercase tracking-wider text-gray-500 mb-2">
                        Kênh liên lạc ưu tiên
                      </label>
                      <select
                        value={preferredChannel}
                        onChange={(e) => setPreferredChannel(Number(e.target.value))}
                        className="block w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-base text-black focus:border-black focus:outline-none"
                      >
                        {Object.entries(PREFERRED_CHANNEL_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-mono uppercase tracking-wider text-gray-500 mb-2">
                        Zalo User ID
                      </label>
                      <input
                        type="text"
                        placeholder="Nhập Zalo User ID (nếu có)"
                        value={zaloUserId}
                        onChange={(e) => setZaloUserId(e.target.value)}
                        className="block w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-base text-black focus:border-black focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button
                      type="submit"
                      disabled={isUpdatingPersonal}
                      className="inline-flex items-center gap-2 py-2 px-5 text-sm font-semibold text-white bg-[#111111] hover:bg-[#2F3437] rounded-md transition-colors active:scale-[0.98] disabled:bg-gray-400"
                    >
                      <PiFloppyDiskBold className="text-sm" />
                      {isUpdatingPersonal ? "Đang lưu..." : "Cập nhật"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Box 2: Contact Info */}
              <div
                className="reveal-hidden p-6 bg-white transition-shadow duration-200"
                style={{
                  border: "1px solid var(--mu-border)",
                  borderRadius: "12px",
                  transitionDelay: "150ms"
                }}
              >
                <h3 className="text-base font-bold uppercase tracking-wider text-gray-800 mb-6 flex items-center gap-2">
                  <PiPhoneBold className="text-gray-400" />
                  Thông tin liên hệ
                </h3>

                <form onSubmit={onContactSubmit} className="space-y-5">
                  {contactValidationError && (
                    <div className="p-3 text-sm rounded border border-[#F5C2C7] bg-[#FDEBEC] text-[#9F2F2D]">
                      {contactValidationError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-mono uppercase tracking-wider text-gray-400 mb-2">
                        Địa chỉ Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="block w-full rounded-md border border-[#EAEAEA] bg-gray-50 px-3 py-2 text-base text-gray-400 cursor-not-allowed outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-mono uppercase tracking-wider text-gray-500 mb-2">
                        <span className="text-red-500 mr-1">*</span>Số điện thoại
                      </label>
                      <input
                        type="text"
                        placeholder="Nhập số điện thoại"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="block w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-base text-black focus:border-black focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button
                      type="submit"
                      disabled={isUpdatingContact}
                      className="inline-flex items-center gap-2 py-2 px-5 text-sm font-semibold text-white bg-[#111111] hover:bg-[#2F3437] rounded-md transition-colors active:scale-[0.98] disabled:bg-gray-400"
                    >
                      <PiFloppyDiskBold className="text-sm" />
                      {isUpdatingContact ? "Đang lưu..." : "Cập nhật liên hệ"}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Col: Bank Accounts card */}
            <div
              className="reveal-hidden lg:col-span-4 p-6 bg-white transition-shadow duration-200"
              style={{
                border: "1px solid var(--mu-border)",
                borderRadius: "12px",
                transitionDelay: "200ms"
              }}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-bold uppercase tracking-wider text-gray-800 flex items-center gap-2">
                  <PiBankBold className="text-gray-400" />
                  Tài khoản ngân hàng
                </h3>

                {bankAccounts.length > 0 && !showBankForm && (
                  <button
                    onClick={() => {
                      setShowBankForm(true);
                      setBankValidationError(null);
                    }}
                    className="inline-flex items-center justify-center p-1 rounded-md border border-[#EAEAEA] hover:border-black transition-colors"
                  >
                    <PiPlusBold className="text-sm" />
                  </button>
                )}
              </div>

              {loadingBanks && (
                <div className="py-8 text-center text-sm text-gray-400 font-mono">
                  Đang tải thông tin ngân hàng...
                </div>
              )}

              {/* Bank list table */}
              {!loadingBanks && bankAccounts.length > 0 && !showBankForm && (
                <div className="space-y-4">
                  <div className="divide-y divide-gray-100">
                    {bankAccounts.map((account) => (
                      <div key={account.id} className="py-3.5 flex justify-between items-start gap-4">
                        <div className="text-sm">
                          <p className="font-semibold text-gray-800">{account.bankName}</p>
                          <p className="font-mono text-gray-500 mt-1">{account.accountNumber}</p>
                          <p className="text-sm text-gray-400 mt-0.5">{account.accountHolder}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteBank(account.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <PiTrashBold className="text-base" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No bank accounts state */}
              {!loadingBanks && bankAccounts.length === 0 && !showBankForm && (
                <div className="text-center py-8 border border-dashed border-[#EAEAEA] rounded-lg bg-gray-50/50">
                  <PiBankBold className="text-2xl text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400 font-mono mb-4">Chưa liên kết ngân hàng</p>
                  <button
                    onClick={() => setShowBankForm(true)}
                    className="inline-flex items-center gap-1.5 py-1.5 px-3 text-sm font-semibold text-white bg-[#111111] hover:bg-[#2F3437] rounded transition-colors"
                  >
                    <PiPlusBold />
                    Thêm tài khoản
                  </button>
                </div>
              )}

              {/* Add bank account form */}
              {showBankForm && (
                <form onSubmit={onBankSubmit} className="space-y-4">
                  {bankValidationError && (
                    <div className="p-3 text-sm rounded border border-[#F5C2C7] bg-[#FDEBEC] text-[#9F2F2D]">
                      {bankValidationError}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                      Ngân hàng
                    </label>
                    <select
                      value={bankCode}
                      onChange={(e) => setBankCode(e.target.value)}
                      className="block w-full rounded-md border border-[#EAEAEA] bg-white px-2.5 py-1.5 text-base text-black focus:border-black focus:outline-none"
                    >
                      <option value="">-- Chọn ngân hàng --</option>
                      {VIETNAM_BANKS.map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.shortName} - {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                      Số tài khoản
                    </label>
                    <input
                      type="text"
                      placeholder="Số tài khoản"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="block w-full rounded-md border border-[#EAEAEA] bg-white px-2.5 py-1.5 text-base text-black focus:border-black focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                      Tên chủ tài khoản
                    </label>
                    <input
                      type="text"
                      placeholder="VD: NGUYEN VAN A"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      className="block w-full rounded-md border border-[#EAEAEA] bg-white px-2.5 py-1.5 text-base text-black focus:border-black focus:outline-none uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                      Chi nhánh (Tùy chọn)
                    </label>
                    <input
                      type="text"
                      placeholder="Tên chi nhánh"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="block w-full rounded-md border border-[#EAEAEA] bg-white px-2.5 py-1.5 text-base text-black focus:border-black focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    {bankAccounts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowBankForm(false)}
                        className="flex-1 py-1.5 border border-[#EAEAEA] hover:bg-gray-50 rounded text-sm font-semibold text-gray-600 transition-colors"
                      >
                        Hủy
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isAddingBank}
                      className="flex-1 py-1.5 text-sm font-semibold text-white bg-[#111111] hover:bg-[#2F3437] rounded transition-colors active:scale-[0.98] disabled:bg-gray-400"
                    >
                      {isAddingBank ? "Đang lưu..." : "Thêm mới"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ── TAB PAGE CONTENT: KYC VERIFICATION ── */}
        {activePageTab === "kyc" && (
          <div
            className="reveal-hidden p-6 bg-white transition-shadow duration-200"
            style={{
              border: "1px solid var(--mu-border)",
              borderRadius: "12px",
              transitionDelay: "50ms"
            }}
          >
            {/* Display KYC Alert status */}
            {kyc && kyc.status !== undefined && (
              <div className={`p-4 rounded-lg border text-sm flex gap-3 mb-8 ${kycAlertColorClass}`}>
                <PiWarningBold className="text-base shrink-0" />
                <div>
                  <p className="font-semibold mb-1">{kycAlertMsg}</p>
                  {isRejected && kyc.rejectionReason && (
                    <p className="font-mono mt-1 text-[11px] opacity-90">Lý do từ chối: {kyc.rejectionReason}</p>
                  )}
                </div>
              </div>
            )}

            {/* Show verified info when KYC is approved or pending */}
            {isPendingOrApproved && (
              <div className="text-center py-8">
                <PiShieldCheckBold className="text-4xl text-gray-300 mx-auto mb-3" />
                <p className="text-base font-semibold text-gray-700 mb-1">
                  {kycStatusStr === "Approved" || kycStatusStr === KycStatus.Approved.toString()
                    ? "Tài khoản đã xác minh danh tính"
                    : "Hồ sơ đang chờ xét duyệt"}
                </p>
                <p className="text-sm text-gray-400 font-mono">
                  {kycStatusStr === "Approved" || kycStatusStr === KycStatus.Approved.toString()
                    ? "Bạn đã hoàn tất xác minh CCCD thành công. Không cần thực hiện thêm thao tác nào."
                    : "Hồ sơ KYC của bạn đang được xem xét. Vui lòng chờ kết quả từ bộ phận quản trị."}
                </p>
                {kyc?.idNumber && (
                  <div className="mt-6 max-w-xs mx-auto text-left p-4 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-mono text-gray-400 uppercase text-sm">Số CCCD</span>
                        <span className="font-mono font-bold text-gray-700">{kyc.idNumber}</span>
                      </div>
                      {kyc.fullNameOnId && (
                        <div className="flex justify-between">
                          <span className="font-mono text-gray-400 uppercase text-sm">Họ tên</span>
                          <span className="font-medium text-gray-700">{kyc.fullNameOnId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Verification triggers/Form when eligible */}
            {(!kyc || isRejected) && !isPendingOrApproved && (
              <div className="max-w-3xl mx-auto">
                {scanning && (
                  <div className="text-center py-12">
                    <div className="animate-spin inline-block w-8 h-8 border-[3px] border-current border-t-transparent text-black rounded-full mb-3" role="status" />
                    <p className="text-sm text-gray-400 font-mono">Đang tải và nhận diện hình ảnh CCCD...</p>
                  </div>
                )}

                {/* Upload Panel */}
                {!scanning && !ocrData && (
                  <div>
                    <h3 className="text-sm font-mono uppercase tracking-wider text-gray-400 mb-6 text-center">
                      Tải lên ảnh 2 mặt của Căn cước công dân (CCCD)
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                      {/* Front Card */}
                      <div className="space-y-3">
                        <span className="block text-sm font-semibold text-gray-700 text-center">Mặt trước CCCD</span>
                        <label className="block border border-dashed border-[#EAEAEA] hover:border-black bg-gray-50/30 hover:bg-white rounded-lg p-6 cursor-pointer transition-all duration-200 text-center relative overflow-hidden h-48 flex flex-col items-center justify-center">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFrontFileChange}
                            className="hidden"
                          />
                          {frontPreviewUrl ? (
                            <img src={frontPreviewUrl} alt="Front preview" className="w-full h-full object-contain" />
                          ) : (
                            <div className="flex flex-col items-center">
                              <PiUploadSimpleBold className="text-2xl text-gray-400 mb-2" />
                              <span className="text-sm font-semibold text-gray-500">Chọn ảnh mặt trước</span>
                              <span className="text-sm text-gray-400 mt-1 font-mono">JPG, PNG</span>
                            </div>
                          )}
                        </label>
                      </div>

                      {/* Back Card */}
                      <div className="space-y-3">
                        <span className="block text-sm font-semibold text-gray-700 text-center">Mặt sau CCCD (Tùy chọn)</span>
                        <label className="block border border-dashed border-[#EAEAEA] hover:border-black bg-gray-50/30 hover:bg-white rounded-lg p-6 cursor-pointer transition-all duration-200 text-center relative overflow-hidden h-48 flex flex-col items-center justify-center">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleBackFileChange}
                            className="hidden"
                          />
                          {backPreviewUrl ? (
                            <img src={backPreviewUrl} alt="Back preview" className="w-full h-full object-contain" />
                          ) : (
                            <div className="flex flex-col items-center">
                              <PiUploadSimpleBold className="text-2xl text-gray-400 mb-2" />
                              <span className="text-sm font-semibold text-gray-500">Chọn ảnh mặt sau</span>
                              <span className="text-sm text-gray-400 mt-1 font-mono">JPG, PNG</span>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={handleScan}
                        className="inline-flex items-center gap-2 py-2.5 px-8 text-sm font-semibold text-white bg-[#111111] hover:bg-[#2F3437] rounded-md transition-colors active:scale-[0.98]"
                      >
                        <PiIdentificationCardBold className="text-base" />
                        Quét Căn cước công dân
                      </button>
                    </div>
                  </div>
                )}

                {/* Scanned/Parsed OCR results verification form */}
                {!scanning && ocrData && (
                  <div className="bg-gray-50/60 p-6 rounded-lg border border-[#EAEAEA]">
                    <h3 className="text-base font-semibold text-gray-800 mb-6 border-b border-gray-100 pb-3">
                      Xác nhận thông tin trích xuất từ CCCD
                    </h3>

                    <form onSubmit={onKycSubmit} className="space-y-5">
                      {kycValidationError && (
                        <div className="p-3 text-sm rounded border border-[#F5C2C7] bg-[#FDEBEC] text-[#9F2F2D]">
                          {kycValidationError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                        <div>
                          <label className="block text-sm font-mono uppercase tracking-wider text-gray-400 mb-2">
                            Số CCCD (Bản quét - Không chỉnh sửa)
                          </label>
                          <input
                            type="text"
                            value={ocrData.idNumber || ""}
                            disabled
                            className="block w-full rounded-md border border-[#EAEAEA] bg-gray-100/80 px-3 py-2 text-sm text-gray-500 font-mono font-bold cursor-not-allowed outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-mono uppercase tracking-wider text-gray-500 mb-2 font-semibold">
                            Họ và tên trên CCCD
                          </label>
                          <input
                            type="text"
                            value={ocrFullName}
                            onChange={(e) => setOcrFullName(e.target.value)}
                            className="block w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-base text-black focus:border-black focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-mono uppercase tracking-wider text-gray-500 mb-2 font-semibold">
                            Ngày sinh
                          </label>
                          <input
                            type="date"
                            value={ocrDob}
                            onChange={(e) => setOcrDob(e.target.value)}
                            className="block w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-base text-black focus:border-black focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-mono uppercase tracking-wider text-gray-500 mb-2">
                            Giới tính
                          </label>
                          <input
                            type="text"
                            value={ocrGender}
                            onChange={(e) => setOcrGender(e.target.value)}
                            className="block w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-base text-black focus:border-black focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-mono uppercase tracking-wider text-gray-500 mb-2">
                            Quốc tịch
                          </label>
                          <input
                            type="text"
                            value={ocrNationality}
                            onChange={(e) => setOcrNationality(e.target.value)}
                            className="block w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-base text-black focus:border-black focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-mono uppercase tracking-wider text-gray-500 mb-2">
                            Quê quán
                          </label>
                          <input
                            type="text"
                            value={ocrOrigin}
                            onChange={(e) => setOcrOrigin(e.target.value)}
                            className="block w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-base text-black focus:border-black focus:outline-none"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-sm font-mono uppercase tracking-wider text-gray-500 mb-2">
                            Nơi thường trú
                          </label>
                          <input
                            type="text"
                            value={ocrResidence}
                            onChange={(e) => setOcrResidence(e.target.value)}
                            className="block w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-base text-black focus:border-black focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => setOcrData(null)}
                          className="py-2 px-5 text-sm font-semibold text-gray-500 border border-[#EAEAEA] hover:bg-gray-50 rounded-md transition-colors"
                        >
                          Hủy & Quét lại
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingKyc}
                          className="inline-flex items-center gap-1.5 py-2 px-5 text-sm font-semibold text-white bg-[#111111] hover:bg-[#2F3437] rounded-md transition-colors active:scale-[0.98] disabled:bg-gray-400"
                        >
                          <PiShieldCheckBold className="text-sm" />
                          {isSubmittingKyc ? "Đang gửi hồ sơ..." : "Gửi yêu cầu xác thực"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
