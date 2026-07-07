import { Input } from "antd";
import { BarcodeOutlined } from "@ant-design/icons";

interface BarcodeScanInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onScan?: (value: string) => void; // gọi khi nhấn Enter / nút quét
  placeholder?: string;
  autoFocus?: boolean;
  loading?: boolean;
  allowClear?: boolean;
}

// Ô nhập/quét mã vạch dùng chung cho receive-cn/vn & đóng bao.
// Máy quét barcode hoạt động như bàn phím + Enter → tận dụng onPressEnter.
export function BarcodeScanInput({
  value,
  onChange,
  onScan,
  placeholder = "Quét hoặc nhập mã vạch...",
  autoFocus,
  loading,
  allowClear = true,
}: BarcodeScanInputProps) {
  return (
    <Input.Search
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      onSearch={(v) => onScan?.(v.trim())}
      onPressEnter={(e) =>
        onScan?.((e.target as HTMLInputElement).value.trim())
      }
      placeholder={placeholder}
      autoFocus={autoFocus}
      allowClear={allowClear}
      loading={loading}
      enterButton
      prefix={<BarcodeOutlined className="text-gray-400" />}
    />
  );
}
