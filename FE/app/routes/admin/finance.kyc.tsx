import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import {
  PiEyeBold,
  PiCheckCircleBold,
  PiXCircleBold,
  PiXBold,
  PiCheckBold,
  PiCopyBold,
  PiWarningCircleBold
} from "react-icons/pi";
import { Button } from "~/components/ui/Button";
import { Textarea } from "~/components/ui/Textarea";

import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import { ReduxStatus } from "~/lib/feature/const";
import { fetchAdminKycs, approveAdminKyc, rejectAdminKyc } from "~/lib/feature/adminFinance/adminFinanceThunk";

function StatusBadge({ status }: { status: string }) {
  let classes = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ";
  if (status === "Approved") {
    classes += "bg-green-50 text-green-700 border-green-200/60";
  } else if (status === "Pending") {
    classes += "bg-amber-50 text-amber-700 border-amber-200/60";
  } else if (status === "Rejected") {
    classes += "bg-rose-50 text-rose-700 border-rose-200/60";
  } else {
    classes += "bg-gray-50 text-gray-700 border-gray-200/60";
  }

  const label = status === "Approved" ? "Đã duyệt" : status === "Pending" ? "Chờ duyệt" : status === "Rejected" ? "Từ chối" : status;
  return <span className={classes}>{label}</span>;
}

function CopyableText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="inline-flex items-center gap-1 group font-mono text-sm text-[#2F3437]">
      <span>{text}</span>
      <button
        onClick={handleCopy}
        className="text-gray-400 hover:text-black opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
        title="Copy"
      >
        {copied ? <PiCheckBold className="text-green-600 text-xs" /> : <PiCopyBold className="text-xs" />}
      </button>
    </div>
  );
}

export default function AdminFinanceKycPage() {
  const dispatch = useAppDispatch();
  const { kycs, status } = useAppSelector((state) => state.adminFinanceState);

  const [selectedKyc, setSelectedKyc] = useState<any>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [approvingKycId, setApprovingKycId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchAdminKycs());
  }, [dispatch]);

  const executeApproveKyc = async (id: string) => {
    setApprovingKycId(null);
    setActionLoading(true);
    try {
      await dispatch(approveAdminKyc(id)).unwrap();
      toast.success("Phê duyệt KYC thành công");
      setIsReviewModalOpen(false);
    } catch (error: any) {
      toast.error(error || "Lỗi phê duyệt");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = (id: string) => {
    setApprovingKycId(id);
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKyc || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await dispatch(rejectAdminKyc({ id: selectedKyc.id, reason: rejectReason })).unwrap();
      toast.success("Từ chối KYC thành công");
      setIsRejectModalOpen(false);
      setIsReviewModalOpen(false);
      setRejectReason("");
    } catch (error: any) {
      toast.error(error || "Lỗi từ chối");
    } finally {
      setActionLoading(false);
    }
  };

  const isLoading = status === ReduxStatus.LOADING;

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-bold text-black mb-1">Xác thực danh tính KYC</h1>
        <p className="text-sm text-gray-500">Quản lý hồ sơ định danh và xác thực thông tin khách hàng</p>
      </div>


      {/* Table List Card */}
      <div className="bg-white border border-[#EAEAEA] rounded-lg shadow-sm overflow-hidden">
        {isLoading && kycs.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-[#EAEAEA]">
                  <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Ngày tạo</th>
                  <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Họ tên</th>
                  <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Số CMND/CCCD</th>
                  <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Trạng thái</th>
                  <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEAEA]">
                {kycs.map((record: any) => (
                  <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-6 text-gray-500">
                      {dayjs(record.createdDate).format("DD/MM/YYYY HH:mm")}
                    </td>
                    <td className="py-3.5 px-6 font-semibold text-black">
                      {record.fullNameOnId}
                    </td>
                    <td className="py-3.5 px-6">
                      <CopyableText text={record.idNumber} />
                    </td>
                    <td className="py-3.5 px-6">
                      <StatusBadge status={record.status} />
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedKyc(record);
                          setIsReviewModalOpen(true);
                        }}
                      >
                        <PiEyeBold />
                        Chi tiết
                      </Button>
                    </td>
                  </tr>
                ))}
                {kycs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-400">
                      Không tìm thấy hồ sơ KYC nào cần duyệt.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {isReviewModalOpen && selectedKyc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#EAEAEA] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col font-sans">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAEAEA]">
              <h2 className="text-lg font-serif font-bold text-black">Chi tiết hồ sơ KYC</h2>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="text-gray-400 hover:text-black transition-colors p-1"
              >
                <PiXBold className="text-lg" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-y-auto">
              {/* Extract Data Descriptions */}
              <div>
                <h3 className="text-sm font-mono uppercase tracking-wider text-gray-400 mb-4">Thông tin trích xuất</h3>
                <div className="border border-[#EAEAEA] rounded-lg overflow-hidden divide-y divide-[#EAEAEA] text-sm">
                  <div className="grid grid-cols-3 py-3 px-4">
                    <span className="text-xs font-mono uppercase text-gray-500">Họ và tên</span>
                    <span className="col-span-2 text-black font-semibold">{selectedKyc.fullNameOnId}</span>
                  </div>
                  <div className="grid grid-cols-3 py-3 px-4">
                    <span className="text-xs font-mono uppercase text-gray-500">Số CMND/CCCD</span>
                    <span className="col-span-2 text-black font-mono font-medium">{selectedKyc.idNumber}</span>
                  </div>
                  <div className="grid grid-cols-3 py-3 px-4">
                    <span className="text-xs font-mono uppercase text-gray-500">Ngày sinh</span>
                    <span className="col-span-2 text-black">
                      {selectedKyc.dateOfBirthOnId ? dayjs(selectedKyc.dateOfBirthOnId).format("DD/MM/YYYY") : ""}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 py-3 px-4">
                    <span className="text-xs font-mono uppercase text-gray-500">Giới tính</span>
                    <span className="col-span-2 text-black">{selectedKyc.gender}</span>
                  </div>
                  <div className="grid grid-cols-3 py-3 px-4">
                    <span className="text-xs font-mono uppercase text-gray-500">Quê quán</span>
                    <span className="col-span-2 text-black leading-relaxed">{selectedKyc.placeOfOrigin}</span>
                  </div>
                  <div className="grid grid-cols-3 py-3 px-4">
                    <span className="text-xs font-mono uppercase text-gray-500">Thường trú</span>
                    <span className="col-span-2 text-black leading-relaxed">{selectedKyc.placeOfResidence}</span>
                  </div>
                  <div className="grid grid-cols-3 py-3 px-4">
                    <span className="text-xs font-mono uppercase text-gray-500">Trạng thái</span>
                    <span className="col-span-2">
                      <StatusBadge status={selectedKyc.status} />
                    </span>
                  </div>
                  {selectedKyc.rejectionReason && (
                    <div className="grid grid-cols-3 py-3 px-4 bg-rose-50/50">
                      <span className="text-xs font-mono uppercase text-gray-500">Lý do từ chối</span>
                      <span className="col-span-2 text-rose-600 font-semibold">{selectedKyc.rejectionReason}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ID Card Images */}
              <div>
                <h3 className="text-sm font-mono uppercase tracking-wider text-gray-400 mb-4">Ảnh giấy tờ tùy thân</h3>
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-2">Mặt trước</p>
                    {selectedKyc.idFrontUrl ? (
                      <div className="border border-[#EAEAEA] rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center p-2">
                        <img
                          src={selectedKyc.idFrontUrl}
                          alt="Mặt trước ID Card"
                          className="max-h-[160px] object-contain rounded"
                        />
                      </div>
                    ) : (
                      <div className="bg-gray-100 p-8 text-center text-gray-400 rounded-lg border border-dashed border-gray-200">
                        Không có ảnh mặt trước
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-2">Mặt sau</p>
                    {selectedKyc.idBackUrl ? (
                      <div className="border border-[#EAEAEA] rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center p-2">
                        <img
                          src={selectedKyc.idBackUrl}
                          alt="Mặt sau ID Card"
                          className="max-h-[160px] object-contain rounded"
                        />
                      </div>
                    ) : (
                      <div className="bg-gray-100 p-8 text-center text-gray-400 rounded-lg border border-dashed border-gray-200">
                        Không có ảnh mặt sau
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#EAEAEA] flex justify-end gap-3 bg-gray-50">
              <Button
                variant="secondary"
                onClick={() => setIsReviewModalOpen(false)}
              >
                Đóng
              </Button>

              {selectedKyc.status === "Pending" && (
                <>
                  <Button
                    variant="danger"
                    onClick={() => setIsRejectModalOpen(true)}
                    loading={actionLoading}
                  >
                    <PiXCircleBold />
                    Từ chối
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleApprove(selectedKyc.id)}
                    loading={actionLoading}
                  >
                    <PiCheckCircleBold />
                    Phê duyệt
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Dialog Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white border border-[#EAEAEA] rounded-lg max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAEAEA] mb-4">
              <h3 className="text-base font-serif font-bold text-black">Từ chối hồ sơ KYC</h3>
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <PiXBold />
              </button>
            </div>

            <form onSubmit={handleReject}>
              <div className="mb-4">
                <Textarea
                  label="Lý do từ chối"
                  rows={4}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ví dụ: Ảnh mặt sau bị mờ, không khớp thông tin đăng ký..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsRejectModalOpen(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  loading={actionLoading}
                >
                  Xác nhận từ chối
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: APPROVE KYC CONFIRM */}
      {approvingKycId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#EAEAEA] rounded-lg max-w-sm w-full p-6 shadow-2xl flex flex-col font-sans">
            <div className="space-y-3">
              <h4 className="text-base font-serif font-bold text-black flex items-center gap-1.5">
                <PiWarningCircleBold className="text-primary text-lg" />
                Xác nhận phê duyệt KYC
              </h4>
              <p className="text-xs text-gray-600 leading-normal">
                Bạn có chắc chắn muốn phê duyệt hồ sơ KYC này không? Thao tác này sẽ nâng cấp trạng thái xác thực của khách hàng.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[#EAEAEA] mt-5">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setApprovingKycId(null)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => executeApproveKyc(approvingKycId)}
                loading={actionLoading}
              >
                Xác nhận duyệt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
