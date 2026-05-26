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
