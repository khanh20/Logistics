import { Link, redirect } from "react-router";
import { store } from "~/lib/feature/store";
import { insuranceClaimsApi } from "~/lib/api/logistics";
import { InsuranceClaimStatusBadge } from "~/components/shared/ClaimStatusBadge";
import { formatVND, formatDate } from "~/lib/utils/format";
import type { InsuranceClaim } from "~/lib/types/logistics";
import type { Route } from "./+types/claims.insurance.$id";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Bồi thường bảo hiểm — MuaHo" }];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const { token } = store.getState().authState;
  if (!token) throw redirect("/login");

  const res = await insuranceClaimsApi.getDetail(params.id!);
  if (!res.data)
    throw new Response("Không tìm thấy yêu cầu bồi thường", { status: 404 });
  return { claim: res.data };
}

export default function InsuranceClaimDetailPage({
  loaderData,
}: {
  loaderData: { claim: InsuranceClaim };
}) {
  const { claim } = loaderData;

  const infoRows: { label: string; value: React.ReactNode }[] = [
    {
      label: "Kiện hàng",
      value: (
        <Link
          to={`/packages/${claim.packageId}`}
          className="font-mono text-primary hover:underline"
        >
          {claim.barcode}
        </Link>
      ),
    },
    {
      label: "Đơn hàng",
      value: (
        <Link
          to={`/orders/${claim.orderId}`}
          className="text-primary hover:underline"
        >
          Xem đơn
        </Link>
      ),
    },
    {
      label: "Số tiền được duyệt",
      value:
        claim.approvedAmount != null ? (
          <span className="font-semibold text-green-600">
            {formatVND(claim.approvedAmount)}
          </span>
        ) : (
          "Chưa duyệt"
        ),
    },
    { label: "Ngày gửi", value: formatDate(claim.createdAt) },
    { label: "Cập nhật", value: formatDate(claim.updatedAt) },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        to="/claims"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
      >
        <span className="mr-2">←</span> Khiếu nại
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold text-gray-900">
          Bồi thường bảo hiểm
        </h1>
        <InsuranceClaimStatusBadge status={claim.status} />
      </div>
      {/* BE không có list yêu cầu bồi thường cho khách → nhắc giữ link trang này. */}
      <p className="text-xs text-gray-400 mb-6">
        Lưu lại đường dẫn trang này để theo dõi — yêu cầu bồi thường không hiển
        thị trong danh sách khiếu nại.
      </p>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Thông tin</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {infoRows.map((r) => (
            <div key={r.label} className="contents">
              <span className="text-gray-500">{r.label}</span>
              <span className="text-right font-medium text-gray-900">
                {r.value}
              </span>
            </div>
          ))}
        </div>
        {claim.adjusterNote && (
          <p className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-700">
            <span className="text-gray-500">Ghi chú thẩm định: </span>
            {claim.adjusterNote}
          </p>
        )}
        {claim.damagePhotos.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-2">
              Ảnh thiệt hại
            </p>
            <ul className="space-y-1">
              {claim.damagePhotos.map((url) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline break-all"
                  >
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {claim.missingClaimId && (
        <Link
          to={`/claims/${claim.missingClaimId}`}
          className="text-sm text-primary hover:underline"
        >
          ← Xem khiếu nại thất lạc liên quan
        </Link>
      )}
    </div>
  );
}
