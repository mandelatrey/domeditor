import { describe, expect, it } from "vitest";
import { pasteInto, type Difference } from "../src/client/copyStyle";
import type { Decl } from "../src/core/shared";

const d = (prop: string, value: string): Decl => ({ prop, value, important: false });
const diff = (prop: string, value: string): Difference => ({ group: "type", prop, value, now: "", target: value });
const sides = (base: string, v: string) => ["top", "right", "bottom", "left"].map((s) => diff(`${base}-${s}`, v));

describe("pasting a copied look into a rule", () => {
  it("writes whole shorthands where every side is set", () => {
    const out = pasteInto([d("color", "red")], [
      ...["top", "bottom"].map((s) => diff(`padding-${s}`, "6px")), ...["right", "left"].map((s) => diff(`padding-${s}`, "10px")),
      ...["top-left", "top-right", "bottom-right", "bottom-left"].map((c) => diff(`border-${c}-radius`, "6px")),
      ...sides("border", "").flatMap((x) => [
        diff(x.prop.replace(/-$/, "") + "-width", "1px"), diff(x.prop.replace(/-$/, "") + "-style", "solid"), diff(x.prop.replace(/-$/, "") + "-color", "var(--stroke-soft)"),
      ]),
      diff("row-gap", "8px"), diff("column-gap", "8px"),
    ]);
    expect(out).toEqual([d("color", "red"), d("padding", "6px 10px"), d("border-radius", "6px"), d("border", "1px solid var(--stroke-soft)"), d("gap", "8px")]);
  });
  it("edits what the rule already has, in place", () => {
    const out = pasteInto([d("padding", "4px"), d("font", "500 11px/1 var(--f-mono)")], [diff("padding-left", "12px"), diff("font-size", "12px"), diff("letter-spacing", "0.08em")]);
    expect(out).toEqual([d("padding", "4px 4px 4px 12px"), d("font", "500 12px/1 var(--f-mono)"), d("letter-spacing", "0.08em")]);
  });
  it("keeps longhands where the sides differ", () => {
    const out = pasteInto([], [diff("border-top-color", "red"), diff("border-bottom-color", "blue")]);
    expect(out).toEqual([d("border-top-color", "red"), d("border-bottom-color", "blue")]);
  });
});
