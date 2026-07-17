import { useState } from "react";
import { Link, redirect, useNavigate, useRevalidator } from "react-router";
import { Button, Form, Input, InputNumber, Modal, Select, message } from "antd";
import { store } from "~/lib/feature/store";
import { missingClaimsApi, insuranceClaimsApi, myPackagesApi } from "~/lib/api/logistics";
import { MissingClaimStatusBadge, InsuranceClaimStatusBadge } from "~/components/shared/ClaimStatusBadge";
import { formatVND, formatDate, numberFormatter, numberParser } from "~/lib/utils/format";
import { normalizeError } from "~/lib/utils/errors";
import {
  PACKAGE_STATUS_LABEL,
  MISSING_CLAIM_RESOLUTION_LABEL,
  CLAIM_ERROR_MESSAGE,
} from "~/lib/constants/logistics";
import type { InsuranceClaim, MissingClaim, PackageSummary } from "~/lib/types/logistics";
import type { Route } from "./+types/claims._index";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Khiếu nại — MuaHo" }];
}

export async function clientLoader() {
  const { token } = store.getState().authState;
  if (!token) throw redirect("/login");

  const [claimRes, insuranceRes, pkgRes] = await Promise.all([
    missingClaimsApi.listMine(),
    insuranceClaimsApi.listMine(),
    myPackagesApi.list(),
  ]);
  return {
    claims: claimRes.data ?? [],
    insuranceClaims: insuranceRes.data ?? [],
    packages: pkgRes.data ?? [],
  };
}

function errMsg(err: unknown, fallback: string) {
  const n = normalizeError(err);
  return (n.code && CLAIM_ERROR_MESSAGE[n.code]) || n.message || fallback;
}

// Textarea "mỗi dòng 1 URL" → string[]
function parseUrls(raw?: string): string[] | undefined {
  const urls = (raw ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  return urls.length > 0 ? urls : undefined;
}

export default function ClaimsPage({
  loaderData,
}: {
  loaderData: {
    claims: MissingClaim[];
    insuranceClaims: InsuranceClaim[];
    packages: PackageSummary[];
  };
}) {
  const { claims, insuranceClaims, packages } = loaderData;
  const navigate = useNavigate();
  const revalidator = useRevalidator();

  const [missingOpen, setMissingOpen] = useState(false);
  const [missingForm] = Form.useForm();
  const [creatingMissing, setCreatingMissing] = useState(false);

  const [insuranceOpen, setInsuranceOpen] = useState(false);
  const [insuranceForm] = Form.useForm();
  const [creatingInsurance, setCreatingInsurance] = useState(false);

  // Chỉ kiện đã mua bảo hiểm mới tạo được yêu cầu bồi thường (PACKAGE_NOT_INSURED).
  const insuredPackages = packages.filter((p) => p.insuranceOpted);

  const packageOption = (p: PackageSummary) => ({
    value: p.id,
    label: `${p.barcode} · ${PACKAGE_STATUS_LABEL[p.status] ?? p.status}`,
  });

  const handleCreateMissing = async () => {
    const values = await missingForm.validateFields();
    setCreatingMissing(true);
    try {
      await missingClaimsApi.create({
        packageId: values.packageId,
        description: values.description,
        evidenceUrls: parseUrls(values.evidenceUrls),
        claimedValueVnd: values.claimedValueVnd ?? undefined,
      });
      message.success("Đã gửi khiếu nại thất lạc.");
      setMissingOpen(false);
      missingForm.resetFields();
      revalidator.revalidate();
    } catch (err) {
      message.error(errMsg(err, "Gửi khiếu nại thất bại."));
    } finally {
      setCreatingMissing(false);
    }
  };

  const handleCreateInsurance = async () => {
    const values = await insuranceForm.validateFields();
    setCreatingInsurance(true);
    try {
      const res = await insuranceClaimsApi.create({
        packageId: values.packageId,
        claimedAmountVnd: values.claimedAmountVnd,
        description: values.description,
        damagePhotos: parseUrls(values.damagePhotos),
      });
      message.success("Đã gửi yêu cầu bồi thường bảo hiểm.");
      setInsuranceOpen(false);
      insuranceForm.resetFields();
      if (res.data) navigate(`/claims/insurance/${res.data.id}`);
    } catch (err) {
      message.error(errMsg(err, "Gửi yêu cầu bồi thường thất bại."));
      setCreatingInsurance(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Khiếu nại</h1>
        <div className="flex gap-2">
          <Button onClick={() => setInsuranceOpen(true)}>
            Bồi thường bảo hiểm
          </Button>
          <Button type="primary" onClick={() => setMissingOpen(true)}>
            + Khiếu nại thất lạc
          </Button>
        </div>
      </div>

      {claims.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-500">Bạn chưa có khiếu nại nào.</p>
          <p className="text-xs text-gray-400 mt-2">
            Tạo khiếu nại thất lạc nếu kiện hàng quá lâu chưa về, hoặc yêu cầu
            bồi thường bảo hiểm nếu hàng hư hỏng.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((c) => (
            <Link
              key={c.id}
              to={`/claims/${c.id}`}
              className="block bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <MissingClaimStatusBadge status={c.status} />
                    <span className="text-xs font-mono text-gray-500">
                      {c.barcode}
                    </span>
                  </div>
                  {c.description && (
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {c.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    Gửi ngày {formatDate(c.createdAt)}
                    {c.resolution
                      ? ` · ${MISSING_CLAIM_RESOLUTION_LABEL[c.resolution]}`
                      : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {c.resolvedAmountVnd != null
                      ? formatVND(c.resolvedAmountVnd)
                      : c.claimedValueVnd != null
                        ? formatVND(c.claimedValueVnd)
                        : "—"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {c.resolvedAmountVnd != null ? "đã bồi thường" : "giá trị khai"}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Yêu cầu bồi thường bảo hiểm của tôi */}
      {insuranceClaims.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Yêu cầu bồi thường bảo hiểm
          </h2>
          <div className="space-y-3">
            {insuranceClaims.map((c) => (
              <Link
                key={c.id}
                to={`/claims/insurance/${c.id}`}
                className="block bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <InsuranceClaimStatusBadge status={c.status} />
                      <span className="text-xs font-mono text-gray-500">
                        {c.barcode}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Gửi ngày {formatDate(c.createdAt)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {c.approvedAmount != null ? formatVND(c.approvedAmount) : "—"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {c.approvedAmount != null ? "được duyệt" : "chờ duyệt"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Khiếu nại thất lạc */}
      <Modal
        open={missingOpen}
        title="Khiếu nại thất lạc hàng"
        onCancel={() => setMissingOpen(false)}
        onOk={handleCreateMissing}
        okText="Gửi khiếu nại"
        confirmLoading={creatingMissing}
        destroyOnClose
      >
        <Form form={missingForm} layout="vertical" requiredMark="optional">
          <Form.Item
            name="packageId"
            label="Kiện hàng"
            rules={[{ required: true, message: "Chọn kiện hàng." }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Chọn kiện bị thất lạc"
              options={packages.map(packageOption)}
            />
          </Form.Item>
          <Form.Item
            name="description"
            label="Mô tả"
            rules={[{ required: true, message: "Mô tả tình trạng thất lạc." }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="VD: Kiện báo về kho VN từ 2 tuần trước nhưng chưa nhận được..."
            />
          </Form.Item>
          <Form.Item name="claimedValueVnd" label="Giá trị hàng (VND)">
            <InputNumber
              className="w-full"
              min={0}
              addonAfter="₫"
              formatter={numberFormatter}
              parser={numberParser}
            />
          </Form.Item>
          <Form.Item
            name="evidenceUrls"
            label="Ảnh/chứng cứ (mỗi dòng 1 URL)"
          >
            <Input.TextArea rows={2} placeholder="https://..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Yêu cầu bồi thường bảo hiểm */}
      <Modal
        open={insuranceOpen}
        title="Yêu cầu bồi thường bảo hiểm"
        onCancel={() => setInsuranceOpen(false)}
        onOk={handleCreateInsurance}
        okText="Gửi yêu cầu"
        confirmLoading={creatingInsurance}
        okButtonProps={{ disabled: insuredPackages.length === 0 }}
        destroyOnClose
      >
        {insuredPackages.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">
            Bạn chưa có kiện nào mua bảo hiểm. Chỉ kiện có gói bảo hiểm mới được
            bồi thường.
          </p>
        ) : (
          <Form form={insuranceForm} layout="vertical" requiredMark="optional">
            <Form.Item
              name="packageId"
              label="Kiện hàng (đã mua bảo hiểm)"
              rules={[{ required: true, message: "Chọn kiện hàng." }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Chọn kiện cần bồi thường"
                options={insuredPackages.map(packageOption)}
              />
            </Form.Item>
            <Form.Item
              name="claimedAmountVnd"
              label="Số tiền yêu cầu (VND)"
              rules={[{ required: true, message: "Nhập số tiền yêu cầu." }]}
            >
              <InputNumber
                className="w-full"
                min={0}
                addonAfter="₫"
                formatter={numberFormatter}
                parser={numberParser}
              />
            </Form.Item>
            <Form.Item
              name="description"
              label="Mô tả thiệt hại"
              rules={[{ required: true, message: "Mô tả thiệt hại." }]}
            >
              <Input.TextArea
                rows={3}
                placeholder="VD: Hàng vỡ khi nhận, ảnh đính kèm bên dưới..."
              />
            </Form.Item>
            <Form.Item name="damagePhotos" label="Ảnh thiệt hại (mỗi dòng 1 URL)">
              <Input.TextArea rows={2} placeholder="https://..." />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}
