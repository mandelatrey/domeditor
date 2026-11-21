// Colours as the browser sees them, whatever syntax they are written in (rgb, oklch, lab, var()...).
let ctx: CanvasRenderingContext2D | null = null;

/** Any CSS colour as [r, g, b, alpha 0-1], by drawing it; null if it is not a colour. */
export function toRgba(color: string): [number, number, number, number] | null {
  ctx ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = "#000";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return [r!, g!, b!, a! / 255];
}

/** "#rrggbb" for <input type=color> (which has no alpha). */
export function toHex(color: string): string {
  const c = toRgba(color);
  return c ? `#${c.slice(0, 3).map((n) => n.toString(16).padStart(2, "0")).join("")}` : "#000000";
}

/** A colour value as the page resolves it, var() tokens included (from :root): "rgb(…)" or null. */
export function resolveOnPage(value: string): string | null {
  if (typeof document === "undefined" || !document.body) return null;
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
  probe.style.color = value;
  if (!probe.style.color) return null; // not a colour
  document.body.appendChild(probe);
  const c = getComputedStyle(probe).color;
  probe.remove();
  return c;
}
