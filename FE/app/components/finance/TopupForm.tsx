import React, { useState } from "react";
import { useAppDispatch } from "~/lib/feature/hooks";
import { submitTopup, fetchMyWallet } from "~/lib/feature/finance/financeThunk";
import { KycStatus } from "~/lib/enums/finance";
import { ReduxStatus } from "~/lib/feature/const";
import { toast } from "react-toastify";
import { FINANCE_LIMITS } from "~/lib/constants/finance";
import { Bank, Info, SpinnerGap, Wallet, X } from "~/components/shared/icons";

interface TopupFormProps {
  kyc: any;
  status: ReduxStatus;
  wallet: any;
  activeSystemBankAccounts: any[];
}

export const TopupForm: React.FC<TopupFormProps> = ({
  kyc,
  status,
  wallet,
  activeSystemBankAccounts,
}) => {
  const dispatch = useAppDispatch();
  const [topupAmount, setTopupAmount] = useState<number | "">("");
  const [topupSystemBankId, setTopupSystemBankId] = useState<string>("");
  const [topupValidationError, setTopupValidationError] = useState<string | null>(null);

  const onTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kyc || (kyc.status !== "Approved" && kyc.status !== KycStatus.Approved.toString())) {
      setTopupValidationError("Vui lòng hoàn thành Xác minh danh tính (KYC) để thực hiện giao dịch này.");
      return;
    }
    if (!topupSystemBankId) {
      setTopupValidationError("Vui lòng chọn tài khoản ngân hàng hệ thống");
      return;
    }
    if (!topupAmount || typeof topupAmount !== "number") {
      setTopupValidationError("Vui lòng nhập số tiền hợp lệ");
      return;
    }
    if (topupAmount < FINANCE_LIMITS.MIN_TOPUP) {
      setTopupValidationError(`Số tiền tối thiểu là ${FINANCE_LIMITS.MIN_TOPUP.toLocaleString()}₫`);
      return;
    }
    if (topupAmount > FINANCE_LIMITS.MAX_TOPUP) {
      setTopupValidationError(`Số tiền tối đa là ${FINANCE_LIMITS.MAX_TOPUP.toLocaleString()}₫`);
      return;
    }

    setTopupValidationError(null);
    try {
      await dispatch(
        submitTopup({
          amount: topupAmount,
          bankAccountId: topupSystemBankId,
        })
      ).unwrap();
      toast.success("Yêu cầu nạp tiền đã được gửi!");
      setTopupAmount("");
      setTopupSystemBankId("");
    } catch (err: unknown) {
      toast.error((err as string) || "Không thể gửi yêu cầu nạp tiền");
    } finally {
      dispatch(fetchMyWallet());
    }
  };

  return (
    <form onSubmit={onTopupSubmit} className="space-y-5">
      {topupValidationError && (
        <div className="p-3 text-sm rounded border border-[#F5C2C7] bg-[#FDEBEC] text-[#9F2F2D]">
          {topupValidationError}
        </div>
      )}

      <div>
        <label className="block text-sm font-mono uppercase tracking-wider text-gray-500 mb-2">
          Tài khoản ngân hàng của hệ thống
        </label>
        <div className="relative">
          <select
            value={topupSystemBankId}
            onChange={(e) => setTopupSystemBankId(e.target.value)}
            disabled={activeSystemBankAccounts.length === 0}
            className="block w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-base text-black focus:border-black focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 appearance-none"
          >
            <option value="">-- Chọn tài khoản ngân hàng --</option>
            {activeSystemBankAccounts.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bankName} - {b.accountNumber} ({b.accountHolder})
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
            <Bank />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-mono uppercase tracking-wider text-gray-500 mb-2">
          Số tiền muốn nạp (VND)
        </label>
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="0"
            value={topupAmount === "" ? "" : topupAmount.toLocaleString("en-US")}
            onChange={(e) => {
              const rawValue = e.target.value.replace(/\D/g, "");
              setTopupAmount(rawValue === "" ? "" : Number(rawValue));
            }}
            className="block w-full rounded-md border border-[#EAEAEA] bg-white pl-3 pr-12 py-2 text-base text-black focus:border-black focus:outline-none"
          />
          <span className="absolute right-3 text-sm font-mono text-gray-400">VND</span>
        </div>
        <span className="text-sm text-gray-400 block mt-1">
          Gợi ý: Mức nạp tối thiểu {FINANCE_LIMITS.MIN_TOPUP.toLocaleString()}₫
        </span>
      </div>

      <div className="p-3.5 rounded-lg border border-[#D1E7DD] bg-[#EDF3EC] text-[#346538] text-sm flex gap-2">
        <Info className="text-base shrink-0 mt-0.5" />
        <span>
          Sau khi tạo yêu cầu, hãy thực hiện chuyển khoản đúng theo thông tin tài khoản hiển thị trong danh sách giao dịch bên phải.
        </span>
      </div>

      <button
        type="submit"
        disabled={status === ReduxStatus.LOADING || wallet?.isFrozen}
        className="w-full inline-flex justify-center items-center py-2.5 px-4 text-base font-semibold text-white bg-[#111111] hover:bg-[#2F3437] rounded-md transition-colors active:scale-[0.98] disabled:bg-gray-400 disabled:pointer-events-none"
      >
        {status === ReduxStatus.LOADING ? (
          <>
            <SpinnerGap className="animate-spin text-lg mr-2" />
            Đang xử lý...
          </>
        ) : wallet?.isFrozen ? (
          "Ví đang bị khóa"
        ) : (
          "Tạo yêu cầu nạp tiền"
        )}
      </button>
    </form>
  );
};
