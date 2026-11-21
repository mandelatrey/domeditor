// Scoped edits: changes that apply only in dark (or light) mode, or only at some screen widths. Works
// out how the project itself writes those (so new CSS looks like the rest), which breakpoints it uses,
// and the rule(s) an edit in a scope goes into. Pure: no DOM, so it is shared and tested.
import { normCondition, normSelector, splitTop, type SourceRule } from "./shared";

export type Mode = "all" | "dark" | "light";
export type Width = { kind: "max" | "min"; px: number } | null;
export type Scope = { mode: Mode; width: Width };
export const EVERYWHERE: Scope = { mode: "all", width: null };
export const isEverywhere = (s: Scope) => s.mode === "all" && !s.width;

/** How the project writes dark-mode styles: in a prefers-color-scheme media query (with a selector
 *  prefix such as `:root:not([data-theme=light])`, or none), and/or with a theme attribute or class on the
 *  root (`[data-theme=dark] .x`, `.dark .x`). */
export type ModePattern = { media: { prefix: string } | null; attr: { prefix: string } | null };

const THEMED_FIRST = /^(:root|html|body)?((\[data-(theme|mode|color-scheme)=(dark|light)\])|(\.(dark|light)))(:not\([^)]*\))?$|^(:root|html|body)(:not\(\[data-(theme|mode|color-scheme)=(dark|light)\]\))$/i;
const firstCompound = (sel: string) => splitTop(normSelector(sel), " ")[0] ?? "";
const mostCommon = (xs: string[]) => {
  const n = new Map<string, number>();
  for (const x of xs) n.set(x, (n.get(x) ?? 0) + 1);
  return [...n].sort((a, b) => b[1] - a[1])[0]?.[0];
};

/** The dark-mode pattern most of the project's CSS uses (a plain media query if it has none). */
export function modePattern(rules: readonly SourceRule[]): ModePattern {
  const media: string[] = [], attr: string[] = [];
  for (const r of rules) {
    const dark = r.context.some((c) => /^media .*prefers-color-scheme:dark/.test(c));
    const parts = splitTop(r.selector).map(firstCompound);
    const themed = parts.find((p) => THEMED_FIRST.test(p) && /dark|light/i.test(p));
    if (dark) media.push(themed ?? "");
    else if (themed && /dark/i.test(themed) && !/:not/.test(themed)) attr.push(themed);
  }
  const m = mostCommon(media), a = mostCommon(attr);
  if (m === undefined && a === undefined) return { media: { prefix: "" }, attr: null };
  return { media: m !== undefined ? { prefix: m } : null, attr: a !== undefined ? { prefix: a } : null };
}

const swapMode = (s: string, to: "dark" | "light") =>
  to === "dark" ? s : s.replace(/\b(dark|light)\b/gi, (w) => (w.toLowerCase() === "dark" ? "light" : "dark"));

/** The screen widths the project's CSS uses, from its media queries. */
export function breakpoints(rules: readonly SourceRule[]): { max: number[]; min: number[] } {
  const max = new Set<number>(), min = new Set<number>();
  for (const r of rules) {
    for (const c of r.context) {
      for (const m of c.matchAll(/(max|min)-width:([\d.]+)px/g)) (m[1] === "max" ? max : min).add(Number(m[2]));
      for (const m of c.matchAll(/width(<=?|>=?)([\d.]+)px/g)) (m[1]!.startsWith("<") ? max : min).add(Number(m[2]));
    }
  }
  return { max: [...max].sort((a, b) => a - b), min: [...min].sort((a, b) => a - b) };
}

/** Screen-size scopes that include the current width (so their changes show while editing), nearest first. */
export function widthOptions(rules: readonly SourceRule[], now: number, limit = 4): NonNullable<Width>[] {
  let { max, min } = breakpoints(rules);
  if (!max.length && !min.length) { max = [640, 768, 1024]; min = [640, 768, 1024]; }
  const narrower = tidy(max.filter((px) => px >= now)).slice(0, limit).map((px) => ({ kind: "max" as const, px }));
  const wider = tidy(min.filter((px) => px <= now)).reverse().slice(0, limit).map((px) => ({ kind: "min" as const, px }));
  return [...narrower, ...wider];
}

/** Breakpoints within 2px of each other (479px and 480px) are one: keep the rounder. */
function tidy(sorted: number[]): number[] {
  const out: number[] = [];
  for (const px of sorted) {
    const last = out.at(-1);
    if (last !== undefined && px - last <= 2) {
      if (px % 10 === 0 && last % 10 !== 0) out[out.length - 1] = px;
    } else out.push(px);
  }
  return out;
}

export const widthCondition = (w: Width) => (w ? `(${w.kind}-width: ${w.px}px)` : null);
export const widthLabel = (w: Width) => (!w ? "Every screen size" : w.kind === "max" ? `Up to ${w.px}px` : `${w.px}px and up`);
export const modeLabel = (m: Mode) => (m === "all" ? "Every mode" : m === "dark" ? "Dark mode only" : "Light mode only");

/** One rule an edit in a scope goes into: an at-rule condition (or none) and a selector. */
export type ScopedRule = { media: string | null; selector: string };

const prefixed = (prefix: string, selector: string) =>
  prefix ? splitTop(selector).map((p) => `${prefix} ${p}`).join(", ") : selector;
const and = (...conds: (string | null)[]) => conds.filter(Boolean).join(" and ") || null;

/** The rule(s) that make an edit to `selector` apply only in the scope, written the project's way. In
 *  a project that writes dark mode both ways (system setting and theme switch), that is two rules. */
export function scopedRules(selector: string, scope: Scope, pattern: ModePattern): ScopedRule[] {
  const w = widthCondition(scope.width);
  if (scope.mode === "all") return [{ media: w, selector }];
  const mode = scope.mode;
  const out: ScopedRule[] = [];
  if (pattern.media) out.push({ media: and(`(prefers-color-scheme: ${mode})`, w), selector: prefixed(swapMode(pattern.media.prefix, mode), selector) });
  if (pattern.attr) out.push({ media: w, selector: prefixed(swapMode(pattern.attr.prefix, mode), selector) });
  return out;
}

/** The context a source rule would have for a scoped rule (to find it if it is already written). */
export const scopedContext = (r: ScopedRule) => (r.media ? [`media ${normCondition(r.media)}`] : []);
