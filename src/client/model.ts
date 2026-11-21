// Browser half of domeditor: finds the project's rules in the live stylesheets, works out which ones
// apply to an element (and which declarations win), and keeps unsaved edits, previewed live.
import {
  alignRules, compareSpec, normCondition, normSelector, ruleKey, parseDecls, sameDecls, serializeDecls, sizeQueryMatches, specificity, splitTop,
  type Decl, type RuleRef, type SourceRule, type Spec,
} from "../core/shared";
import { EVERYWHERE, modePattern, scopedContext, scopedRules, type ModePattern, type Scope, type ScopedRule } from "../core/scope";

const HEADERS = { "x-domeditor": "1", "Content-Type": "application/json" };

/** A rule as the page has it: the live CSSOM rule plus where it is in the source. */
export type LiveRule = {
  key: string; // the source rule's key, or "live:n" for a rule not written in a source file
  ref: RuleRef;
  rule: CSSStyleRule;
  order: number; // position in the whole document's cascade order
  conds: CSSRule[]; // the @media/@supports blocks around it
  source?: SourceRule;
  /** Where a rule without a source file came from: a <style> element on the page (often a
   *  component's `<style>{`...`}</style>`, or CSS-in-JS), or a compiled stylesheet (Tailwind...). */
  origin?: "style-tag" | "stylesheet";
};

/** Where a text is written in the project: a file and line. */
export type Place = { file: string; line: number };

/** A source string that makes up part of a text on the page (see findPieces in core/server.ts). */
export type Piece = Place & { text: string; start: number; end: number };

/** Characters [from, to) of a text node's original text that a text change shows in. */
export type Segment = { node: Text; from: number; to: number };

/** A text change is keyed by its text node, or for a text a script split up, by its source string. */
export type TextKey = Text | string;

/** A pending change to a text on the page, previewed by changing the text nodes that show it. */
export type TextChange = {
  key: TextKey;
  segments: Segment[];
  originals: string[]; // each segment's node text before any change, spacing and all
  before: string; // the text as the source contains it (spacing collapsed)
  after: string;
  at?: Place; // where it is written, when known or chosen
  choices?: Place[]; // offered after a save found it in more than one place
};

const squash = (s: string) => s.replace(/\s+/g, " ").trim();
const wordsOf = (s: string) => (s.trim() ? s.trim().split(/\s+/) : []);

/** Show new text in a change's segments. One node: the text itself. Several (a sentence split into a
 *  <span> per word): the new words in order, each segment keeping its number of words, any extra in
 *  the last; spaces between segments stay as they were. */
function previewText(c: Pick<TextChange, "segments" | "originals">, after: string) {
  const words = wordsOf(after);
  let w = 0;
  c.segments.forEach((s, i) => {
    const o = c.originals[i]!;
    const last = i === c.segments.length - 1;
    const n = last ? words.length - w : Math.min(wordsOf(o.slice(s.from, s.to)).length, words.length - w);
    const part = c.segments.length === 1 ? after.trim() : words.slice(w, w + n).join(" ");
    w += n;
    s.node.data = o.slice(0, s.from) + part + o.slice(s.to);
  });
}
const restoreText = (c: TextChange) => c.segments.forEach((s, i) => { s.node.data = c.originals[i]!; });

/** An element's text as one string (spacing collapsed), with where each character comes from. */
export type TextIndex = { full: string; at: [Text, number][] };

export function textIndex(root: Element, original: (n: Text) => string = (n) => n.data): TextIndex {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest("script,style,noscript,template,svg") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  let full = "";
  const at: [Text, number][] = [];
  let space = true;
  while (walker.nextNode()) {
    const n = walker.currentNode as Text;
    const data = original(n);
    for (let i = 0; i < data.length; i++) {
      if (/\s/.test(data[i]!)) {
        if (!space) { full += " "; at.push([n, i]); space = true; }
      } else { full += data[i]; at.push([n, i]); space = false; }
    }
  }
  if (full.endsWith(" ")) { full = full.slice(0, -1); at.pop(); }
  return { full, at };
}

/** The parts of text nodes that characters [start, end) of an index come from (spaces left alone). */
export function segmentsFor(index: TextIndex, start: number, end: number): Segment[] {
  const out = new Map<Text, Segment>();
  for (let k = start; k < end; k++) {
    const [node, i] = index.at[k]!;
    if (/\s/.test(index.full[k]!)) continue;
    const s = out.get(node);
    if (s) s.to = i + 1;
    else out.set(node, { node, from: i, to: i + 1 });
  }
  return [...out.values()];
}

/** A scoped rule not written yet: where it will go, and its declarations. */
export type VirtualRule = ScopedRule & { file: string; decls: Decl[] };
const virtualKey = (file: string, r: ScopedRule) => JSON.stringify([file, r.media, normSelector(r.selector)]);

/** A style rule in a live stylesheet, before it is matched to the source. */
type Item = { rule: CSSStyleRule; file: string | null; context: string[]; selector: string; conds: CSSRule[] };

export type Match = {
  live: LiveRule;
  spec: Spec;
  active: boolean; // its @media etc. currently apply
  state: string | null; // ":hover", "::before"... when it only applies in that state
  part: string; // the part of a selector list that matched
};

export type Cascade = {
  matches: Match[]; // highest priority first
  applied: Set<string>; // `${key}#${declIndex}` of declarations that win at least one longhand
  /** `${key}#${declIndex}` of state declarations (`:hover`...) a stronger rule for the same state beats. */
  stateOverridden: Set<string>;
  winner: Map<string, string>; // longhand -> rule key that sets it (or "inline")
  inline: Decl[];
};

// interaction states and pseudo-elements: rules using them style the element only sometimes (the
// mouse is over it while picking, so :hover would otherwise always "match")
const STATES = /::?(hover|focus-visible|focus-within|focus|active|visited|before|after|placeholder|marker|selection|first-line|first-letter)\b/gi;

// ---------- longhands a declaration sets (to tell which declarations are overridden)

const probe = typeof document !== "undefined" ? document.createElement("div").style : null;
const SHORT: Record<string, string[]> = {
  padding: ["padding-top", "padding-right", "padding-bottom", "padding-left"],
  margin: ["margin-top", "margin-right", "margin-bottom", "margin-left"],
  gap: ["row-gap", "column-gap"],
  font: ["font-style", "font-weight", "font-size", "line-height", "font-family"],
};
const longhandCache = new Map<string, string[]>();
export function longhands(prop: string, value: string): string[] {
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

// ---------- the store

type Listener = () => void;

class Store {
  version = 0;
  endpoint = "/__domeditor";
  root = ""; // the project root on disk, forward slashes (Vite names stylesheets by absolute path)
  files: string[] = [];
  sources = new Map<string, SourceRule>();
  edits = new Map<string, Decl[]>(); // rule key -> its declarations as edited (unsaved)
  texts = new Map<TextKey, TextChange>(); // text changes (unsaved)
  scope: Scope = EVERYWHERE; // where edits apply: every mode and size, or only dark mode, a screen size...
  virtuals = new Map<string, VirtualRule>(); // scoped rules not written yet: previewed, created on save
  private previewEl: HTMLStyleElement | null = null;
  private previewUntilLoad = false;
  private pattern: ModePattern | null = null;
  places = new Map<string, Place[] | "looking">(); // where each text is written, as far as looked up
  pieces = new Map<string, Piece[] | "looking">(); // the source strings each (split-up) text is made of
  live: LiveRule[] = [];
  selected: Element | null = null;
  /** Asking which code editor files open in; with the file to open once answered (file "" = just choosing). */
  editorAsk: { file: string; line: number } | null = null;
  hovered: Element | null = null;
  highlight: string | null = null; // rule key whose elements to outline
  picking = false;
  target: string | null = null; // rule key the quick controls write to
  message: { kind: "ok" | "error"; text: string } | null = null;
  private indexRun = 0;
  private byFile = new Map<string, SourceRule[]>(); // each file's source rules, in file order
  private listeners = new Set<Listener>();

  subscribe = (l: Listener) => {
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
      const r = await fetch(this.endpoint, { headers: HEADERS, cache: "no-store" });
      if (!r.ok) throw new Error(`the dev server answered ${r.status}`);
      const data = (await r.json()) as { root: string; files: string[]; rules: SourceRule[] };
      this.root = data.root;
      this.files = data.files;
      this.sources = new Map(data.rules.map((s) => [ruleKey(s), s]));
      this.byFile = new Map();
      for (const s of data.rules) this.byFile.set(s.file, [...(this.byFile.get(s.file) ?? []), s]);
    } catch (e) {
      this.message = { kind: "error", text: `Could not read the stylesheets: ${(e as Error).message}` };
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
    if (run !== this.indexRun) return; // a newer reindex started while this one waited
    const out: LiveRule[] = [];
    let order = 0, unknown = 0;
    let origin: LiveRule["origin"];
    const push = (r: Item, source?: SourceRule) => {
      const ref = source ?? { file: r.file ?? "", context: r.context, selector: r.selector, occurrence: -1 };
      out.push({
        key: source ? ruleKey(source) : `live:${unknown++}`, ref, rule: r.rule, order: order++, conds: r.conds, source,
        ...(source ? {} : { origin }),
      });
    };
    for (const { sheet, fileOf } of sheets) {
      if ((sheet.ownerNode as Element | null)?.hasAttribute?.("data-domeditor-preview")) continue;
      origin = sheet.ownerNode instanceof HTMLStyleElement && !sheet.href ? "style-tag" : "stylesheet";
      const items = styleRules(sheet, fileOf);
      if (fileOf) {
        // Vite or Turbopack said which file each rule came from: line them up with that file's source, in order
        const perFile = new Map<string, Item[]>();
        for (const it of items) if (it.file && this.files.includes(it.file)) perFile.set(it.file, [...(perFile.get(it.file) ?? []), it]);
        for (const [file, list] of perFile) {
          for (const a of alignRules(list, this.byFile.get(file) ?? [])) {
            if (a.kind === "one") push(a.item, a.source);
            else if (a.kind === "none") push(a.item);
            else {
              const split = unmerge(a.item, a.sources, fileOf);
              if (split) split.forEach((r, i) => push(r, a.sources[i]));
              else push(a.item);
            }
          }
        }
      } else {
        // no file information (an inline <style>, or `next dev` without Turbopack): link a rule to its
        // source only if exactly one source rule has its selector and context. The rest are still listed,
        // read-only: they take part in the cascade, so what they override (or not) is shown truthfully.
        for (const it of items) {
          const cands = [...this.sources.values()].filter((s) => s.selector === it.selector && JSON.stringify(s.context) === JSON.stringify(it.context));
          if (cands.length === 1) push(it, cands[0]);
          else push(it);
        }
      }
    }
    this.live = out;
    for (const [key, decls] of this.edits) this.preview(key, decls);
  }

  declsOf(key: string): Decl[] {
    return this.edits.get(key) ?? this.sources.get(key)?.decls ?? this.liveDecls(key);
  }

  /** A rule with no source file: its declarations as the browser holds them. Read from cssText, not
   *  the longhands: a shorthand with a var() (`font: 500 14px/1 var(--f)`) leaves its longhands empty. */
  private liveDecls(key: string): Decl[] {
    const style = this.live.find((l) => l.key === key)?.rule.style;
    return style ? parseDecls(style.cssText) : [];
  }

  private preview(key: string, decls: Decl[]) {
    for (const l of this.live) if (l.key === key) l.rule.style.cssText = serializeDecls(decls);
  }

  /** Change a rule's declarations: shown at once, written to the file on save. */
  setDecls(key: string, decls: Decl[]) {
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
  modePattern(): ModePattern {
    this.pattern ??= modePattern([...this.sources.values()]);
    return this.pattern;
  }

  /** Where an edit to a rule goes in the current scope: the rule itself, or the scoped rule(s) for it,
   *  each one already written (key) or not yet (virtual). */
  scopedTargets(base: SourceRule): { rule: ScopedRule; file: string; key: string | null }[] {
    return scopedRules(base.selector, this.scope, this.modePattern()).map((rule) => {
      const context = JSON.stringify(scopedContext(rule));
      const selector = normSelector(rule.selector);
      const found = (this.byFile.get(base.file) ?? []).find((s) => s.selector === selector && JSON.stringify(s.context) === context)
        ?? [...this.sources.values()].find((s) => s.selector === selector && JSON.stringify(s.context) === context);
      return { rule, file: found?.file ?? base.file, key: found ? ruleKey(found) : null };
    });
  }

  virtualDecls(file: string, rule: ScopedRule): Decl[] {
    return this.virtuals.get(virtualKey(file, rule))?.decls ?? [];
  }
  /** Change a scoped rule that is not written yet: previewed at once, created on save. */
  setVirtual(file: string, rule: ScopedRule, decls: Decl[]) {
    const k = virtualKey(file, rule);
    if (decls.length) this.virtuals.set(k, { file, ...rule, decls });
    else this.virtuals.delete(k);
    this.renderPreview();
    this.message = null;
    this.emit();
  }
  /** The preview of not-yet-written rules: a stylesheet of the editor's own, last in <head> so it wins
   *  over rules of equal weight (the observer and the indexing leave it alone). */
  private renderPreview() {
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
  originalOf = (node: Text): string => {
    for (const c of this.texts.values()) {
      const i = c.segments.findIndex((s) => s.node === node);
      if (i >= 0) return c.originals[i]!;
    }
    return node.data;
  };

  /** Change a text on the page: shown at once, written into the source on save. */
  setText(key: TextKey, segments: Segment[], before: string, after: string, at?: Place) {
    const c = this.texts.get(key) ?? { key, segments, originals: segments.map((s) => this.originalOf(s.node)), before: squash(before), after, at };
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
  revertText(key: TextKey) {
    const c = this.texts.get(key);
    if (c) restoreText(c);
    this.texts.delete(key);
    this.emit();
  }
  chooseTextPlace(key: TextKey, at: Place) {
    const c = this.texts.get(key);
    if (c) this.texts.set(key, { ...c, at, choices: undefined });
    this.message = null;
    this.emit();
  }

  /** Look up the source strings split-up texts are made of (once each). */
  async findPieces(texts: string[]) {
    const todo = [...new Set(texts)].filter((t) => t && !this.pieces.has(t));
    if (!todo.length) return;
    for (const t of todo) this.pieces.set(t, "looking");
    try {
      const r = await fetch(this.endpoint, { method: "POST", headers: HEADERS, body: JSON.stringify({ pieces: todo }) });
      const data = (await r.json()) as { pieces?: Piece[][] };
      todo.forEach((t, i) => this.pieces.set(t, data.pieces?.[i] ?? []));
    } catch {
      for (const t of todo) this.pieces.delete(t);
    }
    this.emit();
  }

  /** Look up where texts are written (once each). */
  async findPlaces(texts: string[]) {
    const todo = [...new Set(texts.map(squash))].filter((t) => t && !this.places.has(t));
    if (!todo.length) return;
    for (const t of todo) this.places.set(t, "looking");
    try {
      const r = await fetch(this.endpoint, { method: "POST", headers: HEADERS, body: JSON.stringify({ find: todo }) });
      const data = (await r.json()) as { found?: Place[][] };
      todo.forEach((t, i) => this.places.set(t, data.found?.[i] ?? []));
    } catch {
      for (const t of todo) this.places.delete(t);
    }
    this.emit();
  }

  revert(key: string) {
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
      const s = this.sources.get(key)!;
      return { ref: { file: s.file, context: s.context, selector: s.selector, occurrence: s.occurrence }, before: s.decls, after };
    });
    const changes = [...this.texts.values()];
    const texts = changes.map((c) => ({ before: c.before, after: squash(c.after), at: c.at }));
    const creates = [...this.virtuals.values()].map(({ file, media, selector, decls }) => ({ file, media, selector, decls }));
    const r = await this.post({ edits, texts, creates });
    if (!r.ok) {
      // a text written in several places: offer them, then the next save uses the one chosen
      const c = r.text !== undefined ? changes.find((x) => x.before === r.text) : undefined;
      if (c && r.hits?.length) this.texts.set(c.key, { ...c, choices: r.hits });
      return this.fail(r.error);
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
      // the new rules arrive with the rebuilt stylesheet; keep the preview until then
      this.virtuals.clear();
      this.previewUntilLoad = true;
      setTimeout(() => this.renderPreview(), 6000);
    }
    this.message = { kind: "ok", text: `Saved to ${r.files.map(shortFile).join(", ")}` };
    this.emit();
    // Next rebuilds the CSS and swaps it in; check it did, in case the browser kept an old copy
    const css = r.files.filter((f) => f.endsWith(".css"));
    if (css.length) for (const ms of [1500, 4000]) setTimeout(() => void refreshSavedSheets(css), ms);
  }

  async createRule(file: string, selector: string) {
    const r = await this.post({ create: { file, selector, decls: [] } });
    if (!r.ok) return this.fail(r.error);
    this.message = { kind: "ok", text: `Added ${selector} to ${shortFile(file)}` };
    await this.load(); // the dev server swaps in the rebuilt sheet; the <head> watcher re-indexes once it lands
  }

  private async post(payload: unknown): Promise<{ ok: true; files: string[] } | { ok: false; error: string; text?: string; hits?: Place[] }> {
    try {
      const r = await fetch(this.endpoint, { method: "POST", headers: HEADERS, body: JSON.stringify(payload) });
      const data = (await r.json()) as { files?: string[]; error?: string; text?: string; hits?: Place[] };
      return r.ok ? { ok: true, files: data.files ?? [] } : { ok: false, error: data.error ?? `error ${r.status}`, text: data.text, hits: data.hits };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  private fail(text: string) {
    this.message = { kind: "error", text };
    this.emit();
  }

  select(el: Element | null) {
    this.selected = el;
    this.target = null;
    this.picking = false;
    this.emit();
  }
}

export const store = new Store();

export const shortFile = (f: string) => f.replace(/^(app|src)\//, "");

/** Does the rule apply now? Media and supports conditions ask the browser; a container query is
 *  checked against the size of `el`'s container (without an element, it counts as applying). */
export function isActive(l: LiveRule, el?: Element): boolean {
  return l.conds.every((c) =>
    c instanceof CSSMediaRule ? matchMedia(c.media.mediaText).matches
    : c instanceof CSSSupportsRule ? CSS.supports(c.conditionText)
    : typeof CSSContainerRule !== "undefined" && c instanceof CSSContainerRule ? (el ? containerMatches(c, el) : true)
    : true);
}

/** The browser has no matchMedia for container queries: find the container the query is asked of
 *  (the nearest ancestor that is a container, with that name if the query names one), measure its
 *  content box, and evaluate the query. */
function containerMatches(rule: CSSContainerRule, el: Element): boolean {
  const name = rule.containerName;
  const px = (v: string) => parseFloat(v) || 0;
  for (let a = el.parentElement; a; a = a.parentElement) {
    const cs = getComputedStyle(a);
    if (!cs.containerType || cs.containerType === "normal") continue;
    if (name && !cs.containerName.split(/\s+/).includes(name)) continue;
    const box = a as HTMLElement;
    const env = {
      width: box.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight),
      height: box.clientHeight - px(cs.paddingTop) - px(cs.paddingBottom),
      em: px(cs.fontSize),
      rem: px(getComputedStyle(document.documentElement).fontSize),
    };
    return sizeQueryMatches(rule.containerQuery, env) ?? true; // a query we cannot read: assume it applies, as before
  }
  return false; // no such container: the browser never applies the rule
}

export const conditionLabel = (l: LiveRule) =>
  l.conds.map((c) => (c instanceof CSSMediaRule ? `@media ${c.media.mediaText}` : c.cssText.split("{")[0]!.trim())).join(" ");

const safeMatches = (el: Element, sel: string) => {
  try {
    return el.matches(sel);
  } catch {
    return false;
  }
};

/** The rules that apply to an element (or would, in a state like :hover), best first, and which declarations win. */
export function cascade(el: Element): Cascade {
  const matches: Match[] = [];
  const found = new Set<string>(); // a source rule the compiler split in parts is listed once, as its first part
  for (const live of store.live) {
    if (found.has(live.key)) continue;
    let best: Match | null = null;
    for (const part of splitTop(live.rule.selectorText)) {
      const states = part.match(STATES);
      const state = states ? states.join("") : null;
      const bare = states ? part.replace(STATES, "").replace(/\(\s*\)/g, "") || "*" : part;
      if (!safeMatches(el, bare)) continue;
      const m: Match = { live, spec: specificity(part), active: isActive(live, el), state, part };
      if (!best || (best.state && !state) || (!!best.state === !!state && compareSpec(m.spec, best.spec) > 0)) best = m;
    }
    if (best) {
      matches.push(best);
      found.add(live.key);
    }
  }
  // priority: rules that apply now before conditional ones, then specificity, then source order
  const now = (m: Match) => (!m.state && m.active ? 1 : 0);
  matches.sort((a, b) => now(b) - now(a) || compareSpec(b.spec, a.spec) || b.live.order - a.live.order);

  const inline: Decl[] = [];
  const style = (el as HTMLElement).style;
  if (style) for (const p of Array.from(style)) inline.push({ prop: p, value: style.getPropertyValue(p), important: style.getPropertyPriority(p) === "important" });

  // candidates in the order the cascade resolves them: !important first, inline beats rules at equal importance
  type Cand = { id: string; key: string; decl: Decl; tier: number };
  const cands: Cand[] = [];
  inline.forEach((d) => cands.push({ id: `inline#${d.prop}`, key: "inline", decl: d, tier: d.important ? 4 : 2 }));
  for (const m of matches) {
    if (m.state || !m.active) continue;
    store.declsOf(m.live.key).forEach((d, i) => cands.push({ id: `${m.live.key}#${i}`, key: m.live.key, decl: d, tier: d.important ? 3 : 1 }));
  }
  const rank = new Map(matches.map((m, i) => [m.live.key, i]));
  // within one rule a later declaration beats an earlier one, so each rule's declarations go last-first
  cands.sort((a, b) => b.tier - a.tier || (rank.get(a.key) ?? -1) - (rank.get(b.key) ?? -1) || declIndex(b) - declIndex(a));

  const winner = new Map<string, string>();
  const applied = new Set<string>();
  for (const c of cands) {
    let wins = false;
    for (const lh of longhands(c.decl.prop, c.decl.value)) {
      if (!winner.has(lh)) { winner.set(lh, c.key); wins = true; }
    }
    if (wins) applied.add(c.id);
  }
  // States (`:hover`...) are not in the cascade above, which is what applies now. Among the rules
  // for the same state, a stronger one still beats a weaker one: mark what it overrides.
  const stateOverridden = new Set<string>();
  const byState = new Map<string, Match[]>();
  for (const m of matches) if (m.state && m.active) byState.set(m.state, [...(byState.get(m.state) ?? []), m]);
  for (const list of byState.values()) {
    const taken = new Set<string>(); // longhands a stronger rule for this state sets (matches are strongest first)
    for (const m of list) {
      const decls = store.declsOf(m.live.key);
      const mine = new Set<string>();
      decls.forEach((d, i) => {
        const lhs = longhands(d.prop, d.value);
        if (lhs.length && lhs.every((lh) => taken.has(lh) && !d.important)) stateOverridden.add(`${m.live.key}#${i}`);
        lhs.forEach((lh) => mine.add(lh));
      });
      mine.forEach((lh) => taken.add(lh));
    }
  }
  return { matches, applied, winner, inline, stateOverridden };
}

/** The rule the quick controls edit by default: the element's own class rule (`.fact`, `.btn.primary`)
 *  rather than a narrower one like `.fact:first-child`; failing that, the strongest rule that applies. */
export function defaultTarget(el: Element, matches: Match[]): Match | null {
  const usable = matches.filter((m) => !m.state && m.active && m.live.source);
  const own = usable.find((m) => {
    const sel = /^([a-z][\w-]*)?((\.[\w-]+)+)$/i.exec(m.part.trim());
    return !!sel && (!sel[1] || sel[1].toLowerCase() === el.tagName.toLowerCase())
      && sel[2]!.slice(1).split(".").every((c) => el.classList.contains(c));
  });
  return own ?? usable[0] ?? null;
}

const declIndex = (c: { id: string }) => Number(c.id.split("#").at(-1)) || 0;

/** For inherited properties the element's own rules do not set: the nearest ancestor whose rules do, and that rule. */
export function inheritedFrom(el: Element, props: string[]): Map<string, { el: Element; key: string }> {
  const out = new Map<string, { el: Element; key: string }>();
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

/** A readable label for an element: tag#id.class.class */
export function label(el: Element): string {
  const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).filter(Boolean) : [];
  return el.tagName.toLowerCase() + (el.id ? `#${el.id}` : "") + cls.map((c) => `.${c}`).join("");
}

/** A selector to suggest for a new rule targeting this element. */
export function suggestSelector(el: Element): string {
  const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).filter(Boolean) : [];
  if (cls.length) return `.${cls[0]}`;
  for (let p = el.parentElement; p; p = p.parentElement) {
    const pc = typeof p.className === "string" ? p.className.trim().split(/\s+/).filter(Boolean)[0] : undefined;
    if (pc) return `.${pc} ${el.tagName.toLowerCase()}`;
  }
  return el.tagName.toLowerCase();
}

// ---------- which source file each part of a stylesheet came from

// Turbopack starts each file's CSS in a chunk with a comment: /* [project]/app/(admin)/admin.css [app-client] (css) */
const MARKER = /\/\* \[(project|next)\]\/(.+?) \[[^\]]*\] \(css\) \*\//g;
type FileOf = WeakMap<CSSRule, string>;
const fileMaps = new WeakMap<CSSStyleSheet, Promise<FileOf | null>>();

/** The source file of each top-level rule in a stylesheet, or null when the sheet does not say (an
 *  inline <style>, or `next dev` without Turbopack). Read once per sheet object, before the editor
 *  changes it; Next replaces the whole sheet when a file changes. */
function sheetFiles(sheet: CSSStyleSheet, root: string): Promise<FileOf | null> {
  let p = fileMaps.get(sheet);
  if (!p) {
    p = (async () => {
      // Vite: a <style data-vite-dev-id="/abs/path/file.css"> per file
      const viteId = (sheet.ownerNode as Element | null)?.getAttribute?.("data-vite-dev-id");
      if (viteId) {
        const file = viteId.split("?")[0]!.replace(/\\/g, "/");
        const rel = root && file.startsWith(root + "/") ? file.slice(root.length + 1) : null;
        if (!rel) return null;
        const fileOf: FileOf = new WeakMap();
        try {
          for (const r of Array.from(sheet.cssRules)) fileOf.set(r, rel);
        } catch {
          return null;
        }
        filesIn.set(sheet, new Set([rel]));
        return fileOf;
      }
      // Next (Turbopack): CSS chunks served as <link>s, each file's part marked with a comment
      const href = sheet.href;
      if (!href || new URL(href).origin !== location.origin || !new URL(href).pathname.startsWith("/_next/")) return null;
      try {
        const rules = Array.from(sheet.cssRules); // before the fetch, so later edits cannot shift it
        loaded.set(sheet, rules.filter(notImport).map(ruleText));
        const text = await serverCss(href);
        if (refreshIfStale(sheet, text)) return null; // a fresh copy is on its way; it is indexed when it lands
        const marks = [...text.matchAll(MARKER)];
        if (!marks.length) return null;
        const fileOf: FileOf = new WeakMap();
        let n = 0;
        marks.forEach((m, i) => {
          const chunk = text.slice(m.index! + m[0].length, marks[i + 1]?.index ?? text.length);
          const scratch = new CSSStyleSheet(); // counts the file's top-level rules the way the browser does
          scratch.replaceSync(chunk);
          const file = m[1] === "project" ? m[2]! : `[next]/${m[2]}`;
          if (scratch.cssRules.length) filesIn.set(sheet, (filesIn.get(sheet) ?? new Set()).add(file));
          for (let k = 0; k < scratch.cssRules.length; k++) if (rules[n + k]) fileOf.set(rules[n + k]!, file);
          n += scratch.cssRules.length;
        });
        return n === rules.length ? fileOf : null; // counts disagree (the file changed meanwhile): trust nothing
      } catch {
        return null;
      }
    })();
    fileMaps.set(sheet, p);
  }
  return p;
}

// ---------- keeping the page's CSS current after a save

/** What the browser loaded for each sheet (each rule's text), read before the editor changes anything. */
const loaded = new WeakMap<CSSStyleSheet, string[]>();
/** The project files each sheet was built from. */
const filesIn = new WeakMap<CSSStyleSheet, Set<string>>();
/** Links the editor added, and the server's text each was loaded for (so it never loops). */
const madeFor = new WeakMap<Element, string>();

/** A stylesheet as the dev server sends it now: a unique URL, so no cache can answer instead. */
async function serverCss(href: string): Promise<string> {
  const url = new URL(href);
  url.searchParams.set("se", `${Date.now()}${Math.random().toString(36).slice(2, 6)}`);
  return (await fetch(url, { cache: "no-store" })).text();
}

const notImport = (r: CSSRule) => !(typeof CSSImportRule !== "undefined" && r instanceof CSSImportRule);
// url()s are left out: a browser may serialise them resolved against different base URLs
const ruleText = (r: CSSRule) => r.cssText.replace(/url\([^)]*\)/g, "url()");

/**
 * When a .css file changes, Next (Turbopack) swaps in a new <link> to the same URL. Safari can reuse
 * its old copy of that URL instead of downloading it again (WebKit bug 187726; Turbopack only adds a
 * cache-busting query for Firefox), so the page keeps the old CSS and the edit seems to vanish.
 * If what the browser loaded differs from what the server sends now, load the sheet again under a
 * unique URL, the same way Turbopack does for Firefox. Returns true if it did.
 */
function refreshIfStale(sheet: CSSStyleSheet, serverText: string): boolean {
  const link = sheet.ownerNode;
  const had = loaded.get(sheet);
  if (!(link instanceof HTMLLinkElement) || !had || !link.isConnected) return false;
  const scratch = new CSSStyleSheet();
  scratch.replaceSync(serverText);
  const now = Array.from(scratch.cssRules).filter(notImport).map(ruleText);
  if (now.length === had.length && now.every((t, i) => t === had[i])) return false;
  const base = (link.getAttribute("href") ?? "").split("?")[0]!;
  if (!base || madeFor.get(link) === serverText) return false; // our own fresh copy: never loop
  const fresh = document.createElement("link");
  madeFor.set(fresh, serverText);
  for (const a of Array.from(link.attributes)) fresh.setAttribute(a.name, a.value);
  // keep the URL's start: Turbopack finds the sheet for its next update by `href^="<url>?"`
  fresh.setAttribute("href", `${base}?ts=${Date.now()}`);
  fresh.addEventListener("load", () => link.remove(), { once: true });
  link.after(fresh);
  return true;
}

/** After a save: once the dev server has rebuilt, re-load any sheet with the saved files that the
 *  browser still holds an old copy of (covers Safari, and an update that never arrived). */
async function refreshSavedSheets(files: string[]) {
  for (const sheet of Array.from(document.styleSheets)) {
    const own = filesIn.get(sheet);
    if (!sheet.href || !own || !files.some((f) => own.has(f))) continue;
    try {
      refreshIfStale(sheet, await serverCss(sheet.href));
    } catch {
      /* the dev server restarted; its own reload takes care of it */
    }
  }
}

/** Every style rule in a sheet, in cascade order, with the at-rules around it and its file. */
function styleRules(sheet: CSSStyleSheet, fileOf: FileOf | null): Item[] {
  const out: Item[] = [];
  const walk = (list: CSSRuleList, context: string[], conds: CSSRule[], file: string | null) => {
    for (const r of Array.from(list)) {
      const f = file ?? fileOf?.get(r) ?? null;
      if (r instanceof CSSStyleRule) {
        const selector = normSelector(r.selectorText);
        out.push({ rule: r, file: f, context, selector, conds });
        if (r.cssRules?.length) walk(r.cssRules, [...context, `rule ${selector}`], conds, f);
      } else if (r instanceof CSSMediaRule) walk(r.cssRules, [...context, `media ${normCondition(r.media.mediaText)}`], [...conds, r], f);
      else if (r instanceof CSSSupportsRule) walk(r.cssRules, [...context, `supports ${normCondition(r.conditionText)}`], [...conds, r], f);
      else if (typeof CSSContainerRule !== "undefined" && r instanceof CSSContainerRule) {
        walk(r.cssRules, [...context, `container ${normCondition(r.containerName + r.containerQuery)}`], [...conds, r], f);
      } else if (typeof CSSLayerBlockRule !== "undefined" && r instanceof CSSLayerBlockRule) {
        walk(r.cssRules, [...context, `layer ${normCondition(r.name)}`], [...conds, r], f);
      }
    }
  };
  try {
    walk(sheet.cssRules, [], [], null);
  } catch {
    /* a sheet still loading, or from another origin */
  }
  return out;
}

/** The compiler merged adjacent source rules into one (`.a, .b { x }`): put them back as separate rules
 *  in the live sheet, same declarations and position, so each can be previewed on its own. */
function unmerge(item: Item, sources: SourceRule[], fileOf: FileOf): Item[] | null {
  const rule = item.rule;
  const parent = (rule.parentRule as CSSGroupingRule | null) ?? rule.parentStyleSheet;
  if (!parent || rule.cssRules?.length) return null;
  const parts = splitTop(rule.selectorText);
  if (parts.length !== sources.reduce((n, s) => n + splitTop(s.selector).length, 0)) return null;
  try {
    let at = Array.from(parent.cssRules).indexOf(rule);
    const body = rule.style.cssText;
    parent.deleteRule(at);
    return sources.map((s) => {
      const selectorText = parts.splice(0, splitTop(s.selector).length).join(", ");
      parent.insertRule(`${selectorText} { ${body} }`, at);
      const r = parent.cssRules[at++] as CSSStyleRule;
      if (!rule.parentRule && item.file) fileOf.set(r, item.file);
      return { ...item, rule: r, selector: normSelector(r.selectorText) };
    });
  } catch {
    return null;
  }
}

