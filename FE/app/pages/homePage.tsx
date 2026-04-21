import AppTable from "~/components/table";
import Table from "~/components/table";
import type { IViewGuestGroup } from "~/models/finance/customer_profiles.models";
import type { IAction, IColumn } from "~/models/table.model";
import { ETableColumnType } from "~/shared/constants/e-table.consts";
import { ReduxStatus } from "~/shared/redux-status";

export default function HomePage() {
  const status = ReduxStatus.IDLE;
  const columns: IColumn<IViewGuestGroup>[] = [
    {
      key: "code",
      dataIndex: "code",
      title: "Mã đoàn",
      align: "center",
      width: 120,
    },
    {
      key: "name",
      dataIndex: "name",
      title: "Tên đoàn vào",
      width: 200,
    },
    {
      key: "content",
      dataIndex: "content",
      title: "Nội dung",
      width: 200,
    },
    {
      key: "idPhongBan",
      dataIndex: "idPhongBan",
      title: "Phòng ban phụ trách",
      align: "center",
      width: 160,
    },
    {
      key: "location",
      dataIndex: "location",
      title: "Địa điểm",
      align: "center",
      width: 200,
    },
    {
      key: "idStaffReception",
      dataIndex: "staffReceptionName",
      title: "Nhân sự tiếp đón",
      align: "center",
      width: 160,
    },
    {
      key: "totalPerson",
      dataIndex: "totalPerson",
      title: "Tổng số người",
      align: "center",
      width: 120,
    },
    {
      key: "phoneNumber",
      dataIndex: "phoneNumber",
      title: "SĐT liên hệ",
      width: 120,
    },
    {
      key: "totalMoney",
      dataIndex: "totalMoney",
      title: "Tổng chi phí ước tính (VNĐ)",
      align: "left",
      width: 120,
    },
  ];
  // const actions: IAction[] = [
  //   {
  //     label: "Xem chi tiết",
  //   },
  // ];
  return (
    <>
      <div>Home page</div>
      <AppTable
        loading={status === ReduxStatus.LOADING}
        rowKey="id"
        columns={columns}
        // dataSource={list}
        // listActions={actions}
        pagination={{ position: ["bottomRight"] }}
        scroll={{ x: "max-content", y: "calc(100vh - 350px)" }}
      />
    </>
  );
}
