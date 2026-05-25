import { useState } from "react";
import { Link } from "react-router";
import { staffAssignmentsApi } from "~/lib/api/orders";
import { SlaCountdown } from "~/components/admin/SlaCountdown";
import { Button } from "~/components/ui/Button";
import { formatDate } from "~/lib/utils/format";
import type { StaffWorkloadDto, OverdueAssignmentDto } from "~/lib/types/order";
import type { Route } from "./+types/staff-dashboard";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Staff Dashboard — MuaHo Admin" }];
}

// Danh sách staffId tạm hardcode, Phase 10 lấy từ Auth service
const KNOWN_STAFF_IDS: string[] = [];

export async function clientLoader() {
  const overdueRes = await staffAssignmentsApi.getOverdue();
  const overdueList = overdueRes.data as OverdueAssignmentDto[];

  // Lấy workload cho từng staff được biết
  const workloads: StaffWorkloadDto[] = [];
  for (const id of KNOWN_STAFF_IDS) {
    try {
      const r = await staffAssignmentsApi.getWorkload(id);
      workloads.push(r.data as StaffWorkloadDto);
    } catch {
      // bỏ qua staff không tìm thấy
    }
  }

  return { overdueList, workloads };
}

export default function StaffDashboardPage({
  loaderData,
}: {
  loaderData: { overdueList: OverdueAssignmentDto[]; workloads: StaffWorkloadDto[] };
}) {
  const { overdueList, workloads } = loaderData;
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reassignOrderId, setReassignOrderId] = useState<string | null>(null);
  const [newStaffId, setNewStaffId] = useState("");

  async function handleReassign(orderId: string) {
    if (!newStaffId.trim()) { setError("Vui lòng nhập Staff ID."); return; }
    setLoading(true);
    setError(null);
    try {
      await staffAssignmentsApi.reassign(orderId, newStaffId.trim());
      setSuccess(`Đã reassign đơn ${orderId.slice(0, 8)}…`);
      setReassignOrderId(null);
      setNewStaffId("");
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Lỗi khi reassign.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Theo dõi workload và SLA của nhân viên mua hàng.
        </p>
      </div>

      {error   && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      {/* ── Overdue section ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Đơn quá SLA
            {overdueList.length > 0 && (
              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                {overdueList.length}
              </span>
            )}
          </h2>
          <Link
            to="/admin/assignments/overdue"
            className="text-sm text-primary hover:underline"
          >
            Xem tất cả →
          </Link>
        </div>

        {overdueList.length === 0 ? (
          <p className="text-sm text-gray-500">Không có đơn nào quá SLA ✓</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Mã đơn", "Staff ID", "SLA Deadline", "Quá hạn", "Trạng thái", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {overdueList.map((a) => (
                  <tr key={a.assignmentId} className="hover:bg-red-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/orders/${a.orderId}`}
                        className="font-mono text-sm font-medium text-primary hover:underline"
                      >
                        {a.orderCode}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {a.staffId.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(a.slaDeadline)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        {Math.floor(a.overdueByMinutes / 60)}h {a.overdueByMinutes % 60}p
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{a.orderStatus}</td>
                    <td className="px-4 py-3">
                      {reassignOrderId === a.orderId ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={newStaffId}
                            onChange={(e) => setNewStaffId(e.target.value)}
                            placeholder="Staff UUID"
                            className="w-48 rounded border border-gray-300 px-2 py-1 text-xs"
                          />
                          <Button size="sm" loading={loading} onClick={() => handleReassign(a.orderId)}>
                            Xác nhận
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setReassignOrderId(null)}>
                            Hủy
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => { setReassignOrderId(a.orderId); setNewStaffId(""); }}
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
      </section>

      {/* ── Workload section ── */}
      {workloads.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Workload nhân viên</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workloads.map((w) => (
              <div
                key={w.staffId}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <p className="font-mono text-xs text-gray-400">{w.staffId.slice(0, 12)}…</p>
                <div className="mt-3 flex gap-6">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{w.activeCount}</p>
                    <p className="text-xs text-gray-500">Đơn đang xử lý</p>
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${w.overdueCount > 0 ? "text-red-600" : "text-gray-900"}`}>
                      {w.overdueCount}
                    </p>
                    <p className="text-xs text-gray-500">Quá SLA</p>
                  </div>
                </div>
                {/* SLA nearest deadline */}
                {w.assignments.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1 text-xs text-gray-500">Deadline gần nhất</p>
                    <SlaCountdown deadline={w.assignments[0].slaDeadline} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
