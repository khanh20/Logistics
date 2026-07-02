import { Link, redirect } from "react-router";
import { store } from "~/lib/feature/store";
import { missingClaimsApi } from "~/lib/api/logistics";
import { MissingClaimStatusBadge } from "~/components/shared/ClaimStatusBadge";
import { formatVND, formatDate } from "~/lib/utils/format";
import { MISSING_CLAIM_RESOLUTION_LABEL } from "~/lib/constants/logistics";
import type { MissingClaim } from "~/lib/types/logistics";
import type { Route } from "./+types/claims.$id";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Chi tiết khiếu nại — MuaHo" }];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const { token } = store.getState().authState;
  if (!token) throw redirect("/login");

  const res = await missingClaimsApi.getDetail(params.id!);
  if (!res.data) throw new Response("Không tìm thấy khiếu nại", { status: 404 });
  return { claim: res.data };
}

export default function ClaimDetailPage({
  loaderData,
}: {
  loaderData: { claim: MissingClaim };
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
      label: "Giá trị khai báo",
      value: claim.claimedValueVnd != null ? formatVND(claim.claimedValueVnd) : "—",
    },
    {
      label: "Mức bảo hiểm",
      value:
        claim.insuranceCoveragePct != null
          ? `${Math.round(claim.insuranceCoveragePct * 100)}% giá trị`
          : "Không có bảo hiểm",
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

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Khiếu nại thất lạc
        </h1>
        <MissingClaimStatusBadge status={claim.status} />
      </div>

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
        {claim.description && (
          <p className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-700 whitespace-pre-wrap">
            {claim.description}
          </p>
        )}
        {claim.evidenceUrls.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-2">
              Chứng cứ đính kèm
            </p>
            <ul className="space-y-1">
              {claim.evidenceUrls.map((url) => (
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

      {/* Kết quả xử lý */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          Kết quả xử lý
        </h2>
        {claim.resolution == null && claim.staffNote == null ? (
          <p className="text-sm text-gray-400 italic">
            Khiếu nại đang chờ bộ phận CSKH xử lý.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {claim.resolution && (
              <>
                <span className="text-gray-500">Hình thức</span>
                <span className="text-right font-medium text-gray-900">
                  {MISSING_CLAIM_RESOLUTION_LABEL[claim.resolution]}
                </span>
              </>
            )}
            {claim.resolvedAmountVnd != null && (
              <>
                <span className="text-gray-500">Số tiền bồi thường</span>
                <span className="text-right font-semibold text-green-600">
                  {formatVND(claim.resolvedAmountVnd)}
                </span>
              </>
            )}
            {claim.staffNote && (
              <>
                <span className="text-gray-500">Ghi chú CSKH</span>
                <span className="text-right text-gray-800">
                  {claim.staffNote}
                </span>
              </>
            )}
          </div>
        )}
        {claim.insuranceClaimId && (
          <Link
            to={`/claims/insurance/${claim.insuranceClaimId}`}
            className="inline-block mt-4 text-sm text-primary hover:underline"
          >
            Xem yêu cầu bồi thường bảo hiểm →
          </Link>
        )}
      </div>
    </div>
  );
}
