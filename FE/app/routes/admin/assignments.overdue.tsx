import { useState } from "react";
import { Link } from "react-router";
import { staffAssignmentsApi } from "~/lib/api/orders";
import { Button } from "~/components/ui/Button";
import { formatDate } from "~/lib/utils/format";
import type { OverdueAssignmentDto } from "~/lib/types/order";
import type { Route } from "./+types/assignments.overdue";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Đơn quá SLA — MuaHo Admin" }];
}

export async function clientLoader() {
  const res = await staffAssignmentsApi.getOverdue();
  return { list: res.data as OverdueAssignmentDto[] };
}

export default function OverdueAssignmentsPage({
  loaderData,
}: {
  loaderData: { list: OverdueAssignmentDto[] };
}) {
  const [list, setList] = useState(loaderData.list);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reassignOrderId, setReassignOrderId] = useState<string | null>(null);
  const [newStaffId, setNewStaffId] = useState("");

  async function handleReassign(item: OverdueAssignmentDto) {
    if (!newStaffId.trim()) { setError("Vui lòng nhập Staff ID."); return; }
    setLoading(true);
    setError(null);
    try {
      await staffAssignmentsApi.reassign(item.orderId, newStaffId.trim(), "Reassign từ overdue dashboard");
      setSuccess(`Đã reassign đơn ${item.orderCode}.`);
      setList((prev) => prev.filter((a) => a.orderId !== item.orderId));
      setReassignOrderId(null);
      setNewStaffId("");
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Lỗi khi reassign.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Đơn quá SLA</h1>
          <p className="mt-1 text-sm text-gray-500">
            {list.length} đơn đã vượt quá thời hạn xử lý
          </p>
        </div>
        <Link to="/admin/staff-dashboard" className="text-sm text-primary hover:underline">
          ← Staff Dashboard
        </Link>
      </div>

      {error   && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      {list.length === 0 ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
          <p className="text-lg font-medium text-green-700">Không có đơn quá SLA ✓</p>
          <p className="mt-1 text-sm text-green-600">Tất cả đơn đang được xử lý đúng hạn.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Mã đơn", "Staff phụ trách", "SLA Deadline", "Quá hạn", "Trạng thái đơn", "Thao tác"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {list.map((item) => (
                <tr key={item.assignmentId} className="hover:bg-red-50">
                  <td className="px-4 py-4">
                    <Link
                      to={`/admin/orders/${item.orderId}`}
                      className="font-mono text-sm font-semibold text-primary hover:underline"
                    >
                      {item.orderCode}
                    </Link>
                  </td>
                  <td className="px-4 py-4 font-mono text-xs text-gray-500">
                    {item.staffId.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    {formatDate(item.slaDeadline)}
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                      ⚠️ {Math.floor(item.overdueByMinutes / 60)}h {item.overdueByMinutes % 60}p
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    {item.orderStatus}
                  </td>
                  <td className="px-4 py-4">
                    {reassignOrderId === item.orderId ? (
                      <div className="flex flex-col gap-2">
                        <input
                          value={newStaffId}
                          onChange={(e) => setNewStaffId(e.target.value)}
                          placeholder="Nhập Staff UUID mới"
                          className="w-56 rounded border border-gray-300 px-2 py-1 text-xs focus:border-primary focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            loading={loading}
                            onClick={() => handleReassign(item)}
                          >
                            Xác nhận
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setReassignOrderId(null)}
                          >
                            Hủy
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => { setReassignOrderId(item.orderId); setNewStaffId(""); }}
                      >
                        Reassign
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
