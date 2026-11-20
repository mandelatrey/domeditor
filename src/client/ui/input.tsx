import type { ComponentProps } from "react";
import { cn } from "./utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      spellCheck={false}
      autoComplete="off"
      className={cn(
        "h-7 w-full min-w-0 rounded-md border border-input bg-input/30 px-2 font-mono text-[11.5px] text-foreground shadow-xs outline-none transition-[color,box-shadow,border-color]",
        "placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
        className,
      )}
      {...props}
    />
  );
}
