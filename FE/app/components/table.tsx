import React, { useCallback, useMemo, useState } from "react";
import { Button, Checkbox, Modal, Popover, Space, Table, Tag } from "antd";
import type { CheckboxOptionType, TableProps } from "antd";
import { SettingOutlined, EllipsisOutlined } from "@ant-design/icons";

import "../styles/components/table.css";
import type { IAction, IColumn } from "~/models/table.model";
import { ETableColumnType } from "~/shared/constants/e-table.consts";

interface AppTableProps<T> extends TableProps<T> {
  columns: IColumn<T>[];
  listActions?: IAction[];
  rowSelection?: TableProps<T>["rowSelection"];
  height?: number;
  isGroupedTable?: boolean;
}

const AppTable = <T extends object>(props: AppTableProps<T>) => {
  const [openConfig, setOpenConfig] = useState<boolean>(false);
  const [openActionIndex, setOpenActionIndex] = useState<number | null>(null);
  const {
    columns,
    listActions,
    rowSelection,
    isGroupedTable,
    dataSource,
    ...rest
  } = props;
  const sttMap = useMemo(() => {
    if (!isGroupedTable || !dataSource) return null;

    const map: Record<number, number> = {};
    let count = 0;

    dataSource.forEach((item: any, index: number) => {
      if (!item.rowType || item.rowType === "data") {
        count++;
        map[index] = count;
      }
    });

    return map;
  }, [dataSource, isGroupedTable]);
  const indexColumn: IColumn<T> = useMemo(
    () => ({
      key: "__index",
      title: "STT",
      width: 60,
      align: "center",
      fixed: "left",
      showOnConfig: false,
      render: (_: any, record: any, index: number) => {
        if (isGroupedTable) {
          if (record?.rowType && record.rowType !== "data") {
            return {
              children: null,
              props: { colSpan: 0 },
            };
          }
          return sttMap ? sttMap[index] : index + 1;
        }
        return index + 1;
      },
    }),
    [isGroupedTable, sttMap],
  );
  const openPopupConfig = () => {
    setOpenConfig(true);
  };
  const closePopupConfig = () => {
    setOpenConfig(false);
  };

  const renderStatusColumn = useCallback(
    (value: any, col: IColumn<T>, record?: T) => {
      if (!col.getTagInfo) return value;
      const info = col.getTagInfo(value, record);
      if (!info) return value;
      return (
        <Tag bordered={false} className={info.className} color={info.color}>
          {info.label}
        </Tag>
      );
    },
    [],
  );

  const enhancedColumns: IColumn<T>[] = useMemo(() => {
    return columns.map((col) => {
      if (col.type === ETableColumnType.STATUS) {
        return {
          ...col,
          fixed: col.fixed ?? "right",
          width: col.width ?? 150,
          render: col.render
            ? col.render
            : (value: any, record: T) => renderStatusColumn(value, col, record),
        };
      }
      return { ...col, minWidth: col.minWidth ?? 100 };
    });
  }, [columns]);

  const configColumn: IColumn<T> = {
    key: "config",
    title: (
      <Button
        type="text"
        icon={<SettingOutlined style={{ color: "white" }} />}
        onClick={openPopupConfig}
      />
    ),
    dataIndex: "__config",
    width: 50,
    fixed: "right",
    onCell: (_record: T, index?: number) => {
      const rowStyle =
        typeof rest.onRow === "function"
          ? rest.onRow(_record)?.style
          : undefined;
      return rowStyle ? { style: rowStyle } : {};
    },
    render: (_, record, index) => {
      if (!listActions?.length) return null;
      const actions = listActions
        .filter((act) => !act.hidden?.(record))
        .map((act, idx) => (
          <Button
            key={act.label ?? idx}
            size="middle"
            title={act.tooltip ?? act.label}
            color={act.color ?? "default"}
            variant="dashed"
            className="!w-full"
            icon={act.icon}
            onClick={() => {
              act.command(record);
              setOpenActionIndex(null);
            }}
          >
            {act.label}
          </Button>
        ));
      if (!actions.length) return null;
      return (
        <Popover
          key={index}
          className="actions"
          trigger="click"
          open={openActionIndex === index}
          onOpenChange={(visible) => setOpenActionIndex(visible ? index : null)}
          placement="bottomRight"
          content={
            <Space direction="vertical" style={{ marginRight: 8 }}>
              {actions}
            </Space>
          }
        >
          <Button type="text" icon={<EllipsisOutlined />} />
        </Popover>
      );
    },
  };

  const defaultCheckedList = columns.map((item) => item.key as string);
  const [checkedList, setCheckedList] = useState<string[]>(defaultCheckedList);

  const options: CheckboxOptionType[] = columns.map(
    ({ key, title, showOnConfig }) => ({
      label: title as string,
      value: key as string,
      disabled: showOnConfig === false,
    }),
  );

  const finalColumns = useMemo(() => {
    return [
      indexColumn,
      ...enhancedColumns.filter(
        (c) => c.showOnConfig === false || checkedList.includes(String(c.key)),
      ),
      configColumn,
    ];
  }, [indexColumn, enhancedColumns, checkedList, configColumn]);

  return (
    <>
      <Table<T>
        size="small"
        tableLayout="fixed"
        columns={finalColumns}
        scroll={{ x: "max-content", y: props.height ?? 370 }}
        rowSelection={rowSelection}
        dataSource={dataSource}
        {...rest}
      />

      <Modal
        width={250}
        title="Cấu hình hiển thị"
        open={openConfig}
        onCancel={closePopupConfig}
        footer={null}
      >
        <Checkbox.Group
          style={{ flexDirection: "column" }}
          value={checkedList}
          options={options}
          onChange={(value) => setCheckedList(value as string[])}
        />
      </Modal>
    </>
  );
};

export default AppTable;
