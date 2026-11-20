// The dev-server half of domeditor: lists the rules in a project's .css files and writes edits made
// in the browser back into them. Framework adapters (domeditor/vite, domeditor/next/route) wrap
// createHandler; it refuses to run unless NODE_ENV is "development".
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import postcss, { type AtRule, type Declaration, type Rule } from "postcss";
import { normCondition, normSelector, sameDecls, type Decl, type RuleRef, type SourceRule } from "./shared";

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

/** Add a new rule at the end of a stylesheet, written one-line or multi-line to match most of the file's rules. */
export function appendRule(css: string, selector: string, decls: Decl[]): string {
  if (!selector.trim() || /[{}]/.test(selector)) throw new EditError("not a valid selector");
  try {
    postcss.parse(`${selector} {}`);
  } catch {
    throw new EditError("not a valid selector");
  }
  let multi = 0, one = 0;
  postcss.parse(css).walkRules((r) => { if (/\n/.test(r.toString())) multi++; else one++; });
  const text = (d: Decl) => `${d.prop}: ${d.value}${d.important ? " !important" : ""};`;
  const body = multi > one
    ? `\n${decls.map((d) => `  ${text(d)}\n`).join("")}`
    : decls.length ? ` ${decls.map(text).join(" ")} ` : " ";
  return `${css.replace(/\s*$/, "\n")}${selector.trim()} {${body}}\n`;
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
      return e.name.endsWith(".css") ? [p] : [];
    });
  };
  for (const d of include) for (const f of walk(resolve(root, d))) seen.add(relative(root, f).split(sep).join("/"));
  return [...seen].filter((f) => !f.startsWith("..")).sort();
}

type SaveRequest = {
  edits?: { ref: RuleRef; before: Decl[]; after: Decl[] }[];
  create?: { file: string; selector: string; decls: Decl[] };
};

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

/** GET lists the rules in every stylesheet; POST writes edits. Development only. */
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
        const { edits = [], create } = JSON.parse(text) as SaveRequest;
        const byFile = new Map<string, string>();
        const current = (f: string) => {
          if (!files.includes(f)) throw new EditError(`not an editable stylesheet: ${f}`);
          return byFile.get(f) ?? read(f);
        };
        for (const e of edits) byFile.set(e.ref.file, applyRuleEdit(current(e.ref.file), e));
        if (create) byFile.set(create.file, appendRule(current(create.file), create.selector, create.decls));
        // every edit applied cleanly: only now write, so a refused edit leaves all files untouched
        for (const [f, css] of byFile) writeFileSync(join(root, f), css);
        return json(200, { ok: true, files: [...byFile.keys()] });
      }
      return json(405, { error: "method not allowed" });
    } catch (err) {
      return json(err instanceof EditError ? 409 : 400, { error: err instanceof Error ? err.message : String(err) });
    }
  };
}
