import React from "react";
import { MapPin, X, Plus, PencilSimple, Check } from "~/components/shared/icons";
import type { useCartCheckout } from "./useCartCheckout";

type AddressSelectModalProps = ReturnType<typeof useCartCheckout> & {
  isOpen: boolean;
  onClose: () => void;
};

export function AddressSelectModal({
  isOpen,
  onClose,
  addresses,
  selectedAddressId,
  setSelectedAddressId,
  handleOpenEditForm,
  handleOpenAddForm,
}: AddressSelectModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white border border-[#EAEAEA] rounded-lg max-w-lg w-full p-6 shadow-2xl flex flex-col font-sans max-h-[85vh]">
        <div className="flex items-center justify-between pb-3 border-b border-[#EAEAEA] mb-4">
          <h3 className="text-base font-serif font-bold text-black flex items-center gap-1.5">
            <MapPin className="text-gray-400" />
            Chọn địa chỉ nhận hàng
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-black transition-colors"
          >
            <X className="text-lg" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-3 pr-1 py-1 flex-1 custom-scrollbar">
          {addresses
            .filter((a) => a.isActive)
            .map((addr) => {
              const isCurrent = addr.id === selectedAddressId;
              return (
                <div
                  key={addr.id}
                  onClick={() => {
                    setSelectedAddressId(addr.id);
                    onClose();
                  }}
                  className={`p-4 rounded border text-left cursor-pointer transition-all relative ${
                    isCurrent
                      ? "border-black bg-neutral-50"
                      : "border-gray-200 hover:border-gray-400 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm text-black">
                      {addr.recipientName}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">
                      {addr.phone}
                    </span>
                    {addr.label && (
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                        {addr.label}
                      </span>
                    )}
                    {addr.isDefault && (
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold bg-green-50 text-green-700 border border-green-100">
                        Mặc định
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 leading-normal pr-14">
                    {addr.addressLine}
                    {addr.wardCode && `, ${addr.wardCode}`}
                    {addr.districtCode && `, ${addr.districtCode}`}
                    {addr.provinceCode && `, ${addr.provinceCode}`}
                  </p>

                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditForm(addr);
                      }}
                      className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-black transition-colors"
                      title="Sửa địa chỉ"
                    >
                      <PencilSimple className="text-base" />
                    </button>
                    {isCurrent && <Check className="text-black text-base" />}
                  </div>
                </div>
              );
            })}

          {addresses.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              Chưa có địa chỉ giao hàng nào.
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-[#EAEAEA] mt-4">
          <button
            type="button"
            onClick={handleOpenAddForm}
            className="inline-flex items-center gap-1 text-xs font-semibold text-black hover:underline"
          >
            <Plus />
            Thêm địa chỉ mới
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-primary hover:bg-primary-dark text-white text-xs font-semibold px-4 py-2 rounded transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
