import { OrderDetailView } from "../admin/orders.$id";

export function meta() {
  return [{ title: "Xử lý đơn hàng — MuaHo" }];
}

export default function StaffOrderDetailPage() {
  return <OrderDetailView backTo="/staff/assignments" />;
}
