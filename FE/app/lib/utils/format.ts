import dayjs from "dayjs";
import "dayjs/locale/vi";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.locale("vi");
dayjs.extend(relativeTime);

export const formatVND = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

export const formatCNY = (amount: number) =>
  `¥${new Intl.NumberFormat("zh-CN").format(amount)}`;

export const formatDate = (iso: string) => dayjs(iso).format("DD/MM/YYYY HH:mm");

export const formatRelative = (iso: string) => dayjs(iso).fromNow();

export const formatWeight = (kg: number) =>
  kg >= 1 ? `${kg.toFixed(2)} kg` : `${(kg * 1000).toFixed(0)} g`;

export const numberFormatter = (value: string | number | undefined) =>
  `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export const numberParser = (value: string | undefined) =>
  value?.replace(/\$\s?|(,*)/g, "") as any;

// Helper function để định dạng màu HEX từ Database (tự động thêm dấu # nếu thiếu)
export const formatColor = (hex: string | undefined, fallback: string) => {
  if (!hex) return fallback;
  const cleanHex = hex.trim();
  return cleanHex.startsWith("#") ? cleanHex : `#${cleanHex}`;
};

// Helper function để chuyển đổi tỷ lệ thập phân từ DB sang số nguyên phần trăm hiển thị (VD: 0.05 -> 5)
export const formatPct = (val: number | undefined | null) => {
  if (val === undefined || val === null) return 0;
  if (val > 0 && val < 1) {
    return Math.round(val * 100);
  }
  return Math.round(val);
};

// Định dạng tiền tệ rút gọn (VD: 1.000.000 -> 1tr+, 1.000 -> 1k+)
export const formatShortVnd = (value: number) => {
  if (value >= 1000000) return `${value / 1000000}tr+`;
  if (value >= 1000) return `${value / 1000}k+`;
  return `${value}+`;
};

// Định dạng khoảng chi tiêu thăng hạng (VD: 10tr - 50tr)
export const formatRangeVnd = (min: number, max: number | null) => {
  if (max === null) return `Từ ${formatShortVnd(min).replace("+", "")}`;
  return `${formatShortVnd(min).replace("+", "")} - ${formatShortVnd(max).replace("+", "")}`;
};
