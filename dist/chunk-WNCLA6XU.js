import {
  addClass,
  matchSites,
  textPattern
} from "./chunk-PUZS77LQ.js";
import {
  normCondition,
  normSelector,
  sameDecls
} from "./chunk-QEOVT57I.js";

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
function appendRule(css, selector, decls, media = null) {
  if (!selector.trim() || /[{}]/.test(selector)) throw new EditError("not a valid selector");
  if (media !== null && (!media.trim() || /[{};]/.test(media))) throw new EditError("not a valid media condition");
  try {
    postcss.parse(`${selector} {}`);
  } catch {
    throw new EditError("not a valid selector");
  }
  const root = postcss.parse(css);
  let multi = 0, one = 0;
  root.walkRules((r) => {
    if (/\n/.test(r.toString())) multi++;
    else one++;
  });
  const text = (d) => `${d.prop}: ${d.value}${d.important ? " !important" : ""};`;
  const indent = media ? "  " : "";
  const body = multi > one ? `
${decls.map((d) => `${indent}  ${text(d)}
`).join("")}${indent}` : decls.length ? ` ${decls.map(text).join(" ")} ` : " ";
  const rule = `${indent}${selector.trim()} {${body}}`;
  if (!media) return `${css.replace(/\s*$/, "\n")}${rule}
`;
  const last = root.last;
  if (last?.type === "atrule" && last.name === "media" && normCondition(last.params) === normCondition(media)) {
    const block = last;
    const end = block.source?.end?.offset;
    const close = end === void 0 ? -1 : css.lastIndexOf("}", end);
    if (close >= 0) return css.slice(0, close).replace(/\s*$/, "\n") + rule + "\n" + css.slice(close);
  }
  return `${css.replace(/\s*$/, "\n")}@media ${media.trim()} {
${rule}
}
`;
}
var TEXT_EXT = /\.(tsx|jsx|ts|js|mjs|mdx|md|html|vue|svelte|astro)$/;
function findTextIn(content, file, text) {
  const re = textPattern(text);
  if (!re) return [];
  const prose = /\.mdx?$/.test(file);
  const out = [];
  for (const m of content.matchAll(re)) {
    const start = m.index, end = start + m[0].length;
    const q = content[start - 1];
    const quoted = (q === '"' || q === "'" || q === "`") && content[end] === q;
    const prev = /\S?(?=\s*$)/.exec(content.slice(Math.max(0, start - 200), start))?.[0] ?? "";
    const next = /^\s*(\S?)/.exec(content.slice(end, end + 200))?.[1] ?? "";
    const markup = (prev === ">" || prev === "}" || prev === "") && (next === "<" || next === "{" || next === "");
    const word = (a, b) => !!a && !!b && /\w/.test(a) && /\w/.test(b);
    if (!quoted && !markup && !(prose && !word(content[start - 1], m[0][0]) && !word(m[0].at(-1), content[end]))) continue;
    out.push({ file, line: content.slice(0, start).split("\n").length, index: start, length: m[0].length });
  }
  return out;
}
function replaceText(content, hit, after) {
  const q = content[hit.index - 1];
  const inString = (q === '"' || q === "'" || q === "`") && content[hit.index + hit.length] === q;
  let text = after.replace(/\s+/g, " ").trim();
  if (!text) throw new EditError("the text cannot be empty: delete it in the code");
  if (inString) {
    text = text.replace(/\\/g, "\\\\").replaceAll(q, `\\${q}`);
    if (q === "`") text = text.replace(/\$\{/g, "\\${");
  } else if (/[{}<>]/.test(text)) {
    throw new EditError("text with { } < or > has to be changed in the code");
  }
  return content.slice(0, hit.index) + text + content.slice(hit.index + hit.length);
}
var ENTITIES = { "&apos;": "'", "&#39;": "'", "&quot;": '"', "&#34;": '"', "&amp;": "&", "&nbsp;": " ", "&#160;": " ", "&rsquo;": "\u2019", "&lsquo;": "\u2018", "&ldquo;": "\u201C", "&rdquo;": "\u201D" };
var squashText = (t) => t.replace(/\s+/g, " ").trim();
function literalsIn(content) {
  const out = [];
  const add = (raw, index, js) => {
    let t = js ? raw.replace(/\\(["'`\\])/g, "$1").replace(/\\n/g, " ") : raw;
    t = squashText(t.replace(/&[#\w]+;/g, (e) => ENTITIES[e] ?? e));
    if (t.length >= 6 && /\p{L}/u.test(t)) out.push({ text: t, index });
  };
  for (const m of content.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\$]|\\.|\$(?!\{))*)`/g)) {
    add(m[1] ?? m[2] ?? m[3] ?? "", m.index + 1, true);
  }
  for (const m of content.matchAll(/[>}]([^<>{}]+)[<{]/g)) add(m[1], m.index + 1 + (m[1].length - m[1].trimStart().length), false);
  return out;
}
function findPieces(files, shown) {
  const target = squashText(shown);
  if (target.length < 6) return [];
  const cands = [];
  for (const { file, content } of files) {
    for (const lit of literalsIn(content)) {
      for (let at = target.indexOf(lit.text); at >= 0; at = target.indexOf(lit.text, at + 1)) {
        if (/\w/.test(target[at - 1] ?? "") && /^\w/.test(lit.text)) continue;
        if (/\w/.test(target[at + lit.text.length] ?? "") && /\w$/.test(lit.text)) continue;
        cands.push({ file, line: content.slice(0, lit.index).split("\n").length, text: lit.text, start: at, end: at + lit.text.length });
      }
    }
  }
  if (!cands.length) return [];
  cands.sort((a, b) => a.end - b.end || b.start - a.start);
  const best = [];
  for (let i = 0; i < cands.length; i++) {
    const c = cands[i];
    let j = i - 1;
    while (j >= 0 && cands[j].end > c.start) j--;
    const take = { covered: (j >= 0 ? best[j].covered : 0) + (c.end - c.start), pick: [...j >= 0 ? best[j].pick : [], c] };
    const skip = i > 0 ? best[i - 1] : { covered: 0, pick: [] };
    best.push(take.covered > skip.covered || take.covered === skip.covered && take.pick.length < skip.pick.length ? take : skip);
  }
  const { covered, pick } = best.at(-1);
  return covered >= target.replace(/[^\p{L}\p{N}]/gu, "").length * 0.5 ? pick : [];
}
var SKIP = ["node_modules", ".git", ".next", ".turbo", ".vercel", ".svelte-kit", "dist", "build", "out", "coverage", "public"];
function cssFiles(root, include = ["."], exclude = []) {
  return projectFiles(root, include, exclude, /\.css$/);
}
function projectFiles(root, include = ["."], exclude = [], match) {
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
      return match.test(e.name) ? [p] : [];
    });
  };
  for (const d of include) for (const f of walk(resolve(root, d))) seen.add(relative(root, f).split(sep).join("/"));
  return [...seen].filter((f) => !f.startsWith("..")).sort();
}
var TextError = class extends EditError {
  constructor(message, text, hits) {
    super(message);
    this.text = text;
    this.hits = hits;
  }
  text;
  hits;
};
var json = (status, data) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
var clip = (s) => s.length > 40 ? `${s.slice(0, 39)}\u2026` : s;
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
        const { edits = [], create, creates = [], texts = [], find, pieces, locate, classes = [] } = JSON.parse(text);
        const sources = () => projectFiles(root, options.include, options.exclude, TEXT_EXT);
        const lookup = (t, read2) => sources().flatMap((f) => {
          const c = read2(f);
          return c.length > 2e6 ? [] : findTextIn(c, f, t);
        });
        if (pieces) {
          const files2 = sources().map((f) => ({ file: f, content: read(f) })).filter((f) => f.content.length <= 2e6);
          return json(200, { pieces: pieces.map((t) => findPieces(files2, t)) });
        }
        if (locate) {
          const sites = sources().flatMap((f) => {
            const c = read(f);
            return c.length > 2e6 ? [] : matchSites(c, f, locate);
          });
          return json(200, { sites: sites.map(({ file, line, tokens, text: text2 }) => ({ file, line, tokens, text: text2 })) });
        }
        if (find) {
          const cache = /* @__PURE__ */ new Map();
          const readOnce = (f) => cache.get(f) ?? (cache.set(f, read(f)), cache.get(f));
          return json(200, { found: find.map((t) => lookup(t, readOnce).map(({ file, line }) => ({ file, line }))) });
        }
        const byFile = /* @__PURE__ */ new Map();
        const current = (f) => {
          if (!files.includes(f)) throw new EditError(`not an editable stylesheet: ${f}`);
          return byFile.get(f) ?? read(f);
        };
        for (const e of edits) byFile.set(e.ref.file, applyRuleEdit(current(e.ref.file), e));
        if (create) byFile.set(create.file, appendRule(current(create.file), create.selector, create.decls));
        for (const c of creates) byFile.set(c.file, appendRule(current(c.file), c.selector, c.decls, c.media));
        if (texts.length) {
          const editable = new Set(sources());
          const now = (f) => byFile.get(f) ?? read(f);
          for (const t of texts) {
            let hits = lookup(t.before, now);
            if (t.at) hits = hits.filter((h) => h.file === t.at.file && h.line === t.at.line);
            if (hits.length === 0) throw new TextError(`"${clip(t.before)}" is not written in the code (it may come from data)`, t.before, []);
            if (hits.length > 1) throw new TextError(`"${clip(t.before)}" is written in ${hits.length} places: choose one`, t.before, hits);
            const hit = hits[0];
            if (!editable.has(hit.file)) throw new EditError(`not an editable file: ${hit.file}`);
            byFile.set(hit.file, replaceText(now(hit.file), hit, t.after));
          }
        }
        if (classes.length) {
          const editable = new Set(sources());
          const now = (f) => byFile.get(f) ?? read(f);
          for (const c of classes) {
            if (!editable.has(c.file)) throw new EditError(`not an editable file: ${c.file}`);
            try {
              byFile.set(c.file, addClass(now(c.file), c, c.add));
            } catch (e) {
              throw new EditError(e.message);
            }
          }
        }
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

export {
  EditError,
  sourceRules,
  applyRuleEdit,
  appendRule,
  findTextIn,
  replaceText,
  literalsIn,
  findPieces,
  cssFiles,
  projectFiles,
  TextError,
  createHandler
};
