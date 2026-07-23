/**
 * useCartCheckout — Custom hook quản lý state & handlers cho quy trình
 * xem giỏ hàng, chọn địa chỉ và thanh toán (checkout).
 */
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { cartApi } from "~/lib/api/cart";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import {
  fetchMyAddresses,
  createAddress,
  updateAddress,
} from "~/lib/feature/customerProfile/customerProfileThunk";
import type {
  CustomerAddressDto,
  CreateCustomerAddressDto,
} from "~/lib/types/customerProfile";
import type { CartResponse, CheckoutPreviewResponse } from "~/lib/types/cart";

export function useCartCheckout(
  initialCart: CartResponse | null,
  reloadCart: () => Promise<void>
) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  // Addresses from Redux
  const { addresses } = useAppSelector((state) => state.customerProfileState);

  // Shop selection
  const allShopIds = useMemo(() => {
    return initialCart?.groupsByShop?.map((g) => g.shopId) ?? [];
  }, [initialCart]);

  const [selectedShopIds, setSelectedShopIds] = useState<string[]>([]);

  // Sync selectedShopIds when cart loads or changes
  useEffect(() => {
    if (allShopIds.length > 0 && selectedShopIds.length === 0) {
      setSelectedShopIds(allShopIds);
    }
  }, [allShopIds]);

  const [deliveryNote, setDeliveryNote] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [insuranceOption, setInsuranceOption] = useState<string>("none");
  const [shippingLine, setShippingLine] = useState<string>("Tmdt");
  const [preview, setPreview] = useState<CheckoutPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<string[] | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Address UI State
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddressDto | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Address Form State
  const [formLabel, setFormLabel] = useState("");
  const [formRecipientName, setFormRecipientName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddressLine, setFormAddressLine] = useState("");
  const [formProvinceCode, setFormProvinceCode] = useState("");
  const [formDistrictCode, setFormDistrictCode] = useState("");
  const [formWardCode, setFormWardCode] = useState("");
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formError, setFormError] = useState("");

  // Fetch addresses
  useEffect(() => {
    dispatch(fetchMyAddresses());
  }, [dispatch]);

  // Set default address on load
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const defaultAddr =
        addresses.find((a) => a.isDefault && a.isActive) ||
        addresses.find((a) => a.isActive);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
      }
    }
  }, [addresses, selectedAddressId]);

  // Active address memo
  const activeAddress = useMemo(() => {
    return (
      addresses.find((a) => a.id === selectedAddressId && a.isActive) || null
    );
  }, [addresses, selectedAddressId]);

  // Format delivery note when active address changes
  useEffect(() => {
    if (activeAddress) {
      const formatted = [
        activeAddress.recipientName,
        activeAddress.phone,
        [
          activeAddress.addressLine,
          activeAddress.wardCode,
          activeAddress.districtCode,
          activeAddress.provinceCode,
        ]
          .filter(Boolean)
          .join(", "),
      ]
        .filter(Boolean)
        .join(" | ");
      setDeliveryNote(formatted);
      setPreview(null); // Reset preview
    } else {
      setDeliveryNote("");
    }
  }, [activeAddress]);

  // Toggle selected shops
  const toggleShop = (shopId: string) => {
    setSelectedShopIds((prev) =>
      prev.includes(shopId)
        ? prev.filter((id) => id !== shopId)
        : [...prev, shopId]
    );
    setPreview(null);
  };

  // Preview Checkout
  const handlePreview = async () => {
    if (selectedShopIds.length === 0) return;
    if (!deliveryNote) {
      setCheckoutError("Vui lòng chọn hoặc điền thông tin địa chỉ nhận hàng.");
      return;
    }
    setPreviewLoading(true);
    setCheckoutError(null);
    try {
      const res = await cartApi.previewCheckout({
        shopIds: selectedShopIds,
        deliveryAddressNote: deliveryNote || undefined,
        insuranceOption,
        shippingLine,
      });
      setPreview(res.data);
    } catch (err: unknown) {
      setCheckoutError(
        (err as { message?: string })?.message ?? t("cart.preview_error")
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  // Execute confirm checkout
  const executeConfirmCheckout = async () => {
    setIsConfirmModalOpen(false);
    if (!preview || selectedShopIds.length === 0) return;
    if (!deliveryNote) {
      setCheckoutError("Vui lòng chọn hoặc điền thông tin địa chỉ nhận hàng.");
      return;
    }
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await cartApi.confirmCheckout({
        shopIds: selectedShopIds,
        deliveryAddressNote: deliveryNote || undefined,
        customerNote: customerNote || undefined,
        insuranceOption,
        shippingLine,
      });
      setCheckoutSuccess(res.data.createdOrderIds);
      await reloadCart();
      setPreview(null);
    } catch (err: unknown) {
      setCheckoutError(
        (err as { message?: string })?.message ?? t("cart.checkout_error")
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!preview || selectedShopIds.length === 0) return;
    if (!deliveryNote) {
      setCheckoutError("Vui lòng chọn hoặc điền thông tin địa chỉ nhận hàng.");
      return;
    }
    setIsConfirmModalOpen(true);
  };

  // Form helpers
  const handleOpenAddForm = () => {
    setEditingAddress(null);
    setFormLabel("");
    setFormRecipientName("");
    setFormPhone("");
    setFormAddressLine("");
    setFormProvinceCode("");
    setFormDistrictCode("");
    setFormWardCode("");
    setFormIsDefault(false);
    setFormError("");
    setIsFormModalOpen(true);
  };

  const handleOpenEditForm = (addr: CustomerAddressDto) => {
    setEditingAddress(addr);
    setFormLabel(addr.label || "");
    setFormRecipientName(addr.recipientName);
    setFormPhone(addr.phone);
    setFormAddressLine(addr.addressLine);
    setFormProvinceCode(addr.provinceCode || "");
    setFormDistrictCode(addr.districtCode || "");
    setFormWardCode(addr.wardCode || "");
    setFormIsDefault(addr.isDefault);
    setFormError("");
    setIsFormModalOpen(true);
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formRecipientName.trim() ||
      !formPhone.trim() ||
      !formAddressLine.trim() ||
      !formProvinceCode.trim()
    ) {
      setFormError("Vui lòng điền đầy đủ các thông tin bắt buộc (*)");
      return;
    }
    setFormError("");

    const payload: CreateCustomerAddressDto = {
      label: formLabel.trim() || undefined,
      recipientName: formRecipientName.trim(),
      phone: formPhone.trim(),
      addressLine: formAddressLine.trim(),
      provinceCode: formProvinceCode.trim(),
      districtCode: formDistrictCode.trim() || undefined,
      wardCode: formWardCode.trim() || undefined,
      isDefault: formIsDefault,
    };

    try {
      if (editingAddress) {
        await dispatch(
          updateAddress({ id: editingAddress.id, data: payload })
        ).unwrap();
        setSelectedAddressId(editingAddress.id);
      } else {
        const result = await dispatch(createAddress(payload)).unwrap();
        if (result && result.id) {
          setSelectedAddressId(result.id);
        }
      }
      setIsFormModalOpen(false);
      dispatch(fetchMyAddresses());
    } catch (err: unknown) {
      setFormError((err as string) || "Không thể lưu địa chỉ");
    }
  };

  return {
    addresses,
    selectedShopIds,
    setSelectedShopIds,
    toggleShop,
    deliveryNote,
    customerNote, setCustomerNote,
    insuranceOption, setInsuranceOption,
    shippingLine, setShippingLine,
    preview, setPreview,
    previewLoading,
    checkoutLoading,
    checkoutSuccess, setCheckoutSuccess,
    checkoutError, setCheckoutError,

    // Address select/modal
    selectedAddressId, setSelectedAddressId,
    activeAddress,
    isSelectModalOpen, setIsSelectModalOpen,
    isConfirmModalOpen, setIsConfirmModalOpen,
    handlePreview,
    handleConfirm,
    executeConfirmCheckout,

    // Address form modal
    isFormModalOpen, setIsFormModalOpen,
    editingAddress,
    handleOpenAddForm,
    handleOpenEditForm,
    handleAddressSubmit,

    // Form state
    formLabel, setFormLabel,
    formRecipientName, setFormRecipientName,
    formPhone, setFormPhone,
    formAddressLine, setFormAddressLine,
    formProvinceCode, setFormProvinceCode,
    formDistrictCode, setFormDistrictCode,
    formWardCode, setFormWardCode,
    formIsDefault, setFormIsDefault,
    formError, setFormError,
  };
}
