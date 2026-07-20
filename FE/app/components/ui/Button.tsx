import { cn } from "~/lib/utils/cn";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:   "bg-primary text-white hover:bg-primary-dark",
  secondary: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50",
  danger:    "bg-red-600 text-white hover:bg-red-700",
  ghost:     "text-gray-600 hover:bg-gray-100",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-2.5 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition",
        "active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        variants[variant],
        sizes[size],
        className
      )}
      // disabled tách khỏi {...props} để loading LUÔN vô hiệu hoá nút (chống double-submit/spam).
      {...props}
      disabled={loading || disabled}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}
