import React from "react";
import { X } from "~/components/shared/icons";
import type { useCartCheckout } from "./useCartCheckout";

type AddressFormModalProps = ReturnType<typeof useCartCheckout> & {
  isOpen: boolean;
  onClose: () => void;
};

export function AddressFormModal({
  isOpen,
  onClose,
  editingAddress,
  formError,
  formLabel,
  setFormLabel,
  formRecipientName,
  setFormRecipientName,
  formPhone,
  setFormPhone,
  formAddressLine,
  setFormAddressLine,
  formProvinceCode,
  setFormProvinceCode,
  formDistrictCode,
  setFormDistrictCode,
  formWardCode,
  setFormWardCode,
  formIsDefault,
  setFormIsDefault,
  handleAddressSubmit,
}: AddressFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white border border-[#EAEAEA] rounded-lg max-w-lg w-full p-6 shadow-2xl flex flex-col font-sans">
        <div className="flex items-center justify-between pb-3 border-b border-[#EAEAEA] mb-4">
          <h3 className="text-base font-serif font-bold text-black">
            {editingAddress ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ mới"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-black transition-colors"
          >
            <X className="text-lg" />
          </button>
        </div>

        {formError && (
          <div className="mb-4 p-3 text-xs rounded bg-rose-50 border border-rose-100 text-rose-700 font-semibold">
            {formError}
          </div>
        )}

        <form onSubmit={handleAddressSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">
                Tên người nhận *
              </label>
              <input
                type="text"
                required
                value={formRecipientName}
                onChange={(e) => setFormRecipientName(e.target.value)}
                placeholder="VD: Nguyễn Văn A..."
                className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">
                Số điện thoại *
              </label>
              <input
                type="text"
                required
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="VD: 0987654321..."
                className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">
              Địa chỉ chi tiết (Số nhà, Tên đường) *
            </label>
            <input
              type="text"
              required
              value={formAddressLine}
              onChange={(e) => setFormAddressLine(e.target.value)}
              placeholder="VD: Số 12, Ngõ 34, Phố Huế..."
              className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">
                Tỉnh / Thành phố *
              </label>
              <input
                type="text"
                required
                value={formProvinceCode}
                onChange={(e) => setFormProvinceCode(e.target.value)}
                placeholder="VD: Hà Nội..."
                className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">
                Quận / Huyện
              </label>
              <input
                type="text"
                value={formDistrictCode}
                onChange={(e) => setFormDistrictCode(e.target.value)}
                placeholder="VD: Cầu Giấy..."
                className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">
                Phường / Xã
              </label>
              <input
                type="text"
                value={formWardCode}
                onChange={(e) => setFormWardCode(e.target.value)}
                placeholder="VD: Dịch Vọng..."
                className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">
                Nhãn (Nhà riêng, Văn phòng...)
              </label>
              <input
                type="text"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="VD: Nhà riêng..."
                className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 cursor-pointer mt-4">
              <input
                type="checkbox"
                id="formIsDefault"
                checked={formIsDefault}
                onChange={(e) => setFormIsDefault(e.target.checked)}
                className="rounded border-[#EAEAEA] text-black focus:ring-black h-4 w-4"
              />
              <label
                htmlFor="formIsDefault"
                className="text-sm font-semibold text-black cursor-pointer select-none"
              >
                Đặt làm mặc định
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#EAEAEA] mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-white hover:bg-gray-100 text-[#2F3437] border border-[#EAEAEA] text-xs font-semibold px-4.5 py-2 rounded transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="bg-primary hover:bg-primary-dark text-white text-xs font-semibold px-4.5 py-2 rounded transition-colors"
            >
              Lưu địa chỉ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
