import type { Route } from "./+types/orders._index";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Quản lý đơn hàng — MuaHo Admin" }];
}

export default function AdminOrdersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Quản lý đơn hàng</h1>
      <p className="text-gray-500">Danh sách đơn hàng sẽ hiển thị ở đây.</p>
    </div>
  );
}
