// The dev-server half of domeditor: lists the rules in a project's .css files and writes edits made
// in the browser back into them. Framework adapters (domeditor/vite, domeditor/next/route) wrap
// createHandler; it refuses to run unless NODE_ENV is "development".
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import postcss, { type AtRule, type Declaration, type Rule } from "postcss";
import { normCondition, normSelector, sameDecls, type Decl, type RuleRef, type SourceRule } from "./shared";
import { addClass, matchSites, type ElementInfo } from "./classes";
import { textPattern } from "./text";

export { textPattern };

export class EditError extends Error {}

const TAILWIND_ONLY = new Set(["custom-variant", "variant", "utility", "theme"]);

function contextOf(rule: Rule): string[] | null {
  const ctx: string[] = [];
  for (let p = rule.parent; p && p.type !== "root"; p = p.parent) {
    if (p.type === "atrule") {
      const a = p as AtRule;
      if (/keyframes$/i.test(a.name)) return null; // keyframe steps are not selectors
      // Tailwind directives (`@custom-variant dark { &:where(...) }`, `@utility`...) are compiled away,
      // so their selectors never reach the browser as rules of their own
      if (TAILWIND_ONLY.has(a.name.toLowerCase())) return null;
      ctx.unshift(`${a.name.toLowerCase()} ${normCondition(a.params)}`);
    } else if (p.type === "rule") ctx.unshift(`rule ${normSelector((p as Rule).selector)}`);
  }
  return ctx;
}

const declsOf = (rule: Rule): Declaration[] => (rule.nodes ?? []).filter((n): n is Declaration => n.type === "decl");

/** Every style rule in a stylesheet, with the reference the browser side uses to find it. */
export function sourceRules(css: string, file: string) {
  const root = postcss.parse(css, { from: file });
  const seen = new Map<string, number>();
  const rules: { rule: Rule; ref: SourceRule }[] = [];
  root.walkRules((rule) => {
    const context = contextOf(rule);
    if (!context) return;
    const selector = normSelector(rule.selector);
    const k = JSON.stringify([context, selector]);
    const occurrence = seen.get(k) ?? 0;
    seen.set(k, occurrence + 1);
    const decls = declsOf(rule).map((d) => ({ prop: d.prop, value: d.value, important: !!d.important }));
    rules.push({ rule, ref: { file, context, selector, occurrence, line: rule.source?.start?.line ?? 0, decls } });
  });
  return { root, rules };
}

/** Make a rule's declarations equal `after`, touching only what changed so the file keeps its formatting. */
function patchRule(rule: Rule, after: readonly Decl[]) {
  const existing = declsOf(rule);
  const kept = new Set<Declaration>();
  const seen = new Map<string, number>();
  const added: Decl[] = [];
  for (const d of after) {
    const n = seen.get(d.prop) ?? 0;
    seen.set(d.prop, n + 1);
    const node = existing.filter((e) => e.prop === d.prop)[n];
    if (!node) { added.push(d); continue; }
    kept.add(node);
    if (node.value !== d.value) node.value = d.value;
    if (!!node.important !== d.important) node.important = d.important;
  }
  for (const node of existing) if (!kept.has(node)) node.remove();
  const oneLine = !/\n/.test(rule.toString());
  for (const d of added) {
    const last = declsOf(rule).at(-1);
    const node = postcss.decl({ prop: d.prop, value: d.value, important: d.important });
    node.raws.before = last?.raws.before ?? (oneLine ? " " : "\n  ");
    node.raws.between = last?.raws.between ?? ": ";
    rule.append(node);
    if (oneLine && !rule.raws.after) rule.raws.after = " ";
  }
  rule.raws.semicolon = true;
}

const sameRef = (a: RuleRef, b: RuleRef) =>
  a.selector === b.selector && a.occurrence === b.occurrence && JSON.stringify(a.context) === JSON.stringify(b.context);

/** Apply one rule edit to a stylesheet's text. Refuses if the rule changed on disk since the browser read it. */
export function applyRuleEdit(css: string, edit: { ref: RuleRef; before: Decl[]; after: Decl[] }): string {
  const { root, rules } = sourceRules(css, edit.ref.file);
  const hit = rules.find((r) => sameRef(r.ref, edit.ref));
  if (!hit) throw new EditError(`${edit.ref.selector} is no longer in the file`);
  if (!sameDecls(hit.ref.decls, edit.before)) throw new EditError(`${edit.ref.selector} was changed in the file since the editor read it; reload and try again`);
  patchRule(hit.rule, edit.after);
  return root.toString();
}

/** Add a new rule at the end of a stylesheet, written one-line or multi-line to match most of the file's
 *  rules. With `media`, inside `@media <media> { }`: the file's last block if it has that condition, else a
 *  new one. */
export function appendRule(css: string, selector: string, decls: Decl[], media: string | null = null): string {
  if (!selector.trim() || /[{}]/.test(selector)) throw new EditError("not a valid selector");
  if (media !== null && (!media.trim() || /[{};]/.test(media))) throw new EditError("not a valid media condition");
  try {
    postcss.parse(`${selector} {}`);
  } catch {
    throw new EditError("not a valid selector");
  }
  const root = postcss.parse(css);
  let multi = 0, one = 0;
  root.walkRules((r) => { if (/\n/.test(r.toString())) multi++; else one++; });
  const text = (d: Decl) => `${d.prop}: ${d.value}${d.important ? " !important" : ""};`;
  const indent = media ? "  " : "";
  const body = multi > one
    ? `\n${decls.map((d) => `${indent}  ${text(d)}\n`).join("")}${indent}`
    : decls.length ? ` ${decls.map(text).join(" ")} ` : " ";
  const rule = `${indent}${selector.trim()} {${body}}`;
  if (!media) return `${css.replace(/\s*$/, "\n")}${rule}\n`;
  const last = root.last;
  if (last?.type === "atrule" && (last as AtRule).name === "media" && normCondition((last as AtRule).params) === normCondition(media)) {
    const block = last as AtRule;
    const end = block.source?.end?.offset;
    const close = end === undefined ? -1 : css.lastIndexOf("}", end);
    if (close >= 0) return css.slice(0, close).replace(/\s*$/, "\n") + rule + "\n" + css.slice(close);
  }
  return `${css.replace(/\s*$/, "\n")}@media ${media.trim()} {\n${rule}\n}\n`;
}
// ---------- text: copy written in the project's components

/** Where a piece of text a page shows is written in a source file. */
export type TextHit = { file: string; line: number; index: number; length: number };
export type TextEdit = { before: string; after: string; at?: { file: string; line: number } };

const TEXT_EXT = /\.(tsx|jsx|ts|js|mjs|mdx|md|html|vue|svelte|astro)$/;
/** Every place a text is written in one file's contents: as a whole "string", or as a whole run of
 *  JSX/HTML text between tags and {expressions} (the same pieces React and the browser make text nodes of). */
export function findTextIn(content: string, file: string, text: string): TextHit[] {
  const re = textPattern(text);
  if (!re) return [];
  const prose = /\.mdx?$/.test(file);
  const out: TextHit[] = [];
  for (const m of content.matchAll(re)) {
    const start = m.index!, end = start + m[0].length;
    const q = content[start - 1];
    const quoted = (q === '"' || q === "'" || q === "`") && content[end] === q;
    const prev = /\S?(?=\s*$)/.exec(content.slice(Math.max(0, start - 200), start))?.[0] ?? "";
    const next = /^\s*(\S?)/.exec(content.slice(end, end + 200))?.[1] ?? "";
    const markup = (prev === ">" || prev === "}" || prev === "") && (next === "<" || next === "{" || next === "");
    const word = (a: string | undefined, b: string | undefined) => !!a && !!b && /\w/.test(a) && /\w/.test(b);
    if (!quoted && !markup && !(prose && !word(content[start - 1], m[0][0]) && !word(m[0].at(-1), content[end]))) continue;
    out.push({ file, line: content.slice(0, start).split("\n").length, index: start, length: m[0].length });
  }
  return out;
}

/** Replace one hit with new text, escaped for where it sits: a "string" or JSX/markup text. */
export function replaceText(content: string, hit: TextHit, after: string): string {
  const q = content[hit.index - 1];
  const inString = (q === '"' || q === "'" || q === "`") && content[hit.index + hit.length] === q;
  let text = after.replace(/\s+/g, " ").trim();
  if (!text) throw new EditError("the text cannot be empty: delete it in the code");
  if (inString) {
    text = text.replace(/\\/g, "\\\\").replaceAll(q!, `\\${q}`);
    if (q === "`") text = text.replace(/\$\{/g, "\\${");
  } else if (/[{}<>]/.test(text)) {
    throw new EditError("text with { } < or > has to be changed in the code");
  }
  return content.slice(0, hit.index) + text + content.slice(hit.index + hit.length);
}

// ---------- text a script split up: find the whole strings it came from

/** A string in the source that makes up part of a text on the page; start/end are offsets in that
 *  text with its spacing collapsed. */
export type Piece = { file: string; line: number; text: string; start: number; end: number };

const ENTITIES: Record<string, string> = { "&apos;": "'", "&#39;": "'", "&quot;": '"', "&#34;": '"', "&amp;": "&", "&nbsp;": " ", "&#160;": " ", "&rsquo;": "’", "&lsquo;": "‘", "&ldquo;": "“", "&rdquo;": "”" };
const squashText = (t: string) => t.replace(/\s+/g, " ").trim();

/** Every string literal and JSX text run in a file, as the page would show it. */
export function literalsIn(content: string): { text: string; index: number }[] {
  const out: { text: string; index: number }[] = [];
  const add = (raw: string, index: number, js: boolean) => {
    let t = js ? raw.replace(/\\(["'`\\])/g, "$1").replace(/\\n/g, " ") : raw;
    t = squashText(t.replace(/&[#\w]+;/g, (e) => ENTITIES[e] ?? e));
    if (t.length >= 6 && /\p{L}/u.test(t)) out.push({ text: t, index });
  };
  for (const m of content.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\$]|\\.|\$(?!\{))*)`/g)) {
    add(m[1] ?? m[2] ?? m[3] ?? "", m.index! + 1, true);
  }
  for (const m of content.matchAll(/[>}]([^<>{}]+)[<{]/g)) add(m[1]!, m.index! + 1 + (m[1]!.length - m[1]!.trimStart().length), false);
  return out;
}

/** The source strings that, in order, make up a text the page shows: the largest cover of the text by
 *  non-overlapping strings (so "Haali gives … fulfil." split into one <span> per word is found as the one
 *  constant it was split from). Empty if nothing in the code makes up a real part of it. */
export function findPieces(files: { file: string; content: string }[], shown: string): Piece[] {
  const target = squashText(shown);
  if (target.length < 6) return [];
  const cands: Piece[] = [];
  for (const { file, content } of files) {
    for (const lit of literalsIn(content)) {
      for (let at = target.indexOf(lit.text); at >= 0; at = target.indexOf(lit.text, at + 1)) {
        // whole words only
        if (/\w/.test(target[at - 1] ?? "") && /^\w/.test(lit.text)) continue;
        if (/\w/.test(target[at + lit.text.length] ?? "") && /\w$/.test(lit.text)) continue;
        cands.push({ file, line: content.slice(0, lit.index).split("\n").length, text: lit.text, start: at, end: at + lit.text.length });
      }
    }
  }
  if (!cands.length) return [];
  // weighted interval scheduling: cover as much of the text as possible
  cands.sort((a, b) => a.end - b.end || b.start - a.start);
  const best: { covered: number; pick: Piece[] }[] = [];
  for (let i = 0; i < cands.length; i++) {
    const c = cands[i]!;
    let j = i - 1;
    while (j >= 0 && cands[j]!.end > c.start) j--;
    const take = { covered: (j >= 0 ? best[j]!.covered : 0) + (c.end - c.start), pick: [...(j >= 0 ? best[j]!.pick : []), c] };
    const skip = i > 0 ? best[i - 1]! : { covered: 0, pick: [] };
    best.push(take.covered > skip.covered || (take.covered === skip.covered && take.pick.length < skip.pick.length) ? take : skip);
  }
  const { covered, pick } = best.at(-1)!;
  // worth it only if the strings make up most of the text (not a stray word that happens to match)
  return covered >= target.replace(/[^\p{L}\p{N}]/gu, "").length * 0.5 ? pick : [];
}

// ---------- the handler

export type HandlerOptions = {
  /** The project root; file paths are relative to it. Default: process.cwd(). */
  root?: string;
  /** Folders (relative to root) to look for .css files in. Default: the whole project. */
  include?: string[];
  /** Folder names never searched. Added to the defaults (node_modules, .next, dist, build...). */
  exclude?: string[];
};

const SKIP = ["node_modules", ".git", ".next", ".turbo", ".vercel", ".svelte-kit", "dist", "build", "out", "coverage", "public"];

/** Every editable stylesheet, as root-relative paths with forward slashes ("app/(admin)/admin.css"),
 *  the spelling Turbopack uses in its CSS chunks ("[project]/app/(admin)/admin.css"). */
export function cssFiles(root: string, include: string[] = ["."], exclude: string[] = []): string[] {
  return projectFiles(root, include, exclude, /\.css$/);
}

/** Files under the project root whose name matches, root-relative with forward slashes. */
export function projectFiles(root: string, include: string[] = ["."], exclude: string[] = [], match: RegExp): string[] {
  const skip = new Set([...SKIP, ...exclude]);
  const seen = new Set<string>();
  const walk = (dir: string): string[] => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return [];
    }
    return entries.flatMap((e) => {
      const p = join(dir, e.name);
      if (e.isDirectory()) return skip.has(e.name) || e.name.startsWith(".") ? [] : walk(p);
      return match.test(e.name) ? [p] : [];
    });
  };
  for (const d of include) for (const f of walk(resolve(root, d))) seen.add(relative(root, f).split(sep).join("/"));
  return [...seen].filter((f) => !f.startsWith("..")).sort();
}

type SaveRequest = {
  edits?: { ref: RuleRef; before: Decl[]; after: Decl[] }[];
  create?: { file: string; selector: string; decls: Decl[] };
  /** new rules for scoped edits (dark mode only, a screen size), each optionally inside @media */
  creates?: { file: string; media: string | null; selector: string; decls: Decl[] }[];
  /** text changes: the text as the page showed it, the new text, and (when it is written in more than one place) which */
  texts?: TextEdit[];
  /** look up where texts are written, without changing anything */
  find?: string[];
  /** for texts a script split up: the source strings each is made of */
  pieces?: string[];
  /** look up where an element is written (to give it a class of its own), without changing anything */
  locate?: ElementInfo;
  /** classes to add to elements where they are written ("only this element") */
  classes?: { file: string; line: number; tag: string; classes: string[]; add: string }[];
};

/** A text change that cannot be made as asked: not in the code, or in more than one place. */
export class TextError extends EditError {
  constructor(message: string, readonly text: string, readonly hits: TextHit[]) {
    super(message);
  }
}

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

/** GET lists the rules in every stylesheet; POST writes edits. Development only. */
const clip = (s: string) => (s.length > 40 ? `${s.slice(0, 39)}…` : s);

export function createHandler(options: HandlerOptions = {}): (req: Request) => Promise<Response> {
  return async (req) => {
    if (process.env.NODE_ENV !== "development") return json(404, { error: "not found" });
    // only the editor's own page may call this: a custom header forces a CORS preflight on other sites
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (req.headers.get("x-domeditor") !== "1" || (origin && new URL(origin).host !== host)) {
      return json(403, { error: "forbidden" });
    }
    const root = resolve(options.root ?? process.cwd());
    try {
      const files = cssFiles(root, options.include, options.exclude);
      const read = (f: string) => readFileSync(join(root, f), "utf8");
      if (req.method === "GET") {
        const rules = files.flatMap((f) => sourceRules(read(f), f).rules.map((r) => r.ref));
        return json(200, { root: root.split(sep).join("/"), files, rules });
      }
      if (req.method === "POST") {
        const text = await req.text();
        if (text.length > 1_000_000) throw new EditError("request too large");
        const { edits = [], create, creates = [], texts = [], find, pieces, locate, classes = [] } = JSON.parse(text) as SaveRequest;
        const sources = () => projectFiles(root, options.include, options.exclude, TEXT_EXT);
        const lookup = (t: string, read: (f: string) => string) =>
          sources().flatMap((f) => {
            const c = read(f);
            return c.length > 2_000_000 ? [] : findTextIn(c, f, t);
          });
        if (pieces) {
          const files = sources().map((f) => ({ file: f, content: read(f) })).filter((f) => f.content.length <= 2_000_000);
          return json(200, { pieces: pieces.map((t) => findPieces(files, t)) });
        }
        if (locate) {
          const sites = sources().flatMap((f) => {
            const c = read(f);
            return c.length > 2_000_000 ? [] : matchSites(c, f, locate);
          });
          return json(200, { sites: sites.map(({ file, line, tokens, text }) => ({ file, line, tokens, text })) });
        }
        if (find) {
          const cache = new Map<string, string>();
          const readOnce = (f: string) => cache.get(f) ?? (cache.set(f, read(f)), cache.get(f)!);
          return json(200, { found: find.map((t) => lookup(t, readOnce).map(({ file, line }) => ({ file, line }))) });
        }
        const byFile = new Map<string, string>();
        const current = (f: string) => {
          if (!files.includes(f)) throw new EditError(`not an editable stylesheet: ${f}`);
          return byFile.get(f) ?? read(f);
        };
        for (const e of edits) byFile.set(e.ref.file, applyRuleEdit(current(e.ref.file), e));
        if (create) byFile.set(create.file, appendRule(current(create.file), create.selector, create.decls));
        for (const c of creates) byFile.set(c.file, appendRule(current(c.file), c.selector, c.decls, c.media));
        if (texts.length) {
          const editable = new Set(sources());
          const now = (f: string) => byFile.get(f) ?? read(f);
          for (const t of texts) {
            let hits = lookup(t.before, now);
            if (t.at) hits = hits.filter((h) => h.file === t.at!.file && h.line === t.at!.line);
            if (hits.length === 0) throw new TextError(`"${clip(t.before)}" is not written in the code (it may come from data)`, t.before, []);
            if (hits.length > 1) throw new TextError(`"${clip(t.before)}" is written in ${hits.length} places: choose one`, t.before, hits);
            const hit = hits[0]!;
            if (!editable.has(hit.file)) throw new EditError(`not an editable file: ${hit.file}`);
            byFile.set(hit.file, replaceText(now(hit.file), hit, t.after));
          }
        }
        if (classes.length) {
          const editable = new Set(sources());
          const now = (f: string) => byFile.get(f) ?? read(f);
          for (const c of classes) {
            if (!editable.has(c.file)) throw new EditError(`not an editable file: ${c.file}`);
            try {
              byFile.set(c.file, addClass(now(c.file), c, c.add));
            } catch (e) {
              throw new EditError((e as Error).message);
            }
          }
        }
        // every edit applied cleanly: only now write, so a refused edit leaves all files untouched
        for (const [f, css] of byFile) writeFileSync(join(root, f), css);
        return json(200, { ok: true, files: [...byFile.keys()] });
      }
      return json(405, { error: "method not allowed" });
    } catch (err) {
      const text = err instanceof TextError ? { text: err.text, hits: err.hits.map(({ file, line }) => ({ file, line })) } : {};
      return json(err instanceof EditError ? 409 : 400, { error: err instanceof Error ? err.message : String(err), ...text });
    }
  };
}
