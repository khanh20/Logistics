import React from "react";
import {
  ShieldCheck,
  Warning,
  UploadSimple,
  IdentificationCard,
} from "~/components/shared/icons";
import { KycStatus } from "~/lib/enums/finance";
import type { useProfileForm } from "./useProfileForm";

type KycTabProps = ReturnType<typeof useProfileForm>;

export function KycTab({
  kyc,
  kycValidationError,
  frontPreviewUrl,
  backPreviewUrl,
  scanning,
  ocrData,
  setOcrData,
  ocrFullName,
  setOcrFullName,
  ocrDob,
  setOcrDob,
  ocrGender,
  setOcrGender,
  ocrNationality,
  setOcrNationality,
  ocrOrigin,
  setOcrOrigin,
  ocrResidence,
  setOcrResidence,
  isSubmittingKyc,
  handleFrontFileChange,
  handleBackFileChange,
  handleScan,
  onKycSubmit,
}: KycTabProps) {
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

  if (
    kycStatusStr === "Approved" ||
    kycStatusStr === KycStatus.Approved.toString()
  ) {
    kycAlertMsg = "Tài khoản của bạn đã được xác minh danh tính thành công.";
    kycAlertColorClass = "border-[#D1E7DD] bg-[#EDF3EC] text-[#346538]";
  } else if (isRejected) {
    kycAlertMsg = "Hồ sơ xác minh CCCD của bạn đã bị từ chối.";
    kycAlertColorClass = "border-[#F5C2C7] bg-[#FDEBEC] text-[#9F2F2D]";
  }

  return (
    <div
      className="reveal-hidden p-6 bg-white transition-shadow duration-200"
      style={{
        border: "1px solid var(--mu-border)",
        borderRadius: "12px",
        transitionDelay: "50ms",
      }}
    >
      {/* Display KYC Alert status */}
      {kyc && kyc.status !== undefined && (
        <div
          className={`p-4 rounded-lg border text-sm flex gap-3 mb-8 ${kycAlertColorClass}`}
        >
          <Warning className="text-base shrink-0" />
          <div>
            <p className="font-semibold mb-1">{kycAlertMsg}</p>
            {isRejected && kyc.rejectionReason && (
              <p className="font-mono mt-1 text-[11px] opacity-90">
                Lý do từ chối: {kyc.rejectionReason}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Show verified info when KYC is approved or pending */}
      {isPendingOrApproved && (
        <div className="text-center py-8">
          <ShieldCheck className="text-4xl text-gray-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-gray-700 mb-1">
            {kycStatusStr === "Approved" ||
            kycStatusStr === KycStatus.Approved.toString()
              ? "Tài khoản đã xác minh danh tính"
              : "Hồ sơ đang chờ xét duyệt"}
          </p>
          <p className="text-sm text-gray-400 font-mono">
            {kycStatusStr === "Approved" ||
            kycStatusStr === KycStatus.Approved.toString()
              ? "Bạn đã hoàn tất xác minh CCCD thành công. Không cần thực hiện thêm thao tác nào."
              : "Hồ sơ KYC của bạn đang được xem xét. Vui lòng chờ kết quả từ bộ phận quản trị."}
          </p>
          {kyc?.idNumber && (
            <div className="mt-6 max-w-xs mx-auto text-left p-4 rounded-lg bg-gray-50 border border-gray-100">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-mono text-gray-400 uppercase text-sm">
                    Số CCCD
                  </span>
                  <span className="font-mono font-bold text-gray-700">
                    {kyc.idNumber}
                  </span>
                </div>
                {kyc.fullNameOnId && (
                  <div className="flex justify-between">
                    <span className="font-mono text-gray-400 uppercase text-sm">
                      Họ tên
                    </span>
                    <span className="font-medium text-gray-700">
                      {kyc.fullNameOnId}
                    </span>
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
              <div
                className="animate-spin inline-block w-8 h-8 border-[3px] border-current border-t-transparent text-black rounded-full mb-3"
                role="status"
              />
              <p className="text-sm text-gray-400 font-mono">
                Đang tải và nhận diện hình ảnh CCCD...
              </p>
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
                  <span className="block text-sm font-semibold text-gray-700 text-center">
                    Mặt trước CCCD
                  </span>
                  <label className="block border border-dashed border-[#EAEAEA] hover:border-black bg-gray-50/30 hover:bg-white rounded-lg p-6 cursor-pointer transition-all duration-200 text-center relative overflow-hidden h-48 flex flex-col items-center justify-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFrontFileChange}
                      className="hidden"
                    />
                    {frontPreviewUrl ? (
                      <img
                        src={frontPreviewUrl}
                        alt="Front preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center">
                        <UploadSimple className="text-2xl text-gray-400 mb-2" />
                        <span className="text-sm font-semibold text-gray-500">
                          Chọn ảnh mặt trước
                        </span>
                        <span className="text-sm text-gray-400 mt-1 font-mono">
                          JPG, PNG
                        </span>
                      </div>
                    )}
                  </label>
                </div>

                {/* Back Card */}
                <div className="space-y-3">
                  <span className="block text-sm font-semibold text-gray-700 text-center">
                    Mặt sau CCCD (Tùy chọn)
                  </span>
                  <label className="block border border-dashed border-[#EAEAEA] hover:border-black bg-gray-50/30 hover:bg-white rounded-lg p-6 cursor-pointer transition-all duration-200 text-center relative overflow-hidden h-48 flex flex-col items-center justify-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBackFileChange}
                      className="hidden"
                    />
                    {backPreviewUrl ? (
                      <img
                        src={backPreviewUrl}
                        alt="Back preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center">
                        <UploadSimple className="text-2xl text-gray-400 mb-2" />
                        <span className="text-sm font-semibold text-gray-500">
                          Chọn ảnh mặt sau
                        </span>
                        <span className="text-sm text-gray-400 mt-1 font-mono">
                          JPG, PNG
                        </span>
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
                  <IdentificationCard className="text-base" />
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
                    <ShieldCheck className="text-sm" />
                    {isSubmittingKyc ? "Đang gửi hồ sơ..." : "Gửi yêu cầu xác thực"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
