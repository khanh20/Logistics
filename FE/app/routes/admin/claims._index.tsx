import { useState } from "react";
import {
  Alert,
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Table,
  Typography,
  message,
} from "antd";
import { missingClaimsApi, insuranceClaimsApi } from "~/lib/api/logistics";
import { useAuth } from "~/lib/hooks/useAuth";
import {
  MissingClaimStatusBadge,
  InsuranceClaimStatusBadge,
} from "~/components/shared/ClaimStatusBadge";
import {
  formatVND,
  formatDate,
  numberFormatter,
  numberParser,
} from "~/lib/utils/format";
import { normalizeError } from "~/lib/utils/errors";
import {
  MISSING_CLAIM_STATUSES,
  MISSING_CLAIM_STATUS_LABEL,
  MISSING_CLAIM_ACTIONABLE_STATUSES,
  MISSING_CLAIM_RESOLUTION_LABEL,
  CLAIM_ERROR_MESSAGE,
} from "~/lib/constants/logistics";
import type {
  InsuranceClaim,
  MissingClaim,
  MissingClaimStatus,
} from "~/lib/types/logistics";
import type { Route } from "./+types/claims._index";

const { Title } = Typography;

export function meta(_: Route.MetaArgs) {
  return [{ title: "Khiếu nại — Quản trị" }];
}

export async function clientLoader() {
  const res = await missingClaimsApi.list("Submitted");
  return { items: res.data ?? [] };
}

function errMsg(err: unknown, fallback: string) {
  const n = normalizeError(err);
  return (n.code && CLAIM_ERROR_MESSAGE[n.code]) || n.message || fallback;
}

export default function AdminClaimsPage({
  loaderData,
}: {
  loaderData: { items: MissingClaim[] };
}) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("complaint.manage");

  const [status, setStatus] = useState<MissingClaimStatus>("Submitted");
  const [items, setItems] = useState<MissingClaim[]>(loaderData.items);
  const [loading, setLoading] = useState(false);

  // Modal điều tra / xử lý / từ chối
  const [investigating, setInvestigating] = useState<MissingClaim | null>(null);
  const [investigateForm] = Form.useForm();
  const [resolving, setResolving] = useState<MissingClaim | null>(null);
  const [resolveForm] = Form.useForm();
  const [rejecting, setRejecting] = useState<MissingClaim | null>(null);
  const [rejectForm] = Form.useForm();
  const [acting, setActing] = useState(false);

  // Drawer bồi thường bảo hiểm (BE không có list → tra theo id)
  const [lookupId, setLookupId] = useState("");
  const [insurance, setInsurance] = useState<InsuranceClaim | null>(null);
  const [insuranceLoading, setInsuranceLoading] = useState(false);
  const [reviewing, setReviewing] = useState<"approve" | "reject" | null>(null);
  const [reviewForm] = Form.useForm();

  const reload = async (s: MissingClaimStatus) => {
    setLoading(true);
    try {
      const res = await missingClaimsApi.list(s);
      setItems(res.data ?? []);
    } catch (err) {
      message.error(errMsg(err, "Tải danh sách khiếu nại thất bại."));
    } finally {
      setLoading(false);
    }
  };

  const onStatusChange = (s: MissingClaimStatus) => {
    setStatus(s);
    reload(s);
  };

  const handleInvestigate = async () => {
    if (!investigating) return;
    const values = await investigateForm.validateFields();
    setActing(true);
    try {
      await missingClaimsApi.investigate(investigating.id, {
        staffNote: values.staffNote || undefined,
      });
      message.success("Đã chuyển sang điều tra.");
      setInvestigating(null);
      investigateForm.resetFields();
      reload(status);
    } catch (err) {
      message.error(errMsg(err, "Chuyển điều tra thất bại."));
    } finally {
      setActing(false);
    }
  };

  const handleResolve = async () => {
    if (!resolving) return;
    const values = await resolveForm.validateFields();
    setActing(true);
    try {
      await missingClaimsApi.resolve(resolving.id, {
        resolution: values.resolution,
        claimedValueVnd: values.claimedValueVnd ?? undefined,
        staffNote: values.staffNote || undefined,
      });
      message.success(
        values.resolution === "Refund"
          ? "Đã xử lý — tiền bồi thường sẽ hoàn về ví khách."
          : "Đã xử lý khiếu nại."
      );
      setResolving(null);
      resolveForm.resetFields();
      reload(status);
    } catch (err) {
      message.error(errMsg(err, "Xử lý khiếu nại thất bại."));
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    if (!rejecting) return;
    const values = await rejectForm.validateFields();
    setActing(true);
    try {
      await missingClaimsApi.reject(rejecting.id, { reason: values.reason });
      message.success("Đã từ chối khiếu nại.");
      setRejecting(null);
      rejectForm.resetFields();
      reload(status);
    } catch (err) {
      message.error(errMsg(err, "Từ chối khiếu nại thất bại."));
    } finally {
      setActing(false);
    }
  };

  const openInsurance = async (id: string) => {
    setInsuranceLoading(true);
    try {
      const res = await insuranceClaimsApi.getDetail(id);
      setInsurance(res.data ?? null);
      if (!res.data) message.warning("Không tìm thấy yêu cầu bồi thường.");
    } catch (err) {
      message.error(errMsg(err, "Tra cứu yêu cầu bồi thường thất bại."));
    } finally {
      setInsuranceLoading(false);
    }
  };

  const handleReview = async () => {
    if (!insurance || !reviewing) return;
    const values = await reviewForm.validateFields();
    setActing(true);
    try {
      const res = await insuranceClaimsApi.review(insurance.id, {
        status: reviewing === "approve" ? "Approved" : "Rejected",
        approvedAmountVnd:
          reviewing === "approve" ? values.approvedAmountVnd : undefined,
        notes: values.notes || undefined,
      });
      message.success(
        reviewing === "approve" ? "Đã duyệt bồi thường." : "Đã từ chối bồi thường."
      );
      setInsurance(res.data ?? insurance);
      setReviewing(null);
      reviewForm.resetFields();
    } catch (err) {
      message.error(errMsg(err, "Cập nhật yêu cầu bồi thường thất bại."));
    } finally {
      setActing(false);
    }
  };

  const handleSetUnderReview = async () => {
    if (!insurance) return;
    setActing(true);
    try {
      const res = await insuranceClaimsApi.review(insurance.id, {
        status: "UnderReview",
      });
      message.success("Đã chuyển sang thẩm định.");
      setInsurance(res.data ?? insurance);
    } catch (err) {
      message.error(errMsg(err, "Chuyển thẩm định thất bại."));
    } finally {
      setActing(false);
    }
  };

  const handlePay = async () => {
    if (!insurance) return;
    setActing(true);
    try {
      const res = await insuranceClaimsApi.pay(insurance.id);
      message.success("Đã chi trả bồi thường về ví khách.");
      setInsurance(res.data ?? insurance);
    } catch (err) {
      message.error(errMsg(err, "Chi trả bồi thường thất bại."));
    } finally {
      setActing(false);
    }
  };

  const columns = [
    {
      title: "Kiện hàng",
      dataIndex: "barcode",
      key: "barcode",
      render: (b: string) => <span className="font-mono text-xs">{b}</span>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (s: string) => <MissingClaimStatusBadge status={s} />,
    },
    {
      title: "Giá trị khai",
      dataIndex: "claimedValueVnd",
      key: "claimed",
      render: (v: number | null) => (v != null ? formatVND(v) : "—"),
    },
    {
      title: "Bảo hiểm",
      dataIndex: "insuranceCoveragePct",
      key: "coverage",
      render: (v: number | null) =>
        v != null && v > 0 ? `${Math.round(v * 100)}%` : "Không",
    },
    {
      title: "Đã bồi thường",
      dataIndex: "resolvedAmountVnd",
      key: "resolved",
      render: (v: number | null) => (v != null ? formatVND(v) : "—"),
    },
    {
      title: "Ngày gửi",
      dataIndex: "createdAt",
      key: "created",
      render: (d: string) => formatDate(d),
    },
    {
      title: "",
      key: "action",
      render: (_: unknown, r: MissingClaim) => {
        if (!canManage || !MISSING_CLAIM_ACTIONABLE_STATUSES.includes(r.status))
          return null;
        return (
          <div className="flex gap-1.5">
            {r.status === "Submitted" && (
              <Button size="small" onClick={() => setInvestigating(r)}>
                Điều tra
              </Button>
            )}
            <Button
              size="small"
              type="primary"
              onClick={() => {
                setResolving(r);
                resolveForm.setFieldsValue({
                  resolution: "Refund",
                  claimedValueVnd: r.claimedValueVnd ?? undefined,
                });
              }}
            >
              Xử lý
            </Button>
            <Button size="small" danger onClick={() => setRejecting(r)}>
              Từ chối
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Title level={3} className="!mb-0">
          Khiếu nại thất lạc
        </Title>
        {/* BE không có endpoint list insurance claims → tra cứu theo ID */}
        <div className="flex gap-2">
          <Input
            placeholder="ID yêu cầu bồi thường"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            onPressEnter={() => lookupId.trim() && openInsurance(lookupId.trim())}
            className="w-72"
            allowClear
          />
          <Button
            loading={insuranceLoading}
            onClick={() => lookupId.trim() && openInsurance(lookupId.trim())}
          >
            Tra cứu bồi thường
          </Button>
        </div>
      </div>

      <Segmented<MissingClaimStatus>
        value={status}
        onChange={onStatusChange}
        options={MISSING_CLAIM_STATUSES.map((s) => ({
          value: s,
          label: MISSING_CLAIM_STATUS_LABEL[s],
        }))}
        className="mb-4"
      />

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        pagination={false}
        expandable={{
          expandedRowRender: (r) => (
            <div className="text-sm text-gray-600 space-y-1">
              {r.description && <div>Mô tả: {r.description}</div>}
              {r.evidenceUrls.length > 0 && (
                <div>
                  Chứng cứ:{" "}
                  {r.evidenceUrls.map((url, i) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline mr-2"
                    >
                      [{i + 1}]
                    </a>
                  ))}
                </div>
              )}
              {r.resolution && (
                <div>
                  Hình thức: {MISSING_CLAIM_RESOLUTION_LABEL[r.resolution]}
                </div>
              )}
              {r.staffNote && <div>Ghi chú CSKH: {r.staffNote}</div>}
              {r.insuranceClaimId && (
                <Button
                  size="small"
                  type="link"
                  className="!px-0"
                  onClick={() => openInsurance(r.insuranceClaimId!)}
                >
                  Xem yêu cầu bồi thường liên kết →
                </Button>
              )}
            </div>
          ),
        }}
      />

      {/* Điều tra */}
      <Modal
        open={investigating != null}
        title={investigating ? `Điều tra khiếu nại — ${investigating.barcode}` : ""}
        onCancel={() => setInvestigating(null)}
        onOk={handleInvestigate}
        okText="Chuyển điều tra"
        confirmLoading={acting}
        destroyOnClose
      >
        <p className="text-sm text-gray-500 mb-4">
          So sánh ảnh nhập kho / xuất kho của kiện để xác minh thất lạc.
        </p>
        <Form form={investigateForm} layout="vertical" requiredMark="optional">
          <Form.Item name="staffNote" label="Ghi chú điều tra">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Xử lý */}
      <Modal
        open={resolving != null}
        title={resolving ? `Xử lý khiếu nại — ${resolving.barcode}` : ""}
        onCancel={() => setResolving(null)}
        onOk={handleResolve}
        okText="Xác nhận xử lý"
        confirmLoading={acting}
        destroyOnClose
      >
        {resolving &&
          (resolving.insuranceCoveragePct == null ||
            resolving.insuranceCoveragePct <= 0) && (
            <Alert
              type="warning"
              showIcon
              className="mb-4"
              message="Kiện không mua bảo hiểm — hoàn tiền sẽ bị BE từ chối (PACKAGE_NOT_INSURED). Chỉ có thể gửi lại hàng hoặc từ chối."
            />
          )}
        <Form form={resolveForm} layout="vertical" requiredMark="optional">
          <Form.Item
            name="resolution"
            label="Hình thức xử lý"
            rules={[{ required: true, message: "Chọn hình thức xử lý." }]}
          >
            <Select
              options={[
                { value: "Refund", label: MISSING_CLAIM_RESOLUTION_LABEL.Refund },
                { value: "Reship", label: MISSING_CLAIM_RESOLUTION_LABEL.Reship },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="claimedValueVnd"
            label="Giá trị bồi thường gốc (VND)"
            tooltip="Số tiền hoàn = giá trị × % bảo hiểm (basic 50% / full 100%). Để trống dùng giá trị khách khai."
          >
            <InputNumber
              className="w-full"
              min={0}
              addonAfter="₫"
              formatter={numberFormatter}
              parser={numberParser}
            />
          </Form.Item>
          <Form.Item name="staffNote" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Từ chối */}
      <Modal
        open={rejecting != null}
        title={rejecting ? `Từ chối khiếu nại — ${rejecting.barcode}` : ""}
        onCancel={() => setRejecting(null)}
        onOk={handleReject}
        okText="Từ chối"
        okButtonProps={{ danger: true }}
        confirmLoading={acting}
        destroyOnClose
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Lý do từ chối"
            rules={[{ required: true, message: "Nhập lý do từ chối." }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Drawer bồi thường bảo hiểm */}
      <Drawer
        open={insurance != null}
        onClose={() => setInsurance(null)}
        title={insurance ? `Bồi thường bảo hiểm — ${insurance.barcode}` : ""}
        width={480}
      >
        {insurance && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <InsuranceClaimStatusBadge status={insurance.status} />
              <span className="font-mono text-xs text-gray-400">
                {insurance.id}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <span className="text-gray-500">Kiện hàng</span>
              <span className="text-right font-mono">{insurance.barcode}</span>
              <span className="text-gray-500">Số tiền được duyệt</span>
              <span className="text-right font-medium">
                {insurance.approvedAmount != null
                  ? formatVND(insurance.approvedAmount)
                  : "—"}
              </span>
              <span className="text-gray-500">Ngày gửi</span>
              <span className="text-right">{formatDate(insurance.createdAt)}</span>
              <span className="text-gray-500">Cập nhật</span>
              <span className="text-right">{formatDate(insurance.updatedAt)}</span>
            </div>

            {insurance.adjusterNote && (
              <p className="text-sm text-gray-600 border-t border-gray-100 pt-3">
                Ghi chú thẩm định: {insurance.adjusterNote}
              </p>
            )}

            {insurance.damagePhotos.length > 0 && (
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-500 mb-1">
                  Ảnh thiệt hại
                </p>
                {insurance.damagePhotos.map((url, i) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline mr-2"
                  >
                    [{i + 1}]
                  </a>
                ))}
              </div>
            )}

            {canManage && insurance.status !== "Paid" && (
              <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                {(insurance.status === "Submitted" ||
                  insurance.status === "Rejected") && (
                  <Button size="small" loading={acting} onClick={handleSetUnderReview}>
                    Thẩm định
                  </Button>
                )}
                {insurance.status !== "Approved" && (
                  <Button
                    size="small"
                    type="primary"
                    onClick={() => {
                      setReviewing("approve");
                      reviewForm.resetFields();
                    }}
                  >
                    Duyệt
                  </Button>
                )}
                {insurance.status !== "Rejected" && (
                  <Button
                    size="small"
                    danger
                    onClick={() => {
                      setReviewing("reject");
                      reviewForm.resetFields();
                    }}
                  >
                    Từ chối
                  </Button>
                )}
                {insurance.status === "Approved" && (
                  <Popconfirm
                    title="Chi trả bồi thường?"
                    description="Tiền sẽ được hoàn về ví khách. Không thể hoàn tác."
                    okText="Chi trả"
                    onConfirm={handlePay}
                    okButtonProps={{ loading: acting }}
                  >
                    <Button size="small" type="primary" ghost>
                      Chi trả
                    </Button>
                  </Popconfirm>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Duyệt / từ chối bồi thường */}
      <Modal
        open={reviewing != null}
        title={reviewing === "approve" ? "Duyệt bồi thường" : "Từ chối bồi thường"}
        onCancel={() => setReviewing(null)}
        onOk={handleReview}
        okText={reviewing === "approve" ? "Duyệt" : "Từ chối"}
        okButtonProps={reviewing === "reject" ? { danger: true } : undefined}
        confirmLoading={acting}
        destroyOnClose
      >
        <Form form={reviewForm} layout="vertical" requiredMark="optional">
          {reviewing === "approve" && (
            <Form.Item
              name="approvedAmountVnd"
              label="Số tiền duyệt (VND)"
              tooltip="Để trống = dùng số tiền khách yêu cầu."
            >
              <InputNumber
                className="w-full"
                min={0}
                addonAfter="₫"
                formatter={numberFormatter}
                parser={numberParser}
              />
            </Form.Item>
          )}
          <Form.Item
            name="notes"
            label={reviewing === "approve" ? "Ghi chú" : "Lý do từ chối"}
            rules={
              reviewing === "reject"
                ? [{ required: true, message: "Nhập lý do từ chối." }]
                : undefined
            }
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
