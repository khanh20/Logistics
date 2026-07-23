/**
 * useProfileForm — Custom hook quản lý toàn bộ form state & handler
 * cho CustomerProfilePage (Skill 3.B: state management isolation).
 */
import { useState, useRef, useEffect } from "react";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { normalizeError } from "~/lib/utils/errors";
import { compressImage } from "~/lib/utils/image";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import type { RootState } from "~/lib/feature/store";
import {
  fetchMyProfile,
  updateProfile,
  createMyProfile,
  fetchKyc,
  submitKyc,
  fetchMyAddresses,
} from "~/lib/feature/customerProfile/customerProfileThunk";
import {
  selectProfile,
  selectKyc,
  selectProfileStatus,
  selectAddresses,
} from "~/lib/feature/customerProfile/customerProfileSelector";
import { fetchVipTiers } from "~/lib/feature/adminFinance/adminFinanceThunk";
import { selectVipTiers } from "~/lib/feature/adminFinance/adminFinanceSelector";
import { updateUserLocal } from "~/lib/feature/auth/authSlice";
import { customerProfileApi } from "~/lib/api/customerProfile";
import { financeApi } from "~/lib/api/finance";
import { authApi } from "~/lib/api/auth";
import { PreferredChannel } from "~/lib/enums/finance";
import { VIETNAM_BANKS } from "~/lib/constants/banks";
import type {
  UpdateKycFromOcrRequest,
  UpdateCustomerProfileDto,
} from "~/lib/types/customerProfile";
import type { BankAccountDto } from "~/lib/types/bankAccount";

export function useProfileForm() {
  const dispatch = useAppDispatch();
  const profile = useAppSelector(selectProfile);
  const kyc = useAppSelector(selectKyc);
  const status = useAppSelector(selectProfileStatus);
  const addresses = useAppSelector(selectAddresses);
  const user = useAppSelector((state: RootState) => state.authState.user);
  const vipTiers = useAppSelector(selectVipTiers);

  // ── Personal Info Form ──
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<number | "">("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [preferredChannel, setPreferredChannel] = useState<number>(
    PreferredChannel.App
  );
  const [zaloUserId, setZaloUserId] = useState("");
  const [personalValidationError, setPersonalValidationError] = useState<
    string | null
  >(null);
  const [isUpdatingPersonal, setIsUpdatingPersonal] = useState(false);

  // ── Contact Info Form ──
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactValidationError, setContactValidationError] = useState<
    string | null
  >(null);
  const [isUpdatingContact, setIsUpdatingContact] = useState(false);

  // ── Bank Accounts ──
  const [bankAccounts, setBankAccounts] = useState<BankAccountDto[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankCode, setBankCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branch, setBranch] = useState("");
  const [bankValidationError, setBankValidationError] = useState<string | null>(
    null
  );
  const [isAddingBank, setIsAddingBank] = useState(false);

  // ── Avatar ──
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // ── KYC OCR ──
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreviewUrl, setFrontPreviewUrl] = useState<string | null>(null);
  const [backPreviewUrl, setBackPreviewUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [ocrData, setOcrData] = useState<UpdateKycFromOcrRequest | null>(null);
  const [ocrFullName, setOcrFullName] = useState("");
  const [ocrDob, setOcrDob] = useState("");
  const [ocrGender, setOcrGender] = useState("");
  const [ocrNationality, setOcrNationality] = useState("");
  const [ocrOrigin, setOcrOrigin] = useState("");
  const [ocrResidence, setOcrResidence] = useState("");
  const [kycValidationError, setKycValidationError] = useState<string | null>(
    null
  );
  const [isSubmittingKyc, setIsSubmittingKyc] = useState(false);

  // ── Data Fetching ──
  const fetchBanks = async () => {
    setLoadingBanks(true);
    try {
      const res = await financeApi.getMyBankAccounts();
      if (res.data) setBankAccounts(res.data);
    } catch (err: unknown) {
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

  // Sync profile → personal form
  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || "");
      setGender(profile.gender !== undefined ? profile.gender : "");
      setDateOfBirth(
        profile.dateOfBirth
          ? dayjs(profile.dateOfBirth).format("YYYY-MM-DD")
          : ""
      );
      setPreferredChannel(profile.preferredChannel ?? PreferredChannel.App);
      setZaloUserId(profile.zaloUserId || "");
    }
  }, [profile]);

  // Sync auth user → contact form
  useEffect(() => {
    if (user) {
      setPhone(user.phone || "");
      setEmail(user.email || "");
    }
  }, [user]);

  // ── Handlers: Personal ──
  const handleUpdate = async (
    payload: UpdateCustomerProfileDto & {
      email?: string;
      phone?: string;
      customerCode?: string;
    }
  ) => {
    try {
      setIsUpdatingPersonal(true);
      if (profile?.id) {
        await dispatch(
          updateProfile({ id: profile.id, data: payload })
        ).unwrap();
        if (payload.phone !== undefined || payload.email !== undefined) {
          dispatch(
            updateUserLocal({ phone: payload.phone, email: payload.email })
          );
        }
        dispatch(fetchMyProfile());
        toast.success("Cập nhật thông tin thành công");
      } else {
        await dispatch(
          createMyProfile({ ...payload, customerCode: `CUST-${Date.now()}` })
        ).unwrap();
        if (payload.phone !== undefined || payload.email !== undefined) {
          dispatch(
            updateUserLocal({ phone: payload.phone, email: payload.email })
          );
        }
        dispatch(fetchMyProfile());
        toast.success("Tạo thông tin thành công");
      }
    } catch (error: unknown) {
      toast.error((error as string) || "Lỗi cập nhật thông tin");
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
      setPersonalValidationError(
        "Zalo User ID không được vượt quá 100 ký tự"
      );
      return;
    }
    setPersonalValidationError(null);
    await handleUpdate({
      fullName,
      gender: gender !== "" ? Number(gender) : undefined,
      dateOfBirth: dateOfBirth ? `${dateOfBirth}T00:00:00Z` : undefined,
      preferredChannel,
      zaloUserId: zaloUserId || undefined,
    });
  };

  // ── Handlers: Contact ──
  const onContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      setContactValidationError("Số điện thoại là bắt buộc");
      return;
    }
    if (phone.length > 20) {
      setContactValidationError(
        "Số điện thoại không được vượt quá 20 ký tự"
      );
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
      const name =
        fullName || profile?.fullName || user?.fullName || "Khách hàng";
      await authApi.updateMe({ fullName: name, phone });
      dispatch(updateUserLocal({ phone }));
      toast.success("Cập nhật thông tin liên hệ thành công");
    } catch (error: unknown) {
      toast.error(
        normalizeError(error).message || "Lỗi cập nhật thông tin liên hệ"
      );
    } finally {
      setIsUpdatingContact(false);
    }
  };

  // ── Handlers: Bank ──
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
      setBankValidationError(
        "Tên chủ tài khoản quá dài (tối đa 255 ký tự)"
      );
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
        branch: branch || undefined,
      });
      toast.success("Thêm tài khoản ngân hàng thành công");
      setBankCode("");
      setBankName("");
      setAccountHolder("");
      setAccountNumber("");
      setBranch("");
      setShowBankForm(false);
      fetchBanks();
    } catch (err: unknown) {
      toast.error(normalizeError(err).message || "Lỗi khi thêm ngân hàng");
    } finally {
      setIsAddingBank(false);
    }
  };

  const handleDeleteBank = async (id: string) => {
    if (
      !window.confirm(
        "Bạn có chắc chắn muốn xóa tài khoản ngân hàng này không?"
      )
    )
      return;
    try {
      await financeApi.deleteBankAccount(id);
      toast.success("Đã xóa tài khoản ngân hàng");
      fetchBanks();
    } catch (err: unknown) {
      toast.error(normalizeError(err).message || "Lỗi khi xóa ngân hàng");
    }
  };

  // ── Handlers: Avatar ──
  const handleAvatarSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh đại diện ban đầu không được vượt quá 5MB");
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const compressedFile = await compressImage(file, 512, 512, 0.8);
      const res = await authApi.uploadAvatar(compressedFile);
      if (res.data?.avatarUrl) {
        dispatch(updateUserLocal({ avatarUrl: res.data.avatarUrl }));
        toast.success("Cập nhật ảnh đại diện thành công");
      }
    } catch (err: unknown) {
      toast.error(
        normalizeError(err).message || "Lỗi cập nhật ảnh đại diện"
      );
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  // ── Handlers: KYC OCR ──
  const handleFrontFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setFrontFile(file);
      setFrontPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleBackFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setBackFile(file);
      setBackPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleScan = async () => {
    if (!frontFile) {
      toast.error("Vui lòng tải lên ảnh mặt trước CCCD");
      return;
    }
    setScanning(true);
    try {
      const res = await customerProfileApi.scanCccd(
        frontFile,
        backFile || undefined
      );
      if (res.data) {
        const { rawText, message: msg, customerId, expiryDate, ...parsed } = res.data;
        setOcrData(parsed);
        setOcrFullName(parsed.fullNameOnId || "");
        setOcrDob(
          parsed.dateOfBirthOnId
            ? dayjs(parsed.dateOfBirthOnId).format("YYYY-MM-DD")
            : ""
        );
        setOcrGender(parsed.gender || "");
        setOcrNationality(parsed.nationality || "");
        setOcrOrigin(parsed.placeOfOrigin || "");
        setOcrResidence(parsed.placeOfResidence || "");
        toast.success(
          "Quét CCCD thành công. Vui lòng kiểm tra lại thông tin!"
        );
      }
    } catch (err: unknown) {
      toast.error(normalizeError(err).message || "Lỗi quét CCCD");
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
      placeOfResidence: ocrResidence || undefined,
    };
    try {
      setIsSubmittingKyc(true);
      await dispatch(submitKyc(payload)).unwrap();
      toast.success("Gửi hồ sơ KYC thành công");
      dispatch(fetchKyc());
      setOcrData(null);
      setFrontFile(null);
      setBackFile(null);
      setFrontPreviewUrl(null);
      setBackPreviewUrl(null);
    } catch (err: unknown) {
      toast.error((err as string) || "Lỗi gửi hồ sơ KYC");
    } finally {
      setIsSubmittingKyc(false);
    }
  };

  return {
    // Redux selectors
    profile,
    kyc,
    status,
    addresses,
    user,
    vipTiers,

    // Personal form
    fullName, setFullName,
    gender, setGender,
    dateOfBirth, setDateOfBirth,
    preferredChannel, setPreferredChannel,
    zaloUserId, setZaloUserId,
    personalValidationError,
    isUpdatingPersonal,
    onPersonalSubmit,

    // Contact form
    phone, setPhone,
    email,
    contactValidationError,
    isUpdatingContact,
    onContactSubmit,

    // Bank accounts
    bankAccounts,
    loadingBanks,
    showBankForm, setShowBankForm,
    bankCode, setBankCode,
    bankName, setBankName,
    accountHolder, setAccountHolder,
    accountNumber, setAccountNumber,
    branch, setBranch,
    bankValidationError, setBankValidationError,
    isAddingBank,
    onBankSubmit,
    handleDeleteBank,

    // Avatar
    avatarInputRef,
    isUploadingAvatar,
    handleAvatarSelect,

    // KYC OCR
    frontPreviewUrl,
    backPreviewUrl,
    scanning,
    ocrData, setOcrData,
    ocrFullName, setOcrFullName,
    ocrDob, setOcrDob,
    ocrGender, setOcrGender,
    ocrNationality, setOcrNationality,
    ocrOrigin, setOcrOrigin,
    ocrResidence, setOcrResidence,
    kycValidationError,
    isSubmittingKyc,
    handleFrontFileChange,
    handleBackFileChange,
    handleScan,
    onKycSubmit,
  };
}
