import type { TableColumnType, TagProps } from "antd";
import type { BaseButtonProps } from "antd/es/button/Button";
import type { ETableColumnType } from "~/shared/constants/e-table.consts";

export type ITagInfo = {
  label: string;
  color?: TagProps["color"];
  className?: string;
};

export type IColumn<T> = TableColumnType<T> & {
  showOnConfig?: boolean;
  type?: ETableColumnType;
  getTagInfo?: (value: any, record?: T) => ITagInfo | null;
};

export type IAction = {
  label: string;
  tooltip?: string;
  command: Function;
  icon: React.ReactNode;
  color?: BaseButtonProps["color"];
  hidden?: (record: any) => boolean;
  permission?: string;
};
