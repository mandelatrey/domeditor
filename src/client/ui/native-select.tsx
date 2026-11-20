// shadcn's native select: a styled <select>. Native, so it needs no popup layer inside the shadow root.
import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "./utils";

export function NativeSelect({ className, wrapperClassName, ...props }: ComponentProps<"select"> & { wrapperClassName?: string }) {
  return (
    <div data-slot="native-select-wrapper" className={cn("relative w-full min-w-0", wrapperClassName)}>
      <select
        data-slot="native-select"
        className={cn(
          "h-7 w-full min-w-0 appearance-none truncate rounded-md border border-input bg-input/30 pr-7 pl-2 font-mono text-[11.5px] text-foreground shadow-xs outline-none",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50",
          "[&>option]:bg-popover [&>option]:text-popover-foreground",
          className,
        )}
        {...props}
      />
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
    </div>
  );
}
