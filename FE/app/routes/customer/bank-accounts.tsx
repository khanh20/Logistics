import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Modal, Form, Input, Switch, Popconfirm, message, Select } from "antd";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import {
  fetchMyBankAccounts,
  createMyBankAccount,
  toggleMyBankAccountStatus,
  deleteMyBankAccount
} from "~/lib/feature/finance/financeThunk";
import { selectBankAccounts, selectFinanceStatus } from "~/lib/feature/finance/financeSelector";
import { BANK_ACCOUNT_RULES } from "~/lib/validations/finance";
import { VIETNAM_BANKS } from "~/lib/constants/banks";
import type { CreateBankAccountDto } from "~/lib/types/bankAccount";
import {
  PiPlusBold,
  PiTrashBold,
  PiCopyBold,
  PiArrowLeftBold
} from "react-icons/pi";

export default function CustomerBankAccountsPage() {
  const dispatch = useAppDispatch();
  const bankAccounts = useAppSelector(selectBankAccounts);
  const status = useAppSelector(selectFinanceStatus);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm<CreateBankAccountDto>();

  useEffect(() => {
    dispatch(fetchMyBankAccounts());
  }, [dispatch]);

  const handleCreate = async (values: CreateBankAccountDto) => {
    try {
      setIsSubmitting(true);
      await dispatch(createMyBankAccount(values)).unwrap();
      message.success("Thêm tài khoản ngân hàng thành công");
      setIsModalVisible(false);
      form.resetFields();
      dispatch(fetchMyBankAccounts());
    } catch (error: unknown) {
      message.error((error as string) || "Thêm tài khoản thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, checked: boolean) => {
    try {
      await dispatch(toggleMyBankAccountStatus(id)).unwrap();
      message.success(`Đã ${checked ? "kích hoạt" : "vô hiệu hóa"} tài khoản`);
      dispatch(fetchMyBankAccounts());
    } catch (error: unknown) {
      message.error((error as string) || "Thay đổi trạng thái thất bại");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteMyBankAccount(id)).unwrap();
      message.success("Xóa tài khoản thành công");
      dispatch(fetchMyBankAccounts());
    } catch (error: unknown) {
      message.error((error as string) || "Xóa tài khoản thất bại");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-24 text-neutral-900 bg-[#FFFFFF] min-h-screen">
      {/* ── BACK BUTTON ── */}
      <div className="mb-12">
        <Link
          to="/finance"
          className="inline-flex items-center text-sm font-mono uppercase tracking-widest text-neutral-400 hover:text-neutral-900 transition-colors"
        >
          <PiArrowLeftBold className="mr-2 text-base" /> Tài chính
        </Link>
      </div>

      {/* ── EDITORIAL HEADER ── */}
      <div className="mb-16 pt-6 pb-12 border-b border-[#EAEAEA]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-serif tracking-tight text-neutral-900 mb-0">
              Tài khoản ngân hàng
            </h1>
          </div>
          <button
            onClick={() => setIsModalVisible(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#111111] hover:bg-[#333333] text-white text-xs font-mono uppercase tracking-widest transition-all rounded active:scale-[0.98]"
          >
            <PiPlusBold /> Thêm tài khoản mới
          </button>
        </div>
      </div>

      {/* ── ACCOUNTS CARD & TABLE ── */}
      <div className="rounded-lg border border-[#EAEAEA] bg-white p-6 md:p-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#EAEAEA]">
                <th className="font-mono text-sm uppercase tracking-wider text-gray-400 pb-4 font-semibold">
                  Ngân hàng
                </th>
                <th className="font-mono text-sm uppercase tracking-wider text-gray-400 pb-4 font-semibold">
                  Số tài khoản
                </th>
                <th className="font-mono text-sm uppercase tracking-wider text-gray-400 pb-4 font-semibold">
                  Chủ tài khoản
                </th>
                <th className="font-mono text-sm uppercase tracking-wider text-gray-400 pb-4 font-semibold">
                  Chi nhánh
                </th>
                <th className="font-mono text-sm uppercase tracking-wider text-gray-400 pb-4 font-semibold text-center">
                  Trạng thái
                </th>
                <th className="font-mono text-sm uppercase tracking-wider text-gray-400 pb-4 font-semibold text-right">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {status === "loading" && bankAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 font-mono">
                    Đang tải danh sách tài khoản...
                  </td>
                </tr>
              ) : bankAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 font-mono">
                    Chưa có tài khoản ngân hàng nào. Vui lòng thêm mới.
                  </td>
                </tr>
              ) : (
                bankAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4">
                      <div className="font-sans font-semibold text-neutral-900">
                        {account.bankName}
                      </div>
                      <div className="text-xs font-mono text-neutral-400 mt-0.5">
                        {account.bankCode}
                      </div>
                    </td>
                    <td className="py-4 font-mono text-neutral-800">
                      <span className="flex items-center gap-2">
                        {account.accountNumber}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(account.accountNumber);
                            message.success("Đã sao chép số tài khoản!");
                          }}
                          className="p-1 rounded text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-all"
                          title="Sao chép số tài khoản"
                        >
                          <PiCopyBold className="text-sm" />
                        </button>
                      </span>
                    </td>
                    <td className="py-4 font-sans font-medium text-neutral-900 uppercase">
                      {account.accountHolder}
                    </td>
                    <td className="py-4 font-sans text-neutral-500">
                      {account.branch || "---"}
                    </td>
                    <td className="py-4 text-center">
                      <Switch
                        checked={account.isActive}
                        onChange={(checked) => handleToggleStatus(account.id, checked)}
                      />
                    </td>
                    <td className="py-4 text-right">
                      <Popconfirm
                        title="Xóa tài khoản"
                        description="Bạn có chắc chắn muốn xóa tài khoản ngân hàng này không?"
                        onConfirm={() => handleDelete(account.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                      >
                        <button
                          className="p-2 text-[#9F2F2D] hover:bg-[#FDEBEC] rounded transition-all active:scale-95"
                          title="Xóa tài khoản"
                        >
                          <PiTrashBold className="text-base" />
                        </button>
                      </Popconfirm>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CREATE MODAL ── */}
      <Modal
        title={
          <span className="font-serif text-lg text-neutral-900 font-semibold">
            Thêm tài khoản ngân hàng mới
          </span>
        }
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={isSubmitting}
        okText="Thêm mới"
        cancelText="Hủy"
        destroyOnClose
        okButtonProps={{
          style: {
            backgroundColor: "#111111",
            borderColor: "#111111",
            fontFamily: "monospace",
            textTransform: "uppercase",
            fontSize: "12px",
            letterSpacing: "0.05em",
            borderRadius: "4px"
          }
        }}
        cancelButtonProps={{
          style: {
            fontFamily: "monospace",
            textTransform: "uppercase",
            fontSize: "12px",
            letterSpacing: "0.05em",
            borderRadius: "4px"
          }
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          className="mt-6 space-y-4"
        >
          <Form.Item
            name="bankCode"
            label={
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-500">
                Ngân hàng
              </span>
            }
            rules={BANK_ACCOUNT_RULES.bankCode}
          >
            <Select
              showSearch
              placeholder="Chọn ngân hàng"
              optionFilterProp="children"
              onChange={(value, option: any) => {
                form.setFieldsValue({ bankName: option?.["data-name"] || "" });
              }}
              filterOption={(input, option) =>
                String(option?.children ?? "").toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: "100%" }}
            >
              {VIETNAM_BANKS.map((bank) => (
                <Select.Option key={bank.code} value={bank.code} data-name={bank.shortName}>
                  {`${bank.shortName} - ${bank.name}`}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="bankName"
            label="Tên ngân hàng"
            rules={BANK_ACCOUNT_RULES.bankName}
            hidden
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="accountNumber"
            label={
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-500">
                Số tài khoản
              </span>
            }
            rules={BANK_ACCOUNT_RULES.accountNumber}
          >
            <Input placeholder="Nhập số tài khoản" className="font-mono" />
          </Form.Item>

          <Form.Item
            name="accountHolder"
            label={
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-500">
                Tên chủ tài khoản
              </span>
            }
            rules={BANK_ACCOUNT_RULES.accountHolder}
          >
            <Input placeholder="VD: NGUYEN VAN A" className="uppercase font-mono" />
          </Form.Item>

          <Form.Item
            name="branch"
            label={
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-500">
                Chi nhánh (Không bắt buộc)
              </span>
            }
            rules={BANK_ACCOUNT_RULES.branch}
          >
            <Input placeholder="Nhập tên chi nhánh" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
