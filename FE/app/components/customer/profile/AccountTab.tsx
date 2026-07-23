import React from "react";
import {
  FloppyDisk,
  Phone,
  Bank,
  Plus,
  Trash,
  User,
} from "~/components/shared/icons";
import { GENDER_LABELS, PREFERRED_CHANNEL_LABELS } from "~/lib/constants/finance";
import { VIETNAM_BANKS } from "~/lib/constants/banks";
import type { useProfileForm } from "./useProfileForm";

type AccountTabProps = ReturnType<typeof useProfileForm>;

export function AccountTab({
  fullName,
  setFullName,
  gender,
  setGender,
  dateOfBirth,
  setDateOfBirth,
  preferredChannel,
  setPreferredChannel,
  zaloUserId,
  setZaloUserId,
  personalValidationError,
  isUpdatingPersonal,
  onPersonalSubmit,
  phone,
  setPhone,
  email,
  contactValidationError,
  isUpdatingContact,
  onContactSubmit,
  bankAccounts,
  loadingBanks,
  showBankForm,
  setShowBankForm,
  bankCode,
  setBankCode,
  accountHolder,
  setAccountHolder,
  accountNumber,
  setAccountNumber,
  branch,
  setBranch,
  bankValidationError,
  setBankValidationError,
  isAddingBank,
  onBankSubmit,
  handleDeleteBank,
  user,
}: AccountTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Col: Personal & Contact Forms */}
      <div className="lg:col-span-8 space-y-8">
        {/* Box 1: Personal Info */}
        <div
          className="reveal-hidden p-6 bg-white transition-shadow duration-200"
          style={{
            border: "1px solid var(--mu-border)",
            borderRadius: "12px",
            transitionDelay: "50ms",
          }}
        >
          <h3 className="text-base font-bold uppercase tracking-wider text-gray-800 mb-6 flex items-center gap-2">
            <User className="text-gray-400" />
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
                  onChange={(e) =>
                    setGender(e.target.value === "" ? "" : Number(e.target.value))
                  }
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
                <FloppyDisk className="text-sm" />
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
            transitionDelay: "150ms",
          }}
        >
          <h3 className="text-base font-bold uppercase tracking-wider text-gray-800 mb-6 flex items-center gap-2">
            <Phone className="text-gray-400" />
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
                <FloppyDisk className="text-sm" />
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
          transitionDelay: "200ms",
        }}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-base font-bold uppercase tracking-wider text-gray-800 flex items-center gap-2">
            <Bank className="text-gray-400" />
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
              <Plus className="text-sm" />
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
                <div
                  key={account.id}
                  className="py-3.5 flex justify-between items-start gap-4"
                >
                  <div className="text-sm">
                    <p className="font-semibold text-gray-800">
                      {account.bankName}
                    </p>
                    <p className="font-mono text-gray-500 mt-1">
                      {account.accountNumber}
                    </p>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {account.accountHolder}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteBank(account.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash className="text-base" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No bank accounts state */}
        {!loadingBanks && bankAccounts.length === 0 && !showBankForm && (
          <div className="text-center py-8 border border-dashed border-[#EAEAEA] rounded-lg bg-gray-50/50">
            <Bank className="text-2xl text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400 font-mono mb-4">
              Chưa liên kết ngân hàng
            </p>
            <button
              onClick={() => setShowBankForm(true)}
              className="inline-flex items-center gap-1.5 py-1.5 px-3 text-sm font-semibold text-white bg-[#111111] hover:bg-[#2F3437] rounded transition-colors"
            >
              <Plus />
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
  );
}
