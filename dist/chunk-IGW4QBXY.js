import {
  normCondition,
  normSelector,
  sameDecls
} from "./chunk-LBGJCDWO.js";

// src/core/server.ts
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join, relative, resolve, sep } from "path";
import postcss from "postcss";
var EditError = class extends Error {
};
var TAILWIND_ONLY = /* @__PURE__ */ new Set(["custom-variant", "variant", "utility", "theme"]);
function contextOf(rule) {
  const ctx = [];
  for (let p = rule.parent; p && p.type !== "root"; p = p.parent) {
    if (p.type === "atrule") {
      const a = p;
      if (/keyframes$/i.test(a.name)) return null;
      if (TAILWIND_ONLY.has(a.name.toLowerCase())) return null;
      ctx.unshift(`${a.name.toLowerCase()} ${normCondition(a.params)}`);
    } else if (p.type === "rule") ctx.unshift(`rule ${normSelector(p.selector)}`);
  }
  return ctx;
}
var declsOf = (rule) => (rule.nodes ?? []).filter((n) => n.type === "decl");
function sourceRules(css, file) {
  const root = postcss.parse(css, { from: file });
  const seen = /* @__PURE__ */ new Map();
  const rules = [];
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
function patchRule(rule, after) {
  const existing = declsOf(rule);
  const kept = /* @__PURE__ */ new Set();
  const seen = /* @__PURE__ */ new Map();
  const added = [];
  for (const d of after) {
    const n = seen.get(d.prop) ?? 0;
    seen.set(d.prop, n + 1);
    const node = existing.filter((e) => e.prop === d.prop)[n];
    if (!node) {
      added.push(d);
      continue;
    }
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
var sameRef = (a, b) => a.selector === b.selector && a.occurrence === b.occurrence && JSON.stringify(a.context) === JSON.stringify(b.context);
function applyRuleEdit(css, edit) {
  const { root, rules } = sourceRules(css, edit.ref.file);
  const hit = rules.find((r) => sameRef(r.ref, edit.ref));
  if (!hit) throw new EditError(`${edit.ref.selector} is no longer in the file`);
  if (!sameDecls(hit.ref.decls, edit.before)) throw new EditError(`${edit.ref.selector} was changed in the file since the editor read it; reload and try again`);
  patchRule(hit.rule, edit.after);
  return root.toString();
}
function appendRule(css, selector, decls) {
  if (!selector.trim() || /[{}]/.test(selector)) throw new EditError("not a valid selector");
  try {
    postcss.parse(`${selector} {}`);
  } catch {
    throw new EditError("not a valid selector");
  }
  let multi = 0, one = 0;
  postcss.parse(css).walkRules((r) => {
    if (/\n/.test(r.toString())) multi++;
    else one++;
  });
  const text = (d) => `${d.prop}: ${d.value}${d.important ? " !important" : ""};`;
  const body = multi > one ? `
${decls.map((d) => `  ${text(d)}
`).join("")}` : decls.length ? ` ${decls.map(text).join(" ")} ` : " ";
  return `${css.replace(/\s*$/, "\n")}${selector.trim()} {${body}}
`;
}
var SKIP = ["node_modules", ".git", ".next", ".turbo", ".vercel", ".svelte-kit", "dist", "build", "out", "coverage", "public"];
function cssFiles(root, include = ["."], exclude = []) {
  const skip = /* @__PURE__ */ new Set([...SKIP, ...exclude]);
  const seen = /* @__PURE__ */ new Set();
  const walk = (dir) => {
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
var json = (status, data) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
function createHandler(options = {}) {
  return async (req) => {
    if (process.env.NODE_ENV !== "development") return json(404, { error: "not found" });
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (req.headers.get("x-domeditor") !== "1" || origin && new URL(origin).host !== host) {
      return json(403, { error: "forbidden" });
    }
    const root = resolve(options.root ?? process.cwd());
    try {
      const files = cssFiles(root, options.include, options.exclude);
      const read = (f) => readFileSync(join(root, f), "utf8");
      if (req.method === "GET") {
        const rules = files.flatMap((f) => sourceRules(read(f), f).rules.map((r) => r.ref));
        return json(200, { root: root.split(sep).join("/"), files, rules });
      }
      if (req.method === "POST") {
        const text = await req.text();
        if (text.length > 1e6) throw new EditError("request too large");
        const { edits = [], create } = JSON.parse(text);
        const byFile = /* @__PURE__ */ new Map();
        const current = (f) => {
          if (!files.includes(f)) throw new EditError(`not an editable stylesheet: ${f}`);
          return byFile.get(f) ?? read(f);
        };
        for (const e of edits) byFile.set(e.ref.file, applyRuleEdit(current(e.ref.file), e));
        if (create) byFile.set(create.file, appendRule(current(create.file), create.selector, create.decls));
        for (const [f, css] of byFile) writeFileSync(join(root, f), css);
        return json(200, { ok: true, files: [...byFile.keys()] });
      }
      return json(405, { error: "method not allowed" });
    } catch (err) {
      return json(err instanceof EditError ? 409 : 400, { error: err instanceof Error ? err.message : String(err) });
    }
  };
}

export {
  EditError,
  sourceRules,
  applyRuleEdit,
  appendRule,
  cssFiles,
  createHandler
};
