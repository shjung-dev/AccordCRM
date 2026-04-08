import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CloseButtonProps {
  onClick: () => void;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export function CloseButton({
  onClick,
  className,
  ariaLabel = "Close",
  disabled = false,
}: CloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-sm font-semibold opacity-90 transition-all duration-300 hover:cursor-pointer hover:scale-120 hover:font-bold disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      aria-label={ariaLabel}
    >
      <X className="h-5 w-5 text-black font-bold" />
    </button>
  );
}
