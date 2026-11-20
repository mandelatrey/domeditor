import type { ComponentProps } from "react";
import { cn } from "./utils";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      spellCheck
      className={cn(
        "field-sizing-content min-h-8 w-full resize-none rounded-md border border-input bg-input/30 px-2 py-1.5 text-[12.5px] leading-snug text-foreground shadow-xs outline-none",
        "placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
