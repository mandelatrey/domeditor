// What the page is showing right now: its light or dark theme.
import { toRgba } from "./color";

export const systemDark = () => matchMedia("(prefers-color-scheme: dark)").matches;

/** Whether the page is showing its dark theme: an explicit data-theme / class on <html> or <body>,
 *  else how dark its background is, else the system setting. */
export function pageIsDark(): boolean {
  for (const el of [document.documentElement, document.body]) {
    const said = `${el.getAttribute("data-theme") ?? ""} ${el.getAttribute("data-mode") ?? ""} ${el.getAttribute("data-color-scheme") ?? ""}`.toLowerCase();
    if (/\bdark\b/.test(said) || el.classList.contains("dark")) return true;
    if (/\blight\b/.test(said) || el.classList.contains("light")) return false;
  }
  for (const el of [document.body, document.documentElement]) {
    const rgba = toRgba(getComputedStyle(el).backgroundColor);
    if (rgba && rgba[3] > 0.5) return 0.2126 * rgba[0] + 0.7152 * rgba[1] + 0.0722 * rgba[2] < 128;
  }
  return systemDark();
}
