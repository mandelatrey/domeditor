import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "./utils";

export function ToggleGroup({ className, ...props }: ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn("inline-flex w-fit items-center rounded-md border border-input bg-input/30 p-0.5 shadow-xs", className)}
      {...props}
    />
  );
}

export function ToggleGroupItem({ className, ...props }: ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        "inline-flex h-6 min-w-7 items-center justify-center rounded-[5px] px-1.5 text-muted-foreground transition-colors outline-none",
        "hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
        "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[soft=true]:bg-accent data-[soft=true]:text-foreground",
        "[&_svg]:size-3.5",
        className,
      )}
      {...props}
    />
  );
}
