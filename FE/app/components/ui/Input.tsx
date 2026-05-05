import { cn } from "~/lib/utils/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "w-full rounded-lg border px-3 py-2 text-sm text-gray-900 outline-none transition-colors",
          "placeholder:text-gray-400",
          "focus:border-primary focus:ring-2 focus:ring-primary/20",
          error
            ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-200"
            : "border-gray-300 bg-white hover:border-gray-400",
          "disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {!error && hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
