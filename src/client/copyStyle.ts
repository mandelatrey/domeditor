// Copy an element's look and paste it onto another: what you see (computed values, so inherited text
// styles and unsaved edits count), written with the source's own declared values where it has them
// (var(--token), rem, clamp()) so the destination keeps using the design tokens.
import { readProp, splitTop, writeProp, writeSides, type Decl, type Side } from "../core/shared";
import { cascade, store } from "./model";

const SIDES: Side[] = ["top", "right", "bottom", "left"];
const CORNERS = ["top-left", "top-right", "bottom-right", "bottom-left"];

export type GroupId = "type" | "color" | "border" | "spacing" | "layout" | "size" | "margin";

/** The properties copied, grouped as a designer thinks of them. Size and margin usually depend on
 *  where an element sits, so they are left out unless asked for. */
export const GROUPS: { id: GroupId; label: string; on: boolean; props: string[] }[] = [
  { id: "type", label: "Typography", on: true, props: ["font-family", "font-size", "font-weight", "font-style", "line-height", "letter-spacing", "text-transform", "text-align", "text-decoration-line", "white-space"] },
  { id: "color", label: "Colour", on: true, props: ["color", "background-color", "background-image", "opacity"] },
  {
    id: "border", label: "Border & corners", on: true,
    props: [
      ...SIDES.flatMap((s) => [`border-${s}-width`, `border-${s}-style`, `border-${s}-color`]),
      ...CORNERS.map((c) => `border-${c}-radius`), "box-shadow",
    ],
  },
  { id: "spacing", label: "Padding & gap", on: true, props: [...SIDES.map((s) => `padding-${s}`), "row-gap", "column-gap"] },
  { id: "layout", label: "Layout", on: true, props: ["display", "flex-direction", "flex-wrap", "align-items", "justify-content"] },
  { id: "size", label: "Size", on: false, props: ["width", "height", "min-width", "max-width", "min-height"] },
  { id: "margin", label: "Margin", on: false, props: SIDES.map((s) => `margin-${s}`) },
];

export type Copied = {
  from: Element;
  label: string;
  /** per property: what the source shows, and how its own CSS writes it (if it does) */
  values: Map<string, { computed: string; declared: string | null }>;
};

/** Take an element's look. */
export function copyStyle(el: Element, label: string): Copied {
  const cs = getComputedStyle(el);
  const { winner } = cascade(el);
  const values = new Map<string, { computed: string; declared: string | null }>();
  for (const g of GROUPS) {
    for (const prop of g.props) {
      const key = winner.get(prop);
      const declared = key && key !== "inline" ? declaredValue(store.declsOf(key), prop) : null;
      values.set(prop, { computed: cs.getPropertyValue(prop), declared });
    }
  }
  return { from: el, label, values };
}

const BORDER_STYLES = /^(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)$/i;
const LENGTH = /^(-?[\d.]+[a-z%]*|thin|medium|thick|0)$/i;

/** How a rule writes one property, reading it out of a shorthand if need be:
 *  `border: 1px solid var(--line)` gives border-top-color = var(--line); `background: var(--panel)` gives
 *  background-color = var(--panel). */
function declaredValue(decls: Decl[], prop: string): string | null {
  const direct = readProp(decls, prop);
  if (direct) return direct;
  const border = /^border-(top|right|bottom|left)-(width|style|color)$/.exec(prop);
  if (border) {
    const [, side, part] = border;
    const v = readProp(decls, `border-${part}`) ?? readProp(decls, `border-${side}`) ?? readProp(decls, "border");
    if (!v) return null;
    const tokens = splitTop(v, " ");
    if (tokens.length === 1 && readProp(decls, `border-${part}`) === v) return v;
    const pick = part === "width" ? tokens.find((t) => LENGTH.test(t))
      : part === "style" ? tokens.find((t) => BORDER_STYLES.test(t))
      : tokens.find((t) => !LENGTH.test(t) && !BORDER_STYLES.test(t));
    return pick ?? null;
  }
  if (prop === "background-color") {
    const bg = readProp(decls, "background");
    if (bg && splitTop(bg, " ").length === 1 && !/url\(|gradient\(/i.test(bg)) return bg;
  }
  return null;
}

export type Difference = { group: GroupId; prop: string; value: string; now: string; target: string };

/** What would change on an element to make it look like the copy. */
export function differences(copied: Copied, el: Element): Difference[] {
  const cs = getComputedStyle(el);
  const out: Difference[] = [];
  for (const g of GROUPS) {
    for (const prop of g.props) {
      const v = copied.values.get(prop);
      const now = cs.getPropertyValue(prop);
      if (!v || v.computed === now) continue;
      out.push({ group: g.id, prop, value: v.declared ?? v.computed, now, target: v.computed });
    }
  }
  return out;
}

/** Write differences into a rule's declarations, as shorthands where every side is set. */
export function pasteInto(decls: readonly Decl[], diffs: Difference[]): Decl[] {
  let out = [...decls];
  const by = new Map(diffs.map((d) => [d.prop, d.value]));
  const all = (props: string[]) => props.every((p) => by.has(p));
  for (const base of ["padding", "margin"] as const) {
    const props = SIDES.map((s) => `${base}-${s}`);
    if (all(props)) {
      out = writeSides(out, base, Object.fromEntries(SIDES.map((s) => [s, by.get(`${base}-${s}`)!])) as Record<Side, string>);
      props.forEach((p) => by.delete(p));
    }
  }
  const corners = CORNERS.map((c) => `border-${c}-radius`);
  if (all(corners) && new Set(corners.map((p) => by.get(p))).size === 1) {
    out = writeProp(out, "border-radius", by.get(corners[0]!)!);
    corners.forEach((p) => by.delete(p));
  }
  // every side of the border the same: one `border: 1px solid var(--line)`
  const parts = ["width", "style", "color"].map((part) => SIDES.map((sd) => `border-${sd}-${part}`));
  if (parts.every((props) => all(props) && new Set(props.map((p) => by.get(p))).size === 1)) {
    out = writeProp(out, "border", parts.map((props) => by.get(props[0]!)!).join(" "));
    parts.flat().forEach((p) => by.delete(p));
  }
  for (const part of ["width", "style", "color"]) {
    const props = SIDES.map((s) => `border-${s}-${part}`);
    if (all(props) && new Set(props.map((p) => by.get(p))).size === 1) {
      out = writeProp(out, `border-${part}`, by.get(props[0]!)!);
      props.forEach((p) => by.delete(p));
    }
  }
  if (by.has("row-gap") && by.has("column-gap") && by.get("row-gap") === by.get("column-gap")) {
    out = writeProp(out, "gap", by.get("row-gap")!);
    by.delete("row-gap");
    by.delete("column-gap");
  }
  for (const [prop, value] of by) out = writeProp(out, prop, value);
  return out;
}

/** CSS text for the system clipboard, so a copied look can also be pasted into code. */
export function cssText(copied: Copied, groups: Set<GroupId>): string {
  const lines: string[] = [];
  for (const g of GROUPS) {
    if (!groups.has(g.id)) continue;
    for (const prop of g.props) {
      const v = copied.values.get(prop);
      if (v && (v.declared || !isDefault(prop, v.computed))) lines.push(`  ${prop}: ${v.declared ?? v.computed};`);
    }
  }
  return `/* from ${copied.label} */\n{\n${lines.join("\n")}\n}`;
}
const isDefault = (prop: string, v: string) =>
  v === "none" || v === "normal" || v === "auto" || v === "0px" || v === "rgba(0, 0, 0, 0)" || (prop.endsWith("-style") && v === "none");
