// Matches BE enum OrderStatus in CustomerOrderEntities.cs
export const ORDER_STATUSES = [
  "PendingPayment",
  "Paid",
  "AwaitingApiPlace",
  "AwaitingManualPlace",
  "OrderedOnPlatform",
  "ShippedFromShop",
  "ArrivedChinaWh",
  "ShippingToVN",
  "ArrivedVietnam",
  "Delivering",
  "Completed",
  "CancelledByTimeout",
  "CancelledByCustomer",
  "CancelledByStaff",
  "Returned",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PendingPayment:      "Chờ đặt cọc",
  Paid:                "Đã cọc",
  AwaitingApiPlace:    "Chờ đặt tự động",
  AwaitingManualPlace: "Chờ NV đặt hàng",
  OrderedOnPlatform:   "Đã đặt sàn",
  ShippedFromShop:     "Shop đã gửi",
  ArrivedChinaWh:      "Kho TQ",
  ShippingToVN:        "Đang vận chuyển VN",
  ArrivedVietnam:      "Kho VN",
  Delivering:          "Đang giao",
  Completed:           "Hoàn thành",
  CancelledByTimeout:  "Hết hạn cọc",
  CancelledByCustomer: "KH hủy",
  CancelledByStaff:    "NV hủy",
  Returned:            "Hoàn hàng",
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  PendingPayment:      "bg-amber-100 text-amber-800",
  Paid:                "bg-blue-100 text-blue-800",
  AwaitingApiPlace:    "bg-yellow-100 text-yellow-800",
  AwaitingManualPlace: "bg-yellow-100 text-yellow-800",
  OrderedOnPlatform:   "bg-purple-100 text-purple-800",
  ShippedFromShop:     "bg-cyan-100 text-cyan-800",
  ArrivedChinaWh:      "bg-indigo-100 text-indigo-800",
  ShippingToVN:        "bg-violet-100 text-violet-800",
  ArrivedVietnam:      "bg-teal-100 text-teal-800",
  Delivering:          "bg-sky-100 text-sky-800",
  Completed:           "bg-green-100 text-green-800",
  CancelledByTimeout:  "bg-red-100 text-red-800",
  CancelledByCustomer: "bg-red-100 text-red-800",
  CancelledByStaff:    "bg-red-100 text-red-800",
  Returned:            "bg-orange-100 text-orange-800",
};

// Statuses where customer can still cancel
export const CUSTOMER_CANCELLABLE_STATUSES: OrderStatus[] = [
  "PendingPayment",
  "Paid",
  "AwaitingManualPlace",
];

// Terminal statuses (no more transitions)
export const TERMINAL_STATUSES: OrderStatus[] = [
  "Completed",
  "CancelledByTimeout",
  "CancelledByCustomer",
  "CancelledByStaff",
  "Returned",
];
