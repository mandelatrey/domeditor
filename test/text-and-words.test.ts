import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHandler, findTextIn, replaceText } from "../src/core/server";
import { composeClamp, describeCondition, describeState, parseClamp, weightName } from "../src/core/shared";

describe("plain words", () => {
  it("describes screen sizes and preferences", () => {
    expect(describeCondition("@media (max-width: 640px)")).toBe("Screens up to 640px wide");
    expect(describeCondition("(min-width: 720px)")).toBe("Screens 720px and wider");
    expect(describeCondition("(min-width: 1000px) and (max-width: 1179px)")).toBe("Screens 1000px–1179px wide");
    expect(describeCondition("(width <= 480px)")).toBe("Screens up to 480px wide");
    expect(describeCondition("(prefers-color-scheme: dark)")).toBe("Dark mode");
    expect(describeCondition("(prefers-reduced-motion: no-preference)")).toBe("Animations allowed");
    expect(describeCondition("screen and (hover: hover)")).toBe("Mouse or trackpad");
    expect(describeCondition("(aspect-ratio: 16/9)")).toBe("(aspect-ratio: 16/9)");
  });
  it("describes states", () => {
    expect(describeState(":hover")).toBe("On hover");
    expect(describeState(":focus-visible")).toBe("Keyboard focus");
    expect(describeState(":hover::before")).toBe("On hover · Added before the content");
  });
  it("reads responsive sizes and names weights", () => {
    expect(parseClamp("clamp(32px, 5vw, 56px)")).toEqual(["32px", "5vw", "56px"]);
    expect(parseClamp("clamp(1rem, calc(1rem + 2vw), 3rem)")).toEqual(["1rem", "calc(1rem + 2vw)", "3rem"]);
    expect(parseClamp("56px")).toBeNull();
    expect(composeClamp(["30px", "5vw", "60px"])).toBe("clamp(30px, 5vw, 60px)");
    expect(weightName("600")).toBe("Semibold");
    expect(weightName("650")).toBe("Semibold+");
    expect(weightName("bold")).toBe("Bold");
  });
});

describe("finding and changing copy in the source", () => {
  const tsx = `export function Hero({ shop }) {
  return (
    <header>
      <h1 className="by-h1">Your shop, open all day</h1>
      <p>
        Tap anything you like and your order opens in WhatsApp, already
        written out for{" "}
        {shop.name}.
      </p>
      <p>Don&apos;t wait</p>
      <span>{7}</span>
    </header>
  );
}
const LABELS = { ask: "Ask a question on WhatsApp", stock: 'It\\'s in stock' };
`;
  const hits = (t: string) => findTextIn(tsx, "Hero.tsx", t).map((h) => h.line);

  it("finds JSX text, including text wrapped over lines and written with entities", () => {
    expect(hits("Your shop, open all day")).toEqual([4]);
    expect(hits("Tap anything you like and your order opens in WhatsApp, already written out for ")).toEqual([6]);
    expect(hits("Don't wait")).toEqual([10]);
    expect(hits("Ask a question on WhatsApp")).toEqual([15]);
    expect(hits("It's in stock")).toEqual([15]);
  });
  it("does not match part of a longer text, or code", () => {
    expect(hits("open all")).toEqual([]);
    expect(hits("7")).toEqual([]);
    expect(hits("shop")).toEqual([]);
    expect(hits("iDear")).toEqual([]);
  });
  it("replaces text, escaped for where it sits", () => {
    const at = (t: string) => findTextIn(tsx, "Hero.tsx", t)[0]!;
    expect(replaceText(tsx, at("Your shop, open all day"), "Open every day")).toContain(`<h1 className="by-h1">Open every day</h1>`);
    expect(replaceText(tsx, at("Ask a question on WhatsApp"), 'Ask "us" anything')).toContain(`ask: "Ask \\"us\\" anything"`);
    expect(replaceText(tsx, at("It's in stock"), "It's here")).toContain(`stock: 'It\\'s here'`);
    expect(() => replaceText(tsx, at("Your shop, open all day"), "Hi {name}")).toThrow(/in the code/);
    expect(() => replaceText(tsx, at("Your shop, open all day"), "  ")).toThrow(/empty/);
  });
});

describe("text changes through the handler", () => {
  let root: string;
  const post = (body: unknown) =>
    createHandler({ root })(new Request("http://localhost:3000/x", { method: "POST", headers: { host: "localhost:3000", "x-domeditor": "1" }, body: JSON.stringify(body) }));
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "domeditor-text-"));
    mkdirSync(join(root, "app"), { recursive: true });
    mkdirSync(join(root, "node_modules", "x"), { recursive: true });
    writeFileSync(join(root, "app", "page.tsx"), `export default () => <h1>Hello there</h1>;\n`);
    writeFileSync(join(root, "app", "nav.tsx"), `export const Nav = () => <a>Shop</a>;\nexport const Foot = () => <b>Shop</b>;\n`);
    writeFileSync(join(root, "node_modules", "x", "i.js"), `"Hello there"`);
    vi.stubEnv("NODE_ENV", "development");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(root, { recursive: true, force: true });
  });

  it("finds where texts are written", async () => {
    const r = await (await post({ find: ["Hello there", "Shop", "iDear"] })).json();
    expect(r.found).toEqual([[{ file: "app/page.tsx", line: 1 }], [{ file: "app/nav.tsx", line: 1 }, { file: "app/nav.tsx", line: 2 }], []]);
  });
  it("changes text written in one place", async () => {
    expect((await post({ texts: [{ before: "Hello there", after: "Hi" }] })).status).toBe(200);
    expect(readFileSync(join(root, "app", "page.tsx"), "utf8")).toBe(`export default () => <h1>Hi</h1>;\n`);
  });
  it("asks which place when it is written in several, and refuses text from data", async () => {
    const many = await post({ texts: [{ before: "Shop", after: "Store" }] });
    expect(many.status).toBe(409);
    expect((await many.json()).hits).toEqual([{ file: "app/nav.tsx", line: 1 }, { file: "app/nav.tsx", line: 2 }]);
    expect((await post({ texts: [{ before: "Shop", after: "Store", at: { file: "app/nav.tsx", line: 2 } }] })).status).toBe(200);
    expect(readFileSync(join(root, "app", "nav.tsx"), "utf8")).toBe(`export const Nav = () => <a>Shop</a>;\nexport const Foot = () => <b>Store</b>;\n`);
    const data = await post({ texts: [{ before: "iDear", after: "x" }] });
    expect(data.status).toBe(409);
    expect((await data.json()).error).toMatch(/not written in the code/);
  });
});
