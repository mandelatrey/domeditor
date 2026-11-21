import { describe, expect, it } from "vitest";
import { sourceRules } from "../src/core/server";
import { breakpoints, modePattern, scopedRules, widthOptions } from "../src/core/scope";

const rules = (css: string) => sourceRules(css, "/x.css").rules.map((r) => r.ref);

// how hali writes dark mode: the system setting (unless light was chosen) and the theme switch
const hali = rules(`
:root { --text: #111; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --text: #eee; } }
:root[data-theme="dark"] { --text: #eee; }
.logo-on-dark { display: none; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .logo-on-dark { display: block; } }
:root[data-theme="dark"] .logo-on-dark { display: block; }
@media (min-width: 720px) { .a { x: y; } }
@media (min-width: 1000px) { .a { x: y; } }
@media (max-width: 640px) { .a { x: y; } }
@media (max-width: 480px) { .a { x: y; } }
`);

describe("scoped edits", () => {
  it("learns how the project writes dark mode", () => {
    expect(modePattern(hali)).toEqual({ media: { prefix: ":root:not([data-theme=light])" }, attr: { prefix: ":root[data-theme=dark]" } });
    expect(modePattern(rules(".dark .card { color: white; }"))).toEqual({ media: null, attr: { prefix: ".dark" } });
    expect(modePattern(rules("@media (prefers-color-scheme: dark) { .card { color: white; } }"))).toEqual({ media: { prefix: "" }, attr: null });
    expect(modePattern(rules(".card { color: black; }"))).toEqual({ media: { prefix: "" }, attr: null });
  });
  it("writes a dark-only edit both ways in a project that has both", () => {
    expect(scopedRules(".lp-pill", { mode: "dark", width: null }, modePattern(hali))).toEqual([
      { media: "(prefers-color-scheme: dark)", selector: ":root:not([data-theme=light]) .lp-pill" },
      { media: null, selector: ":root[data-theme=dark] .lp-pill" },
    ]);
    expect(scopedRules(".a, .b", { mode: "light", width: { kind: "max", px: 640 } }, modePattern(hali))).toEqual([
      { media: "(prefers-color-scheme: light) and (max-width: 640px)", selector: ":root:not([data-theme=dark]) .a, :root:not([data-theme=dark]) .b" },
      { media: "(max-width: 640px)", selector: ":root[data-theme=light] .a, :root[data-theme=light] .b" },
    ]);
    expect(scopedRules(".x", { mode: "all", width: { kind: "min", px: 720 } }, modePattern(hali))).toEqual([{ media: "(min-width: 720px)", selector: ".x" }]);
  });
  it("offers the project's breakpoints that apply at the current width", () => {
    expect(breakpoints(hali)).toEqual({ max: [480, 640], min: [720, 1000] });
    expect(widthOptions(hali, 390)).toEqual([{ kind: "max", px: 480 }, { kind: "max", px: 640 }]);
    expect(widthOptions(hali, 1440)).toEqual([{ kind: "min", px: 1000 }, { kind: "min", px: 720 }]);
    expect(widthOptions(rules("@media (max-width: 479px) { .a {} } @media (max-width: 480px) { .b {} } @media (max-width: 640px) { .c {} }"), 390))
      .toEqual([{ kind: "max", px: 480 }, { kind: "max", px: 640 }]);
    expect(widthOptions(rules(".a {}"), 800)).toEqual([{ kind: "max", px: 1024 }, { kind: "min", px: 768 }, { kind: "min", px: 640 }]);
  });
});

import { appendRule } from "../src/core/server";

describe("writing a scoped rule", () => {
  const d = (prop: string, value: string) => ({ prop, value, important: false });
  it("wraps it in @media, joining the file's last block when it has the same condition", () => {
    const css = ".a {\n  color: red;\n}\n";
    const one = appendRule(css, ":root[data-theme=dark] .a", [d("color", "white")], "(max-width: 640px)");
    expect(one).toBe(".a {\n  color: red;\n}\n@media (max-width: 640px) {\n  :root[data-theme=dark] .a {\n    color: white;\n  }\n}\n");
    const two = appendRule(one, ".b", [d("gap", "4px")], "(max-width:640px)");
    expect(two).toBe(".a {\n  color: red;\n}\n@media (max-width: 640px) {\n  :root[data-theme=dark] .a {\n    color: white;\n  }\n  .b {\n    gap: 4px;\n  }\n}\n");
    expect(appendRule(".x { a: b; }", ".y", [d("c", "d")], "(prefers-color-scheme: dark)")).toBe(".x { a: b; }\n@media (prefers-color-scheme: dark) {\n  .y { c: d; }\n}\n");
    expect(() => appendRule("", ".y", [], "screen { x")).toThrow();
  });
});
