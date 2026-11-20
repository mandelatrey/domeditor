import type { ComponentProps } from "react";
import { cn } from "./utils";

export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-4.5 min-w-4.5 items-center justify-center gap-0.5 rounded-sm border border-border/60 bg-muted px-1 font-sans text-[10px] font-medium text-muted-foreground select-none",
        "[[data-slot=button][data-variant=default]_&]:border-white/25 [[data-slot=button][data-variant=default]_&]:bg-white/15 [[data-slot=button][data-variant=default]_&]:text-primary-foreground",
        className,
      )}
      {...props}
    />
  );
}
