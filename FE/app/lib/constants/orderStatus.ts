export const ORDER_STATUSES = [
  "PendingDeposit",
  "DepositPaid",
  "AwaitingPlacement",
  "OrderedOnPlatform",
  "ShopConfirmed",
  "ShopShipped",
  "ArrivedChinaWh",
  "InternationalShipping",
  "ArrivedVnWh",
  "PendingFinalPayment",
  "OutForDelivery",
  "Completed",
  "Cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PendingDeposit:       "Chờ đặt cọc",
  DepositPaid:          "Đã cọc",
  AwaitingPlacement:    "Chờ đặt hàng",
  OrderedOnPlatform:    "Đã đặt sàn",
  ShopConfirmed:        "Shop xác nhận",
  ShopShipped:          "Shop đã gửi",
  ArrivedChinaWh:       "Kho TQ",
  InternationalShipping:"Đang vận chuyển",
  ArrivedVnWh:          "Kho VN",
  PendingFinalPayment:  "Chờ thanh toán",
  OutForDelivery:       "Đang giao",
  Completed:            "Hoàn thành",
  Cancelled:            "Đã hủy",
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  PendingDeposit:       "bg-amber-100 text-amber-800",
  DepositPaid:          "bg-blue-100 text-blue-800",
  AwaitingPlacement:    "bg-yellow-100 text-yellow-800",
  OrderedOnPlatform:    "bg-purple-100 text-purple-800",
  ShopConfirmed:        "bg-cyan-100 text-cyan-800",
  ShopShipped:          "bg-cyan-100 text-cyan-800",
  ArrivedChinaWh:       "bg-indigo-100 text-indigo-800",
  InternationalShipping:"bg-violet-100 text-violet-800",
  ArrivedVnWh:          "bg-teal-100 text-teal-800",
  PendingFinalPayment:  "bg-orange-100 text-orange-800",
  OutForDelivery:       "bg-sky-100 text-sky-800",
  Completed:            "bg-green-100 text-green-800",
  Cancelled:            "bg-red-100 text-red-800",
};
