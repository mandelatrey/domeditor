import {
  WEIGHT_NAMES,
  alignRules,
  compareSpec,
  composeClamp,
  describeCondition,
  describeState,
  normCondition,
  normSelector,
  nudge,
  parseClamp,
  readProp,
  ruleKey,
  sameDecls,
  serializeDecls,
  sizeQueryMatches,
  specificity,
  splitTop,
  weightName,
  writeProp,
  writeSides
} from "../chunk-RCYO64ZZ.js";
import {
  __export
} from "../chunk-MLKGABMK.js";

// src/client/index.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// src/core/scope.ts
var EVERYWHERE = { mode: "all", width: null };
var isEverywhere = (s) => s.mode === "all" && !s.width;
var THEMED_FIRST = /^(:root|html|body)?((\[data-(theme|mode|color-scheme)=(dark|light)\])|(\.(dark|light)))(:not\([^)]*\))?$|^(:root|html|body)(:not\(\[data-(theme|mode|color-scheme)=(dark|light)\]\))$/i;
var firstCompound = (sel) => splitTop(normSelector(sel), " ")[0] ?? "";
var mostCommon = (xs) => {
  const n = /* @__PURE__ */ new Map();
  for (const x of xs) n.set(x, (n.get(x) ?? 0) + 1);
  return [...n].sort((a, b) => b[1] - a[1])[0]?.[0];
};
function modePattern(rules) {
  const media = [], attr = [];
  for (const r2 of rules) {
    const dark = r2.context.some((c) => /^media .*prefers-color-scheme:dark/.test(c));
    const parts = splitTop(r2.selector).map(firstCompound);
    const themed = parts.find((p) => THEMED_FIRST.test(p) && /dark|light/i.test(p));
    if (dark) media.push(themed ?? "");
    else if (themed && /dark/i.test(themed) && !/:not/.test(themed)) attr.push(themed);
  }
  const m = mostCommon(media), a = mostCommon(attr);
  if (m === void 0 && a === void 0) return { media: { prefix: "" }, attr: null };
  return { media: m !== void 0 ? { prefix: m } : null, attr: a !== void 0 ? { prefix: a } : null };
}
var swapMode = (s, to) => to === "dark" ? s : s.replace(/\b(dark|light)\b/gi, (w) => w.toLowerCase() === "dark" ? "light" : "dark");
function breakpoints(rules) {
  const max2 = /* @__PURE__ */ new Set(), min2 = /* @__PURE__ */ new Set();
  for (const r2 of rules) {
    for (const c of r2.context) {
      for (const m of c.matchAll(/(max|min)-width:([\d.]+)px/g)) (m[1] === "max" ? max2 : min2).add(Number(m[2]));
      for (const m of c.matchAll(/width(<=?|>=?)([\d.]+)px/g)) (m[1].startsWith("<") ? max2 : min2).add(Number(m[2]));
    }
  }
  return { max: [...max2].sort((a, b) => a - b), min: [...min2].sort((a, b) => a - b) };
}
function widthOptions(rules, now, limit = 4) {
  let { max: max2, min: min2 } = breakpoints(rules);
  if (!max2.length && !min2.length) {
    max2 = [640, 768, 1024];
    min2 = [640, 768, 1024];
  }
  const narrower = tidy(max2.filter((px2) => px2 >= now)).slice(0, limit).map((px2) => ({ kind: "max", px: px2 }));
  const wider = tidy(min2.filter((px2) => px2 <= now)).reverse().slice(0, limit).map((px2) => ({ kind: "min", px: px2 }));
  return [...narrower, ...wider];
}
function tidy(sorted) {
  const out = [];
  for (const px2 of sorted) {
    const last = out.at(-1);
    if (last !== void 0 && px2 - last <= 2) {
      if (px2 % 10 === 0 && last % 10 !== 0) out[out.length - 1] = px2;
    } else out.push(px2);
  }
  return out;
}
var widthCondition = (w) => w ? `(${w.kind}-width: ${w.px}px)` : null;
var widthLabel = (w) => !w ? "Every screen size" : w.kind === "max" ? `Up to ${w.px}px` : `${w.px}px and up`;
var modeLabel = (m) => m === "all" ? "Every mode" : m === "dark" ? "Dark mode only" : "Light mode only";
var prefixed = (prefix, selector) => prefix ? splitTop(selector).map((p) => `${prefix} ${p}`).join(", ") : selector;
var and = (...conds) => conds.filter(Boolean).join(" and ") || null;
function scopedRules(selector, scope, pattern) {
  const w = widthCondition(scope.width);
  if (scope.mode === "all") return [{ media: w, selector }];
  const mode = scope.mode;
  const out = [];
  if (pattern.media) out.push({ media: and(`(prefers-color-scheme: ${mode})`, w), selector: prefixed(swapMode(pattern.media.prefix, mode), selector) });
  if (pattern.attr) out.push({ media: w, selector: prefixed(swapMode(pattern.attr.prefix, mode), selector) });
  return out;
}
var scopedContext = (r2) => r2.media ? [`media ${normCondition(r2.media)}`] : [];

// src/client/model.ts
var HEADERS = { "x-domeditor": "1", "Content-Type": "application/json" };
var squash = (s) => s.replace(/\s+/g, " ").trim();
var wordsOf = (s) => s.trim() ? s.trim().split(/\s+/) : [];
function previewText(c, after) {
  const words = wordsOf(after);
  let w = 0;
  c.segments.forEach((s, i) => {
    const o = c.originals[i];
    const last = i === c.segments.length - 1;
    const n = last ? words.length - w : Math.min(wordsOf(o.slice(s.from, s.to)).length, words.length - w);
    const part = c.segments.length === 1 ? after.trim() : words.slice(w, w + n).join(" ");
    w += n;
    s.node.data = o.slice(0, s.from) + part + o.slice(s.to);
  });
}
var restoreText = (c) => c.segments.forEach((s, i) => {
  s.node.data = c.originals[i];
});
function textIndex(root, original = (n) => n.data) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => n.parentElement?.closest("script,style,noscript,template,svg") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
  });
  let full = "";
  const at2 = [];
  let space = true;
  while (walker.nextNode()) {
    const n = walker.currentNode;
    const data = original(n);
    for (let i = 0; i < data.length; i++) {
      if (/\s/.test(data[i])) {
        if (!space) {
          full += " ";
          at2.push([n, i]);
          space = true;
        }
      } else {
        full += data[i];
        at2.push([n, i]);
        space = false;
      }
    }
  }
  if (full.endsWith(" ")) {
    full = full.slice(0, -1);
    at2.pop();
  }
  return { full, at: at2 };
}
function segmentsFor(index2, start, end) {
  const out = /* @__PURE__ */ new Map();
  for (let k = start; k < end; k++) {
    const [node, i] = index2.at[k];
    if (/\s/.test(index2.full[k])) continue;
    const s = out.get(node);
    if (s) s.to = i + 1;
    else out.set(node, { node, from: i, to: i + 1 });
  }
  return [...out.values()];
}
var virtualKey = (file, r2) => JSON.stringify([file, r2.media, normSelector(r2.selector)]);
var STATES = /::?(hover|focus-visible|focus-within|focus|active|visited|before|after|placeholder|marker|selection|first-line|first-letter)\b/gi;
var probe = typeof document !== "undefined" ? document.createElement("div").style : null;
var SHORT = {
  padding: ["padding-top", "padding-right", "padding-bottom", "padding-left"],
  margin: ["margin-top", "margin-right", "margin-bottom", "margin-left"],
  gap: ["row-gap", "column-gap"],
  font: ["font-style", "font-weight", "font-size", "line-height", "font-family"]
};
var longhandCache = /* @__PURE__ */ new Map();
function longhands(prop, value) {
  if (prop.startsWith("--") || !probe) return [prop];
  const k = `${prop}:${value}`;
  let out = longhandCache.get(k);
  if (!out) {
    probe.cssText = "";
    probe.setProperty(prop, value);
    out = Array.from(probe);
    if (out.length === 0) out = SHORT[prop] ?? [prop];
    longhandCache.set(k, out);
  }
  return out;
}
var Store = class {
  version = 0;
  endpoint = "/__domeditor";
  root = "";
  // the project root on disk, forward slashes (Vite names stylesheets by absolute path)
  files = [];
  sources = /* @__PURE__ */ new Map();
  edits = /* @__PURE__ */ new Map();
  // rule key -> its declarations as edited (unsaved)
  texts = /* @__PURE__ */ new Map();
  // text changes (unsaved)
  scope = EVERYWHERE;
  // where edits apply: every mode and size, or only dark mode, a screen size...
  virtuals = /* @__PURE__ */ new Map();
  // scoped rules not written yet: previewed, created on save
  previewEl = null;
  previewUntilLoad = false;
  pattern = null;
  places = /* @__PURE__ */ new Map();
  // where each text is written, as far as looked up
  pieces = /* @__PURE__ */ new Map();
  // the source strings each (split-up) text is made of
  live = [];
  selected = null;
  hovered = null;
  highlight = null;
  // rule key whose elements to outline
  picking = false;
  target = null;
  // rule key the quick controls write to
  message = null;
  indexRun = 0;
  byFile = /* @__PURE__ */ new Map();
  // each file's source rules, in file order
  listeners = /* @__PURE__ */ new Set();
  subscribe = (l) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getVersion = () => this.version;
  emit() {
    this.version++;
    for (const l of this.listeners) l();
  }
  async load() {
    try {
      const r2 = await fetch(this.endpoint, { headers: HEADERS, cache: "no-store" });
      if (!r2.ok) throw new Error(`the dev server answered ${r2.status}`);
      const data = await r2.json();
      this.root = data.root;
      this.files = data.files;
      this.sources = new Map(data.rules.map((s) => [ruleKey(s), s]));
      this.byFile = /* @__PURE__ */ new Map();
      for (const s of data.rules) this.byFile.set(s.file, [...this.byFile.get(s.file) ?? [], s]);
    } catch (e) {
      this.message = { kind: "error", text: `Could not read the stylesheets: ${e.message}` };
    }
    await this.reindex();
    if (this.previewUntilLoad && !this.virtuals.size) {
      this.previewUntilLoad = false;
      this.renderPreview();
    }
    this.pattern = null;
    this.emit();
  }
  /** Walk the page's stylesheets and find each rule's source; call after Next swaps a stylesheet.
   *  Re-applies unsaved edits. */
  async reindex() {
    const run = ++this.indexRun;
    const sheets = await Promise.all(Array.from(document.styleSheets).map(async (sheet) => ({ sheet, fileOf: await sheetFiles(sheet, this.root) })));
    if (run !== this.indexRun) return;
    const out = [];
    let order = 0, unknown = 0;
    const push = (r2, source) => {
      const ref = source ?? { file: r2.file ?? "", context: r2.context, selector: r2.selector, occurrence: -1 };
      out.push({ key: source ? ruleKey(source) : `live:${unknown++}`, ref, rule: r2.rule, order: order++, conds: r2.conds, source });
    };
    for (const { sheet, fileOf } of sheets) {
      if (sheet.ownerNode?.hasAttribute?.("data-domeditor-preview")) continue;
      const items = styleRules(sheet, fileOf);
      if (fileOf) {
        const perFile = /* @__PURE__ */ new Map();
        for (const it of items) if (it.file && this.files.includes(it.file)) perFile.set(it.file, [...perFile.get(it.file) ?? [], it]);
        for (const [file, list] of perFile) {
          for (const a of alignRules(list, this.byFile.get(file) ?? [])) {
            if (a.kind === "one") push(a.item, a.source);
            else if (a.kind === "none") push(a.item);
            else {
              const split = unmerge(a.item, a.sources, fileOf);
              if (split) split.forEach((r2, i) => push(r2, a.sources[i]));
              else push(a.item);
            }
          }
        }
      } else {
        for (const it of items) {
          const cands = [...this.sources.values()].filter((s) => s.selector === it.selector && JSON.stringify(s.context) === JSON.stringify(it.context));
          if (cands.length === 1) push(it, cands[0]);
        }
      }
    }
    this.live = out;
    for (const [key, decls] of this.edits) this.preview(key, decls);
  }
  declsOf(key) {
    return this.edits.get(key) ?? this.sources.get(key)?.decls ?? [];
  }
  preview(key, decls) {
    for (const l of this.live) if (l.key === key) l.rule.style.cssText = serializeDecls(decls);
  }
  /** Change a rule's declarations: shown at once, written to the file on save. */
  setDecls(key, decls) {
    const src = this.sources.get(key);
    if (!src) return;
    if (sameDecls(decls, src.decls)) this.edits.delete(key);
    else this.edits.set(key, decls);
    this.preview(key, decls);
    this.message = null;
    this.emit();
  }
  /** How many changes are waiting to be saved. */
  get pending() {
    return this.edits.size + this.texts.size + this.virtuals.size;
  }
  /** How the project writes dark mode (learnt from its CSS once per load). */
  modePattern() {
    this.pattern ??= modePattern([...this.sources.values()]);
    return this.pattern;
  }
  /** Where an edit to a rule goes in the current scope: the rule itself, or the scoped rule(s) for it,
   *  each one already written (key) or not yet (virtual). */
  scopedTargets(base) {
    return scopedRules(base.selector, this.scope, this.modePattern()).map((rule) => {
      const context = JSON.stringify(scopedContext(rule));
      const selector = normSelector(rule.selector);
      const found = (this.byFile.get(base.file) ?? []).find((s) => s.selector === selector && JSON.stringify(s.context) === context) ?? [...this.sources.values()].find((s) => s.selector === selector && JSON.stringify(s.context) === context);
      return { rule, file: found?.file ?? base.file, key: found ? ruleKey(found) : null };
    });
  }
  virtualDecls(file, rule) {
    return this.virtuals.get(virtualKey(file, rule))?.decls ?? [];
  }
  /** Change a scoped rule that is not written yet: previewed at once, created on save. */
  setVirtual(file, rule, decls) {
    const k = virtualKey(file, rule);
    if (decls.length) this.virtuals.set(k, { file, ...rule, decls });
    else this.virtuals.delete(k);
    this.renderPreview();
    this.message = null;
    this.emit();
  }
  /** The preview of not-yet-written rules: a stylesheet of the editor's own, last in <head> so it wins
   *  over rules of equal weight (the observer and the indexing leave it alone). */
  renderPreview() {
    const css = [...this.virtuals.values()].map((v) => {
      const rule = `${v.selector} { ${serializeDecls(v.decls)} }`;
      return v.media ? `@media ${v.media} { ${rule} }` : rule;
    }).join("\n");
    if (!css) {
      this.previewEl?.remove();
      this.previewEl = null;
      return;
    }
    if (!this.previewEl) {
      this.previewEl = document.createElement("style");
      this.previewEl.setAttribute("data-domeditor-preview", "");
    }
    this.previewEl.textContent = css;
    document.head.appendChild(this.previewEl);
  }
  /** A node's text before any pending change. */
  originalOf = (node) => {
    for (const c of this.texts.values()) {
      const i = c.segments.findIndex((s) => s.node === node);
      if (i >= 0) return c.originals[i];
    }
    return node.data;
  };
  /** Change a text on the page: shown at once, written into the source on save. */
  setText(key, segments, before, after, at2) {
    const c = this.texts.get(key) ?? { key, segments, originals: segments.map((s) => this.originalOf(s.node)), before: squash(before), after, at: at2 };
    if (squash(after) === c.before) {
      restoreText(c);
      this.texts.delete(key);
    } else {
      previewText(c, after);
      this.texts.set(key, { ...c, after });
    }
    this.message = null;
    this.emit();
  }
  revertText(key) {
    const c = this.texts.get(key);
    if (c) restoreText(c);
    this.texts.delete(key);
    this.emit();
  }
  chooseTextPlace(key, at2) {
    const c = this.texts.get(key);
    if (c) this.texts.set(key, { ...c, at: at2, choices: void 0 });
    this.message = null;
    this.emit();
  }
  /** Look up the source strings split-up texts are made of (once each). */
  async findPieces(texts) {
    const todo = [...new Set(texts)].filter((t) => t && !this.pieces.has(t));
    if (!todo.length) return;
    for (const t of todo) this.pieces.set(t, "looking");
    try {
      const r2 = await fetch(this.endpoint, { method: "POST", headers: HEADERS, body: JSON.stringify({ pieces: todo }) });
      const data = await r2.json();
      todo.forEach((t, i) => this.pieces.set(t, data.pieces?.[i] ?? []));
    } catch {
      for (const t of todo) this.pieces.delete(t);
    }
    this.emit();
  }
  /** Look up where texts are written (once each). */
  async findPlaces(texts) {
    const todo = [...new Set(texts.map(squash))].filter((t) => t && !this.places.has(t));
    if (!todo.length) return;
    for (const t of todo) this.places.set(t, "looking");
    try {
      const r2 = await fetch(this.endpoint, { method: "POST", headers: HEADERS, body: JSON.stringify({ find: todo }) });
      const data = await r2.json();
      todo.forEach((t, i) => this.places.set(t, data.found?.[i] ?? []));
    } catch {
      for (const t of todo) this.places.delete(t);
    }
    this.emit();
  }
  revert(key) {
    const src = this.sources.get(key);
    if (src) this.setDecls(key, src.decls);
  }
  discardAll() {
    for (const key of [...this.edits.keys()]) this.revert(key);
    for (const key of [...this.texts.keys()]) this.revertText(key);
    this.virtuals.clear();
    this.renderPreview();
    this.emit();
  }
  async save() {
    if (this.pending === 0) return;
    const edits = [...this.edits].map(([key, after]) => {
      const s = this.sources.get(key);
      return { ref: { file: s.file, context: s.context, selector: s.selector, occurrence: s.occurrence }, before: s.decls, after };
    });
    const changes = [...this.texts.values()];
    const texts = changes.map((c) => ({ before: c.before, after: squash(c.after), at: c.at }));
    const creates = [...this.virtuals.values()].map(({ file, media, selector, decls }) => ({ file, media, selector, decls }));
    const r2 = await this.post({ edits, texts, creates });
    if (!r2.ok) {
      const c = r2.text !== void 0 ? changes.find((x) => x.before === r2.text) : void 0;
      if (c && r2.hits?.length) this.texts.set(c.key, { ...c, choices: r2.hits });
      return this.fail(r2.error);
    }
    this.texts.clear();
    this.places.clear();
    this.pieces.clear();
    for (const [key, after] of this.edits) {
      const s = this.sources.get(key);
      if (s) this.sources.set(key, { ...s, decls: after });
    }
    this.edits.clear();
    if (this.virtuals.size) {
      this.virtuals.clear();
      this.previewUntilLoad = true;
      setTimeout(() => this.renderPreview(), 6e3);
    }
    this.message = { kind: "ok", text: `Saved to ${r2.files.map(shortFile).join(", ")}` };
    this.emit();
    const css = r2.files.filter((f) => f.endsWith(".css"));
    if (css.length) for (const ms of [1500, 4e3]) setTimeout(() => void refreshSavedSheets(css), ms);
  }
  async createRule(file, selector) {
    const r2 = await this.post({ create: { file, selector, decls: [] } });
    if (!r2.ok) return this.fail(r2.error);
    this.message = { kind: "ok", text: `Added ${selector} to ${shortFile(file)}` };
    await this.load();
  }
  async post(payload) {
    try {
      const r2 = await fetch(this.endpoint, { method: "POST", headers: HEADERS, body: JSON.stringify(payload) });
      const data = await r2.json();
      return r2.ok ? { ok: true, files: data.files ?? [] } : { ok: false, error: data.error ?? `error ${r2.status}`, text: data.text, hits: data.hits };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
  fail(text) {
    this.message = { kind: "error", text };
    this.emit();
  }
  select(el) {
    this.selected = el;
    this.target = null;
    this.picking = false;
    this.emit();
  }
};
var store = new Store();
var shortFile = (f) => f.replace(/^(app|src)\//, "");
function isActive(l, el) {
  return l.conds.every((c) => c instanceof CSSMediaRule ? matchMedia(c.media.mediaText).matches : c instanceof CSSSupportsRule ? CSS.supports(c.conditionText) : typeof CSSContainerRule !== "undefined" && c instanceof CSSContainerRule ? el ? containerMatches(c, el) : true : true);
}
function containerMatches(rule, el) {
  const name = rule.containerName;
  const px2 = (v) => parseFloat(v) || 0;
  for (let a = el.parentElement; a; a = a.parentElement) {
    const cs = getComputedStyle(a);
    if (!cs.containerType || cs.containerType === "normal") continue;
    if (name && !cs.containerName.split(/\s+/).includes(name)) continue;
    const box = a;
    const env = {
      width: box.clientWidth - px2(cs.paddingLeft) - px2(cs.paddingRight),
      height: box.clientHeight - px2(cs.paddingTop) - px2(cs.paddingBottom),
      em: px2(cs.fontSize),
      rem: px2(getComputedStyle(document.documentElement).fontSize)
    };
    return sizeQueryMatches(rule.containerQuery, env) ?? true;
  }
  return false;
}
var conditionLabel = (l) => l.conds.map((c) => c instanceof CSSMediaRule ? `@media ${c.media.mediaText}` : c.cssText.split("{")[0].trim()).join(" ");
var safeMatches = (el, sel) => {
  try {
    return el.matches(sel);
  } catch {
    return false;
  }
};
function cascade(el) {
  const matches = [];
  const found = /* @__PURE__ */ new Set();
  for (const live of store.live) {
    if (found.has(live.key)) continue;
    let best = null;
    for (const part of splitTop(live.rule.selectorText)) {
      const states = part.match(STATES);
      const state = states ? states.join("") : null;
      const bare = states ? part.replace(STATES, "").replace(/\(\s*\)/g, "") || "*" : part;
      if (!safeMatches(el, bare)) continue;
      const m = { live, spec: specificity(part), active: isActive(live, el), state, part };
      if (!best || best.state && !state || !!best.state === !!state && compareSpec(m.spec, best.spec) > 0) best = m;
    }
    if (best) {
      matches.push(best);
      found.add(live.key);
    }
  }
  const now = (m) => !m.state && m.active ? 1 : 0;
  matches.sort((a, b) => now(b) - now(a) || compareSpec(b.spec, a.spec) || b.live.order - a.live.order);
  const inline3 = [];
  const style = el.style;
  if (style) for (const p of Array.from(style)) inline3.push({ prop: p, value: style.getPropertyValue(p), important: style.getPropertyPriority(p) === "important" });
  const cands = [];
  inline3.forEach((d) => cands.push({ id: `inline#${d.prop}`, key: "inline", decl: d, tier: d.important ? 4 : 2 }));
  for (const m of matches) {
    if (m.state || !m.active) continue;
    store.declsOf(m.live.key).forEach((d, i) => cands.push({ id: `${m.live.key}#${i}`, key: m.live.key, decl: d, tier: d.important ? 3 : 1 }));
  }
  const rank = new Map(matches.map((m, i) => [m.live.key, i]));
  cands.sort((a, b) => b.tier - a.tier || (rank.get(a.key) ?? -1) - (rank.get(b.key) ?? -1) || declIndex(b) - declIndex(a));
  const winner = /* @__PURE__ */ new Map();
  const applied = /* @__PURE__ */ new Set();
  for (const c of cands) {
    let wins = false;
    for (const lh of longhands(c.decl.prop, c.decl.value)) {
      if (!winner.has(lh)) {
        winner.set(lh, c.key);
        wins = true;
      }
    }
    if (wins) applied.add(c.id);
  }
  return { matches, applied, winner, inline: inline3 };
}
function defaultTarget(el, matches) {
  const usable = matches.filter((m) => !m.state && m.active && m.live.source);
  const own = usable.find((m) => {
    const sel = /^([a-z][\w-]*)?((\.[\w-]+)+)$/i.exec(m.part.trim());
    return !!sel && (!sel[1] || sel[1].toLowerCase() === el.tagName.toLowerCase()) && sel[2].slice(1).split(".").every((c) => el.classList.contains(c));
  });
  return own ?? usable[0] ?? null;
}
var declIndex = (c) => Number(c.id.split("#").at(-1)) || 0;
function inheritedFrom(el, props) {
  const out = /* @__PURE__ */ new Map();
  let todo = props.filter((p) => !cascade(el).winner.has(p));
  for (let p = el.parentElement; p && todo.length; p = p.parentElement) {
    const { winner } = cascade(p);
    for (const prop of todo) {
      const w = winner.get(prop);
      if (w) out.set(prop, { el: p, key: w });
    }
    todo = todo.filter((t) => !out.has(t));
  }
  return out;
}
function label(el) {
  const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).filter(Boolean) : [];
  return el.tagName.toLowerCase() + (el.id ? `#${el.id}` : "") + cls.map((c) => `.${c}`).join("");
}
function suggestSelector(el) {
  const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).filter(Boolean) : [];
  if (cls.length) return `.${cls[0]}`;
  for (let p = el.parentElement; p; p = p.parentElement) {
    const pc = typeof p.className === "string" ? p.className.trim().split(/\s+/).filter(Boolean)[0] : void 0;
    if (pc) return `.${pc} ${el.tagName.toLowerCase()}`;
  }
  return el.tagName.toLowerCase();
}
var MARKER = /\/\* \[(project|next)\]\/(.+?) \[[^\]]*\] \(css\) \*\//g;
var fileMaps = /* @__PURE__ */ new WeakMap();
function sheetFiles(sheet, root) {
  let p = fileMaps.get(sheet);
  if (!p) {
    p = (async () => {
      const viteId = sheet.ownerNode?.getAttribute?.("data-vite-dev-id");
      if (viteId) {
        const file = viteId.split("?")[0].replace(/\\/g, "/");
        const rel = root && file.startsWith(root + "/") ? file.slice(root.length + 1) : null;
        if (!rel) return null;
        const fileOf = /* @__PURE__ */ new WeakMap();
        try {
          for (const r2 of Array.from(sheet.cssRules)) fileOf.set(r2, rel);
        } catch {
          return null;
        }
        filesIn.set(sheet, /* @__PURE__ */ new Set([rel]));
        return fileOf;
      }
      const href = sheet.href;
      if (!href || new URL(href).origin !== location.origin || !new URL(href).pathname.startsWith("/_next/")) return null;
      try {
        const rules = Array.from(sheet.cssRules);
        loaded.set(sheet, rules.filter(notImport).map(ruleText));
        const text = await serverCss(href);
        if (refreshIfStale(sheet, text)) return null;
        const marks = [...text.matchAll(MARKER)];
        if (!marks.length) return null;
        const fileOf = /* @__PURE__ */ new WeakMap();
        let n = 0;
        marks.forEach((m, i) => {
          const chunk = text.slice(m.index + m[0].length, marks[i + 1]?.index ?? text.length);
          const scratch = new CSSStyleSheet();
          scratch.replaceSync(chunk);
          const file = m[1] === "project" ? m[2] : `[next]/${m[2]}`;
          if (scratch.cssRules.length) filesIn.set(sheet, (filesIn.get(sheet) ?? /* @__PURE__ */ new Set()).add(file));
          for (let k = 0; k < scratch.cssRules.length; k++) if (rules[n + k]) fileOf.set(rules[n + k], file);
          n += scratch.cssRules.length;
        });
        return n === rules.length ? fileOf : null;
      } catch {
        return null;
      }
    })();
    fileMaps.set(sheet, p);
  }
  return p;
}
var loaded = /* @__PURE__ */ new WeakMap();
var filesIn = /* @__PURE__ */ new WeakMap();
var madeFor = /* @__PURE__ */ new WeakMap();
async function serverCss(href) {
  const url = new URL(href);
  url.searchParams.set("se", `${Date.now()}${Math.random().toString(36).slice(2, 6)}`);
  return (await fetch(url, { cache: "no-store" })).text();
}
var notImport = (r2) => !(typeof CSSImportRule !== "undefined" && r2 instanceof CSSImportRule);
var ruleText = (r2) => r2.cssText.replace(/url\([^)]*\)/g, "url()");
function refreshIfStale(sheet, serverText) {
  const link = sheet.ownerNode;
  const had = loaded.get(sheet);
  if (!(link instanceof HTMLLinkElement) || !had || !link.isConnected) return false;
  const scratch = new CSSStyleSheet();
  scratch.replaceSync(serverText);
  const now = Array.from(scratch.cssRules).filter(notImport).map(ruleText);
  if (now.length === had.length && now.every((t, i) => t === had[i])) return false;
  const base = (link.getAttribute("href") ?? "").split("?")[0];
  if (!base || madeFor.get(link) === serverText) return false;
  const fresh = document.createElement("link");
  madeFor.set(fresh, serverText);
  for (const a of Array.from(link.attributes)) fresh.setAttribute(a.name, a.value);
  fresh.setAttribute("href", `${base}?ts=${Date.now()}`);
  fresh.addEventListener("load", () => link.remove(), { once: true });
  link.after(fresh);
  return true;
}
async function refreshSavedSheets(files) {
  for (const sheet of Array.from(document.styleSheets)) {
    const own = filesIn.get(sheet);
    if (!sheet.href || !own || !files.some((f) => own.has(f))) continue;
    try {
      refreshIfStale(sheet, await serverCss(sheet.href));
    } catch {
    }
  }
}
function styleRules(sheet, fileOf) {
  const out = [];
  const walk = (list, context, conds, file) => {
    for (const r2 of Array.from(list)) {
      const f = file ?? fileOf?.get(r2) ?? null;
      if (r2 instanceof CSSStyleRule) {
        const selector = normSelector(r2.selectorText);
        out.push({ rule: r2, file: f, context, selector, conds });
        if (r2.cssRules?.length) walk(r2.cssRules, [...context, `rule ${selector}`], conds, f);
      } else if (r2 instanceof CSSMediaRule) walk(r2.cssRules, [...context, `media ${normCondition(r2.media.mediaText)}`], [...conds, r2], f);
      else if (r2 instanceof CSSSupportsRule) walk(r2.cssRules, [...context, `supports ${normCondition(r2.conditionText)}`], [...conds, r2], f);
      else if (typeof CSSContainerRule !== "undefined" && r2 instanceof CSSContainerRule) {
        walk(r2.cssRules, [...context, `container ${normCondition(r2.containerName + r2.containerQuery)}`], [...conds, r2], f);
      } else if (typeof CSSLayerBlockRule !== "undefined" && r2 instanceof CSSLayerBlockRule) {
        walk(r2.cssRules, [...context, `layer ${normCondition(r2.name)}`], [...conds, r2], f);
      }
    }
  };
  try {
    walk(sheet.cssRules, [], [], null);
  } catch {
  }
  return out;
}
function unmerge(item, sources, fileOf) {
  const rule = item.rule;
  const parent = rule.parentRule ?? rule.parentStyleSheet;
  if (!parent || rule.cssRules?.length) return null;
  const parts = splitTop(rule.selectorText);
  if (parts.length !== sources.reduce((n, s) => n + splitTop(s.selector).length, 0)) return null;
  try {
    let at2 = Array.from(parent.cssRules).indexOf(rule);
    const body = rule.style.cssText;
    parent.deleteRule(at2);
    return sources.map((s) => {
      const selectorText = parts.splice(0, splitTop(s.selector).length).join(", ");
      parent.insertRule(`${selectorText} { ${body} }`, at2);
      const r2 = parent.cssRules[at2++];
      if (!rule.parentRule && item.file) fileOf.set(r2, item.file);
      return { ...item, rule: r2, selector: normSelector(r2.selectorText) };
    });
  } catch {
    return null;
  }
}

// src/client/color.ts
var ctx = null;
function toRgba(color) {
  ctx ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = "#000";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r2, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return [r2, g, b, a / 255];
}
function toHex(color) {
  const c = toRgba(color);
  return c ? `#${c.slice(0, 3).map((n) => n.toString(16).padStart(2, "0")).join("")}` : "#000000";
}

// src/client/page.ts
var systemDark = () => matchMedia("(prefers-color-scheme: dark)").matches;
function pageIsDark() {
  for (const el of [document.documentElement, document.body]) {
    const said = `${el.getAttribute("data-theme") ?? ""} ${el.getAttribute("data-mode") ?? ""} ${el.getAttribute("data-color-scheme") ?? ""}`.toLowerCase();
    if (/\bdark\b/.test(said) || el.classList.contains("dark")) return true;
    if (/\blight\b/.test(said) || el.classList.contains("light")) return false;
  }
  for (const el of [document.body, document.documentElement]) {
    const rgba = toRgba(getComputedStyle(el).backgroundColor);
    if (rgba && rgba[3] > 0.5) return 0.2126 * rgba[0] + 0.7152 * rgba[1] + 0.0722 * rgba[2] < 128;
  }
  return systemDark();
}

// node_modules/lucide-react/dist/esm/createLucideIcon.mjs
import { forwardRef as forwardRef2, createElement as createElement3 } from "react";

// node_modules/lucide-react/dist/esm/shared/src/utils/toKebabCase.mjs
var toKebabCase = (value) => (value.match(/\d+[xX]\d+|[A-Z]?[a-z]+|[A-Z]|\d+/g) ?? []).join("-").toLowerCase();

// node_modules/lucide-react/dist/esm/shared/src/utils/toLucideIconData.mjs
function toLucideIconData(iconName, iconNode, aliases = []) {
  if (iconNode == null) {
    throw new Error("[lucide]: iconNode is required when icon name is used");
  }
  return {
    name: toKebabCase(iconName),
    size: 24,
    node: iconNode,
    ...aliases.length > 0 ? { aliases } : {}
  };
}

// node_modules/lucide-react/dist/esm/shared/src/utils/toCamelCase.mjs
var toCamelCase = (string) => {
  let out = "";
  let upperNext = false;
  for (const ch of string) {
    if (ch === "-" || ch === "_" || ch <= " ") {
      upperNext = out.length > 0;
      continue;
    }
    if (out.length === 0) {
      out += ch.toLowerCase();
    } else {
      out += upperNext ? ch.toUpperCase() : ch;
    }
    upperNext = false;
  }
  return out;
};

// node_modules/lucide-react/dist/esm/shared/src/utils/toPascalCase.mjs
var toPascalCase = (string) => {
  const camelCase = toCamelCase(string);
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};

// node_modules/lucide-react/dist/esm/Icon.mjs
import { forwardRef, createElement as createElement2 } from "react";

// node_modules/lucide-react/dist/esm/shared/src/utils/mergeClasses.mjs
var mergeClasses = (...classes) => {
  const tokens = /* @__PURE__ */ new Set();
  for (const cls of classes) {
    if (typeof cls !== "string") continue;
    for (const token of cls.split(/\s+/)) {
      if (token) tokens.add(token);
    }
  }
  return [...tokens].join(" ");
};

// node_modules/lucide-react/dist/esm/shared/src/build/defaultAttributes.mjs
var defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": 2,
  "stroke-linecap": "round",
  "stroke-linejoin": "round"
};

// node_modules/lucide-react/dist/esm/shared/src/build/buildLucideIconNode.mjs
function isDefined(value) {
  return value !== null && value !== void 0;
}
function buildLucideIconNode(icon, params = {}) {
  const attributeNames = params.attributeNames ?? {};
  const getAttributeName = (attributeName) => attributeNames[attributeName] ?? attributeName;
  const viewBoxWidth = icon.size ?? icon.width ?? defaultAttributes["width"];
  const viewBoxHeight = icon.size ?? icon.height ?? defaultAttributes["height"];
  const aliasClassNames = icon.aliases?.filter((alias) => typeof alias === "string" && alias.trim() !== "").map((alias) => `lucide-${alias}`) ?? [];
  const iconClassNames = [...icon.name ? [`lucide-${icon.name}`] : [], ...aliasClassNames];
  const classNamesFromClassName = params.className?.split(" ").filter(Boolean) ?? [];
  const className = params.includeDefaultClasses === false ? mergeClasses(...classNamesFromClassName) : mergeClasses("lucide", ...iconClassNames, ...classNamesFromClassName);
  const calculatedStrokeWidth = params.absoluteStrokeWidth ? Number(params.strokeWidth ?? defaultAttributes["stroke-width"]) * Number(icon.size ?? icon.width ?? defaultAttributes["width"]) / Number(params.size ?? params.width ?? defaultAttributes["width"]) : params.strokeWidth ?? defaultAttributes["stroke-width"];
  const attributes = {
    ...Object.entries(defaultAttributes).reduce((attrs, [attrName, value]) => {
      attrs[getAttributeName(attrName)] = value;
      return attrs;
    }, {}),
    ..."color" in params && params.color && {
      [getAttributeName("stroke")]: params.color
    },
    ..."size" in params && isDefined(params.size) && {
      [getAttributeName("width")]: params.size,
      [getAttributeName("height")]: params.size
    },
    ..."width" in params && isDefined(params.width) && {
      [getAttributeName("width")]: params.width
    },
    ..."height" in params && isDefined(params.height) && {
      [getAttributeName("height")]: params.height
    },
    [getAttributeName("stroke-width")]: calculatedStrokeWidth,
    ...className && {
      [getAttributeName("class")]: className
    },
    [getAttributeName("viewBox")]: `0 0 ${viewBoxWidth} ${viewBoxHeight}`,
    ...params.hasA11yProp === false ? {
      [getAttributeName("aria-hidden")]: "true"
    } : {},
    ..."attributes" in params && params.attributes
  };
  return [
    "svg",
    attributes,
    icon.node.map((child) => {
      const [name, attrs, children] = child;
      const nextAttrs = params.nonScalingStroke ? { [getAttributeName("vector-effect")]: "non-scaling-stroke", ...attrs } : attrs;
      return children ? [name, nextAttrs, children] : [name, nextAttrs];
    })
  ];
}

// node_modules/lucide-react/dist/esm/shared/src/build/buildLucideIconForReact.mjs
function buildLucideIconForReact(icon, params = {}) {
  return buildLucideIconNode(icon, {
    ...params,
    attributeNames: {
      ...params.attributeNames,
      class: "className",
      "stroke-width": "strokeWidth",
      "stroke-linecap": "strokeLinecap",
      "stroke-linejoin": "strokeLinejoin",
      "vector-effect": "vectorEffect"
    }
  });
}

// node_modules/lucide-react/dist/esm/shared/src/utils/hasA11yProp.mjs
var hasA11yProp = (props) => {
  if (props == null || typeof props !== "object") {
    return false;
  }
  for (const prop in props) {
    if (Object.prototype.hasOwnProperty.call(props, prop) && (prop.startsWith("aria-") || prop === "role" || prop === "title") && props[prop] != null) {
      return true;
    }
  }
  return false;
};

// node_modules/lucide-react/dist/esm/context.mjs
import { createContext, useContext, useMemo, createElement } from "react";
var LucideContext = createContext({});
var useLucideContext = () => useContext(LucideContext);

// node_modules/lucide-react/dist/esm/Icon.mjs
var Icon = forwardRef(
  ({
    color,
    size: size4,
    width,
    height,
    strokeWidth,
    absoluteStrokeWidth,
    nonScalingStroke,
    className = "",
    children,
    iconNode = [],
    icon = {
      node: iconNode,
      aliases: [],
      size: 24
    },
    ...rest
  }, ref) => {
    const {
      size: contextSize = 24,
      strokeWidth: contextStrokeWidth = 2,
      absoluteStrokeWidth: contextAbsoluteStrokeWidth = false,
      nonScalingStroke: contextNonScalingStroke = false,
      color: contextColor = "currentColor",
      className: contextClass = ""
    } = useLucideContext() ?? {};
    const hasAccessibleProp = Boolean(children) || hasA11yProp(rest);
    const [name, svgAttributes, builtIconNode = []] = buildLucideIconForReact(icon, {
      color: color ?? contextColor,
      width: width ?? size4 ?? contextSize,
      height: height ?? size4 ?? contextSize,
      strokeWidth: strokeWidth ?? contextStrokeWidth,
      absoluteStrokeWidth: absoluteStrokeWidth ?? contextAbsoluteStrokeWidth,
      nonScalingStroke: nonScalingStroke ?? contextNonScalingStroke,
      className: mergeClasses(contextClass, className),
      hasA11yProp: hasAccessibleProp,
      attributes: rest
    });
    return createElement2(
      name,
      {
        ref,
        ...svgAttributes
      },
      [
        ...builtIconNode.map(([tag, attrs]) => createElement2(tag, attrs)),
        ...Array.isArray(children) ? children : [children]
      ]
    );
  }
);

// node_modules/lucide-react/dist/esm/createLucideIcon.mjs
function createLucideIcon(iconDataOrName, iconNode = [], aliases = []) {
  const iconData = typeof iconDataOrName === "string" ? toLucideIconData(iconDataOrName, iconNode, aliases) : iconDataOrName;
  const Component = forwardRef2(
    ({ className, ...props }, ref) => createElement3(Icon, {
      ref,
      icon: iconData,
      className,
      ...props
    })
  );
  if (iconData.name) {
    Component.displayName = toPascalCase(iconData.name);
  }
  return Component;
}

// node_modules/lucide-react/dist/esm/icons/arrow-down.mjs
var __iconData = {
  name: "arrow-down",
  size: 24,
  node: [
    ["path", { d: "M12 5v14", key: "s699le" }],
    ["path", { d: "m19 12-7 7-7-7", key: "1idqje" }]
  ]
};
__iconData.node;
var ArrowDown = createLucideIcon(__iconData);

// node_modules/lucide-react/dist/esm/icons/arrow-up.mjs
var __iconData2 = {
  name: "arrow-up",
  size: 24,
  node: [
    ["path", { d: "m5 12 7-7 7 7", key: "hav0vg" }],
    ["path", { d: "M12 19V5", key: "x0mq9r" }]
  ]
};
__iconData2.node;
var ArrowUp = createLucideIcon(__iconData2);

// node_modules/lucide-react/dist/esm/icons/check.mjs
var __iconData3 = {
  name: "check",
  size: 24,
  node: [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]]
};
__iconData3.node;
var Check = createLucideIcon(__iconData3);

// node_modules/lucide-react/dist/esm/icons/chevron-down.mjs
var __iconData4 = {
  name: "chevron-down",
  size: 24,
  node: [["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]]
};
__iconData4.node;
var ChevronDown = createLucideIcon(__iconData4);

// node_modules/lucide-react/dist/esm/icons/chevron-right.mjs
var __iconData5 = {
  name: "chevron-right",
  size: 24,
  node: [["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]]
};
__iconData5.node;
var ChevronRight = createLucideIcon(__iconData5);

// node_modules/lucide-react/dist/esm/icons/circle-exclamation-point.mjs
var __iconData6 = {
  name: "circle-exclamation-point",
  size: 24,
  node: [
    ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
    ["line", { x1: "12", x2: "12", y1: "8", y2: "12", key: "1pkeuh" }],
    ["line", { x1: "12", x2: "12.01", y1: "16", y2: "16", key: "4dfq90" }]
  ],
  aliases: ["alert-circle", "circle-alert"]
};
__iconData6.node;
var CircleExclamationPoint = createLucideIcon(__iconData6);

// node_modules/lucide-react/dist/esm/icons/clipboard-paste.mjs
var __iconData7 = {
  name: "clipboard-paste",
  size: 24,
  node: [
    ["path", { d: "M11 14h10", key: "1w8e9d" }],
    ["path", { d: "M16 4h2a2 2 0 0 1 2 2v1.344", key: "1e62lh" }],
    ["path", { d: "m17 18 4-4-4-4", key: "z2g111" }],
    [
      "path",
      { d: "M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 1.793-1.113", key: "bjbb7m" }
    ],
    ["rect", { x: "8", y: "2", width: "8", height: "4", rx: "1", key: "ublpy" }]
  ]
};
__iconData7.node;
var ClipboardPaste = createLucideIcon(__iconData7);

// node_modules/lucide-react/dist/esm/icons/copy.mjs
var __iconData8 = {
  name: "copy",
  size: 24,
  node: [
    ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2", key: "17jyea" }],
    ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2", key: "zix9uf" }]
  ]
};
__iconData8.node;
var Copy = createLucideIcon(__iconData8);

// node_modules/lucide-react/dist/esm/icons/corner-down-left.mjs
var __iconData9 = {
  name: "corner-down-left",
  size: 24,
  node: [
    ["path", { d: "M20 4v7a4 4 0 0 1-4 4H4", key: "6o5b7l" }],
    ["path", { d: "m9 10-5 5 5 5", key: "1kshq7" }]
  ]
};
__iconData9.node;
var CornerDownLeft = createLucideIcon(__iconData9);

// node_modules/lucide-react/dist/esm/icons/database.mjs
var __iconData10 = {
  name: "database",
  size: 24,
  node: [
    ["ellipse", { cx: "12", cy: "5", rx: "9", ry: "3", key: "msslwz" }],
    ["path", { d: "M3 5V19A9 3 0 0 0 21 19V5", key: "1wlel7" }],
    ["path", { d: "M3 12A9 3 0 0 0 21 12", key: "mv7ke4" }]
  ]
};
__iconData10.node;
var Database = createLucideIcon(__iconData10);

// node_modules/lucide-react/dist/esm/icons/file-code.mjs
var __iconData11 = {
  name: "file-code",
  size: 24,
  node: [
    [
      "path",
      {
        d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
        key: "1oefj6"
      }
    ],
    ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5", key: "wfsgrz" }],
    ["path", { d: "M10 12.5 8 15l2 2.5", key: "1tg20x" }],
    ["path", { d: "m14 12.5 2 2.5-2 2.5", key: "yinavb" }]
  ]
};
__iconData11.node;
var FileCode = createLucideIcon(__iconData11);

// node_modules/lucide-react/dist/esm/icons/link-2.mjs
var __iconData12 = {
  name: "link-2",
  size: 24,
  node: [
    ["path", { d: "M9 17H7A5 5 0 0 1 7 7h2", key: "8i5ue5" }],
    ["path", { d: "M15 7h2a5 5 0 1 1 0 10h-2", key: "1b9ql8" }],
    ["line", { x1: "8", x2: "16", y1: "12", y2: "12", key: "1jonct" }]
  ]
};
__iconData12.node;
var Link2 = createLucideIcon(__iconData12);

// node_modules/lucide-react/dist/esm/icons/minus.mjs
var __iconData13 = {
  name: "minus",
  size: 24,
  node: [["path", { d: "M5 12h14", key: "1ays0h" }]]
};
__iconData13.node;
var Minus = createLucideIcon(__iconData13);

// node_modules/lucide-react/dist/esm/icons/mouse-pointer-2.mjs
var __iconData14 = {
  name: "mouse-pointer-2",
  size: 24,
  node: [
    [
      "path",
      {
        d: "M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z",
        key: "edeuup"
      }
    ]
  ]
};
__iconData14.node;
var MousePointer2 = createLucideIcon(__iconData14);

// node_modules/lucide-react/dist/esm/icons/panel-left.mjs
var __iconData15 = {
  name: "panel-left",
  size: 24,
  node: [
    ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "afitv7" }],
    ["path", { d: "M9 3v18", key: "fh3hqa" }]
  ],
  aliases: ["sidebar"]
};
__iconData15.node;
var PanelLeft = createLucideIcon(__iconData15);

// node_modules/lucide-react/dist/esm/icons/panel-right.mjs
var __iconData16 = {
  name: "panel-right",
  size: 24,
  node: [
    ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "afitv7" }],
    ["path", { d: "M15 3v18", key: "14nvp0" }]
  ]
};
__iconData16.node;
var PanelRight = createLucideIcon(__iconData16);

// node_modules/lucide-react/dist/esm/icons/plus.mjs
var __iconData17 = {
  name: "plus",
  size: 24,
  node: [
    ["path", { d: "M5 12h14", key: "1ays0h" }],
    ["path", { d: "M12 5v14", key: "s699le" }]
  ]
};
__iconData17.node;
var Plus = createLucideIcon(__iconData17);

// node_modules/lucide-react/dist/esm/icons/square-dashed-mouse-pointer.mjs
var __iconData18 = {
  name: "square-dashed-mouse-pointer",
  size: 24,
  node: [
    [
      "path",
      {
        d: "M12.034 12.681a.498.498 0 0 1 .647-.647l9 3.5a.5.5 0 0 1-.033.943l-3.444 1.068a1 1 0 0 0-.66.66l-1.067 3.443a.5.5 0 0 1-.943.033z",
        key: "xwnzip"
      }
    ],
    ["path", { d: "M5 3a2 2 0 0 0-2 2", key: "y57alp" }],
    ["path", { d: "M19 3a2 2 0 0 1 2 2", key: "18rm91" }],
    ["path", { d: "M5 21a2 2 0 0 1-2-2", key: "sbafld" }],
    ["path", { d: "M9 3h1", key: "1yesri" }],
    ["path", { d: "M9 21h2", key: "1qve2z" }],
    ["path", { d: "M14 3h1", key: "1ec4yj" }],
    ["path", { d: "M3 9v1", key: "1r0deq" }],
    ["path", { d: "M21 9v2", key: "p14lih" }],
    ["path", { d: "M3 14v1", key: "vnatye" }]
  ],
  aliases: ["mouse-pointer-square-dashed"]
};
__iconData18.node;
var SquareDashedMousePointer = createLucideIcon(__iconData18);

// node_modules/lucide-react/dist/esm/icons/text-align-center.mjs
var __iconData19 = {
  name: "text-align-center",
  size: 24,
  node: [
    ["path", { d: "M21 5H3", key: "1fi0y6" }],
    ["path", { d: "M17 12H7", key: "16if0g" }],
    ["path", { d: "M19 19H5", key: "vjpgq2" }]
  ],
  aliases: ["align-center"]
};
__iconData19.node;
var TextAlignCenter = createLucideIcon(__iconData19);

// node_modules/lucide-react/dist/esm/icons/text-align-end.mjs
var __iconData20 = {
  name: "text-align-end",
  size: 24,
  node: [
    ["path", { d: "M21 5H3", key: "1fi0y6" }],
    ["path", { d: "M21 12H9", key: "dn1m92" }],
    ["path", { d: "M21 19H7", key: "4cu937" }]
  ],
  aliases: ["align-right"]
};
__iconData20.node;
var TextAlignEnd = createLucideIcon(__iconData20);

// node_modules/lucide-react/dist/esm/icons/text-align-justify.mjs
var __iconData21 = {
  name: "text-align-justify",
  size: 24,
  node: [
    ["path", { d: "M3 5h18", key: "1u36vt" }],
    ["path", { d: "M3 12h18", key: "1i2n21" }],
    ["path", { d: "M3 19h18", key: "awlh7x" }]
  ],
  aliases: ["align-justify"]
};
__iconData21.node;
var TextAlignJustify = createLucideIcon(__iconData21);

// node_modules/lucide-react/dist/esm/icons/text-align-start.mjs
var __iconData22 = {
  name: "text-align-start",
  size: 24,
  node: [
    ["path", { d: "M21 5H3", key: "1fi0y6" }],
    ["path", { d: "M15 12H3", key: "6jk70r" }],
    ["path", { d: "M17 19H3", key: "z6ezky" }]
  ],
  aliases: ["text", "align-left"]
};
__iconData22.node;
var TextAlignStart = createLucideIcon(__iconData22);

// node_modules/lucide-react/dist/esm/icons/undo-2.mjs
var __iconData23 = {
  name: "undo-2",
  size: 24,
  node: [
    ["path", { d: "M9 14 4 9l5-5", key: "102s5s" }],
    ["path", { d: "M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11", key: "f3b9sd" }]
  ]
};
__iconData23.node;
var Undo2 = createLucideIcon(__iconData23);

// node_modules/lucide-react/dist/esm/icons/x.mjs
var __iconData24 = {
  name: "x",
  size: 24,
  node: [
    ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
    ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
  ]
};
__iconData24.node;
var X = createLucideIcon(__iconData24);

// src/client/Panel.tsx
import { useEffect as useEffect14, useMemo as useMemo10, useRef as useRef17, useState as useState15, useSyncExternalStore } from "react";

// src/client/copyStyle.ts
var SIDES = ["top", "right", "bottom", "left"];
var CORNERS = ["top-left", "top-right", "bottom-right", "bottom-left"];
var GROUPS = [
  { id: "type", label: "Typography", on: true, props: ["font-family", "font-size", "font-weight", "font-style", "line-height", "letter-spacing", "text-transform", "text-align", "text-decoration-line", "white-space"] },
  { id: "color", label: "Colour", on: true, props: ["color", "background-color", "background-image", "opacity"] },
  {
    id: "border",
    label: "Border & corners",
    on: true,
    props: [
      ...SIDES.flatMap((s) => [`border-${s}-width`, `border-${s}-style`, `border-${s}-color`]),
      ...CORNERS.map((c) => `border-${c}-radius`),
      "box-shadow"
    ]
  },
  { id: "spacing", label: "Padding & gap", on: true, props: [...SIDES.map((s) => `padding-${s}`), "row-gap", "column-gap"] },
  { id: "layout", label: "Layout", on: true, props: ["display", "flex-direction", "flex-wrap", "align-items", "justify-content"] },
  { id: "size", label: "Size", on: false, props: ["width", "height", "min-width", "max-width", "min-height"] },
  { id: "margin", label: "Margin", on: false, props: SIDES.map((s) => `margin-${s}`) }
];
function copyStyle(el, label2) {
  const cs = getComputedStyle(el);
  const { winner } = cascade(el);
  const values = /* @__PURE__ */ new Map();
  for (const g of GROUPS) {
    for (const prop of g.props) {
      const key = winner.get(prop);
      const declared = key && key !== "inline" ? declaredValue(store.declsOf(key), prop) : null;
      values.set(prop, { computed: cs.getPropertyValue(prop), declared });
    }
  }
  return { from: el, label: label2, values };
}
var BORDER_STYLES = /^(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)$/i;
var LENGTH = /^(-?[\d.]+[a-z%]*|thin|medium|thick|0)$/i;
function declaredValue(decls, prop) {
  const direct = readProp(decls, prop);
  if (direct) return direct;
  const border = /^border-(top|right|bottom|left)-(width|style|color)$/.exec(prop);
  if (border) {
    const [, side, part] = border;
    const v = readProp(decls, `border-${part}`) ?? readProp(decls, `border-${side}`) ?? readProp(decls, "border");
    if (!v) return null;
    const tokens = splitTop(v, " ");
    if (tokens.length === 1 && readProp(decls, `border-${part}`) === v) return v;
    const pick = part === "width" ? tokens.find((t) => LENGTH.test(t)) : part === "style" ? tokens.find((t) => BORDER_STYLES.test(t)) : tokens.find((t) => !LENGTH.test(t) && !BORDER_STYLES.test(t));
    return pick ?? null;
  }
  if (prop === "background-color") {
    const bg = readProp(decls, "background");
    if (bg && splitTop(bg, " ").length === 1 && !/url\(|gradient\(/i.test(bg)) return bg;
  }
  return null;
}
function differences(copied, el) {
  const cs = getComputedStyle(el);
  const out = [];
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
function pasteInto(decls, diffs) {
  let out = [...decls];
  const by = new Map(diffs.map((d) => [d.prop, d.value]));
  const all = (props) => props.every((p) => by.has(p));
  for (const base of ["padding", "margin"]) {
    const props = SIDES.map((s) => `${base}-${s}`);
    if (all(props)) {
      out = writeSides(out, base, Object.fromEntries(SIDES.map((s) => [s, by.get(`${base}-${s}`)])));
      props.forEach((p) => by.delete(p));
    }
  }
  const corners = CORNERS.map((c) => `border-${c}-radius`);
  if (all(corners) && new Set(corners.map((p) => by.get(p))).size === 1) {
    out = writeProp(out, "border-radius", by.get(corners[0]));
    corners.forEach((p) => by.delete(p));
  }
  const parts = ["width", "style", "color"].map((part) => SIDES.map((sd) => `border-${sd}-${part}`));
  if (parts.every((props) => all(props) && new Set(props.map((p) => by.get(p))).size === 1)) {
    out = writeProp(out, "border", parts.map((props) => by.get(props[0])).join(" "));
    parts.flat().forEach((p) => by.delete(p));
  }
  for (const part of ["width", "style", "color"]) {
    const props = SIDES.map((s) => `border-${s}-${part}`);
    if (all(props) && new Set(props.map((p) => by.get(p))).size === 1) {
      out = writeProp(out, `border-${part}`, by.get(props[0]));
      props.forEach((p) => by.delete(p));
    }
  }
  if (by.has("row-gap") && by.has("column-gap") && by.get("row-gap") === by.get("column-gap")) {
    out = writeProp(out, "gap", by.get("row-gap"));
    by.delete("row-gap");
    by.delete("column-gap");
  }
  for (const [prop, value] of by) out = writeProp(out, prop, value);
  return out;
}
function cssText(copied, groups) {
  const lines = [];
  for (const g of GROUPS) {
    if (!groups.has(g.id)) continue;
    for (const prop of g.props) {
      const v = copied.values.get(prop);
      if (v && (v.declared || !isDefault(prop, v.computed))) lines.push(`  ${prop}: ${v.declared ?? v.computed};`);
    }
  }
  return `/* from ${copied.label} */
{
${lines.join("\n")}
}`;
}
var isDefault = (prop, v) => v === "none" || v === "normal" || v === "auto" || v === "0px" || v === "rgba(0, 0, 0, 0)" || prop.endsWith("-style") && v === "none";

// node_modules/clsx/dist/clsx.mjs
function r(e) {
  var t, f, n = "";
  if ("string" == typeof e || "number" == typeof e) n += e;
  else if ("object" == typeof e) if (Array.isArray(e)) {
    var o = e.length;
    for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
  } else for (f in e) e[f] && (n && (n += " "), n += f);
  return n;
}
function clsx() {
  for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
  return n;
}

// node_modules/class-variance-authority/dist/index.mjs
var falsyToString = (value) => typeof value === "boolean" ? `${value}` : value === 0 ? "0" : value;
var cx = clsx;
var cva = (base, config) => (props) => {
  var _config_compoundVariants;
  if ((config === null || config === void 0 ? void 0 : config.variants) == null) return cx(base, props === null || props === void 0 ? void 0 : props.class, props === null || props === void 0 ? void 0 : props.className);
  const { variants, defaultVariants } = config;
  const getVariantClassNames = Object.keys(variants).map((variant) => {
    const variantProp = props === null || props === void 0 ? void 0 : props[variant];
    const defaultVariantProp = defaultVariants === null || defaultVariants === void 0 ? void 0 : defaultVariants[variant];
    if (variantProp === null) return null;
    const variantKey = falsyToString(variantProp) || falsyToString(defaultVariantProp);
    return variants[variant][variantKey];
  });
  const propsWithoutUndefined = props && Object.entries(props).reduce((acc, param) => {
    let [key, value] = param;
    if (value === void 0) {
      return acc;
    }
    acc[key] = value;
    return acc;
  }, {});
  const getCompoundVariantClassNames = config === null || config === void 0 ? void 0 : (_config_compoundVariants = config.compoundVariants) === null || _config_compoundVariants === void 0 ? void 0 : _config_compoundVariants.reduce((acc, param) => {
    let { class: cvClass, className: cvClassName, ...compoundVariantOptions } = param;
    return Object.entries(compoundVariantOptions).every((param2) => {
      let [key, value] = param2;
      return Array.isArray(value) ? value.includes({
        ...defaultVariants,
        ...propsWithoutUndefined
      }[key]) : {
        ...defaultVariants,
        ...propsWithoutUndefined
      }[key] === value;
    }) ? [
      ...acc,
      cvClass,
      cvClassName
    ] : acc;
  }, []);
  return cx(base, getVariantClassNames, getCompoundVariantClassNames, props === null || props === void 0 ? void 0 : props.class, props === null || props === void 0 ? void 0 : props.className);
};

// node_modules/tailwind-merge/dist/bundle-mjs.mjs
var concatArrays = (array1, array2) => {
  const combinedArray = new Array(array1.length + array2.length);
  for (let i = 0; i < array1.length; i++) {
    combinedArray[i] = array1[i];
  }
  for (let i = 0; i < array2.length; i++) {
    combinedArray[array1.length + i] = array2[i];
  }
  return combinedArray;
};
var createClassValidatorObject = (classGroupId, validator) => ({
  classGroupId,
  validator
});
var createClassPartObject = (nextPart = /* @__PURE__ */ new Map(), validators = null, classGroupId) => ({
  nextPart,
  validators,
  classGroupId
});
var CLASS_PART_SEPARATOR = "-";
var EMPTY_CONFLICTS = [];
var ARBITRARY_PROPERTY_PREFIX = "arbitrary..";
var createClassGroupUtils = (config) => {
  const classMap = createClassMap(config);
  const {
    conflictingClassGroups,
    conflictingClassGroupModifiers
  } = config;
  const getClassGroupId = (className) => {
    if (className.startsWith("[") && className.endsWith("]")) {
      return getGroupIdForArbitraryProperty(className);
    }
    const classParts = className.split(CLASS_PART_SEPARATOR);
    const startIndex = classParts[0] === "" && classParts.length > 1 ? 1 : 0;
    return getGroupRecursive(classParts, startIndex, classMap);
  };
  const getConflictingClassGroupIds = (classGroupId, hasPostfixModifier) => {
    if (hasPostfixModifier) {
      const modifierConflicts = conflictingClassGroupModifiers[classGroupId];
      const baseConflicts = conflictingClassGroups[classGroupId];
      if (modifierConflicts) {
        if (baseConflicts) {
          return concatArrays(baseConflicts, modifierConflicts);
        }
        return modifierConflicts;
      }
      return baseConflicts || EMPTY_CONFLICTS;
    }
    return conflictingClassGroups[classGroupId] || EMPTY_CONFLICTS;
  };
  return {
    getClassGroupId,
    getConflictingClassGroupIds
  };
};
var getGroupRecursive = (classParts, startIndex, classPartObject) => {
  const classPathsLength = classParts.length - startIndex;
  if (classPathsLength === 0) {
    return classPartObject.classGroupId;
  }
  const currentClassPart = classParts[startIndex];
  const nextClassPartObject = classPartObject.nextPart.get(currentClassPart);
  if (nextClassPartObject) {
    const result = getGroupRecursive(classParts, startIndex + 1, nextClassPartObject);
    if (result) return result;
  }
  const validators = classPartObject.validators;
  if (validators === null) {
    return void 0;
  }
  const classRest = startIndex === 0 ? classParts.join(CLASS_PART_SEPARATOR) : classParts.slice(startIndex).join(CLASS_PART_SEPARATOR);
  const validatorsLength = validators.length;
  for (let i = 0; i < validatorsLength; i++) {
    const validatorObj = validators[i];
    if (validatorObj.validator(classRest)) {
      return validatorObj.classGroupId;
    }
  }
  return void 0;
};
var getGroupIdForArbitraryProperty = (className) => className.slice(1, -1).indexOf(":") === -1 ? void 0 : (() => {
  const content = className.slice(1, -1);
  const colonIndex = content.indexOf(":");
  const property = content.slice(0, colonIndex);
  return property ? ARBITRARY_PROPERTY_PREFIX + property : void 0;
})();
var createClassMap = (config) => {
  const {
    theme,
    classGroups
  } = config;
  return processClassGroups(classGroups, theme);
};
var processClassGroups = (classGroups, theme) => {
  const classMap = createClassPartObject();
  for (const classGroupId in classGroups) {
    const group = classGroups[classGroupId];
    processClassesRecursively(group, classMap, classGroupId, theme);
  }
  return classMap;
};
var processClassesRecursively = (classGroup, classPartObject, classGroupId, theme) => {
  const len = classGroup.length;
  for (let i = 0; i < len; i++) {
    const classDefinition = classGroup[i];
    processClassDefinition(classDefinition, classPartObject, classGroupId, theme);
  }
};
var processClassDefinition = (classDefinition, classPartObject, classGroupId, theme) => {
  if (typeof classDefinition === "string") {
    processStringDefinition(classDefinition, classPartObject, classGroupId);
    return;
  }
  if (typeof classDefinition === "function") {
    processFunctionDefinition(classDefinition, classPartObject, classGroupId, theme);
    return;
  }
  processObjectDefinition(classDefinition, classPartObject, classGroupId, theme);
};
var processStringDefinition = (classDefinition, classPartObject, classGroupId) => {
  const classPartObjectToEdit = classDefinition === "" ? classPartObject : getPart(classPartObject, classDefinition);
  classPartObjectToEdit.classGroupId = classGroupId;
};
var processFunctionDefinition = (classDefinition, classPartObject, classGroupId, theme) => {
  if (isThemeGetter(classDefinition)) {
    processClassesRecursively(classDefinition(theme), classPartObject, classGroupId, theme);
    return;
  }
  if (classPartObject.validators === null) {
    classPartObject.validators = [];
  }
  classPartObject.validators.push(createClassValidatorObject(classGroupId, classDefinition));
};
var processObjectDefinition = (classDefinition, classPartObject, classGroupId, theme) => {
  const entries = Object.entries(classDefinition);
  const len = entries.length;
  for (let i = 0; i < len; i++) {
    const [key, value] = entries[i];
    processClassesRecursively(value, getPart(classPartObject, key), classGroupId, theme);
  }
};
var getPart = (classPartObject, path) => {
  let current = classPartObject;
  const parts = path.split(CLASS_PART_SEPARATOR);
  const len = parts.length;
  for (let i = 0; i < len; i++) {
    const part = parts[i];
    let next = current.nextPart.get(part);
    if (!next) {
      next = createClassPartObject();
      current.nextPart.set(part, next);
    }
    current = next;
  }
  return current;
};
var isThemeGetter = (func) => "isThemeGetter" in func && func.isThemeGetter === true;
var createLruCache = (maxCacheSize) => {
  if (maxCacheSize < 1) {
    return {
      get: () => void 0,
      set: () => {
      }
    };
  }
  let cacheSize = 0;
  let cache = /* @__PURE__ */ Object.create(null);
  let previousCache = /* @__PURE__ */ Object.create(null);
  const update = (key, value) => {
    cache[key] = value;
    cacheSize++;
    if (cacheSize > maxCacheSize) {
      cacheSize = 0;
      previousCache = cache;
      cache = /* @__PURE__ */ Object.create(null);
    }
  };
  return {
    get(key) {
      let value = cache[key];
      if (value !== void 0) {
        return value;
      }
      if ((value = previousCache[key]) !== void 0) {
        update(key, value);
        return value;
      }
    },
    set(key, value) {
      if (key in cache) {
        cache[key] = value;
      } else {
        update(key, value);
      }
    }
  };
};
var IMPORTANT_MODIFIER = "!";
var MODIFIER_SEPARATOR = ":";
var EMPTY_MODIFIERS = [];
var createResultObject = (modifiers, hasImportantModifier, baseClassName, maybePostfixModifierPosition, isExternal) => ({
  modifiers,
  hasImportantModifier,
  baseClassName,
  maybePostfixModifierPosition,
  isExternal
});
var createParseClassName = (config) => {
  const {
    prefix,
    experimentalParseClassName
  } = config;
  let parseClassName = (className) => {
    const modifiers = [];
    let bracketDepth = 0;
    let parenDepth = 0;
    let modifierStart = 0;
    let postfixModifierPosition;
    const len = className.length;
    for (let index2 = 0; index2 < len; index2++) {
      const currentCharacter = className[index2];
      if (bracketDepth === 0 && parenDepth === 0) {
        if (currentCharacter === MODIFIER_SEPARATOR) {
          modifiers.push(className.slice(modifierStart, index2));
          modifierStart = index2 + 1;
          continue;
        }
        if (currentCharacter === "/") {
          postfixModifierPosition = index2;
          continue;
        }
      }
      if (currentCharacter === "[") bracketDepth++;
      else if (currentCharacter === "]") bracketDepth--;
      else if (currentCharacter === "(") parenDepth++;
      else if (currentCharacter === ")") parenDepth--;
      else if (currentCharacter === "\\") index2++;
      else if (currentCharacter === '"' || currentCharacter === "'") {
        while (++index2 < len) {
          const quotedCharacter = className[index2];
          if (quotedCharacter === "\\") index2++;
          else if (quotedCharacter === currentCharacter) break;
        }
      }
    }
    const baseClassNameWithImportantModifier = modifiers.length === 0 ? className : className.slice(modifierStart);
    let baseClassName = baseClassNameWithImportantModifier;
    let hasImportantModifier = false;
    if (baseClassNameWithImportantModifier.endsWith(IMPORTANT_MODIFIER)) {
      baseClassName = baseClassNameWithImportantModifier.slice(0, -1);
      hasImportantModifier = true;
    } else if (
      /**
       * In Tailwind CSS v3 the important modifier was at the start of the base class name. This is still supported for legacy reasons.
       * @see https://github.com/dcastil/tailwind-merge/issues/513#issuecomment-2614029864
       */
      baseClassNameWithImportantModifier.startsWith(IMPORTANT_MODIFIER)
    ) {
      baseClassName = baseClassNameWithImportantModifier.slice(1);
      hasImportantModifier = true;
    }
    const importantModifierOffset = hasImportantModifier && baseClassNameWithImportantModifier.startsWith(IMPORTANT_MODIFIER) ? IMPORTANT_MODIFIER.length : 0;
    const maybePostfixModifierPosition = postfixModifierPosition && postfixModifierPosition > modifierStart ? postfixModifierPosition - modifierStart - importantModifierOffset : void 0;
    return createResultObject(modifiers, hasImportantModifier, baseClassName, maybePostfixModifierPosition);
  };
  if (prefix) {
    const fullPrefix = prefix + MODIFIER_SEPARATOR;
    const parseClassNameOriginal = parseClassName;
    parseClassName = (className) => className.startsWith(fullPrefix) ? parseClassNameOriginal(className.slice(fullPrefix.length)) : createResultObject(EMPTY_MODIFIERS, false, className, void 0, true);
  }
  if (experimentalParseClassName) {
    const parseClassNameOriginal = parseClassName;
    parseClassName = (className) => experimentalParseClassName({
      className,
      parseClassName: parseClassNameOriginal
    });
  }
  return parseClassName;
};
var createSortModifiers = (config) => {
  const modifierWeights = /* @__PURE__ */ new Map();
  config.orderSensitiveModifiers.forEach((mod, index2) => {
    modifierWeights.set(mod, 1e6 + index2);
  });
  return (modifiers) => {
    const result = [];
    let currentSegment = [];
    for (let i = 0; i < modifiers.length; i++) {
      const modifier = modifiers[i];
      const isArbitrary = modifier[0] === "[";
      const isOrderSensitive = modifierWeights.has(modifier);
      if (isArbitrary || isOrderSensitive) {
        if (currentSegment.length > 0) {
          currentSegment.sort();
          result.push(...currentSegment);
          currentSegment = [];
        }
        result.push(modifier);
      } else {
        currentSegment.push(modifier);
      }
    }
    if (currentSegment.length > 0) {
      currentSegment.sort();
      result.push(...currentSegment);
    }
    return result;
  };
};
var createConfigUtils = (config) => ({
  cache: createLruCache(config.cacheSize),
  parseClassName: createParseClassName(config),
  sortModifiers: createSortModifiers(config),
  postfixLookupClassGroupIds: createPostfixLookupClassGroupIds(config),
  ...createClassGroupUtils(config)
});
var createPostfixLookupClassGroupIds = (config) => {
  const lookup = /* @__PURE__ */ Object.create(null);
  const classGroupIds = config.postfixLookupClassGroups;
  if (classGroupIds) {
    for (let i = 0; i < classGroupIds.length; i++) {
      lookup[classGroupIds[i]] = true;
    }
  }
  return lookup;
};
var SPLIT_CLASSES_REGEX = /\s+/;
var mergeClassList = (classList, configUtils) => {
  const {
    parseClassName,
    getClassGroupId,
    getConflictingClassGroupIds,
    sortModifiers,
    postfixLookupClassGroupIds
  } = configUtils;
  const classGroupsInConflict = [];
  const classNames = classList.trim().split(SPLIT_CLASSES_REGEX);
  let result = "";
  for (let index2 = classNames.length - 1; index2 >= 0; index2 -= 1) {
    const originalClassName = classNames[index2];
    const {
      isExternal,
      modifiers,
      hasImportantModifier,
      baseClassName,
      maybePostfixModifierPosition
    } = parseClassName(originalClassName);
    if (isExternal) {
      result = originalClassName + (result.length > 0 ? " " + result : result);
      continue;
    }
    let hasPostfixModifier = !!maybePostfixModifierPosition;
    let classGroupId;
    if (hasPostfixModifier) {
      const baseClassNameWithoutPostfix = baseClassName.substring(0, maybePostfixModifierPosition);
      classGroupId = getClassGroupId(baseClassNameWithoutPostfix);
      const classGroupIdWithPostfix = classGroupId && postfixLookupClassGroupIds[classGroupId] ? getClassGroupId(baseClassName) : void 0;
      if (classGroupIdWithPostfix && classGroupIdWithPostfix !== classGroupId) {
        classGroupId = classGroupIdWithPostfix;
        hasPostfixModifier = false;
      }
    } else {
      classGroupId = getClassGroupId(baseClassName);
    }
    if (!classGroupId) {
      if (!hasPostfixModifier) {
        result = originalClassName + (result.length > 0 ? " " + result : result);
        continue;
      }
      classGroupId = getClassGroupId(baseClassName);
      if (!classGroupId) {
        result = originalClassName + (result.length > 0 ? " " + result : result);
        continue;
      }
      hasPostfixModifier = false;
    }
    const variantModifier = modifiers.length === 0 ? "" : modifiers.length === 1 ? modifiers[0] : sortModifiers(modifiers).join(":");
    const modifierId = hasImportantModifier ? variantModifier + IMPORTANT_MODIFIER : variantModifier;
    const classId = modifierId + classGroupId;
    if (classGroupsInConflict.indexOf(classId) > -1) {
      continue;
    }
    classGroupsInConflict.push(classId);
    const conflictGroups = getConflictingClassGroupIds(classGroupId, hasPostfixModifier);
    for (let i = 0; i < conflictGroups.length; ++i) {
      const group = conflictGroups[i];
      classGroupsInConflict.push(modifierId + group);
    }
    result = originalClassName + (result.length > 0 ? " " + result : result);
  }
  return result;
};
var twJoin = (...classLists) => {
  let index2 = 0;
  let argument;
  let resolvedValue;
  let string = "";
  while (index2 < classLists.length) {
    if (argument = classLists[index2++]) {
      if (resolvedValue = toValue(argument)) {
        string && (string += " ");
        string += resolvedValue;
      }
    }
  }
  return string;
};
var toValue = (mix) => {
  if (typeof mix === "string") {
    return mix;
  }
  let resolvedValue;
  let string = "";
  for (let k = 0; k < mix.length; k++) {
    if (mix[k]) {
      if (resolvedValue = toValue(mix[k])) {
        string && (string += " ");
        string += resolvedValue;
      }
    }
  }
  return string;
};
var createTailwindMerge = (createConfigFirst, ...createConfigRest) => {
  let configUtils;
  let cacheGet;
  let cacheSet;
  let functionToCall;
  const initTailwindMerge = (classList) => {
    const config = createConfigRest.reduce((previousConfig, createConfigCurrent) => createConfigCurrent(previousConfig), createConfigFirst());
    configUtils = createConfigUtils(config);
    cacheGet = configUtils.cache.get;
    cacheSet = configUtils.cache.set;
    functionToCall = tailwindMerge;
    return tailwindMerge(classList);
  };
  const tailwindMerge = (classList) => {
    const cachedResult = cacheGet(classList);
    if (cachedResult) {
      return cachedResult;
    }
    const result = mergeClassList(classList, configUtils);
    cacheSet(classList, result);
    return result;
  };
  functionToCall = initTailwindMerge;
  return (...args) => functionToCall(twJoin(...args));
};
var fallbackThemeArr = [];
var fromTheme = (key) => {
  const themeGetter = (theme) => theme[key] || fallbackThemeArr;
  themeGetter.isThemeGetter = true;
  themeGetter.themeKey = key;
  return themeGetter;
};
var arbitraryValueRegex = /^\[(?:(\w[\w-]*):)?(.+)\]$/i;
var arbitraryVariableRegex = /^\((?:(\w[\w-]*):)?(.+)\)$/i;
var fractionRegex = /^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/;
var tshirtUnitRegex = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/;
var lengthUnitRegex = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|Q|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^--spacing\(.+\)|^0$/;
var colorFunctionRegex = /^(rgba?|hsla?|hwb|(ok)?(lab|lch)|color-mix|color|light-dark|contrast-color|device-cmyk|--alpha)\(.+\)$/i;
var maskPositionRegex = /^(?:_*[+-]?(?:\d|\.\d)|[\w-]+\(|_*(?:inherit|initial|revert(?:-layer)?|unset)_*$)/i;
var shadowRegex = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/;
var imageRegex = /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/;
var isFraction = (value) => fractionRegex.test(value);
var isNumber = (value) => !!value && !Number.isNaN(Number(value));
var isInteger = (value) => !!value && Number.isInteger(Number(value));
var isPercent = (value) => value.endsWith("%") && isNumber(value.slice(0, -1));
var isTshirtSize = (value) => tshirtUnitRegex.test(value);
var isAny = () => true;
var isLengthOnly = (value) => (
  // `colorFunctionRegex` check is necessary because color functions can have percentages in them which which would be incorrectly classified as lengths.
  // For example, `hsl(0 0% 0%)` would be classified as a length without this check.
  // I could also use lookbehind assertion in `lengthUnitRegex` but that isn't supported widely enough.
  lengthUnitRegex.test(value) && !colorFunctionRegex.test(value)
);
var isMaskPosition = (value) => (
  // Mask stops default to positions for variables and non-color CSS functions, including angles, so color functions need to be excluded explicitly.
  maskPositionRegex.test(value) && !colorFunctionRegex.test(value)
);
var isNever = () => false;
var isShadow = (value) => shadowRegex.test(value);
var isImage = (value) => imageRegex.test(value);
var isAnyNonArbitrary = (value) => !isArbitraryValue(value) && !isArbitraryVariable(value);
var isNamedContainerQuery = (value) => value.startsWith("@container") && (value[10] === "/" && value[11] !== void 0 || value[11] === "s" && value[16] !== void 0 && value.startsWith("-size/", 10) || value[11] === "n" && value[18] !== void 0 && value.startsWith("-normal/", 10));
var isArbitrarySize = (value) => getIsArbitraryValue(value, isLabelSize, isNever);
var isArbitraryValue = (value) => arbitraryValueRegex.test(value);
var isArbitraryLength = (value) => getIsArbitraryValue(value, isLabelLength, isLengthOnly);
var isArbitraryMaskPosition = (value) => getIsArbitraryValue(value, isLabelMaskPosition, isMaskPosition);
var isArbitraryNumber = (value) => getIsArbitraryValue(value, isLabelNumber, isNumber);
var isArbitraryWeight = (value) => getIsArbitraryValue(value, isLabelWeight, isAny);
var isArbitraryFamilyName = (value) => getIsArbitraryValue(value, isLabelFamilyName, isNever);
var isArbitraryPosition = (value) => getIsArbitraryValue(value, isLabelPosition, isNever);
var isArbitraryImage = (value) => getIsArbitraryValue(value, isLabelImage, isImage);
var isArbitraryShadow = (value) => getIsArbitraryValue(value, isLabelShadow, isShadow);
var isArbitraryVariable = (value) => arbitraryVariableRegex.test(value);
var isArbitraryVariableLength = (value) => getIsArbitraryVariable(value, isLabelLength);
var isArbitraryVariableMaskPosition = (value) => getIsArbitraryVariable(value, isLabelMaskPosition, true);
var isArbitraryVariableFamilyName = (value) => getIsArbitraryVariable(value, isLabelFamilyName);
var isArbitraryVariablePosition = (value) => getIsArbitraryVariable(value, isLabelPosition);
var isArbitraryVariableSize = (value) => getIsArbitraryVariable(value, isLabelSize);
var isArbitraryVariableImage = (value) => getIsArbitraryVariable(value, isLabelImage);
var isArbitraryVariableShadow = (value) => getIsArbitraryVariable(value, isLabelShadow, true);
var isArbitraryVariableWeight = (value) => getIsArbitraryVariable(value, isLabelWeight, true);
var getIsArbitraryValue = (value, testLabel, testValue) => {
  const result = arbitraryValueRegex.exec(value);
  if (result) {
    if (result[1]) {
      return testLabel(result[1]);
    }
    return testValue(result[2]);
  }
  return false;
};
var getIsArbitraryVariable = (value, testLabel, shouldMatchNoLabel = false) => {
  const result = arbitraryVariableRegex.exec(value);
  if (result) {
    if (result[1]) {
      return testLabel(result[1]);
    }
    return shouldMatchNoLabel;
  }
  return false;
};
var isLabelPosition = (label2) => label2 === "position" || label2 === "percentage";
var isLabelImage = (label2) => label2 === "image" || label2 === "url";
var isLabelSize = (label2) => label2 === "length" || label2 === "size" || label2 === "bg-size";
var isLabelLength = (label2) => label2 === "length";
var isLabelMaskPosition = (label2) => label2 !== "color";
var isLabelNumber = (label2) => label2 === "number";
var isLabelFamilyName = (label2) => label2 === "family-name";
var isLabelWeight = (label2) => label2 === "number" || label2 === "weight";
var isLabelShadow = (label2) => label2 === "shadow";
var getDefaultConfig = () => {
  const themeColor = fromTheme("color");
  const themeFont = fromTheme("font");
  const themeText = fromTheme("text");
  const themeFontWeight = fromTheme("font-weight");
  const themeTracking = fromTheme("tracking");
  const themeLeading = fromTheme("leading");
  const themeBreakpoint = fromTheme("breakpoint");
  const themeContainer = fromTheme("container");
  const themeSpacing = fromTheme("spacing");
  const themeRadius = fromTheme("radius");
  const themeShadow = fromTheme("shadow");
  const themeInsetShadow = fromTheme("inset-shadow");
  const themeTextShadow = fromTheme("text-shadow");
  const themeDropShadow = fromTheme("drop-shadow");
  const themeBlur = fromTheme("blur");
  const themePerspective = fromTheme("perspective");
  const themeAspect = fromTheme("aspect");
  const themeEase = fromTheme("ease");
  const themeAnimate = fromTheme("animate");
  const scaleBreak = () => ["auto", "avoid", "all", "avoid-page", "page", "left", "right", "column"];
  const scalePosition = () => [
    "center",
    "top",
    "bottom",
    "left",
    "right",
    "top-left",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "left-top",
    "top-right",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "right-top",
    "bottom-right",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "right-bottom",
    "bottom-left",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "left-bottom"
  ];
  const scalePositionWithArbitrary = () => [...scalePosition(), isArbitraryVariable, isArbitraryValue];
  const scaleOverflow = () => ["auto", "hidden", "clip", "visible", "scroll"];
  const scaleOverscroll = () => ["auto", "contain", "none"];
  const scaleUnambiguousSpacing = () => [isArbitraryVariable, isArbitraryValue, themeSpacing];
  const scaleInset = () => [isFraction, "full", "auto", ...scaleUnambiguousSpacing()];
  const scaleGridTemplateColsRows = () => [isInteger, "none", "subgrid", isArbitraryVariable, isArbitraryValue];
  const scaleGridColRowStartAndEnd = () => ["auto", {
    span: ["full", isInteger, isArbitraryVariable, isArbitraryValue]
  }, isInteger, isArbitraryVariable, isArbitraryValue];
  const scaleGridColRowStartOrEnd = () => [isInteger, "auto", isArbitraryVariable, isArbitraryValue];
  const scaleGridAutoColsRows = () => ["auto", "min", "max", "fr", isArbitraryVariable, isArbitraryValue];
  const scaleAlignPrimaryAxis = () => ["start", "end", "center", "between", "around", "evenly", "stretch", "baseline", "center-safe", "end-safe"];
  const scaleAlignSecondaryAxis = () => ["start", "end", "center", "stretch", "center-safe", "end-safe"];
  const scaleMargin = () => ["auto", ...scaleUnambiguousSpacing()];
  const scaleSizing = () => [isFraction, "auto", "full", "dvw", "dvh", "lvw", "lvh", "svw", "svh", "min", "max", "fit", ...scaleUnambiguousSpacing()];
  const scaleSizingInline = () => [themeContainer, isFraction, "screen", "full", "dvw", "lvw", "svw", "min", "max", "fit", ...scaleUnambiguousSpacing()];
  const scaleSizingBlock = () => [isFraction, "screen", "full", "lh", "dvh", "lvh", "svh", "min", "max", "fit", ...scaleUnambiguousSpacing()];
  const scaleColor = () => [themeColor, isArbitraryVariable, isArbitraryValue];
  const scaleBgPosition = () => [...scalePosition(), isArbitraryVariablePosition, isArbitraryPosition, {
    position: [isArbitraryVariable, isArbitraryValue]
  }];
  const scaleBgRepeat = () => ["no-repeat", {
    repeat: ["", "x", "y", "space", "round"]
  }];
  const scaleBgSize = () => ["auto", "cover", "contain", isArbitraryVariableSize, isArbitrarySize, {
    size: [isArbitraryVariable, isArbitraryValue]
  }];
  const scaleGradientStopPosition = () => [isPercent, isArbitraryVariableLength, isArbitraryLength];
  const scaleRadius = () => [
    // Deprecated since Tailwind CSS v4.0.0
    "",
    "none",
    "full",
    themeRadius,
    isArbitraryVariable,
    isArbitraryValue
  ];
  const scaleBorderWidth = () => ["", isNumber, isArbitraryVariableLength, isArbitraryLength];
  const scaleLineStyle = () => ["solid", "dashed", "dotted", "double"];
  const scaleBlendMode = () => ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"];
  const scaleMaskImagePosition = () => [isNumber, isPercent, isArbitraryVariableMaskPosition, isArbitraryMaskPosition];
  const scaleBlur = () => [
    // Deprecated since Tailwind CSS v4.0.0
    "",
    "none",
    themeBlur,
    isArbitraryVariable,
    isArbitraryValue
  ];
  const scaleRotate = () => ["none", isNumber, isArbitraryVariable, isArbitraryValue];
  const scaleScale = () => ["none", isNumber, isArbitraryVariable, isArbitraryValue];
  const scaleSkew = () => [isNumber, isArbitraryVariable, isArbitraryValue];
  const scaleTranslate = () => [isFraction, "full", ...scaleUnambiguousSpacing()];
  return {
    cacheSize: 500,
    theme: {
      animate: ["spin", "ping", "pulse", "bounce"],
      aspect: ["video"],
      blur: [isTshirtSize],
      breakpoint: [isTshirtSize],
      color: [isAny],
      container: [isTshirtSize],
      "drop-shadow": [isTshirtSize],
      ease: ["in", "out", "in-out"],
      font: [isAnyNonArbitrary],
      "font-weight": ["thin", "extralight", "light", "normal", "medium", "semibold", "bold", "extrabold", "black"],
      "inset-shadow": [isTshirtSize],
      leading: ["none", "tight", "snug", "normal", "relaxed", "loose"],
      perspective: ["dramatic", "near", "normal", "midrange", "distant", "none"],
      radius: [isTshirtSize],
      shadow: [isTshirtSize],
      spacing: ["px", isNumber],
      text: [isTshirtSize],
      "text-shadow": [isTshirtSize],
      tracking: ["tighter", "tight", "normal", "wide", "wider", "widest"]
    },
    classGroups: {
      // --------------
      // --- Layout ---
      // --------------
      /**
       * Aspect Ratio
       * @see https://tailwindcss.com/docs/aspect-ratio
       */
      aspect: [{
        aspect: ["auto", "square", isFraction, isArbitraryValue, isArbitraryVariable, themeAspect]
      }],
      /**
       * Container
       * @see https://tailwindcss.com/docs/container
       * @deprecated since Tailwind CSS v4.0.0
       */
      container: ["container"],
      /**
       * Container Type
       * @see https://tailwindcss.com/docs/responsive-design#container-queries
       */
      "container-type": [{
        "@container": ["", "normal", "size", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Container Name
       * @see https://tailwindcss.com/docs/responsive-design#named-containers
       */
      "container-named": [isNamedContainerQuery],
      /**
       * Columns
       * @see https://tailwindcss.com/docs/columns
       */
      columns: [{
        columns: [isNumber, "auto", isArbitraryValue, isArbitraryVariable, themeContainer]
      }],
      /**
       * Break After
       * @see https://tailwindcss.com/docs/break-after
       */
      "break-after": [{
        "break-after": scaleBreak()
      }],
      /**
       * Break Before
       * @see https://tailwindcss.com/docs/break-before
       */
      "break-before": [{
        "break-before": scaleBreak()
      }],
      /**
       * Break Inside
       * @see https://tailwindcss.com/docs/break-inside
       */
      "break-inside": [{
        "break-inside": ["auto", "avoid", "avoid-page", "avoid-column"]
      }],
      /**
       * Box Decoration Break
       * @see https://tailwindcss.com/docs/box-decoration-break
       */
      "box-decoration": [{
        "box-decoration": ["slice", "clone"]
      }],
      /**
       * Box Sizing
       * @see https://tailwindcss.com/docs/box-sizing
       */
      box: [{
        box: ["border", "content"]
      }],
      /**
       * Display
       * @see https://tailwindcss.com/docs/display
       */
      display: ["block", "inline-block", "inline", "flex", "inline-flex", "table", "inline-table", "table-caption", "table-cell", "table-column", "table-column-group", "table-footer-group", "table-header-group", "table-row-group", "table-row", "flow-root", "grid", "inline-grid", "contents", "list-item", "hidden"],
      /**
       * Screen Reader Only
       * @see https://tailwindcss.com/docs/display#screen-reader-only
       */
      sr: ["sr-only"],
      /**
       * Not Screen Reader Only
       * @see https://tailwindcss.com/docs/display#screen-reader-only
       */
      "not-sr": ["not-sr-only"],
      /**
       * Floats
       * @see https://tailwindcss.com/docs/float
       */
      float: [{
        float: ["right", "left", "none", "start", "end"]
      }],
      /**
       * Clear
       * @see https://tailwindcss.com/docs/clear
       */
      clear: [{
        clear: ["left", "right", "both", "none", "start", "end"]
      }],
      /**
       * Isolation
       * @see https://tailwindcss.com/docs/isolation
       */
      isolation: ["isolate", "isolation-auto"],
      /**
       * Object Fit
       * @see https://tailwindcss.com/docs/object-fit
       */
      "object-fit": [{
        object: ["contain", "cover", "fill", "none", "scale-down"]
      }],
      /**
       * Object Position
       * @see https://tailwindcss.com/docs/object-position
       */
      "object-position": [{
        object: scalePositionWithArbitrary()
      }],
      /**
       * Overflow
       * @see https://tailwindcss.com/docs/overflow
       */
      overflow: [{
        overflow: scaleOverflow()
      }],
      /**
       * Overflow X
       * @see https://tailwindcss.com/docs/overflow
       */
      "overflow-x": [{
        "overflow-x": scaleOverflow()
      }],
      /**
       * Overflow Y
       * @see https://tailwindcss.com/docs/overflow
       */
      "overflow-y": [{
        "overflow-y": scaleOverflow()
      }],
      /**
       * Overscroll Behavior
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      overscroll: [{
        overscroll: scaleOverscroll()
      }],
      /**
       * Overscroll Behavior X
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      "overscroll-x": [{
        "overscroll-x": scaleOverscroll()
      }],
      /**
       * Overscroll Behavior Y
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      "overscroll-y": [{
        "overscroll-y": scaleOverscroll()
      }],
      /**
       * Position
       * @see https://tailwindcss.com/docs/position
       */
      position: ["static", "fixed", "absolute", "relative", "sticky"],
      /**
       * Inset
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      inset: [{
        inset: scaleInset()
      }],
      /**
       * Inset Inline
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-x": [{
        "inset-x": scaleInset()
      }],
      /**
       * Inset Block
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-y": [{
        "inset-y": scaleInset()
      }],
      /**
       * Inset Inline Start
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       * @todo class group will be renamed to `inset-s` in next major release
       */
      start: [{
        "inset-s": scaleInset(),
        /**
         * @deprecated since Tailwind CSS v4.2.0 in favor of `inset-s-*` utilities.
         * @see https://github.com/tailwindlabs/tailwindcss/pull/19613
         */
        start: scaleInset()
      }],
      /**
       * Inset Inline End
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       * @todo class group will be renamed to `inset-e` in next major release
       */
      end: [{
        "inset-e": scaleInset(),
        /**
         * @deprecated since Tailwind CSS v4.2.0 in favor of `inset-e-*` utilities.
         * @see https://github.com/tailwindlabs/tailwindcss/pull/19613
         */
        end: scaleInset()
      }],
      /**
       * Inset Block Start
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-bs": [{
        "inset-bs": scaleInset()
      }],
      /**
       * Inset Block End
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-be": [{
        "inset-be": scaleInset()
      }],
      /**
       * Top
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      top: [{
        top: scaleInset()
      }],
      /**
       * Right
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      right: [{
        right: scaleInset()
      }],
      /**
       * Bottom
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      bottom: [{
        bottom: scaleInset()
      }],
      /**
       * Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      left: [{
        left: scaleInset()
      }],
      /**
       * Visibility
       * @see https://tailwindcss.com/docs/visibility
       */
      visibility: ["visible", "invisible", "collapse"],
      /**
       * Z-Index
       * @see https://tailwindcss.com/docs/z-index
       */
      z: [{
        z: [isInteger, "auto", isArbitraryVariable, isArbitraryValue]
      }],
      // ------------------------
      // --- Flexbox and Grid ---
      // ------------------------
      /**
       * Flex Basis
       * @see https://tailwindcss.com/docs/flex-basis
       */
      basis: [{
        basis: [isFraction, "full", "auto", themeContainer, ...scaleUnambiguousSpacing()]
      }],
      /**
       * Flex Direction
       * @see https://tailwindcss.com/docs/flex-direction
       */
      "flex-direction": [{
        flex: ["row", "row-reverse", "col", "col-reverse"]
      }],
      /**
       * Flex Wrap
       * @see https://tailwindcss.com/docs/flex-wrap
       */
      "flex-wrap": [{
        flex: ["nowrap", "wrap", "wrap-reverse"]
      }],
      /**
       * Flex
       * @see https://tailwindcss.com/docs/flex
       */
      flex: [{
        flex: [isNumber, isFraction, "auto", "initial", "none", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Flex Grow
       * @see https://tailwindcss.com/docs/flex-grow
       */
      grow: [{
        grow: ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Flex Shrink
       * @see https://tailwindcss.com/docs/flex-shrink
       */
      shrink: [{
        shrink: ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Order
       * @see https://tailwindcss.com/docs/order
       */
      order: [{
        order: [isInteger, "first", "last", "none", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Grid Template Columns
       * @see https://tailwindcss.com/docs/grid-template-columns
       */
      "grid-cols": [{
        "grid-cols": scaleGridTemplateColsRows()
      }],
      /**
       * Grid Column Start / End
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-start-end": [{
        col: scaleGridColRowStartAndEnd()
      }],
      /**
       * Grid Column Start
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-start": [{
        "col-start": scaleGridColRowStartOrEnd()
      }],
      /**
       * Grid Column End
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-end": [{
        "col-end": scaleGridColRowStartOrEnd()
      }],
      /**
       * Grid Template Rows
       * @see https://tailwindcss.com/docs/grid-template-rows
       */
      "grid-rows": [{
        "grid-rows": scaleGridTemplateColsRows()
      }],
      /**
       * Grid Row Start / End
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-start-end": [{
        row: scaleGridColRowStartAndEnd()
      }],
      /**
       * Grid Row Start
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-start": [{
        "row-start": scaleGridColRowStartOrEnd()
      }],
      /**
       * Grid Row End
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-end": [{
        "row-end": scaleGridColRowStartOrEnd()
      }],
      /**
       * Grid Auto Flow
       * @see https://tailwindcss.com/docs/grid-auto-flow
       */
      "grid-flow": [{
        "grid-flow": ["row", "col", "dense", "row-dense", "col-dense"]
      }],
      /**
       * Grid Auto Columns
       * @see https://tailwindcss.com/docs/grid-auto-columns
       */
      "auto-cols": [{
        "auto-cols": scaleGridAutoColsRows()
      }],
      /**
       * Grid Auto Rows
       * @see https://tailwindcss.com/docs/grid-auto-rows
       */
      "auto-rows": [{
        "auto-rows": scaleGridAutoColsRows()
      }],
      /**
       * Gap
       * @see https://tailwindcss.com/docs/gap
       */
      gap: [{
        gap: scaleUnambiguousSpacing()
      }],
      /**
       * Gap X
       * @see https://tailwindcss.com/docs/gap
       */
      "gap-x": [{
        "gap-x": scaleUnambiguousSpacing()
      }],
      /**
       * Gap Y
       * @see https://tailwindcss.com/docs/gap
       */
      "gap-y": [{
        "gap-y": scaleUnambiguousSpacing()
      }],
      /**
       * Justify Content
       * @see https://tailwindcss.com/docs/justify-content
       */
      "justify-content": [{
        justify: [...scaleAlignPrimaryAxis(), "normal"]
      }],
      /**
       * Justify Items
       * @see https://tailwindcss.com/docs/justify-items
       */
      "justify-items": [{
        "justify-items": [...scaleAlignSecondaryAxis(), "normal"]
      }],
      /**
       * Justify Self
       * @see https://tailwindcss.com/docs/justify-self
       */
      "justify-self": [{
        "justify-self": ["auto", ...scaleAlignSecondaryAxis()]
      }],
      /**
       * Align Content
       * @see https://tailwindcss.com/docs/align-content
       */
      "align-content": [{
        content: ["normal", ...scaleAlignPrimaryAxis()]
      }],
      /**
       * Align Items
       * @see https://tailwindcss.com/docs/align-items
       */
      "align-items": [{
        items: [...scaleAlignSecondaryAxis(), {
          baseline: ["", "last"]
        }]
      }],
      /**
       * Align Self
       * @see https://tailwindcss.com/docs/align-self
       */
      "align-self": [{
        self: ["auto", ...scaleAlignSecondaryAxis(), {
          baseline: ["", "last"]
        }]
      }],
      /**
       * Place Content
       * @see https://tailwindcss.com/docs/place-content
       */
      "place-content": [{
        "place-content": scaleAlignPrimaryAxis()
      }],
      /**
       * Place Items
       * @see https://tailwindcss.com/docs/place-items
       */
      "place-items": [{
        "place-items": [...scaleAlignSecondaryAxis(), "baseline"]
      }],
      /**
       * Place Self
       * @see https://tailwindcss.com/docs/place-self
       */
      "place-self": [{
        "place-self": ["auto", ...scaleAlignSecondaryAxis()]
      }],
      // Spacing
      /**
       * Padding
       * @see https://tailwindcss.com/docs/padding
       */
      p: [{
        p: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Inline
       * @see https://tailwindcss.com/docs/padding
       */
      px: [{
        px: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Block
       * @see https://tailwindcss.com/docs/padding
       */
      py: [{
        py: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Inline Start
       * @see https://tailwindcss.com/docs/padding
       */
      ps: [{
        ps: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Inline End
       * @see https://tailwindcss.com/docs/padding
       */
      pe: [{
        pe: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Block Start
       * @see https://tailwindcss.com/docs/padding
       */
      pbs: [{
        pbs: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Block End
       * @see https://tailwindcss.com/docs/padding
       */
      pbe: [{
        pbe: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Top
       * @see https://tailwindcss.com/docs/padding
       */
      pt: [{
        pt: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Right
       * @see https://tailwindcss.com/docs/padding
       */
      pr: [{
        pr: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Bottom
       * @see https://tailwindcss.com/docs/padding
       */
      pb: [{
        pb: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Left
       * @see https://tailwindcss.com/docs/padding
       */
      pl: [{
        pl: scaleUnambiguousSpacing()
      }],
      /**
       * Margin
       * @see https://tailwindcss.com/docs/margin
       */
      m: [{
        m: scaleMargin()
      }],
      /**
       * Margin Inline
       * @see https://tailwindcss.com/docs/margin
       */
      mx: [{
        mx: scaleMargin()
      }],
      /**
       * Margin Block
       * @see https://tailwindcss.com/docs/margin
       */
      my: [{
        my: scaleMargin()
      }],
      /**
       * Margin Inline Start
       * @see https://tailwindcss.com/docs/margin
       */
      ms: [{
        ms: scaleMargin()
      }],
      /**
       * Margin Inline End
       * @see https://tailwindcss.com/docs/margin
       */
      me: [{
        me: scaleMargin()
      }],
      /**
       * Margin Block Start
       * @see https://tailwindcss.com/docs/margin
       */
      mbs: [{
        mbs: scaleMargin()
      }],
      /**
       * Margin Block End
       * @see https://tailwindcss.com/docs/margin
       */
      mbe: [{
        mbe: scaleMargin()
      }],
      /**
       * Margin Top
       * @see https://tailwindcss.com/docs/margin
       */
      mt: [{
        mt: scaleMargin()
      }],
      /**
       * Margin Right
       * @see https://tailwindcss.com/docs/margin
       */
      mr: [{
        mr: scaleMargin()
      }],
      /**
       * Margin Bottom
       * @see https://tailwindcss.com/docs/margin
       */
      mb: [{
        mb: scaleMargin()
      }],
      /**
       * Margin Left
       * @see https://tailwindcss.com/docs/margin
       */
      ml: [{
        ml: scaleMargin()
      }],
      /**
       * Space Between X
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-x": [{
        "space-x": scaleUnambiguousSpacing()
      }],
      /**
       * Space Between X Reverse
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-x-reverse": ["space-x-reverse"],
      /**
       * Space Between Y
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-y": [{
        "space-y": scaleUnambiguousSpacing()
      }],
      /**
       * Space Between Y Reverse
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-y-reverse": ["space-y-reverse"],
      // --------------
      // --- Sizing ---
      // --------------
      /**
       * Size
       * @see https://tailwindcss.com/docs/width#setting-both-width-and-height
       */
      size: [{
        size: scaleSizing()
      }],
      /**
       * Inline Size
       * @see https://tailwindcss.com/docs/inline-size
       */
      "inline-size": [{
        inline: ["auto", ...scaleSizingInline()]
      }],
      /**
       * Min-Inline Size
       * @see https://tailwindcss.com/docs/min-inline-size
       */
      "min-inline-size": [{
        "min-inline": ["auto", ...scaleSizingInline()]
      }],
      /**
       * Max-Inline Size
       * @see https://tailwindcss.com/docs/max-inline-size
       */
      "max-inline-size": [{
        "max-inline": ["none", ...scaleSizingInline()]
      }],
      /**
       * Block Size
       * @see https://tailwindcss.com/docs/block-size
       */
      "block-size": [{
        block: ["auto", ...scaleSizingBlock()]
      }],
      /**
       * Min-Block Size
       * @see https://tailwindcss.com/docs/min-block-size
       */
      "min-block-size": [{
        "min-block": ["auto", ...scaleSizingBlock()]
      }],
      /**
       * Max-Block Size
       * @see https://tailwindcss.com/docs/max-block-size
       */
      "max-block-size": [{
        "max-block": ["none", ...scaleSizingBlock()]
      }],
      /**
       * Width
       * @see https://tailwindcss.com/docs/width
       */
      w: [{
        w: [themeContainer, "screen", ...scaleSizing()]
      }],
      /**
       * Min-Width
       * @see https://tailwindcss.com/docs/min-width
       */
      "min-w": [{
        "min-w": [
          themeContainer,
          "screen",
          /** Deprecated. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          "none",
          ...scaleSizing()
        ]
      }],
      /**
       * Max-Width
       * @see https://tailwindcss.com/docs/max-width
       */
      "max-w": [{
        "max-w": [
          themeContainer,
          "screen",
          "none",
          /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          "prose",
          /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          {
            screen: [themeBreakpoint]
          },
          ...scaleSizing()
        ]
      }],
      /**
       * Height
       * @see https://tailwindcss.com/docs/height
       */
      h: [{
        h: ["screen", "lh", ...scaleSizing()]
      }],
      /**
       * Min-Height
       * @see https://tailwindcss.com/docs/min-height
       */
      "min-h": [{
        "min-h": ["screen", "lh", "none", ...scaleSizing()]
      }],
      /**
       * Max-Height
       * @see https://tailwindcss.com/docs/max-height
       */
      "max-h": [{
        "max-h": ["screen", "lh", "none", ...scaleSizing()]
      }],
      // ------------------
      // --- Typography ---
      // ------------------
      /**
       * Font Size
       * @see https://tailwindcss.com/docs/font-size
       */
      "font-size": [{
        text: ["base", themeText, isArbitraryVariableLength, isArbitraryLength]
      }],
      /**
       * Font Smoothing
       * @see https://tailwindcss.com/docs/font-smoothing
       */
      "font-smoothing": ["antialiased", "subpixel-antialiased"],
      /**
       * Font Style
       * @see https://tailwindcss.com/docs/font-style
       */
      "font-style": ["italic", "not-italic"],
      /**
       * Font Weight
       * @see https://tailwindcss.com/docs/font-weight
       */
      "font-weight": [{
        font: [themeFontWeight, isArbitraryVariableWeight, isArbitraryWeight]
      }],
      /**
       * Font Stretch
       * @see https://tailwindcss.com/docs/font-stretch
       */
      "font-stretch": [{
        "font-stretch": ["ultra-condensed", "extra-condensed", "condensed", "semi-condensed", "normal", "semi-expanded", "expanded", "extra-expanded", "ultra-expanded", isPercent, isArbitraryValue]
      }],
      /**
       * Font Family
       * @see https://tailwindcss.com/docs/font-family
       */
      "font-family": [{
        font: [isArbitraryVariableFamilyName, isArbitraryFamilyName, themeFont]
      }],
      /**
       * Font Feature Settings
       * @see https://tailwindcss.com/docs/font-feature-settings
       */
      "font-features": [{
        "font-features": [isArbitraryValue]
      }],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-normal": ["normal-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-ordinal": ["ordinal"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-slashed-zero": ["slashed-zero"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-figure": ["lining-nums", "oldstyle-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-spacing": ["proportional-nums", "tabular-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-fraction": ["diagonal-fractions", "stacked-fractions"],
      /**
       * Letter Spacing
       * @see https://tailwindcss.com/docs/letter-spacing
       */
      tracking: [{
        tracking: [themeTracking, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Line Clamp
       * @see https://tailwindcss.com/docs/line-clamp
       */
      "line-clamp": [{
        "line-clamp": [isNumber, "none", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Line Height
       * @see https://tailwindcss.com/docs/line-height
       */
      leading: [{
        leading: [
          "none",
          /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          themeLeading,
          ...scaleUnambiguousSpacing()
        ]
      }],
      /**
       * List Style Image
       * @see https://tailwindcss.com/docs/list-style-image
       */
      "list-image": [{
        "list-image": ["none", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * List Style Position
       * @see https://tailwindcss.com/docs/list-style-position
       */
      "list-style-position": [{
        list: ["inside", "outside"]
      }],
      /**
       * List Style Type
       * @see https://tailwindcss.com/docs/list-style-type
       */
      "list-style-type": [{
        list: ["disc", "decimal", "none", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Text Alignment
       * @see https://tailwindcss.com/docs/text-align
       */
      "text-alignment": [{
        text: ["left", "center", "right", "justify", "start", "end"]
      }],
      /**
       * Placeholder Color
       * @deprecated since Tailwind CSS v3.0.0
       * @see https://v3.tailwindcss.com/docs/placeholder-color
       */
      "placeholder-color": [{
        placeholder: scaleColor()
      }],
      /**
       * Text Color
       * @see https://tailwindcss.com/docs/text-color
       */
      "text-color": [{
        text: scaleColor()
      }],
      /**
       * Text Decoration
       * @see https://tailwindcss.com/docs/text-decoration
       */
      "text-decoration": ["underline", "overline", "line-through", "no-underline"],
      /**
       * Text Decoration Style
       * @see https://tailwindcss.com/docs/text-decoration-style
       */
      "text-decoration-style": [{
        decoration: [...scaleLineStyle(), "wavy"]
      }],
      /**
       * Text Decoration Thickness
       * @see https://tailwindcss.com/docs/text-decoration-thickness
       */
      "text-decoration-thickness": [{
        decoration: [isNumber, "from-font", "auto", isArbitraryVariableLength, isArbitraryVariablePosition, isArbitraryLength]
      }],
      /**
       * Text Decoration Color
       * @see https://tailwindcss.com/docs/text-decoration-color
       */
      "text-decoration-color": [{
        decoration: scaleColor()
      }],
      /**
       * Text Underline Offset
       * @see https://tailwindcss.com/docs/text-underline-offset
       */
      "underline-offset": [{
        "underline-offset": [isNumber, "auto", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Text Transform
       * @see https://tailwindcss.com/docs/text-transform
       */
      "text-transform": ["uppercase", "lowercase", "capitalize", "normal-case"],
      /**
       * Text Overflow
       * @see https://tailwindcss.com/docs/text-overflow
       */
      "text-overflow": ["truncate", "text-ellipsis", "text-clip"],
      /**
       * Text Wrap
       * @see https://tailwindcss.com/docs/text-wrap
       */
      "text-wrap": [{
        text: ["wrap", "nowrap", "balance", "pretty"]
      }],
      /**
       * Text Indent
       * @see https://tailwindcss.com/docs/text-indent
       */
      indent: [{
        indent: scaleUnambiguousSpacing()
      }],
      /**
       * Tab Size
       * @see https://tailwindcss.com/docs/tab-size
       */
      "tab-size": [{
        tab: [isInteger, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Vertical Alignment
       * @see https://tailwindcss.com/docs/vertical-align
       */
      "vertical-align": [{
        align: ["baseline", "top", "middle", "bottom", "text-top", "text-bottom", "sub", "super", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Whitespace
       * @see https://tailwindcss.com/docs/whitespace
       */
      whitespace: [{
        whitespace: ["normal", "nowrap", "pre", "pre-line", "pre-wrap", "break-spaces"]
      }],
      /**
       * Word Break
       * @see https://tailwindcss.com/docs/word-break
       */
      break: [{
        break: ["normal", "words", "all", "keep"]
      }],
      /**
       * Overflow Wrap
       * @see https://tailwindcss.com/docs/overflow-wrap
       */
      wrap: [{
        wrap: ["break-word", "anywhere", "normal"]
      }],
      /**
       * Hyphens
       * @see https://tailwindcss.com/docs/hyphens
       */
      hyphens: [{
        hyphens: ["none", "manual", "auto"]
      }],
      /**
       * Content
       * @see https://tailwindcss.com/docs/content
       */
      content: [{
        content: ["none", isArbitraryVariable, isArbitraryValue]
      }],
      // -------------------
      // --- Backgrounds ---
      // -------------------
      /**
       * Background Attachment
       * @see https://tailwindcss.com/docs/background-attachment
       */
      "bg-attachment": [{
        bg: ["fixed", "local", "scroll"]
      }],
      /**
       * Background Clip
       * @see https://tailwindcss.com/docs/background-clip
       */
      "bg-clip": [{
        "bg-clip": ["border", "padding", "content", "text"]
      }],
      /**
       * Background Origin
       * @see https://tailwindcss.com/docs/background-origin
       */
      "bg-origin": [{
        "bg-origin": ["border", "padding", "content"]
      }],
      /**
       * Background Position
       * @see https://tailwindcss.com/docs/background-position
       */
      "bg-position": [{
        bg: scaleBgPosition()
      }],
      /**
       * Background Repeat
       * @see https://tailwindcss.com/docs/background-repeat
       */
      "bg-repeat": [{
        bg: scaleBgRepeat()
      }],
      /**
       * Background Size
       * @see https://tailwindcss.com/docs/background-size
       */
      "bg-size": [{
        bg: scaleBgSize()
      }],
      /**
       * Background Image
       * @see https://tailwindcss.com/docs/background-image
       */
      "bg-image": [{
        bg: ["none", {
          linear: [{
            to: ["t", "tr", "r", "br", "b", "bl", "l", "tl"]
          }, isInteger, isArbitraryVariable, isArbitraryValue],
          radial: ["", isArbitraryVariable, isArbitraryValue],
          conic: ["", isInteger, isArbitraryVariable, isArbitraryValue]
        }, isArbitraryVariableImage, isArbitraryImage]
      }],
      /**
       * Background Color
       * @see https://tailwindcss.com/docs/background-color
       */
      "bg-color": [{
        bg: scaleColor()
      }],
      /**
       * Gradient Color Stops From Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-from-pos": [{
        from: scaleGradientStopPosition()
      }],
      /**
       * Gradient Color Stops Via Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-via-pos": [{
        via: scaleGradientStopPosition()
      }],
      /**
       * Gradient Color Stops To Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-to-pos": [{
        to: scaleGradientStopPosition()
      }],
      /**
       * Gradient Color Stops From
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-from": [{
        from: scaleColor()
      }],
      /**
       * Gradient Color Stops Via
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-via": [{
        via: scaleColor()
      }],
      /**
       * Gradient Color Stops To
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-to": [{
        to: scaleColor()
      }],
      // ---------------
      // --- Borders ---
      // ---------------
      /**
       * Border Radius
       * @see https://tailwindcss.com/docs/border-radius
       */
      rounded: [{
        rounded: scaleRadius()
      }],
      /**
       * Border Radius Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-s": [{
        "rounded-s": scaleRadius()
      }],
      /**
       * Border Radius End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-e": [{
        "rounded-e": scaleRadius()
      }],
      /**
       * Border Radius Top
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-t": [{
        "rounded-t": scaleRadius()
      }],
      /**
       * Border Radius Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-r": [{
        "rounded-r": scaleRadius()
      }],
      /**
       * Border Radius Bottom
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-b": [{
        "rounded-b": scaleRadius()
      }],
      /**
       * Border Radius Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-l": [{
        "rounded-l": scaleRadius()
      }],
      /**
       * Border Radius Start Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-ss": [{
        "rounded-ss": scaleRadius()
      }],
      /**
       * Border Radius Start End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-se": [{
        "rounded-se": scaleRadius()
      }],
      /**
       * Border Radius End End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-ee": [{
        "rounded-ee": scaleRadius()
      }],
      /**
       * Border Radius End Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-es": [{
        "rounded-es": scaleRadius()
      }],
      /**
       * Border Radius Top Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-tl": [{
        "rounded-tl": scaleRadius()
      }],
      /**
       * Border Radius Top Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-tr": [{
        "rounded-tr": scaleRadius()
      }],
      /**
       * Border Radius Bottom Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-br": [{
        "rounded-br": scaleRadius()
      }],
      /**
       * Border Radius Bottom Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-bl": [{
        "rounded-bl": scaleRadius()
      }],
      /**
       * Border Width
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w": [{
        border: scaleBorderWidth()
      }],
      /**
       * Border Width Inline
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-x": [{
        "border-x": scaleBorderWidth()
      }],
      /**
       * Border Width Block
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-y": [{
        "border-y": scaleBorderWidth()
      }],
      /**
       * Border Width Inline Start
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-s": [{
        "border-s": scaleBorderWidth()
      }],
      /**
       * Border Width Inline End
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-e": [{
        "border-e": scaleBorderWidth()
      }],
      /**
       * Border Width Block Start
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-bs": [{
        "border-bs": scaleBorderWidth()
      }],
      /**
       * Border Width Block End
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-be": [{
        "border-be": scaleBorderWidth()
      }],
      /**
       * Border Width Top
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-t": [{
        "border-t": scaleBorderWidth()
      }],
      /**
       * Border Width Right
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-r": [{
        "border-r": scaleBorderWidth()
      }],
      /**
       * Border Width Bottom
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-b": [{
        "border-b": scaleBorderWidth()
      }],
      /**
       * Border Width Left
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-l": [{
        "border-l": scaleBorderWidth()
      }],
      /**
       * Divide Width X
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-x": [{
        "divide-x": scaleBorderWidth()
      }],
      /**
       * Divide Width X Reverse
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-x-reverse": ["divide-x-reverse"],
      /**
       * Divide Width Y
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-y": [{
        "divide-y": scaleBorderWidth()
      }],
      /**
       * Divide Width Y Reverse
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-y-reverse": ["divide-y-reverse"],
      /**
       * Border Style
       * @see https://tailwindcss.com/docs/border-style
       */
      "border-style": [{
        border: [...scaleLineStyle(), "hidden", "none"]
      }],
      /**
       * Divide Style
       * @see https://tailwindcss.com/docs/border-style#setting-the-divider-style
       */
      "divide-style": [{
        divide: [...scaleLineStyle(), "hidden", "none"]
      }],
      /**
       * Border Color
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color": [{
        border: scaleColor()
      }],
      /**
       * Border Color Inline
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-x": [{
        "border-x": scaleColor()
      }],
      /**
       * Border Color Block
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-y": [{
        "border-y": scaleColor()
      }],
      /**
       * Border Color Inline Start
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-s": [{
        "border-s": scaleColor()
      }],
      /**
       * Border Color Inline End
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-e": [{
        "border-e": scaleColor()
      }],
      /**
       * Border Color Block Start
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-bs": [{
        "border-bs": scaleColor()
      }],
      /**
       * Border Color Block End
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-be": [{
        "border-be": scaleColor()
      }],
      /**
       * Border Color Top
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-t": [{
        "border-t": scaleColor()
      }],
      /**
       * Border Color Right
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-r": [{
        "border-r": scaleColor()
      }],
      /**
       * Border Color Bottom
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-b": [{
        "border-b": scaleColor()
      }],
      /**
       * Border Color Left
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-l": [{
        "border-l": scaleColor()
      }],
      /**
       * Divide Color
       * @see https://tailwindcss.com/docs/divide-color
       */
      "divide-color": [{
        divide: scaleColor()
      }],
      /**
       * Outline Style
       * @see https://tailwindcss.com/docs/outline-style
       */
      "outline-style": [{
        outline: [...scaleLineStyle(), "none", "hidden"]
      }],
      /**
       * Outline Offset
       * @see https://tailwindcss.com/docs/outline-offset
       */
      "outline-offset": [{
        "outline-offset": [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Outline Width
       * @see https://tailwindcss.com/docs/outline-width
       */
      "outline-w": [{
        outline: ["", isNumber, isArbitraryVariableLength, isArbitraryLength]
      }],
      /**
       * Outline Color
       * @see https://tailwindcss.com/docs/outline-color
       */
      "outline-color": [{
        outline: scaleColor()
      }],
      // ---------------
      // --- Effects ---
      // ---------------
      /**
       * Box Shadow
       * @see https://tailwindcss.com/docs/box-shadow
       */
      shadow: [{
        shadow: [
          // Deprecated since Tailwind CSS v4.0.0
          "",
          // Deprecated since Tailwind CSS v4.0.0
          "inner",
          "none",
          themeShadow,
          isArbitraryVariableShadow,
          isArbitraryShadow
        ]
      }],
      /**
       * Box Shadow Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-shadow-color
       */
      "shadow-color": [{
        shadow: scaleColor()
      }],
      /**
       * Inset Box Shadow
       * @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-shadow
       */
      "inset-shadow": [{
        "inset-shadow": ["none", themeInsetShadow, isArbitraryVariableShadow, isArbitraryShadow]
      }],
      /**
       * Inset Box Shadow Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-shadow-color
       */
      "inset-shadow-color": [{
        "inset-shadow": scaleColor()
      }],
      /**
       * Ring Width
       * @see https://tailwindcss.com/docs/box-shadow#adding-a-ring
       */
      "ring-w": [{
        ring: scaleBorderWidth()
      }],
      /**
       * Ring Width Inset
       * @see https://v3.tailwindcss.com/docs/ring-width#inset-rings
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-w-inset": ["ring-inset"],
      /**
       * Ring Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-ring-color
       */
      "ring-color": [{
        ring: scaleColor()
      }],
      /**
       * Ring Offset Width
       * @see https://v3.tailwindcss.com/docs/ring-offset-width
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-offset-w": [{
        "ring-offset": [isNumber, isArbitraryLength]
      }],
      /**
       * Ring Offset Color
       * @see https://v3.tailwindcss.com/docs/ring-offset-color
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-offset-color": [{
        "ring-offset": scaleColor()
      }],
      /**
       * Inset Ring Width
       * @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-ring
       */
      "inset-ring-w": [{
        "inset-ring": scaleBorderWidth()
      }],
      /**
       * Inset Ring Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-ring-color
       */
      "inset-ring-color": [{
        "inset-ring": scaleColor()
      }],
      /**
       * Text Shadow
       * @see https://tailwindcss.com/docs/text-shadow
       */
      "text-shadow": [{
        "text-shadow": ["none", themeTextShadow, isArbitraryVariableShadow, isArbitraryShadow]
      }],
      /**
       * Text Shadow Color
       * @see https://tailwindcss.com/docs/text-shadow#setting-the-shadow-color
       */
      "text-shadow-color": [{
        "text-shadow": scaleColor()
      }],
      /**
       * Opacity
       * @see https://tailwindcss.com/docs/opacity
       */
      opacity: [{
        opacity: [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Mix Blend Mode
       * @see https://tailwindcss.com/docs/mix-blend-mode
       */
      "mix-blend": [{
        "mix-blend": [...scaleBlendMode(), "plus-darker", "plus-lighter"]
      }],
      /**
       * Background Blend Mode
       * @see https://tailwindcss.com/docs/background-blend-mode
       */
      "bg-blend": [{
        "bg-blend": scaleBlendMode()
      }],
      /**
       * Mask Clip
       * @see https://tailwindcss.com/docs/mask-clip
       */
      "mask-clip": [{
        "mask-clip": ["border", "padding", "content", "fill", "stroke", "view"]
      }, "mask-no-clip"],
      /**
       * Mask Composite
       * @see https://tailwindcss.com/docs/mask-composite
       */
      "mask-composite": [{
        mask: ["add", "subtract", "intersect", "exclude"]
      }],
      /**
       * Mask Image
       * @see https://tailwindcss.com/docs/mask-image
       */
      "mask-image-linear-pos": [{
        "mask-linear": [isNumber]
      }],
      "mask-image-linear-from-pos": [{
        "mask-linear-from": scaleMaskImagePosition()
      }],
      "mask-image-linear-to-pos": [{
        "mask-linear-to": scaleMaskImagePosition()
      }],
      "mask-image-linear-from-color": [{
        "mask-linear-from": scaleColor()
      }],
      "mask-image-linear-to-color": [{
        "mask-linear-to": scaleColor()
      }],
      "mask-image-t-from-pos": [{
        "mask-t-from": scaleMaskImagePosition()
      }],
      "mask-image-t-to-pos": [{
        "mask-t-to": scaleMaskImagePosition()
      }],
      "mask-image-t-from-color": [{
        "mask-t-from": scaleColor()
      }],
      "mask-image-t-to-color": [{
        "mask-t-to": scaleColor()
      }],
      "mask-image-r-from-pos": [{
        "mask-r-from": scaleMaskImagePosition()
      }],
      "mask-image-r-to-pos": [{
        "mask-r-to": scaleMaskImagePosition()
      }],
      "mask-image-r-from-color": [{
        "mask-r-from": scaleColor()
      }],
      "mask-image-r-to-color": [{
        "mask-r-to": scaleColor()
      }],
      "mask-image-b-from-pos": [{
        "mask-b-from": scaleMaskImagePosition()
      }],
      "mask-image-b-to-pos": [{
        "mask-b-to": scaleMaskImagePosition()
      }],
      "mask-image-b-from-color": [{
        "mask-b-from": scaleColor()
      }],
      "mask-image-b-to-color": [{
        "mask-b-to": scaleColor()
      }],
      "mask-image-l-from-pos": [{
        "mask-l-from": scaleMaskImagePosition()
      }],
      "mask-image-l-to-pos": [{
        "mask-l-to": scaleMaskImagePosition()
      }],
      "mask-image-l-from-color": [{
        "mask-l-from": scaleColor()
      }],
      "mask-image-l-to-color": [{
        "mask-l-to": scaleColor()
      }],
      "mask-image-x-from-pos": [{
        "mask-x-from": scaleMaskImagePosition()
      }],
      "mask-image-x-to-pos": [{
        "mask-x-to": scaleMaskImagePosition()
      }],
      "mask-image-x-from-color": [{
        "mask-x-from": scaleColor()
      }],
      "mask-image-x-to-color": [{
        "mask-x-to": scaleColor()
      }],
      "mask-image-y-from-pos": [{
        "mask-y-from": scaleMaskImagePosition()
      }],
      "mask-image-y-to-pos": [{
        "mask-y-to": scaleMaskImagePosition()
      }],
      "mask-image-y-from-color": [{
        "mask-y-from": scaleColor()
      }],
      "mask-image-y-to-color": [{
        "mask-y-to": scaleColor()
      }],
      "mask-image-radial": [{
        "mask-radial": [isArbitraryVariable, isArbitraryValue]
      }],
      "mask-image-radial-from-pos": [{
        "mask-radial-from": scaleMaskImagePosition()
      }],
      "mask-image-radial-to-pos": [{
        "mask-radial-to": scaleMaskImagePosition()
      }],
      "mask-image-radial-from-color": [{
        "mask-radial-from": scaleColor()
      }],
      "mask-image-radial-to-color": [{
        "mask-radial-to": scaleColor()
      }],
      "mask-image-radial-shape": [{
        mask: ["circle", "ellipse"]
      }],
      "mask-image-radial-size": [{
        "mask-radial": [{
          closest: ["side", "corner"],
          farthest: ["side", "corner"]
        }]
      }],
      "mask-image-radial-pos": [{
        "mask-radial-at": scalePosition()
      }],
      "mask-image-conic-pos": [{
        "mask-conic": [isNumber]
      }],
      "mask-image-conic-from-pos": [{
        "mask-conic-from": scaleMaskImagePosition()
      }],
      "mask-image-conic-to-pos": [{
        "mask-conic-to": scaleMaskImagePosition()
      }],
      "mask-image-conic-from-color": [{
        "mask-conic-from": scaleColor()
      }],
      "mask-image-conic-to-color": [{
        "mask-conic-to": scaleColor()
      }],
      /**
       * Mask Mode
       * @see https://tailwindcss.com/docs/mask-mode
       */
      "mask-mode": [{
        mask: ["alpha", "luminance", "match"]
      }],
      /**
       * Mask Origin
       * @see https://tailwindcss.com/docs/mask-origin
       */
      "mask-origin": [{
        "mask-origin": ["border", "padding", "content", "fill", "stroke", "view"]
      }],
      /**
       * Mask Position
       * @see https://tailwindcss.com/docs/mask-position
       */
      "mask-position": [{
        mask: scaleBgPosition()
      }],
      /**
       * Mask Repeat
       * @see https://tailwindcss.com/docs/mask-repeat
       */
      "mask-repeat": [{
        mask: scaleBgRepeat()
      }],
      /**
       * Mask Size
       * @see https://tailwindcss.com/docs/mask-size
       */
      "mask-size": [{
        mask: scaleBgSize()
      }],
      /**
       * Mask Type
       * @see https://tailwindcss.com/docs/mask-type
       */
      "mask-type": [{
        "mask-type": ["alpha", "luminance"]
      }],
      /**
       * Mask Image
       * @see https://tailwindcss.com/docs/mask-image
       */
      "mask-image": [{
        mask: ["none", isArbitraryVariable, isArbitraryValue]
      }],
      // ---------------
      // --- Filters ---
      // ---------------
      /**
       * Filter
       * @see https://tailwindcss.com/docs/filter
       */
      filter: [{
        filter: [
          // Deprecated since Tailwind CSS v3.0.0
          "",
          "none",
          isArbitraryVariable,
          isArbitraryValue
        ]
      }],
      /**
       * Blur
       * @see https://tailwindcss.com/docs/blur
       */
      blur: [{
        blur: scaleBlur()
      }],
      /**
       * Brightness
       * @see https://tailwindcss.com/docs/brightness
       */
      brightness: [{
        brightness: [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Contrast
       * @see https://tailwindcss.com/docs/contrast
       */
      contrast: [{
        contrast: [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Drop Shadow
       * @see https://tailwindcss.com/docs/drop-shadow
       */
      "drop-shadow": [{
        "drop-shadow": [
          // Deprecated since Tailwind CSS v4.0.0
          "",
          "none",
          themeDropShadow,
          isArbitraryVariableShadow,
          isArbitraryShadow
        ]
      }],
      /**
       * Drop Shadow Color
       * @see https://tailwindcss.com/docs/filter-drop-shadow#setting-the-shadow-color
       */
      "drop-shadow-color": [{
        "drop-shadow": scaleColor()
      }],
      /**
       * Grayscale
       * @see https://tailwindcss.com/docs/grayscale
       */
      grayscale: [{
        grayscale: ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Hue Rotate
       * @see https://tailwindcss.com/docs/hue-rotate
       */
      "hue-rotate": [{
        "hue-rotate": [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Invert
       * @see https://tailwindcss.com/docs/invert
       */
      invert: [{
        invert: ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Saturate
       * @see https://tailwindcss.com/docs/saturate
       */
      saturate: [{
        saturate: [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Sepia
       * @see https://tailwindcss.com/docs/sepia
       */
      sepia: [{
        sepia: ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Filter
       * @see https://tailwindcss.com/docs/backdrop-filter
       */
      "backdrop-filter": [{
        "backdrop-filter": [
          // Deprecated since Tailwind CSS v3.0.0
          "",
          "none",
          isArbitraryVariable,
          isArbitraryValue
        ]
      }],
      /**
       * Backdrop Blur
       * @see https://tailwindcss.com/docs/backdrop-blur
       */
      "backdrop-blur": [{
        "backdrop-blur": scaleBlur()
      }],
      /**
       * Backdrop Brightness
       * @see https://tailwindcss.com/docs/backdrop-brightness
       */
      "backdrop-brightness": [{
        "backdrop-brightness": [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Contrast
       * @see https://tailwindcss.com/docs/backdrop-contrast
       */
      "backdrop-contrast": [{
        "backdrop-contrast": [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Grayscale
       * @see https://tailwindcss.com/docs/backdrop-grayscale
       */
      "backdrop-grayscale": [{
        "backdrop-grayscale": ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Hue Rotate
       * @see https://tailwindcss.com/docs/backdrop-hue-rotate
       */
      "backdrop-hue-rotate": [{
        "backdrop-hue-rotate": [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Invert
       * @see https://tailwindcss.com/docs/backdrop-invert
       */
      "backdrop-invert": [{
        "backdrop-invert": ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Opacity
       * @see https://tailwindcss.com/docs/backdrop-opacity
       */
      "backdrop-opacity": [{
        "backdrop-opacity": [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Saturate
       * @see https://tailwindcss.com/docs/backdrop-saturate
       */
      "backdrop-saturate": [{
        "backdrop-saturate": [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Sepia
       * @see https://tailwindcss.com/docs/backdrop-sepia
       */
      "backdrop-sepia": [{
        "backdrop-sepia": ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      // --------------
      // --- Tables ---
      // --------------
      /**
       * Border Collapse
       * @see https://tailwindcss.com/docs/border-collapse
       */
      "border-collapse": [{
        border: ["collapse", "separate"]
      }],
      /**
       * Border Spacing
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing": [{
        "border-spacing": scaleUnambiguousSpacing()
      }],
      /**
       * Border Spacing X
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing-x": [{
        "border-spacing-x": scaleUnambiguousSpacing()
      }],
      /**
       * Border Spacing Y
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing-y": [{
        "border-spacing-y": scaleUnambiguousSpacing()
      }],
      /**
       * Table Layout
       * @see https://tailwindcss.com/docs/table-layout
       */
      "table-layout": [{
        table: ["auto", "fixed"]
      }],
      /**
       * Caption Side
       * @see https://tailwindcss.com/docs/caption-side
       */
      caption: [{
        caption: ["top", "bottom"]
      }],
      // ---------------------------------
      // --- Transitions and Animation ---
      // ---------------------------------
      /**
       * Transition Property
       * @see https://tailwindcss.com/docs/transition-property
       */
      transition: [{
        transition: ["", "all", "colors", "opacity", "shadow", "transform", "none", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Transition Behavior
       * @see https://tailwindcss.com/docs/transition-behavior
       */
      "transition-behavior": [{
        transition: ["normal", "discrete"]
      }],
      /**
       * Transition Duration
       * @see https://tailwindcss.com/docs/transition-duration
       */
      duration: [{
        duration: [isNumber, "initial", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Transition Timing Function
       * @see https://tailwindcss.com/docs/transition-timing-function
       */
      ease: [{
        ease: ["linear", "initial", themeEase, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Transition Delay
       * @see https://tailwindcss.com/docs/transition-delay
       */
      delay: [{
        delay: [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Animation
       * @see https://tailwindcss.com/docs/animation
       */
      animate: [{
        animate: ["none", themeAnimate, isArbitraryVariable, isArbitraryValue]
      }],
      // ------------------
      // --- Transforms ---
      // ------------------
      /**
       * Backface Visibility
       * @see https://tailwindcss.com/docs/backface-visibility
       */
      backface: [{
        backface: ["hidden", "visible"]
      }],
      /**
       * Perspective
       * @see https://tailwindcss.com/docs/perspective
       */
      perspective: [{
        perspective: [themePerspective, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Perspective Origin
       * @see https://tailwindcss.com/docs/perspective-origin
       */
      "perspective-origin": [{
        "perspective-origin": scalePositionWithArbitrary()
      }],
      /**
       * Rotate
       * @see https://tailwindcss.com/docs/rotate
       */
      rotate: [{
        rotate: scaleRotate()
      }],
      /**
       * Rotate X
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-x": [{
        "rotate-x": scaleRotate()
      }],
      /**
       * Rotate Y
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-y": [{
        "rotate-y": scaleRotate()
      }],
      /**
       * Rotate Z
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-z": [{
        "rotate-z": scaleRotate()
      }],
      /**
       * Scale
       * @see https://tailwindcss.com/docs/scale
       */
      scale: [{
        scale: scaleScale()
      }],
      /**
       * Scale X
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-x": [{
        "scale-x": scaleScale()
      }],
      /**
       * Scale Y
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-y": [{
        "scale-y": scaleScale()
      }],
      /**
       * Scale Z
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-z": [{
        "scale-z": scaleScale()
      }],
      /**
       * Scale 3D
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-3d": ["scale-3d"],
      /**
       * Skew
       * @see https://tailwindcss.com/docs/skew
       */
      skew: [{
        skew: scaleSkew()
      }],
      /**
       * Skew X
       * @see https://tailwindcss.com/docs/skew
       */
      "skew-x": [{
        "skew-x": scaleSkew()
      }],
      /**
       * Skew Y
       * @see https://tailwindcss.com/docs/skew
       */
      "skew-y": [{
        "skew-y": scaleSkew()
      }],
      /**
       * Transform
       * @see https://tailwindcss.com/docs/transform
       */
      transform: [{
        transform: [isArbitraryVariable, isArbitraryValue, "", "none", "gpu", "cpu"]
      }],
      /**
       * Transform Origin
       * @see https://tailwindcss.com/docs/transform-origin
       */
      "transform-origin": [{
        origin: scalePositionWithArbitrary()
      }],
      /**
       * Transform Style
       * @see https://tailwindcss.com/docs/transform-style
       */
      "transform-style": [{
        transform: ["3d", "flat"]
      }],
      /**
       * Translate
       * @see https://tailwindcss.com/docs/translate
       */
      translate: [{
        translate: scaleTranslate()
      }],
      /**
       * Translate X
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-x": [{
        "translate-x": scaleTranslate()
      }],
      /**
       * Translate Y
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-y": [{
        "translate-y": scaleTranslate()
      }],
      /**
       * Translate Z
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-z": [{
        "translate-z": scaleTranslate()
      }],
      /**
       * Translate None
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-none": ["translate-none"],
      /**
       * Zoom
       * @see https://tailwindcss.com/docs/zoom
       */
      zoom: [{
        zoom: [isInteger, isArbitraryVariable, isArbitraryValue]
      }],
      // ---------------------
      // --- Interactivity ---
      // ---------------------
      /**
       * Accent Color
       * @see https://tailwindcss.com/docs/accent-color
       */
      accent: [{
        accent: scaleColor()
      }],
      /**
       * Appearance
       * @see https://tailwindcss.com/docs/appearance
       */
      appearance: [{
        appearance: ["none", "auto"]
      }],
      /**
       * Caret Color
       * @see https://tailwindcss.com/docs/just-in-time-mode#caret-color-utilities
       */
      "caret-color": [{
        caret: scaleColor()
      }],
      /**
       * Color Scheme
       * @see https://tailwindcss.com/docs/color-scheme
       */
      "color-scheme": [{
        scheme: ["normal", "dark", "light", "light-dark", "only-dark", "only-light"]
      }],
      /**
       * Cursor
       * @see https://tailwindcss.com/docs/cursor
       */
      cursor: [{
        cursor: ["auto", "default", "pointer", "wait", "text", "move", "help", "not-allowed", "none", "context-menu", "progress", "cell", "crosshair", "vertical-text", "alias", "copy", "no-drop", "grab", "grabbing", "all-scroll", "col-resize", "row-resize", "n-resize", "e-resize", "s-resize", "w-resize", "ne-resize", "nw-resize", "se-resize", "sw-resize", "ew-resize", "ns-resize", "nesw-resize", "nwse-resize", "zoom-in", "zoom-out", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Field Sizing
       * @see https://tailwindcss.com/docs/field-sizing
       */
      "field-sizing": [{
        "field-sizing": ["fixed", "content"]
      }],
      /**
       * Pointer Events
       * @see https://tailwindcss.com/docs/pointer-events
       */
      "pointer-events": [{
        "pointer-events": ["auto", "none"]
      }],
      /**
       * Resize
       * @see https://tailwindcss.com/docs/resize
       */
      resize: [{
        resize: ["none", "", "y", "x"]
      }],
      /**
       * Scroll Behavior
       * @see https://tailwindcss.com/docs/scroll-behavior
       */
      "scroll-behavior": [{
        scroll: ["auto", "smooth"]
      }],
      /**
       * Scrollbar Thumb Color
       * @see https://tailwindcss.com/docs/scrollbar-color
       */
      "scrollbar-thumb-color": [{
        "scrollbar-thumb": scaleColor()
      }],
      /**
       * Scrollbar Track Color
       * @see https://tailwindcss.com/docs/scrollbar-color
       */
      "scrollbar-track-color": [{
        "scrollbar-track": scaleColor()
      }],
      /**
       * Scrollbar Gutter
       * @see https://tailwindcss.com/docs/scrollbar-gutter
       */
      "scrollbar-gutter": [{
        "scrollbar-gutter": ["auto", "stable", "both"]
      }],
      /**
       * Scrollbar Width
       * @see https://tailwindcss.com/docs/scrollbar-width
       */
      "scrollbar-w": [{
        scrollbar: ["auto", "thin", "none"]
      }],
      /**
       * Scroll Margin
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-m": [{
        "scroll-m": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Inline
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mx": [{
        "scroll-mx": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Block
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-my": [{
        "scroll-my": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Inline Start
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-ms": [{
        "scroll-ms": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Inline End
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-me": [{
        "scroll-me": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Block Start
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mbs": [{
        "scroll-mbs": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Block End
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mbe": [{
        "scroll-mbe": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Top
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mt": [{
        "scroll-mt": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Right
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mr": [{
        "scroll-mr": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Bottom
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mb": [{
        "scroll-mb": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Left
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-ml": [{
        "scroll-ml": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-p": [{
        "scroll-p": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Inline
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-px": [{
        "scroll-px": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Block
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-py": [{
        "scroll-py": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Inline Start
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-ps": [{
        "scroll-ps": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Inline End
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pe": [{
        "scroll-pe": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Block Start
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pbs": [{
        "scroll-pbs": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Block End
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pbe": [{
        "scroll-pbe": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Top
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pt": [{
        "scroll-pt": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Right
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pr": [{
        "scroll-pr": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Bottom
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pb": [{
        "scroll-pb": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Left
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pl": [{
        "scroll-pl": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Snap Align
       * @see https://tailwindcss.com/docs/scroll-snap-align
       */
      "snap-align": [{
        snap: ["start", "end", "center", "align-none"]
      }],
      /**
       * Scroll Snap Stop
       * @see https://tailwindcss.com/docs/scroll-snap-stop
       */
      "snap-stop": [{
        snap: ["normal", "always"]
      }],
      /**
       * Scroll Snap Type
       * @see https://tailwindcss.com/docs/scroll-snap-type
       */
      "snap-type": [{
        snap: ["none", "x", "y", "both"]
      }],
      /**
       * Scroll Snap Type Strictness
       * @see https://tailwindcss.com/docs/scroll-snap-type
       */
      "snap-strictness": [{
        snap: ["mandatory", "proximity"]
      }],
      /**
       * Touch Action
       * @see https://tailwindcss.com/docs/touch-action
       */
      touch: [{
        touch: ["auto", "none", "manipulation"]
      }],
      /**
       * Touch Action X
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-x": [{
        "touch-pan": ["x", "left", "right"]
      }],
      /**
       * Touch Action Y
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-y": [{
        "touch-pan": ["y", "up", "down"]
      }],
      /**
       * Touch Action Pinch Zoom
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-pz": ["touch-pinch-zoom"],
      /**
       * User Select
       * @see https://tailwindcss.com/docs/user-select
       */
      select: [{
        select: ["none", "text", "all", "auto"]
      }],
      /**
       * Will Change
       * @see https://tailwindcss.com/docs/will-change
       */
      "will-change": [{
        "will-change": ["auto", "scroll", "contents", "transform", isArbitraryVariable, isArbitraryValue]
      }],
      // -----------
      // --- SVG ---
      // -----------
      /**
       * Fill
       * @see https://tailwindcss.com/docs/fill
       */
      fill: [{
        fill: ["none", ...scaleColor()]
      }],
      /**
       * Stroke Width
       * @see https://tailwindcss.com/docs/stroke-width
       */
      "stroke-w": [{
        stroke: [isNumber, isArbitraryVariableLength, isArbitraryLength, isArbitraryNumber]
      }],
      /**
       * Stroke
       * @see https://tailwindcss.com/docs/stroke
       */
      stroke: [{
        stroke: ["none", ...scaleColor()]
      }],
      // ---------------------
      // --- Accessibility ---
      // ---------------------
      /**
       * Forced Color Adjust
       * @see https://tailwindcss.com/docs/forced-color-adjust
       */
      "forced-color-adjust": [{
        "forced-color-adjust": ["auto", "none"]
      }]
    },
    conflictingClassGroups: {
      "container-named": ["container-type"],
      overflow: ["overflow-x", "overflow-y"],
      overscroll: ["overscroll-x", "overscroll-y"],
      inset: ["inset-x", "inset-y", "inset-bs", "inset-be", "start", "end", "top", "right", "bottom", "left"],
      "inset-x": ["start", "end", "right", "left"],
      "inset-y": ["inset-bs", "inset-be", "top", "bottom"],
      flex: ["basis", "grow", "shrink"],
      gap: ["gap-x", "gap-y"],
      "place-content": ["align-content", "justify-content"],
      "place-items": ["align-items", "justify-items"],
      "place-self": ["align-self", "justify-self"],
      p: ["px", "py", "ps", "pe", "pbs", "pbe", "pt", "pr", "pb", "pl"],
      px: ["ps", "pe", "pr", "pl"],
      py: ["pbs", "pbe", "pt", "pb"],
      m: ["mx", "my", "ms", "me", "mbs", "mbe", "mt", "mr", "mb", "ml"],
      mx: ["ms", "me", "mr", "ml"],
      my: ["mbs", "mbe", "mt", "mb"],
      size: ["w", "h"],
      "fvn-normal": ["fvn-ordinal", "fvn-slashed-zero", "fvn-figure", "fvn-spacing", "fvn-fraction"],
      "fvn-ordinal": ["fvn-normal"],
      "fvn-slashed-zero": ["fvn-normal"],
      "fvn-figure": ["fvn-normal"],
      "fvn-spacing": ["fvn-normal"],
      "fvn-fraction": ["fvn-normal"],
      "line-clamp": ["display", "overflow"],
      // Tailwind emits these utilities after `sr-only`, so keeping an earlier `relative` or `p-4` undoes the hide. Removing them is safe because `not-sr-only` resets the same properties when the element is revealed.
      // Border width and min/max sizes stay independent because `not-sr-only` doesn't reset them, so they still apply once the element is revealed. While hidden they don't undo the hide: the element is absolutely positioned and clipped away.
      // `not-sr-only` only conflicts with `sr-only`: Tailwind emits these utilities after it too, so an earlier `relative` or `p-4` is meant to apply once the element is visible.
      sr: ["not-sr", "position", "size", "w", "h", "p", "px", "py", "ps", "pe", "pbs", "pbe", "pt", "pr", "pb", "pl", "m", "mx", "my", "ms", "me", "mbs", "mbe", "mt", "mr", "mb", "ml", "overflow", "overflow-x", "overflow-y", "whitespace"],
      "not-sr": ["sr"],
      rounded: ["rounded-s", "rounded-e", "rounded-t", "rounded-r", "rounded-b", "rounded-l", "rounded-ss", "rounded-se", "rounded-ee", "rounded-es", "rounded-tl", "rounded-tr", "rounded-br", "rounded-bl"],
      "rounded-s": ["rounded-ss", "rounded-es"],
      "rounded-e": ["rounded-se", "rounded-ee"],
      "rounded-t": ["rounded-tl", "rounded-tr"],
      "rounded-r": ["rounded-tr", "rounded-br"],
      "rounded-b": ["rounded-br", "rounded-bl"],
      "rounded-l": ["rounded-tl", "rounded-bl"],
      "border-spacing": ["border-spacing-x", "border-spacing-y"],
      "border-w": ["border-w-x", "border-w-y", "border-w-s", "border-w-e", "border-w-bs", "border-w-be", "border-w-t", "border-w-r", "border-w-b", "border-w-l"],
      "border-w-x": ["border-w-s", "border-w-e", "border-w-r", "border-w-l"],
      "border-w-y": ["border-w-bs", "border-w-be", "border-w-t", "border-w-b"],
      "border-color": ["border-color-x", "border-color-y", "border-color-s", "border-color-e", "border-color-bs", "border-color-be", "border-color-t", "border-color-r", "border-color-b", "border-color-l"],
      "border-color-x": ["border-color-s", "border-color-e", "border-color-r", "border-color-l"],
      "border-color-y": ["border-color-bs", "border-color-be", "border-color-t", "border-color-b"],
      "mask-image-x-from-pos": ["mask-image-r-from-pos", "mask-image-l-from-pos"],
      "mask-image-x-to-pos": ["mask-image-r-to-pos", "mask-image-l-to-pos"],
      "mask-image-x-from-color": ["mask-image-r-from-color", "mask-image-l-from-color"],
      "mask-image-x-to-color": ["mask-image-r-to-color", "mask-image-l-to-color"],
      "mask-image-y-from-pos": ["mask-image-t-from-pos", "mask-image-b-from-pos"],
      "mask-image-y-to-pos": ["mask-image-t-to-pos", "mask-image-b-to-pos"],
      "mask-image-y-from-color": ["mask-image-t-from-color", "mask-image-b-from-color"],
      "mask-image-y-to-color": ["mask-image-t-to-color", "mask-image-b-to-color"],
      translate: ["translate-x", "translate-y", "translate-none"],
      "translate-none": ["translate", "translate-x", "translate-y", "translate-z"],
      "scroll-m": ["scroll-mx", "scroll-my", "scroll-ms", "scroll-me", "scroll-mbs", "scroll-mbe", "scroll-mt", "scroll-mr", "scroll-mb", "scroll-ml"],
      "scroll-mx": ["scroll-ms", "scroll-me", "scroll-mr", "scroll-ml"],
      "scroll-my": ["scroll-mbs", "scroll-mbe", "scroll-mt", "scroll-mb"],
      "scroll-p": ["scroll-px", "scroll-py", "scroll-ps", "scroll-pe", "scroll-pbs", "scroll-pbe", "scroll-pt", "scroll-pr", "scroll-pb", "scroll-pl"],
      "scroll-px": ["scroll-ps", "scroll-pe", "scroll-pr", "scroll-pl"],
      "scroll-py": ["scroll-pbs", "scroll-pbe", "scroll-pt", "scroll-pb"],
      touch: ["touch-x", "touch-y", "touch-pz"],
      "touch-x": ["touch"],
      "touch-y": ["touch"],
      "touch-pz": ["touch"]
    },
    conflictingClassGroupModifiers: {
      // Only a font size with a line-height modifier like `text-lg/7` sets `line-height` directly. Without a modifier, font sizes don't conflict with `leading-*`: arbitrary ones only set `font-size`, and the theme ones set `line-height: var(--tw-leading, …)`, so an earlier `leading-*` keeps applying in Tailwind's CSS.
      "font-size": ["leading"]
    },
    postfixLookupClassGroups: ["container-type"],
    orderSensitiveModifiers: ["*", "**", "after", "backdrop", "before", "details-content", "file", "first-letter", "first-line", "marker", "placeholder", "selection"]
  };
};
var twMerge = /* @__PURE__ */ createTailwindMerge(getDefaultConfig);

// src/client/ui/utils.ts
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// src/client/ui/badge.tsx
import { jsx } from "react/jsx-runtime";
var badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 overflow-hidden rounded-md border px-1.5 py-px text-[10.5px] font-medium whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-muted-foreground",
        warning: "border-warning/30 bg-warning/10 text-warning"
      }
    },
    defaultVariants: { variant: "secondary" }
  }
);
function Badge({ className, variant, ...props }) {
  return /* @__PURE__ */ jsx("span", { "data-slot": "badge", className: cn(badgeVariants({ variant }), className), ...props });
}

// node_modules/@radix-ui/react-visually-hidden/dist/index.mjs
import * as React4 from "react";

// node_modules/@radix-ui/react-primitive/dist/index.mjs
import * as React3 from "react";
import * as ReactDOM from "react-dom";

// node_modules/@radix-ui/react-slot/dist/index.mjs
var dist_exports = {};
__export(dist_exports, {
  Root: () => Slot,
  Slot: () => Slot,
  Slottable: () => Slottable,
  createSlot: () => createSlot,
  createSlottable: () => createSlottable
});
import * as React2 from "react";

// node_modules/@radix-ui/react-compose-refs/dist/index.mjs
import * as React from "react";
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
function setRef(ref, value) {
  if (typeof ref === "function") {
    return ref(value);
  } else if (ref !== null && ref !== void 0) {
    ref.current = value;
  }
}
__name(setRef, "setRef");
function composeRefs(...refs) {
  return (node) => {
    let hasCleanup = false;
    const cleanups = refs.map((ref) => {
      const cleanup = setRef(ref, node);
      if (!hasCleanup && typeof cleanup == "function") {
        hasCleanup = true;
      }
      return cleanup;
    });
    if (hasCleanup) {
      return () => {
        for (let i = 0; i < cleanups.length; i++) {
          const cleanup = cleanups[i];
          if (typeof cleanup == "function") {
            cleanup();
          } else {
            setRef(refs[i], null);
          }
        }
      };
    }
  };
}
__name(composeRefs, "composeRefs");
function useComposedRefs(...refs) {
  return React.useCallback(composeRefs(...refs), refs);
}
__name(useComposedRefs, "useComposedRefs");

// node_modules/@radix-ui/react-slot/dist/index.mjs
var __defProp2 = Object.defineProperty;
var __name2 = (target, value) => __defProp2(target, "name", { value, configurable: true });
// @__NO_SIDE_EFFECTS__
function createSlot(ownerName) {
  const Slot2 = React2.forwardRef((props, forwardedRef) => {
    let { children, ...slotProps } = props;
    let slottableElement = null;
    let hasSlottable = false;
    const newChildren = [];
    children = useUnwrappedLazy(children);
    React2.Children.forEach(children, (maybeSlottable) => {
      if (isSlottable(maybeSlottable)) {
        hasSlottable = true;
        const slottable = maybeSlottable;
        let child = "child" in slottable.props ? slottable.props.child : slottable.props.children;
        while (isLazyComponent(child) && typeof use === "function") {
          child = use(child._payload);
        }
        slottableElement = getSlottableElementFromSlottable(slottable, child);
        newChildren.push(slottableElement?.props?.children);
      } else {
        newChildren.push(maybeSlottable);
      }
    });
    if (slottableElement) {
      slottableElement = React2.cloneElement(slottableElement, void 0, newChildren);
    } else if (
      // A `Slottable` was found but it didn't resolve to a single element (e.g.
      // it wrapped multiple elements, text, or a render-prop `child` that
      // wasn't an element). Don't fall back to treating the `Slottable` wrapper
      // itself as the slot target — throw a descriptive error below instead.
      !hasSlottable && React2.Children.count(children) === 1 && React2.isValidElement(children)
    ) {
      slottableElement = children;
    }
    const slottableElementRef = slottableElement ? getElementRef(slottableElement) : void 0;
    const composedRef = useComposedRefs(forwardedRef, slottableElementRef);
    if (!slottableElement) {
      if (children || children === 0) {
        throw new Error(
          hasSlottable ? createSlottableError(ownerName) : createSlotError(ownerName)
        );
      }
      return children;
    }
    const mergedProps = mergeProps(slotProps, slottableElement.props ?? {});
    if (slottableElement.type !== React2.Fragment) {
      mergedProps.ref = forwardedRef ? composedRef : slottableElementRef;
    }
    return React2.cloneElement(slottableElement, mergedProps);
  });
  Slot2.displayName = `${ownerName}.Slot`;
  return Slot2;
}
__name2(createSlot, "createSlot");
var Slot = /* @__PURE__ */ createSlot("Slot");
var SLOTTABLE_IDENTIFIER = /* @__PURE__ */ Symbol.for("radix.slottable");
// @__NO_SIDE_EFFECTS__
function createSlottable(ownerName) {
  const Slottable22 = /* @__PURE__ */ __name2((props) => "child" in props ? props.children(props.child) : props.children, "Slottable");
  Slottable22.displayName = `${ownerName}.Slottable`;
  Slottable22.__radixId = SLOTTABLE_IDENTIFIER;
  return Slottable22;
}
__name2(createSlottable, "createSlottable");
var Slottable = /* @__PURE__ */ createSlottable("Slottable");
var getSlottableElementFromSlottable = /* @__PURE__ */ __name2((slottable, child) => {
  if ("child" in slottable.props) {
    if (!React2.isValidElement(child)) return null;
    return React2.cloneElement(child, void 0, slottable.props.children(child.props.children));
  }
  return React2.isValidElement(child) ? child : null;
}, "getSlottableElementFromSlottable");
function mergeProps(slotProps, childProps) {
  const overrideProps = { ...childProps };
  for (const propName in childProps) {
    const slotPropValue = slotProps[propName];
    const childPropValue = childProps[propName];
    const isHandler = /^on[A-Z]/.test(propName);
    if (isHandler) {
      if (slotPropValue && childPropValue) {
        overrideProps[propName] = (...args) => {
          const result = childPropValue(...args);
          slotPropValue(...args);
          return result;
        };
      } else if (slotPropValue) {
        overrideProps[propName] = slotPropValue;
      }
    } else if (propName === "style") {
      overrideProps[propName] = { ...slotPropValue, ...childPropValue };
    } else if (propName === "className") {
      overrideProps[propName] = [slotPropValue, childPropValue].filter(Boolean).join(" ");
    } else if (propName === "aria-describedby") {
      overrideProps[propName] = concatAriaDescribedby(childPropValue, slotPropValue);
    }
  }
  return { ...slotProps, ...overrideProps };
}
__name2(mergeProps, "mergeProps");
function getElementRef(element) {
  let getter = Object.getOwnPropertyDescriptor(element.props, "ref")?.get;
  let mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.ref;
  }
  getter = Object.getOwnPropertyDescriptor(element, "ref")?.get;
  mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.props.ref;
  }
  return element.props.ref || element.ref;
}
__name2(getElementRef, "getElementRef");
function isSlottable(child) {
  return React2.isValidElement(child) && typeof child.type === "function" && "__radixId" in child.type && child.type.__radixId === SLOTTABLE_IDENTIFIER;
}
__name2(isSlottable, "isSlottable");
var REACT_LAZY_TYPE = /* @__PURE__ */ Symbol.for("react.lazy");
function isLazyComponent(element) {
  return element != null && typeof element === "object" && "$$typeof" in element && element.$$typeof === REACT_LAZY_TYPE && "_payload" in element && isPromiseLike(element._payload);
}
__name2(isLazyComponent, "isLazyComponent");
function isPromiseLike(value) {
  return typeof value === "object" && value !== null && "then" in value;
}
__name2(isPromiseLike, "isPromiseLike");
function useUnwrappedLazy(value) {
  let unwrapped = value;
  while (isLazyComponent(unwrapped) && typeof use === "function") {
    unwrapped = use(unwrapped._payload);
  }
  return unwrapped;
}
__name2(useUnwrappedLazy, "useUnwrappedLazy");
function concatAriaDescribedby(...values) {
  const ids2 = /* @__PURE__ */ new Set();
  for (const value of values) {
    if (typeof value !== "string") continue;
    for (const id of String(value).trim().split(/\s+/)) {
      if (id) ids2.add(id);
    }
  }
  return ids2.size > 0 ? Array.from(ids2).join(" ") : void 0;
}
__name2(concatAriaDescribedby, "concatAriaDescribedby");
var createSlotError = /* @__PURE__ */ __name2((ownerName) => {
  return `${ownerName} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`;
}, "createSlotError");
var createSlottableError = /* @__PURE__ */ __name2((ownerName) => {
  return `${ownerName} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`;
}, "createSlottableError");
var use = React2[" use ".trim().toString()];

// node_modules/@radix-ui/react-primitive/dist/index.mjs
import { jsx as jsx2 } from "react/jsx-runtime";
var __defProp3 = Object.defineProperty;
var __name3 = (target, value) => __defProp3(target, "name", { value, configurable: true });
var NODES = [
  "a",
  "button",
  "div",
  "form",
  "h2",
  "h3",
  "img",
  "input",
  "label",
  "li",
  "nav",
  "ol",
  "p",
  "select",
  "span",
  "svg",
  "ul"
];
var Primitive = NODES.reduce((primitive, node) => {
  const Slot2 = createSlot(`Primitive.${node}`);
  const Node2 = React3.forwardRef((props, forwardedRef) => {
    const { asChild, ...primitiveProps } = props;
    const Comp = asChild ? Slot2 : node;
    if (typeof window !== "undefined") {
      window[/* @__PURE__ */ Symbol.for("radix-ui")] = true;
    }
    return /* @__PURE__ */ jsx2(Comp, { ...primitiveProps, ref: forwardedRef });
  });
  Node2.displayName = `Primitive.${node}`;
  return { ...primitive, [node]: Node2 };
}, {});
function dispatchDiscreteCustomEvent(target, event) {
  if (target) ReactDOM.flushSync(() => target.dispatchEvent(event));
}
__name3(dispatchDiscreteCustomEvent, "dispatchDiscreteCustomEvent");

// node_modules/@radix-ui/react-visually-hidden/dist/index.mjs
import { jsx as jsx3 } from "react/jsx-runtime";
var __defProp4 = Object.defineProperty;
var __name4 = (target, value) => __defProp4(target, "name", { value, configurable: true });
var VISUALLY_HIDDEN_STYLES = Object.freeze({
  // See: https://github.com/twbs/bootstrap/blob/main/scss/mixins/_visually-hidden.scss
  position: "absolute",
  border: 0,
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  wordWrap: "normal"
});
var VisuallyHidden = /* @__PURE__ */ React4.forwardRef(
  /* @__PURE__ */ __name4(function VisuallyHidden2(props, forwardedRef) {
    return /* @__PURE__ */ jsx3(
      Primitive.span,
      {
        ...props,
        ref: forwardedRef,
        style: { ...VISUALLY_HIDDEN_STYLES, ...props.style }
      }
    );
  }, "VisuallyHidden")
);

// node_modules/@radix-ui/react-context/dist/index.mjs
import * as React5 from "react";
import { jsx as jsx4 } from "react/jsx-runtime";
var __defProp5 = Object.defineProperty;
var __name5 = (target, value) => __defProp5(target, "name", { value, configurable: true });
// @__NO_SIDE_EFFECTS__
function createContext22(rootComponentName, defaultContext) {
  const Context = React5.createContext(defaultContext);
  Context.displayName = rootComponentName + "Context";
  const Provider = /* @__PURE__ */ __name5((props) => {
    const { children, ...context } = props;
    const value = React5.useMemo(() => context, Object.values(context));
    return /* @__PURE__ */ jsx4(Context.Provider, { value, children });
  }, "Provider");
  Provider.displayName = rootComponentName + "Provider";
  function useContext22(consumerName, options = {}) {
    const { optional = false } = options;
    const context = React5.useContext(Context);
    if (context) return context;
    if (defaultContext !== void 0) return defaultContext;
    if (optional) return void 0;
    throw new Error(`\`${consumerName}\` must be used within \`${rootComponentName}\``);
  }
  __name5(useContext22, "useContext");
  return [Provider, useContext22];
}
__name5(createContext22, "createContext");
// @__NO_SIDE_EFFECTS__
function createContextScope(scopeName, createContextScopeDeps = []) {
  let defaultContexts = [];
  function createContext32(rootComponentName, defaultContext) {
    const BaseContext = React5.createContext(defaultContext);
    BaseContext.displayName = rootComponentName + "Context";
    const index2 = defaultContexts.length;
    defaultContexts = [...defaultContexts, defaultContext];
    const Provider = /* @__PURE__ */ __name5((props) => {
      const { scope, children, ...context } = props;
      const Context = scope?.[scopeName]?.[index2] || BaseContext;
      const value = React5.useMemo(() => context, Object.values(context));
      return /* @__PURE__ */ jsx4(Context.Provider, { value, children });
    }, "Provider");
    Provider.displayName = rootComponentName + "Provider";
    function useContext22(consumerName, scope, options = {}) {
      const { optional = false } = options;
      const Context = scope?.[scopeName]?.[index2] || BaseContext;
      const context = React5.useContext(Context);
      if (context) return context;
      if (defaultContext !== void 0) return defaultContext;
      if (optional) return void 0;
      throw new Error(`\`${consumerName}\` must be used within \`${rootComponentName}\``);
    }
    __name5(useContext22, "useContext");
    return [Provider, useContext22];
  }
  __name5(createContext32, "createContext");
  const createScope = /* @__PURE__ */ __name5(() => {
    const scopeContexts = defaultContexts.map((defaultContext) => {
      return React5.createContext(defaultContext);
    });
    return /* @__PURE__ */ __name5(function useScope(scope) {
      const contexts = scope?.[scopeName] || scopeContexts;
      return React5.useMemo(
        () => ({ [`__scope${scopeName}`]: { ...scope, [scopeName]: contexts } }),
        [scope, contexts]
      );
    }, "useScope");
  }, "createScope");
  createScope.scopeName = scopeName;
  return [createContext32, composeContextScopes(createScope, ...createContextScopeDeps)];
}
__name5(createContextScope, "createContextScope");
function composeContextScopes(...scopes) {
  const baseScope = scopes[0];
  if (scopes.length === 1) return baseScope;
  const createScope = /* @__PURE__ */ __name5(() => {
    const scopeHooks = scopes.map((createScope2) => ({
      useScope: createScope2(),
      scopeName: createScope2.scopeName
    }));
    return /* @__PURE__ */ __name5(function useComposedScopes(overrideScopes) {
      const nextScopes = scopeHooks.reduce((nextScopes2, { useScope, scopeName }) => {
        const scopeProps = useScope(overrideScopes);
        const currentScope = scopeProps[`__scope${scopeName}`];
        return { ...nextScopes2, ...currentScope };
      }, {});
      return React5.useMemo(() => ({ [`__scope${baseScope.scopeName}`]: nextScopes }), [nextScopes]);
    }, "useComposedScopes");
  }, "createScope");
  createScope.scopeName = baseScope.scopeName;
  return createScope;
}
__name5(composeContextScopes, "composeContextScopes");

// node_modules/@radix-ui/react-collection/dist/index.mjs
import * as React7 from "react";
import { jsx as jsx5 } from "react/jsx-runtime";
import * as React22 from "react";

// node_modules/@radix-ui/react-use-layout-effect/dist/index.mjs
import * as React6 from "react";
var useLayoutEffect2 = globalThis?.document ? React6.useLayoutEffect : () => {
};

// node_modules/@radix-ui/react-collection/dist/index.mjs
import { jsx as jsx22 } from "react/jsx-runtime";
var __defProp6 = Object.defineProperty;
var __name6 = (target, value) => __defProp6(target, "name", { value, configurable: true });
// @__NO_SIDE_EFFECTS__
function createCollection(name) {
  const PROVIDER_NAME2 = name + "CollectionProvider";
  const [createCollectionContext, createCollectionScope2] = createContextScope(PROVIDER_NAME2);
  const [CollectionProviderImpl, useCollectionContext] = createCollectionContext(
    PROVIDER_NAME2,
    { collectionRef: { current: null }, itemMap: /* @__PURE__ */ new Map() }
  );
  const CollectionProvider = /* @__PURE__ */ __name6((props) => {
    const { scope, children } = props;
    const ref = React7.useRef(null);
    const itemMap = React7.useRef(/* @__PURE__ */ new Map()).current;
    return /* @__PURE__ */ jsx5(CollectionProviderImpl, { scope, itemMap, collectionRef: ref, children });
  }, "CollectionProvider");
  CollectionProvider.displayName = PROVIDER_NAME2;
  const COLLECTION_SLOT_NAME = name + "CollectionSlot";
  const CollectionSlotImpl = createSlot(COLLECTION_SLOT_NAME);
  const CollectionSlot = React7.forwardRef(
    (props, forwardedRef) => {
      const { scope, children } = props;
      const context = useCollectionContext(COLLECTION_SLOT_NAME, scope);
      const composedRefs = useComposedRefs(forwardedRef, context.collectionRef);
      return /* @__PURE__ */ jsx5(CollectionSlotImpl, { ref: composedRefs, children });
    }
  );
  CollectionSlot.displayName = COLLECTION_SLOT_NAME;
  const ITEM_SLOT_NAME = name + "CollectionItemSlot";
  const ITEM_DATA_ATTR = "data-radix-collection-item";
  const CollectionItemSlotImpl = createSlot(ITEM_SLOT_NAME);
  const CollectionItemSlot = React7.forwardRef(
    (props, forwardedRef) => {
      const { scope, children, ...itemData } = props;
      const ref = React7.useRef(null);
      const composedRefs = useComposedRefs(forwardedRef, ref);
      const context = useCollectionContext(ITEM_SLOT_NAME, scope);
      React7.useEffect(() => {
        context.itemMap.set(ref, { ref, ...itemData });
        return () => void context.itemMap.delete(ref);
      });
      return /* @__PURE__ */ jsx5(CollectionItemSlotImpl, { ...{ [ITEM_DATA_ATTR]: "" }, ref: composedRefs, children });
    }
  );
  CollectionItemSlot.displayName = ITEM_SLOT_NAME;
  function useCollection2(scope) {
    const context = useCollectionContext(name + "CollectionConsumer", scope);
    const getItems = React7.useCallback(() => {
      const collectionNode = context.collectionRef.current;
      if (!collectionNode) return [];
      const orderedNodes = Array.from(collectionNode.querySelectorAll(`[${ITEM_DATA_ATTR}]`));
      const items = Array.from(context.itemMap.values());
      const orderedItems = items.sort(
        (a, b) => orderedNodes.indexOf(a.ref.current) - orderedNodes.indexOf(b.ref.current)
      );
      return orderedItems;
    }, [context.collectionRef, context.itemMap]);
    return getItems;
  }
  __name6(useCollection2, "useCollection");
  return [
    { Provider: CollectionProvider, Slot: CollectionSlot, ItemSlot: CollectionItemSlot },
    useCollection2,
    createCollectionScope2
  ];
}
__name6(createCollection, "createCollection");
var __instanciated = /* @__PURE__ */ new WeakMap();
var OrderedDict = class _OrderedDict extends Map {
  static {
    __name6(this, "OrderedDict");
  }
  #keys;
  constructor(entries) {
    super(entries);
    this.#keys = [...super.keys()];
    __instanciated.set(this, true);
  }
  set(key, value) {
    if (__instanciated.get(this) && !this.has(key)) {
      this.#keys.push(key);
    }
    super.set(key, value);
    return this;
  }
  /**
   * Sets a key-value pair so that it ends up at the given index.
   * - Existing keys are moved
   * - Negative indices count from the end of the resulting dictionary, so
   *   inserting at -1 makes the item the last one, -2 the second to last, etc.
   * - Out-of-range indices are clamped
   */
  insert(index2, key, value) {
    const has = this.has(key);
    const finalSize = has ? this.size : this.size + 1;
    const relativeIndex = toSafeInteger(index2);
    const targetIndex = relativeIndex >= 0 ? Math.min(relativeIndex, finalSize - 1) : Math.max(finalSize + relativeIndex, 0);
    if (has ? this.#keys.indexOf(key) === targetIndex : targetIndex === this.size) {
      this.set(key, value);
      return this;
    }
    const keys = this.#keys.filter((existingKey) => existingKey !== key);
    keys.splice(targetIndex, 0, key);
    const entries = keys.map((entryKey) => [
      entryKey,
      entryKey === key ? value : this.get(entryKey)
    ]);
    this.clear();
    for (const [entryKey, entryValue] of entries) {
      this.set(entryKey, entryValue);
    }
    return this;
  }
  with(index2, key, value) {
    const copy = new _OrderedDict(this);
    copy.insert(index2, key, value);
    return copy;
  }
  before(key) {
    const index2 = this.#keys.indexOf(key) - 1;
    if (index2 < 0) {
      return void 0;
    }
    return this.entryAt(index2);
  }
  /**
   * Sets a new key-value pair at the position before the given key.
   */
  setBefore(key, newKey, value) {
    const index2 = this.#keys.indexOf(key);
    if (index2 === -1) {
      return this;
    }
    const currentIndex = this.#keys.indexOf(newKey);
    const targetIndex = currentIndex !== -1 && currentIndex < index2 ? index2 - 1 : index2;
    return this.insert(targetIndex, newKey, value);
  }
  after(key) {
    let index2 = this.#keys.indexOf(key);
    index2 = index2 === -1 || index2 === this.size - 1 ? -1 : index2 + 1;
    if (index2 === -1) {
      return void 0;
    }
    return this.entryAt(index2);
  }
  /**
   * Sets a new key-value pair at the position after the given key.
   */
  setAfter(key, newKey, value) {
    const index2 = this.#keys.indexOf(key);
    if (index2 === -1) {
      return this;
    }
    const currentIndex = this.#keys.indexOf(newKey);
    const targetIndex = currentIndex !== -1 && currentIndex <= index2 ? index2 : index2 + 1;
    return this.insert(targetIndex, newKey, value);
  }
  first() {
    return this.entryAt(0);
  }
  last() {
    return this.entryAt(-1);
  }
  clear() {
    this.#keys = [];
    return super.clear();
  }
  delete(key) {
    const deleted = super.delete(key);
    if (deleted) {
      this.#keys.splice(this.#keys.indexOf(key), 1);
    }
    return deleted;
  }
  deleteAt(index2) {
    const key = this.keyAt(index2);
    if (key !== void 0) {
      return this.delete(key);
    }
    return false;
  }
  at(index2) {
    const key = at(this.#keys, index2);
    if (key !== void 0) {
      return this.get(key);
    }
  }
  entryAt(index2) {
    const key = at(this.#keys, index2);
    if (key !== void 0) {
      return [key, this.get(key)];
    }
  }
  indexOf(key) {
    return this.#keys.indexOf(key);
  }
  keyAt(index2) {
    return at(this.#keys, index2);
  }
  from(key, offset4) {
    const index2 = this.indexOf(key);
    if (index2 === -1) {
      return void 0;
    }
    let dest = index2 + offset4;
    if (dest < 0) dest = 0;
    if (dest >= this.size) dest = this.size - 1;
    return this.at(dest);
  }
  keyFrom(key, offset4) {
    const index2 = this.indexOf(key);
    if (index2 === -1) {
      return void 0;
    }
    let dest = index2 + offset4;
    if (dest < 0) dest = 0;
    if (dest >= this.size) dest = this.size - 1;
    return this.keyAt(dest);
  }
  find(predicate, thisArg) {
    let index2 = 0;
    for (const entry of this) {
      if (Reflect.apply(predicate, thisArg, [entry, index2, this])) {
        return entry;
      }
      index2++;
    }
    return void 0;
  }
  findIndex(predicate, thisArg) {
    let index2 = 0;
    for (const entry of this) {
      if (Reflect.apply(predicate, thisArg, [entry, index2, this])) {
        return index2;
      }
      index2++;
    }
    return -1;
  }
  filter(predicate, thisArg) {
    const entries = [];
    let index2 = 0;
    for (const entry of this) {
      if (Reflect.apply(predicate, thisArg, [entry, index2, this])) {
        entries.push(entry);
      }
      index2++;
    }
    return new _OrderedDict(entries);
  }
  map(callbackfn, thisArg) {
    const entries = [];
    let index2 = 0;
    for (const entry of this) {
      entries.push([entry[0], Reflect.apply(callbackfn, thisArg, [entry, index2, this])]);
      index2++;
    }
    return new _OrderedDict(entries);
  }
  reduce(...args) {
    const [callbackfn, initialValue] = args;
    const hasInitialValue = args.length > 1;
    if (!hasInitialValue && this.size === 0) {
      throw new TypeError("Reduce of empty OrderedDict with no initial value");
    }
    let index2 = 0;
    let accumulator = initialValue;
    for (const entry of this) {
      if (index2 === 0 && !hasInitialValue) {
        accumulator = entry;
      } else {
        accumulator = Reflect.apply(callbackfn, this, [accumulator, entry, index2, this]);
      }
      index2++;
    }
    return accumulator;
  }
  reduceRight(...args) {
    const [callbackfn, initialValue] = args;
    const hasInitialValue = args.length > 1;
    if (!hasInitialValue && this.size === 0) {
      throw new TypeError("Reduce of empty OrderedDict with no initial value");
    }
    let accumulator = initialValue;
    for (let index2 = this.size - 1; index2 >= 0; index2--) {
      const entry = this.entryAt(index2);
      if (index2 === this.size - 1 && !hasInitialValue) {
        accumulator = entry;
      } else {
        accumulator = Reflect.apply(callbackfn, this, [accumulator, entry, index2, this]);
      }
    }
    return accumulator;
  }
  /**
   * Sorts the dictionary in place. This method mutates the dictionary and
   * returns a reference to the same object
   *
   * @param compareFn Function used to determine the order of the elements. It
   * is expected to return a negative value if the first argument is less than
   * the second argument, zero if they're equal, and a positive value otherwise.
   */
  sort(compareFn) {
    if (typeof compareFn !== "function") {
      throw new TypeError(`OrderedDict.sort requires a compare function`);
    }
    const entries = [...this.entries()].sort(compareFn);
    this.clear();
    for (const [key, value] of entries) {
      this.set(key, value);
    }
    return this;
  }
  /**
   * Returns a copy of the dictionary with its elements sorted.
   *
   * @param compareFn Function used to determine the order of the elements. It
   * is expected to return a negative value if the first argument is less than
   * the second argument, zero if they're equal, and a positive value otherwise.
   */
  toSorted(compareFn) {
    if (typeof compareFn !== "function") {
      throw new TypeError(`OrderedDict.toSorted requires a compare function`);
    }
    const entries = [...this.entries()].sort(compareFn);
    return new _OrderedDict(entries);
  }
  toReversed() {
    const reversed = new _OrderedDict();
    for (let index2 = this.size - 1; index2 >= 0; index2--) {
      const key = this.keyAt(index2);
      const element = this.get(key);
      reversed.set(key, element);
    }
    return reversed;
  }
  toSpliced(...args) {
    const entries = [...this.entries()];
    entries.splice(...args);
    return new _OrderedDict(entries);
  }
  slice(start, end) {
    const result = new _OrderedDict();
    for (const key of this.#keys.slice(start, end)) {
      result.set(key, this.get(key));
    }
    return result;
  }
  every(predicate, thisArg) {
    let index2 = 0;
    for (const entry of this) {
      if (!Reflect.apply(predicate, thisArg, [entry, index2, this])) {
        return false;
      }
      index2++;
    }
    return true;
  }
  some(predicate, thisArg) {
    let index2 = 0;
    for (const entry of this) {
      if (Reflect.apply(predicate, thisArg, [entry, index2, this])) {
        return true;
      }
      index2++;
    }
    return false;
  }
};
function at(array, index2) {
  if ("at" in Array.prototype) {
    return Array.prototype.at.call(array, index2);
  }
  const actualIndex = toSafeIndex(array, index2);
  return actualIndex === -1 ? void 0 : array[actualIndex];
}
__name6(at, "at");
function toSafeIndex(array, index2) {
  const length = array.length;
  const relativeIndex = toSafeInteger(index2);
  const actualIndex = relativeIndex >= 0 ? relativeIndex : length + relativeIndex;
  return actualIndex < 0 || actualIndex >= length ? -1 : actualIndex;
}
__name6(toSafeIndex, "toSafeIndex");
function toSafeInteger(number) {
  return number !== number || number === 0 ? 0 : Math.trunc(number);
}
__name6(toSafeInteger, "toSafeInteger");
// @__NO_SIDE_EFFECTS__
function createCollection2(name) {
  const PROVIDER_NAME2 = name + "CollectionProvider";
  const [createCollectionContext, createCollectionScope2] = createContextScope(PROVIDER_NAME2);
  const [CollectionStableContextProvider, useStableCollectionContext] = createCollectionContext(PROVIDER_NAME2);
  CollectionStableContextProvider.displayName = name + "CollectionStableContextProvider";
  const [CollectionStatefulContextProvider, useStatefulCollectionContext] = createCollectionContext(PROVIDER_NAME2);
  CollectionStatefulContextProvider.displayName = name + "CollectionStatefulContextProvider";
  const CollectionProvider = /* @__PURE__ */ __name6(({ state, ...props }) => {
    return state ? /* @__PURE__ */ jsx22(CollectionProviderImpl, { ...props, state }) : /* @__PURE__ */ jsx22(CollectionInit, { ...props });
  }, "CollectionProvider");
  CollectionProvider.displayName = PROVIDER_NAME2;
  const CollectionInit = /* @__PURE__ */ __name6((props) => {
    const state = useInitCollection();
    return /* @__PURE__ */ jsx22(CollectionProviderImpl, { ...props, state });
  }, "CollectionInit");
  CollectionInit.displayName = name + "CollectionInit";
  const CollectionProviderImpl = /* @__PURE__ */ __name6((props) => {
    const { scope, children, state } = props;
    const ref = React22.useRef(null);
    const [collectionElement, setCollectionElement] = React22.useState(
      null
    );
    const composeRefs2 = useComposedRefs(ref, setCollectionElement);
    const [collection, setCollection] = state;
    const registryRef = React22.useRef(
      new OrderedDict()
    );
    const getCollection = React22.useCallback(() => {
      const registry = registryRef.current;
      if (!isInDocumentOrder(registry)) {
        registry.sort(sortByDocumentPosition);
      }
      return registry;
    }, []);
    React22.useEffect(() => {
      if (!collectionElement) {
        return;
      }
      const observer = getChildListObserver(() => {
        setCollection((map) => {
          const sorted = map.toSorted(sortByDocumentPosition);
          const orderChanged = sorted.some(([key], index2) => map.keyAt(index2) !== key);
          return orderChanged ? sorted : map;
        });
      });
      observer.observe(collectionElement, {
        childList: true,
        subtree: true
      });
      return () => {
        observer.disconnect();
      };
    }, [collectionElement, setCollection]);
    return /* @__PURE__ */ jsx22(
      CollectionStableContextProvider,
      {
        scope,
        collectionElementRef: composeRefs2,
        collectionElementRefObject: ref,
        getCollection,
        setCollection,
        registryRef,
        children: /* @__PURE__ */ jsx22(
          CollectionStatefulContextProvider,
          {
            scope,
            collectionElement,
            collection,
            children
          }
        )
      }
    );
  }, "CollectionProviderImpl");
  CollectionProviderImpl.displayName = name + "CollectionProviderImpl";
  const COLLECTION_SLOT_NAME = name + "CollectionSlot";
  const CollectionSlotImpl = createSlot(COLLECTION_SLOT_NAME);
  const CollectionSlot = React22.forwardRef(
    (props, forwardedRef) => {
      const { scope, children } = props;
      const context = useStableCollectionContext(COLLECTION_SLOT_NAME, scope);
      const composedRefs = useComposedRefs(forwardedRef, context.collectionElementRef);
      return /* @__PURE__ */ jsx22(CollectionSlotImpl, { ref: composedRefs, children });
    }
  );
  CollectionSlot.displayName = COLLECTION_SLOT_NAME;
  const ITEM_SLOT_NAME = name + "CollectionItemSlot";
  const ITEM_DATA_ATTR = "data-radix-collection-item";
  const CollectionItemSlotImpl = createSlot(ITEM_SLOT_NAME);
  const CollectionItemSlot = React22.forwardRef(
    (props, forwardedRef) => {
      const { scope, children, ...itemData } = props;
      const ref = React22.useRef(null);
      const context = useStableCollectionContext(ITEM_SLOT_NAME, scope);
      const { setCollection, registryRef } = context;
      const itemDataRef = React22.useRef(itemData);
      if (!shallowEqual(itemDataRef.current, itemData)) {
        itemDataRef.current = itemData;
      }
      const memoizedItemData = itemDataRef.current;
      const registerElement = React22.useCallback(
        (node) => {
          const registry = registryRef.current;
          if (node) {
            registry.set(node, {
              ...itemDataRef.current,
              element: node
            });
          } else if (ref.current) {
            registry.delete(ref.current);
          }
        },
        [registryRef]
      );
      const composedRefs = useComposedRefs(forwardedRef, registerElement, ref);
      useLayoutEffect2(() => {
        const node = ref.current;
        const registry = registryRef.current;
        if (node && registry.has(node)) {
          registry.set(node, { ...memoizedItemData, element: node });
        }
      }, [memoizedItemData, registryRef]);
      const registeredRef = React22.useRef(null);
      React22.useEffect(() => {
        const element = ref.current;
        const registered = registeredRef.current;
        if ((registered?.element ?? null) === element && (!element || registered?.itemData === memoizedItemData)) {
          return;
        }
        registeredRef.current = element ? { element, itemData: memoizedItemData } : null;
        setCollection((map) => {
          const next = new OrderedDict(map);
          if (registered && registered.element !== element) {
            next.delete(registered.element);
          }
          if (element) {
            next.set(element, { ...memoizedItemData, element });
          }
          return next.sort(sortByDocumentPosition);
        });
      });
      React22.useEffect(() => {
        return () => {
          const registered = registeredRef.current;
          registeredRef.current = null;
          if (!registered) {
            return;
          }
          setCollection((map) => {
            if (!map.has(registered.element)) {
              return map;
            }
            const next = new OrderedDict(map);
            next.delete(registered.element);
            return next;
          });
        };
      }, [setCollection]);
      return /* @__PURE__ */ jsx22(CollectionItemSlotImpl, { ...{ [ITEM_DATA_ATTR]: "" }, ref: composedRefs, children });
    }
  );
  CollectionItemSlot.displayName = ITEM_SLOT_NAME;
  function useInitCollection() {
    return React22.useState(new OrderedDict());
  }
  __name6(useInitCollection, "useInitCollection");
  function useCollection2(scope) {
    const { collection } = useStatefulCollectionContext(name + "CollectionConsumer", scope);
    return collection;
  }
  __name6(useCollection2, "useCollection");
  function useGetCollection(scope) {
    const { getCollection } = useStableCollectionContext(name + "CollectionConsumer", scope);
    return getCollection;
  }
  __name6(useGetCollection, "useGetCollection");
  const functions = {
    createCollectionScope: createCollectionScope2,
    useCollection: useCollection2,
    useGetCollection,
    useInitCollection
  };
  return [
    { Provider: CollectionProvider, Slot: CollectionSlot, ItemSlot: CollectionItemSlot },
    functions
  ];
}
__name6(createCollection2, "createCollection");
function shallowEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object") return false;
  if (a == null || b == null) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (a[key] !== b[key]) return false;
  }
  return true;
}
__name6(shallowEqual, "shallowEqual");
function isElementPreceding(a, b) {
  return !!(b.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_PRECEDING);
}
__name6(isElementPreceding, "isElementPreceding");
function isInDocumentOrder(dict) {
  let previous;
  for (const element of dict.keys()) {
    if (previous) {
      const position = previous.compareDocumentPosition(element);
      if (!(position & Node.DOCUMENT_POSITION_DISCONNECTED) && position & Node.DOCUMENT_POSITION_PRECEDING) {
        return false;
      }
    }
    previous = element;
  }
  return true;
}
__name6(isInDocumentOrder, "isInDocumentOrder");
function sortByDocumentPosition(a, b) {
  return !a[1].element || !b[1].element ? 0 : isElementPreceding(a[1].element, b[1].element) ? -1 : 1;
}
__name6(sortByDocumentPosition, "sortByDocumentPosition");
function getChildListObserver(callback) {
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        callback();
        return;
      }
    }
  });
  return observer;
}
__name6(getChildListObserver, "getChildListObserver");

// node_modules/@radix-ui/primitive/dist/index.mjs
var __defProp7 = Object.defineProperty;
var __name7 = (target, value) => __defProp7(target, "name", { value, configurable: true });
var canUseDOM = !!(typeof window !== "undefined" && window.document && window.document.createElement);
function composeEventHandlers(originalEventHandler, ourEventHandler, { checkForDefaultPrevented = true } = {}) {
  return /* @__PURE__ */ __name7(function handleEvent(event) {
    originalEventHandler?.(event);
    if (checkForDefaultPrevented === false || !event || !event.defaultPrevented) {
      return ourEventHandler?.(event);
    }
  }, "handleEvent");
}
__name7(composeEventHandlers, "composeEventHandlers");
function getOwnerWindow(element) {
  if (!canUseDOM) {
    throw new Error("Cannot access window outside of the DOM");
  }
  return element?.ownerDocument?.defaultView ?? window;
}
__name7(getOwnerWindow, "getOwnerWindow");
function getOwnerDocument(element) {
  if (!canUseDOM) {
    throw new Error("Cannot access document outside of the DOM");
  }
  return element?.ownerDocument ?? document;
}
__name7(getOwnerDocument, "getOwnerDocument");
function getActiveElement(node, activeDescendant = false) {
  const { activeElement } = getOwnerDocument(node);
  if (!activeElement?.nodeName) {
    return null;
  }
  if (isFrame(activeElement) && activeElement.contentDocument) {
    return getActiveElement(activeElement.contentDocument.body, activeDescendant);
  }
  if (activeDescendant) {
    const id = activeElement.getAttribute("aria-activedescendant");
    if (id) {
      const element = getOwnerDocument(activeElement).getElementById(id);
      if (element) {
        return element;
      }
    }
  }
  return activeElement;
}
__name7(getActiveElement, "getActiveElement");
function isFrame(element) {
  return element.tagName === "IFRAME";
}
__name7(isFrame, "isFrame");

// node_modules/@radix-ui/react-use-controllable-state/dist/index.mjs
import * as React9 from "react";

// node_modules/@radix-ui/primitive/dist/internal/is-development.false.mjs
var IS_DEVELOPMENT = false;

// node_modules/@radix-ui/react-use-controllable-state/dist/index.mjs
import * as React23 from "react";

// node_modules/@radix-ui/react-use-effect-event/dist/index.mjs
import * as React8 from "react";
var __defProp8 = Object.defineProperty;
var __name8 = (target, value) => __defProp8(target, "name", { value, configurable: true });
var useReactEffectEvent = React8[" useEffectEvent ".trim().toString()];
var useReactInsertionEffect = React8[" useInsertionEffect ".trim().toString()];
function useEffectEvent(callback) {
  if (typeof useReactEffectEvent === "function") {
    return useReactEffectEvent(callback);
  }
  const ref = React8.useRef(() => {
    throw new Error("Cannot call an event handler while rendering.");
  });
  if (typeof useReactInsertionEffect === "function") {
    useReactInsertionEffect(() => {
      ref.current = callback;
    });
  } else {
    useLayoutEffect2(() => {
      ref.current = callback;
    });
  }
  return React8.useMemo(() => ((...args) => ref.current?.(...args)), []);
}
__name8(useEffectEvent, "useEffectEvent");

// node_modules/@radix-ui/react-use-controllable-state/dist/index.mjs
var __defProp9 = Object.defineProperty;
var __name9 = (target, value) => __defProp9(target, "name", { value, configurable: true });
var useInsertionEffect = React9[" useInsertionEffect ".trim().toString()] || useLayoutEffect2;
function useControllableState({
  prop,
  defaultProp,
  onChange = /* @__PURE__ */ __name9(() => {
  }, "onChange"),
  caller
}) {
  const [uncontrolledProp, setUncontrolledProp, onChangeRef] = useUncontrolledState({
    defaultProp,
    onChange
  });
  const isControlled = prop !== void 0;
  const value = isControlled ? prop : uncontrolledProp;
  if (IS_DEVELOPMENT) {
    const isControlledRef = React9.useRef(prop !== void 0);
    React9.useEffect(() => {
      const wasControlled = isControlledRef.current;
      if (wasControlled !== isControlled) {
        const from = wasControlled ? "controlled" : "uncontrolled";
        const to = isControlled ? "controlled" : "uncontrolled";
        console.warn(
          `${caller} is changing from ${from} to ${to}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`
        );
      }
      isControlledRef.current = isControlled;
    }, [isControlled, caller]);
  }
  const setValue = React9.useCallback(
    (nextValue) => {
      if (isControlled) {
        const value2 = isFunction(nextValue) ? nextValue(prop) : nextValue;
        if (value2 !== prop) {
          onChangeRef.current?.(value2);
        }
      } else {
        setUncontrolledProp(nextValue);
      }
    },
    [isControlled, prop, setUncontrolledProp, onChangeRef]
  );
  return [value, setValue];
}
__name9(useControllableState, "useControllableState");
function useUncontrolledState({
  defaultProp,
  onChange
}) {
  const [value, setValue] = React9.useState(defaultProp);
  const prevValueRef = React9.useRef(value);
  const onChangeRef = React9.useRef(onChange);
  useInsertionEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  React9.useEffect(() => {
    if (prevValueRef.current !== value) {
      onChangeRef.current?.(value);
      prevValueRef.current = value;
    }
  }, [value, prevValueRef]);
  return [value, setValue, onChangeRef];
}
__name9(useUncontrolledState, "useUncontrolledState");
function isFunction(value) {
  return typeof value === "function";
}
__name9(isFunction, "isFunction");
var SYNC_STATE = /* @__PURE__ */ Symbol("RADIX:SYNC_STATE");
function useControllableStateReducer(reducer, userArgs, initialArg, init) {
  const { prop: controlledState, defaultProp, onChange: onChangeProp, caller } = userArgs;
  const isControlled = controlledState !== void 0;
  const onChange = useEffectEvent(onChangeProp);
  if (IS_DEVELOPMENT) {
    const isControlledRef = React23.useRef(controlledState !== void 0);
    React23.useEffect(() => {
      const wasControlled = isControlledRef.current;
      if (wasControlled !== isControlled) {
        const from = wasControlled ? "controlled" : "uncontrolled";
        const to = isControlled ? "controlled" : "uncontrolled";
        console.warn(
          `${caller} is changing from ${from} to ${to}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`
        );
      }
      isControlledRef.current = isControlled;
    }, [isControlled, caller]);
  }
  const args = [{ ...initialArg, state: defaultProp }];
  if (init) {
    args.push(init);
  }
  const [internalState, dispatch] = React23.useReducer(
    (state2, action) => {
      if (action.type === SYNC_STATE) {
        return { ...state2, state: action.state };
      }
      const next = reducer(state2, action);
      if (isControlled && !Object.is(next.state, state2.state)) {
        onChange(next.state);
      }
      return next;
    },
    ...args
  );
  const uncontrolledState = internalState.state;
  const prevValueRef = React23.useRef(uncontrolledState);
  React23.useEffect(() => {
    if (prevValueRef.current !== uncontrolledState) {
      prevValueRef.current = uncontrolledState;
      if (!isControlled) {
        onChange(uncontrolledState);
      }
    }
  }, [uncontrolledState, prevValueRef, isControlled]);
  const state = React23.useMemo(() => {
    const isControlled2 = controlledState !== void 0;
    if (isControlled2) {
      return { ...internalState, state: controlledState };
    }
    return internalState;
  }, [internalState, controlledState]);
  React23.useEffect(() => {
    if (isControlled && !Object.is(controlledState, internalState.state)) {
      dispatch({ type: SYNC_STATE, state: controlledState });
    }
  }, [controlledState, internalState.state, isControlled]);
  return [state, dispatch];
}
__name9(useControllableStateReducer, "useControllableStateReducer");

// node_modules/@radix-ui/react-collapsible/dist/index.mjs
var dist_exports2 = {};
__export(dist_exports2, {
  Collapsible: () => Collapsible,
  CollapsibleContent: () => CollapsibleContent,
  CollapsibleTrigger: () => CollapsibleTrigger,
  Content: () => CollapsibleContent,
  Root: () => Collapsible,
  Trigger: () => CollapsibleTrigger,
  createCollapsibleScope: () => createCollapsibleScope
});
import * as React12 from "react";

// node_modules/@radix-ui/react-presence/dist/index.mjs
import * as React24 from "react";
import * as React10 from "react";
var __defProp10 = Object.defineProperty;
var __name10 = (target, value) => __defProp10(target, "name", { value, configurable: true });
function useStateMachine(initialState, machine) {
  return React10.useReducer((state, event) => {
    const nextState = machine[state][event];
    return nextState ?? state;
  }, initialState);
}
__name10(useStateMachine, "useStateMachine");
var Presence = /* @__PURE__ */ __name10((props) => {
  const { present, children } = props;
  const presence = usePresence(present);
  const child = typeof children === "function" ? children({ present: presence.isPresent }) : React24.Children.only(children);
  const ref = useStableComposedRefs(presence.ref, getElementRef2(child));
  const forceMount = typeof children === "function";
  return forceMount || presence.isPresent ? React24.cloneElement(child, { ref }) : null;
}, "Presence");
function usePresence(present) {
  const [node, setNode] = React24.useState();
  const stylesRef = React24.useRef(null);
  const prevPresentRef = React24.useRef(present);
  const prevAnimationNameRef = React24.useRef("none");
  const mountAnimationNameRef = React24.useRef(void 0);
  const initialState = present ? "mounted" : "unmounted";
  const [state, send] = useStateMachine(initialState, {
    mounted: {
      UNMOUNT: "unmounted",
      ANIMATION_OUT: "unmountSuspended"
    },
    unmountSuspended: {
      MOUNT: "mounted",
      ANIMATION_END: "unmounted"
    },
    unmounted: {
      MOUNT: "mounted"
    }
  });
  React24.useEffect(() => {
    if (state === "mounted") {
      prevAnimationNameRef.current = mountAnimationNameRef.current ?? getAnimationName(stylesRef.current);
      mountAnimationNameRef.current = void 0;
    } else {
      prevAnimationNameRef.current = "none";
    }
  }, [state]);
  useLayoutEffect2(() => {
    const styles = stylesRef.current;
    const wasPresent = prevPresentRef.current;
    const hasPresentChanged = wasPresent !== present;
    if (hasPresentChanged) {
      const prevAnimationName = prevAnimationNameRef.current;
      const currentAnimationName = getAnimationName(styles);
      if (present) {
        mountAnimationNameRef.current = currentAnimationName;
        send("MOUNT");
      } else if (currentAnimationName === "none" || styles?.display === "none") {
        send("UNMOUNT");
      } else {
        const isAnimating = prevAnimationName !== currentAnimationName;
        if (wasPresent && isAnimating) {
          send("ANIMATION_OUT");
        } else {
          send("UNMOUNT");
        }
      }
      prevPresentRef.current = present;
    }
  }, [present, send]);
  useLayoutEffect2(() => {
    if (node) {
      let timeoutId;
      const ownerWindow = node.ownerDocument.defaultView ?? window;
      const handleAnimationEnd = /* @__PURE__ */ __name10((event) => {
        const currentAnimationName = getAnimationName(stylesRef.current);
        const isCurrentAnimation = currentAnimationName.includes(CSS.escape(event.animationName));
        if (event.target === node && isCurrentAnimation) {
          send("ANIMATION_END");
          if (!prevPresentRef.current) {
            const currentFillMode = node.style.animationFillMode;
            node.style.animationFillMode = "forwards";
            timeoutId = ownerWindow.setTimeout(() => {
              if (node.style.animationFillMode === "forwards") {
                node.style.animationFillMode = currentFillMode;
              }
            });
          }
        }
      }, "handleAnimationEnd");
      const handleAnimationStart = /* @__PURE__ */ __name10((event) => {
        if (event.target === node) {
          prevAnimationNameRef.current = getAnimationName(stylesRef.current);
        }
      }, "handleAnimationStart");
      node.addEventListener("animationstart", handleAnimationStart);
      node.addEventListener("animationcancel", handleAnimationEnd);
      node.addEventListener("animationend", handleAnimationEnd);
      return () => {
        ownerWindow.clearTimeout(timeoutId);
        node.removeEventListener("animationstart", handleAnimationStart);
        node.removeEventListener("animationcancel", handleAnimationEnd);
        node.removeEventListener("animationend", handleAnimationEnd);
      };
    } else {
      send("ANIMATION_END");
    }
  }, [node, send]);
  return {
    isPresent: ["mounted", "unmountSuspended"].includes(state),
    ref: React24.useCallback((node2) => {
      if (node2) {
        const styles = getComputedStyle(node2);
        stylesRef.current = styles;
        mountAnimationNameRef.current = getAnimationName(styles);
      } else {
        stylesRef.current = null;
      }
      setNode(node2);
    }, [])
  };
}
__name10(usePresence, "usePresence");
function setRef2(ref, value) {
  if (typeof ref === "function") {
    return ref(value);
  } else if (ref !== null && ref !== void 0) {
    ref.current = value;
  }
}
__name10(setRef2, "setRef");
function useStableComposedRefs(...refs) {
  const refsRef = React24.useRef(refs);
  refsRef.current = refs;
  return React24.useCallback((node) => {
    const currentRefs = refsRef.current;
    let hasCleanup = false;
    const cleanups = currentRefs.map((ref) => {
      const cleanup = setRef2(ref, node);
      if (!hasCleanup && typeof cleanup === "function") {
        hasCleanup = true;
      }
      return cleanup;
    });
    if (hasCleanup) {
      return () => {
        for (let i = 0; i < cleanups.length; i++) {
          const cleanup = cleanups[i];
          if (typeof cleanup === "function") {
            cleanup();
          } else {
            setRef2(currentRefs[i], null);
          }
        }
      };
    }
  }, []);
}
__name10(useStableComposedRefs, "useStableComposedRefs");
function getAnimationName(styles) {
  return styles?.animationName || "none";
}
__name10(getAnimationName, "getAnimationName");
function getElementRef2(element) {
  let getter = Object.getOwnPropertyDescriptor(element.props, "ref")?.get;
  let mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.ref;
  }
  getter = Object.getOwnPropertyDescriptor(element, "ref")?.get;
  mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.props.ref;
  }
  return element.props.ref || element.ref;
}
__name10(getElementRef2, "getElementRef");

// node_modules/@radix-ui/react-id/dist/index.mjs
import * as React11 from "react";
var __defProp11 = Object.defineProperty;
var __name11 = (target, value) => __defProp11(target, "name", { value, configurable: true });
var useReactId = React11[" useId ".trim().toString()] || (() => void 0);
var count = 0;
function useId(deterministicId) {
  const [id, setId] = React11.useState(useReactId());
  useLayoutEffect2(() => {
    if (!deterministicId) setId((reactId) => reactId ?? String(count++));
  }, [deterministicId]);
  return deterministicId || (id ? `radix-${id}` : "");
}
__name11(useId, "useId");

// node_modules/@radix-ui/react-collapsible/dist/index.mjs
import { jsx as jsx6 } from "react/jsx-runtime";
var __defProp12 = Object.defineProperty;
var __name12 = (target, value) => __defProp12(target, "name", { value, configurable: true });
var COLLAPSIBLE_NAME = "Collapsible";
var [createCollapsibleContext, createCollapsibleScope] = createContextScope(COLLAPSIBLE_NAME);
var [CollapsibleProvider, useCollapsibleContext] = createCollapsibleContext(COLLAPSIBLE_NAME);
var Collapsible = /* @__PURE__ */ React12.forwardRef(
  /* @__PURE__ */ __name12(function Collapsible2(props, forwardedRef) {
    const {
      __scopeCollapsible,
      open: openProp,
      defaultOpen,
      disabled,
      onOpenChange,
      ...collapsibleProps
    } = props;
    const [open, setOpen] = useControllableState({
      prop: openProp,
      defaultProp: defaultOpen ?? false,
      onChange: onOpenChange,
      caller: COLLAPSIBLE_NAME
    });
    return /* @__PURE__ */ jsx6(
      CollapsibleProvider,
      {
        scope: __scopeCollapsible,
        disabled,
        contentId: useId(),
        open,
        onOpenToggle: React12.useCallback(() => setOpen((prevOpen) => !prevOpen), [setOpen]),
        children: /* @__PURE__ */ jsx6(
          Primitive.div,
          {
            "data-state": getState(open),
            "data-disabled": disabled ? "" : void 0,
            ...collapsibleProps,
            ref: forwardedRef
          }
        )
      }
    );
  }, "Collapsible")
);
var TRIGGER_NAME = "CollapsibleTrigger";
var CollapsibleTrigger = /* @__PURE__ */ React12.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ __name12(function CollapsibleTrigger2(props, forwardedRef) {
    const { __scopeCollapsible, ...triggerProps } = props;
    const context = useCollapsibleContext(TRIGGER_NAME, __scopeCollapsible);
    return /* @__PURE__ */ jsx6(
      Primitive.button,
      {
        type: "button",
        "aria-controls": context.open ? context.contentId : void 0,
        "aria-expanded": context.open || false,
        "data-state": getState(context.open),
        "data-disabled": context.disabled ? "" : void 0,
        disabled: context.disabled,
        ...triggerProps,
        ref: forwardedRef,
        onClick: composeEventHandlers(props.onClick, context.onOpenToggle)
      }
    );
  }, "CollapsibleTrigger")
);
var CONTENT_NAME = "CollapsibleContent";
var CollapsibleContent = /* @__PURE__ */ React12.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ __name12(function CollapsibleContent2(props, forwardedRef) {
    const { forceMount, ...contentProps } = props;
    const context = useCollapsibleContext(CONTENT_NAME, props.__scopeCollapsible);
    return /* @__PURE__ */ jsx6(Presence, { present: forceMount || context.open, children: ({ present }) => /* @__PURE__ */ jsx6(CollapsibleContentImpl, { ...contentProps, ref: forwardedRef, present }) });
  }, "CollapsibleContent")
);
var CollapsibleContentImpl = /* @__PURE__ */ React12.forwardRef(/* @__PURE__ */ __name12(function CollapsibleContentImpl2(props, forwardedRef) {
  const { __scopeCollapsible, present, children, ...contentProps } = props;
  const context = useCollapsibleContext(CONTENT_NAME, __scopeCollapsible);
  const [isPresent, setIsPresent] = React12.useState(present);
  const ref = React12.useRef(null);
  const composedRefs = useComposedRefs(forwardedRef, ref);
  const heightRef = React12.useRef(0);
  const height = heightRef.current;
  const widthRef = React12.useRef(0);
  const width = widthRef.current;
  const isOpen = context.open || isPresent;
  const isMountAnimationPreventedRef = React12.useRef(isOpen);
  const originalStylesRef = React12.useRef(void 0);
  React12.useEffect(() => {
    const rAF = requestAnimationFrame(() => isMountAnimationPreventedRef.current = false);
    return () => cancelAnimationFrame(rAF);
  }, []);
  useLayoutEffect2(() => {
    const node = ref.current;
    if (node) {
      originalStylesRef.current = originalStylesRef.current || {
        transitionDuration: node.style.transitionDuration,
        animationName: node.style.animationName
      };
      node.style.transitionDuration = "0s";
      node.style.animationName = "none";
      const rect2 = node.getBoundingClientRect();
      heightRef.current = rect2.height;
      widthRef.current = rect2.width;
      if (!isMountAnimationPreventedRef.current) {
        node.style.transitionDuration = originalStylesRef.current.transitionDuration;
        node.style.animationName = originalStylesRef.current.animationName;
      }
      setIsPresent(present);
    }
  }, [context.open, present]);
  return /* @__PURE__ */ jsx6(
    Primitive.div,
    {
      "data-state": getState(context.open),
      "data-disabled": context.disabled ? "" : void 0,
      id: context.contentId,
      hidden: !isOpen,
      ...contentProps,
      ref: composedRefs,
      style: {
        [`--radix-collapsible-content-height`]: height ? `${height}px` : void 0,
        [`--radix-collapsible-content-width`]: width ? `${width}px` : void 0,
        ...props.style
      },
      children: isOpen && children
    }
  );
}, "CollapsibleContentImpl"));
function getState(open) {
  return open ? "open" : "closed";
}
__name12(getState, "getState");

// node_modules/@radix-ui/react-direction/dist/index.mjs
import * as React13 from "react";
import { jsx as jsx7 } from "react/jsx-runtime";
var __defProp13 = Object.defineProperty;
var __name13 = (target, value) => __defProp13(target, "name", { value, configurable: true });
var Direction = {
  LTR: "ltr",
  RTL: "rtl"
};
var DirectionContext = React13.createContext(void 0);
function useDirection(localDir) {
  const globalDir = React13.useContext(DirectionContext);
  return localDir || globalDir || Direction.LTR;
}
__name13(useDirection, "useDirection");

// node_modules/@radix-ui/react-dismissable-layer/dist/index.mjs
import * as React15 from "react";

// node_modules/@radix-ui/react-use-callback-ref/dist/index.mjs
import * as React14 from "react";
var __defProp14 = Object.defineProperty;
var __name14 = (target, value) => __defProp14(target, "name", { value, configurable: true });
var useReactInsertionEffect2 = React14[" useInsertionEffect ".trim().toString()];
function useCallbackRef(callback) {
  const callbackRef = React14.useRef(callback);
  if (typeof useReactInsertionEffect2 === "function") {
    useReactInsertionEffect2(() => {
      callbackRef.current = callback;
    });
  } else {
    useLayoutEffect2(() => {
      callbackRef.current = callback;
    });
  }
  return React14.useMemo(() => ((...args) => callbackRef.current?.(...args)), []);
}
__name14(useCallbackRef, "useCallbackRef");

// node_modules/@radix-ui/react-dismissable-layer/dist/index.mjs
import { jsx as jsx8 } from "react/jsx-runtime";
var __defProp15 = Object.defineProperty;
var __name15 = (target, value) => __defProp15(target, "name", { value, configurable: true });
var CONTEXT_UPDATE = "dismissableLayer.update";
var POINTER_DOWN_OUTSIDE = "dismissableLayer.pointerDownOutside";
var FOCUS_OUTSIDE = "dismissableLayer.focusOutside";
var originalBodyPointerEvents;
var DismissableLayerContext = React15.createContext({
  layers: /* @__PURE__ */ new Set(),
  layersWithOutsidePointerEventsDisabled: /* @__PURE__ */ new Set(),
  branches: /* @__PURE__ */ new Set(),
  // Outside elements that belong to a layer's own dismiss affordance (eg, a
  // dialog overlay). Pressing them should dismiss the layer regardless of
  // whether or not they stop propagation.
  //
  // See https://github.com/radix-ui/primitives/issues/3346
  dismissableSurfaces: /* @__PURE__ */ new Set()
});
var DismissableLayer = /* @__PURE__ */ React15.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ __name15(function DismissableLayer2(props, forwardedRef) {
    const {
      disableOutsidePointerEvents = false,
      deferPointerDownOutside = false,
      onEscapeKeyDown,
      onPointerDownOutside,
      onFocusOutside,
      onInteractOutside,
      onDismiss,
      ...layerProps
    } = props;
    const context = React15.useContext(DismissableLayerContext);
    const [node, setNode] = React15.useState(null);
    const ownerDocument = node?.ownerDocument ?? globalThis?.document;
    const [, force] = React15.useState({});
    const composedRefs = useComposedRefs(forwardedRef, setNode);
    const layers = Array.from(context.layers);
    const [highestLayerWithOutsidePointerEventsDisabled] = [
      ...context.layersWithOutsidePointerEventsDisabled
    ].slice(-1);
    const highestLayerWithOutsidePointerEventsDisabledIndex = highestLayerWithOutsidePointerEventsDisabled ? layers.indexOf(highestLayerWithOutsidePointerEventsDisabled) : -1;
    const index2 = node ? layers.indexOf(node) : -1;
    const isBodyPointerEventsDisabled = context.layersWithOutsidePointerEventsDisabled.size > 0;
    const isPointerEventsEnabled = index2 >= highestLayerWithOutsidePointerEventsDisabledIndex;
    const isDeferredPointerDownOutsideRef = React15.useRef(false);
    const pointerDownOutside = usePointerDownOutside(
      (event) => {
        onPointerDownOutside?.(event);
        onInteractOutside?.(event);
        if (!event.defaultPrevented) onDismiss?.();
      },
      {
        ownerDocument,
        deferPointerDownOutside,
        isDeferredPointerDownOutsideRef,
        dismissableSurfaces: context.dismissableSurfaces,
        shouldHandlePointerDownOutside: React15.useCallback(
          (target) => {
            if (!(target instanceof Node)) {
              return false;
            }
            const isPointerDownOnBranch = [...context.branches].some(
              (branch) => branch.contains(target)
            );
            return isPointerEventsEnabled && !isPointerDownOnBranch;
          },
          [context.branches, isPointerEventsEnabled]
        )
      }
    );
    const focusOutside = useFocusOutside((event) => {
      if (deferPointerDownOutside && isDeferredPointerDownOutsideRef.current) {
        return;
      }
      const target = event.target;
      const isFocusInBranch = [...context.branches].some((branch) => branch.contains(target));
      if (isFocusInBranch) return;
      onFocusOutside?.(event);
      onInteractOutside?.(event);
      if (!event.defaultPrevented) onDismiss?.();
    }, ownerDocument);
    const isHighestLayer = node ? index2 === layers.length - 1 : false;
    const handleKeyDown = useCallbackRef((event) => {
      if (event.key !== "Escape") {
        return;
      }
      onEscapeKeyDown?.(event);
      if (!event.defaultPrevented && onDismiss) {
        event.preventDefault();
        onDismiss();
      }
    });
    React15.useEffect(() => {
      if (!isHighestLayer) {
        return;
      }
      ownerDocument.addEventListener("keydown", handleKeyDown, { capture: true });
      return () => ownerDocument.removeEventListener("keydown", handleKeyDown, { capture: true });
    }, [ownerDocument, isHighestLayer, handleKeyDown]);
    React15.useEffect(() => {
      if (!node) return;
      if (disableOutsidePointerEvents) {
        if (context.layersWithOutsidePointerEventsDisabled.size === 0) {
          originalBodyPointerEvents = ownerDocument.body.style.pointerEvents;
          ownerDocument.body.style.pointerEvents = "none";
        }
        context.layersWithOutsidePointerEventsDisabled.add(node);
      }
      context.layers.add(node);
      dispatchUpdate();
      return () => {
        if (disableOutsidePointerEvents) {
          context.layersWithOutsidePointerEventsDisabled.delete(node);
          if (context.layersWithOutsidePointerEventsDisabled.size === 0) {
            ownerDocument.body.style.pointerEvents = originalBodyPointerEvents;
          }
        }
      };
    }, [node, ownerDocument, disableOutsidePointerEvents, context]);
    React15.useEffect(() => {
      return () => {
        if (!node) return;
        context.layers.delete(node);
        context.layersWithOutsidePointerEventsDisabled.delete(node);
        dispatchUpdate();
      };
    }, [node, context]);
    React15.useEffect(() => {
      const handleUpdate = /* @__PURE__ */ __name15(() => force({}), "handleUpdate");
      document.addEventListener(CONTEXT_UPDATE, handleUpdate);
      return () => document.removeEventListener(CONTEXT_UPDATE, handleUpdate);
    }, []);
    return /* @__PURE__ */ jsx8(
      Primitive.div,
      {
        ...layerProps,
        ref: composedRefs,
        style: {
          pointerEvents: isBodyPointerEventsDisabled ? isPointerEventsEnabled ? "auto" : "none" : void 0,
          ...props.style
        },
        onFocusCapture: composeEventHandlers(props.onFocusCapture, focusOutside.onFocusCapture),
        onBlurCapture: composeEventHandlers(props.onBlurCapture, focusOutside.onBlurCapture),
        onPointerDownCapture: composeEventHandlers(
          props.onPointerDownCapture,
          pointerDownOutside.onPointerDownCapture
        )
      }
    );
  }, "DismissableLayer")
);
function useDismissableLayerSurface() {
  const context = React15.useContext(DismissableLayerContext);
  const [node, setNode] = React15.useState(null);
  React15.useEffect(() => {
    if (!node) {
      return;
    }
    context.dismissableSurfaces.add(node);
    return () => {
      context.dismissableSurfaces.delete(node);
    };
  }, [node, context.dismissableSurfaces]);
  return setNode;
}
__name15(useDismissableLayerSurface, "useDismissableLayerSurface");
var IS_TRUE = /* @__PURE__ */ __name15(() => true, "IS_TRUE");
function usePointerDownOutside(onPointerDownOutside, args) {
  const {
    ownerDocument = globalThis?.document,
    deferPointerDownOutside = false,
    isDeferredPointerDownOutsideRef,
    dismissableSurfaces,
    shouldHandlePointerDownOutside = IS_TRUE
  } = args;
  const handlePointerDownOutside = useCallbackRef(onPointerDownOutside);
  const isPointerInsideReactTreeRef = React15.useRef(false);
  const isPointerDownOutsideRef = React15.useRef(false);
  const interceptedOutsideInteractionEventsRef = React15.useRef(/* @__PURE__ */ new Map());
  const handleClickRef = React15.useRef(() => {
  });
  React15.useEffect(() => {
    function resetOutsideInteraction() {
      isPointerDownOutsideRef.current = false;
      isDeferredPointerDownOutsideRef.current = false;
      interceptedOutsideInteractionEventsRef.current.clear();
    }
    __name15(resetOutsideInteraction, "resetOutsideInteraction");
    function isOutsideInteractionIntercepted() {
      return Array.from(interceptedOutsideInteractionEventsRef.current.values()).some(Boolean);
    }
    __name15(isOutsideInteractionIntercepted, "isOutsideInteractionIntercepted");
    function handleInteractionCapture(event) {
      if (!isPointerDownOutsideRef.current) {
        return;
      }
      const target = event.target;
      const isDismissableSurface = target instanceof Node && [...dismissableSurfaces].some((surface) => surface.contains(target));
      if (!isDismissableSurface) {
        interceptedOutsideInteractionEventsRef.current.set(event.type, true);
      }
      if (event.type === "click") {
        window.setTimeout(() => {
          if (isPointerDownOutsideRef.current) {
            handleClickRef.current();
          }
        }, 0);
      }
    }
    __name15(handleInteractionCapture, "handleInteractionCapture");
    function handleInteractionBubble(event) {
      if (isPointerDownOutsideRef.current) {
        interceptedOutsideInteractionEventsRef.current.set(event.type, false);
      }
    }
    __name15(handleInteractionBubble, "handleInteractionBubble");
    const handlePointerDown = /* @__PURE__ */ __name15((event) => {
      if (event.target && !isPointerInsideReactTreeRef.current) {
        let handleAndDispatchPointerDownOutsideEvent2 = function() {
          ownerDocument.removeEventListener("click", handleClickRef.current);
          const wasOutsideInteractionIntercepted = isOutsideInteractionIntercepted();
          resetOutsideInteraction();
          if (!wasOutsideInteractionIntercepted) {
            handleAndDispatchCustomEvent(
              POINTER_DOWN_OUTSIDE,
              handlePointerDownOutside,
              eventDetail,
              { discrete: true }
            );
          }
        };
        var handleAndDispatchPointerDownOutsideEvent = handleAndDispatchPointerDownOutsideEvent2;
        __name15(handleAndDispatchPointerDownOutsideEvent2, "handleAndDispatchPointerDownOutsideEvent");
        if (!shouldHandlePointerDownOutside(event.target)) {
          ownerDocument.removeEventListener("click", handleClickRef.current);
          resetOutsideInteraction();
          isPointerInsideReactTreeRef.current = false;
          return;
        }
        const eventDetail = { originalEvent: event };
        isPointerDownOutsideRef.current = true;
        isDeferredPointerDownOutsideRef.current = deferPointerDownOutside && event.button === 0;
        interceptedOutsideInteractionEventsRef.current.clear();
        if (!deferPointerDownOutside || event.button !== 0) {
          handleAndDispatchPointerDownOutsideEvent2();
        } else {
          ownerDocument.removeEventListener("click", handleClickRef.current);
          handleClickRef.current = handleAndDispatchPointerDownOutsideEvent2;
          ownerDocument.addEventListener("click", handleClickRef.current, { once: true });
        }
      } else {
        ownerDocument.removeEventListener("click", handleClickRef.current);
        resetOutsideInteraction();
      }
      isPointerInsideReactTreeRef.current = false;
    }, "handlePointerDown");
    const outsideInteractionEvents = [
      "pointerup",
      "mousedown",
      "mouseup",
      "touchstart",
      "touchend",
      "click"
    ];
    for (const eventName of outsideInteractionEvents) {
      ownerDocument.addEventListener(eventName, handleInteractionCapture, true);
      ownerDocument.addEventListener(eventName, handleInteractionBubble);
    }
    const timerId = window.setTimeout(() => {
      ownerDocument.addEventListener("pointerdown", handlePointerDown);
    }, 0);
    return () => {
      window.clearTimeout(timerId);
      ownerDocument.removeEventListener("pointerdown", handlePointerDown);
      ownerDocument.removeEventListener("click", handleClickRef.current);
      for (const eventName of outsideInteractionEvents) {
        ownerDocument.removeEventListener(eventName, handleInteractionCapture, true);
        ownerDocument.removeEventListener(eventName, handleInteractionBubble);
      }
    };
  }, [
    ownerDocument,
    handlePointerDownOutside,
    deferPointerDownOutside,
    isDeferredPointerDownOutsideRef,
    dismissableSurfaces,
    shouldHandlePointerDownOutside
  ]);
  return {
    // ensures we check React component tree (not just DOM tree)
    onPointerDownCapture: /* @__PURE__ */ __name15(() => isPointerInsideReactTreeRef.current = true, "onPointerDownCapture")
  };
}
__name15(usePointerDownOutside, "usePointerDownOutside");
function useFocusOutside(onFocusOutside, ownerDocument = globalThis?.document) {
  const handleFocusOutside = useCallbackRef(onFocusOutside);
  const isFocusInsideReactTreeRef = React15.useRef(false);
  React15.useEffect(() => {
    const handleFocus = /* @__PURE__ */ __name15((event) => {
      if (event.target && !isFocusInsideReactTreeRef.current) {
        const eventDetail = { originalEvent: event };
        handleAndDispatchCustomEvent(FOCUS_OUTSIDE, handleFocusOutside, eventDetail, {
          discrete: false
        });
      }
    }, "handleFocus");
    ownerDocument.addEventListener("focusin", handleFocus);
    return () => ownerDocument.removeEventListener("focusin", handleFocus);
  }, [ownerDocument, handleFocusOutside]);
  return {
    onFocusCapture: /* @__PURE__ */ __name15(() => isFocusInsideReactTreeRef.current = true, "onFocusCapture"),
    onBlurCapture: /* @__PURE__ */ __name15(() => isFocusInsideReactTreeRef.current = false, "onBlurCapture")
  };
}
__name15(useFocusOutside, "useFocusOutside");
function dispatchUpdate() {
  const event = new CustomEvent(CONTEXT_UPDATE);
  document.dispatchEvent(event);
}
__name15(dispatchUpdate, "dispatchUpdate");
function handleAndDispatchCustomEvent(name, handler, detail, { discrete }) {
  const target = detail.originalEvent.target;
  const event = new CustomEvent(name, { bubbles: false, cancelable: true, detail });
  if (handler) target.addEventListener(name, handler, { once: true });
  if (discrete) {
    dispatchDiscreteCustomEvent(target, event);
  } else {
    target.dispatchEvent(event);
  }
}
__name15(handleAndDispatchCustomEvent, "handleAndDispatchCustomEvent");

// node_modules/@radix-ui/react-focus-scope/dist/index.mjs
import * as React16 from "react";
import { jsx as jsx9 } from "react/jsx-runtime";
var __defProp16 = Object.defineProperty;
var __name16 = (target, value) => __defProp16(target, "name", { value, configurable: true });
var FocusScopeBranchContext = React16.createContext(null);
function FocusScopeBranchProvider({ registry, children }) {
  if (!registry) {
    return children;
  }
  return /* @__PURE__ */ jsx9(FocusScopeBranchContext.Provider, { value: registry, children });
}
__name16(FocusScopeBranchProvider, "FocusScopeBranchProvider");
function useFocusScopeBranchRegistry() {
  const [nodes, setNodes] = React16.useState([]);
  const registry = React16.useMemo(
    () => ({
      add: /* @__PURE__ */ __name16((node) => setNodes((prev) => prev.includes(node) ? prev : [...prev, node]), "add"),
      remove: /* @__PURE__ */ __name16((node) => setNodes((prev) => prev.filter((current) => current !== node)), "remove")
    }),
    []
  );
  return { nodes, registry };
}
__name16(useFocusScopeBranchRegistry, "useFocusScopeBranchRegistry");
function useFocusScopeBranch(node) {
  const registry = React16.useContext(FocusScopeBranchContext);
  React16.useEffect(() => {
    if (!node || !registry) return;
    registry.add(node);
    return () => registry.remove(node);
  }, [node, registry]);
}
__name16(useFocusScopeBranch, "useFocusScopeBranch");
function focusFirst(candidates, { select = false } = {}) {
  const previouslyFocusedElement = document.activeElement;
  for (const candidate of candidates) {
    focus(candidate, { select });
    if (document.activeElement !== previouslyFocusedElement) return;
  }
}
__name16(focusFirst, "focusFirst");
function getTabbableEdges(container) {
  const candidates = getTabbableCandidates(container);
  const first = findVisible(candidates, container);
  const last = findVisible(candidates.reverse(), container);
  return [first, last];
}
__name16(getTabbableEdges, "getTabbableEdges");
function getTabbableCandidates(container) {
  const nodes = [];
  const document2 = container.ownerDocument;
  const walker = document2.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
    acceptNode: /* @__PURE__ */ __name16((node) => {
      const isHiddenInput = node.tagName === "INPUT" && node.type === "hidden";
      if (node.disabled || node.hidden || isHiddenInput) {
        return NodeFilter.FILTER_SKIP;
      }
      return node.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }, "acceptNode")
  });
  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }
  return nodes;
}
__name16(getTabbableCandidates, "getTabbableCandidates");
function findVisible(elements, container) {
  const canUseCheckVisibility = typeof container.checkVisibility === "function" && container.checkVisibility({ checkVisibilityCSS: true });
  for (const element of elements) {
    const hidden2 = canUseCheckVisibility ? !element.checkVisibility({ checkVisibilityCSS: true }) : isHidden(element, { upTo: container });
    if (!hidden2) {
      return element;
    }
  }
}
__name16(findVisible, "findVisible");
function isHidden(node, { upTo }) {
  if (getComputedStyle(node).visibility === "hidden") return true;
  while (node) {
    if (upTo !== void 0 && node === upTo) return false;
    if (getComputedStyle(node).display === "none") return true;
    node = node.parentElement;
  }
  return false;
}
__name16(isHidden, "isHidden");
function isSelectableInput(element) {
  return element.tagName === "INPUT" && typeof element.select === "function";
}
__name16(isSelectableInput, "isSelectableInput");
function focus(element, { select = false } = {}) {
  if (element && element.focus) {
    const ownerDocument = element.ownerDocument ?? document;
    const previouslyFocusedElement = ownerDocument.activeElement;
    element.focus({ preventScroll: true });
    if (element !== previouslyFocusedElement && isSelectableInput(element) && select)
      element.select();
  }
}
__name16(focus, "focus");
var focusScopesStack = createFocusScopesStack();
function createFocusScopesStack() {
  let stack = [];
  return {
    add(focusScope) {
      const activeFocusScope = stack[0];
      if (focusScope !== activeFocusScope) {
        activeFocusScope?.pause();
      }
      stack = arrayRemove(stack, focusScope);
      stack.unshift(focusScope);
    },
    remove(focusScope) {
      stack = arrayRemove(stack, focusScope);
      stack[0]?.resume();
    }
  };
}
__name16(createFocusScopesStack, "createFocusScopesStack");
function arrayRemove(array, item) {
  const updatedArray = [...array];
  const index2 = updatedArray.indexOf(item);
  if (index2 !== -1) {
    updatedArray.splice(index2, 1);
  }
  return updatedArray;
}
__name16(arrayRemove, "arrayRemove");
function removeLinks(items) {
  return items.filter((item) => item.tagName !== "A");
}
__name16(removeLinks, "removeLinks");

// node_modules/@radix-ui/react-portal/dist/index.mjs
import * as React17 from "react";
import * as ReactDOM2 from "react-dom";
import { jsx as jsx10 } from "react/jsx-runtime";
var __defProp17 = Object.defineProperty;
var __name17 = (target, value) => __defProp17(target, "name", { value, configurable: true });
var Portal = /* @__PURE__ */ React17.forwardRef(
  /* @__PURE__ */ __name17(function Portal2(props, forwardedRef) {
    const { container: containerProp, ...portalProps } = props;
    const [mounted2, setMounted] = React17.useState(false);
    useLayoutEffect2(() => setMounted(true), []);
    const container = containerProp || mounted2 && globalThis?.document?.body;
    return container ? ReactDOM2.createPortal(/* @__PURE__ */ jsx10(Primitive.div, { ...portalProps, ref: forwardedRef }), container) : null;
  }, "Portal")
);

// node_modules/@radix-ui/react-use-size/dist/index.mjs
import * as React18 from "react";
var __defProp18 = Object.defineProperty;
var __name18 = (target, value) => __defProp18(target, "name", { value, configurable: true });
function useSize(element) {
  const [size4, setSize] = React18.useState(void 0);
  useLayoutEffect2(() => {
    if (element) {
      setSize({ width: element.offsetWidth, height: element.offsetHeight });
      let rAF = 0;
      const resizeObserver = new ResizeObserver((entries) => {
        if (!Array.isArray(entries)) {
          return;
        }
        if (!entries.length) {
          return;
        }
        const entry = entries[0];
        window.cancelAnimationFrame(rAF);
        rAF = window.requestAnimationFrame(() => {
          let width;
          let height;
          if ("borderBoxSize" in entry) {
            const borderSizeEntry = entry["borderBoxSize"];
            const borderSize = Array.isArray(borderSizeEntry) ? borderSizeEntry[0] : borderSizeEntry;
            width = borderSize["inlineSize"];
            height = borderSize["blockSize"];
          } else {
            width = element.offsetWidth;
            height = element.offsetHeight;
          }
          setSize({ width, height });
        });
      });
      resizeObserver.observe(element, { box: "border-box" });
      return () => {
        window.cancelAnimationFrame(rAF);
        resizeObserver.unobserve(element);
      };
    } else {
      setSize(void 0);
    }
  }, [element]);
  return size4;
}
__name18(useSize, "useSize");

// node_modules/@radix-ui/react-popper/dist/index.mjs
import * as React21 from "react";

// node_modules/@floating-ui/utils/dist/floating-ui.utils.mjs
var sides = ["top", "right", "bottom", "left"];
var min = Math.min;
var max = Math.max;
var round = Math.round;
var floor = Math.floor;
var createCoords = (v) => ({
  x: v,
  y: v
});
var oppositeSideMap = {
  left: "right",
  right: "left",
  bottom: "top",
  top: "bottom"
};
function clamp(start, value, end) {
  return max(start, min(value, end));
}
function evaluate(value, param) {
  return typeof value === "function" ? value(param) : value;
}
function getSide(placement) {
  return placement.split("-")[0];
}
function getAlignment(placement) {
  return placement.split("-")[1];
}
function getOppositeAxis(axis) {
  return axis === "x" ? "y" : "x";
}
function getAxisLength(axis) {
  return axis === "y" ? "height" : "width";
}
function getSideAxis(placement) {
  const firstChar = placement[0];
  return firstChar === "t" || firstChar === "b" ? "y" : "x";
}
function getAlignmentAxis(placement) {
  return getOppositeAxis(getSideAxis(placement));
}
function getAlignmentSides(placement, rects, rtl) {
  if (rtl === void 0) {
    rtl = false;
  }
  const alignment = getAlignment(placement);
  const alignmentAxis = getAlignmentAxis(placement);
  const length = getAxisLength(alignmentAxis);
  let mainAlignmentSide = alignmentAxis === "x" ? alignment === (rtl ? "end" : "start") ? "right" : "left" : alignment === "start" ? "bottom" : "top";
  if (rects.reference[length] > rects.floating[length]) {
    mainAlignmentSide = getOppositePlacement(mainAlignmentSide);
  }
  return [mainAlignmentSide, getOppositePlacement(mainAlignmentSide)];
}
function getExpandedPlacements(placement) {
  const oppositePlacement = getOppositePlacement(placement);
  return [getOppositeAlignmentPlacement(placement), oppositePlacement, getOppositeAlignmentPlacement(oppositePlacement)];
}
function getOppositeAlignmentPlacement(placement) {
  return placement.includes("start") ? placement.replace("start", "end") : placement.replace("end", "start");
}
var lrPlacement = ["left", "right"];
var rlPlacement = ["right", "left"];
var tbPlacement = ["top", "bottom"];
var btPlacement = ["bottom", "top"];
function getSideList(side, isStart, rtl) {
  switch (side) {
    case "top":
    case "bottom":
      if (rtl) return isStart ? rlPlacement : lrPlacement;
      return isStart ? lrPlacement : rlPlacement;
    case "left":
    case "right":
      return isStart ? tbPlacement : btPlacement;
    default:
      return [];
  }
}
function getOppositeAxisPlacements(placement, flipAlignment, direction, rtl) {
  const alignment = getAlignment(placement);
  let list = getSideList(getSide(placement), direction === "start", rtl);
  if (alignment) {
    list = list.map((side) => side + "-" + alignment);
    if (flipAlignment) {
      list = list.concat(list.map(getOppositeAlignmentPlacement));
    }
  }
  return list;
}
function getOppositePlacement(placement) {
  const side = getSide(placement);
  return oppositeSideMap[side] + placement.slice(side.length);
}
function expandPaddingObject(padding) {
  var _padding$top, _padding$right, _padding$bottom, _padding$left;
  return {
    top: (_padding$top = padding.top) != null ? _padding$top : 0,
    right: (_padding$right = padding.right) != null ? _padding$right : 0,
    bottom: (_padding$bottom = padding.bottom) != null ? _padding$bottom : 0,
    left: (_padding$left = padding.left) != null ? _padding$left : 0
  };
}
function getPaddingObject(padding) {
  return typeof padding !== "number" ? expandPaddingObject(padding) : {
    top: padding,
    right: padding,
    bottom: padding,
    left: padding
  };
}
function rectToClientRect(rect2) {
  const {
    x,
    y,
    width,
    height
  } = rect2;
  return {
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    x,
    y
  };
}

// node_modules/@floating-ui/core/dist/floating-ui.core.mjs
function computeCoordsFromPlacement(_ref, placement, rtl) {
  let {
    reference,
    floating
  } = _ref;
  const sideAxis = getSideAxis(placement);
  const alignmentAxis = getAlignmentAxis(placement);
  const alignLength = getAxisLength(alignmentAxis);
  const side = getSide(placement);
  const isVertical = sideAxis === "y";
  const commonX = reference.x + reference.width / 2 - floating.width / 2;
  const commonY = reference.y + reference.height / 2 - floating.height / 2;
  const commonAlign = reference[alignLength] / 2 - floating[alignLength] / 2;
  let coords;
  switch (side) {
    case "top":
      coords = {
        x: commonX,
        y: reference.y - floating.height
      };
      break;
    case "bottom":
      coords = {
        x: commonX,
        y: reference.y + reference.height
      };
      break;
    case "right":
      coords = {
        x: reference.x + reference.width,
        y: commonY
      };
      break;
    case "left":
      coords = {
        x: reference.x - floating.width,
        y: commonY
      };
      break;
    default:
      coords = {
        x: reference.x,
        y: reference.y
      };
  }
  const alignment = getAlignment(placement);
  if (alignment) {
    coords[alignmentAxis] += commonAlign * (alignment === "end" ? 1 : -1) * (rtl && isVertical ? -1 : 1);
  }
  return coords;
}
async function detectOverflow(state, options) {
  var _await$platform$isEle;
  if (options === void 0) {
    options = {};
  }
  const {
    x,
    y,
    platform: platform2,
    rects,
    elements,
    strategy
  } = state;
  const {
    boundary = "clippingAncestors",
    rootBoundary = "viewport",
    elementContext = "floating",
    altBoundary = false,
    padding = 0
  } = evaluate(options, state);
  const paddingObject = getPaddingObject(padding);
  const altContext = elementContext === "floating" ? "reference" : "floating";
  const element = elements[altBoundary ? altContext : elementContext];
  const clippingClientRect = rectToClientRect(await platform2.getClippingRect({
    element: ((_await$platform$isEle = await (platform2.isElement == null ? void 0 : platform2.isElement(element))) != null ? _await$platform$isEle : true) ? element : element.contextElement || await (platform2.getDocumentElement == null ? void 0 : platform2.getDocumentElement(elements.floating)),
    boundary,
    rootBoundary,
    strategy
  }));
  const rect2 = elementContext === "floating" ? {
    x,
    y,
    width: rects.floating.width,
    height: rects.floating.height
  } : rects.reference;
  const offsetParent = await (platform2.getOffsetParent == null ? void 0 : platform2.getOffsetParent(elements.floating));
  const offsetScale = await (platform2.isElement == null ? void 0 : platform2.isElement(offsetParent)) && await (platform2.getScale == null ? void 0 : platform2.getScale(offsetParent)) || {
    x: 1,
    y: 1
  };
  const elementClientRect = rectToClientRect(platform2.convertOffsetParentRelativeRectToViewportRelativeRect ? await platform2.convertOffsetParentRelativeRectToViewportRelativeRect({
    elements,
    rect: rect2,
    offsetParent,
    strategy
  }) : rect2);
  return {
    top: (clippingClientRect.top - elementClientRect.top + paddingObject.top) / offsetScale.y,
    bottom: (elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom) / offsetScale.y,
    left: (clippingClientRect.left - elementClientRect.left + paddingObject.left) / offsetScale.x,
    right: (elementClientRect.right - clippingClientRect.right + paddingObject.right) / offsetScale.x
  };
}
var MAX_RESET_COUNT = 50;
var computePosition = async (reference, floating, config) => {
  const {
    placement = "bottom",
    strategy = "absolute",
    middleware = [],
    platform: platform2
  } = config;
  const platformWithDetectOverflow = platform2.detectOverflow ? platform2 : {
    ...platform2,
    detectOverflow
  };
  const rtl = await (platform2.isRTL == null ? void 0 : platform2.isRTL(floating));
  let rects = await platform2.getElementRects({
    reference,
    floating,
    strategy
  });
  let {
    x,
    y
  } = computeCoordsFromPlacement(rects, placement, rtl);
  let statefulPlacement = placement;
  let resetCount = 0;
  const middlewareData = {};
  for (let i = 0; i < middleware.length; i++) {
    const currentMiddleware = middleware[i];
    if (!currentMiddleware) {
      continue;
    }
    const {
      name,
      fn
    } = currentMiddleware;
    const {
      x: nextX,
      y: nextY,
      data,
      reset
    } = await fn({
      x,
      y,
      initialPlacement: placement,
      placement: statefulPlacement,
      strategy,
      middlewareData,
      rects,
      platform: platformWithDetectOverflow,
      elements: {
        reference,
        floating
      }
    });
    x = nextX != null ? nextX : x;
    y = nextY != null ? nextY : y;
    middlewareData[name] = {
      ...middlewareData[name],
      ...data
    };
    if (reset && resetCount < MAX_RESET_COUNT) {
      resetCount++;
      if (typeof reset === "object") {
        if (reset.placement) {
          statefulPlacement = reset.placement;
        }
        if (reset.rects) {
          rects = reset.rects === true ? await platform2.getElementRects({
            reference,
            floating,
            strategy
          }) : reset.rects;
        }
        ({
          x,
          y
        } = computeCoordsFromPlacement(rects, statefulPlacement, rtl));
      }
      i = -1;
    }
  }
  return {
    x,
    y,
    placement: statefulPlacement,
    strategy,
    middlewareData
  };
};
var arrow = (options) => ({
  name: "arrow",
  options,
  async fn(state) {
    const {
      x,
      y,
      placement,
      rects,
      platform: platform2,
      elements,
      middlewareData
    } = state;
    const {
      element,
      padding = 0
    } = evaluate(options, state) || {};
    if (element == null) {
      return {};
    }
    const paddingObject = getPaddingObject(padding);
    const coords = {
      x,
      y
    };
    const axis = getAlignmentAxis(placement);
    const length = getAxisLength(axis);
    const arrowDimensions = await platform2.getDimensions(element);
    const isYAxis = axis === "y";
    const minProp = isYAxis ? "top" : "left";
    const maxProp = isYAxis ? "bottom" : "right";
    const clientProp = isYAxis ? "clientHeight" : "clientWidth";
    const endDiff = rects.reference[length] + rects.reference[axis] - coords[axis] - rects.floating[length];
    const startDiff = coords[axis] - rects.reference[axis];
    const arrowOffsetParent = await (platform2.getOffsetParent == null ? void 0 : platform2.getOffsetParent(element));
    let clientSize = arrowOffsetParent ? arrowOffsetParent[clientProp] : 0;
    if (!clientSize || !await (platform2.isElement == null ? void 0 : platform2.isElement(arrowOffsetParent))) {
      clientSize = elements.floating[clientProp] || rects.floating[length];
    }
    const centerToReference = endDiff / 2 - startDiff / 2;
    const largestPossiblePadding = clientSize / 2 - arrowDimensions[length] / 2 - 1;
    const minPadding = min(paddingObject[minProp], largestPossiblePadding);
    const maxPadding = min(paddingObject[maxProp], largestPossiblePadding);
    const max2 = clientSize - arrowDimensions[length] - maxPadding;
    const center = clientSize / 2 - arrowDimensions[length] / 2 + centerToReference;
    const offset4 = clamp(minPadding, center, max2);
    const shouldAddOffset = !middlewareData.arrow && getAlignment(placement) != null && center !== offset4 && rects.reference[length] / 2 - (center < minPadding ? minPadding : maxPadding) - arrowDimensions[length] / 2 < 0;
    const alignmentOffset = shouldAddOffset ? center < minPadding ? center - minPadding : center - max2 : 0;
    return {
      [axis]: coords[axis] + alignmentOffset,
      data: {
        [axis]: offset4,
        centerOffset: center - offset4 - alignmentOffset,
        ...shouldAddOffset && {
          alignmentOffset
        }
      },
      reset: shouldAddOffset
    };
  }
});
var flip = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: "flip",
    options,
    async fn(state) {
      var _middlewareData$arrow, _middlewareData$flip;
      const {
        placement,
        middlewareData,
        rects,
        initialPlacement,
        platform: platform2,
        elements
      } = state;
      const {
        mainAxis: checkMainAxis = true,
        crossAxis: checkCrossAxis = true,
        fallbackPlacements: specifiedFallbackPlacements,
        fallbackStrategy = "bestFit",
        fallbackAxisSideDirection = "none",
        flipAlignment = true,
        ...detectOverflowOptions
      } = evaluate(options, state);
      if ((_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) {
        return {};
      }
      const side = getSide(placement);
      const initialSideAxis = getSideAxis(initialPlacement);
      const isBasePlacement = getSide(initialPlacement) === initialPlacement;
      const rtl = await (platform2.isRTL == null ? void 0 : platform2.isRTL(elements.floating));
      const fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipAlignment ? [getOppositePlacement(initialPlacement)] : getExpandedPlacements(initialPlacement));
      const hasFallbackAxisSideDirection = fallbackAxisSideDirection !== "none";
      if (!specifiedFallbackPlacements && hasFallbackAxisSideDirection) {
        fallbackPlacements.push(...getOppositeAxisPlacements(initialPlacement, flipAlignment, fallbackAxisSideDirection, rtl));
      }
      const placements2 = [initialPlacement, ...fallbackPlacements];
      const overflow = await platform2.detectOverflow(state, detectOverflowOptions);
      const overflows = [];
      let overflowsData = ((_middlewareData$flip = middlewareData.flip) == null ? void 0 : _middlewareData$flip.overflows) || [];
      if (checkMainAxis) {
        overflows.push(overflow[side]);
      }
      if (checkCrossAxis) {
        const sides2 = getAlignmentSides(placement, rects, rtl);
        overflows.push(overflow[sides2[0]], overflow[sides2[1]]);
      }
      overflowsData = [...overflowsData, {
        placement,
        overflows
      }];
      if (!overflows.every((side2) => side2 <= 0)) {
        var _middlewareData$flip2, _overflowsData$filter;
        const nextIndex = (((_middlewareData$flip2 = middlewareData.flip) == null ? void 0 : _middlewareData$flip2.index) || 0) + 1;
        const nextPlacement = placements2[nextIndex];
        if (nextPlacement) {
          const ignoreCrossAxisOverflow = checkCrossAxis === "alignment" ? initialSideAxis !== getSideAxis(nextPlacement) : false;
          if (!ignoreCrossAxisOverflow || // We leave the current main axis only if every placement on that axis
          // overflows the main axis.
          overflowsData.every((d) => getSideAxis(d.placement) === initialSideAxis ? d.overflows[0] > 0 : true)) {
            return {
              data: {
                index: nextIndex,
                overflows: overflowsData
              },
              reset: {
                placement: nextPlacement
              }
            };
          }
        }
        let resetPlacement = (_overflowsData$filter = overflowsData.filter((d) => d.overflows[0] <= 0).sort((a, b) => a.overflows[1] - b.overflows[1])[0]) == null ? void 0 : _overflowsData$filter.placement;
        if (!resetPlacement) {
          switch (fallbackStrategy) {
            case "bestFit": {
              var _overflowsData$filter2;
              const placement2 = (_overflowsData$filter2 = overflowsData.filter((d) => {
                if (hasFallbackAxisSideDirection) {
                  const currentSideAxis = getSideAxis(d.placement);
                  return currentSideAxis === initialSideAxis || // Create a bias to the `y` side axis due to horizontal
                  // reading directions favoring greater width.
                  currentSideAxis === "y";
                }
                return true;
              }).map((d) => [d.placement, d.overflows.filter((overflow2) => overflow2 > 0).reduce((acc, overflow2) => acc + overflow2, 0)]).sort((a, b) => a[1] - b[1])[0]) == null ? void 0 : _overflowsData$filter2[0];
              if (placement2) {
                resetPlacement = placement2;
              }
              break;
            }
            case "initialPlacement":
              resetPlacement = initialPlacement;
              break;
          }
        }
        if (placement !== resetPlacement) {
          return {
            reset: {
              placement: resetPlacement
            }
          };
        }
      }
      return {};
    }
  };
};
function getSideOffsets(overflow, rect2) {
  return {
    top: overflow.top - rect2.height,
    right: overflow.right - rect2.width,
    bottom: overflow.bottom - rect2.height,
    left: overflow.left - rect2.width
  };
}
function isAnySideFullyClipped(overflow) {
  return sides.some((side) => overflow[side] >= 0);
}
var hide = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: "hide",
    options,
    async fn(state) {
      const {
        rects,
        platform: platform2
      } = state;
      const {
        strategy = "referenceHidden",
        ...detectOverflowOptions
      } = evaluate(options, state);
      switch (strategy) {
        case "referenceHidden": {
          const overflow = await platform2.detectOverflow(state, {
            ...detectOverflowOptions,
            elementContext: "reference"
          });
          const offsets = getSideOffsets(overflow, rects.reference);
          return {
            data: {
              referenceHiddenOffsets: offsets,
              referenceHidden: isAnySideFullyClipped(offsets)
            }
          };
        }
        case "escaped": {
          const overflow = await platform2.detectOverflow(state, {
            ...detectOverflowOptions,
            altBoundary: true
          });
          const offsets = getSideOffsets(overflow, rects.floating);
          return {
            data: {
              escapedOffsets: offsets,
              escaped: isAnySideFullyClipped(offsets)
            }
          };
        }
        default: {
          return {};
        }
      }
    }
  };
};
var originSides = /* @__PURE__ */ new Set(["left", "top"]);
async function convertValueToCoords(state, options) {
  const {
    placement,
    platform: platform2,
    elements
  } = state;
  const rtl = await (platform2.isRTL == null ? void 0 : platform2.isRTL(elements.floating));
  const side = getSide(placement);
  const alignment = getAlignment(placement);
  const isVertical = getSideAxis(placement) === "y";
  const mainAxisMulti = originSides.has(side) ? -1 : 1;
  const crossAxisMulti = rtl && isVertical ? -1 : 1;
  const rawValue = evaluate(options, state);
  let {
    mainAxis,
    crossAxis,
    alignmentAxis
  } = typeof rawValue === "number" ? {
    mainAxis: rawValue,
    crossAxis: 0,
    alignmentAxis: null
  } : {
    mainAxis: rawValue.mainAxis || 0,
    crossAxis: rawValue.crossAxis || 0,
    alignmentAxis: rawValue.alignmentAxis
  };
  if (alignment && typeof alignmentAxis === "number") {
    crossAxis = alignment === "end" ? alignmentAxis * -1 : alignmentAxis;
  }
  return isVertical ? {
    x: crossAxis * crossAxisMulti,
    y: mainAxis * mainAxisMulti
  } : {
    x: mainAxis * mainAxisMulti,
    y: crossAxis * crossAxisMulti
  };
}
var offset = function(options) {
  if (options === void 0) {
    options = 0;
  }
  return {
    name: "offset",
    options,
    async fn(state) {
      var _middlewareData$offse, _middlewareData$arrow;
      const {
        x,
        y,
        placement,
        middlewareData
      } = state;
      const diffCoords = await convertValueToCoords(state, options);
      if (placement === ((_middlewareData$offse = middlewareData.offset) == null ? void 0 : _middlewareData$offse.placement) && (_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) {
        return {};
      }
      return {
        x: x + diffCoords.x,
        y: y + diffCoords.y,
        data: {
          ...diffCoords,
          placement
        }
      };
    }
  };
};
var shift = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: "shift",
    options,
    async fn(state) {
      const {
        x,
        y,
        placement,
        platform: platform2
      } = state;
      const {
        mainAxis: checkMainAxis = true,
        crossAxis: checkCrossAxis = false,
        limiter = {
          fn: (_ref) => {
            let {
              x: x2,
              y: y2
            } = _ref;
            return {
              x: x2,
              y: y2
            };
          }
        },
        ...detectOverflowOptions
      } = evaluate(options, state);
      const coords = {
        x,
        y
      };
      const overflow = await platform2.detectOverflow(state, detectOverflowOptions);
      const crossAxis = getSideAxis(placement);
      const mainAxis = getOppositeAxis(crossAxis);
      let mainAxisCoord = coords[mainAxis];
      let crossAxisCoord = coords[crossAxis];
      const clampCoord = (axis, coord) => clamp(coord + overflow[axis === "y" ? "top" : "left"], coord, coord - overflow[axis === "y" ? "bottom" : "right"]);
      if (checkMainAxis) {
        mainAxisCoord = clampCoord(mainAxis, mainAxisCoord);
      }
      if (checkCrossAxis) {
        crossAxisCoord = clampCoord(crossAxis, crossAxisCoord);
      }
      const limitedCoords = limiter.fn({
        ...state,
        [mainAxis]: mainAxisCoord,
        [crossAxis]: crossAxisCoord
      });
      return {
        ...limitedCoords,
        data: {
          x: limitedCoords.x - x,
          y: limitedCoords.y - y,
          enabled: {
            [mainAxis]: checkMainAxis,
            [crossAxis]: checkCrossAxis
          }
        }
      };
    }
  };
};
var limitShift = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    options,
    fn(state) {
      var _rawOffset$mainAxis, _rawOffset$crossAxis;
      const {
        x,
        y,
        placement,
        rects,
        middlewareData
      } = state;
      const {
        offset: offset4 = 0,
        mainAxis: checkMainAxis = true,
        crossAxis: checkCrossAxis = true
      } = evaluate(options, state);
      const coords = {
        x,
        y
      };
      const crossAxis = getSideAxis(placement);
      const mainAxis = getOppositeAxis(crossAxis);
      let mainAxisCoord = coords[mainAxis];
      let crossAxisCoord = coords[crossAxis];
      const rawOffset = evaluate(offset4, state);
      const computedOffset = typeof rawOffset === "number" ? {
        mainAxis: rawOffset,
        crossAxis: 0
      } : {
        mainAxis: (_rawOffset$mainAxis = rawOffset.mainAxis) != null ? _rawOffset$mainAxis : 0,
        crossAxis: (_rawOffset$crossAxis = rawOffset.crossAxis) != null ? _rawOffset$crossAxis : 0
      };
      if (checkMainAxis) {
        const len = mainAxis === "y" ? "height" : "width";
        const limitMin = rects.reference[mainAxis] - rects.floating[len] + computedOffset.mainAxis;
        const limitMax = rects.reference[mainAxis] + rects.reference[len] - computedOffset.mainAxis;
        if (mainAxisCoord < limitMin) {
          mainAxisCoord = limitMin;
        } else if (mainAxisCoord > limitMax) {
          mainAxisCoord = limitMax;
        }
      }
      if (checkCrossAxis) {
        var _middlewareData$offse, _middlewareData$offse2;
        const len = mainAxis === "y" ? "width" : "height";
        const isOriginSide = originSides.has(getSide(placement));
        const limitMin = rects.reference[crossAxis] - rects.floating[len] + (isOriginSide ? ((_middlewareData$offse = middlewareData.offset) == null ? void 0 : _middlewareData$offse[crossAxis]) || 0 : 0) + (isOriginSide ? 0 : computedOffset.crossAxis);
        const limitMax = rects.reference[crossAxis] + rects.reference[len] + (isOriginSide ? 0 : ((_middlewareData$offse2 = middlewareData.offset) == null ? void 0 : _middlewareData$offse2[crossAxis]) || 0) - (isOriginSide ? computedOffset.crossAxis : 0);
        if (crossAxisCoord < limitMin) {
          crossAxisCoord = limitMin;
        } else if (crossAxisCoord > limitMax) {
          crossAxisCoord = limitMax;
        }
      }
      return {
        [mainAxis]: mainAxisCoord,
        [crossAxis]: crossAxisCoord
      };
    }
  };
};
var size = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: "size",
    options,
    async fn(state) {
      const {
        placement,
        rects,
        platform: platform2,
        elements
      } = state;
      const {
        apply = () => {
        },
        ...detectOverflowOptions
      } = evaluate(options, state);
      const overflow = await platform2.detectOverflow(state, detectOverflowOptions);
      const side = getSide(placement);
      const alignment = getAlignment(placement);
      const isYAxis = getSideAxis(placement) === "y";
      const {
        width,
        height
      } = rects.floating;
      let heightSide;
      let widthSide;
      if (side === "top" || side === "bottom") {
        heightSide = side;
        widthSide = alignment === (await (platform2.isRTL == null ? void 0 : platform2.isRTL(elements.floating)) ? "start" : "end") ? "left" : "right";
      } else {
        widthSide = side;
        heightSide = alignment === "end" ? "top" : "bottom";
      }
      const maximumClippingHeight = height - overflow.top - overflow.bottom;
      const maximumClippingWidth = width - overflow.left - overflow.right;
      const overflowAvailableHeight = min(height - overflow[heightSide], maximumClippingHeight);
      const overflowAvailableWidth = min(width - overflow[widthSide], maximumClippingWidth);
      const shiftData = state.middlewareData.shift;
      const noShift = !shiftData;
      let availableHeight = overflowAvailableHeight;
      let availableWidth = overflowAvailableWidth;
      if (shiftData != null && shiftData.enabled.x) {
        availableWidth = maximumClippingWidth;
      }
      if (shiftData != null && shiftData.enabled.y) {
        availableHeight = maximumClippingHeight;
      }
      if (noShift && !alignment) {
        if (isYAxis) {
          availableWidth = width - 2 * max(overflow.left, overflow.right);
        } else {
          availableHeight = height - 2 * max(overflow.top, overflow.bottom);
        }
      }
      await apply({
        ...state,
        availableWidth,
        availableHeight
      });
      const nextDimensions = await platform2.getDimensions(elements.floating);
      if (width !== nextDimensions.width || height !== nextDimensions.height) {
        return {
          reset: {
            rects: true
          }
        };
      }
      return {};
    }
  };
};

// node_modules/@floating-ui/utils/dist/floating-ui.utils.dom.mjs
function hasWindow() {
  return typeof window !== "undefined";
}
function getNodeName(node) {
  if (isNode(node)) {
    return (node.nodeName || "").toLowerCase();
  }
  return "#document";
}
function getWindow(node) {
  var _node$ownerDocument;
  return (node == null || (_node$ownerDocument = node.ownerDocument) == null ? void 0 : _node$ownerDocument.defaultView) || window;
}
function getDocumentElement(node) {
  var _ref;
  return (_ref = (isNode(node) ? node.ownerDocument : node.document) || window.document) == null ? void 0 : _ref.documentElement;
}
function isNode(value) {
  if (!hasWindow()) {
    return false;
  }
  return value instanceof Node || value instanceof getWindow(value).Node;
}
function isElement(value) {
  if (!hasWindow()) {
    return false;
  }
  return value instanceof Element || value instanceof getWindow(value).Element;
}
function isHTMLElement(value) {
  if (!hasWindow()) {
    return false;
  }
  return value instanceof HTMLElement || value instanceof getWindow(value).HTMLElement;
}
function isShadowRoot(value) {
  if (!hasWindow() || typeof ShadowRoot === "undefined") {
    return false;
  }
  return value instanceof ShadowRoot || value instanceof getWindow(value).ShadowRoot;
}
function isOverflowElement(element) {
  const {
    overflow,
    overflowX,
    overflowY,
    display
  } = getComputedStyle2(element);
  return /auto|scroll|overlay|hidden|clip/.test(overflow + overflowY + overflowX) && display !== "inline" && display !== "contents";
}
function isTableElement(element) {
  return /^(table|td|th)$/.test(getNodeName(element));
}
function isTopLayer(element) {
  try {
    if (element.matches(":popover-open")) {
      return true;
    }
  } catch (_e) {
  }
  try {
    return element.matches(":modal");
  } catch (_e) {
    return false;
  }
}
var willChangeRe = /transform|translate|scale|rotate|perspective|filter/;
var containRe = /paint|layout|strict|content/;
var isNotNone = (value) => !!value && value !== "none";
var isWebKitValue;
function isContainingBlock(elementOrCss) {
  const css = isElement(elementOrCss) ? getComputedStyle2(elementOrCss) : elementOrCss;
  return isNotNone(css.transform) || isNotNone(css.translate) || isNotNone(css.scale) || isNotNone(css.rotate) || isNotNone(css.perspective) || !isWebKit() && (isNotNone(css.backdropFilter) || isNotNone(css.filter)) || willChangeRe.test(css.willChange || "") || containRe.test(css.contain || "");
}
function getContainingBlock(element) {
  let currentNode = getParentNode(element);
  while (isHTMLElement(currentNode) && !isLastTraversableNode(currentNode)) {
    if (isContainingBlock(currentNode)) {
      return currentNode;
    } else if (isTopLayer(currentNode)) {
      return null;
    }
    currentNode = getParentNode(currentNode);
  }
  return null;
}
function isWebKit() {
  if (isWebKitValue == null) {
    isWebKitValue = typeof CSS !== "undefined" && CSS.supports && CSS.supports("-webkit-backdrop-filter", "none");
  }
  return isWebKitValue;
}
function isLastTraversableNode(node) {
  return /^(html|body|#document)$/.test(getNodeName(node));
}
function getComputedStyle2(element) {
  return getWindow(element).getComputedStyle(element);
}
function getNodeScroll(element) {
  if (isElement(element)) {
    return {
      scrollLeft: element.scrollLeft,
      scrollTop: element.scrollTop
    };
  }
  return {
    scrollLeft: element.scrollX,
    scrollTop: element.scrollY
  };
}
function getParentNode(node) {
  if (getNodeName(node) === "html") {
    return node;
  }
  const result = (
    // Step into the shadow DOM of the parent of a slotted node.
    node.assignedSlot || // DOM Element detected.
    node.parentNode || // ShadowRoot detected.
    isShadowRoot(node) && node.host || // Fallback.
    getDocumentElement(node)
  );
  return isShadowRoot(result) ? result.host : result;
}
function getNearestOverflowAncestor(node) {
  const parentNode = getParentNode(node);
  if (isLastTraversableNode(parentNode)) {
    return (node.ownerDocument || node).body;
  }
  if (isHTMLElement(parentNode) && isOverflowElement(parentNode)) {
    return parentNode;
  }
  return getNearestOverflowAncestor(parentNode);
}
function getOverflowAncestors(node, list, traverseIframes) {
  var _node$ownerDocument2;
  if (list === void 0) {
    list = [];
  }
  if (traverseIframes === void 0) {
    traverseIframes = true;
  }
  const scrollableAncestor = getNearestOverflowAncestor(node);
  const isBody = scrollableAncestor === ((_node$ownerDocument2 = node.ownerDocument) == null ? void 0 : _node$ownerDocument2.body);
  const win = getWindow(scrollableAncestor);
  if (isBody) {
    const frameElement = getFrameElement(win);
    return list.concat(win, win.visualViewport || [], isOverflowElement(scrollableAncestor) ? scrollableAncestor : [], frameElement && traverseIframes ? getOverflowAncestors(frameElement) : []);
  } else {
    return list.concat(scrollableAncestor, getOverflowAncestors(scrollableAncestor, [], traverseIframes));
  }
}
function getFrameElement(win) {
  return win.parent && Object.getPrototypeOf(win.parent) ? win.frameElement : null;
}

// node_modules/@floating-ui/dom/dist/floating-ui.dom.mjs
function getCssDimensions(element) {
  const css = getComputedStyle2(element);
  let width = parseFloat(css.width) || 0;
  let height = parseFloat(css.height) || 0;
  const hasOffset = isHTMLElement(element);
  const offsetWidth = hasOffset ? element.offsetWidth : width;
  const offsetHeight = hasOffset ? element.offsetHeight : height;
  const shouldFallback = round(width) !== offsetWidth || round(height) !== offsetHeight;
  if (shouldFallback) {
    width = offsetWidth;
    height = offsetHeight;
  }
  return {
    width,
    height,
    $: shouldFallback
  };
}
function unwrapElement(element) {
  return !isElement(element) ? element.contextElement : element;
}
function getScale(element) {
  const domElement = unwrapElement(element);
  if (!isHTMLElement(domElement)) {
    return createCoords(1);
  }
  const rect2 = domElement.getBoundingClientRect();
  const {
    width,
    height,
    $
  } = getCssDimensions(domElement);
  let x = ($ ? round(rect2.width) : rect2.width) / width;
  let y = ($ ? round(rect2.height) : rect2.height) / height;
  if (!x || !Number.isFinite(x)) {
    x = 1;
  }
  if (!y || !Number.isFinite(y)) {
    y = 1;
  }
  return {
    x,
    y
  };
}
var noOffsets = /* @__PURE__ */ createCoords(0);
function getVisualOffsets(element) {
  const win = getWindow(element);
  if (!isWebKit() || !win.visualViewport) {
    return noOffsets;
  }
  return {
    x: win.visualViewport.offsetLeft,
    y: win.visualViewport.offsetTop
  };
}
function shouldAddVisualOffsets(element, isFixed, floatingOffsetParent) {
  if (isFixed === void 0) {
    isFixed = false;
  }
  return !!floatingOffsetParent && isFixed && floatingOffsetParent === getWindow(element);
}
function getBoundingClientRect(element, includeScale, isFixedStrategy, offsetParent) {
  if (includeScale === void 0) {
    includeScale = false;
  }
  if (isFixedStrategy === void 0) {
    isFixedStrategy = false;
  }
  const clientRect = element.getBoundingClientRect();
  const domElement = unwrapElement(element);
  let scale = createCoords(1);
  if (includeScale) {
    if (offsetParent) {
      if (isElement(offsetParent)) {
        scale = getScale(offsetParent);
      }
    } else {
      scale = getScale(element);
    }
  }
  const visualOffsets = shouldAddVisualOffsets(domElement, isFixedStrategy, offsetParent) ? getVisualOffsets(domElement) : createCoords(0);
  let x = (clientRect.left + visualOffsets.x) / scale.x;
  let y = (clientRect.top + visualOffsets.y) / scale.y;
  let width = clientRect.width / scale.x;
  let height = clientRect.height / scale.y;
  if (domElement && offsetParent) {
    const win = getWindow(domElement);
    const offsetWin = isElement(offsetParent) ? getWindow(offsetParent) : offsetParent;
    let currentWin = win;
    let currentIFrame = getFrameElement(currentWin);
    while (currentIFrame && offsetWin !== currentWin) {
      const iframeScale = getScale(currentIFrame);
      const iframeRect = currentIFrame.getBoundingClientRect();
      const css = getComputedStyle2(currentIFrame);
      const left = iframeRect.left + (currentIFrame.clientLeft + parseFloat(css.paddingLeft)) * iframeScale.x;
      const top = iframeRect.top + (currentIFrame.clientTop + parseFloat(css.paddingTop)) * iframeScale.y;
      x *= iframeScale.x;
      y *= iframeScale.y;
      width *= iframeScale.x;
      height *= iframeScale.y;
      x += left;
      y += top;
      currentWin = getWindow(currentIFrame);
      currentIFrame = getFrameElement(currentWin);
    }
  }
  return rectToClientRect({
    width,
    height,
    x,
    y
  });
}
function getWindowScrollBarX(element, rect2) {
  const leftScroll = getNodeScroll(element).scrollLeft;
  if (!rect2) {
    return getBoundingClientRect(getDocumentElement(element)).left + leftScroll;
  }
  return rect2.left + leftScroll;
}
function getHTMLOffset(documentElement, scroll) {
  const htmlRect = documentElement.getBoundingClientRect();
  const x = htmlRect.left + scroll.scrollLeft - getWindowScrollBarX(documentElement, htmlRect);
  const y = htmlRect.top + scroll.scrollTop;
  return {
    x,
    y
  };
}
function convertOffsetParentRelativeRectToViewportRelativeRect(_ref) {
  let {
    elements,
    rect: rect2,
    offsetParent,
    strategy
  } = _ref;
  const isFixed = strategy === "fixed";
  const documentElement = getDocumentElement(offsetParent);
  const topLayer = elements ? isTopLayer(elements.floating) : false;
  if (offsetParent === documentElement || topLayer && isFixed) {
    return rect2;
  }
  let scroll = {
    scrollLeft: 0,
    scrollTop: 0
  };
  let scale = createCoords(1);
  const offsets = createCoords(0);
  const isOffsetParentAnElement = isHTMLElement(offsetParent);
  if (isOffsetParentAnElement || !isFixed) {
    if (getNodeName(offsetParent) !== "body" || isOverflowElement(documentElement)) {
      scroll = getNodeScroll(offsetParent);
    }
    if (isOffsetParentAnElement) {
      const offsetRect = getBoundingClientRect(offsetParent);
      scale = getScale(offsetParent);
      offsets.x = offsetRect.x + offsetParent.clientLeft;
      offsets.y = offsetRect.y + offsetParent.clientTop;
    }
  }
  const htmlOffset = documentElement && !isOffsetParentAnElement && !isFixed ? getHTMLOffset(documentElement, scroll) : createCoords(0);
  return {
    width: rect2.width * scale.x,
    height: rect2.height * scale.y,
    x: rect2.x * scale.x - scroll.scrollLeft * scale.x + offsets.x + htmlOffset.x,
    y: rect2.y * scale.y - scroll.scrollTop * scale.y + offsets.y + htmlOffset.y
  };
}
function getClientRects(element) {
  return element.getClientRects ? Array.from(element.getClientRects()) : [];
}
function getDocumentRect(html) {
  const scroll = getNodeScroll(html);
  const body = html.ownerDocument.body;
  const width = max(html.scrollWidth, html.clientWidth, body.scrollWidth, body.clientWidth);
  const height = max(html.scrollHeight, html.clientHeight, body.scrollHeight, body.clientHeight);
  let x = -scroll.scrollLeft + getWindowScrollBarX(html);
  const y = -scroll.scrollTop;
  if (getComputedStyle2(body).direction === "rtl") {
    x += max(html.clientWidth, body.clientWidth) - width;
  }
  return {
    width,
    height,
    x,
    y
  };
}
var SCROLLBAR_MAX = 25;
function getViewportRect(element, strategy, rootBoundary) {
  if (rootBoundary === void 0) {
    rootBoundary = "viewport";
  }
  const isLayoutViewport = rootBoundary === "layoutViewport";
  const win = getWindow(element);
  const html = getDocumentElement(element);
  const visualViewport = win.visualViewport;
  let width = html.clientWidth;
  let height = html.clientHeight;
  let x = 0;
  let y = 0;
  if (visualViewport) {
    const layoutRelativeClientCoords = !isWebKit() || strategy === "fixed";
    if (isLayoutViewport) {
      if (!layoutRelativeClientCoords) {
        x = -visualViewport.offsetLeft;
        y = -visualViewport.offsetTop;
      }
    } else {
      width = visualViewport.width;
      height = visualViewport.height;
      if (layoutRelativeClientCoords) {
        x = visualViewport.offsetLeft;
        y = visualViewport.offsetTop;
      }
    }
  }
  const windowScrollbarX = getWindowScrollBarX(html);
  if (windowScrollbarX <= 0) {
    const doc = html.ownerDocument;
    const body = doc.body;
    const bodyStyles = getComputedStyle(body);
    const bodyMarginInline = doc.compatMode === "CSS1Compat" ? parseFloat(bodyStyles.marginLeft) + parseFloat(bodyStyles.marginRight) || 0 : 0;
    const reservedWidth = Math.abs(html.clientWidth - body.clientWidth - bodyMarginInline);
    const gutter = getComputedStyle(html).scrollbarGutter === "stable both-edges" ? reservedWidth / 2 : reservedWidth;
    if (gutter <= SCROLLBAR_MAX) {
      width -= gutter;
    }
  }
  return {
    width,
    height,
    x,
    y
  };
}
function getInnerBoundingClientRect(element, strategy) {
  const clientRect = getBoundingClientRect(element, true, strategy === "fixed");
  const top = clientRect.top + element.clientTop;
  const left = clientRect.left + element.clientLeft;
  const scale = getScale(element);
  const width = element.clientWidth * scale.x;
  const height = element.clientHeight * scale.y;
  const x = left * scale.x;
  const y = top * scale.y;
  return {
    width,
    height,
    x,
    y
  };
}
function getClientRectFromClippingAncestor(element, clippingAncestor, strategy) {
  let rect2;
  if (clippingAncestor === "viewport" || clippingAncestor === "layoutViewport") {
    rect2 = getViewportRect(element, strategy, clippingAncestor);
  } else if (clippingAncestor === "document") {
    rect2 = getDocumentRect(getDocumentElement(element));
  } else if (isElement(clippingAncestor)) {
    rect2 = getInnerBoundingClientRect(clippingAncestor, strategy);
  } else {
    const visualOffsets = getVisualOffsets(element);
    rect2 = {
      x: clippingAncestor.x - visualOffsets.x,
      y: clippingAncestor.y - visualOffsets.y,
      width: clippingAncestor.width,
      height: clippingAncestor.height
    };
  }
  return rectToClientRect(rect2);
}
function getClippingElementAncestors(element, cache) {
  const cachedResult = cache.get(element);
  if (cachedResult) {
    return cachedResult;
  }
  let result = getOverflowAncestors(element, [], false).filter((el) => isElement(el) && getNodeName(el) !== "body");
  let lastKeptComputedStyle = null;
  const elementIsFixed = getComputedStyle2(element).position === "fixed";
  let currentNode = elementIsFixed ? getParentNode(element) : element;
  while (isElement(currentNode) && !isLastTraversableNode(currentNode)) {
    const computedStyle = getComputedStyle2(currentNode);
    const currentNodeIsContaining = isContainingBlock(currentNode);
    const lastPosition = lastKeptComputedStyle ? lastKeptComputedStyle.position : elementIsFixed ? "fixed" : "";
    const shouldDropCurrentNode = !currentNodeIsContaining && (lastPosition === "fixed" || lastPosition === "absolute" && computedStyle.position === "static");
    if (shouldDropCurrentNode) {
      result = result.filter((ancestor) => ancestor !== currentNode);
    } else {
      lastKeptComputedStyle = computedStyle;
    }
    currentNode = getParentNode(currentNode);
  }
  cache.set(element, result);
  return result;
}
function getClippingRect(_ref) {
  let {
    element,
    boundary,
    rootBoundary,
    strategy
  } = _ref;
  const elementClippingAncestors = boundary === "clippingAncestors" ? isTopLayer(element) ? [] : getClippingElementAncestors(element, this._c) : [].concat(boundary);
  const clippingAncestors = [...elementClippingAncestors, rootBoundary];
  const firstRect = getClientRectFromClippingAncestor(element, clippingAncestors[0], strategy);
  let top = firstRect.top;
  let right = firstRect.right;
  let bottom = firstRect.bottom;
  let left = firstRect.left;
  for (let i = 1; i < clippingAncestors.length; i++) {
    const rect2 = getClientRectFromClippingAncestor(element, clippingAncestors[i], strategy);
    top = max(rect2.top, top);
    right = min(rect2.right, right);
    bottom = min(rect2.bottom, bottom);
    left = max(rect2.left, left);
  }
  return {
    width: right - left,
    height: bottom - top,
    x: left,
    y: top
  };
}
function getDimensions(element) {
  const {
    width,
    height
  } = getCssDimensions(element);
  return {
    width,
    height
  };
}
function getRectRelativeToOffsetParent(element, offsetParent, strategy) {
  const isOffsetParentAnElement = isHTMLElement(offsetParent);
  const documentElement = getDocumentElement(offsetParent);
  const isFixed = strategy === "fixed";
  const rect2 = getBoundingClientRect(element, true, isFixed, offsetParent);
  let scroll = {
    scrollLeft: 0,
    scrollTop: 0
  };
  const offsets = createCoords(0);
  if (isOffsetParentAnElement || !isFixed) {
    if (getNodeName(offsetParent) !== "body" || isOverflowElement(documentElement)) {
      scroll = getNodeScroll(offsetParent);
    }
    if (isOffsetParentAnElement) {
      const offsetRect = getBoundingClientRect(offsetParent, true, isFixed, offsetParent);
      offsets.x = offsetRect.x + offsetParent.clientLeft;
      offsets.y = offsetRect.y + offsetParent.clientTop;
    }
  }
  if (!isOffsetParentAnElement && documentElement) {
    offsets.x = getWindowScrollBarX(documentElement);
  }
  const htmlOffset = documentElement && !isOffsetParentAnElement && !isFixed ? getHTMLOffset(documentElement, scroll) : createCoords(0);
  const x = rect2.left + scroll.scrollLeft - offsets.x - htmlOffset.x;
  const y = rect2.top + scroll.scrollTop - offsets.y - htmlOffset.y;
  return {
    x,
    y,
    width: rect2.width,
    height: rect2.height
  };
}
function isStaticPositioned(element) {
  return getComputedStyle2(element).position === "static";
}
function getTrueOffsetParent(element, polyfill) {
  if (!isHTMLElement(element) || getComputedStyle2(element).position === "fixed") {
    return null;
  }
  if (polyfill) {
    return polyfill(element);
  }
  let rawOffsetParent = element.offsetParent;
  if (getDocumentElement(element) === rawOffsetParent) {
    rawOffsetParent = rawOffsetParent.ownerDocument.body;
  }
  return rawOffsetParent;
}
function getOffsetParent(element, polyfill) {
  const win = getWindow(element);
  if (isTopLayer(element)) {
    return win;
  }
  if (!isHTMLElement(element)) {
    let svgOffsetParent = getParentNode(element);
    while (svgOffsetParent && !isLastTraversableNode(svgOffsetParent)) {
      if (isElement(svgOffsetParent) && !isStaticPositioned(svgOffsetParent)) {
        return svgOffsetParent;
      }
      svgOffsetParent = getParentNode(svgOffsetParent);
    }
    return win;
  }
  let offsetParent = getTrueOffsetParent(element, polyfill);
  while (offsetParent && isTableElement(offsetParent) && isStaticPositioned(offsetParent)) {
    offsetParent = getTrueOffsetParent(offsetParent, polyfill);
  }
  if (offsetParent && isLastTraversableNode(offsetParent) && isStaticPositioned(offsetParent) && !isContainingBlock(offsetParent)) {
    return win;
  }
  return offsetParent || getContainingBlock(element) || win;
}
var getElementRects = async function(data) {
  const getOffsetParentFn = this.getOffsetParent || getOffsetParent;
  const getDimensionsFn = this.getDimensions;
  const floatingDimensions = await getDimensionsFn(data.floating);
  return {
    reference: getRectRelativeToOffsetParent(data.reference, await getOffsetParentFn(data.floating), data.strategy),
    floating: {
      x: 0,
      y: 0,
      width: floatingDimensions.width,
      height: floatingDimensions.height
    }
  };
};
function isRTL(element) {
  return getComputedStyle2(element).direction === "rtl";
}
var platform = {
  convertOffsetParentRelativeRectToViewportRelativeRect,
  getDocumentElement,
  getClippingRect,
  getOffsetParent,
  getElementRects,
  getClientRects,
  getDimensions,
  getScale,
  isElement,
  isRTL
};
function rectsAreEqual(a, b) {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}
function observeMove(element, onMove, ancestorResize) {
  let io = null;
  let timeoutId;
  const root = getDocumentElement(element);
  function cleanup() {
    var _io;
    clearTimeout(timeoutId);
    (_io = io) == null || _io.disconnect();
    io = null;
  }
  function refresh(skip, threshold) {
    if (skip === void 0) {
      skip = false;
    }
    if (threshold === void 0) {
      threshold = 1;
    }
    cleanup();
    const elementRectForRootMargin = element.getBoundingClientRect();
    const {
      left,
      top,
      width,
      height
    } = elementRectForRootMargin;
    if (!skip) {
      onMove();
    }
    if (!width || !height) {
      return;
    }
    const insetTop = floor(top);
    const insetRight = floor(root.clientWidth - (left + width));
    const insetBottom = floor(root.clientHeight - (top + height));
    const insetLeft = floor(left);
    const rootMargin = -insetTop + "px " + -insetRight + "px " + -insetBottom + "px " + -insetLeft + "px";
    const options = {
      rootMargin,
      threshold: max(0, min(1, threshold)) || 1
    };
    let isFirstUpdate = true;
    function handleObserve(entries) {
      const ratio = entries[0].intersectionRatio;
      if (!rectsAreEqual(elementRectForRootMargin, element.getBoundingClientRect())) {
        return refresh();
      }
      if (ratio !== threshold) {
        if (!isFirstUpdate) {
          return refresh();
        }
        if (!ratio) {
          timeoutId = setTimeout(() => {
            refresh(false, 1e-7);
          }, 1e3);
        } else {
          refresh(false, ratio);
        }
      }
      isFirstUpdate = false;
    }
    try {
      io = new IntersectionObserver(handleObserve, {
        ...options,
        // Handle <iframe>s
        root: root.ownerDocument
      });
    } catch (_e) {
      io = new IntersectionObserver(handleObserve, options);
    }
    io.observe(element);
  }
  const win = getWindow(element);
  const handleResize = () => refresh(ancestorResize);
  win.addEventListener("resize", handleResize);
  refresh(true);
  return () => {
    win.removeEventListener("resize", handleResize);
    cleanup();
  };
}
function autoUpdate(reference, floating, update, options) {
  if (options === void 0) {
    options = {};
  }
  const {
    ancestorScroll = true,
    ancestorResize = true,
    elementResize = typeof ResizeObserver === "function",
    layoutShift = typeof IntersectionObserver === "function",
    animationFrame = false
  } = options;
  const referenceEl = unwrapElement(reference);
  const ancestors = ancestorScroll || ancestorResize ? [...referenceEl ? getOverflowAncestors(referenceEl) : [], ...floating ? getOverflowAncestors(floating) : []] : [];
  ancestors.forEach((ancestor) => {
    ancestorScroll && ancestor.addEventListener("scroll", update);
    ancestorResize && ancestor.addEventListener("resize", update);
  });
  const cleanupIo = referenceEl && layoutShift ? observeMove(referenceEl, update, ancestorResize) : null;
  let reobserveFrame = -1;
  let resizeObserver = null;
  if (elementResize) {
    resizeObserver = new ResizeObserver((_ref) => {
      let [firstEntry] = _ref;
      if (firstEntry && firstEntry.target === referenceEl && resizeObserver && floating) {
        resizeObserver.unobserve(floating);
        cancelAnimationFrame(reobserveFrame);
        reobserveFrame = requestAnimationFrame(() => {
          var _resizeObserver;
          (_resizeObserver = resizeObserver) == null || _resizeObserver.observe(floating);
        });
      }
      update();
    });
    if (referenceEl && !animationFrame) {
      resizeObserver.observe(referenceEl);
    }
    if (floating) {
      resizeObserver.observe(floating);
    }
  }
  let frameId;
  let prevRefRect = animationFrame ? getBoundingClientRect(reference) : null;
  if (animationFrame) {
    frameLoop();
  }
  function frameLoop() {
    const nextRefRect = getBoundingClientRect(reference);
    if (prevRefRect && !rectsAreEqual(prevRefRect, nextRefRect)) {
      update();
    }
    prevRefRect = nextRefRect;
    frameId = requestAnimationFrame(frameLoop);
  }
  update();
  return () => {
    var _resizeObserver2;
    ancestors.forEach((ancestor) => {
      ancestorScroll && ancestor.removeEventListener("scroll", update);
      ancestorResize && ancestor.removeEventListener("resize", update);
    });
    cleanupIo == null || cleanupIo();
    (_resizeObserver2 = resizeObserver) == null || _resizeObserver2.disconnect();
    resizeObserver = null;
    if (animationFrame) {
      cancelAnimationFrame(frameId);
    }
  };
}
var offset2 = offset;
var shift2 = shift;
var flip2 = flip;
var size2 = size;
var hide2 = hide;
var arrow2 = arrow;
var limitShift2 = limitShift;
var computePosition2 = (reference, floating, options) => {
  const cache = /* @__PURE__ */ new Map();
  const mergedOptions = options != null ? options : {};
  const platformWithCache = {
    ...platform,
    ...mergedOptions.platform,
    _c: cache
  };
  return computePosition(reference, floating, {
    ...mergedOptions,
    platform: platformWithCache
  });
};

// node_modules/@floating-ui/react-dom/dist/floating-ui.react-dom.mjs
import * as React19 from "react";
import { useLayoutEffect as useLayoutEffect3 } from "react";
import * as ReactDOM3 from "react-dom";
var isClient = typeof document !== "undefined";
var noop = function noop2() {
};
var index = isClient ? useLayoutEffect3 : noop;
function deepEqual(a, b) {
  if (a === b) {
    return true;
  }
  if (typeof a !== typeof b) {
    return false;
  }
  if (typeof a === "function" && a.toString() === b.toString()) {
    return true;
  }
  let length;
  let i;
  let keys;
  if (a && b && typeof a === "object") {
    if (Array.isArray(a)) {
      length = a.length;
      if (length !== b.length) return false;
      for (i = length; i-- !== 0; ) {
        if (!deepEqual(a[i], b[i])) {
          return false;
        }
      }
      return true;
    }
    keys = Object.keys(a);
    length = keys.length;
    if (length !== Object.keys(b).length) {
      return false;
    }
    for (i = length; i-- !== 0; ) {
      if (!{}.hasOwnProperty.call(b, keys[i])) {
        return false;
      }
    }
    for (i = length; i-- !== 0; ) {
      const key = keys[i];
      if (key === "_owner" && a.$$typeof) {
        continue;
      }
      if (!deepEqual(a[key], b[key])) {
        return false;
      }
    }
    return true;
  }
  return a !== a && b !== b;
}
function getDPR(element) {
  if (typeof window === "undefined") {
    return 1;
  }
  const win = element.ownerDocument.defaultView || window;
  return win.devicePixelRatio || 1;
}
function roundByDPR(element, value) {
  const dpr = getDPR(element);
  return Math.round(value * dpr) / dpr;
}
function useLatestRef(value) {
  const ref = React19.useRef(value);
  index(() => {
    ref.current = value;
  });
  return ref;
}
function useFloating(options) {
  if (options === void 0) {
    options = {};
  }
  const {
    placement = "bottom",
    strategy = "absolute",
    middleware = [],
    platform: platform2,
    elements: {
      reference: externalReference,
      floating: externalFloating
    } = {},
    transform = true,
    whileElementsMounted,
    open
  } = options;
  const [data, setData] = React19.useState({
    x: 0,
    y: 0,
    strategy,
    placement,
    middlewareData: {},
    isPositioned: false
  });
  const [latestMiddleware, setLatestMiddleware] = React19.useState(middleware);
  if (!deepEqual(latestMiddleware, middleware)) {
    setLatestMiddleware(middleware);
  }
  const [_reference, _setReference] = React19.useState(null);
  const [_floating, _setFloating] = React19.useState(null);
  const setReference = React19.useCallback((node) => {
    if (node !== referenceRef.current) {
      referenceRef.current = node;
      _setReference(node);
    }
  }, []);
  const setFloating = React19.useCallback((node) => {
    if (node !== floatingRef.current) {
      floatingRef.current = node;
      _setFloating(node);
    }
  }, []);
  const referenceEl = externalReference || _reference;
  const floatingEl = externalFloating || _floating;
  const referenceRef = React19.useRef(null);
  const floatingRef = React19.useRef(null);
  const dataRef = React19.useRef(data);
  const hasWhileElementsMounted = whileElementsMounted != null;
  const whileElementsMountedRef = useLatestRef(whileElementsMounted);
  const platformRef = useLatestRef(platform2);
  const openRef = useLatestRef(open);
  const update = React19.useCallback(() => {
    if (!referenceRef.current || !floatingRef.current) {
      return;
    }
    const config = {
      placement,
      strategy,
      middleware: latestMiddleware
    };
    if (platformRef.current) {
      config.platform = platformRef.current;
    }
    computePosition2(referenceRef.current, floatingRef.current, config).then((data2) => {
      const fullData = {
        ...data2,
        // The floating element's position may be recomputed while it's closed
        // but still mounted (such as when transitioning out). To ensure
        // `isPositioned` will be `false` initially on the next open, avoid
        // setting it to `true` when `open === false` (must be specified).
        isPositioned: openRef.current !== false
      };
      if (isMountedRef.current && !deepEqual(dataRef.current, fullData)) {
        dataRef.current = fullData;
        ReactDOM3.flushSync(() => {
          setData(fullData);
        });
      }
    });
  }, [latestMiddleware, placement, strategy, platformRef, openRef]);
  index(() => {
    if (open === false && dataRef.current.isPositioned) {
      dataRef.current.isPositioned = false;
      setData((data2) => ({
        ...data2,
        isPositioned: false
      }));
    }
  }, [open]);
  const isMountedRef = React19.useRef(false);
  index(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  index(() => {
    if (referenceEl) referenceRef.current = referenceEl;
    if (floatingEl) floatingRef.current = floatingEl;
    if (referenceEl && floatingEl) {
      if (whileElementsMountedRef.current) {
        return whileElementsMountedRef.current(referenceEl, floatingEl, update);
      }
      update();
    }
  }, [referenceEl, floatingEl, update, whileElementsMountedRef, hasWhileElementsMounted]);
  const refs = React19.useMemo(() => ({
    reference: referenceRef,
    floating: floatingRef,
    setReference,
    setFloating
  }), [setReference, setFloating]);
  const elements = React19.useMemo(() => ({
    reference: referenceEl,
    floating: floatingEl
  }), [referenceEl, floatingEl]);
  const floatingStyles = React19.useMemo(() => {
    const initialStyles = {
      position: strategy,
      left: 0,
      top: 0
    };
    if (!elements.floating) {
      return initialStyles;
    }
    const x = roundByDPR(elements.floating, data.x);
    const y = roundByDPR(elements.floating, data.y);
    if (transform) {
      return {
        ...initialStyles,
        transform: "translate(" + x + "px, " + y + "px)",
        ...getDPR(elements.floating) >= 1.5 && {
          willChange: "transform"
        }
      };
    }
    return {
      position: strategy,
      left: x,
      top: y
    };
  }, [strategy, transform, elements.floating, data.x, data.y]);
  return React19.useMemo(() => ({
    ...data,
    update,
    refs,
    elements,
    floatingStyles
  }), [data, update, refs, elements, floatingStyles]);
}
var arrow$1 = (options) => {
  function isRef(value) {
    return {}.hasOwnProperty.call(value, "current");
  }
  return {
    name: "arrow",
    options,
    fn(state) {
      const {
        element,
        padding
      } = typeof options === "function" ? options(state) : options;
      if (element && isRef(element)) {
        if (element.current != null) {
          return arrow2({
            element: element.current,
            padding
          }).fn(state);
        }
        return {};
      }
      if (element) {
        return arrow2({
          element,
          padding
        }).fn(state);
      }
      return {};
    }
  };
};
var offset3 = (options, deps) => {
  const result = offset2(options);
  return {
    name: result.name,
    fn: result.fn,
    options: [options, deps]
  };
};
var shift3 = (options, deps) => {
  const result = shift2(options);
  return {
    name: result.name,
    fn: result.fn,
    options: [options, deps]
  };
};
var limitShift3 = (options, deps) => {
  const result = limitShift2(options);
  return {
    fn: result.fn,
    options: [options, deps]
  };
};
var flip3 = (options, deps) => {
  const result = flip2(options);
  return {
    name: result.name,
    fn: result.fn,
    options: [options, deps]
  };
};
var size3 = (options, deps) => {
  const result = size2(options);
  return {
    name: result.name,
    fn: result.fn,
    options: [options, deps]
  };
};
var hide3 = (options, deps) => {
  const result = hide2(options);
  return {
    name: result.name,
    fn: result.fn,
    options: [options, deps]
  };
};
var arrow3 = (options, deps) => {
  const result = arrow$1(options);
  return {
    name: result.name,
    fn: result.fn,
    options: [options, deps]
  };
};

// node_modules/@radix-ui/react-arrow/dist/index.mjs
import * as React20 from "react";
import { jsx as jsx11 } from "react/jsx-runtime";
var __defProp19 = Object.defineProperty;
var __name19 = (target, value) => __defProp19(target, "name", { value, configurable: true });
var Arrow = /* @__PURE__ */ React20.forwardRef(
  /* @__PURE__ */ __name19(function Arrow2(props, forwardedRef) {
    const { children, width = 10, height = 5, ...arrowProps } = props;
    return /* @__PURE__ */ jsx11(
      Primitive.svg,
      {
        ...arrowProps,
        ref: forwardedRef,
        width,
        height,
        viewBox: "0 0 30 10",
        preserveAspectRatio: "none",
        children: props.asChild ? children : /* @__PURE__ */ jsx11("polygon", { points: "0,0 30,0 15,10" })
      }
    );
  }, "Arrow")
);

// node_modules/@radix-ui/react-popper/dist/index.mjs
import { jsx as jsx12 } from "react/jsx-runtime";
var __defProp20 = Object.defineProperty;
var __name20 = (target, value) => __defProp20(target, "name", { value, configurable: true });
var Sticky = {
  Partial: "partial",
  Always: "always"
};
var UpdatePositionStrategy = {
  Optimized: "optimized",
  Always: "always"
};
var POPPER_NAME = "Popper";
var [createPopperContext, createPopperScope] = createContextScope(POPPER_NAME);
var [PopperProvider, usePopperContext] = createPopperContext(POPPER_NAME);
var Popper = /* @__PURE__ */ __name20((props) => {
  const { __scopePopper, children } = props;
  const [anchor, setAnchor] = React21.useState(null);
  const [placementState, setPlacementState] = React21.useState(void 0);
  return /* @__PURE__ */ jsx12(
    PopperProvider,
    {
      scope: __scopePopper,
      anchor,
      onAnchorChange: setAnchor,
      placementState,
      setPlacementState,
      children
    }
  );
}, "Popper");
var ANCHOR_NAME = "PopperAnchor";
var PopperAnchor = /* @__PURE__ */ React21.forwardRef(
  /* @__PURE__ */ __name20(function PopperAnchor2(props, forwardedRef) {
    const { __scopePopper, virtualRef, ...anchorProps } = props;
    const context = usePopperContext(ANCHOR_NAME, __scopePopper);
    const ref = React21.useRef(null);
    const onAnchorChange = context.onAnchorChange;
    const callbackRef = React21.useCallback(
      (node) => {
        ref.current = node;
        if (node) {
          onAnchorChange(node);
        }
      },
      [onAnchorChange]
    );
    const composedRefs = useComposedRefs(forwardedRef, callbackRef);
    const anchorRef = React21.useRef(null);
    React21.useEffect(() => {
      if (!virtualRef) {
        return;
      }
      const previousAnchor = anchorRef.current;
      anchorRef.current = virtualRef.current;
      if (previousAnchor !== anchorRef.current) {
        onAnchorChange(anchorRef.current);
      }
    });
    const sideAndAlign = context.placementState && getSideAndAlignFromPlacement(context.placementState);
    const placedSide = sideAndAlign?.[0];
    const placedAlign = sideAndAlign?.[1];
    return virtualRef ? null : /* @__PURE__ */ jsx12(
      Primitive.div,
      {
        "data-radix-popper-side": placedSide,
        "data-radix-popper-align": placedAlign,
        ...anchorProps,
        ref: composedRefs
      }
    );
  }, "PopperAnchor")
);
var CONTENT_NAME2 = "PopperContent";
var [PopperContentProvider, useContentContext] = createPopperContext(CONTENT_NAME2);
var PopperContent = /* @__PURE__ */ React21.forwardRef(
  /* @__PURE__ */ __name20(function PopperContent2(props, forwardedRef) {
    const {
      __scopePopper,
      side = "bottom",
      sideOffset = 0,
      align = "center",
      alignOffset = 0,
      arrowPadding = 0,
      avoidCollisions = true,
      collisionBoundary = [],
      collisionPadding: collisionPaddingProp = 0,
      sticky = Sticky.Partial,
      hideWhenDetached = false,
      updatePositionStrategy = UpdatePositionStrategy.Optimized,
      onPlaced,
      ...contentProps
    } = props;
    const context = usePopperContext(CONTENT_NAME2, __scopePopper);
    const [content, setContent] = React21.useState(null);
    const composedRefs = useComposedRefs(forwardedRef, setContent);
    const [arrow4, setArrow] = React21.useState(null);
    const arrowSize = useSize(arrow4);
    const arrowWidth = arrowSize?.width ?? 0;
    const arrowHeight = arrowSize?.height ?? 0;
    const desiredPlacement = side + (align !== "center" ? "-" + align : "");
    const collisionPadding = typeof collisionPaddingProp === "number" ? collisionPaddingProp : { top: 0, right: 0, bottom: 0, left: 0, ...collisionPaddingProp };
    const boundary = Array.isArray(collisionBoundary) ? collisionBoundary : [collisionBoundary];
    const hasExplicitBoundaries = boundary.length > 0;
    const detectOverflowOptions = {
      padding: collisionPadding,
      boundary: boundary.filter(isNotNull),
      // with `strategy: 'fixed'`, this is the only way to get it to respect boundaries
      altBoundary: hasExplicitBoundaries
    };
    const { refs, floatingStyles, placement, isPositioned, middlewareData } = useFloating({
      // default to `fixed` strategy so users don't have to pick and we also avoid focus scroll issues
      strategy: "fixed",
      placement: desiredPlacement,
      whileElementsMounted: /* @__PURE__ */ __name20((...args) => {
        const cleanup = autoUpdate(...args, {
          animationFrame: updatePositionStrategy === UpdatePositionStrategy.Always
        });
        return cleanup;
      }, "whileElementsMounted"),
      elements: {
        reference: context.anchor
      },
      middleware: [
        offset3({ mainAxis: sideOffset + arrowHeight, alignmentAxis: alignOffset }),
        avoidCollisions && shift3({
          mainAxis: true,
          crossAxis: false,
          // Spread rather than passing `limiter: undefined`, which
          // `exactOptionalPropertyTypes` rejects for Floating UI's optional option.
          ...sticky === Sticky.Partial ? { limiter: limitShift3() } : {},
          ...detectOverflowOptions
        }),
        avoidCollisions && flip3({ ...detectOverflowOptions }),
        size3({
          ...detectOverflowOptions,
          apply: /* @__PURE__ */ __name20(({ elements, rects, availableWidth, availableHeight }) => {
            const { width: anchorWidth, height: anchorHeight } = rects.reference;
            const contentStyle = elements.floating.style;
            contentStyle.setProperty("--radix-popper-available-width", `${availableWidth}px`);
            contentStyle.setProperty("--radix-popper-available-height", `${availableHeight}px`);
            contentStyle.setProperty("--radix-popper-anchor-width", `${anchorWidth}px`);
            contentStyle.setProperty("--radix-popper-anchor-height", `${anchorHeight}px`);
          }, "apply")
        }),
        arrow4 && arrow3({ element: arrow4, padding: arrowPadding }),
        transformOrigin({ arrowWidth, arrowHeight }),
        hideWhenDetached && // `hide` detects whether the anchor (reference) is clipped, so when
        // no explicit `collisionBoundary` is set we omit `boundary` entirely
        // and fall back to Floating UI's default clipping ancestors (e.g. a
        // scrollable menu). This lets an occluded submenu hide once its anchor
        // scrolls out of view (#3237). The collision/size middlewares
        // deliberately keep the viewport-based default to avoid clamping
        // content rendered inside transformed or overflow-clipping portal
        // containers. The key is omitted rather than set to `undefined`
        // because `exactOptionalPropertyTypes` rejects the explicit value.
        hide3(
          hasExplicitBoundaries ? { strategy: "referenceHidden", ...detectOverflowOptions } : {
            strategy: "referenceHidden",
            padding: detectOverflowOptions.padding,
            altBoundary: detectOverflowOptions.altBoundary
          }
        )
      ]
    });
    const setPlacementState = context.setPlacementState;
    useLayoutEffect2(() => {
      setPlacementState(placement);
      return () => {
        setPlacementState(void 0);
      };
    }, [placement, setPlacementState]);
    const [placedSide, placedAlign] = getSideAndAlignFromPlacement(placement);
    const handlePlaced = useCallbackRef(onPlaced);
    useLayoutEffect2(() => {
      if (isPositioned) {
        handlePlaced?.();
      }
    }, [isPositioned, handlePlaced]);
    const arrowX = middlewareData.arrow?.x;
    const arrowY = middlewareData.arrow?.y;
    const cannotCenterArrow = middlewareData.arrow?.centerOffset !== 0;
    const [contentZIndex, setContentZIndex] = React21.useState();
    useLayoutEffect2(() => {
      if (content) setContentZIndex(window.getComputedStyle(content).zIndex);
    }, [content]);
    return /* @__PURE__ */ jsx12(
      "div",
      {
        ref: refs.setFloating,
        "data-radix-popper-content-wrapper": "",
        style: {
          ...floatingStyles,
          transform: isPositioned ? floatingStyles.transform : "translate(0, -200%)",
          // keep off the page when measuring
          minWidth: "max-content",
          zIndex: contentZIndex,
          "--radix-popper-transform-origin": [
            middlewareData.transformOrigin?.x,
            middlewareData.transformOrigin?.y
          ].join(" "),
          // hide the content if using the hide middleware and should be hidden
          // set visibility to hidden and disable pointer events so the UI behaves
          // as if the PopperContent isn't there at all
          ...middlewareData.hide?.referenceHidden && {
            visibility: "hidden",
            pointerEvents: "none"
          }
        },
        dir: props.dir,
        children: /* @__PURE__ */ jsx12(
          PopperContentProvider,
          {
            scope: __scopePopper,
            placedSide,
            placedAlign,
            onArrowChange: setArrow,
            arrowX,
            arrowY,
            shouldHideArrow: cannotCenterArrow,
            children: /* @__PURE__ */ jsx12(
              Primitive.div,
              {
                "data-side": placedSide,
                "data-align": placedAlign,
                ...contentProps,
                ref: composedRefs,
                style: {
                  ...contentProps.style,
                  // if the PopperContent hasn't been placed yet (not all
                  // measurements done) we prevent animations so that users'
                  // animations don't kick in too early from the wrong sides.
                  animation: !isPositioned ? "none" : contentProps.style?.animation
                }
              }
            )
          }
        )
      }
    );
  }, "PopperContent")
);
var ARROW_NAME = "PopperArrow";
var OPPOSITE_SIDE = {
  top: "bottom",
  right: "left",
  bottom: "top",
  left: "right"
};
var PopperArrow = /* @__PURE__ */ React21.forwardRef(
  /* @__PURE__ */ __name20(function PopperArrow2(props, forwardedRef) {
    const { __scopePopper, ...arrowProps } = props;
    const contentContext = useContentContext(ARROW_NAME, __scopePopper);
    const baseSide = OPPOSITE_SIDE[contentContext.placedSide];
    return (
      // we have to use an extra wrapper because `ResizeObserver` (used by `useSize`)
      // doesn't report size as we'd expect on SVG elements.
      // it reports their bounding box which is effectively the largest path inside the SVG.
      /* @__PURE__ */ jsx12(
        "span",
        {
          ref: contentContext.onArrowChange,
          style: {
            position: "absolute",
            left: contentContext.arrowX,
            top: contentContext.arrowY,
            [baseSide]: 0,
            transformOrigin: {
              top: "",
              right: "0 0",
              bottom: "center 0",
              left: "100% 0"
            }[contentContext.placedSide],
            transform: {
              top: "translateY(100%)",
              right: "translateY(50%) rotate(90deg) translateX(-50%)",
              bottom: `rotate(180deg)`,
              left: "translateY(50%) rotate(-90deg) translateX(50%)"
            }[contentContext.placedSide],
            visibility: contentContext.shouldHideArrow ? "hidden" : void 0
          },
          children: /* @__PURE__ */ jsx12(
            Arrow,
            {
              ...arrowProps,
              ref: forwardedRef,
              style: {
                ...arrowProps.style,
                // ensures the element can be measured correctly (mostly for if SVG)
                display: "block"
              }
            }
          )
        }
      )
    );
  }, "PopperArrow")
);
function isNotNull(value) {
  return value !== null;
}
__name20(isNotNull, "isNotNull");
var transformOrigin = /* @__PURE__ */ __name20((options) => ({
  name: "transformOrigin",
  options,
  fn(data) {
    const { placement, rects, middlewareData } = data;
    const cannotCenterArrow = middlewareData.arrow?.centerOffset !== 0;
    const isArrowHidden = cannotCenterArrow;
    const arrowWidth = isArrowHidden ? 0 : options.arrowWidth;
    const arrowHeight = isArrowHidden ? 0 : options.arrowHeight;
    const [placedSide, placedAlign] = getSideAndAlignFromPlacement(placement);
    const noArrowAlign = { start: "0%", center: "50%", end: "100%" }[placedAlign];
    const arrowXCenter = (middlewareData.arrow?.x ?? 0) + arrowWidth / 2;
    const arrowYCenter = (middlewareData.arrow?.y ?? 0) + arrowHeight / 2;
    let x = "";
    let y = "";
    if (placedSide === "bottom") {
      x = isArrowHidden ? noArrowAlign : `${arrowXCenter}px`;
      y = `${-arrowHeight}px`;
    } else if (placedSide === "top") {
      x = isArrowHidden ? noArrowAlign : `${arrowXCenter}px`;
      y = `${rects.floating.height + arrowHeight}px`;
    } else if (placedSide === "right") {
      x = `${-arrowHeight}px`;
      y = isArrowHidden ? noArrowAlign : `${arrowYCenter}px`;
    } else if (placedSide === "left") {
      x = `${rects.floating.width + arrowHeight}px`;
      y = isArrowHidden ? noArrowAlign : `${arrowYCenter}px`;
    }
    return { data: { x, y } };
  }
}), "transformOrigin");
function getSideAndAlignFromPlacement(placement) {
  const [side, align = "center"] = placement.split("-");
  return [side, align];
}
__name20(getSideAndAlignFromPlacement, "getSideAndAlignFromPlacement");

// node_modules/@radix-ui/react-roving-focus/dist/index.mjs
import * as React27 from "react";

// node_modules/@radix-ui/react-use-is-hydrated/dist/index.mjs
import * as React25 from "react";
import * as React26 from "react";
var __defProp21 = Object.defineProperty;
var __name21 = (target, value) => __defProp21(target, "name", { value, configurable: true });
var _isHydrated = false;
function useIsHydrated() {
  const [isHydrated, setIsHydrated] = React26.useState(_isHydrated);
  React26.useEffect(() => {
    if (!_isHydrated) {
      _isHydrated = true;
      setIsHydrated(true);
    }
  }, []);
  return isHydrated;
}
__name21(useIsHydrated, "useIsHydrated");
var useReactSyncExternalStore = React25[" useSyncExternalStore ".trim().toString()];
function subscribe() {
  return () => {
  };
}
__name21(subscribe, "subscribe");
function useIsHydratedModern() {
  return useReactSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
__name21(useIsHydratedModern, "useIsHydratedModern");
var useIsHydrated2 = typeof useReactSyncExternalStore === "function" ? useIsHydratedModern : useIsHydrated;

// node_modules/@radix-ui/react-roving-focus/dist/index.mjs
import { jsx as jsx13 } from "react/jsx-runtime";
var __defProp22 = Object.defineProperty;
var __name22 = (target, value) => __defProp22(target, "name", { value, configurable: true });
var ENTRY_FOCUS = "rovingFocusGroup.onEntryFocus";
var EVENT_OPTIONS = { bubbles: false, cancelable: true };
var GROUP_NAME = "RovingFocusGroup";
var [Collection, useCollection, createCollectionScope] = createCollection(GROUP_NAME);
var [createRovingFocusGroupContext, createRovingFocusGroupScope] = createContextScope(
  GROUP_NAME,
  [createCollectionScope]
);
var Orientation = {
  Vertical: "vertical",
  Horizontal: "horizontal"
};
var Direction2 = {
  LTR: "ltr",
  RTL: "rtl"
};
var [RovingFocusProvider, useRovingFocusContext] = createRovingFocusGroupContext(GROUP_NAME);
var RovingFocusGroup = /* @__PURE__ */ React27.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ __name22(function RovingFocusGroup2(props, forwardedRef) {
    return /* @__PURE__ */ jsx13(Collection.Provider, { scope: props.__scopeRovingFocusGroup, children: /* @__PURE__ */ jsx13(Collection.Slot, { scope: props.__scopeRovingFocusGroup, children: /* @__PURE__ */ jsx13(RovingFocusGroupImpl, { ...props, ref: forwardedRef }) }) });
  }, "RovingFocusGroup")
);
var RovingFocusGroupImpl = /* @__PURE__ */ React27.forwardRef(/* @__PURE__ */ __name22(function RovingFocusGroupImpl2(props, forwardedRef) {
  const {
    __scopeRovingFocusGroup,
    orientation,
    loop = false,
    dir,
    currentTabStopId: currentTabStopIdProp,
    defaultCurrentTabStopId,
    onCurrentTabStopIdChange,
    onEntryFocus,
    preventScrollOnEntryFocus = false,
    ...groupProps
  } = props;
  const ref = React27.useRef(null);
  const composedRefs = useComposedRefs(forwardedRef, ref);
  const direction = useDirection(dir);
  const [currentTabStopId, setCurrentTabStopId] = useControllableState({
    prop: currentTabStopIdProp,
    defaultProp: defaultCurrentTabStopId ?? null,
    onChange: onCurrentTabStopIdChange,
    caller: GROUP_NAME
  });
  const [isTabbingBackOut, setIsTabbingBackOut] = React27.useState(false);
  const handleEntryFocus = useCallbackRef(onEntryFocus);
  const getItems = useCollection(__scopeRovingFocusGroup);
  const isClickFocusRef = React27.useRef(false);
  const [focusableItemsCount, setFocusableItemsCount] = React27.useState(0);
  React27.useEffect(() => {
    const node = ref.current;
    if (node) {
      node.addEventListener(ENTRY_FOCUS, handleEntryFocus);
      return () => node.removeEventListener(ENTRY_FOCUS, handleEntryFocus);
    }
  }, [handleEntryFocus]);
  return /* @__PURE__ */ jsx13(
    RovingFocusProvider,
    {
      scope: __scopeRovingFocusGroup,
      orientation,
      dir: direction,
      loop,
      currentTabStopId,
      onItemFocus: React27.useCallback(
        (tabStopId) => setCurrentTabStopId(tabStopId),
        [setCurrentTabStopId]
      ),
      onItemShiftTab: React27.useCallback(() => setIsTabbingBackOut(true), []),
      onFocusableItemAdd: React27.useCallback(
        () => setFocusableItemsCount((prevCount) => prevCount + 1),
        []
      ),
      onFocusableItemRemove: React27.useCallback(
        () => setFocusableItemsCount((prevCount) => prevCount - 1),
        []
      ),
      children: /* @__PURE__ */ jsx13(
        Primitive.div,
        {
          tabIndex: isTabbingBackOut || focusableItemsCount === 0 ? -1 : 0,
          "data-orientation": orientation,
          ...groupProps,
          ref: composedRefs,
          style: { outline: "none", ...props.style },
          onMouseDown: composeEventHandlers(props.onMouseDown, () => {
            isClickFocusRef.current = true;
          }),
          onFocus: composeEventHandlers(props.onFocus, (event) => {
            const isKeyboardFocus = !isClickFocusRef.current;
            if (event.target === event.currentTarget && isKeyboardFocus && !isTabbingBackOut) {
              const entryFocusEvent = new CustomEvent(ENTRY_FOCUS, EVENT_OPTIONS);
              event.currentTarget.dispatchEvent(entryFocusEvent);
              if (!entryFocusEvent.defaultPrevented) {
                const items = getItems().filter((item) => item.focusable);
                const activeItem = items.find((item) => item.active);
                const currentItem = items.find((item) => item.id === currentTabStopId);
                const candidateItems = [activeItem, currentItem, ...items].filter(
                  Boolean
                );
                const candidateNodes = candidateItems.map((item) => item.ref.current);
                focusFirst2(candidateNodes, preventScrollOnEntryFocus);
              }
            }
            isClickFocusRef.current = false;
          }),
          onBlur: composeEventHandlers(props.onBlur, () => setIsTabbingBackOut(false))
        }
      )
    }
  );
}, "RovingFocusGroupImpl"));
var ITEM_NAME = "RovingFocusGroupItem";
var RovingFocusGroupItem = /* @__PURE__ */ React27.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ __name22(function RovingFocusGroupItem2(props, forwardedRef) {
    const {
      __scopeRovingFocusGroup,
      focusable = true,
      active = false,
      tabStopId,
      children,
      ...itemProps
    } = props;
    const autoId = useId();
    const id = tabStopId || autoId;
    const context = useRovingFocusContext(ITEM_NAME, __scopeRovingFocusGroup);
    const isCurrentTabStop = context.currentTabStopId === id;
    const getItems = useCollection(__scopeRovingFocusGroup);
    const { onFocusableItemAdd, onFocusableItemRemove, currentTabStopId } = context;
    const isHydrated = useIsHydrated2();
    useLayoutEffect2(() => {
      if (!isHydrated || !focusable) {
        return;
      }
      onFocusableItemAdd();
      return () => onFocusableItemRemove();
    }, [isHydrated, focusable, onFocusableItemAdd, onFocusableItemRemove]);
    React27.useEffect(() => {
      if (isHydrated || !focusable) {
        return;
      }
      onFocusableItemAdd();
      return () => onFocusableItemRemove();
    }, [isHydrated, focusable, onFocusableItemAdd, onFocusableItemRemove]);
    return /* @__PURE__ */ jsx13(
      Collection.ItemSlot,
      {
        scope: __scopeRovingFocusGroup,
        id,
        focusable,
        active,
        children: /* @__PURE__ */ jsx13(
          Primitive.span,
          {
            tabIndex: isCurrentTabStop ? 0 : -1,
            "data-orientation": context.orientation,
            ...itemProps,
            ref: forwardedRef,
            onMouseDown: composeEventHandlers(props.onMouseDown, (event) => {
              if (!focusable) event.preventDefault();
              else context.onItemFocus(id);
            }),
            onFocus: composeEventHandlers(props.onFocus, () => context.onItemFocus(id)),
            onKeyDown: composeEventHandlers(props.onKeyDown, (event) => {
              if (event.key === "Tab" && event.shiftKey) {
                context.onItemShiftTab();
                return;
              }
              if (event.target !== event.currentTarget) return;
              const focusIntent = getFocusIntent(event, context.orientation, context.dir);
              if (focusIntent !== void 0) {
                if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
                event.preventDefault();
                const items = getItems().filter((item) => item.focusable);
                let candidateNodes = items.map((item) => item.ref.current);
                if (focusIntent === "last") candidateNodes.reverse();
                else if (focusIntent === "prev" || focusIntent === "next") {
                  if (focusIntent === "prev") candidateNodes.reverse();
                  const currentIndex = candidateNodes.indexOf(event.currentTarget);
                  candidateNodes = context.loop ? wrapArray(candidateNodes, currentIndex + 1) : candidateNodes.slice(currentIndex + 1);
                }
                setTimeout(() => focusFirst2(candidateNodes));
              }
            }),
            children: typeof children === "function" ? children({ isCurrentTabStop, hasTabStop: currentTabStopId != null }) : children
          }
        )
      }
    );
  }, "RovingFocusGroupItem")
);
var MAP_KEY_TO_FOCUS_INTENT = {
  ArrowLeft: "prev",
  ArrowUp: "prev",
  ArrowRight: "next",
  ArrowDown: "next",
  PageUp: "first",
  Home: "first",
  PageDown: "last",
  End: "last"
};
function getDirectionAwareKey(key, dir) {
  if (dir !== Direction2.RTL) return key;
  return key === "ArrowLeft" ? "ArrowRight" : key === "ArrowRight" ? "ArrowLeft" : key;
}
__name22(getDirectionAwareKey, "getDirectionAwareKey");
function getFocusIntent(event, orientation, dir) {
  const key = getDirectionAwareKey(event.key, dir);
  if (orientation === Orientation.Vertical && ["ArrowLeft", "ArrowRight"].includes(key)) {
    return void 0;
  }
  if (orientation === Orientation.Horizontal && ["ArrowUp", "ArrowDown"].includes(key)) {
    return void 0;
  }
  return MAP_KEY_TO_FOCUS_INTENT[key];
}
__name22(getFocusIntent, "getFocusIntent");
function focusFirst2(candidates, preventScroll = false) {
  const PREVIOUSLY_FOCUSED_ELEMENT = document.activeElement;
  for (const candidate of candidates) {
    if (candidate === PREVIOUSLY_FOCUSED_ELEMENT) return;
    candidate.focus({ preventScroll });
    if (document.activeElement !== PREVIOUSLY_FOCUSED_ELEMENT) return;
  }
}
__name22(focusFirst2, "focusFirst");
function wrapArray(array, startIndex) {
  return array.map((_, index2) => array[(startIndex + index2) % array.length]);
}
__name22(wrapArray, "wrapArray");

// node_modules/@radix-ui/react-tabs/dist/index.mjs
var dist_exports4 = {};
__export(dist_exports4, {
  Content: () => TabsContent,
  List: () => TabsList,
  Root: () => Tabs,
  Tabs: () => Tabs,
  TabsContent: () => TabsContent,
  TabsList: () => TabsList,
  TabsTrigger: () => TabsTrigger,
  Trigger: () => TabsTrigger,
  createTabsScope: () => createTabsScope
});
import * as React28 from "react";
import { jsx as jsx14 } from "react/jsx-runtime";
var __defProp23 = Object.defineProperty;
var __name23 = (target, value) => __defProp23(target, "name", { value, configurable: true });
var ActivationMode = {
  Automatic: "automatic",
  Manual: "manual"
};
var TABS_NAME = "Tabs";
var [createTabsContext, createTabsScope] = createContextScope(TABS_NAME, [
  createRovingFocusGroupScope
]);
var useRovingFocusGroupScope = createRovingFocusGroupScope();
var [TabsProvider, useTabsContext] = createTabsContext(TABS_NAME);
var Tabs = /* @__PURE__ */ React28.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ __name23(function Tabs2(props, forwardedRef) {
    const {
      __scopeTabs,
      value: valueProp,
      onValueChange,
      defaultValue,
      orientation = "horizontal",
      dir,
      activationMode = ActivationMode.Automatic,
      ...tabsProps
    } = props;
    const direction = useDirection(dir);
    const [value, setValue] = useControllableState({
      prop: valueProp,
      onChange: onValueChange,
      defaultProp: defaultValue ?? "",
      caller: TABS_NAME
    });
    return /* @__PURE__ */ jsx14(
      TabsProvider,
      {
        scope: __scopeTabs,
        baseId: useId(),
        value,
        onValueChange: setValue,
        orientation,
        dir: direction,
        activationMode,
        children: /* @__PURE__ */ jsx14(
          Primitive.div,
          {
            dir: direction,
            "data-orientation": orientation,
            ...tabsProps,
            ref: forwardedRef
          }
        )
      }
    );
  }, "Tabs")
);
var TAB_LIST_NAME = "TabsList";
var TabsList = /* @__PURE__ */ React28.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ __name23(function TabsList2(props, forwardedRef) {
    const { __scopeTabs, loop = true, ...listProps } = props;
    const context = useTabsContext(TAB_LIST_NAME, __scopeTabs);
    const rovingFocusGroupScope = useRovingFocusGroupScope(__scopeTabs);
    return /* @__PURE__ */ jsx14(
      RovingFocusGroup,
      {
        asChild: true,
        ...rovingFocusGroupScope,
        orientation: context.orientation,
        dir: context.dir,
        loop,
        children: /* @__PURE__ */ jsx14(
          Primitive.div,
          {
            role: "tablist",
            "aria-orientation": context.orientation,
            ...listProps,
            ref: forwardedRef
          }
        )
      }
    );
  }, "TabsList")
);
var TRIGGER_NAME2 = "TabsTrigger";
var TabsTrigger = /* @__PURE__ */ React28.forwardRef(
  /* @__PURE__ */ __name23(function TabsTrigger2(props, forwardedRef) {
    const { __scopeTabs, value, disabled = false, ...triggerProps } = props;
    const context = useTabsContext(TRIGGER_NAME2, __scopeTabs);
    const rovingFocusGroupScope = useRovingFocusGroupScope(__scopeTabs);
    const triggerId = makeTriggerId(context.baseId, value);
    const contentId = makeContentId(context.baseId, value);
    const isSelected = value === context.value;
    return /* @__PURE__ */ jsx14(
      RovingFocusGroupItem,
      {
        asChild: true,
        ...rovingFocusGroupScope,
        focusable: !disabled,
        active: isSelected,
        children: /* @__PURE__ */ jsx14(
          Primitive.button,
          {
            type: "button",
            role: "tab",
            "aria-selected": isSelected,
            "aria-controls": contentId,
            "data-state": isSelected ? "active" : "inactive",
            "data-disabled": disabled ? "" : void 0,
            disabled,
            id: triggerId,
            ...triggerProps,
            ref: forwardedRef,
            onMouseDown: composeEventHandlers(props.onMouseDown, (event) => {
              if (!disabled && event.button === 0 && event.ctrlKey === false) {
                event.currentTarget.focus();
                context.onValueChange(value);
              } else {
                event.preventDefault();
              }
            }),
            onKeyDown: composeEventHandlers(props.onKeyDown, (event) => {
              if (disabled || event.target !== event.currentTarget) {
                return;
              }
              if ([" ", "Enter"].includes(event.key)) {
                context.onValueChange(value);
              }
            }),
            onFocus: composeEventHandlers(props.onFocus, () => {
              const isAutomaticActivation = context.activationMode !== ActivationMode.Manual;
              if (!isSelected && !disabled && isAutomaticActivation) {
                context.onValueChange(value);
              }
            })
          }
        )
      }
    );
  }, "TabsTrigger")
);
var CONTENT_NAME3 = "TabsContent";
var TabsContent = /* @__PURE__ */ React28.forwardRef(
  /* @__PURE__ */ __name23(function TabsContent2(props, forwardedRef) {
    const { __scopeTabs, value, forceMount, children, ...contentProps } = props;
    const context = useTabsContext(CONTENT_NAME3, __scopeTabs);
    const triggerId = makeTriggerId(context.baseId, value);
    const contentId = makeContentId(context.baseId, value);
    const isSelected = value === context.value;
    const isMountAnimationPreventedRef = React28.useRef(isSelected);
    React28.useEffect(() => {
      const rAF = requestAnimationFrame(() => isMountAnimationPreventedRef.current = false);
      return () => cancelAnimationFrame(rAF);
    }, []);
    return /* @__PURE__ */ jsx14(Presence, { present: forceMount || isSelected, children: ({ present }) => /* @__PURE__ */ jsx14(
      Primitive.div,
      {
        "data-state": isSelected ? "active" : "inactive",
        "data-orientation": context.orientation,
        role: "tabpanel",
        "aria-labelledby": triggerId,
        hidden: !present,
        id: contentId,
        tabIndex: 0,
        ...contentProps,
        ref: forwardedRef,
        style: {
          ...props.style,
          animationDuration: isMountAnimationPreventedRef.current ? "0s" : void 0
        },
        children: present && children
      }
    ) });
  }, "TabsContent")
);
function makeTriggerId(baseId, value) {
  return `${baseId}-trigger-${value}`;
}
__name23(makeTriggerId, "makeTriggerId");
function makeContentId(baseId, value) {
  return `${baseId}-content-${value}`;
}
__name23(makeContentId, "makeContentId");

// node_modules/@radix-ui/react-toggle/dist/index.mjs
import * as React29 from "react";
import { jsx as jsx15 } from "react/jsx-runtime";
var __defProp24 = Object.defineProperty;
var __name24 = (target, value) => __defProp24(target, "name", { value, configurable: true });
var NAME = "Toggle";
var Toggle = /* @__PURE__ */ React29.forwardRef(
  /* @__PURE__ */ __name24(function Toggle2(props, forwardedRef) {
    const { pressed: pressedProp, defaultPressed, onPressedChange, ...buttonProps } = props;
    const [pressed, setPressed] = useControllableState({
      prop: pressedProp,
      onChange: onPressedChange,
      defaultProp: defaultPressed ?? false,
      caller: NAME
    });
    return /* @__PURE__ */ jsx15(
      Primitive.button,
      {
        type: "button",
        "aria-pressed": pressed,
        "data-state": pressed ? "on" : "off",
        "data-disabled": props.disabled ? "" : void 0,
        ...buttonProps,
        ref: forwardedRef,
        onClick: composeEventHandlers(props.onClick, () => {
          if (!props.disabled) {
            setPressed(!pressed);
          }
        })
      }
    );
  }, "Toggle")
);

// node_modules/@radix-ui/react-toggle-group/dist/index.mjs
var dist_exports6 = {};
__export(dist_exports6, {
  Item: () => ToggleGroupItem,
  Root: () => ToggleGroup,
  ToggleGroup: () => ToggleGroup,
  ToggleGroupItem: () => ToggleGroupItem,
  createToggleGroupScope: () => createToggleGroupScope
});
import * as React30 from "react";
import { jsx as jsx16 } from "react/jsx-runtime";
var __defProp25 = Object.defineProperty;
var __name25 = (target, value) => __defProp25(target, "name", { value, configurable: true });
var TOGGLE_GROUP_NAME = "ToggleGroup";
var ToggleGroupType = {
  Single: "single",
  Multiple: "multiple"
};
var [createToggleGroupContext, createToggleGroupScope] = createContextScope(TOGGLE_GROUP_NAME, [
  createRovingFocusGroupScope
]);
var useRovingFocusGroupScope2 = createRovingFocusGroupScope();
var ToggleGroup = /* @__PURE__ */ React30.forwardRef(/* @__PURE__ */ __name25(function ToggleGroup2(props, forwardedRef) {
  const { type, ...toggleGroupProps } = props;
  if (type === ToggleGroupType.Single) {
    const singleProps = toggleGroupProps;
    return /* @__PURE__ */ jsx16(ToggleGroupImplSingle, { role: "radiogroup", ...singleProps, ref: forwardedRef });
  }
  if (type === ToggleGroupType.Multiple) {
    const multipleProps = toggleGroupProps;
    return /* @__PURE__ */ jsx16(ToggleGroupImplMultiple, { role: "toolbar", ...multipleProps, ref: forwardedRef });
  }
  throw new Error(`Missing prop \`type\` expected on \`${TOGGLE_GROUP_NAME}\``);
}, "ToggleGroup"));
var [ToggleGroupValueProvider, useToggleGroupValueContext] = createToggleGroupContext(TOGGLE_GROUP_NAME);
var ToggleGroupImplSingle = /* @__PURE__ */ React30.forwardRef(/* @__PURE__ */ __name25(function ToggleGroupImplSingle2(props, forwardedRef) {
  const {
    value: valueProp,
    defaultValue,
    onValueChange = /* @__PURE__ */ __name25(() => {
    }, "onValueChange"),
    ...toggleGroupSingleProps
  } = props;
  const [value, setValue] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue ?? "",
    onChange: onValueChange,
    caller: TOGGLE_GROUP_NAME
  });
  return /* @__PURE__ */ jsx16(
    ToggleGroupValueProvider,
    {
      scope: props.__scopeToggleGroup,
      type: ToggleGroupType.Single,
      value: React30.useMemo(() => value ? [value] : [], [value]),
      onItemActivate: setValue,
      onItemDeactivate: React30.useCallback(() => setValue(""), [setValue]),
      children: /* @__PURE__ */ jsx16(ToggleGroupImpl, { ...toggleGroupSingleProps, ref: forwardedRef })
    }
  );
}, "ToggleGroupImplSingle"));
var ToggleGroupImplMultiple = /* @__PURE__ */ React30.forwardRef(/* @__PURE__ */ __name25(function ToggleGroupImplMultiple2(props, forwardedRef) {
  const {
    value: valueProp,
    defaultValue,
    onValueChange = /* @__PURE__ */ __name25(() => {
    }, "onValueChange"),
    ...toggleGroupMultipleProps
  } = props;
  const [value, setValue] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue ?? [],
    onChange: onValueChange,
    caller: TOGGLE_GROUP_NAME
  });
  const handleButtonActivate = React30.useCallback(
    (itemValue) => setValue((prevValue = []) => [...prevValue, itemValue]),
    [setValue]
  );
  const handleButtonDeactivate = React30.useCallback(
    (itemValue) => setValue((prevValue = []) => prevValue.filter((value2) => value2 !== itemValue)),
    [setValue]
  );
  return /* @__PURE__ */ jsx16(
    ToggleGroupValueProvider,
    {
      scope: props.__scopeToggleGroup,
      type: ToggleGroupType.Multiple,
      value,
      onItemActivate: handleButtonActivate,
      onItemDeactivate: handleButtonDeactivate,
      children: /* @__PURE__ */ jsx16(ToggleGroupImpl, { ...toggleGroupMultipleProps, ref: forwardedRef })
    }
  );
}, "ToggleGroupImplMultiple"));
var [ToggleGroupContext, useToggleGroupContext] = createToggleGroupContext(TOGGLE_GROUP_NAME);
var ToggleGroupImpl = /* @__PURE__ */ React30.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ __name25(function ToggleGroupImpl2(props, forwardedRef) {
    const {
      __scopeToggleGroup,
      disabled = false,
      rovingFocus = true,
      orientation,
      dir,
      loop = true,
      ...toggleGroupProps
    } = props;
    const rovingFocusGroupScope = useRovingFocusGroupScope2(__scopeToggleGroup);
    const direction = useDirection(dir);
    const commonProps = { dir: direction, ...toggleGroupProps };
    return /* @__PURE__ */ jsx16(ToggleGroupContext, { scope: __scopeToggleGroup, rovingFocus, disabled, children: rovingFocus ? /* @__PURE__ */ jsx16(
      RovingFocusGroup,
      {
        asChild: true,
        ...rovingFocusGroupScope,
        orientation,
        dir: direction,
        loop,
        children: /* @__PURE__ */ jsx16(Primitive.div, { ...commonProps, ref: forwardedRef })
      }
    ) : /* @__PURE__ */ jsx16(Primitive.div, { ...commonProps, ref: forwardedRef }) });
  }, "ToggleGroupImpl")
);
var ITEM_NAME2 = "ToggleGroupItem";
var ToggleGroupItem = /* @__PURE__ */ React30.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ __name25(function ToggleGroupItem2(props, forwardedRef) {
    const valueContext = useToggleGroupValueContext(ITEM_NAME2, props.__scopeToggleGroup);
    const context = useToggleGroupContext(ITEM_NAME2, props.__scopeToggleGroup);
    const rovingFocusGroupScope = useRovingFocusGroupScope2(props.__scopeToggleGroup);
    const pressed = valueContext.value.includes(props.value);
    const disabled = context.disabled || props.disabled;
    const commonProps = { ...props, pressed, disabled };
    const ref = React30.useRef(null);
    return context.rovingFocus ? /* @__PURE__ */ jsx16(
      RovingFocusGroupItem,
      {
        asChild: true,
        ...rovingFocusGroupScope,
        focusable: !disabled,
        active: pressed,
        ref,
        children: /* @__PURE__ */ jsx16(ToggleGroupItemImpl, { ...commonProps, ref: forwardedRef })
      }
    ) : /* @__PURE__ */ jsx16(ToggleGroupItemImpl, { ...commonProps, ref: forwardedRef });
  }, "ToggleGroupItem")
);
var ToggleGroupItemImpl = /* @__PURE__ */ React30.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ __name25(function ToggleGroupItemImpl2(props, forwardedRef) {
    const { __scopeToggleGroup, value, ...itemProps } = props;
    const valueContext = useToggleGroupValueContext(ITEM_NAME2, __scopeToggleGroup);
    const singleProps = { role: "radio", "aria-checked": props.pressed, "aria-pressed": void 0 };
    const typeProps = valueContext.type === ToggleGroupType.Single ? singleProps : void 0;
    return /* @__PURE__ */ jsx16(
      Toggle,
      {
        ...typeProps,
        ...itemProps,
        ref: forwardedRef,
        onPressedChange: (pressed) => {
          if (pressed) {
            valueContext.onItemActivate(value);
          } else {
            valueContext.onItemDeactivate(value);
          }
        }
      }
    );
  }, "ToggleGroupItemImpl")
);

// node_modules/@radix-ui/react-tooltip/dist/index.mjs
var dist_exports7 = {};
__export(dist_exports7, {
  Arrow: () => TooltipArrow,
  Content: () => TooltipContent,
  Portal: () => TooltipPortal,
  Provider: () => TooltipProvider,
  Root: () => Tooltip,
  Tooltip: () => Tooltip,
  TooltipArrow: () => TooltipArrow,
  TooltipContent: () => TooltipContent,
  TooltipPortal: () => TooltipPortal,
  TooltipProvider: () => TooltipProvider,
  TooltipTrigger: () => TooltipTrigger,
  Trigger: () => TooltipTrigger,
  createTooltipScope: () => createTooltipScope
});
import * as React31 from "react";
import { jsx as jsx17, jsxs } from "react/jsx-runtime";
var __defProp26 = Object.defineProperty;
var __name26 = (target, value) => __defProp26(target, "name", { value, configurable: true });
var [createTooltipContext, createTooltipScope] = createContextScope("Tooltip", [
  createPopperScope
]);
var usePopperScope = createPopperScope();
var PROVIDER_NAME = "TooltipProvider";
var DEFAULT_DELAY_DURATION = 700;
var TOOLTIP_OPEN = "tooltip.open";
var [TooltipProviderContextProvider, useTooltipProviderContext] = createTooltipContext(PROVIDER_NAME);
var TooltipProvider = /* @__PURE__ */ __name26((props) => {
  const {
    __scopeTooltip,
    delayDuration = DEFAULT_DELAY_DURATION,
    skipDelayDuration = 300,
    disableHoverableContent = false,
    children
  } = props;
  const isOpenDelayedRef = React31.useRef(true);
  const isPointerInTransitRef = React31.useRef(false);
  const skipDelayTimerRef = React31.useRef(0);
  React31.useEffect(() => {
    const skipDelayTimer = skipDelayTimerRef.current;
    return () => window.clearTimeout(skipDelayTimer);
  }, []);
  return /* @__PURE__ */ jsx17(
    TooltipProviderContextProvider,
    {
      scope: __scopeTooltip,
      isOpenDelayedRef,
      delayDuration,
      onOpen: React31.useCallback(() => {
        if (skipDelayDuration <= 0) return;
        window.clearTimeout(skipDelayTimerRef.current);
        isOpenDelayedRef.current = false;
      }, [skipDelayDuration]),
      onClose: React31.useCallback(() => {
        if (skipDelayDuration <= 0) return;
        window.clearTimeout(skipDelayTimerRef.current);
        skipDelayTimerRef.current = window.setTimeout(
          () => isOpenDelayedRef.current = true,
          skipDelayDuration
        );
      }, [skipDelayDuration]),
      isPointerInTransitRef,
      onPointerInTransitChange: React31.useCallback((inTransit) => {
        isPointerInTransitRef.current = inTransit;
      }, []),
      disableHoverableContent,
      children
    }
  );
}, "TooltipProvider");
var TOOLTIP_NAME = "Tooltip";
var [TooltipContextProvider, useTooltipContext] = createTooltipContext(TOOLTIP_NAME);
var Tooltip = /* @__PURE__ */ __name26((props) => {
  const {
    __scopeTooltip,
    children,
    open: openProp,
    defaultOpen,
    onOpenChange,
    disableHoverableContent: disableHoverableContentProp,
    delayDuration: delayDurationProp
  } = props;
  const providerContext = useTooltipProviderContext(TOOLTIP_NAME, props.__scopeTooltip);
  const popperScope = usePopperScope(__scopeTooltip);
  const [trigger, setTrigger] = React31.useState(null);
  const [contentIdState, setContentId] = React31.useState(void 0);
  const generatedContentId = useId();
  const openTimerRef = React31.useRef(0);
  const disableHoverableContent = disableHoverableContentProp ?? providerContext.disableHoverableContent;
  const delayDuration = delayDurationProp ?? providerContext.delayDuration;
  const wasOpenDelayedRef = React31.useRef(false);
  const [open, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen ?? false,
    onChange: /* @__PURE__ */ __name26((open2) => {
      if (open2) {
        providerContext.onOpen();
        document.dispatchEvent(new CustomEvent(TOOLTIP_OPEN));
      } else {
        providerContext.onClose();
      }
      onOpenChange?.(open2);
    }, "onChange"),
    caller: TOOLTIP_NAME
  });
  const stateAttribute = React31.useMemo(() => {
    return open ? wasOpenDelayedRef.current ? "delayed-open" : "instant-open" : "closed";
  }, [open]);
  const handleOpen = React31.useCallback(() => {
    window.clearTimeout(openTimerRef.current);
    openTimerRef.current = 0;
    wasOpenDelayedRef.current = false;
    setOpen(true);
  }, [setOpen]);
  const handleClose = React31.useCallback(() => {
    window.clearTimeout(openTimerRef.current);
    openTimerRef.current = 0;
    setOpen(false);
  }, [setOpen]);
  const handleDelayedOpen = React31.useCallback(() => {
    window.clearTimeout(openTimerRef.current);
    openTimerRef.current = window.setTimeout(() => {
      wasOpenDelayedRef.current = true;
      setOpen(true);
      openTimerRef.current = 0;
    }, delayDuration);
  }, [delayDuration, setOpen]);
  React31.useEffect(() => {
    return () => {
      if (openTimerRef.current) {
        window.clearTimeout(openTimerRef.current);
        openTimerRef.current = 0;
      }
    };
  }, []);
  const contentId = contentIdState ?? generatedContentId;
  return /* @__PURE__ */ jsx17(Popper, { ...popperScope, children: /* @__PURE__ */ jsx17(
    TooltipContextProvider,
    {
      scope: __scopeTooltip,
      contentId,
      setContentId,
      open,
      stateAttribute,
      trigger,
      onTriggerChange: setTrigger,
      onTriggerEnter: React31.useCallback(() => {
        if (providerContext.isOpenDelayedRef.current) handleDelayedOpen();
        else handleOpen();
      }, [providerContext.isOpenDelayedRef, handleDelayedOpen, handleOpen]),
      onTriggerLeave: React31.useCallback(() => {
        if (disableHoverableContent) {
          handleClose();
        } else {
          window.clearTimeout(openTimerRef.current);
          openTimerRef.current = 0;
        }
      }, [handleClose, disableHoverableContent]),
      onOpen: handleOpen,
      onClose: handleClose,
      disableHoverableContent,
      children
    }
  ) });
}, "Tooltip");
var TRIGGER_NAME3 = "TooltipTrigger";
var TooltipTrigger = /* @__PURE__ */ React31.forwardRef(
  /* @__PURE__ */ __name26(function TooltipTrigger2(props, forwardedRef) {
    const { __scopeTooltip, "aria-describedby": ariaDescribedby, ...triggerProps } = props;
    const context = useTooltipContext(TRIGGER_NAME3, __scopeTooltip);
    const providerContext = useTooltipProviderContext(TRIGGER_NAME3, __scopeTooltip);
    const popperScope = usePopperScope(__scopeTooltip);
    const ref = React31.useRef(null);
    const composedRefs = useComposedRefs(forwardedRef, ref, context.onTriggerChange);
    const isPointerDownRef = React31.useRef(false);
    const hasPointerMoveOpenedRef = React31.useRef(false);
    const handlePointerUp = React31.useCallback(() => isPointerDownRef.current = false, []);
    React31.useEffect(() => {
      return () => document.removeEventListener("pointerup", handlePointerUp);
    }, [handlePointerUp]);
    return /* @__PURE__ */ jsx17(PopperAnchor, { asChild: true, ...popperScope, children: /* @__PURE__ */ jsx17(
      Primitive.button,
      {
        "aria-describedby": context.open ? concatAriaDescribedby2(ariaDescribedby, context.contentId) : ariaDescribedby,
        "data-state": context.stateAttribute,
        ...triggerProps,
        ref: composedRefs,
        onPointerMove: composeEventHandlers(props.onPointerMove, (event) => {
          if (event.pointerType === "touch") return;
          if (!hasPointerMoveOpenedRef.current && !providerContext.isPointerInTransitRef.current) {
            context.onTriggerEnter();
            hasPointerMoveOpenedRef.current = true;
          }
        }),
        onPointerLeave: composeEventHandlers(props.onPointerLeave, () => {
          context.onTriggerLeave();
          hasPointerMoveOpenedRef.current = false;
        }),
        onPointerDown: composeEventHandlers(props.onPointerDown, () => {
          if (context.open) {
            context.onClose();
          }
          isPointerDownRef.current = true;
          document.addEventListener("pointerup", handlePointerUp, { once: true });
        }),
        onFocus: composeEventHandlers(props.onFocus, () => {
          if (!isPointerDownRef.current) context.onOpen();
        }),
        onBlur: composeEventHandlers(props.onBlur, context.onClose),
        onClick: composeEventHandlers(props.onClick, context.onClose)
      }
    ) });
  }, "TooltipTrigger")
);
var PORTAL_NAME = "TooltipPortal";
var [PortalProvider, usePortalContext] = createTooltipContext(PORTAL_NAME, {
  forceMount: void 0
});
var TooltipPortal = /* @__PURE__ */ __name26((props) => {
  const { __scopeTooltip, forceMount, children, container } = props;
  const context = useTooltipContext(PORTAL_NAME, __scopeTooltip);
  return /* @__PURE__ */ jsx17(PortalProvider, { scope: __scopeTooltip, forceMount, children: /* @__PURE__ */ jsx17(Presence, { present: forceMount || context.open, children: /* @__PURE__ */ jsx17(Portal, { asChild: true, container, children }) }) });
}, "TooltipPortal");
var CONTENT_NAME4 = "TooltipContent";
var TooltipContent = /* @__PURE__ */ React31.forwardRef(
  /* @__PURE__ */ __name26(function TooltipContent2(props, forwardedRef) {
    const portalContext = usePortalContext(CONTENT_NAME4, props.__scopeTooltip);
    const { forceMount = portalContext.forceMount, side = "top", ...contentProps } = props;
    const context = useTooltipContext(CONTENT_NAME4, props.__scopeTooltip);
    return /* @__PURE__ */ jsx17(Presence, { present: forceMount || context.open, children: context.disableHoverableContent ? /* @__PURE__ */ jsx17(TooltipContentImpl, { side, ...contentProps, ref: forwardedRef }) : /* @__PURE__ */ jsx17(TooltipContentHoverable, { side, ...contentProps, ref: forwardedRef }) });
  }, "TooltipContent")
);
var TooltipContentHoverable = /* @__PURE__ */ React31.forwardRef(/* @__PURE__ */ __name26(function TooltipContentHoverable2(props, forwardedRef) {
  const context = useTooltipContext(CONTENT_NAME4, props.__scopeTooltip);
  const providerContext = useTooltipProviderContext(CONTENT_NAME4, props.__scopeTooltip);
  const ref = React31.useRef(null);
  const composedRefs = useComposedRefs(forwardedRef, ref);
  const [pointerGraceArea, setPointerGraceArea] = React31.useState(null);
  const { trigger, onClose } = context;
  const content = ref.current;
  const { onPointerInTransitChange } = providerContext;
  const handleRemoveGraceArea = React31.useCallback(() => {
    setPointerGraceArea(null);
    onPointerInTransitChange(false);
  }, [onPointerInTransitChange]);
  const handleCreateGraceArea = React31.useCallback(
    (event, hoverTarget) => {
      const currentTarget = event.currentTarget;
      const exitPoint = { x: event.clientX, y: event.clientY };
      const exitSide = getExitSideFromRect(exitPoint, currentTarget.getBoundingClientRect());
      const paddedExitPoints = getPaddedExitPoints(exitPoint, exitSide);
      const hoverTargetPoints = getPointsFromRect(hoverTarget.getBoundingClientRect());
      const graceArea = getHull([...paddedExitPoints, ...hoverTargetPoints]);
      setPointerGraceArea(graceArea);
      onPointerInTransitChange(true);
    },
    [onPointerInTransitChange]
  );
  React31.useEffect(() => {
    return () => handleRemoveGraceArea();
  }, [handleRemoveGraceArea]);
  React31.useEffect(() => {
    if (trigger && content) {
      const handleTriggerLeave = /* @__PURE__ */ __name26((event) => handleCreateGraceArea(event, content), "handleTriggerLeave");
      const handleContentLeave = /* @__PURE__ */ __name26((event) => handleCreateGraceArea(event, trigger), "handleContentLeave");
      trigger.addEventListener("pointerleave", handleTriggerLeave);
      content.addEventListener("pointerleave", handleContentLeave);
      return () => {
        trigger.removeEventListener("pointerleave", handleTriggerLeave);
        content.removeEventListener("pointerleave", handleContentLeave);
      };
    }
  }, [trigger, content, handleCreateGraceArea, handleRemoveGraceArea]);
  React31.useEffect(() => {
    if (pointerGraceArea) {
      const handleTrackPointerGrace = /* @__PURE__ */ __name26((event) => {
        const target = event.target;
        const pointerPosition = { x: event.clientX, y: event.clientY };
        const hasEnteredTarget = trigger?.contains(target) || content?.contains(target);
        const isPointerOutsideGraceArea = !isPointInPolygon(pointerPosition, pointerGraceArea);
        if (hasEnteredTarget) {
          handleRemoveGraceArea();
        } else if (isPointerOutsideGraceArea) {
          handleRemoveGraceArea();
          onClose();
        }
      }, "handleTrackPointerGrace");
      document.addEventListener("pointermove", handleTrackPointerGrace);
      return () => document.removeEventListener("pointermove", handleTrackPointerGrace);
    }
  }, [trigger, content, pointerGraceArea, onClose, handleRemoveGraceArea]);
  return /* @__PURE__ */ jsx17(TooltipContentImpl, { ...props, ref: composedRefs });
}, "TooltipContentHoverable"));
var Slottable2 = createSlottable("TooltipContent");
var TooltipContentImpl = /* @__PURE__ */ React31.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ __name26(function TooltipContentImpl2(props, forwardedRef) {
    const {
      __scopeTooltip,
      children,
      "aria-label": ariaLabel,
      id: idProp,
      onEscapeKeyDown,
      onPointerDownOutside,
      ...contentProps
    } = props;
    const context = useTooltipContext(CONTENT_NAME4, __scopeTooltip);
    const popperScope = usePopperScope(__scopeTooltip);
    const { onClose } = context;
    const [contentNode, setContentNode] = React31.useState(null);
    const composedRefs = useComposedRefs(forwardedRef, setContentNode);
    useFocusScopeBranch(contentNode);
    React31.useEffect(() => {
      document.addEventListener(TOOLTIP_OPEN, onClose);
      return () => document.removeEventListener(TOOLTIP_OPEN, onClose);
    }, [onClose]);
    React31.useEffect(() => {
      if (context.trigger) {
        const handleScroll = /* @__PURE__ */ __name26((event) => {
          if (event.target instanceof Node && event.target.contains(context.trigger)) {
            onClose();
          }
        }, "handleScroll");
        window.addEventListener("scroll", handleScroll, { capture: true });
        return () => window.removeEventListener("scroll", handleScroll, { capture: true });
      }
    }, [context.trigger, onClose]);
    const { setContentId } = context;
    useLayoutEffect2(() => {
      setContentId(idProp);
      return () => {
        setContentId(void 0);
      };
    }, [idProp, setContentId]);
    return /* @__PURE__ */ jsx17(
      DismissableLayer,
      {
        asChild: true,
        disableOutsidePointerEvents: false,
        onEscapeKeyDown,
        onPointerDownOutside,
        onFocusOutside: (event) => event.preventDefault(),
        onDismiss: onClose,
        children: /* @__PURE__ */ jsxs(
          PopperContent,
          {
            "data-state": context.stateAttribute,
            role: ariaLabel ? void 0 : "tooltip",
            id: ariaLabel ? void 0 : context.contentId,
            ...popperScope,
            ...contentProps,
            ref: composedRefs,
            style: {
              ...contentProps.style,
              // re-namespace exposed content custom properties
              ...{
                "--radix-tooltip-content-transform-origin": "var(--radix-popper-transform-origin)",
                "--radix-tooltip-content-available-width": "var(--radix-popper-available-width)",
                "--radix-tooltip-content-available-height": "var(--radix-popper-available-height)",
                "--radix-tooltip-trigger-width": "var(--radix-popper-anchor-width)",
                "--radix-tooltip-trigger-height": "var(--radix-popper-anchor-height)"
              }
            },
            children: [
              /* @__PURE__ */ jsx17(Slottable2, { children }),
              ariaLabel ? /* @__PURE__ */ jsx17(VisuallyHidden, { id: context.contentId, role: "tooltip", children: ariaLabel }) : null
            ]
          }
        )
      }
    );
  }, "TooltipContentImpl")
);
var TooltipArrow = /* @__PURE__ */ React31.forwardRef(
  /* @__PURE__ */ __name26(function TooltipArrow2(props, forwardedRef) {
    const { __scopeTooltip, ...arrowProps } = props;
    const popperScope = usePopperScope(__scopeTooltip);
    return /* @__PURE__ */ jsx17(PopperArrow, { ...popperScope, ...arrowProps, ref: forwardedRef });
  }, "TooltipArrow")
);
function getExitSideFromRect(point, rect2) {
  const top = Math.abs(rect2.top - point.y);
  const bottom = Math.abs(rect2.bottom - point.y);
  const right = Math.abs(rect2.right - point.x);
  const left = Math.abs(rect2.left - point.x);
  switch (Math.min(top, bottom, right, left)) {
    case left:
      return "left";
    case right:
      return "right";
    case top:
      return "top";
    case bottom:
      return "bottom";
    default:
      throw new Error("unreachable");
  }
}
__name26(getExitSideFromRect, "getExitSideFromRect");
function getPaddedExitPoints(exitPoint, exitSide, padding = 5) {
  const paddedExitPoints = [];
  switch (exitSide) {
    case "top":
      paddedExitPoints.push(
        { x: exitPoint.x - padding, y: exitPoint.y + padding },
        { x: exitPoint.x + padding, y: exitPoint.y + padding }
      );
      break;
    case "bottom":
      paddedExitPoints.push(
        { x: exitPoint.x - padding, y: exitPoint.y - padding },
        { x: exitPoint.x + padding, y: exitPoint.y - padding }
      );
      break;
    case "left":
      paddedExitPoints.push(
        { x: exitPoint.x + padding, y: exitPoint.y - padding },
        { x: exitPoint.x + padding, y: exitPoint.y + padding }
      );
      break;
    case "right":
      paddedExitPoints.push(
        { x: exitPoint.x - padding, y: exitPoint.y - padding },
        { x: exitPoint.x - padding, y: exitPoint.y + padding }
      );
      break;
  }
  return paddedExitPoints;
}
__name26(getPaddedExitPoints, "getPaddedExitPoints");
function getPointsFromRect(rect2) {
  const { top, right, bottom, left } = rect2;
  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom }
  ];
}
__name26(getPointsFromRect, "getPointsFromRect");
function isPointInPolygon(point, polygon) {
  const { x, y } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const ii = polygon[i];
    const jj = polygon[j];
    const xi = ii.x;
    const yi = ii.y;
    const xj = jj.x;
    const yj = jj.y;
    const intersect = yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
__name26(isPointInPolygon, "isPointInPolygon");
function getHull(points) {
  const newPoints = points.slice();
  newPoints.sort((a, b) => {
    if (a.x < b.x) return -1;
    else if (a.x > b.x) return 1;
    else if (a.y < b.y) return -1;
    else if (a.y > b.y) return 1;
    else return 0;
  });
  return getHullPresorted(newPoints);
}
__name26(getHull, "getHull");
function getHullPresorted(points) {
  if (points.length <= 1) return points.slice();
  const upperHull = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    while (upperHull.length >= 2) {
      const q = upperHull[upperHull.length - 1];
      const r2 = upperHull[upperHull.length - 2];
      if ((q.x - r2.x) * (p.y - r2.y) >= (q.y - r2.y) * (p.x - r2.x)) upperHull.pop();
      else break;
    }
    upperHull.push(p);
  }
  upperHull.pop();
  const lowerHull = [];
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    while (lowerHull.length >= 2) {
      const q = lowerHull[lowerHull.length - 1];
      const r2 = lowerHull[lowerHull.length - 2];
      if ((q.x - r2.x) * (p.y - r2.y) >= (q.y - r2.y) * (p.x - r2.x)) lowerHull.pop();
      else break;
    }
    lowerHull.push(p);
  }
  lowerHull.pop();
  if (upperHull.length === 1 && lowerHull.length === 1 && upperHull[0].x === lowerHull[0].x && upperHull[0].y === lowerHull[0].y) {
    return upperHull;
  } else {
    return upperHull.concat(lowerHull);
  }
}
__name26(getHullPresorted, "getHullPresorted");
function concatAriaDescribedby2(...values) {
  const ids2 = /* @__PURE__ */ new Set();
  for (const value of values) {
    if (typeof value !== "string") continue;
    for (const id of String(value).trim().split(/\s+/)) {
      if (id) ids2.add(id);
    }
  }
  return ids2.size > 0 ? Array.from(ids2).join(" ") : void 0;
}
__name26(concatAriaDescribedby2, "concatAriaDescribedby");

// src/client/ui/button.tsx
import { jsx as jsx18 } from "react/jsx-runtime";
var buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-xs font-medium transition-[color,background-color,box-shadow] outline-none select-none disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground",
        ghost: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-7 px-2.5",
        sm: "h-6 px-2 text-[11px]",
        icon: "size-7",
        "icon-sm": "size-6"
      }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
);
function Button({
  className,
  variant,
  size: size4,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? dist_exports.Root : "button";
  return /* @__PURE__ */ jsx18(Comp, { "data-slot": "button", "data-variant": variant ?? "default", type: "button", className: cn(buttonVariants({ variant, size: size4, className })), ...props });
}

// src/client/ui/collapsible.tsx
var Collapsible3 = dist_exports2.Root;
var CollapsibleTrigger3 = dist_exports2.Trigger;
var CollapsibleContent3 = dist_exports2.Content;

// src/client/ui/input.tsx
import { jsx as jsx19 } from "react/jsx-runtime";
function Input({ className, ...props }) {
  return /* @__PURE__ */ jsx19(
    "input",
    {
      "data-slot": "input",
      spellCheck: false,
      autoComplete: "off",
      className: cn(
        "h-7 w-full min-w-0 rounded-md border border-input bg-input/30 px-2 font-mono text-[11.5px] text-foreground shadow-xs outline-none transition-[color,box-shadow,border-color]",
        "placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
        className
      ),
      ...props
    }
  );
}

// src/client/ui/kbd.tsx
import { jsx as jsx20 } from "react/jsx-runtime";
function Kbd({ className, ...props }) {
  return /* @__PURE__ */ jsx20(
    "kbd",
    {
      "data-slot": "kbd",
      className: cn(
        "pointer-events-none inline-flex h-4.5 min-w-4.5 items-center justify-center gap-0.5 rounded-sm border border-border/60 bg-muted px-1 font-sans text-[10px] font-medium text-muted-foreground select-none",
        "[[data-slot=button][data-variant=default]_&]:border-white/25 [[data-slot=button][data-variant=default]_&]:bg-white/15 [[data-slot=button][data-variant=default]_&]:text-primary-foreground",
        className
      ),
      ...props
    }
  );
}

// src/client/ui/native-select.tsx
import { jsx as jsx21, jsxs as jsxs2 } from "react/jsx-runtime";
function NativeSelect({ className, wrapperClassName, ...props }) {
  return /* @__PURE__ */ jsxs2("div", { "data-slot": "native-select-wrapper", className: cn("relative w-full min-w-0", wrapperClassName), children: [
    /* @__PURE__ */ jsx21(
      "select",
      {
        "data-slot": "native-select",
        className: cn(
          "h-7 w-full min-w-0 appearance-none truncate rounded-md border border-input bg-input/30 pr-7 pl-2 font-mono text-[11.5px] text-foreground shadow-xs outline-none",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50",
          "[&>option]:bg-popover [&>option]:text-popover-foreground",
          className
        ),
        ...props
      }
    ),
    /* @__PURE__ */ jsx21(ChevronDown, { className: "pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground", "aria-hidden": "true" })
  ] });
}

// src/client/ui/tabs.tsx
import { jsx as jsx23 } from "react/jsx-runtime";
function Tabs3({ className, ...props }) {
  return /* @__PURE__ */ jsx23(dist_exports4.Root, { "data-slot": "tabs", className: cn("flex min-h-0 flex-col", className), ...props });
}
function TabsList3({ className, ...props }) {
  return /* @__PURE__ */ jsx23(
    dist_exports4.List,
    {
      "data-slot": "tabs-list",
      className: cn("inline-flex h-8 w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground", className),
      ...props
    }
  );
}
function TabsTrigger3({ className, ...props }) {
  return /* @__PURE__ */ jsx23(
    dist_exports4.Trigger,
    {
      "data-slot": "tabs-trigger",
      className: cn(
        "inline-flex h-full flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2.5 text-xs font-medium whitespace-nowrap text-muted-foreground transition-[color,box-shadow] outline-none",
        "hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:border-input data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        "[&_svg]:size-3.5 [&_svg]:shrink-0",
        className
      ),
      ...props
    }
  );
}
function TabsContent3({ className, ...props }) {
  return /* @__PURE__ */ jsx23(dist_exports4.Content, { "data-slot": "tabs-content", className: cn("min-h-0 flex-1 outline-none", className), ...props });
}

// src/client/ui/toggle-group.tsx
import { jsx as jsx24 } from "react/jsx-runtime";
function ToggleGroup3({ className, ...props }) {
  return /* @__PURE__ */ jsx24(
    dist_exports6.Root,
    {
      "data-slot": "toggle-group",
      className: cn("inline-flex w-fit items-center rounded-md border border-input bg-input/30 p-0.5 shadow-xs", className),
      ...props
    }
  );
}
function ToggleGroupItem3({ className, ...props }) {
  return /* @__PURE__ */ jsx24(
    dist_exports6.Item,
    {
      "data-slot": "toggle-group-item",
      className: cn(
        "inline-flex h-6 min-w-7 items-center justify-center rounded-[5px] px-1.5 text-muted-foreground transition-colors outline-none",
        "hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
        "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[soft=true]:bg-accent data-[soft=true]:text-foreground",
        "[&_svg]:size-3.5",
        className
      ),
      ...props
    }
  );
}

// src/client/ui/textarea.tsx
import { jsx as jsx25 } from "react/jsx-runtime";
function Textarea({ className, ...props }) {
  return /* @__PURE__ */ jsx25(
    "textarea",
    {
      "data-slot": "textarea",
      spellCheck: true,
      className: cn(
        "field-sizing-content min-h-8 w-full resize-none rounded-md border border-input bg-input/30 px-2 py-1.5 text-[12.5px] leading-snug text-foreground shadow-xs outline-none",
        "placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50",
        className
      ),
      ...props
    }
  );
}

// src/client/ui/portal.tsx
import { createContext as createContext6, useContext as useContext6 } from "react";
var PortalContainer = createContext6(null);
var usePortalContainer = () => useContext6(PortalContainer) ?? void 0;

// src/client/ui/tooltip.tsx
import { Fragment as Fragment2, jsx as jsx26, jsxs as jsxs3 } from "react/jsx-runtime";
var TooltipProvider2 = ({ delayDuration = 300, ...props }) => /* @__PURE__ */ jsx26(dist_exports7.Provider, { "data-slot": "tooltip-provider", delayDuration, ...props });
function TooltipContent3({ className, sideOffset = 6, children, ...props }) {
  const container = usePortalContainer();
  return /* @__PURE__ */ jsx26(dist_exports7.Portal, { container, children: /* @__PURE__ */ jsx26(
    dist_exports7.Content,
    {
      "data-slot": "tooltip-content",
      sideOffset,
      collisionPadding: 8,
      className: cn(
        // above the panel itself (z-index 2147483000); Radix copies it onto the positioning wrapper
        "z-[2147483647] w-fit max-w-64 rounded-md bg-foreground px-2 py-1 text-[11px] leading-snug text-balance text-background shadow-md",
        "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        className
      ),
      ...props,
      children
    }
  ) });
}
function Tip({ label: label2, side, children }) {
  if (!label2) return /* @__PURE__ */ jsx26(Fragment2, { children });
  return /* @__PURE__ */ jsxs3(dist_exports7.Root, { children: [
    /* @__PURE__ */ jsx26(dist_exports7.Trigger, { asChild: true, children }),
    /* @__PURE__ */ jsx26(TooltipContent3, { side, children: label2 })
  ] });
}

// src/client/Panel.tsx
import { Fragment as Fragment3, jsx as jsx27, jsxs as jsxs4 } from "react/jsx-runtime";
var OPEN_KEY = "domeditor:open";
var DOCK_KEY = "domeditor:dock";
var TAB_KEY = "domeditor:tab";
var SIDES2 = ["top", "right", "bottom", "left"];
var PROPS = [
  "font-size",
  "line-height",
  "font-weight",
  "letter-spacing",
  "text-align",
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "margin",
  "margin-top",
  "margin-bottom",
  "gap",
  "row-gap",
  "column-gap",
  "max-width",
  "width",
  "min-width",
  "height",
  "justify-content",
  "align-items",
  "align-content",
  "justify-items",
  "grid-template-columns",
  "flex-direction",
  "flex-wrap",
  "border-radius",
  "color",
  "background",
  "text-wrap",
  "white-space"
];
var isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
var MOD = isMac ? "\u2318" : "Ctrl";
var ALT = isMac ? "\u2325" : "Alt";
var hostEl = null;
var setHost = (el) => {
  hostEl = el;
};
var mine = (t) => t instanceof Node && !!hostEl?.contains(t);
var useStore = () => useSyncExternalStore(store.subscribe, store.getVersion);
function readLocal(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function writeLocal(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
  }
}
function Panel() {
  useStore();
  const [open, setOpen] = useState15(() => readLocal(OPEN_KEY, "0") === "1");
  const [dock, setDock] = useState15(() => readLocal(DOCK_KEY, "right"));
  useEffect14(() => writeLocal(OPEN_KEY, open ? "1" : "0"), [open]);
  useEffect14(() => writeLocal(DOCK_KEY, dock), [dock]);
  useEffect14(() => {
    const onKey = (e) => {
      if (e.code === "KeyE" && e.altKey && e.shiftKey) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect14(() => {
    if (!open) return;
    const armed = (e) => (store.picking || e.altKey) && !mine(e.target);
    const onMove = (e) => {
      store.hovered = armed(e) ? e.target : null;
    };
    const block = (e) => {
      if (armed(e)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onClick = (e) => {
      if (!armed(e)) return;
      e.preventDefault();
      e.stopPropagation();
      store.hovered = null;
      store.select(e.target);
    };
    const onKey = (e) => {
      if (e.key === "Escape" && store.picking) {
        store.picking = false;
        store.hovered = null;
        store.emit();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s" && store.pending) {
        e.preventDefault();
        void store.save();
      }
    };
    const onResize = () => store.emit();
    const blocked = ["pointerdown", "mousedown", "pointerup", "mouseup", "dblclick", "contextmenu"];
    document.addEventListener("pointermove", onMove, true);
    for (const t of blocked) document.addEventListener(t, block, true);
    document.addEventListener("click", onClick, true);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointermove", onMove, true);
      for (const t of blocked) document.removeEventListener(t, block, true);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", onResize);
      store.hovered = null;
    };
  }, [open]);
  if (!open) {
    return /* @__PURE__ */ jsxs4(
      Button,
      {
        variant: "secondary",
        onClick: () => setOpen(true),
        className: "fixed right-4 bottom-4 z-[2147483000] h-8 rounded-full border px-3 shadow-lg opacity-85 hover:opacity-100",
        children: [
          /* @__PURE__ */ jsx27(SquareDashedMousePointer, {}),
          " Styles",
          store.pending > 0 && /* @__PURE__ */ jsx27("span", { className: "size-1.5 rounded-full bg-warning" }),
          /* @__PURE__ */ jsxs4(Kbd, { className: "ml-0.5", children: [
            "\u21E7",
            ALT,
            "E"
          ] })
        ]
      }
    );
  }
  const DockIcon = dock === "right" ? PanelLeft : PanelRight;
  return /* @__PURE__ */ jsxs4(Fragment3, { children: [
    /* @__PURE__ */ jsx27(Overlay, {}),
    /* @__PURE__ */ jsxs4(
      "aside",
      {
        "aria-label": "Style editor",
        className: cn(
          "fixed top-2 bottom-2 z-[2147483000] flex w-[360px] max-w-[calc(100vw-16px)] flex-col overflow-hidden rounded-xl border bg-background text-foreground shadow-2xl",
          dock === "left" ? "left-2" : "right-2",
          "max-[520px]:inset-x-2 max-[520px]:top-[45vh] max-[520px]:w-auto"
        ),
        children: [
          /* @__PURE__ */ jsxs4("header", { className: "flex h-11 shrink-0 items-center gap-2 border-b px-3", children: [
            /* @__PURE__ */ jsx27(SquareDashedMousePointer, { className: "size-4 text-primary" }),
            /* @__PURE__ */ jsx27("span", { className: "text-[13px] font-semibold", children: "Styles" }),
            /* @__PURE__ */ jsx27(Tip, { label: "Viewport width: @media rules depend on it", children: /* @__PURE__ */ jsxs4(Badge, { variant: "outline", className: "font-mono", children: [
              window.innerWidth,
              "px"
            ] }) }),
            !isEverywhere(store.scope) && /* @__PURE__ */ jsx27(Tip, { label: "Edits apply only here. Change it under Design \u2192 When.", children: /* @__PURE__ */ jsx27(Badge, { variant: "warning", className: "max-w-28 truncate", children: [store.scope.mode === "all" ? "" : store.scope.mode === "dark" ? "Dark" : "Light", store.scope.width ? `${store.scope.width.kind === "max" ? "\u2264" : "\u2265"}${store.scope.width.px}px` : ""].filter(Boolean).join(" \xB7 ") }) }),
            /* @__PURE__ */ jsx27("span", { className: "flex-1" }),
            /* @__PURE__ */ jsx27(Tip, { label: /* @__PURE__ */ jsxs4(Fragment3, { children: [
              "Pick an element. Or ",
              ALT,
              "+click anything, any time. ",
              /* @__PURE__ */ jsx27(Kbd, { children: "Esc" }),
              " stops."
            ] }), children: /* @__PURE__ */ jsxs4(
              Button,
              {
                size: "sm",
                variant: store.picking ? "default" : "outline",
                "aria-pressed": store.picking,
                onClick: () => {
                  store.picking = !store.picking;
                  store.emit();
                },
                children: [
                  /* @__PURE__ */ jsx27(MousePointer2, {}),
                  " Pick"
                ]
              }
            ) }),
            /* @__PURE__ */ jsx27(Tip, { label: "Move to the other side", children: /* @__PURE__ */ jsx27(Button, { size: "icon-sm", variant: "ghost", "aria-label": "Move to the other side", onClick: () => setDock(dock === "right" ? "left" : "right"), children: /* @__PURE__ */ jsx27(DockIcon, {}) }) }),
            /* @__PURE__ */ jsx27(Tip, { label: /* @__PURE__ */ jsxs4(Fragment3, { children: [
              "Close ",
              /* @__PURE__ */ jsxs4(Kbd, { children: [
                "\u21E7",
                ALT,
                "E"
              ] })
            ] }), children: /* @__PURE__ */ jsx27(Button, { size: "icon-sm", variant: "ghost", "aria-label": "Close", onClick: () => setOpen(false), children: /* @__PURE__ */ jsx27(X, {}) }) })
          ] }),
          /* @__PURE__ */ jsx27("div", { className: "min-h-0 flex-1 overflow-y-auto overscroll-contain", children: store.selected?.isConnected ? /* @__PURE__ */ jsx27(Inspector, { el: store.selected }) : /* @__PURE__ */ jsx27(Empty, { gone: !!store.selected }) }),
          /* @__PURE__ */ jsx27(Footer, {})
        ]
      }
    )
  ] });
}
function Empty({ gone }) {
  return /* @__PURE__ */ jsxs4("div", { className: "grid gap-4 p-4 text-muted-foreground", children: [
    gone && /* @__PURE__ */ jsx27("p", { className: "text-warning", children: "The selected element left the page." }),
    /* @__PURE__ */ jsxs4("div", { className: "grid justify-items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center", children: [
      /* @__PURE__ */ jsx27(MousePointer2, { className: "size-5 text-foreground" }),
      /* @__PURE__ */ jsxs4("p", { className: "text-foreground", children: [
        /* @__PURE__ */ jsx27("b", { children: "Pick" }),
        " an element, or ",
        /* @__PURE__ */ jsx27(Kbd, { children: ALT }),
        " + click anything on the page."
      ] })
    ] }),
    /* @__PURE__ */ jsxs4("ul", { className: "grid list-disc gap-2 pl-4 leading-relaxed", children: [
      /* @__PURE__ */ jsxs4("li", { children: [
        "Use ",
        /* @__PURE__ */ jsx27("b", { className: "text-foreground", children: "\u2212" }),
        " and ",
        /* @__PURE__ */ jsx27("b", { className: "text-foreground", children: "+" }),
        ", type a value, or press ",
        /* @__PURE__ */ jsx27(Kbd, { children: "\u2191" }),
        " ",
        /* @__PURE__ */ jsx27(Kbd, { children: "\u2193" }),
        " on any number (",
        /* @__PURE__ */ jsx27(Kbd, { children: "\u21E7" }),
        " \xD710, ",
        /* @__PURE__ */ jsx27(Kbd, { children: ALT }),
        " \xD70.1)."
      ] }),
      /* @__PURE__ */ jsxs4("li", { children: [
        "Changes show at once. ",
        /* @__PURE__ */ jsx27("b", { className: "text-foreground", children: "Save" }),
        " (",
        /* @__PURE__ */ jsxs4(Kbd, { children: [
          MOD,
          " S"
        ] }),
        ") writes them into the .css file the rule lives in."
      ] }),
      /* @__PURE__ */ jsxs4("li", { children: [
        "Change the words too: the ",
        /* @__PURE__ */ jsx27("b", { className: "text-foreground", children: "Text" }),
        " section saves new copy into the component it is written in."
      ] }),
      /* @__PURE__ */ jsxs4("li", { children: [
        "Styles for other screen sizes are listed under ",
        /* @__PURE__ */ jsx27("b", { className: "text-foreground", children: "All styles" }),
        ": edit the phone layout from your desktop."
      ] })
    ] })
  ] });
}
var TEXT_PROPS = ["font-size", "line-height", "font-weight", "letter-spacing", "text-align", "color"];
function Inspector({ el }) {
  const version = useStore();
  const cas = useMemo10(() => cascade(el), [el, version]);
  const inherited = useMemo10(() => inheritedFrom(el, TEXT_PROPS), [el, version]);
  const editable = cas.matches.filter((m) => !m.state && m.live.source);
  const target = store.target && editable.find((m) => m.live.key === store.target) || defaultTarget(el, cas.matches);
  const wt = writeTarget(target);
  const [tab, setTab] = useState15(() => readLocal(TAB_KEY, "design"));
  const cs = getComputedStyle(el);
  const r2 = el.getBoundingClientRect();
  const ancestors = [];
  for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) ancestors.unshift(p);
  return /* @__PURE__ */ jsxs4(Fragment3, { children: [
    /* @__PURE__ */ jsxs4("section", { className: "grid grid-cols-[minmax(0,1fr)] gap-1.5 border-b px-3 pt-2.5 pb-3", children: [
      /* @__PURE__ */ jsx27("nav", { "aria-label": "Parents", className: "flex flex-wrap items-center gap-0.5 font-mono text-[10.5px] text-muted-foreground", children: ancestors.slice(-4).map((a, i) => /* @__PURE__ */ jsxs4("span", { className: "inline-flex items-center gap-0.5", children: [
        /* @__PURE__ */ jsx27("button", { type: "button", className: "rounded px-1 py-0.5 hover:bg-accent hover:text-foreground", title: label(a), onClick: () => store.select(a), children: short(label(a), 22) }),
        /* @__PURE__ */ jsx27(ChevronRight, { className: "size-3 opacity-50" })
      ] }, i)) }),
      /* @__PURE__ */ jsxs4("div", { className: "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2", children: [
        /* @__PURE__ */ jsx27("code", { className: "truncate font-mono text-[12.5px] font-medium text-primary", title: label(el), children: label(el) }),
        /* @__PURE__ */ jsxs4("div", { className: "flex items-center gap-0.5", children: [
          /* @__PURE__ */ jsxs4(Badge, { variant: "outline", className: "mr-1 font-mono", children: [
            Math.round(r2.width),
            " \xD7 ",
            Math.round(r2.height)
          ] }),
          /* @__PURE__ */ jsx27(Tip, { label: "Copy this element's look, to paste onto another element", children: /* @__PURE__ */ jsx27(Button, { size: "icon-sm", variant: "ghost", "aria-label": "Copy style", onClick: () => copyLook(el), children: /* @__PURE__ */ jsx27(Copy, {}) }) }),
          /* @__PURE__ */ jsx27(Tip, { label: "Select the parent", children: /* @__PURE__ */ jsx27(
            Button,
            {
              size: "icon-sm",
              variant: "ghost",
              "aria-label": "Parent",
              disabled: !el.parentElement || el.parentElement === document.documentElement,
              onClick: () => el.parentElement && store.select(el.parentElement),
              children: /* @__PURE__ */ jsx27(ArrowUp, {})
            }
          ) }),
          /* @__PURE__ */ jsx27(Tip, { label: "Select the first child", children: /* @__PURE__ */ jsx27(
            Button,
            {
              size: "icon-sm",
              variant: "ghost",
              "aria-label": "First child",
              disabled: !el.children.length,
              onClick: () => el.children[0] && store.select(el.children[0]),
              children: /* @__PURE__ */ jsx27(ArrowDown, {})
            }
          ) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs4("div", { className: "text-[11px] text-muted-foreground", children: [
        px(cs.fontSize),
        " \xB7 ",
        weightName(cs.fontWeight),
        " ",
        cs.fontWeight,
        " \xB7 line ",
        lineHeightRatio(cs)
      ] }),
      cas.inline.length > 0 && /* @__PURE__ */ jsxs4("div", { className: "mt-1 flex gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning", children: [
        /* @__PURE__ */ jsx27(CircleExclamationPoint, { className: "mt-px size-3.5 shrink-0" }),
        /* @__PURE__ */ jsxs4("p", { children: [
          "An inline style (from the component, or set by a script such as an animation) beats the CSS: ",
          /* @__PURE__ */ jsx27("code", { className: "font-mono text-foreground", children: cas.inline.map((d) => `${d.prop}: ${d.value}`).join("; ") })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs4(Tabs3, { value: tab, onValueChange: (v) => {
      setTab(v);
      writeLocal(TAB_KEY, v);
    }, children: [
      /* @__PURE__ */ jsx27("div", { className: "sticky top-0 z-10 border-b bg-background/95 px-3 py-2 backdrop-blur", children: /* @__PURE__ */ jsxs4(TabsList3, { className: "w-full", children: [
        /* @__PURE__ */ jsx27(TabsTrigger3, { value: "design", children: "Design" }),
        /* @__PURE__ */ jsxs4(TabsTrigger3, { value: "rules", children: [
          "All styles ",
          /* @__PURE__ */ jsx27("span", { className: "text-muted-foreground tabular-nums", children: cas.matches.length })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxs4(TabsContent3, { value: "design", children: [
        clipboard && clipboard.from !== el && /* @__PURE__ */ jsx27(PasteStyle, { el, target, wt }, nodeId(el)),
        /* @__PURE__ */ jsx27(TextSection, { el }),
        /* @__PURE__ */ jsx27(Quick, { el, cs, cas, target, editable, inherited, wt })
      ] }),
      /* @__PURE__ */ jsx27(TabsContent3, { value: "rules", children: /* @__PURE__ */ jsx27(AllStyles, { el, cas, target }) })
    ] })
  ] });
}
var short = (s, n = 26) => s.length > n ? s.slice(0, n - 1) + "\u2026" : s;
var px = (v) => `${Math.round(parseFloat(v) * 10) / 10 || 0}px`;
function lineHeightRatio(cs) {
  const lh = parseFloat(cs.lineHeight), fs = parseFloat(cs.fontSize);
  return lh && fs ? String(Math.round(lh / fs * 100) / 100) : cs.lineHeight;
}
var squash2 = (s) => s.replace(/\s+/g, " ").trim();
function SectionTitle({ children, className }) {
  return /* @__PURE__ */ jsx27("h3", { className: cn("text-[10px] font-semibold tracking-wider text-muted-foreground uppercase", className), children });
}
function Section({ title, aside, children }) {
  return /* @__PURE__ */ jsxs4("section", { className: "grid gap-3 border-b px-3 py-3 last:border-b-0", children: [
    /* @__PURE__ */ jsxs4("div", { className: "flex min-h-5 items-center justify-between gap-2", children: [
      /* @__PURE__ */ jsx27(SectionTitle, { children: title }),
      aside
    ] }),
    children
  ] });
}
function Row({ label: label2, title, note, children }) {
  return /* @__PURE__ */ jsxs4("div", { className: "grid grid-cols-[60px_minmax(0,1fr)] items-start gap-x-2", children: [
    /* @__PURE__ */ jsx27("span", { className: "truncate leading-7 text-muted-foreground", title, children: label2 }),
    /* @__PURE__ */ jsxs4("div", { className: "grid min-w-0 gap-1.5", children: [
      children,
      note
    ] })
  ] });
}
function writeTarget(target) {
  const src = target?.live.source;
  if (!target || !src) return null;
  if (isEverywhere(store.scope)) {
    const key = target.live.key;
    return { decls: store.declsOf(key), write: (fn) => store.setDecls(key, fn(store.declsOf(key))), key, scoped: null };
  }
  const scoped = store.scopedTargets(src);
  const read = (t) => t.key ? store.declsOf(t.key) : store.virtualDecls(t.file, t.rule);
  return {
    decls: read(scoped[0]),
    key: null,
    scoped,
    // the scoped rules mirror each other (dark mode by system setting, and by theme switch)
    write: (fn) => {
      const next = fn(read(scoped[0]));
      for (const t of scoped) {
        if (t.key) store.setDecls(t.key, next);
        else store.setVirtual(t.file, t.rule, next);
      }
    }
  };
}
function ScopePicker({ wt }) {
  const scope = store.scope;
  const widths = widthOptions([...store.sources.values()], window.innerWidth);
  if (scope.width && !widths.some((w) => w.kind === scope.width.kind && w.px === scope.width.px)) widths.unshift(scope.width);
  const setMode = (mode) => {
    store.scope = { ...scope, mode };
    store.emit();
  };
  const setWidth = (v) => {
    const [kind, px2] = v.split(":");
    store.scope = { ...scope, width: v ? { kind, px: Number(px2) } : null };
    store.emit();
  };
  const dark = pageIsDark();
  const cond = widthCondition(scope.width);
  const hiddenNow = scope.mode === "dark" && !dark ? "The page is in light mode: switch it to dark to see these changes." : scope.mode === "light" && dark ? "The page is in dark mode: switch it to light to see these changes." : cond && !matchMedia(cond).matches ? "Not at this window width: resize the window to see these changes." : null;
  const fresh = wt?.scoped?.filter((t) => !t.key) ?? [];
  const existing = wt?.scoped?.filter((t) => t.key) ?? [];
  return /* @__PURE__ */ jsxs4("div", { className: "grid gap-1.5", children: [
    /* @__PURE__ */ jsxs4("div", { className: "grid grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1.5", children: [
      /* @__PURE__ */ jsx27("span", { className: "text-muted-foreground", children: "When" }),
      /* @__PURE__ */ jsx27(NativeSelect, { "aria-label": "Mode", value: scope.mode, className: "font-sans", onChange: (e) => setMode(e.target.value), children: ["all", "dark", "light"].map((m) => /* @__PURE__ */ jsx27("option", { value: m, children: modeLabel(m) }, m)) }),
      /* @__PURE__ */ jsxs4(NativeSelect, { "aria-label": "Screen size", value: scope.width ? `${scope.width.kind}:${scope.width.px}` : "", className: "font-sans", onChange: (e) => setWidth(e.target.value), children: [
        /* @__PURE__ */ jsx27("option", { value: "", children: widthLabel(null) }),
        widths.map((w) => /* @__PURE__ */ jsx27("option", { value: `${w.kind}:${w.px}`, children: widthLabel(w) }, `${w.kind}:${w.px}`))
      ] })
    ] }),
    wt?.scoped && /* @__PURE__ */ jsxs4("p", { className: "text-[10.5px] leading-relaxed text-muted-foreground", children: [
      existing.length > 0 && /* @__PURE__ */ jsxs4(Fragment3, { children: [
        "Edits ",
        /* @__PURE__ */ jsx27("code", { className: "font-mono", children: short(existing.map((t) => store.sources.get(t.key)?.selector).join(" + "), 60) }),
        ". "
      ] }),
      fresh.length > 0 && /* @__PURE__ */ jsxs4(Fragment3, { children: [
        "Adds ",
        fresh.length === 1 ? "a rule" : `${fresh.length} rules`,
        " to ",
        shortFile(fresh[0].file),
        " when you save",
        fresh.length > 1 && scope.mode !== "all" ? " (this project switches dark mode by the system setting and by its theme switch)" : "",
        "."
      ] })
    ] }),
    hiddenNow && /* @__PURE__ */ jsxs4("p", { className: "flex items-start gap-1.5 rounded-md border border-warning/30 bg-warning/10 px-2 py-1.5 text-[11px] text-warning", children: [
      /* @__PURE__ */ jsx27(CircleExclamationPoint, { className: "mt-px size-3.5 shrink-0" }),
      hiddenNow
    ] })
  ] });
}
var clipboard = null;
var DEFAULT_GROUPS = () => new Set(GROUPS.filter((g) => g.on).map((g) => g.id));
function copyLook(el) {
  clipboard = copyStyle(el, label(el));
  void navigator.clipboard?.writeText(cssText(clipboard, DEFAULT_GROUPS())).catch(() => {
  });
  store.message = { kind: "ok", text: `Copied the look of ${short(label(el), 30)}. Select another element to paste it.` };
  store.emit();
}
function summarize(diffs) {
  const out = [];
  const used = /* @__PURE__ */ new Set();
  const sets = [
    ["padding", ["top", "right", "bottom", "left"].map((s) => `padding-${s}`)],
    ["margin", ["top", "right", "bottom", "left"].map((s) => `margin-${s}`)],
    ["border-radius", ["top-left", "top-right", "bottom-right", "bottom-left"].map((c) => `border-${c}-radius`)],
    ...["width", "style", "color"].map((part) => [`border-${part}`, ["top", "right", "bottom", "left"].map((s) => `border-${s}-${part}`)]),
    ["gap", ["row-gap", "column-gap"]]
  ];
  const by = new Map(diffs.map((d) => [d.prop, d]));
  for (const d of diffs) {
    if (used.has(d.prop)) continue;
    const set = sets.find(([, props]) => props.includes(d.prop) && props.every((p) => by.get(p)?.value === d.value));
    if (set) {
      set[1].forEach((p) => used.add(p));
      out.push({ key: set[0], group: d.group, name: friendly(set[0]), now: d.now, value: d.value });
    } else {
      used.add(d.prop);
      out.push({ key: d.prop, group: d.group, name: friendly(d.prop), now: d.now, value: d.value });
    }
  }
  return out;
}
function PasteStyle({ el, target, wt }) {
  useStore();
  const [groups, setGroups] = useState15(DEFAULT_GROUPS);
  const [result, setResult] = useState15(null);
  const copied = clipboard;
  const diffs = differences(copied, el);
  const chosen = diffs.filter((d) => groups.has(d.group));
  const rows = summarize(chosen);
  const toggle = (id) => {
    const next = new Set(groups);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setGroups(next);
  };
  const paste = () => {
    if (!target || !wt) return;
    wt.write((d) => pasteInto(d, chosen));
    const cs = getComputedStyle(el);
    const off = chosen.filter((d) => cs.getPropertyValue(d.prop) !== d.target);
    const { winner } = cascade(el);
    const key = wt.key;
    const local = key ? off.filter((d) => winner.get(d.prop) === key) : [];
    if (local.length) wt.write((d) => pasteInto(d, local.map((x) => ({ ...x, value: x.target }))));
    const stronger = key ? off.filter((d) => winner.get(d.prop) !== key) : [];
    setResult(stronger.length ? { ok: false, text: `Pasted, except ${[...new Set(stronger.map((d) => friendly(d.prop.replace(/-(top|right|bottom|left)(-(left|right))?/, ""))))].join(", ")}: a stronger style keeps ${stronger.length === 1 ? "it" : "them"} as ${stronger.length === 1 ? "it is" : "they are"}: paste into that style instead (Changes apply to).` } : { ok: true, text: `Pasted ${rows.length} change${rows.length === 1 ? "" : "s"} into ${target.live.rule.selectorText}. Save to keep them.` });
  };
  const count2 = (id) => summarize(diffs.filter((d) => d.group === id)).length;
  return /* @__PURE__ */ jsxs4("section", { className: "grid gap-2.5 border-b bg-primary/5 px-3 py-3", children: [
    /* @__PURE__ */ jsxs4("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx27(ClipboardPaste, { className: "size-3.5 text-primary" }),
      /* @__PURE__ */ jsxs4("span", { className: "min-w-0 flex-1 truncate text-[11.5px]", children: [
        "Paste the look of ",
        /* @__PURE__ */ jsx27("code", { className: "font-mono text-primary", children: short(copied.label, 28) })
      ] }),
      /* @__PURE__ */ jsx27(Tip, { label: "Forget the copied look", children: /* @__PURE__ */ jsx27(Button, { size: "icon-sm", variant: "ghost", "aria-label": "Forget the copied look", className: "size-5", onClick: () => {
        clipboard = null;
        store.emit();
      }, children: /* @__PURE__ */ jsx27(X, {}) }) })
    ] }),
    diffs.length === 0 ? /* @__PURE__ */ jsx27("p", { className: "text-[11px] text-muted-foreground", children: "This element already looks the same." }) : /* @__PURE__ */ jsxs4(Fragment3, { children: [
      /* @__PURE__ */ jsx27("div", { className: "flex flex-wrap gap-1", children: GROUPS.filter((g) => count2(g.id)).map((g) => /* @__PURE__ */ jsxs4(
        "button",
        {
          type: "button",
          "aria-pressed": groups.has(g.id),
          onClick: () => toggle(g.id),
          className: cn(
            "inline-flex h-6 items-center gap-1 rounded-md border px-2 text-[11px] text-muted-foreground hover:text-foreground",
            groups.has(g.id) && "border-primary bg-primary/15 text-foreground"
          ),
          children: [
            groups.has(g.id) && /* @__PURE__ */ jsx27(Check, { className: "size-3" }),
            g.label,
            " ",
            /* @__PURE__ */ jsx27("span", { className: "tabular-nums opacity-70", children: count2(g.id) })
          ]
        },
        g.id
      )) }),
      /* @__PURE__ */ jsxs4(Collapsible3, { children: [
        /* @__PURE__ */ jsxs4(CollapsibleTrigger3, { className: "group flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground", children: [
          /* @__PURE__ */ jsx27(ChevronRight, { className: "size-3 transition-transform group-data-[state=open]:rotate-90" }),
          " What changes (",
          rows.length,
          ")"
        ] }),
        /* @__PURE__ */ jsx27(CollapsibleContent3, { className: "mt-1.5 grid gap-0.5", children: rows.map((d) => /* @__PURE__ */ jsxs4("div", { className: "grid grid-cols-[110px_minmax(0,1fr)] gap-2 text-[10.5px]", children: [
          /* @__PURE__ */ jsx27("span", { className: "truncate text-muted-foreground", title: d.key, children: d.name }),
          /* @__PURE__ */ jsxs4("span", { className: "truncate font-mono", title: `${d.now} \u2192 ${d.value}`, children: [
            /* @__PURE__ */ jsx27("span", { className: "text-muted-foreground line-through", children: short(d.now, 14) }),
            " \u2192 ",
            short(d.value, 22)
          ] })
        ] }, d.key)) })
      ] }),
      /* @__PURE__ */ jsxs4("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx27("span", { className: "min-w-0 flex-1 truncate text-[10.5px] text-muted-foreground", children: target ? /* @__PURE__ */ jsxs4(Fragment3, { children: [
          "into ",
          /* @__PURE__ */ jsx27("code", { className: "font-mono", children: short(target.live.rule.selectorText, 26) }),
          " (",
          countMatches(withoutStates(target.live.rule.selectorText)),
          " el.)"
        ] }) : "No style to paste into: add one under All styles" }),
        /* @__PURE__ */ jsxs4(Button, { size: "sm", disabled: !wt || !chosen.length, onClick: paste, children: [
          /* @__PURE__ */ jsx27(ClipboardPaste, {}),
          " Paste ",
          rows.length
        ] })
      ] })
    ] }),
    result && /* @__PURE__ */ jsx27("p", { className: cn("text-[11px]", result.ok ? "text-success" : "text-warning"), children: result.text })
  ] });
}
var MAX_TEXTS = 6;
var ids = /* @__PURE__ */ new WeakMap();
var nextId = 0;
var nodeId = (n) => ids.get(n) ?? (ids.set(n, ++nextId), nextId);
var wordy = (t) => /[\p{L}\p{N}]/u.test(t);
var hidden = (n) => !!n.parentElement?.closest("script,style,noscript,svg,template");
function textNodesOf(el) {
  const own = Array.from(el.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE && wordy(store.originalOf(n)));
  if (own.length) return own;
  const out = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => wordy(store.originalOf(n)) && !hidden(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
  });
  while (walker.nextNode() && out.length < 50) out.push(walker.currentNode);
  return out;
}
function containersOf(el) {
  const out = [el];
  for (let p = el.parentElement; p && p !== document.body && out.length < 4; p = p.parentElement) {
    if ((p.textContent?.length ?? 0) > 4e3) break;
    out.push(p);
  }
  return out;
}
function TextSection({ el }) {
  useStore();
  const nodes = useMemo10(() => textNodesOf(el), [el]);
  const indexes = useMemo10(() => containersOf(el).map((c) => ({ el: c, index: textIndex(c, store.originalOf) })), [el]);
  const single = nodes.length === 1 ? squash2(store.originalOf(nodes[0])) : null;
  useEffect14(() => {
    void store.findPlaces(nodes.slice(0, MAX_TEXTS).map((n) => store.originalOf(n)));
    void store.findPieces(indexes.map((i) => i.index.full));
  }, [el]);
  if (!nodes.length) return null;
  const singlePlaces = single ? store.places.get(single) : void 0;
  const direct = Array.isArray(singlePlaces) && singlePlaces.length === 1;
  let split = null;
  if (!direct) {
    for (const { el: c, index: index2 } of indexes) {
      const found = store.pieces.get(index2.full);
      if (!Array.isArray(found) || !found.length) continue;
      const mine2 = index2.at.flatMap(([n], k) => el.contains(n) ? [k] : []);
      const lo = mine2[0] ?? 0, hi = (mine2.at(-1) ?? 0) + 1;
      const pieces = found.filter((p) => p.start < hi && p.end > lo);
      if (!pieces.length) continue;
      let rest = "";
      for (let k = lo; k < hi; k++) rest += pieces.some((p) => k >= p.start && k < p.end) ? " " : index2.full[k];
      split = { container: c, index: index2, pieces, rest: squash2(rest).split(" ").filter(wordy).join(" ") };
      break;
    }
  }
  const looking = !direct && (single !== null && singlePlaces === "looking" || indexes.some((i) => store.pieces.get(i.index.full) === "looking"));
  const aside = /* @__PURE__ */ jsx27("span", { className: "text-[10.5px] text-muted-foreground", children: "saved into the code" });
  if (split) {
    return /* @__PURE__ */ jsxs4(Section, { title: "Text", aside, children: [
      /* @__PURE__ */ jsx27("p", { className: "text-[11px] leading-relaxed text-muted-foreground", children: split.container === el ? "The page splits this text into pieces (for an animation, say). Edit it whole here:" : /* @__PURE__ */ jsxs4(Fragment3, { children: [
        "Part of a longer text in ",
        /* @__PURE__ */ jsx27("code", { className: "font-mono", children: short(label(split.container), 30) }),
        " that the page splits into pieces. Edit it whole here:"
      ] }) }),
      split.pieces.map((p) => /* @__PURE__ */ jsx27(PieceRow, { piece: p, index: split.index }, `${p.file}:${p.line}:${p.start}`)),
      split.rest && /* @__PURE__ */ jsxs4("p", { className: "inline-flex items-start gap-1 text-[10.5px] text-muted-foreground", children: [
        /* @__PURE__ */ jsx27(Database, { className: "mt-px size-3 shrink-0" }),
        " \u201C",
        short(split.rest, 40),
        "\u201D is not written in the code: it comes from data or is put together by the code."
      ] })
    ] });
  }
  if (looking) {
    return /* @__PURE__ */ jsx27(Section, { title: "Text", aside, children: /* @__PURE__ */ jsx27("p", { className: "text-[11px] text-muted-foreground", children: "Looking for it in the code\u2026" }) });
  }
  const shown = nodes.slice(0, MAX_TEXTS);
  return /* @__PURE__ */ jsxs4(Section, { title: "Text", aside, children: [
    shown.map((n) => /* @__PURE__ */ jsx27(TextRow, { node: n, label: n.parentElement !== el ? label(n.parentElement) : void 0 }, nodeId(n))),
    nodes.length > MAX_TEXTS && /* @__PURE__ */ jsxs4("p", { className: "text-[11px] text-muted-foreground", children: [
      nodes.length - MAX_TEXTS,
      " more inside: select the text itself to change it."
    ] })
  ] });
}
function TextBox({ k, original, onChange, disabled }) {
  const c = store.texts.get(k);
  const current = c ? c.after : original;
  const [draft, setDraft] = useState15(current);
  const focused = useRef17(false);
  useEffect14(() => {
    if (!focused.current) setDraft(current);
  }, [current]);
  return /* @__PURE__ */ jsx27(
    Textarea,
    {
      value: draft,
      disabled,
      "aria-label": "Text",
      rows: Math.min(6, Math.max(1, Math.ceil(draft.length / 42))),
      onFocus: () => {
        focused.current = true;
      },
      onBlur: () => {
        focused.current = false;
        setDraft(current);
      },
      onChange: (e) => {
        setDraft(e.target.value);
        onChange(e.target.value);
      },
      onKeyDown: (e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          store.revertText(k);
          e.target.blur();
        }
      }
    }
  );
}
function PlaceLink({ place }) {
  return /* @__PURE__ */ jsx27(Tip, { label: "Open in your code editor", children: /* @__PURE__ */ jsxs4(Button, { variant: "link", size: "sm", className: "h-auto gap-1 font-mono text-[10.5px]", onClick: () => openInEditor(place.file, place.line), children: [
    /* @__PURE__ */ jsx27(FileCode, { className: "size-3" }),
    shortFile(place.file),
    ":",
    place.line
  ] }) });
}
function PieceRow({ piece, index: index2 }) {
  const k = `piece:${piece.file}:${piece.line}:${piece.text}`;
  const c = store.texts.get(k);
  const at2 = { file: piece.file, line: piece.line };
  return /* @__PURE__ */ jsxs4("div", { className: "grid gap-1.5", children: [
    /* @__PURE__ */ jsx27(TextBox, { k, original: piece.text, onChange: (v) => store.setText(k, c?.segments ?? segmentsFor(index2, piece.start, piece.end), piece.text, v, at2) }),
    /* @__PURE__ */ jsxs4("div", { className: "flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-muted-foreground", children: [
      /* @__PURE__ */ jsx27(PlaceLink, { place: at2 }),
      c && /* @__PURE__ */ jsxs4(Button, { variant: "ghost", size: "sm", className: "ml-auto h-5 px-1.5", onClick: () => store.revertText(k), children: [
        /* @__PURE__ */ jsx27(Undo2, { className: "size-3" }),
        " Undo"
      ] })
    ] })
  ] });
}
function TextRow({ node, label: where }) {
  const c = store.texts.get(node);
  const raw = store.originalOf(node);
  const original = squash2(raw);
  const places = store.places.get(original);
  const fromData = Array.isArray(places) && places.length === 0;
  const place = c?.at ?? (Array.isArray(places) && places.length === 1 ? places[0] : void 0);
  const lead = raw.length - raw.trimStart().length;
  const segments = () => [{ node, from: lead, to: raw.trimEnd().length }];
  return /* @__PURE__ */ jsxs4("div", { className: "grid gap-1.5", children: [
    where && /* @__PURE__ */ jsx27("span", { className: "font-mono text-[10.5px] text-muted-foreground", children: short(where, 40) }),
    /* @__PURE__ */ jsx27(TextBox, { k: node, original, disabled: fromData, onChange: (v) => store.setText(node, c?.segments ?? segments(), original, v) }),
    /* @__PURE__ */ jsxs4("div", { className: "flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-muted-foreground", children: [
      places === "looking" && /* @__PURE__ */ jsx27("span", { children: "Looking for it in the code\u2026" }),
      fromData && /* @__PURE__ */ jsxs4("span", { className: "inline-flex items-center gap-1", children: [
        /* @__PURE__ */ jsx27(Database, { className: "size-3" }),
        " Not written in the code: it comes from data, so change it where the data lives."
      ] }),
      place && /* @__PURE__ */ jsx27(PlaceLink, { place }),
      !c?.at && Array.isArray(places) && places.length > 1 && !c?.choices && /* @__PURE__ */ jsxs4("span", { children: [
        "Written in ",
        places.length,
        " places: you choose which when you save."
      ] }),
      c && /* @__PURE__ */ jsxs4(Button, { variant: "ghost", size: "sm", className: "ml-auto h-5 px-1.5", onClick: () => store.revertText(node), children: [
        /* @__PURE__ */ jsx27(Undo2, { className: "size-3" }),
        " Undo"
      ] })
    ] }),
    c?.choices && /* @__PURE__ */ jsxs4("div", { className: "grid gap-1 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px]", children: [
      /* @__PURE__ */ jsxs4("span", { className: "text-warning", children: [
        "This text is written in ",
        c.choices.length,
        " places. Which one is this?"
      ] }),
      c.choices.map((pl) => /* @__PURE__ */ jsxs4(Button, { variant: "outline", size: "sm", className: "justify-start font-mono", onClick: () => store.chooseTextPlace(node, pl), children: [
        shortFile(pl.file),
        ":",
        pl.line
      ] }, `${pl.file}:${pl.line}`))
    ] })
  ] });
}
function ruleLabel(m) {
  const n = countMatches(withoutStates(m.live.rule.selectorText));
  const when = m.live.conds.length ? ` \xB7 ${describeCondition(conditionLabel(m.live))}` : "";
  return `${m.live.rule.selectorText}  \xB7  ${n} element${n === 1 ? "" : "s"}${when}${m.active ? "" : " (not at this width)"}`;
}
function Quick({ el, cs, cas, target, editable, inherited, wt }) {
  const key = wt?.key ?? null;
  const decls = wt?.decls ?? [];
  const write = (fn) => wt?.write(fn);
  const set = (prop) => (v) => write((d) => writeProp(d, prop, v));
  const rank = (k) => k === "inline" ? -1 : cas.matches.findIndex((m) => m.live.key === k);
  const overriddenBy = (longhand) => {
    const w = cas.winner.get(longhand);
    if (!w || !key || w === key || rank(w) > rank(key)) return null;
    return w;
  };
  const note = (prop, longhand = prop) => /* @__PURE__ */ jsx27(Note, { prop, over: overriddenBy(longhand), from: readProp(decls, prop) ? null : inherited.get(prop) ?? null });
  const isBox = /flex|grid/.test(cs.display);
  if (!target) {
    return /* @__PURE__ */ jsxs4("div", { className: "p-3 text-muted-foreground", children: [
      "No style rule in your CSS targets this element yet. Add one under ",
      /* @__PURE__ */ jsx27("b", { className: "text-foreground", children: "All styles \u2192 New style" }),
      ", or select a parent."
    ] });
  }
  return /* @__PURE__ */ jsxs4(Fragment3, { children: [
    /* @__PURE__ */ jsxs4(Section, { title: "Changes apply to", children: [
      /* @__PURE__ */ jsx27(NativeSelect, { "aria-label": "Rule the controls edit", value: target.live.key, onChange: (e) => {
        store.target = e.target.value;
        store.emit();
      }, children: editable.map((m) => /* @__PURE__ */ jsx27("option", { value: m.live.key, children: ruleLabel(m) }, m.live.key)) }),
      /* @__PURE__ */ jsx27(RuleMeta, { m: target }),
      /* @__PURE__ */ jsx27(ScopePicker, { wt })
    ] }),
    /* @__PURE__ */ jsxs4(Section, { title: "Typography", children: [
      /* @__PURE__ */ jsx27(Row, { label: "Size", title: "font-size", note: note("font-size"), children: /* @__PURE__ */ jsx27(FontSize, { value: readProp(decls, "font-size"), cs, onChange: set("font-size") }) }),
      /* @__PURE__ */ jsx27(Row, { label: "Weight", title: "font-weight", note: note("font-weight"), children: /* @__PURE__ */ jsx27(Weight, { value: readProp(decls, "font-weight"), computed: cs.fontWeight, onChange: set("font-weight") }) }),
      /* @__PURE__ */ jsx27(Row, { label: "Line", title: "line-height: the space between lines", note: note("line-height"), children: /* @__PURE__ */ jsx27(
        Stepper,
        {
          prop: "line-height",
          value: readProp(decls, "line-height") ?? "",
          placeholder: lineHeightRatio(cs),
          onChange: set("line-height"),
          presets: [["Tight", "1.1"], ["Snug", "1.3"], ["Normal", "1.5"], ["Loose", "1.7"]]
        }
      ) }),
      /* @__PURE__ */ jsx27(Row, { label: "Spacing", title: "letter-spacing: the space between letters", note: note("letter-spacing"), children: /* @__PURE__ */ jsx27(
        Stepper,
        {
          prop: "letter-spacing",
          value: readProp(decls, "letter-spacing") ?? "",
          onChange: set("letter-spacing"),
          placeholder: cs.letterSpacing === "normal" ? "0em" : cs.letterSpacing
        }
      ) }),
      /* @__PURE__ */ jsx27(Row, { label: "Color", title: "color", note: note("color"), children: /* @__PURE__ */ jsx27(ColorField, { prop: "color", value: readProp(decls, "color"), computed: cs.color, onChange: set("color") }) }),
      /* @__PURE__ */ jsx27(Row, { label: "Align", title: "text-align", children: /* @__PURE__ */ jsx27(Align, { declared: readProp(decls, "text-align"), computed: cs.textAlign === "start" ? "left" : cs.textAlign, onPick: set("text-align") }) })
    ] }),
    /* @__PURE__ */ jsxs4(Section, { title: "Spacing", children: [
      /* @__PURE__ */ jsx27(BoxModel, { el, cs, decls, write, overriddenBy }),
      (isBox || readProp(decls, "gap")) && /* @__PURE__ */ jsx27(Row, { label: "Gap", title: "gap: the space between items", note: note("gap", "row-gap"), children: /* @__PURE__ */ jsx27(
        Stepper,
        {
          prop: "gap",
          value: readProp(decls, "gap") ?? "",
          onChange: set("gap"),
          placeholder: cs.rowGap === cs.columnGap ? px(cs.rowGap) : `${px(cs.rowGap)} ${px(cs.columnGap)}`
        }
      ) })
    ] }),
    isBox && /* @__PURE__ */ jsxs4(Section, { title: `Layout \xB7 ${cs.display}`, children: [
      /* @__PURE__ */ jsx27(Row, { label: "Justify", title: "justify-content: along the main direction", children: /* @__PURE__ */ jsx27(
        Choice,
        {
          prop: "justify-content",
          decls,
          write,
          computed: cs.justifyContent,
          options: ["normal", "flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly", "stretch"]
        }
      ) }),
      /* @__PURE__ */ jsx27(Row, { label: "Align", title: "align-items: across the main direction", children: /* @__PURE__ */ jsx27(
        Choice,
        {
          prop: "align-items",
          decls,
          write,
          computed: cs.alignItems,
          options: ["normal", "stretch", "flex-start", "center", "flex-end", "baseline"]
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxs4(Section, { title: "Size", children: [
      /* @__PURE__ */ jsx27(Row, { label: "Width", title: "width", note: note("width"), children: /* @__PURE__ */ jsx27(Stepper, { prop: "width", value: readProp(decls, "width") ?? "", placeholder: px(cs.width), onChange: set("width") }) }),
      /* @__PURE__ */ jsx27(Row, { label: "Max width", title: "max-width", note: note("max-width"), children: /* @__PURE__ */ jsx27(Stepper, { prop: "max-width", value: readProp(decls, "max-width") ?? "", placeholder: cs.maxWidth, onChange: set("max-width") }) })
    ] })
  ] });
}
function Note({ prop, over, from }) {
  if (over) {
    const sel = over === "inline" ? "an inline style" : store.sources.get(over)?.selector ?? "another style";
    return /* @__PURE__ */ jsx27(Tip, { label: `A stronger style sets ${prop}, so changes here will not show.${over === "inline" ? "" : " Click to edit that one instead."}`, children: /* @__PURE__ */ jsxs4(
      "button",
      {
        type: "button",
        className: "justify-self-start truncate text-left text-[10.5px] text-warning hover:underline",
        onClick: () => {
          if (over !== "inline") {
            store.target = over;
            store.emit();
          }
        },
        children: [
          "overridden by ",
          short(sel, 28)
        ]
      }
    ) });
  }
  if (from) {
    return /* @__PURE__ */ jsx27(Tip, { label: "Inherited from a parent. Click to select it.", children: /* @__PURE__ */ jsxs4(
      "button",
      {
        type: "button",
        className: "justify-self-start truncate text-left text-[10.5px] text-muted-foreground hover:text-foreground hover:underline",
        onClick: () => store.select(from.el),
        children: [
          "from ",
          short(store.sources.get(from.key)?.selector ?? label(from.el), 28)
        ]
      }
    ) });
  }
  return null;
}
function RuleMeta({ m }) {
  const src = m.live.source;
  const count2 = useMemo10(() => countMatches(withoutStates(m.live.rule.selectorText)), [m.live.rule.selectorText]);
  return /* @__PURE__ */ jsxs4("div", { className: "flex flex-wrap items-center gap-1.5", children: [
    /* @__PURE__ */ jsx27(Tip, { label: "Every element this style applies to: hover to outline them on the page", children: /* @__PURE__ */ jsxs4(
      Badge,
      {
        variant: "outline",
        className: "cursor-default tabular-nums",
        onMouseEnter: () => {
          store.highlight = m.live.key;
        },
        onMouseLeave: () => {
          store.highlight = null;
        },
        children: [
          count2,
          " element",
          count2 === 1 ? "" : "s"
        ]
      }
    ) }),
    m.live.conds.length > 0 && /* @__PURE__ */ jsx27(Tip, { label: conditionLabel(m.live), children: /* @__PURE__ */ jsxs4(Badge, { variant: m.active ? "secondary" : "warning", children: [
      describeCondition(conditionLabel(m.live)),
      m.active ? "" : " \xB7 not now"
    ] }) }),
    m.state && /* @__PURE__ */ jsx27(Badge, { variant: "warning", children: describeState(m.state) }),
    src && /* @__PURE__ */ jsx27(Tip, { label: "Open in your code editor", children: /* @__PURE__ */ jsxs4(Button, { variant: "link", size: "sm", className: "h-5 gap-1 font-mono text-[10.5px] text-muted-foreground hover:text-primary", onClick: () => openInEditor(src.file, src.line), children: [
      /* @__PURE__ */ jsx27(FileCode, { className: "size-3" }),
      shortFile(src.file),
      ":",
      src.line
    ] }) })
  ] });
}
var withoutStates = (selector) => selector.replace(/::?(hover|focus-visible|focus-within|focus|active|visited|before|after|placeholder|marker|selection|first-line|first-letter)\b/g, "").replace(/(^|,)\s*(?=,|$)/g, "$1*") || "*";
function countMatches(selector) {
  try {
    return document.querySelectorAll(selector).length;
  } catch {
    try {
      return document.querySelectorAll(selector.replace(/::?[\w-]+(\([^)]*\))?/g, "") || "*").length;
    } catch {
      return 0;
    }
  }
}
function openInEditor(file, line) {
  const isNext = "next" in window;
  void fetch(isNext ? `/__nextjs_launch-editor?file=${encodeURIComponent(file)}&line1=${line}&column1=1` : `/__open-in-editor?file=${encodeURIComponent(`${store.root ? `${store.root}/` : ""}${file}:${line}`)}`);
}
function BoxModel({ el, cs, decls, write, overriddenBy }) {
  const [linked, setLinked] = useState15({});
  const r2 = el.getBoundingClientRect();
  const side = (base, s) => {
    const prop = `${base}-${s}`;
    const over = overriddenBy(prop);
    return /* @__PURE__ */ jsx27(
      ValueInput,
      {
        prop,
        value: readProp(decls, prop) ?? "",
        placeholder: px(cs.getPropertyValue(prop)),
        title: over ? `${prop}: overridden by ${store.sources.get(over)?.selector ?? "an inline style"}` : prop,
        className: cn("h-6 w-12 border-transparent bg-background/60 px-1 text-center text-[10.5px] shadow-none", over && "border-warning"),
        onChange: (v) => write((d) => linked[base] ? writeSides(d, base, { top: v, right: v, bottom: v, left: v }) : writeProp(d, prop, v)),
        onClear: () => write((d) => writeProp(d, prop, null))
      }
    );
  };
  const ring = (base) => /* @__PURE__ */ jsx27(Tip, { label: linked[base] ? `Editing all four ${base} sides together` : `Set all four ${base} sides together`, children: /* @__PURE__ */ jsxs4(
    "button",
    {
      type: "button",
      "aria-pressed": !!linked[base],
      onClick: () => setLinked({ ...linked, [base]: !linked[base] }),
      className: cn(
        "absolute top-1 left-1.5 inline-flex items-center gap-1 rounded px-1 text-[9.5px] font-semibold tracking-wider uppercase",
        linked[base] ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:text-foreground"
      ),
      children: [
        base,
        " ",
        /* @__PURE__ */ jsx27(Link2, { className: "size-3" })
      ]
    }
  ) });
  const grid = "relative grid grid-cols-[56px_minmax(0,1fr)_56px] grid-rows-[32px_auto_32px] items-center justify-items-center rounded-md";
  return /* @__PURE__ */ jsxs4("div", { className: cn(grid, "border border-dashed border-box-margin bg-box-margin"), children: [
    ring("margin"),
    SIDES2.map((s) => /* @__PURE__ */ jsx27("span", { className: SLOT[s], children: side("margin", s) }, s)),
    /* @__PURE__ */ jsxs4("div", { className: cn(grid, "col-start-2 row-start-2 w-full border border-box-padding bg-box-padding"), children: [
      ring("padding"),
      SIDES2.map((s) => /* @__PURE__ */ jsx27("span", { className: SLOT[s], children: side("padding", s) }, s)),
      /* @__PURE__ */ jsxs4("div", { className: "col-start-2 row-start-2 m-0.5 w-[calc(100%-4px)] rounded border border-box-content bg-box-content px-1 py-2 text-center font-mono text-[11px]", children: [
        Math.round(r2.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth)),
        " \xD7 ",
        Math.round(r2.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - parseFloat(cs.borderTopWidth) - parseFloat(cs.borderBottomWidth))
      ] })
    ] })
  ] });
}
var SLOT = {
  top: "col-start-2 row-start-1",
  bottom: "col-start-2 row-start-3",
  left: "col-start-1 row-start-2",
  right: "col-start-3 row-start-2"
};
function ValueInput({ prop, value, placeholder, onChange, onClear, className, title, disabled }) {
  const [draft, setDraft] = useState15(value);
  const focused = useRef17(false);
  useEffect14(() => {
    if (!focused.current) setDraft(value);
  }, [value]);
  const set = (v) => {
    setDraft(v);
    if (v.trim()) onChange(v.trim());
  };
  return /* @__PURE__ */ jsx27(
    Input,
    {
      className: cn(value ? "text-foreground" : "text-muted-foreground", className),
      value: draft,
      placeholder,
      title: title ?? prop,
      disabled,
      "aria-label": prop,
      onFocus: () => {
        focused.current = true;
      },
      onBlur: () => {
        focused.current = false;
        if (!draft.trim() && value) onClear?.();
        setDraft(value);
      },
      onChange: (e) => set(e.target.value),
      onKeyDown: (e) => {
        const input = e.currentTarget;
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          const base = draft.trim() ? draft : placeholder ?? "";
          const caret = draft.trim() ? input.selectionStart ?? base.length : 0;
          const steps = (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 10 : e.altKey ? 0.1 : 1);
          const r2 = nudge(base, caret, steps, prop);
          if (!r2) return;
          e.preventDefault();
          set(r2.value);
          requestAnimationFrame(() => input.setSelectionRange(r2.start, r2.end));
        } else if (e.key === "Enter") input.blur();
        else if (e.key === "Escape") {
          e.stopPropagation();
          setDraft(value);
          requestAnimationFrame(() => input.blur());
        }
      }
    }
  );
}
var SIZE_PRESETS = [12, 14, 16, 18, 20, 24, 32, 40, 48, 64];
function rootPx() {
  return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
}
var fmt = (n) => String(Math.round(n * 1e3) / 1e3);
function FontSize({ value, cs, onChange }) {
  const now = parseFloat(cs.fontSize);
  const clamp2 = value ? parseClamp(value) : null;
  const rem = !!value && /^[\d.]+rem$/.test(value.trim());
  const sized = (n) => rem ? `${fmt(n / rootPx())}rem` : `${Math.round(n)}px`;
  if (clamp2) {
    return /* @__PURE__ */ jsxs4("div", { className: "grid min-w-0 gap-2 rounded-md border bg-card p-2", children: [
      /* @__PURE__ */ jsxs4("div", { className: "flex min-w-0 items-center gap-2", children: [
        /* @__PURE__ */ jsx27(Badge, { children: "Responsive" }),
        /* @__PURE__ */ jsxs4("span", { className: "min-w-0 truncate text-[10.5px] text-muted-foreground", title: value, children: [
          "now ",
          Math.round(now),
          "px here"
        ] }),
        /* @__PURE__ */ jsx27(Tip, { label: `Use one size everywhere (${Math.round(now)}px)`, children: /* @__PURE__ */ jsx27(Button, { variant: "link", size: "sm", className: "ml-auto h-auto text-[10.5px]", onClick: () => onChange(`${Math.round(now)}px`), children: "Make fixed" }) })
      ] }),
      /* @__PURE__ */ jsxs4("div", { className: "grid grid-cols-[52px_minmax(0,1fr)] items-center gap-x-2 gap-y-1.5 text-[11px] text-muted-foreground", children: [
        /* @__PURE__ */ jsx27("span", { children: "Smallest" }),
        /* @__PURE__ */ jsx27(Stepper, { prop: "font-size", value: clamp2[0], onChange: (v) => v && onChange(composeClamp([v, clamp2[1], clamp2[2]])) }),
        /* @__PURE__ */ jsx27("span", { children: "Largest" }),
        /* @__PURE__ */ jsx27(Stepper, { prop: "font-size", value: clamp2[2], onChange: (v) => v && onChange(composeClamp([clamp2[0], clamp2[1], v])) })
      ] }),
      /* @__PURE__ */ jsxs4("span", { className: "text-[10.5px] text-muted-foreground", children: [
        "Grows with the screen in between (",
        clamp2[1],
        ")."
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxs4("div", { className: "grid gap-1.5", children: [
    /* @__PURE__ */ jsx27(Stepper, { prop: "font-size", value: value ?? "", placeholder: px(cs.fontSize), onChange }),
    /* @__PURE__ */ jsx27(
      "input",
      {
        type: "range",
        min: 8,
        max: 120,
        step: 1,
        value: Math.round(now),
        "aria-label": "Font size",
        className: "h-4 w-full cursor-pointer accent-primary",
        onChange: (e) => onChange(sized(Number(e.target.value)))
      }
    ),
    /* @__PURE__ */ jsx27("div", { className: "flex flex-wrap gap-1", children: SIZE_PRESETS.map((n) => /* @__PURE__ */ jsx27(
      "button",
      {
        type: "button",
        onClick: () => onChange(sized(n)),
        className: cn(
          "h-5 min-w-7 rounded-sm border px-1 font-mono text-[10.5px] tabular-nums text-muted-foreground hover:bg-accent hover:text-foreground",
          Math.round(now) === n && "border-primary bg-primary/15 text-foreground"
        ),
        children: n
      },
      n
    )) })
  ] });
}
function Weight({ value, computed, onChange }) {
  const custom = value && !WEIGHT_NAMES.some(([n2]) => String(n2) === value) ? value : null;
  const n = Number(value ?? computed);
  const step = (dir) => {
    const next = dir > 0 ? (Math.floor(n / 100) + 1) * 100 : (Math.ceil(n / 100) - 1) * 100;
    onChange(String(Math.min(900, Math.max(100, next))));
  };
  return /* @__PURE__ */ jsxs4("div", { className: "flex gap-1", children: [
    /* @__PURE__ */ jsx27(Button, { variant: "outline", size: "icon", "aria-label": "Lighter", disabled: n <= 100, onClick: () => step(-1), children: /* @__PURE__ */ jsx27(Minus, {}) }),
    /* @__PURE__ */ jsxs4(
      NativeSelect,
      {
        "aria-label": "font-weight",
        value: value ?? "",
        className: value ? "font-sans" : "font-sans text-muted-foreground",
        onChange: (e) => onChange(e.target.value || null),
        children: [
          /* @__PURE__ */ jsxs4("option", { value: "", children: [
            weightName(computed),
            " \xB7 ",
            computed,
            value ? " (remove)" : ""
          ] }),
          custom && /* @__PURE__ */ jsxs4("option", { value: custom, children: [
            weightName(custom),
            " \xB7 ",
            custom
          ] }),
          WEIGHT_NAMES.map(([w, name]) => /* @__PURE__ */ jsxs4("option", { value: String(w), children: [
            name,
            " \xB7 ",
            w
          ] }, w))
        ]
      }
    ),
    /* @__PURE__ */ jsx27(Button, { variant: "outline", size: "icon", "aria-label": "Bolder", disabled: n >= 900, onClick: () => step(1), children: /* @__PURE__ */ jsx27(Plus, {}) })
  ] });
}
function Stepper({ prop, value, placeholder, onChange, presets, disabled }) {
  const bump = (dir) => {
    const r2 = nudge(value || placeholder || "0", 0, dir, prop);
    if (r2) onChange(r2.value);
  };
  return /* @__PURE__ */ jsxs4("div", { className: "grid gap-1", children: [
    /* @__PURE__ */ jsxs4("div", { className: "flex gap-1", children: [
      /* @__PURE__ */ jsx27(Button, { variant: "outline", size: "icon", "aria-label": `Less ${prop}`, disabled, onClick: () => bump(-1), children: /* @__PURE__ */ jsx27(Minus, {}) }),
      /* @__PURE__ */ jsx27(
        ValueInput,
        {
          prop,
          value,
          placeholder,
          disabled,
          className: "text-center",
          onChange: (v) => onChange(v),
          onClear: () => onChange(null)
        }
      ),
      /* @__PURE__ */ jsx27(Button, { variant: "outline", size: "icon", "aria-label": `More ${prop}`, disabled, onClick: () => bump(1), children: /* @__PURE__ */ jsx27(Plus, {}) })
    ] }),
    presets && /* @__PURE__ */ jsx27("div", { className: "flex flex-wrap gap-1", children: presets.map(([name, v]) => /* @__PURE__ */ jsx27(
      "button",
      {
        type: "button",
        onClick: () => onChange(v),
        title: `${prop}: ${v}`,
        className: cn(
          "h-5 rounded-sm border px-1.5 text-[10.5px] text-muted-foreground hover:bg-accent hover:text-foreground",
          (value || placeholder) === v && "border-primary bg-primary/15 text-foreground"
        ),
        children: name
      },
      v
    )) })
  ] });
}
function ColorField({ prop, value, computed, onChange }) {
  return /* @__PURE__ */ jsxs4("div", { className: "flex gap-1", children: [
    /* @__PURE__ */ jsx27(Tip, { label: "Pick a colour", children: /* @__PURE__ */ jsx27("label", { className: "relative size-7 shrink-0 cursor-pointer overflow-hidden rounded-md border shadow-xs", style: { background: computed }, children: /* @__PURE__ */ jsx27(
      "input",
      {
        type: "color",
        "aria-label": `${prop} picker`,
        value: toHex(computed),
        onChange: (e) => onChange(e.target.value),
        className: "absolute inset-0 size-full cursor-pointer opacity-0"
      }
    ) }) }),
    /* @__PURE__ */ jsx27(ValueInput, { prop, value: value ?? "", placeholder: toHex(computed), onChange: (v) => onChange(v), onClear: () => onChange(null) })
  ] });
}
var ALIGN_ICONS = { left: TextAlignStart, center: TextAlignCenter, right: TextAlignEnd, justify: TextAlignJustify };
function Align({ declared, computed, onPick }) {
  return /* @__PURE__ */ jsx27(ToggleGroup3, { type: "single", "aria-label": "text-align", value: declared ?? "", onValueChange: (v) => onPick(v || null), children: Object.entries(ALIGN_ICONS).map(([o, Icon2]) => /* @__PURE__ */ jsx27(Tip, { label: declared === o ? `Remove "align ${o}" from this style` : `Align ${o}${!declared && computed === o ? " (current)" : ""}`, children: /* @__PURE__ */ jsx27(ToggleGroupItem3, { value: o, "aria-label": o, "data-soft": !declared && computed === o, children: /* @__PURE__ */ jsx27(Icon2, {}) }) }, o)) });
}
function Choice({ prop, decls, write, computed, options }) {
  const declared = readProp(decls, prop);
  return /* @__PURE__ */ jsxs4(
    NativeSelect,
    {
      "aria-label": prop,
      value: declared ?? "",
      className: declared ? "" : "text-muted-foreground",
      onChange: (e) => write((d) => writeProp(d, prop, e.target.value || null)),
      children: [
        /* @__PURE__ */ jsx27("option", { value: "", children: computed }),
        options.map((o) => /* @__PURE__ */ jsx27("option", { value: o, children: o }, o))
      ]
    }
  );
}
var FRIENDLY = {
  "font-size": "Font size",
  "font-weight": "Weight",
  "font-family": "Font",
  "font-style": "Style",
  font: "Font",
  "line-height": "Line height",
  "letter-spacing": "Letter spacing",
  "text-transform": "Case",
  "text-align": "Align",
  "text-decoration": "Underline",
  "text-wrap": "Wrapping",
  "white-space": "Wrapping",
  color: "Text color",
  background: "Background",
  "background-color": "Background",
  "background-image": "Background image",
  padding: "Padding",
  "padding-top": "Padding top",
  "padding-right": "Padding right",
  "padding-bottom": "Padding bottom",
  "padding-left": "Padding left",
  "padding-inline": "Padding sides",
  "padding-block": "Padding top & bottom",
  margin: "Margin",
  "margin-top": "Margin top",
  "margin-right": "Margin right",
  "margin-bottom": "Margin bottom",
  "margin-left": "Margin left",
  "margin-inline": "Margin sides",
  "margin-block": "Margin top & bottom",
  gap: "Gap",
  "row-gap": "Row gap",
  "column-gap": "Column gap",
  width: "Width",
  height: "Height",
  "max-width": "Max width",
  "min-width": "Min width",
  "max-height": "Max height",
  "min-height": "Min height",
  border: "Border",
  "border-top": "Border top",
  "border-bottom": "Border bottom",
  "border-color": "Border color",
  "border-width": "Border width",
  "border-radius": "Corner radius",
  "box-shadow": "Shadow",
  opacity: "Opacity",
  display: "Display",
  position: "Position",
  top: "Top",
  right: "Right",
  bottom: "Bottom",
  left: "Left",
  inset: "Inset",
  "z-index": "Stacking",
  overflow: "Overflow",
  "justify-content": "Justify",
  "align-items": "Align items",
  "align-self": "Align self",
  "flex-direction": "Direction",
  "flex-wrap": "Wrap",
  flex: "Flex",
  "grid-template-columns": "Columns",
  "grid-template-rows": "Rows",
  transition: "Transition",
  transform: "Transform",
  cursor: "Cursor",
  "box-sizing": "Box sizing",
  "border-style": "Border style",
  "text-decoration-line": "Underline",
  "border-top-left-radius": "Corner top left",
  "border-top-right-radius": "Corner top right",
  "border-bottom-right-radius": "Corner bottom right",
  "border-bottom-left-radius": "Corner bottom left",
  "object-fit": "Image fit",
  "overflow-wrap": "Word breaking",
  "word-break": "Word breaking",
  "pointer-events": "Clicks",
  "aspect-ratio": "Aspect ratio",
  outline: "Outline",
  "outline-offset": "Outline offset"
};
var friendly = (prop) => prop.startsWith("--") ? prop : FRIENDLY[prop] ?? prop;
var isColorish = (prop, value) => /color|^background$|^fill$|^stroke$/.test(prop) && typeof CSS !== "undefined" && CSS.supports("color", value);
var isBase = (m) => !m.live.source || /^(\*|html|body|:root|:host)(?![\w-])/.test(m.part.trim());
function AllStyles({ el, cas, target }) {
  const states = cas.matches.filter((m) => m.state && m.live.source);
  const screens = cas.matches.filter((m) => !m.state && !m.active && m.live.source);
  const here = cas.matches.filter((m) => !m.state && m.active && !isBase(m));
  const base = cas.matches.filter((m) => !states.includes(m) && !screens.includes(m) && !here.includes(m));
  const card = (m) => /* @__PURE__ */ jsx27(StyleCard, { m, cas, isTarget: m === target }, m.live.key);
  return /* @__PURE__ */ jsxs4("div", { className: "grid grid-cols-[minmax(0,1fr)] gap-4 p-3", children: [
    /* @__PURE__ */ jsxs4("div", { className: "flex items-start justify-between gap-2", children: [
      /* @__PURE__ */ jsxs4("p", { className: "text-[11px] leading-relaxed text-muted-foreground", children: [
        "Strongest first. Where two styles set the same thing, the higher one wins; the other is marked ",
        /* @__PURE__ */ jsx27("i", { children: "overridden" }),
        "."
      ] }),
      /* @__PURE__ */ jsx27(NewRule, { el, cas })
    ] }),
    cas.matches.length === 0 && /* @__PURE__ */ jsx27("p", { className: "text-muted-foreground", children: "No style in the project's CSS applies to this element." }),
    here.length > 0 && /* @__PURE__ */ jsx27(Group, { title: "On this element", hint: "Applies now, at this screen size.", children: here.map(card) }),
    screens.length > 0 && /* @__PURE__ */ jsx27(Group, { title: "Other screen sizes", hint: "Applies at other widths only. Edit the phone layout from here.", children: screens.map(card) }),
    states.length > 0 && /* @__PURE__ */ jsx27(Group, { title: "Hover, focus and other states", hint: "Applies while the element is hovered, focused\u2026", children: states.map(card) }),
    base.length > 0 && /* @__PURE__ */ jsxs4(Collapsible3, { className: "grid gap-2", children: [
      /* @__PURE__ */ jsxs4(CollapsibleTrigger3, { className: "group flex items-center gap-1 text-left", children: [
        /* @__PURE__ */ jsx27(ChevronRight, { className: "size-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" }),
        /* @__PURE__ */ jsxs4(SectionTitle, { children: [
          "Base styles \xB7 ",
          base.length
        ] }),
        /* @__PURE__ */ jsx27("span", { className: "ml-1 text-[10.5px] text-muted-foreground", children: "page-wide defaults and framework styles" })
      ] }),
      /* @__PURE__ */ jsx27(CollapsibleContent3, { className: "grid grid-cols-[minmax(0,1fr)] gap-2", children: base.map(card) })
    ] })
  ] });
}
function Group({ title, hint, children }) {
  return /* @__PURE__ */ jsxs4("section", { className: "grid grid-cols-[minmax(0,1fr)] gap-2", children: [
    /* @__PURE__ */ jsxs4("div", { className: "grid gap-0.5", children: [
      /* @__PURE__ */ jsx27(SectionTitle, { children: title }),
      /* @__PURE__ */ jsx27("p", { className: "text-[10.5px] text-muted-foreground", children: hint })
    ] }),
    children
  ] });
}
function StyleCard({ m, cas, isTarget }) {
  const key = m.live.key;
  const src = m.live.source;
  const decls = store.declsOf(key);
  const [adding, setAdding] = useState15(false);
  const [prop, setProp] = useState15("");
  const [val, setVal] = useState15("");
  const changed = store.edits.has(key);
  const set = (fn) => store.setDecls(key, fn(store.declsOf(key)));
  return /* @__PURE__ */ jsxs4("div", { className: cn("grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 rounded-lg border bg-card p-2.5", isTarget && "border-primary/60 ring-1 ring-primary/30"), children: [
    /* @__PURE__ */ jsxs4("div", { className: "flex items-start gap-2", children: [
      /* @__PURE__ */ jsx27("code", { className: "min-w-0 flex-1 font-mono text-[11.5px] break-words text-code", title: m.live.rule.selectorText, children: m.live.rule.selectorText }),
      changed && /* @__PURE__ */ jsx27(Tip, { label: "Undo the changes to this style", children: /* @__PURE__ */ jsx27(Button, { size: "icon-sm", variant: "ghost", "aria-label": "Revert", className: "size-5", onClick: () => store.revert(key), children: /* @__PURE__ */ jsx27(Undo2, {}) }) }),
      isTarget ? /* @__PURE__ */ jsx27(Badge, { variant: "outline", children: "In Design" }) : src && !m.state && /* @__PURE__ */ jsx27(Tip, { label: "Edit this style with the Design controls", children: /* @__PURE__ */ jsx27(Button, { size: "sm", variant: "ghost", className: "h-5 px-1.5", onClick: () => {
        store.target = key;
        store.emit();
      }, children: "Use in Design" }) })
    ] }),
    /* @__PURE__ */ jsx27(RuleMeta, { m }),
    !src ? /* @__PURE__ */ jsxs4("p", { className: "text-[11px] text-muted-foreground", children: [
      "Made by a framework (such as Tailwind), not written in your CSS, so it can't be edited here: ",
      /* @__PURE__ */ jsx27("code", { className: "font-mono break-all", children: m.live.rule.style.cssText })
    ] }) : /* @__PURE__ */ jsxs4("div", { className: "grid gap-1", children: [
      decls.map((d, i) => {
        const applied = cas.applied.has(`${key}#${i}`) || !!m.state || !m.active;
        const swatch = isColorish(d.prop, d.value);
        return /* @__PURE__ */ jsxs4("div", { className: cn("group grid grid-cols-[100px_minmax(0,1fr)_20px] items-center gap-1.5", !applied && "opacity-60"), children: [
          /* @__PURE__ */ jsx27(Tip, { label: applied ? d.prop : `${d.prop}: overridden, a stronger style sets this`, children: /* @__PURE__ */ jsxs4("span", { className: "grid min-w-0 leading-tight", children: [
            /* @__PURE__ */ jsx27("span", { className: "truncate text-[11.5px] text-foreground", children: friendly(d.prop) }),
            !applied && /* @__PURE__ */ jsx27("span", { className: "text-[9.5px] text-warning", children: "overridden" })
          ] }) }),
          /* @__PURE__ */ jsxs4("div", { className: "relative min-w-0", children: [
            swatch && /* @__PURE__ */ jsx27("span", { className: "pointer-events-none absolute top-1/2 left-1.5 size-3.5 -translate-y-1/2 rounded-sm border shadow-xs", style: { background: d.value } }),
            /* @__PURE__ */ jsx27(
              ValueInput,
              {
                prop: d.prop,
                value: d.value + (d.important ? " !important" : ""),
                className: cn("h-6", swatch && "pl-6"),
                onChange: (v) => set((ds) => ds.map((x, j) => j === i ? parseDecl(d.prop, v) : x)),
                onClear: () => set((ds) => ds.filter((_, j) => j !== i))
              }
            )
          ] }),
          /* @__PURE__ */ jsx27(
            Button,
            {
              size: "icon-sm",
              variant: "ghost",
              "aria-label": `Remove ${d.prop}`,
              className: "size-5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
              onClick: () => set((ds) => ds.filter((_, j) => j !== i)),
              children: /* @__PURE__ */ jsx27(X, {})
            }
          )
        ] }, `${d.prop}-${i}`);
      }),
      adding ? /* @__PURE__ */ jsxs4("form", { className: "grid grid-cols-[100px_minmax(0,1fr)_20px] items-center gap-1.5", onSubmit: (e) => {
        e.preventDefault();
        if (!prop.trim() || !val.trim()) return;
        set((ds) => writeProp(ds, prop.trim(), val.trim()));
        setProp("");
        setVal("");
        setAdding(false);
      }, children: [
        /* @__PURE__ */ jsx27(Input, { className: "h-6", list: "domeditor-props", placeholder: "property", value: prop, onChange: (e) => setProp(e.target.value), "aria-label": "New property", autoFocus: true }),
        /* @__PURE__ */ jsx27(Input, { className: "h-6", placeholder: "value", value: val, onChange: (e) => setVal(e.target.value), "aria-label": "New value" }),
        /* @__PURE__ */ jsx27(Button, { type: "submit", size: "icon-sm", variant: "ghost", "aria-label": "Add", className: "size-5", children: /* @__PURE__ */ jsx27(CornerDownLeft, {}) })
      ] }) : /* @__PURE__ */ jsxs4(Button, { variant: "ghost", size: "sm", className: "justify-self-start text-muted-foreground", onClick: () => setAdding(true), children: [
        /* @__PURE__ */ jsx27(Plus, {}),
        " Add a style"
      ] })
    ] })
  ] });
}
var parseDecl = (prop, v) => {
  const important = /!\s*important\s*$/i.test(v);
  return { prop, value: v.replace(/!\s*important\s*$/i, "").trim(), important };
};
function NewRule({ el, cas }) {
  const [open, setOpen] = useState15(false);
  const [sel, setSel] = useState15("");
  const [file, setFile] = useState15("");
  if (!open) {
    return /* @__PURE__ */ jsx27(Tip, { label: "Create a new style for this element in a CSS file", children: /* @__PURE__ */ jsxs4(Button, { size: "sm", variant: "outline", onClick: () => {
      setSel(suggestSelector(el));
      const own = cas.matches.find((m) => m.live.source && !/(^|\/)(globals?|index|styles?|main|app)\.css$/.test(m.live.ref.file));
      setFile(own?.live.ref.file ?? cas.matches.find((m) => m.live.source)?.live.ref.file ?? store.files[0] ?? "");
      setOpen(true);
    }, children: [
      /* @__PURE__ */ jsx27(Plus, {}),
      " New style"
    ] }) });
  }
  return /* @__PURE__ */ jsxs4("form", { className: "col-span-full grid w-full gap-1.5 rounded-lg border bg-card p-2.5", onSubmit: async (e) => {
    e.preventDefault();
    await store.createRule(file, sel);
    setOpen(false);
  }, children: [
    /* @__PURE__ */ jsxs4("label", { className: "grid gap-1 text-[10.5px] text-muted-foreground", children: [
      "Which elements (a CSS selector)",
      /* @__PURE__ */ jsx27(Input, { value: sel, onChange: (e) => setSel(e.target.value), "aria-label": "Selector", autoFocus: true })
    ] }),
    /* @__PURE__ */ jsxs4("label", { className: "grid gap-1 text-[10.5px] text-muted-foreground", children: [
      "In file",
      /* @__PURE__ */ jsx27(NativeSelect, { value: file, onChange: (e) => setFile(e.target.value), "aria-label": "File", children: store.files.map((f) => /* @__PURE__ */ jsx27("option", { value: f, children: f }, f)) })
    ] }),
    /* @__PURE__ */ jsxs4("div", { className: "flex justify-end gap-1.5", children: [
      /* @__PURE__ */ jsx27(Button, { size: "sm", variant: "ghost", onClick: () => setOpen(false), children: "Cancel" }),
      /* @__PURE__ */ jsx27(Button, { size: "sm", type: "submit", children: "Add style" })
    ] })
  ] });
}
function Footer() {
  const [saving, setSaving] = useState15(false);
  const n = store.pending;
  const files = [...new Set([...store.edits.keys()].map((k) => store.sources.get(k)?.file).filter(Boolean))];
  const styles = store.edits.size + store.virtuals.size;
  const what = [styles ? `${styles} style${styles === 1 ? "" : "s"}` : "", store.texts.size ? `${store.texts.size} text${store.texts.size === 1 ? "" : "s"}` : ""].filter(Boolean).join(" and ");
  const msg = store.message;
  return /* @__PURE__ */ jsxs4("footer", { className: "grid shrink-0 gap-2 border-t bg-background px-3 py-2.5", children: [
    /* @__PURE__ */ jsx27("datalist", { id: "domeditor-props", children: PROPS.map((p) => /* @__PURE__ */ jsx27("option", { value: p }, p)) }),
    msg && /* @__PURE__ */ jsxs4("p", { className: cn("flex items-start gap-1.5 text-[11px]", msg.kind === "ok" ? "text-success" : "text-destructive"), children: [
      msg.kind === "ok" ? /* @__PURE__ */ jsx27(Check, { className: "mt-px size-3.5 shrink-0" }) : /* @__PURE__ */ jsx27(CircleExclamationPoint, { className: "mt-px size-3.5 shrink-0" }),
      msg.text
    ] }),
    n > 0 && /* @__PURE__ */ jsxs4(Collapsible3, { children: [
      /* @__PURE__ */ jsxs4(CollapsibleTrigger3, { className: "group flex w-full items-center gap-1 text-left text-[11px] text-warning hover:underline", children: [
        /* @__PURE__ */ jsx27(ChevronRight, { className: "size-3 transition-transform group-data-[state=open]:rotate-90" }),
        what,
        " changed",
        files.length ? ` in ${files.map(shortFile).join(", ")}` : ""
      ] }),
      /* @__PURE__ */ jsxs4(CollapsibleContent3, { className: "mt-1.5 grid gap-1 pl-4", children: [
        [...store.edits.keys()].map((k) => /* @__PURE__ */ jsxs4("div", { className: "flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsx27("code", { className: "truncate font-mono text-[11px] text-code", children: store.sources.get(k)?.selector }),
          /* @__PURE__ */ jsxs4(Button, { size: "sm", variant: "ghost", className: "h-5 px-1.5", onClick: () => store.revert(k), children: [
            /* @__PURE__ */ jsx27(Undo2, { className: "size-3" }),
            " Revert"
          ] })
        ] }, k)),
        [...store.virtuals.values()].map((v, i) => /* @__PURE__ */ jsxs4("div", { className: "flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsxs4("code", { className: "truncate font-mono text-[11px] text-code", title: `${v.media ? `@media ${v.media} ` : ""}${v.selector}`, children: [
            v.selector,
            v.media ? ` @${v.media}` : ""
          ] }),
          /* @__PURE__ */ jsxs4(Button, { size: "sm", variant: "ghost", className: "h-5 px-1.5", onClick: () => store.setVirtual(v.file, v, []), children: [
            /* @__PURE__ */ jsx27(Undo2, { className: "size-3" }),
            " Revert"
          ] })
        ] }, `v${i}`)),
        [...store.texts.values()].map((c, i) => /* @__PURE__ */ jsxs4("div", { className: "flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsxs4("span", { className: "truncate text-[11px]", children: [
            "\u201C",
            short(c.after, 34),
            "\u201D"
          ] }),
          /* @__PURE__ */ jsxs4(Button, { size: "sm", variant: "ghost", className: "h-5 px-1.5", onClick: () => store.revertText(c.key), children: [
            /* @__PURE__ */ jsx27(Undo2, { className: "size-3" }),
            " Revert"
          ] })
        ] }, i))
      ] })
    ] }),
    /* @__PURE__ */ jsxs4("div", { className: "flex justify-end gap-2", children: [
      /* @__PURE__ */ jsx27(Button, { variant: "ghost", disabled: !n, onClick: () => store.discardAll(), children: "Discard" }),
      /* @__PURE__ */ jsxs4(Button, { disabled: !n || saving, onClick: async () => {
        setSaving(true);
        await store.save();
        setSaving(false);
      }, children: [
        saving ? "Saving\u2026" : `Save${n ? ` ${n}` : ""}`,
        " ",
        /* @__PURE__ */ jsxs4(Kbd, { children: [
          MOD,
          " S"
        ] })
      ] })
    ] })
  ] });
}
function Overlay() {
  const [f, setF] = useState15({ hover: null, hoverLabel: "", sel: null, many: [] });
  useEffect14(() => {
    let raf = 0;
    const tick = () => {
      setF(measure());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const s = f.sel;
  const tag = "fixed rounded px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap shadow-md";
  return /* @__PURE__ */ jsxs4("div", { className: "pointer-events-none fixed inset-0 z-[2147482999]", "aria-hidden": "true", children: [
    f.many.map((b, i) => /* @__PURE__ */ jsx27("div", { className: "fixed outline-[1.5px] outline-code outline-dashed", style: pos(b) }, i)),
    s && /* @__PURE__ */ jsxs4(Fragment3, { children: [
      /* @__PURE__ */ jsx27("div", { className: "fixed border-solid border-box-margin", style: { ...pos(s.margin), borderWidth: s.m.map((v) => `${v}px`).join(" ") } }),
      /* @__PURE__ */ jsx27("div", { className: "fixed border-solid border-box-padding", style: { ...pos(s.padding), borderWidth: s.p.map((v) => `${v}px`).join(" ") } }),
      /* @__PURE__ */ jsx27("div", { className: "fixed bg-box-content", style: pos(s.content) }),
      s.gaps.map((g, i) => /* @__PURE__ */ jsx27("div", { className: "fixed", style: { ...pos(g), background: "repeating-linear-gradient(45deg, var(--box-gap) 0 4px, transparent 4px 8px)" } }, i)),
      /* @__PURE__ */ jsx27("div", { className: cn(tag, "bg-background text-foreground"), style: labelPos(s.border), children: s.label })
    ] }),
    f.hover && /* @__PURE__ */ jsxs4(Fragment3, { children: [
      /* @__PURE__ */ jsx27("div", { className: "fixed bg-primary/10 outline-[1.5px] outline-primary outline-solid", style: pos(f.hover) }),
      /* @__PURE__ */ jsx27("div", { className: cn(tag, "bg-primary text-primary-foreground"), style: labelPos(f.hover), children: f.hoverLabel })
    ] })
  ] });
}
var pos = (b) => ({ left: b.left, top: b.top, width: Math.max(0, b.width), height: Math.max(0, b.height) });
var labelPos = (b) => ({ left: Math.max(4, b.left), top: b.top > 26 ? b.top - 24 : b.top + b.height + 4 });
var rect = (r2) => ({ left: r2.left, top: r2.top, width: r2.width, height: r2.height });
function measure() {
  const frame = { hover: null, hoverLabel: "", sel: null, many: [] };
  const h = store.hovered;
  if (h?.isConnected) {
    const r2 = h.getBoundingClientRect();
    frame.hover = rect(r2);
    frame.hoverLabel = `${short(label(h))}  ${Math.round(r2.width)}\xD7${Math.round(r2.height)}`;
  }
  const el = store.selected;
  if (el?.isConnected) {
    const cs = getComputedStyle(el);
    const n = (p2) => Math.max(0, parseFloat(cs.getPropertyValue(p2)) || 0);
    const r2 = el.getBoundingClientRect();
    const m = SIDES2.map((s) => n(`margin-${s}`));
    const b = SIDES2.map((s) => n(`border-${s}-width`));
    const p = SIDES2.map((s) => n(`padding-${s}`));
    const border = rect(r2);
    const margin = { left: r2.left - m[3], top: r2.top - m[0], width: r2.width + m[1] + m[3], height: r2.height + m[0] + m[2] };
    const padding = { left: r2.left + b[3], top: r2.top + b[0], width: r2.width - b[1] - b[3], height: r2.height - b[0] - b[2] };
    const content = { left: padding.left + p[3], top: padding.top + p[0], width: padding.width - p[1] - p[3], height: padding.height - p[0] - p[2] };
    frame.sel = { margin, border, padding, content, m, p, gaps: /flex|grid/.test(cs.display) ? gaps(el, content) : [], label: `${short(label(el))}  ${Math.round(r2.width)}\xD7${Math.round(r2.height)}` };
  }
  if (store.highlight) {
    const live = store.live.find((l) => l.key === store.highlight);
    if (live) {
      let els = [];
      try {
        els = Array.from(document.querySelectorAll(live.rule.selectorText.replace(/::?(hover|focus-visible|focus|active|before|after)\b/g, "") || "*"));
      } catch {
      }
      frame.many = els.filter((e) => !mine(e)).slice(0, 300).map((e) => rect(e.getBoundingClientRect()));
    }
  }
  return frame;
}
function gaps(el, content) {
  const kids = Array.from(el.children).filter((c) => {
    const s = getComputedStyle(c);
    return s.display !== "none" && s.position !== "absolute" && s.position !== "fixed";
  }).map((c) => c.getBoundingClientRect());
  const out = [];
  for (let i = 1; i < kids.length; i++) {
    const a = kids[i - 1], b = kids[i];
    if (b.left >= a.right - 0.5 && b.top < a.bottom && b.bottom > a.top) {
      const top = Math.min(a.top, b.top);
      out.push({ left: a.right, top, width: b.left - a.right, height: Math.max(a.bottom, b.bottom) - top });
    } else if (b.top >= a.bottom - 0.5) {
      out.push({ left: content.left, top: a.bottom, width: content.width, height: b.top - a.bottom });
    }
  }
  return out.filter((g) => g.width >= 1 && g.height >= 1);
}

// src/client/styles.generated.ts
var styles_generated_default = `/*! tailwindcss v4.3.5 | MIT License | https://tailwindcss.com */
@layer properties{@supports (((-webkit-hyphens:none)) and (not (margin-trim:block))) or ((-moz-orient:inline) and (not (color:rgb(from red r g b)))){*,:before,:after,::backdrop{--tw-translate-x:0;--tw-translate-y:0;--tw-translate-z:0;--tw-rotate-x:initial;--tw-rotate-y:initial;--tw-rotate-z:initial;--tw-skew-x:initial;--tw-skew-y:initial;--tw-border-style:solid;--tw-leading:initial;--tw-font-weight:initial;--tw-tracking:initial;--tw-ordinal:initial;--tw-slashed-zero:initial;--tw-numeric-figure:initial;--tw-numeric-spacing:initial;--tw-numeric-fraction:initial;--tw-shadow:0 0 #0000;--tw-shadow-color:initial;--tw-shadow-alpha:100%;--tw-inset-shadow:0 0 #0000;--tw-inset-shadow-color:initial;--tw-inset-shadow-alpha:100%;--tw-ring-color:initial;--tw-ring-shadow:0 0 #0000;--tw-inset-ring-color:initial;--tw-inset-ring-shadow:0 0 #0000;--tw-ring-inset:initial;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-offset-shadow:0 0 #0000;--tw-outline-style:solid;--tw-backdrop-blur:initial;--tw-backdrop-brightness:initial;--tw-backdrop-contrast:initial;--tw-backdrop-grayscale:initial;--tw-backdrop-hue-rotate:initial;--tw-backdrop-invert:initial;--tw-backdrop-opacity:initial;--tw-backdrop-saturate:initial;--tw-backdrop-sepia:initial;--tw-animation-delay:0s;--tw-animation-direction:normal;--tw-animation-duration:initial;--tw-animation-fill-mode:none;--tw-animation-iteration-count:1;--tw-enter-blur:0;--tw-enter-opacity:1;--tw-enter-rotate:0;--tw-enter-scale:1;--tw-enter-translate-x:0;--tw-enter-translate-y:0;--tw-exit-blur:0;--tw-exit-opacity:1;--tw-exit-rotate:0;--tw-exit-scale:1;--tw-exit-translate-x:0;--tw-exit-translate-y:0}}}@layer theme{:root,:host{--font-sans:"Geist", "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;--color-white:#fff;--spacing:.25rem;--text-xs:.75rem;--text-xs--line-height:calc(1 / .75);--font-weight-medium:500;--font-weight-semibold:600;--tracking-wider:.05em;--leading-tight:1.25;--leading-snug:1.375;--leading-relaxed:1.625;--default-transition-duration:.15s;--default-transition-timing-function:cubic-bezier(.4, 0, .2, 1);--default-font-family:"Geist", "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;--default-mono-font-family:"Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace}:host{all:initial}}@layer base{*,:after,:before,::backdrop{box-sizing:border-box;border:0 solid;margin:0;padding:0}::file-selector-button{box-sizing:border-box;border:0 solid;margin:0;padding:0}html,:host{-webkit-text-size-adjust:100%;tab-size:4;line-height:1.5;font-family:var(--default-font-family,-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji");font-feature-settings:var(--default-font-feature-settings,normal);font-variation-settings:var(--default-font-variation-settings,normal);-webkit-tap-highlight-color:transparent}hr{height:0;color:inherit;border-top-width:1px}abbr:where([title]){-webkit-text-decoration:underline dotted;text-decoration:underline dotted}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;-webkit-text-decoration:inherit;-webkit-text-decoration:inherit;-webkit-text-decoration:inherit;text-decoration:inherit}b,strong{font-weight:bolder}code,kbd,samp,pre{font-family:var(--default-mono-font-family,ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace);font-feature-settings:var(--default-mono-font-feature-settings,normal);font-variation-settings:var(--default-mono-font-variation-settings,normal);font-size:1em}small{font-size:80%}sub,sup{vertical-align:baseline;font-size:75%;line-height:0;position:relative}sub{bottom:-.25em}sup{top:-.5em}table{text-indent:0;border-color:inherit;border-collapse:collapse}:-moz-focusring:where(:not(iframe)){outline:auto}progress{vertical-align:baseline}summary{display:list-item}ol,ul,menu{list-style:none}img,svg,video,canvas,audio,iframe,embed,object{vertical-align:middle;display:block}img,video{max-width:100%;height:auto}button,input,select,optgroup,textarea{font:inherit;font-feature-settings:inherit;font-variation-settings:inherit;letter-spacing:inherit;color:inherit;opacity:1;background-color:#0000;border-radius:0}::file-selector-button{font:inherit;font-feature-settings:inherit;font-variation-settings:inherit;letter-spacing:inherit;color:inherit;opacity:1;background-color:#0000;border-radius:0}:where(select:is([multiple],[size])) optgroup{font-weight:bolder}:where(select:is([multiple],[size])) optgroup option{padding-inline-start:20px}::file-selector-button{margin-inline-end:4px}::placeholder{opacity:1}@supports (not ((-webkit-appearance:-apple-pay-button))) or (contain-intrinsic-size:1px){::placeholder{color:currentColor}@supports (color:color-mix(in lab, red, red)){::placeholder{color:color-mix(in oklab, currentcolor 50%, transparent)}}}textarea{resize:vertical}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-date-and-time-value{min-height:1lh;text-align:inherit}::-webkit-datetime-edit{display:inline-flex}::-webkit-datetime-edit-fields-wrapper{padding:0}::-webkit-datetime-edit{padding-block:0}::-webkit-datetime-edit-year-field{padding-block:0}::-webkit-datetime-edit-month-field{padding-block:0}::-webkit-datetime-edit-day-field{padding-block:0}::-webkit-datetime-edit-hour-field{padding-block:0}::-webkit-datetime-edit-minute-field{padding-block:0}::-webkit-datetime-edit-second-field{padding-block:0}::-webkit-datetime-edit-millisecond-field{padding-block:0}::-webkit-datetime-edit-meridiem-field{padding-block:0}::-webkit-calendar-picker-indicator{line-height:1}:-moz-ui-invalid{box-shadow:none}button,input:where([type=button],[type=reset],[type=submit]){appearance:button}::file-selector-button{appearance:button}::-webkit-inner-spin-button{height:auto}::-webkit-outer-spin-button{height:auto}[hidden]:where(:not([hidden=until-found])){display:none!important}.domeditor{font-family:var(--font-sans);color:var(--foreground);-webkit-font-smoothing:antialiased;font-size:12px;line-height:1.4}.domeditor *{border-color:var(--border)}.domeditor ::-webkit-scrollbar{width:10px;height:10px}.domeditor ::-webkit-scrollbar-thumb{background:oklch(60% 0 0/.25) padding-box padding-box;border:3px solid #0000;border-radius:999px}.domeditor ::-webkit-scrollbar-track{background:0 0}}@layer components;@layer utilities{.pointer-events-none{pointer-events:none}.absolute{position:absolute}.fixed{position:fixed}.relative{position:relative}.sticky{position:sticky}.inset-0{inset:0}.top-0{top:0}.top-1{top:var(--spacing)}.top-1\\/2{top:50%}.top-2{top:calc(var(--spacing) * 2)}.right-2{right:calc(var(--spacing) * 2)}.right-4{right:calc(var(--spacing) * 4)}.bottom-2{bottom:calc(var(--spacing) * 2)}.bottom-4{bottom:calc(var(--spacing) * 4)}.left-1\\.5{left:calc(var(--spacing) * 1.5)}.left-2{left:calc(var(--spacing) * 2)}.z-10{z-index:10}.z-\\[2147482999\\]{z-index:2147482999}.z-\\[2147483000\\]{z-index:2147483000}.z-\\[2147483647\\]{z-index:2147483647}.col-span-full{grid-column:1/-1}.col-start-1{grid-column-start:1}.col-start-2{grid-column-start:2}.col-start-3{grid-column-start:3}.row-start-1{grid-row-start:1}.row-start-2{grid-row-start:2}.row-start-3{grid-row-start:3}.container{width:100%}@media (min-width:40rem){.container{max-width:40rem}}@media (min-width:48rem){.container{max-width:48rem}}@media (min-width:64rem){.container{max-width:64rem}}@media (min-width:80rem){.container{max-width:80rem}}@media (min-width:96rem){.container{max-width:96rem}}.m-0\\.5{margin:calc(var(--spacing) * .5)}.mt-1{margin-top:var(--spacing)}.mt-1\\.5{margin-top:calc(var(--spacing) * 1.5)}.mt-px{margin-top:1px}.mr-1{margin-right:var(--spacing)}.ml-0\\.5{margin-left:calc(var(--spacing) * .5)}.ml-1{margin-left:var(--spacing)}.ml-auto{margin-left:auto}.block{display:block}.flex{display:flex}.grid{display:grid}.hidden{display:none}.inline{display:inline}.inline-flex{display:inline-flex}.field-sizing-content{field-sizing:content}.size-1\\.5{width:calc(var(--spacing) * 1.5);height:calc(var(--spacing) * 1.5)}.size-3{width:calc(var(--spacing) * 3);height:calc(var(--spacing) * 3)}.size-3\\.5{width:calc(var(--spacing) * 3.5);height:calc(var(--spacing) * 3.5)}.size-4{width:calc(var(--spacing) * 4);height:calc(var(--spacing) * 4)}.size-5{width:calc(var(--spacing) * 5);height:calc(var(--spacing) * 5)}.size-6{width:calc(var(--spacing) * 6);height:calc(var(--spacing) * 6)}.size-7{width:calc(var(--spacing) * 7);height:calc(var(--spacing) * 7)}.size-full{width:100%;height:100%}.h-4{height:calc(var(--spacing) * 4)}.h-4\\.5{height:calc(var(--spacing) * 4.5)}.h-5{height:calc(var(--spacing) * 5)}.h-6{height:calc(var(--spacing) * 6)}.h-7{height:calc(var(--spacing) * 7)}.h-8{height:calc(var(--spacing) * 8)}.h-11{height:calc(var(--spacing) * 11)}.h-auto{height:auto}.h-full{height:100%}.min-h-0{min-height:0}.min-h-5{min-height:calc(var(--spacing) * 5)}.min-h-8{min-height:calc(var(--spacing) * 8)}.w-12{width:calc(var(--spacing) * 12)}.w-\\[360px\\]{width:360px}.w-\\[calc\\(100\\%-4px\\)\\]{width:calc(100% - 4px)}.w-fit{width:fit-content}.w-full{width:100%}.max-w-28{max-width:calc(var(--spacing) * 28)}.max-w-64{max-width:calc(var(--spacing) * 64)}.max-w-\\[calc\\(100vw-16px\\)\\]{max-width:calc(100vw - 16px)}.min-w-0{min-width:0}.min-w-4\\.5{min-width:calc(var(--spacing) * 4.5)}.min-w-7{min-width:calc(var(--spacing) * 7)}.flex-1{flex:1}.shrink-0{flex-shrink:0}.-translate-y-1\\/2{--tw-translate-y:calc(calc(1 / 2 * 100%) * -1);translate:var(--tw-translate-x) var(--tw-translate-y)}.transform{transform:var(--tw-rotate-x, ) var(--tw-rotate-y, ) var(--tw-rotate-z, ) var(--tw-skew-x, ) var(--tw-skew-y, )}.animate-in{animation:enter var(--tw-animation-duration,var(--tw-duration,.15s))var(--tw-ease,ease)var(--tw-animation-delay,0s)var(--tw-animation-iteration-count,1)var(--tw-animation-direction,normal)var(--tw-animation-fill-mode,none)}.cursor-default{cursor:default}.cursor-pointer{cursor:pointer}.resize{resize:both}.resize-none{resize:none}.list-disc{list-style-type:disc}.appearance-none{appearance:none}.grid-cols-\\[44px_minmax\\(0\\,1fr\\)_minmax\\(0\\,1fr\\)\\]{grid-template-columns:44px minmax(0,1fr) minmax(0,1fr)}.grid-cols-\\[52px_minmax\\(0\\,1fr\\)\\]{grid-template-columns:52px minmax(0,1fr)}.grid-cols-\\[56px_minmax\\(0\\,1fr\\)_56px\\]{grid-template-columns:56px minmax(0,1fr) 56px}.grid-cols-\\[60px_minmax\\(0\\,1fr\\)\\]{grid-template-columns:60px minmax(0,1fr)}.grid-cols-\\[100px_minmax\\(0\\,1fr\\)_20px\\]{grid-template-columns:100px minmax(0,1fr) 20px}.grid-cols-\\[110px_minmax\\(0\\,1fr\\)\\]{grid-template-columns:110px minmax(0,1fr)}.grid-cols-\\[minmax\\(0\\,1fr\\)\\]{grid-template-columns:minmax(0,1fr)}.grid-cols-\\[minmax\\(0\\,1fr\\)_auto\\]{grid-template-columns:minmax(0,1fr) auto}.grid-rows-\\[32px_auto_32px\\]{grid-template-rows:32px auto 32px}.flex-col{flex-direction:column}.flex-wrap{flex-wrap:wrap}.items-center{align-items:center}.items-start{align-items:flex-start}.justify-between{justify-content:space-between}.justify-center{justify-content:center}.justify-end{justify-content:flex-end}.justify-start{justify-content:flex-start}.justify-items-center{justify-items:center}.gap-0\\.5{gap:calc(var(--spacing) * .5)}.gap-1{gap:var(--spacing)}.gap-1\\.5{gap:calc(var(--spacing) * 1.5)}.gap-2{gap:calc(var(--spacing) * 2)}.gap-2\\.5{gap:calc(var(--spacing) * 2.5)}.gap-3{gap:calc(var(--spacing) * 3)}.gap-4{gap:calc(var(--spacing) * 4)}.gap-x-2{column-gap:calc(var(--spacing) * 2)}.gap-y-1{row-gap:var(--spacing)}.gap-y-1\\.5{row-gap:calc(var(--spacing) * 1.5)}.justify-self-start{justify-self:flex-start}.truncate{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.overflow-hidden{overflow:hidden}.overflow-y-auto{overflow-y:auto}.overscroll-contain{overscroll-behavior:contain}.rounded{border-radius:.25rem}.rounded-\\[5px\\]{border-radius:5px}.rounded-full{border-radius:2147483647px}.rounded-lg{border-radius:var(--radius)}.rounded-md{border-radius:calc(var(--radius) - 2px)}.rounded-sm{border-radius:calc(var(--radius) - 4px)}.rounded-xl{border-radius:calc(var(--radius) + 4px)}.border{border-style:var(--tw-border-style);border-width:1px}.border-t{border-top-style:var(--tw-border-style);border-top-width:1px}.border-b{border-bottom-style:var(--tw-border-style);border-bottom-width:1px}.border-dashed{--tw-border-style:dashed;border-style:dashed}.border-solid{--tw-border-style:solid;border-style:solid}.border-border,.border-border\\/60{border-color:var(--border)}@supports (color:color-mix(in lab, red, red)){.border-border\\/60{border-color:color-mix(in oklab, var(--border) 60%, transparent)}}.border-box-content{border-color:var(--box-content)}.border-box-margin{border-color:var(--box-margin)}.border-box-padding{border-color:var(--box-padding)}.border-input{border-color:var(--input)}.border-primary,.border-primary\\/60{border-color:var(--primary)}@supports (color:color-mix(in lab, red, red)){.border-primary\\/60{border-color:color-mix(in oklab, var(--primary) 60%, transparent)}}.border-transparent{border-color:#0000}.border-warning,.border-warning\\/30{border-color:var(--warning)}@supports (color:color-mix(in lab, red, red)){.border-warning\\/30{border-color:color-mix(in oklab, var(--warning) 30%, transparent)}}.bg-background,.bg-background\\/60{background-color:var(--background)}@supports (color:color-mix(in lab, red, red)){.bg-background\\/60{background-color:color-mix(in oklab, var(--background) 60%, transparent)}}.bg-background\\/95{background-color:var(--background)}@supports (color:color-mix(in lab, red, red)){.bg-background\\/95{background-color:color-mix(in oklab, var(--background) 95%, transparent)}}.bg-border{background-color:var(--border)}.bg-box-content{background-color:var(--box-content)}.bg-box-margin{background-color:var(--box-margin)}.bg-box-padding{background-color:var(--box-padding)}.bg-card{background-color:var(--card)}.bg-foreground{background-color:var(--foreground)}.bg-input\\/30{background-color:var(--input)}@supports (color:color-mix(in lab, red, red)){.bg-input\\/30{background-color:color-mix(in oklab, var(--input) 30%, transparent)}}.bg-muted{background-color:var(--muted)}.bg-primary,.bg-primary\\/5{background-color:var(--primary)}@supports (color:color-mix(in lab, red, red)){.bg-primary\\/5{background-color:color-mix(in oklab, var(--primary) 5%, transparent)}}.bg-primary\\/10{background-color:var(--primary)}@supports (color:color-mix(in lab, red, red)){.bg-primary\\/10{background-color:color-mix(in oklab, var(--primary) 10%, transparent)}}.bg-primary\\/15{background-color:var(--primary)}@supports (color:color-mix(in lab, red, red)){.bg-primary\\/15{background-color:color-mix(in oklab, var(--primary) 15%, transparent)}}.bg-secondary{background-color:var(--secondary)}.bg-transparent{background-color:#0000}.bg-warning,.bg-warning\\/10{background-color:var(--warning)}@supports (color:color-mix(in lab, red, red)){.bg-warning\\/10{background-color:color-mix(in oklab, var(--warning) 10%, transparent)}}.p-0\\.5{padding:calc(var(--spacing) * .5)}.p-2{padding:calc(var(--spacing) * 2)}.p-2\\.5{padding:calc(var(--spacing) * 2.5)}.p-3{padding:calc(var(--spacing) * 3)}.p-4{padding:calc(var(--spacing) * 4)}.p-\\[3px\\]{padding:3px}.px-0{padding-inline:0}.px-1{padding-inline:var(--spacing)}.px-1\\.5{padding-inline:calc(var(--spacing) * 1.5)}.px-2{padding-inline:calc(var(--spacing) * 2)}.px-2\\.5{padding-inline:calc(var(--spacing) * 2.5)}.px-3{padding-inline:calc(var(--spacing) * 3)}.px-4{padding-inline:calc(var(--spacing) * 4)}.py-0\\.5{padding-block:calc(var(--spacing) * .5)}.py-1{padding-block:var(--spacing)}.py-1\\.5{padding-block:calc(var(--spacing) * 1.5)}.py-2{padding-block:calc(var(--spacing) * 2)}.py-2\\.5{padding-block:calc(var(--spacing) * 2.5)}.py-3{padding-block:calc(var(--spacing) * 3)}.py-6{padding-block:calc(var(--spacing) * 6)}.py-px{padding-block:1px}.pt-2\\.5{padding-top:calc(var(--spacing) * 2.5)}.pr-7{padding-right:calc(var(--spacing) * 7)}.pb-3{padding-bottom:calc(var(--spacing) * 3)}.pl-2{padding-left:calc(var(--spacing) * 2)}.pl-4{padding-left:calc(var(--spacing) * 4)}.pl-6{padding-left:calc(var(--spacing) * 6)}.text-center{text-align:center}.text-left{text-align:left}.font-mono{font-family:Geist Mono,ui-monospace,SF Mono,Menlo,Consolas,monospace}.font-sans{font-family:Geist,Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif}.text-xs{font-size:var(--text-xs);line-height:var(--tw-leading,var(--text-xs--line-height))}.text-\\[9\\.5px\\]{font-size:9.5px}.text-\\[10\\.5px\\]{font-size:10.5px}.text-\\[10px\\]{font-size:10px}.text-\\[11\\.5px\\]{font-size:11.5px}.text-\\[11px\\]{font-size:11px}.text-\\[12\\.5px\\]{font-size:12.5px}.text-\\[13px\\]{font-size:13px}.leading-7{--tw-leading:calc(var(--spacing) * 7);line-height:calc(var(--spacing) * 7)}.leading-relaxed{--tw-leading:var(--leading-relaxed);line-height:var(--leading-relaxed)}.leading-snug{--tw-leading:var(--leading-snug);line-height:var(--leading-snug)}.leading-tight{--tw-leading:var(--leading-tight);line-height:var(--leading-tight)}.font-medium{--tw-font-weight:var(--font-weight-medium);font-weight:var(--font-weight-medium)}.font-semibold{--tw-font-weight:var(--font-weight-semibold);font-weight:var(--font-weight-semibold)}.tracking-wider{--tw-tracking:var(--tracking-wider);letter-spacing:var(--tracking-wider)}.text-balance{text-wrap:balance}.text-wrap{text-wrap:wrap}.break-words{overflow-wrap:break-word}.break-all{word-break:break-all}.whitespace-nowrap{white-space:nowrap}.text-background{color:var(--background)}.text-code{color:var(--code)}.text-destructive{color:var(--destructive)}.text-foreground,.text-foreground\\/70{color:var(--foreground)}@supports (color:color-mix(in lab, red, red)){.text-foreground\\/70{color:color-mix(in oklab, var(--foreground) 70%, transparent)}}.text-muted-foreground{color:var(--muted-foreground)}.text-primary{color:var(--primary)}.text-primary-foreground{color:var(--primary-foreground)}.text-secondary-foreground{color:var(--secondary-foreground)}.text-success{color:var(--success)}.text-warning{color:var(--warning)}.uppercase{text-transform:uppercase}.tabular-nums{--tw-numeric-spacing:tabular-nums;font-variant-numeric:var(--tw-ordinal, ) var(--tw-slashed-zero, ) var(--tw-numeric-figure, ) var(--tw-numeric-spacing, ) var(--tw-numeric-fraction, )}.line-through{text-decoration-line:line-through}.underline-offset-4{text-underline-offset:4px}.accent-primary{accent-color:var(--primary)}.opacity-0{opacity:0}.opacity-50{opacity:.5}.opacity-60{opacity:.6}.opacity-70{opacity:.7}.opacity-85{opacity:.85}.shadow{--tw-shadow:0 1px 3px 0 var(--tw-shadow-color,#0000001a), 0 1px 2px -1px var(--tw-shadow-color,#0000001a);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.shadow-2xl{--tw-shadow:0 25px 50px -12px var(--tw-shadow-color,#00000040);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.shadow-lg{--tw-shadow:0 10px 15px -3px var(--tw-shadow-color,#0000001a), 0 4px 6px -4px var(--tw-shadow-color,#0000001a);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.shadow-md{--tw-shadow:0 4px 6px -1px var(--tw-shadow-color,#0000001a), 0 2px 4px -2px var(--tw-shadow-color,#0000001a);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.shadow-none{--tw-shadow:0 0 #0000;box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.shadow-xs{--tw-shadow:0 1px 2px 0 var(--tw-shadow-color,#0000000d);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.ring,.ring-1{--tw-ring-shadow:var(--tw-ring-inset, ) 0 0 0 calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color,currentcolor);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.ring-primary\\/30{--tw-ring-color:var(--primary)}@supports (color:color-mix(in lab, red, red)){.ring-primary\\/30{--tw-ring-color:color-mix(in oklab, var(--primary) 30%, transparent)}}.outline{outline-style:var(--tw-outline-style);outline-width:1px}.outline-\\[1\\.5px\\]{outline-style:var(--tw-outline-style);outline-width:1.5px}.outline-code{outline-color:var(--code)}.outline-primary{outline-color:var(--primary)}.backdrop-blur{--tw-backdrop-blur:blur(8px);-webkit-backdrop-filter:var(--tw-backdrop-blur, ) var(--tw-backdrop-brightness, ) var(--tw-backdrop-contrast, ) var(--tw-backdrop-grayscale, ) var(--tw-backdrop-hue-rotate, ) var(--tw-backdrop-invert, ) var(--tw-backdrop-opacity, ) var(--tw-backdrop-saturate, ) var(--tw-backdrop-sepia, );backdrop-filter:var(--tw-backdrop-blur, ) var(--tw-backdrop-brightness, ) var(--tw-backdrop-contrast, ) var(--tw-backdrop-grayscale, ) var(--tw-backdrop-hue-rotate, ) var(--tw-backdrop-invert, ) var(--tw-backdrop-opacity, ) var(--tw-backdrop-saturate, ) var(--tw-backdrop-sepia, )}.transition{transition-property:color,background-color,border-color,outline-color,text-decoration-color,fill,stroke,--tw-gradient-from,--tw-gradient-via,--tw-gradient-to,opacity,box-shadow,transform,translate,scale,rotate,filter,-webkit-backdrop-filter,backdrop-filter,display,content-visibility,overlay,pointer-events;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-\\[color\\,background-color\\,box-shadow\\]{transition-property:color,background-color,box-shadow;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-\\[color\\,box-shadow\\,border-color\\]{transition-property:color,box-shadow,border-color;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-\\[color\\,box-shadow\\]{transition-property:color,box-shadow;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-colors{transition-property:color,background-color,border-color,outline-color,text-decoration-color,fill,stroke,--tw-gradient-from,--tw-gradient-via,--tw-gradient-to;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-transform{transition-property:transform,translate,scale,rotate;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.fade-in-0{--tw-enter-opacity:0}.outline-dashed{--tw-outline-style:dashed;outline-style:dashed}.outline-none{--tw-outline-style:none;outline-style:none}.outline-solid{--tw-outline-style:solid;outline-style:solid}.select-none{-webkit-user-select:none;user-select:none}.zoom-in-95{--tw-enter-scale:.95}@media (hover:hover){:is(:where(.group):hover .group-hover\\:opacity-100){opacity:1}}:is(:where(.group)[data-state=open] .group-data-\\[state\\=open\\]\\:rotate-90){rotate:90deg}.placeholder\\:text-muted-foreground\\/70::placeholder{color:var(--muted-foreground)}@supports (color:color-mix(in lab, red, red)){.placeholder\\:text-muted-foreground\\/70::placeholder{color:color-mix(in oklab, var(--muted-foreground) 70%, transparent)}}.last\\:border-b-0:last-child{border-bottom-style:var(--tw-border-style);border-bottom-width:0}@media (hover:hover){.hover\\:bg-accent:hover{background-color:var(--accent)}.hover\\:bg-primary\\/90:hover{background-color:var(--primary)}@supports (color:color-mix(in lab, red, red)){.hover\\:bg-primary\\/90:hover{background-color:color-mix(in oklab, var(--primary) 90%, transparent)}}.hover\\:bg-secondary\\/80:hover{background-color:var(--secondary)}@supports (color:color-mix(in lab, red, red)){.hover\\:bg-secondary\\/80:hover{background-color:color-mix(in oklab, var(--secondary) 80%, transparent)}}.hover\\:text-accent-foreground:hover{color:var(--accent-foreground)}.hover\\:text-foreground:hover{color:var(--foreground)}.hover\\:text-primary:hover{color:var(--primary)}.hover\\:underline:hover{text-decoration-line:underline}.hover\\:opacity-100:hover{opacity:1}}.focus-visible\\:border-ring:focus-visible{border-color:var(--ring)}.focus-visible\\:opacity-100:focus-visible{opacity:1}.focus-visible\\:ring-2:focus-visible{--tw-ring-shadow:var(--tw-ring-inset, ) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color,currentcolor);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.focus-visible\\:ring-ring\\/30:focus-visible{--tw-ring-color:var(--ring)}@supports (color:color-mix(in lab, red, red)){.focus-visible\\:ring-ring\\/30:focus-visible{--tw-ring-color:color-mix(in oklab, var(--ring) 30%, transparent)}}.focus-visible\\:ring-ring\\/50:focus-visible{--tw-ring-color:var(--ring)}@supports (color:color-mix(in lab, red, red)){.focus-visible\\:ring-ring\\/50:focus-visible{--tw-ring-color:color-mix(in oklab, var(--ring) 50%, transparent)}}.disabled\\:pointer-events-none:disabled{pointer-events:none}.disabled\\:cursor-not-allowed:disabled{cursor:not-allowed}.disabled\\:opacity-50:disabled{opacity:.5}.data-\\[orientation\\=horizontal\\]\\:h-px[data-orientation=horizontal]{height:1px}.data-\\[orientation\\=horizontal\\]\\:w-full[data-orientation=horizontal]{width:100%}.data-\\[orientation\\=vertical\\]\\:h-full[data-orientation=vertical]{height:100%}.data-\\[orientation\\=vertical\\]\\:w-px[data-orientation=vertical]{width:1px}.data-\\[soft\\=true\\]\\:bg-accent[data-soft=true]{background-color:var(--accent)}.data-\\[soft\\=true\\]\\:text-foreground[data-soft=true]{color:var(--foreground)}.data-\\[state\\=active\\]\\:border-input[data-state=active]{border-color:var(--input)}.data-\\[state\\=active\\]\\:bg-background[data-state=active]{background-color:var(--background)}.data-\\[state\\=active\\]\\:text-foreground[data-state=active]{color:var(--foreground)}.data-\\[state\\=active\\]\\:shadow-sm[data-state=active]{--tw-shadow:0 1px 3px 0 var(--tw-shadow-color,#0000001a), 0 1px 2px -1px var(--tw-shadow-color,#0000001a);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.data-\\[state\\=closed\\]\\:animate-out[data-state=closed]{animation:exit var(--tw-animation-duration,var(--tw-duration,.15s))var(--tw-ease,ease)var(--tw-animation-delay,0s)var(--tw-animation-iteration-count,1)var(--tw-animation-direction,normal)var(--tw-animation-fill-mode,none)}.data-\\[state\\=closed\\]\\:fade-out-0[data-state=closed]{--tw-exit-opacity:0}.data-\\[state\\=closed\\]\\:zoom-out-95[data-state=closed]{--tw-exit-scale:.95}.data-\\[state\\=on\\]\\:bg-primary[data-state=on]{background-color:var(--primary)}.data-\\[state\\=on\\]\\:text-primary-foreground[data-state=on]{color:var(--primary-foreground)}@media not all and (min-width:520px){.max-\\[520px\\]\\:inset-x-2{inset-inline:calc(var(--spacing) * 2)}.max-\\[520px\\]\\:top-\\[45vh\\]{top:45vh}.max-\\[520px\\]\\:w-auto{width:auto}}.\\[\\&_svg\\]\\:pointer-events-none svg{pointer-events:none}.\\[\\&_svg\\]\\:size-3 svg{width:calc(var(--spacing) * 3);height:calc(var(--spacing) * 3)}.\\[\\&_svg\\]\\:size-3\\.5 svg{width:calc(var(--spacing) * 3.5);height:calc(var(--spacing) * 3.5)}.\\[\\&_svg\\]\\:shrink-0 svg{flex-shrink:0}.\\[\\&_svg\\:not\\(\\[class\\*\\=\\'size-\\'\\]\\)\\]\\:size-3\\.5 svg:not([class*=size-]){width:calc(var(--spacing) * 3.5);height:calc(var(--spacing) * 3.5)}.\\[\\&\\>option\\]\\:bg-popover>option{background-color:var(--popover)}.\\[\\&\\>option\\]\\:text-popover-foreground>option{color:var(--popover-foreground)}[data-slot=button][data-variant=default] .\\[\\[data-slot\\=button\\]\\[data-variant\\=default\\]_\\&\\]\\:border-white\\/25{border-color:#ffffff40}@supports (color:color-mix(in lab, red, red)){[data-slot=button][data-variant=default] .\\[\\[data-slot\\=button\\]\\[data-variant\\=default\\]_\\&\\]\\:border-white\\/25{border-color:color-mix(in oklab, var(--color-white) 25%, transparent)}}[data-slot=button][data-variant=default] .\\[\\[data-slot\\=button\\]\\[data-variant\\=default\\]_\\&\\]\\:bg-white\\/15{background-color:#ffffff26}@supports (color:color-mix(in lab, red, red)){[data-slot=button][data-variant=default] .\\[\\[data-slot\\=button\\]\\[data-variant\\=default\\]_\\&\\]\\:bg-white\\/15{background-color:color-mix(in oklab, var(--color-white) 15%, transparent)}}[data-slot=button][data-variant=default] .\\[\\[data-slot\\=button\\]\\[data-variant\\=default\\]_\\&\\]\\:text-primary-foreground{color:var(--primary-foreground)}}@property --tw-animation-delay{syntax:"*";inherits:false;initial-value:0s}@property --tw-animation-direction{syntax:"*";inherits:false;initial-value:normal}@property --tw-animation-duration{syntax:"*";inherits:false}@property --tw-animation-fill-mode{syntax:"*";inherits:false;initial-value:none}@property --tw-animation-iteration-count{syntax:"*";inherits:false;initial-value:1}@property --tw-enter-blur{syntax:"*";inherits:false;initial-value:0}@property --tw-enter-opacity{syntax:"*";inherits:false;initial-value:1}@property --tw-enter-rotate{syntax:"*";inherits:false;initial-value:0}@property --tw-enter-scale{syntax:"*";inherits:false;initial-value:1}@property --tw-enter-translate-x{syntax:"*";inherits:false;initial-value:0}@property --tw-enter-translate-y{syntax:"*";inherits:false;initial-value:0}@property --tw-exit-blur{syntax:"*";inherits:false;initial-value:0}@property --tw-exit-opacity{syntax:"*";inherits:false;initial-value:1}@property --tw-exit-rotate{syntax:"*";inherits:false;initial-value:0}@property --tw-exit-scale{syntax:"*";inherits:false;initial-value:1}@property --tw-exit-translate-x{syntax:"*";inherits:false;initial-value:0}@property --tw-exit-translate-y{syntax:"*";inherits:false;initial-value:0}.domeditor{--radius:.625rem;--background:oklch(100% 0 0);--foreground:oklch(21% .006 285.9);--card:oklch(98.5% 0 0);--card-foreground:oklch(21% .006 285.9);--popover:oklch(100% 0 0);--popover-foreground:oklch(21% .006 285.9);--primary:oklch(54.6% .245 262.9);--primary-foreground:oklch(98.5% 0 0);--secondary:oklch(96.7% .001 286.4);--secondary-foreground:oklch(21% .006 285.9);--muted:oklch(96.7% .001 286.4);--muted-foreground:oklch(55.2% .016 285.9);--accent:oklch(96.7% .001 286.4);--accent-foreground:oklch(21% .006 285.9);--destructive:oklch(57.7% .245 27.3);--warning:oklch(64.6% .16 55);--success:oklch(59.6% .145 163.2);--code:oklch(55% .14 75);--prop:oklch(50% .13 240);--border:oklch(92% .004 286.3);--input:oklch(92% .004 286.3);--ring:oklch(54.6% .245 262.9);--box-margin:oklch(83% .12 65/.35);--box-padding:oklch(80% .12 140/.35);--box-content:oklch(75% .09 245/.35);--box-gap:oklch(70% .18 300/.35)}.domeditor.dark{--background:oklch(17% .004 285.9);--foreground:oklch(96% 0 0);--card:oklch(20.5% .005 285.9);--card-foreground:oklch(96% 0 0);--popover:oklch(21% .006 285.9);--popover-foreground:oklch(96% 0 0);--primary:oklch(62.3% .214 259.8);--primary-foreground:oklch(98.5% 0 0);--secondary:oklch(27.4% .006 286);--secondary-foreground:oklch(96% 0 0);--muted:oklch(24.4% .006 286);--muted-foreground:oklch(68% .015 286);--accent:oklch(27.4% .006 286);--accent-foreground:oklch(96% 0 0);--destructive:oklch(70.4% .191 22.2);--warning:oklch(78% .14 65);--success:oklch(77% .15 160);--code:oklch(85% .12 85);--prop:oklch(80% .1 230);--border:oklch(100% 0 0/.09);--input:oklch(100% 0 0/.12);--ring:oklch(62.3% .214 259.8);--box-margin:oklch(78% .13 60/.3);--box-padding:oklch(78% .13 140/.3);--box-content:oklch(72% .11 245/.32);--box-gap:oklch(70% .18 300/.35)}@property --tw-translate-x{syntax:"*";inherits:false;initial-value:0}@property --tw-translate-y{syntax:"*";inherits:false;initial-value:0}@property --tw-translate-z{syntax:"*";inherits:false;initial-value:0}@property --tw-rotate-x{syntax:"*";inherits:false}@property --tw-rotate-y{syntax:"*";inherits:false}@property --tw-rotate-z{syntax:"*";inherits:false}@property --tw-skew-x{syntax:"*";inherits:false}@property --tw-skew-y{syntax:"*";inherits:false}@property --tw-border-style{syntax:"*";inherits:false;initial-value:solid}@property --tw-leading{syntax:"*";inherits:false}@property --tw-font-weight{syntax:"*";inherits:false}@property --tw-tracking{syntax:"*";inherits:false}@property --tw-ordinal{syntax:"*";inherits:false}@property --tw-slashed-zero{syntax:"*";inherits:false}@property --tw-numeric-figure{syntax:"*";inherits:false}@property --tw-numeric-spacing{syntax:"*";inherits:false}@property --tw-numeric-fraction{syntax:"*";inherits:false}@property --tw-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-shadow-color{syntax:"*";inherits:false}@property --tw-shadow-alpha{syntax:"<percentage>";inherits:false;initial-value:100%}@property --tw-inset-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-inset-shadow-color{syntax:"*";inherits:false}@property --tw-inset-shadow-alpha{syntax:"<percentage>";inherits:false;initial-value:100%}@property --tw-ring-color{syntax:"*";inherits:false}@property --tw-ring-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-inset-ring-color{syntax:"*";inherits:false}@property --tw-inset-ring-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-ring-inset{syntax:"*";inherits:false}@property --tw-ring-offset-width{syntax:"<length>";inherits:false;initial-value:0}@property --tw-ring-offset-color{syntax:"*";inherits:false;initial-value:#fff}@property --tw-ring-offset-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-outline-style{syntax:"*";inherits:false;initial-value:solid}@property --tw-backdrop-blur{syntax:"*";inherits:false}@property --tw-backdrop-brightness{syntax:"*";inherits:false}@property --tw-backdrop-contrast{syntax:"*";inherits:false}@property --tw-backdrop-grayscale{syntax:"*";inherits:false}@property --tw-backdrop-hue-rotate{syntax:"*";inherits:false}@property --tw-backdrop-invert{syntax:"*";inherits:false}@property --tw-backdrop-opacity{syntax:"*";inherits:false}@property --tw-backdrop-saturate{syntax:"*";inherits:false}@property --tw-backdrop-sepia{syntax:"*";inherits:false}@keyframes enter{0%{opacity:var(--tw-enter-opacity,1);transform:translate3d(var(--tw-enter-translate-x,0),var(--tw-enter-translate-y,0),0)scale3d(var(--tw-enter-scale,1),var(--tw-enter-scale,1),var(--tw-enter-scale,1))rotate(var(--tw-enter-rotate,0));filter:blur(var(--tw-enter-blur,0))}}@keyframes exit{to{opacity:var(--tw-exit-opacity,1);transform:translate3d(var(--tw-exit-translate-x,0),var(--tw-exit-translate-y,0),0)scale3d(var(--tw-exit-scale,1),var(--tw-exit-scale,1),var(--tw-exit-scale,1))rotate(var(--tw-exit-rotate,0));filter:blur(var(--tw-exit-blur,0))}}@layer properties{:host,*,::before,::after,::backdrop{--tw-animation-delay:0s;--tw-animation-direction:normal;--tw-animation-fill-mode:none;--tw-animation-iteration-count:1;--tw-enter-blur:0;--tw-enter-opacity:1;--tw-enter-rotate:0;--tw-enter-scale:1;--tw-enter-translate-x:0;--tw-enter-translate-y:0;--tw-exit-blur:0;--tw-exit-opacity:1;--tw-exit-rotate:0;--tw-exit-scale:1;--tw-exit-translate-x:0;--tw-exit-translate-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-translate-z:0;--tw-border-style:solid;--tw-shadow:0 0 #0000;--tw-shadow-alpha:100%;--tw-inset-shadow:0 0 #0000;--tw-inset-shadow-alpha:100%;--tw-ring-shadow:0 0 #0000;--tw-inset-ring-shadow:0 0 #0000;--tw-ring-offset-width:0;--tw-ring-offset-color:#fff;--tw-ring-offset-shadow:0 0 #0000;--tw-outline-style:solid}}`;

// src/client/index.tsx
import { jsx as jsx28 } from "react/jsx-runtime";
var mounted = false;
function mountDomEditor(options = {}) {
  if (mounted || typeof document === "undefined") return;
  mounted = true;
  if (options.endpoint) store.endpoint = options.endpoint;
  const host = document.createElement("domeditor-root");
  host.setAttribute("data-lenis-prevent", "");
  for (const type of ["wheel", "touchstart", "touchmove"]) host.addEventListener(type, (e) => e.stopPropagation(), { passive: true });
  const shadow = host.attachShadow({ mode: "open" });
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(styles_generated_default);
  shadow.adoptedStyleSheets = [sheet];
  const root = document.createElement("div");
  shadow.appendChild(root);
  setHost(host);
  const theme = options.theme ?? "auto";
  const applyTheme = () => {
    const dark = theme === "dark" || theme === "system" && systemDark() || theme === "auto" && pageIsDark();
    root.className = `domeditor${dark ? " dark" : ""}`;
  };
  applyTheme();
  if (theme === "system" || theme === "auto") matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => setTimeout(applyTheme, 50));
  if (theme === "auto") {
    let timers = [];
    const again = () => {
      timers.forEach(clearTimeout);
      timers = [0, 150, 500].map((ms) => window.setTimeout(applyTheme, ms));
    };
    const watch = { attributes: true, attributeFilter: ["class", "style", "data-theme", "data-mode", "data-color-scheme"] };
    new MutationObserver(again).observe(document.documentElement, watch);
    new MutationObserver(again).observe(document.body, watch);
  }
  document.body.appendChild(host);
  createRoot(root).render(
    /* @__PURE__ */ jsx28(StrictMode, { children: /* @__PURE__ */ jsx28(PortalContainer.Provider, { value: root, children: /* @__PURE__ */ jsx28(TooltipProvider2, { children: /* @__PURE__ */ jsx28(Panel, {}) }) }) })
  );
  void store.load();
  watchStylesheets();
}
function watchStylesheets() {
  let timer = 0;
  const reload = () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => void store.load(), 120);
  };
  const isSheet = (n) => n instanceof HTMLLinkElement ? n.rel === "stylesheet" : n instanceof HTMLStyleElement && !n.hasAttribute("data-domeditor-preview");
  new MutationObserver((records) => {
    let changed = false;
    for (const r2 of records) {
      if (r2.type === "characterData" || r2.type === "childList" && isSheet(r2.target)) {
        if (isSheet(r2.target.parentNode) || isSheet(r2.target)) changed = true;
        continue;
      }
      for (const n of r2.addedNodes) {
        if (!isSheet(n)) continue;
        changed = true;
        if (n instanceof HTMLLinkElement && !n.sheet) n.addEventListener("load", reload, { once: true });
      }
      for (const n of r2.removedNodes) if (isSheet(n)) changed = true;
    }
    if (changed) reload();
  }).observe(document.head, { childList: true, subtree: true, characterData: true });
}
export {
  mountDomEditor
};
/*! Bundled license information:

lucide-react/dist/esm/shared/src/utils/toKebabCase.mjs:
lucide-react/dist/esm/shared/src/utils/toLucideIconData.mjs:
lucide-react/dist/esm/shared/src/utils/toCamelCase.mjs:
lucide-react/dist/esm/shared/src/utils/toPascalCase.mjs:
lucide-react/dist/esm/shared/src/utils/mergeClasses.mjs:
lucide-react/dist/esm/shared/src/build/defaultAttributes.mjs:
lucide-react/dist/esm/shared/src/build/buildLucideIconNode.mjs:
lucide-react/dist/esm/shared/src/build/buildLucideIconForReact.mjs:
lucide-react/dist/esm/shared/src/utils/hasA11yProp.mjs:
lucide-react/dist/esm/context.mjs:
lucide-react/dist/esm/Icon.mjs:
lucide-react/dist/esm/createLucideIcon.mjs:
lucide-react/dist/esm/icons/arrow-down.mjs:
lucide-react/dist/esm/icons/arrow-up.mjs:
lucide-react/dist/esm/icons/check.mjs:
lucide-react/dist/esm/icons/chevron-down.mjs:
lucide-react/dist/esm/icons/chevron-right.mjs:
lucide-react/dist/esm/icons/circle-exclamation-point.mjs:
lucide-react/dist/esm/icons/clipboard-paste.mjs:
lucide-react/dist/esm/icons/copy.mjs:
lucide-react/dist/esm/icons/corner-down-left.mjs:
lucide-react/dist/esm/icons/database.mjs:
lucide-react/dist/esm/icons/file-code.mjs:
lucide-react/dist/esm/icons/link-2.mjs:
lucide-react/dist/esm/icons/minus.mjs:
lucide-react/dist/esm/icons/mouse-pointer-2.mjs:
lucide-react/dist/esm/icons/panel-left.mjs:
lucide-react/dist/esm/icons/panel-right.mjs:
lucide-react/dist/esm/icons/plus.mjs:
lucide-react/dist/esm/icons/square-dashed-mouse-pointer.mjs:
lucide-react/dist/esm/icons/text-align-center.mjs:
lucide-react/dist/esm/icons/text-align-end.mjs:
lucide-react/dist/esm/icons/text-align-justify.mjs:
lucide-react/dist/esm/icons/text-align-start.mjs:
lucide-react/dist/esm/icons/undo-2.mjs:
lucide-react/dist/esm/icons/x.mjs:
lucide-react/dist/esm/lucide-react.mjs:
  (**
   * @license lucide-react v1.77.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)
*/
