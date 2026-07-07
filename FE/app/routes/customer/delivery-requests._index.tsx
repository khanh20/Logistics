import { Link, redirect } from "react-router";
import { store } from "~/lib/feature/store";
import { deliveryRequestsApi } from "~/lib/api/logistics";
import { DeliveryStatusBadge } from "~/components/shared/DeliveryStatusBadge";
import { formatVND, formatDate } from "~/lib/utils/format";
import type { DeliveryRequest } from "~/lib/types/logistics";
import type { Route } from "./+types/delivery-requests._index";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Yêu cầu giao hàng — MuaHo" }];
}

export async function clientLoader() {
  const { token } = store.getState().authState;
  if (!token) throw redirect("/login");

  const res = await deliveryRequestsApi.list();
  return { items: res.data ?? [] };
}

export default function DeliveryRequestsPage({
  loaderData,
}: {
  loaderData: { items: DeliveryRequest[] };
}) {
  const { items } = loaderData;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Yêu cầu giao hàng</h1>
        <Link
          to="/delivery-requests/new"
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors"
        >
          + Tạo yêu cầu
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🚚</p>
          <p className="text-gray-500">
            Bạn chưa có yêu cầu giao hàng nào.
          </p>
          <Link
            to="/delivery-requests/new"
            className="inline-block mt-4 text-sm text-primary hover:underline"
          >
            Tạo yêu cầu giao cho kiện ở kho VN →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((req) => (
            <Link
              key={req.id}
              to={`/delivery-requests/${req.id}`}
              className="block bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <DeliveryStatusBadge status={req.status} />
                    {req.carrierName && (
                      <span className="text-xs text-gray-500">
                        {req.carrierName}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-800">
                    {req.packages.length} kiện
                    {req.preferredTimeSlot ? ` · ${req.preferredTimeSlot}` : ""}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Tạo ngày {formatDate(req.createdAt)}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {req.shipFeeVnd != null ? formatVND(req.shipFeeVnd) : "—"}
                  </p>
                  <p className="text-xs text-gray-400">cước nội địa</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
