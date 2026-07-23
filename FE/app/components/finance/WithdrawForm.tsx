import React, { useState } from "react";
import { useAppDispatch } from "~/lib/feature/hooks";
import { submitWithdraw, fetchMyWallet } from "~/lib/feature/finance/financeThunk";
import { KycStatus } from "~/lib/enums/finance";
import { ReduxStatus } from "~/lib/feature/const";
import { toast } from "react-toastify";
import { FINANCE_LIMITS } from "~/lib/constants/finance";
import { Bank, SpinnerGap, Wallet, X } from "~/components/shared/icons";

interface WithdrawFormProps {
  kyc: any;
  status: ReduxStatus;
  wallet: any;
  activeBankAccounts: any[];
}

export const WithdrawForm: React.FC<WithdrawFormProps> = ({
  kyc,
  status,
  wallet,
  activeBankAccounts,
}) => {
  const dispatch = useAppDispatch();
  const [withdrawAmount, setWithdrawAmount] = useState<number | "">("");
  const [withdrawUserBankId, setWithdrawUserBankId] = useState<string>("");
  const [withdrawValidationError, setWithdrawValidationError] = useState<string | null>(null);

  const onWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kyc || (kyc.status !== "Approved" && kyc.status !== KycStatus.Approved.toString())) {
      setWithdrawValidationError("Vui lòng hoàn thành Xác minh danh tính (KYC) để thực hiện giao dịch này.");
      return;
    }
    if (!withdrawUserBankId) {
      setWithdrawValidationError("Vui lòng chọn tài khoản ngân hàng nhận tiền");
      return;
    }
    if (!withdrawAmount || typeof withdrawAmount !== "number") {
      setWithdrawValidationError("Vui lòng nhập số tiền rút hợp lệ");
      return;
    }
    if (withdrawAmount < FINANCE_LIMITS.MIN_WITHDRAW) {
      setWithdrawValidationError(`Số tiền rút tối thiểu là ${FINANCE_LIMITS.MIN_WITHDRAW.toLocaleString()}₫`);
      return;
    }
    if (withdrawAmount > FINANCE_LIMITS.MAX_WITHDRAW) {
      setWithdrawValidationError(`Số tiền tối đa là ${FINANCE_LIMITS.MAX_WITHDRAW.toLocaleString()}₫`);
      return;
    }
    if (wallet && withdrawAmount > wallet.availableBalance) {
      setWithdrawValidationError("Số dư khả dụng không đủ");
      return;
    }

    setWithdrawValidationError(null);
    try {
      await dispatch(
        submitWithdraw({
          amount: withdrawAmount,
          bankAccountId: withdrawUserBankId,
        })
      ).unwrap();
      toast.success("Yêu cầu rút tiền đã được gửi!");
      setWithdrawAmount("");
      setWithdrawUserBankId("");
    } catch (err: unknown) {
      toast.error((err as string) || "Không thể gửi yêu cầu rút tiền");
    } finally {
      dispatch(fetchMyWallet());
    }
  };

  return (
    <form onSubmit={onWithdrawSubmit} className="space-y-5">
      {withdrawValidationError && (
        <div className="p-3 text-sm rounded border border-[#F5C2C7] bg-[#FDEBEC] text-[#9F2F2D]">
          {withdrawValidationError}
        </div>
      )}

      <div>
        <label className="block text-sm font-mono uppercase tracking-wider text-gray-500 mb-2">
          Tài khoản nhận tiền (Tài khoản của bạn)
        </label>
        <div className="relative">
          <select
            value={withdrawUserBankId}
            onChange={(e) => setWithdrawUserBankId(e.target.value)}
            disabled={activeBankAccounts.length === 0}
            className="block w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-base text-black focus:border-black focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 appearance-none"
          >
            <option value="">-- Chọn tài khoản ngân hàng --</option>
            {activeBankAccounts.map((b) => (
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
          Số tiền muốn rút (VND)
        </label>
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="0"
            value={withdrawAmount === "" ? "" : withdrawAmount.toLocaleString("en-US")}
            onChange={(e) => {
              const rawValue = e.target.value.replace(/\D/g, "");
              setWithdrawAmount(rawValue === "" ? "" : Number(rawValue));
            }}
            className="block w-full rounded-md border border-[#EAEAEA] bg-white pl-3 pr-12 py-2 text-base text-black focus:border-black focus:outline-none"
          />
          <span className="absolute right-3 text-sm font-mono text-gray-400">VND</span>
        </div>
        <div className="flex justify-between items-center text-sm text-gray-400 mt-1">
          <span>Mức rút tối thiểu {FINANCE_LIMITS.MIN_WITHDRAW.toLocaleString()}₫</span>
          <span>
            Khả dụng:{" "}
            <span className="font-semibold text-gray-600">
              {wallet ? wallet.availableBalance.toLocaleString() : "0"}₫
            </span>
          </span>
        </div>
      </div>

      <button
        type="submit"
        disabled={status === ReduxStatus.LOADING || wallet?.isFrozen}
        className="w-full inline-flex justify-center items-center py-2.5 px-4 text-base font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors active:scale-[0.98] disabled:bg-gray-400 disabled:pointer-events-none"
      >
        {status === ReduxStatus.LOADING ? (
          <>
            <SpinnerGap className="animate-spin text-lg mr-2" />
            Đang xử lý...
          </>
        ) : wallet?.isFrozen ? (
          "Ví đang bị khóa"
        ) : (
          "Tạo yêu cầu rút tiền"
        )}
      </button>
    </form>
  );
};
