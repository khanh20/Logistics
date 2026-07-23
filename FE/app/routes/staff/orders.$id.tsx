import { OrderDetailView } from "../admin/orders.$id";

export function meta() {
  return [{ title: "Xử lý đơn hàng — MuaHo" }];
}

export default function StaffOrderDetailPage() {
  // Nhân viên xử lý đơn nhưng không được tự phân công / chuyển việc cho người khác.
  return <OrderDetailView backTo="/staff/assignments" canManageStaff={false} />;
}
