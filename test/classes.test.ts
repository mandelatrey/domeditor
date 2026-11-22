import { describe, expect, it } from "vitest";
import { addClass, hasClassToken, matchSites, narrowSelector, renameClassToken } from "../src/core/classes";

const PAGE = `export default function Page() {
  return (
    <main>
      <section className="lp-glow">
        <h2 className="lp-h2 lp-h2-light">
          Everything an online seller needs
        </h2>
      </section>
      <section className="lp-final">
        <h2 className="lp-h2 lp-h2-light">
          Your next drop could be ready in minutes.
        </h2>
        <Pill dark>Features</Pill>
        <a href="/x" className={\`lp-btn \${ghost ? "g" : ""}\`}>Get started</a>
        <p className={"lp-sub"}>Don&apos;t wait</p>
        <img className='lp-shot' src="/a.png" />
        <div className={cn("lp-x", y)}>Mixed</div>
      </section>
    </main>
  );
}
function Pill({ children }) {
  return <span className="pill">{children}</span>;
}
`;

describe("narrowSelector", () => {
  it("adds the class to the last compound", () => {
    expect(narrowSelector(".lp-h2-light", "own")).toBe(".lp-h2-light.own");
    expect(narrowSelector(":root[data-theme=light] .lp-h2-light", "own")).toBe(":root[data-theme=light] .lp-h2-light.own");
    expect(narrowSelector(".a > h2", "own")).toBe(".a > h2.own");
    expect(narrowSelector(".a>.b", "own")).toBe(".a>.b.own");
  });
  it("puts it before a pseudo-element", () => {
    expect(narrowSelector(".a .b::after", "own")).toBe(".a .b.own::after");
    expect(narrowSelector(".b:before", "own")).toBe(".b.own:before");
    expect(narrowSelector(".b:not(.c)", "own")).toBe(".b:not(.c).own");
    expect(narrowSelector(".b:is(.c, .d)", "own")).toBe(".b:is(.c, .d).own");
  });
});

describe("class tokens", () => {
  it("matches whole class names", () => {
    expect(hasClassToken(".a.own:hover", "own")).toBe(true);
    expect(hasClassToken(".a.own-2", "own")).toBe(false);
    expect(renameClassToken(".x.own, .own .y", "own", "mine")).toBe(".x.mine, .mine .y");
  });
});

describe("matchSites", () => {
  it("tells apart tags with the same classes by their text", () => {
    const s = matchSites(PAGE, "app/page.tsx", { tag: "h2", classes: ["lp-h2", "lp-h2-light"], text: "Your next drop could be ready in minutes." });
    expect(s.map((x) => [x.line, x.text])).toEqual([[5, false], [10, true]]);
  });
  it("finds a component's tag, but not as holding the text", () => {
    const s = matchSites(PAGE, "app/page.tsx", { tag: "span", classes: ["pill"], text: "Features" });
    expect(s.map((x) => [x.line, x.text])).toEqual([[23, false]]);
  });
  it("reads template, braced and single-quoted literals", () => {
    expect(matchSites(PAGE, "f.tsx", { tag: "a", classes: ["lp-btn"], text: "Get started" }).map((x) => x.text)).toEqual([true]);
    expect(matchSites(PAGE, "f.tsx", { tag: "p", classes: ["lp-sub"], text: "Don't wait" }).map((x) => x.text)).toEqual([true]);
    expect(matchSites(PAGE, "f.tsx", { tag: "img", classes: ["lp-shot"], text: "" })).toHaveLength(1);
  });
  it("skips class lists built by a function", () => {
    expect(matchSites(PAGE, "f.tsx", { tag: "div", classes: ["lp-x"], text: "Mixed" })).toEqual([]);
  });
});

describe("addClass", () => {
  it("adds the class to the tag on that line only", () => {
    const out = addClass(PAGE, { file: "f.tsx", line: 10, tag: "h2", classes: ["lp-h2", "lp-h2-light"] }, "lp-h2-cta");
    expect(out).toContain(`<h2 className="lp-h2 lp-h2-light lp-h2-cta">\n          Your next`);
    expect(out).toContain(`<h2 className="lp-h2 lp-h2-light">\n          Everything`);
  });
  it("writes into template, braced and quoted literals", () => {
    expect(addClass(PAGE, { file: "f.tsx", line: 14, tag: "a", classes: ["lp-btn", "g"] }, "own")).toContain('className={`lp-btn ${ghost ? "g" : ""} own`}');
    expect(addClass(PAGE, { file: "f.tsx", line: 15, tag: "p", classes: ["lp-sub"] }, "own")).toContain('className={"lp-sub own"}');
    expect(addClass(PAGE, { file: "f.tsx", line: 16, tag: "img", classes: ["lp-shot"] }, "own")).toContain("className='lp-shot own'");
  });
  it("leaves a tag that already has it, and refuses a tag that moved", () => {
    const once = addClass(PAGE, { file: "f.tsx", line: 10, tag: "h2", classes: ["lp-h2", "lp-h2-light"] }, "own");
    expect(addClass(once, { file: "f.tsx", line: 10, tag: "h2", classes: ["lp-h2", "lp-h2-light"] }, "own")).toBe(once);
    expect(() => addClass(PAGE, { file: "f.tsx", line: 11, tag: "h2", classes: ["lp-h2"] }, "own")).toThrow(/no longer there/);
    expect(() => addClass(PAGE, { file: "f.tsx", line: 10, tag: "h2", classes: ["lp-h2"] }, "a b")).toThrow(/not a class name/);
  });
});
