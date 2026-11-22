// "Only this element": give one element a class of its own, so a style can be narrowed to it while the
// other elements a shared style applies to keep their look. Finds the element's tag in the component it
// is written in (by its class attribute and the text inside it) and adds the class there. Pure: no DOM
// and no Node APIs, so the panel, the dev server and the tests share it.
import { textPattern } from "./text";

/** A class name domeditor will write. */
export const isClassName = (s: string) => /^-?[_a-zA-Z][\w-]*$/.test(s);

/** Whether a selector uses a class: `.a.cls:hover` uses `cls`, `.cls-2` does not. */
export const hasClassToken = (selector: string, cls: string) =>
  new RegExp(`\\.${cls.replace(/[-\\]/g, "\\$&")}(?![\\w-])`).test(selector);

/** A selector with one class renamed. */
export const renameClassToken = (selector: string, from: string, to: string) =>
  selector.replace(new RegExp(`\\.${from.replace(/[-\\]/g, "\\$&")}(?![\\w-])`, "g"), `.${to}`);

/** One complex selector narrowed to elements that also have `cls`: the class goes on the last compound,
 *  before any pseudo-element. `.a > .b::after` -> `.a > .b.cls::after`; `:root[data-theme=light] h2` ->
 *  `:root[data-theme=light] h2.cls`. */
export function narrowSelector(part: string, cls: string): string {
  const s = part.trim();
  // the last compound starts after the last top-level combinator (space, >, +, ~)
  let depth = 0, start = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (depth === 0 && /[\s>+~]/.test(ch)) start = i + 1;
  }
  const last = s.slice(start);
  depth = 0;
  for (let i = 0; i < last.length; i++) {
    const ch = last[i]!;
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (depth === 0 && ch === ":" && (last[i + 1] === ":" || /^:(before|after|first-line|first-letter)\b/i.test(last.slice(i)))) {
      return s.slice(0, start) + last.slice(0, i) + `.${cls}` + last.slice(i);
    }
  }
  return `${s}.${cls}`;
}

// ---------- class attributes in source

/** A tag in a source file with its class written as a literal (`className="a b"`, `className={'a b'}`,
 *  ``className={`a ${x}`}``, `class="a b"`). `tokens` are the classes written out (not the `${...}` parts);
 *  the class list's text runs from `valueStart` to `valueEnd`. `body` is what is between the tag and its
 *  closing tag (null when it closes itself or the closing tag is not found). */
export type ClassSite = {
  file: string;
  line: number;
  tag: string;
  tokens: string[];
  valueStart: number;
  valueEnd: number;
  body: string | null;
};

const MAX_TAG = 6000;

/** Where an opening tag that starts at `<` (index `at`) ends: the index just past its `>`, whether it
 *  closes itself, and the depth-0 stretches of its attributes. Null if it is not a tag after all. */
function tagEnd(src: string, at: number, nameEnd: number): { end: number; self: boolean; attrs: [number, number][] } | null {
  let depth = 0;
  let quote: string | null = null;
  const attrs: [number, number][] = [];
  let runStart = nameEnd;
  const limit = Math.min(src.length, at + MAX_TAG);
  for (let i = nameEnd; i < limit; i++) {
    const ch = src[i]!;
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch; else if (ch === "{") {
      if (depth === 0) attrs.push([runStart, i]);
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) runStart = i + 1;
      if (depth < 0) return null;
    } else if (depth === 0 && ch === ">") {
      attrs.push([runStart, i]);
      return { end: i + 1, self: src[i - 1] === "/", attrs };
    } else if (depth === 0 && ch === "<") return null;
  }
  return null;
}

/** The class list written in a tag's attributes, if it is a literal. */
function classValue(src: string, from: number, to: number): { valueStart: number; valueEnd: number; tokens: string[] } | null {
  const re = /(?<![\w-])(?:className|class)\s*=\s*/g;
  re.lastIndex = from;
  for (let m = re.exec(src); m && m.index < to; m = re.exec(src)) {
    let i = m.index + m[0].length;
    let braced = false;
    if (src[i] === "{") {
      braced = true;
      i++;
      while (/\s/.test(src[i] ?? "")) i++;
    }
    const q = src[i];
    if (q !== '"' && q !== "'" && !(braced && q === "`")) continue;
    const valueStart = i + 1;
    let j = valueStart;
    let tdepth = 0;
    for (; j < src.length && j - valueStart < 2000; j++) {
      const ch = src[j]!;
      if (ch === "\\") { j++; continue; }
      if (q === "`" && ch === "$" && src[j + 1] === "{") { tdepth++; j++; continue; }
      if (tdepth > 0) { if (ch === "{") tdepth++; else if (ch === "}") tdepth--; continue; }
      if (ch === q) break;
      if (ch === "\n" && q !== "`") return null;
    }
    if (src[j] !== q) return null;
    if (braced) {
      let k = j + 1;
      while (/\s/.test(src[k] ?? "")) k++;
      if (src[k] !== "}") return null; // className={"a " + b}, cn("a", ...): not a plain literal
    }
    const text = src.slice(valueStart, j).replace(/\$\{[^}]*\}/g, " ");
    return { valueStart, valueEnd: j, tokens: text.split(/\s+/).filter(Boolean) };
  }
  return null;
}

/** What is between an opening tag and its closing tag, counting nested tags of the same name. */
function bodyOf(src: string, tag: string, from: number): string | null {
  const re = new RegExp(`<(/?)${tag.replace(/[.$]/g, "\\$&")}(?=[\\s/>])`, "g");
  re.lastIndex = from;
  let depth = 1;
  for (let m = re.exec(src); m && m.index - from < 50_000; m = re.exec(src)) {
    if (m[1]) {
      if (--depth === 0) return src.slice(from, m.index);
    } else {
      const t = tagEnd(src, m.index, m.index + m[0].length);
      if (t && !t.self) depth++;
    }
  }
  return null;
}

/** Every tag in a file whose class is written as a literal. */
export function classSites(content: string, file: string): ClassSite[] {
  const out: ClassSite[] = [];
  const re = /<([a-zA-Z][\w.:-]*)(?=[\s/>])/g;
  for (let m = re.exec(content); m; m = re.exec(content)) {
    const t = tagEnd(content, m.index, m.index + m[0].length);
    if (!t) continue;
    let v: ReturnType<typeof classValue> = null;
    for (const [a, b] of t.attrs) if ((v = classValue(content, a, b))) break;
    if (!v) continue;
    out.push({
      file,
      line: content.slice(0, m.index).split("\n").length,
      tag: m[1]!,
      ...v,
      body: t.self ? null : bodyOf(content, m[1]!, t.end),
    });
  }
  return out;
}

/** An element as the page shows it: its tag, its classes, and a text inside it (or ""). */
export type ElementInfo = { tag: string; classes: string[]; text: string };

/** Where an element may be written: tags of its name whose written classes it all has. With a text,
 *  `text` says whether the tag holds it, which tells apart tags with the same classes (two headings
 *  styled alike) and a component's tag (which holds `{children}`, not the text). */
export function matchSites(content: string, file: string, el: ElementInfo): (ClassSite & { text: boolean })[] {
  const has = new Set(el.classes);
  const re = el.text ? textPattern(el.text) : null;
  return classSites(content, file)
    .filter((s) => s.tag.toLowerCase() === el.tag.toLowerCase() && s.tokens.length > 0 && s.tokens.every((t) => has.has(t)))
    .map((s) => ({ ...s, text: !!re && s.body !== null && new RegExp(re.source).test(s.body) }));
}

/** Add `cls` to the class list of the tag written at `at` (a line, the tag and the classes the element
 *  had). Leaves the file as it is if the tag already has it. */
export function addClass(content: string, at: { file: string; line: number; tag: string; classes: string[] }, cls: string): string {
  if (!isClassName(cls)) throw new Error(`not a class name: ${cls}`);
  const sites = matchSites(content, at.file, { tag: at.tag, classes: [...at.classes, cls], text: "" }).filter((s) => s.line === at.line);
  if (sites.length !== 1) throw new Error(`the <${at.tag}> on line ${at.line} of ${at.file} is no longer there; reload and try again`);
  const s = sites[0]!;
  if (s.tokens.includes(cls)) return content;
  const value = content.slice(s.valueStart, s.valueEnd);
  const trimmed = value.replace(/\s+$/, "");
  const insert = trimmed ? ` ${cls}` : cls;
  const at2 = s.valueStart + trimmed.length;
  return content.slice(0, at2) + insert + content.slice(at2);
}
