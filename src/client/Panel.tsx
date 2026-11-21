// The editor panel: pick an element, adjust type, spacing and layout with live preview, save the
// change into the .css file its rule came from. Rendered inside a shadow root (see index.tsx).
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, ArrowDown, ArrowUp, Check, ChevronRight, CircleAlert, ClipboardPaste, Copy,
  CornerDownLeft, Database, FileCode, Link2, Minus, MousePointer2, PanelLeft, PanelRight, Plus, SquareDashedMousePointer, Undo2, X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  composeClamp, describeCondition, describeState, nudge, parseClamp, readProp, WEIGHT_NAMES, weightName, writeProp, writeSides,
  type Decl, type Side,
  withAlpha, writtenAlpha,
} from "../core/shared";
import { resolveOnPage, toHex, toRgba } from "./color";
import { isEverywhere, modeLabel, widthCondition, widthLabel, widthOptions, type Mode, type Width } from "../core/scope";
import { pageIsDark } from "./page";
import { copyStyle, cssText, differences, GROUPS, pasteInto, type Copied, type Difference, type GroupId } from "./copyStyle";
import {
  cascade, conditionLabel, defaultTarget, inheritedFrom, label, segmentsFor, shortFile, store, suggestSelector, textIndex,
  type Cascade, type Match, type Piece, type Place, type TextIndex, type TextKey,
} from "./model";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Input } from "./ui/input";
import { Kbd } from "./ui/kbd";
import { NativeSelect } from "./ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { Textarea } from "./ui/textarea";
import { Tip } from "./ui/tooltip";
import { cn } from "./ui/utils";

const OPEN_KEY = "domeditor:open";
const DOCK_KEY = "domeditor:dock";
const TAB_KEY = "domeditor:tab";
const SIDES: Side[] = ["top", "right", "bottom", "left"];
const PROPS = [
  "font-size", "line-height", "font-weight", "letter-spacing", "text-align", "padding", "padding-top", "padding-right",
  "padding-bottom", "padding-left", "margin", "margin-top", "margin-bottom", "gap", "row-gap", "column-gap", "max-width",
  "width", "min-width", "height", "justify-content", "align-items", "align-content", "justify-items", "grid-template-columns",
  "flex-direction", "flex-wrap", "border-radius", "color", "background", "text-wrap", "white-space",
];
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl";
const ALT = isMac ? "⌥" : "Alt";

/** The element the editor lives in; clicks inside it are never "picks". */
let hostEl: HTMLElement | null = null;
export const setHost = (el: HTMLElement) => { hostEl = el; };
const mine = (t: EventTarget | null) => t instanceof Node && !!hostEl?.contains(t);

export const useStore = () => useSyncExternalStore(store.subscribe, store.getVersion);

function readLocal(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function writeLocal(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: remembered for this visit only */
  }
}

export function Panel() {
  useStore();
  const [open, setOpen] = useState(() => readLocal(OPEN_KEY, "0") === "1");
  const [dock, setDock] = useState(() => readLocal(DOCK_KEY, "right"));
  useEffect(() => writeLocal(OPEN_KEY, open ? "1" : "0"), [open]);
  useEffect(() => writeLocal(DOCK_KEY, dock), [dock]);

  // Shift+Alt+E toggles the panel from anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyE" && e.altKey && e.shiftKey) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // picking: hover outlines an element, click (or Alt+click any time) selects it without triggering the page
  useEffect(() => {
    if (!open) return;
    const armed = (e: MouseEvent) => (store.picking || e.altKey) && !mine(e.target);
    const onMove = (e: PointerEvent) => {
      store.hovered = armed(e) ? (e.target as Element) : null;
    };
    const block = (e: Event) => {
      if (armed(e as MouseEvent)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!armed(e)) return;
      e.preventDefault();
      e.stopPropagation();
      store.hovered = null;
      store.select(e.target as Element);
    };
    const onKey = (e: KeyboardEvent) => {
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
    const onResize = () => store.emit(); // which @media rules apply may have changed
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
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 z-[2147483000] h-8 rounded-full border px-3 shadow-lg opacity-85 hover:opacity-100">
        <SquareDashedMousePointer /> Styles
        {store.pending > 0 && <span className="size-1.5 rounded-full bg-warning" />}
        <Kbd className="ml-0.5">⇧{ALT}E</Kbd>
      </Button>
    );
  }
  const DockIcon = dock === "right" ? PanelLeft : PanelRight;
  return (
    <>
      <Overlay />
      <aside
        aria-label="Style editor"
        className={cn(
          "fixed top-2 bottom-2 z-[2147483000] flex w-[360px] max-w-[calc(100vw-16px)] flex-col overflow-hidden rounded-xl border bg-background text-foreground shadow-2xl",
          dock === "left" ? "left-2" : "right-2",
          "max-[520px]:inset-x-2 max-[520px]:top-[45vh] max-[520px]:w-auto",
        )}
      >
        <header className="flex h-11 shrink-0 items-center gap-2 border-b px-3">
          <SquareDashedMousePointer className="size-4 text-primary" />
          <span className="text-[13px] font-semibold">Styles</span>
          <Tip label="Viewport width: @media rules depend on it">
            <Badge variant="outline" className="font-mono">{window.innerWidth}px</Badge>
          </Tip>
          {!isEverywhere(store.scope) && (
            <Tip label="Edits apply only here. Change it under Design → When.">
              <Badge variant="warning" className="max-w-28 truncate">{[store.scope.mode === "all" ? "" : store.scope.mode === "dark" ? "Dark" : "Light", store.scope.width ? `${store.scope.width.kind === "max" ? "≤" : "≥"}${store.scope.width.px}px` : ""].filter(Boolean).join(" · ")}</Badge>
            </Tip>
          )}
          <span className="flex-1" />
          <Tip label={<>Pick an element. Or {ALT}+click anything, any time. <Kbd>Esc</Kbd> stops.</>}>
            <Button size="sm" variant={store.picking ? "default" : "outline"} aria-pressed={store.picking}
              onClick={() => { store.picking = !store.picking; store.emit(); }}>
              <MousePointer2 /> Pick
            </Button>
          </Tip>
          <Tip label="Move to the other side">
            <Button size="icon-sm" variant="ghost" aria-label="Move to the other side" onClick={() => setDock(dock === "right" ? "left" : "right")}>
              <DockIcon />
            </Button>
          </Tip>
          <Tip label={<>Close <Kbd>⇧{ALT}E</Kbd></>}>
            <Button size="icon-sm" variant="ghost" aria-label="Close" onClick={() => setOpen(false)}><X /></Button>
          </Tip>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {store.selected?.isConnected ? <Inspector el={store.selected} /> : <Empty gone={!!store.selected} />}
        </div>
        <Footer />
      </aside>
    </>
  );
}

function Empty({ gone }: { gone: boolean }) {
  return (
    <div className="grid gap-4 p-4 text-muted-foreground">
      {gone && <p className="text-warning">The selected element left the page.</p>}
      <div className="grid justify-items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center">
        <MousePointer2 className="size-5 text-foreground" />
        <p className="text-foreground"><b>Pick</b> an element, or <Kbd>{ALT}</Kbd> + click anything on the page.</p>
      </div>
      <ul className="grid list-disc gap-2 pl-4 leading-relaxed">
        <li>Use <b className="text-foreground">−</b> and <b className="text-foreground">+</b>, type a value, or press <Kbd>↑</Kbd> <Kbd>↓</Kbd> on any number (<Kbd>⇧</Kbd> ×10, <Kbd>{ALT}</Kbd> ×0.1).</li>
        <li>Changes show at once. <b className="text-foreground">Save</b> (<Kbd>{MOD} S</Kbd>) writes them into the .css file the rule lives in.</li>
        <li>Change the words too: the <b className="text-foreground">Text</b> section saves new copy into the component it is written in.</li>
        <li>Styles for other screen sizes are listed under <b className="text-foreground">All styles</b>: edit the phone layout from your desktop.</li>
      </ul>
    </div>
  );
}

// ---------- the inspector for one element

const TEXT_PROPS = ["font-size", "line-height", "font-weight", "letter-spacing", "text-align", "color"];

function Inspector({ el }: { el: Element }) {
  const version = useStore();
  const cas = useMemo(() => cascade(el), [el, version]);
  const inherited = useMemo(() => inheritedFrom(el, TEXT_PROPS), [el, version]);
  const editable = cas.matches.filter((m) => !m.state && m.live.source);
  const target = (store.target && editable.find((m) => m.live.key === store.target)) || defaultTarget(el, cas.matches);
  const wt = writeTarget(target);
  const [tab, setTab] = useState(() => readLocal(TAB_KEY, "design"));
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();

  const ancestors: Element[] = [];
  for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) ancestors.unshift(p);

  return (
    <>
      <section className="grid grid-cols-[minmax(0,1fr)] gap-1.5 border-b px-3 pt-2.5 pb-3">
        <nav aria-label="Parents" className="flex flex-wrap items-center gap-0.5 font-mono text-[10.5px] text-muted-foreground">
          {ancestors.slice(-4).map((a, i) => (
            <span key={i} className="inline-flex items-center gap-0.5">
              <button type="button" className="rounded px-1 py-0.5 hover:bg-accent hover:text-foreground" title={label(a)} onClick={() => store.select(a)}>
                {short(label(a), 22)}
              </button>
              <ChevronRight className="size-3 opacity-50" />
            </span>
          ))}
        </nav>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <code className="truncate font-mono text-[12.5px] font-medium text-primary" title={label(el)}>{label(el)}</code>
          <div className="flex items-center gap-0.5">
          <Badge variant="outline" className="mr-1 font-mono">{Math.round(r.width)} × {Math.round(r.height)}</Badge>
          <Tip label="Copy this element's look, to paste onto another element">
            <Button size="icon-sm" variant="ghost" aria-label="Copy style" onClick={() => copyLook(el)}><Copy /></Button>
          </Tip>
          <Tip label="Select the parent">
            <Button size="icon-sm" variant="ghost" aria-label="Parent" disabled={!el.parentElement || el.parentElement === document.documentElement}
              onClick={() => el.parentElement && store.select(el.parentElement)}><ArrowUp /></Button>
          </Tip>
          <Tip label="Select the first child">
            <Button size="icon-sm" variant="ghost" aria-label="First child" disabled={!el.children.length}
              onClick={() => el.children[0] && store.select(el.children[0])}><ArrowDown /></Button>
          </Tip>
          </div>
        </div>
        <div className="text-[11px] text-muted-foreground">
          {px(cs.fontSize)} · {weightName(cs.fontWeight)} {cs.fontWeight} · line {lineHeightRatio(cs)}
        </div>
        {cas.inline.length > 0 && (
          <div className="mt-1 flex gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
            <CircleAlert className="mt-px size-3.5 shrink-0" />
            <p>An inline style (from the component, or set by a script such as an animation) beats the CSS: <code className="font-mono text-foreground">{cas.inline.map((d) => `${d.prop}: ${d.value}`).join("; ")}</code></p>
          </div>
        )}
      </section>

      <Tabs value={tab} onValueChange={(v) => { setTab(v); writeLocal(TAB_KEY, v); }}>
        <div className="sticky top-0 z-10 border-b bg-background/95 px-3 py-2 backdrop-blur">
          <TabsList className="w-full">
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="rules">All styles <span className="text-muted-foreground tabular-nums">{cas.matches.length}</span></TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="design">
          {clipboard && clipboard.from !== el && <PasteStyle key={nodeId(el)} el={el} target={target} wt={wt} />}
          <TextSection el={el} />
          <Quick el={el} cs={cs} cas={cas} target={target} editable={editable} inherited={inherited} wt={wt} />
        </TabsContent>
        <TabsContent value="rules">
          <AllStyles el={el} cas={cas} target={target} />
        </TabsContent>
      </Tabs>
    </>
  );
}

const short = (s: string, n = 26) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const px = (v: string) => `${Math.round(parseFloat(v) * 10) / 10 || 0}px`;
function lineHeightRatio(cs: CSSStyleDeclaration) {
  const lh = parseFloat(cs.lineHeight), fs = parseFloat(cs.fontSize);
  return lh && fs ? String(Math.round((lh / fs) * 100) / 100) : cs.lineHeight;
}
const squash = (s: string) => s.replace(/\s+/g, " ").trim();

function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn("text-[10px] font-semibold tracking-wider text-muted-foreground uppercase", className)}>{children}</h3>;
}
function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-3 border-b px-3 py-3 last:border-b-0">
      <div className="flex min-h-5 items-center justify-between gap-2"><SectionTitle>{title}</SectionTitle>{aside}</div>
      {children}
    </section>
  );
}
/** A labelled control: label on the left, control (and any note) on the right. */
function Row({ label, title, note, children }: { label: string; title?: string; note?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[60px_minmax(0,1fr)] items-start gap-x-2">
      <span className="truncate leading-7 text-muted-foreground" title={title}>{label}</span>
      <div className="grid min-w-0 gap-1.5">{children}{note}</div>
    </div>
  );
}

// ---------- where edits go: the chosen rule, or its dark-mode / screen-size version

type WriteTarget = {
  decls: Decl[];
  write: (fn: (d: Decl[]) => Decl[]) => void;
  /** the rule's key when edits go straight into it (no scope) */
  key: string | null;
  scoped: ReturnType<typeof store.scopedTargets> | null;
};

function writeTarget(target: Match | null): WriteTarget | null {
  const src = target?.live.source;
  if (!target || !src) return null;
  if (isEverywhere(store.scope)) {
    const key = target.live.key;
    return { decls: store.declsOf(key), write: (fn) => store.setDecls(key, fn(store.declsOf(key))), key, scoped: null };
  }
  const scoped = store.scopedTargets(src);
  const read = (t: (typeof scoped)[number]) => (t.key ? store.declsOf(t.key) : store.virtualDecls(t.file, t.rule));
  return {
    decls: read(scoped[0]!),
    key: null,
    scoped,
    // the scoped rules mirror each other (dark mode by system setting, and by theme switch)
    write: (fn) => {
      const next = fn(read(scoped[0]!));
      for (const t of scoped) {
        if (t.key) store.setDecls(t.key, next);
        else store.setVirtual(t.file, t.rule, next);
      }
    },
  };
}

/** "When": which mode and screen size edits apply to. */
function ScopePicker({ wt }: { wt: WriteTarget | null }) {
  const scope = store.scope;
  const widths = widthOptions([...store.sources.values()], window.innerWidth);
  if (scope.width && !widths.some((w) => w.kind === scope.width!.kind && w.px === scope.width!.px)) widths.unshift(scope.width);
  const setMode = (mode: Mode) => { store.scope = { ...scope, mode }; store.emit(); };
  const setWidth = (v: string) => {
    const [kind, px] = v.split(":");
    store.scope = { ...scope, width: v ? ({ kind, px: Number(px) } as NonNullable<Width>) : null };
    store.emit();
  };
  const dark = pageIsDark();
  const cond = widthCondition(scope.width);
  const hiddenNow = scope.mode === "dark" && !dark ? "The page is in light mode: switch it to dark to see these changes."
    : scope.mode === "light" && dark ? "The page is in dark mode: switch it to light to see these changes."
    : cond && !matchMedia(cond).matches ? "Not at this window width: resize the window to see these changes." : null;
  const fresh = wt?.scoped?.filter((t) => !t.key) ?? [];
  const existing = wt?.scoped?.filter((t) => t.key) ?? [];
  return (
    <div className="grid gap-1.5">
      <div className="grid grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1.5">
        <span className="text-muted-foreground">When</span>
        <NativeSelect aria-label="Mode" value={scope.mode} className="font-sans" onChange={(e) => setMode(e.target.value as Mode)}>
          {(["all", "dark", "light"] as Mode[]).map((m) => <option key={m} value={m}>{modeLabel(m)}</option>)}
        </NativeSelect>
        <NativeSelect aria-label="Screen size" value={scope.width ? `${scope.width.kind}:${scope.width.px}` : ""} className="font-sans" onChange={(e) => setWidth(e.target.value)}>
          <option value="">{widthLabel(null)}</option>
          {widths.map((w) => <option key={`${w.kind}:${w.px}`} value={`${w.kind}:${w.px}`}>{widthLabel(w)}</option>)}
        </NativeSelect>
      </div>
      {wt?.scoped && (
        <p className="text-[10.5px] leading-relaxed text-muted-foreground">
          {existing.length > 0 && <>Edits <code className="font-mono">{short(existing.map((t) => store.sources.get(t.key!)?.selector).join(" + "), 60)}</code>. </>}
          {fresh.length > 0 && (
            <>Adds {fresh.length === 1 ? "a rule" : `${fresh.length} rules`} to {shortFile(fresh[0]!.file)} when you save
              {fresh.length > 1 && scope.mode !== "all" ? " (this project switches dark mode by the system setting and by its theme switch)" : ""}.</>
          )}
        </p>
      )}
      {hiddenNow && (
        <p className="flex items-start gap-1.5 rounded-md border border-warning/30 bg-warning/10 px-2 py-1.5 text-[11px] text-warning">
          <CircleAlert className="mt-px size-3.5 shrink-0" />{hiddenNow}
        </p>
      )}
    </div>
  );
}

// ---------- copy one element's look onto another

let clipboard: Copied | null = null;
const DEFAULT_GROUPS = () => new Set(GROUPS.filter((g) => g.on).map((g) => g.id));

function copyLook(el: Element) {
  clipboard = copyStyle(el, label(el));
  // also as CSS, for pasting into code
  void navigator.clipboard?.writeText(cssText(clipboard, DEFAULT_GROUPS())).catch(() => {});
  store.message = { kind: "ok", text: `Copied the look of ${short(label(el), 30)}. Select another element to paste it.` };
  store.emit();
}

/** Changes as a designer counts them: four sides set to one value read as one ("Border color"). */
function summarize(diffs: Difference[]): { key: string; group: GroupId; name: string; now: string; value: string }[] {
  const out: { key: string; group: GroupId; name: string; now: string; value: string }[] = [];
  const used = new Set<string>();
  const sets: [string, string[]][] = [
    ["padding", ["top", "right", "bottom", "left"].map((s) => `padding-${s}`)],
    ["margin", ["top", "right", "bottom", "left"].map((s) => `margin-${s}`)],
    ["border-radius", ["top-left", "top-right", "bottom-right", "bottom-left"].map((c) => `border-${c}-radius`)],
    ...["width", "style", "color"].map((part): [string, string[]] => [`border-${part}`, ["top", "right", "bottom", "left"].map((s) => `border-${s}-${part}`)]),
    ["gap", ["row-gap", "column-gap"]],
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

function PasteStyle({ el, target, wt }: { el: Element; target: Match | null; wt: WriteTarget | null }) {
  useStore();
  const [groups, setGroups] = useState<Set<GroupId>>(DEFAULT_GROUPS);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const copied = clipboard!;
  const diffs = differences(copied, el);
  const chosen = diffs.filter((d) => groups.has(d.group));
  const rows = summarize(chosen);
  const toggle = (id: GroupId) => {
    const next = new Set(groups);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setGroups(next);
  };
  const paste = () => {
    if (!target || !wt) return;
    wt.write((d) => pasteInto(d, chosen));
    // what does not show as copied: a token that means something else here, or a stronger style
    const cs = getComputedStyle(el);
    const off = chosen.filter((d) => cs.getPropertyValue(d.prop) !== d.target);
    const { winner } = cascade(el);
    const key = wt.key;
    const local = key ? off.filter((d) => winner.get(d.prop) === key) : [];
    if (local.length) wt.write((d) => pasteInto(d, local.map((x) => ({ ...x, value: x.target }))));
    const stronger = key ? off.filter((d) => winner.get(d.prop) !== key) : [];
    setResult(stronger.length
      ? { ok: false, text: `Pasted, except ${[...new Set(stronger.map((d) => friendly(d.prop.replace(/-(top|right|bottom|left)(-(left|right))?/, ""))))].join(", ")}: a stronger style keeps ${stronger.length === 1 ? "it" : "them"} as ${stronger.length === 1 ? "it is" : "they are"}: paste into that style instead (Changes apply to).` }
      : { ok: true, text: `Pasted ${rows.length} change${rows.length === 1 ? "" : "s"} into ${target.live.rule.selectorText}. Save to keep them.` });
  };
  const count = (id: GroupId) => summarize(diffs.filter((d) => d.group === id)).length;

  return (
    <section className="grid gap-2.5 border-b bg-primary/5 px-3 py-3">
      <div className="flex items-center gap-2">
        <ClipboardPaste className="size-3.5 text-primary" />
        <span className="min-w-0 flex-1 truncate text-[11.5px]">Paste the look of <code className="font-mono text-primary">{short(copied.label, 28)}</code></span>
        <Tip label="Forget the copied look">
          <Button size="icon-sm" variant="ghost" aria-label="Forget the copied look" className="size-5" onClick={() => { clipboard = null; store.emit(); }}><X /></Button>
        </Tip>
      </div>
      {diffs.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">This element already looks the same.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1">
            {GROUPS.filter((g) => count(g.id)).map((g) => (
              <button key={g.id} type="button" aria-pressed={groups.has(g.id)} onClick={() => toggle(g.id)}
                className={cn("inline-flex h-6 items-center gap-1 rounded-md border px-2 text-[11px] text-muted-foreground hover:text-foreground",
                  groups.has(g.id) && "border-primary bg-primary/15 text-foreground")}>
                {groups.has(g.id) && <Check className="size-3" />}{g.label} <span className="tabular-nums opacity-70">{count(g.id)}</span>
              </button>
            ))}
          </div>
          <Collapsible>
            <CollapsibleTrigger className="group flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
              <ChevronRight className="size-3 transition-transform group-data-[state=open]:rotate-90" /> What changes ({rows.length})
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1.5 grid gap-0.5">
              {rows.map((d) => (
                <div key={d.key} className="grid grid-cols-[110px_minmax(0,1fr)] gap-2 text-[10.5px]">
                  <span className="truncate text-muted-foreground" title={d.key}>{d.name}</span>
                  <span className="truncate font-mono" title={`${d.now} → ${d.value}`}><span className="text-muted-foreground line-through">{short(d.now, 14)}</span> → {short(d.value, 22)}</span>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-[10.5px] text-muted-foreground">
              {target ? <>into <code className="font-mono">{short(target.live.rule.selectorText, 26)}</code> ({countMatches(withoutStates(target.live.rule.selectorText))} el.)</> : "No style to paste into: add one under All styles"}
            </span>
            <Button size="sm" disabled={!wt || !chosen.length} onClick={paste}><ClipboardPaste /> Paste {rows.length}</Button>
          </div>
        </>
      )}
      {result && <p className={cn("text-[11px]", result.ok ? "text-success" : "text-warning")}>{result.text}</p>}
    </section>
  );
}

// ---------- text: the words on the page, saved into the component they are written in

const MAX_TEXTS = 6;
const ids = new WeakMap<Node, number>();
let nextId = 0;
const nodeId = (n: Node) => ids.get(n) ?? (ids.set(n, ++nextId), nextId);
/** Text worth editing: has a letter or digit (not just the "." after a name). */
const wordy = (t: string) => /[\p{L}\p{N}]/u.test(t);
const hidden = (n: Node) => !!n.parentElement?.closest("script,style,noscript,svg,template");

/** The texts an element shows: its own, or (for a container) the texts inside it. */
function textNodesOf(el: Element): Text[] {
  const own = Array.from(el.childNodes).filter((n): n is Text => n.nodeType === Node.TEXT_NODE && wordy(store.originalOf(n as Text)));
  if (own.length) return own;
  const out: Text[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (wordy(store.originalOf(n as Text)) && !hidden(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  while (walker.nextNode() && out.length < 50) out.push(walker.currentNode as Text);
  return out;
}

/** The element and a few parents: a selected word may be part of a longer text a script split up. */
function containersOf(el: Element): Element[] {
  const out = [el];
  for (let p = el.parentElement; p && p !== document.body && out.length < 4; p = p.parentElement) {
    if ((p.textContent?.length ?? 0) > 4000) break;
    out.push(p);
  }
  return out;
}

type Split = { container: Element; index: TextIndex; pieces: Piece[]; rest: string };

function TextSection({ el }: { el: Element }) {
  useStore();
  const nodes = useMemo(() => textNodesOf(el), [el]);
  const indexes = useMemo(() => containersOf(el).map((c) => ({ el: c, index: textIndex(c, store.originalOf) })), [el]);
  const single = nodes.length === 1 ? squash(store.originalOf(nodes[0]!)) : null;
  useEffect(() => {
    void store.findPlaces(nodes.slice(0, MAX_TEXTS).map((n) => store.originalOf(n)));
    void store.findPieces(indexes.map((i) => i.index.full));
  }, [el]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!nodes.length) return null;

  // a text written as it is, in one place: edit it directly
  const singlePlaces = single ? store.places.get(single) : undefined;
  const direct = Array.isArray(singlePlaces) && singlePlaces.length === 1;
  // otherwise a text a script split up (or this element's part of one): edit the strings it came from
  let split: Split | null = null;
  if (!direct) {
    for (const { el: c, index } of indexes) {
      const found = store.pieces.get(index.full);
      if (!Array.isArray(found) || !found.length) continue;
      const mine = index.at.flatMap(([n], k) => (el.contains(n) ? [k] : []));
      const lo = mine[0] ?? 0, hi = (mine.at(-1) ?? 0) + 1;
      const pieces = found.filter((p) => p.start < hi && p.end > lo);
      if (!pieces.length) continue;
      // what of the element's text no piece covers: from data, or put together in code
      let rest = "";
      for (let k = lo; k < hi; k++) rest += pieces.some((p) => k >= p.start && k < p.end) ? " " : index.full[k];
      split = { container: c, index, pieces, rest: squash(rest).split(" ").filter(wordy).join(" ") };
      break;
    }
  }
  const looking = !direct && (single !== null && singlePlaces === "looking" || indexes.some((i) => store.pieces.get(i.index.full) === "looking"));
  const aside = <span className="text-[10.5px] text-muted-foreground">saved into the code</span>;

  if (split) {
    return (
      <Section title="Text" aside={aside}>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {split.container === el
            ? "The page splits this text into pieces (for an animation, say). Edit it whole here:"
            : <>Part of a longer text in <code className="font-mono">{short(label(split.container), 30)}</code> that the page splits into pieces. Edit it whole here:</>}
        </p>
        {split.pieces.map((p) => <PieceRow key={`${p.file}:${p.line}:${p.start}`} piece={p} index={split.index} />)}
        {split.rest && (
          <p className="inline-flex items-start gap-1 text-[10.5px] text-muted-foreground">
            <Database className="mt-px size-3 shrink-0" /> “{short(split.rest, 40)}” is not written in the code: it comes from data or is put together by the code.
          </p>
        )}
      </Section>
    );
  }
  if (looking) {
    return <Section title="Text" aside={aside}><p className="text-[11px] text-muted-foreground">Looking for it in the code…</p></Section>;
  }
  const shown = nodes.slice(0, MAX_TEXTS);
  return (
    <Section title="Text" aside={aside}>
      {shown.map((n) => <TextRow key={nodeId(n)} node={n} label={n.parentElement !== el ? label(n.parentElement!) : undefined} />)}
      {nodes.length > MAX_TEXTS && <p className="text-[11px] text-muted-foreground">{nodes.length - MAX_TEXTS} more inside: select the text itself to change it.</p>}
    </Section>
  );
}

/** A text box for one text: keeps what you type while you type, follows undo and saves otherwise. */
function TextBox({ k, original, onChange, disabled }: { k: TextKey; original: string; onChange: (v: string) => void; disabled?: boolean }) {
  const c = store.texts.get(k);
  const current = c ? c.after : original;
  const [draft, setDraft] = useState(current);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(current);
  }, [current]);
  return (
    <Textarea
      value={draft} disabled={disabled} aria-label="Text" rows={Math.min(6, Math.max(1, Math.ceil(draft.length / 42)))}
      onFocus={() => { focused.current = true; }} onBlur={() => { focused.current = false; setDraft(current); }}
      onChange={(e) => { setDraft(e.target.value); onChange(e.target.value); }}
      onKeyDown={(e) => {
        if (e.key === "Escape") { e.stopPropagation(); store.revertText(k); (e.target as HTMLTextAreaElement).blur(); }
      }}
    />
  );
}

function PlaceLink({ place }: { place: Place }) {
  return (
    <Tip label="Open in your code editor">
      <Button variant="link" size="sm" className="h-auto gap-1 font-mono text-[10.5px]" onClick={() => openInEditor(place.file, place.line)}>
        <FileCode className="size-3" />{shortFile(place.file)}:{place.line}
      </Button>
    </Tip>
  );
}

/** One source string of a split-up text, edited whole; the preview spreads its words over the pieces. */
function PieceRow({ piece, index }: { piece: Piece; index: TextIndex }) {
  const k = `piece:${piece.file}:${piece.line}:${piece.text}`;
  const c = store.texts.get(k);
  const at = { file: piece.file, line: piece.line };
  return (
    <div className="grid gap-1.5">
      <TextBox k={k} original={piece.text} onChange={(v) => store.setText(k, c?.segments ?? segmentsFor(index, piece.start, piece.end), piece.text, v, at)} />
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-muted-foreground">
        <PlaceLink place={at} />
        {c && <Button variant="ghost" size="sm" className="ml-auto h-5 px-1.5" onClick={() => store.revertText(k)}><Undo2 className="size-3" /> Undo</Button>}
      </div>
    </div>
  );
}

function TextRow({ node, label: where }: { node: Text; label?: string }) {
  const c = store.texts.get(node);
  const raw = store.originalOf(node);
  const original = squash(raw);
  const places = store.places.get(original);
  const fromData = Array.isArray(places) && places.length === 0;
  const place = c?.at ?? (Array.isArray(places) && places.length === 1 ? places[0] : undefined);
  const lead = raw.length - raw.trimStart().length;
  const segments = () => [{ node, from: lead, to: raw.trimEnd().length }];

  return (
    <div className="grid gap-1.5">
      {where && <span className="font-mono text-[10.5px] text-muted-foreground">{short(where, 40)}</span>}
      <TextBox k={node} original={original} disabled={fromData} onChange={(v) => store.setText(node, c?.segments ?? segments(), original, v)} />
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-muted-foreground">
        {places === "looking" && <span>Looking for it in the code…</span>}
        {fromData && (
          <span className="inline-flex items-center gap-1"><Database className="size-3" /> Not written in the code: it comes from data, so change it where the data lives.</span>
        )}
        {place && <PlaceLink place={place} />}
        {!c?.at && Array.isArray(places) && places.length > 1 && !c?.choices && <span>Written in {places.length} places: you choose which when you save.</span>}
        {c && <Button variant="ghost" size="sm" className="ml-auto h-5 px-1.5" onClick={() => store.revertText(node)}><Undo2 className="size-3" /> Undo</Button>}
      </div>
      {c?.choices && (
        <div className="grid gap-1 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px]">
          <span className="text-warning">This text is written in {c.choices.length} places. Which one is this?</span>
          {c.choices.map((pl) => (
            <Button key={`${pl.file}:${pl.line}`} variant="outline" size="sm" className="justify-start font-mono" onClick={() => store.chooseTextPlace(node, pl)}>
              {shortFile(pl.file)}:{pl.line}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- the design controls

type QuickProps = {
  el: Element; cs: CSSStyleDeclaration; cas: Cascade; target: Match | null; editable: Match[];
  inherited: Map<string, { el: Element; key: string }>; wt: WriteTarget | null;
};

/** A rule as a designer reads it: "`.by-h1` · 1 element · Screens up to 640px wide". */
function ruleLabel(m: Match) {
  const n = countMatches(withoutStates(m.live.rule.selectorText));
  const when = m.live.conds.length ? ` · ${describeCondition(conditionLabel(m.live))}` : "";
  return `${m.live.rule.selectorText}  ·  ${n} element${n === 1 ? "" : "s"}${when}${m.active ? "" : " (not at this width)"}`;
}

/** The everyday controls: type, colour, spacing, layout, written to one chosen rule. */
function Quick({ el, cs, cas, target, editable, inherited, wt }: QuickProps) {
  const key = wt?.key ?? null; // null in a scope: the scoped rule decides, so "overridden" notes do not apply
  const decls = wt?.decls ?? [];
  const write = (fn: (d: Decl[]) => Decl[]) => wt?.write(fn);
  const set = (prop: string) => (v: string | null) => write((d) => writeProp(d, prop, v));
  const rank = (k: string) => (k === "inline" ? -1 : cas.matches.findIndex((m) => m.live.key === k));
  // a declaration in the target will not show if a rule with higher priority sets the same longhand
  const overriddenBy = (longhand: string) => {
    const w = cas.winner.get(longhand);
    if (!w || !key || w === key || rank(w) > rank(key)) return null;
    return w;
  };
  const note = (prop: string, longhand = prop) => (
    <Note prop={prop} over={overriddenBy(longhand)} from={readProp(decls, prop) ? null : inherited.get(prop) ?? null} />
  );
  const isBox = /flex|grid/.test(cs.display);

  if (!target) {
    return (
      <div className="p-3 text-muted-foreground">
        No style rule in your CSS targets this element yet. Add one under <b className="text-foreground">All styles → New style</b>, or select a parent.
      </div>
    );
  }

  return (
    <>
      <Section title="Changes apply to">
        <NativeSelect aria-label="Rule the controls edit" value={target.live.key} onChange={(e) => { store.target = e.target.value; store.emit(); }}>
          {editable.map((m) => <option key={m.live.key} value={m.live.key}>{ruleLabel(m)}</option>)}
        </NativeSelect>
        <RuleMeta m={target} />
        <ScopePicker wt={wt} />
      </Section>

      <Section title="Typography">
        <Row label="Size" title="font-size" note={note("font-size")}>
          <FontSize value={readProp(decls, "font-size")} cs={cs} onChange={set("font-size")} />
        </Row>
        <Row label="Weight" title="font-weight" note={note("font-weight")}>
          <Weight value={readProp(decls, "font-weight")} computed={cs.fontWeight} onChange={set("font-weight")} />
        </Row>
        <Row label="Line" title="line-height: the space between lines" note={note("line-height")}>
          <Stepper prop="line-height" value={readProp(decls, "line-height") ?? ""} placeholder={lineHeightRatio(cs)} onChange={set("line-height")}
            presets={[["Tight", "1.1"], ["Snug", "1.3"], ["Normal", "1.5"], ["Loose", "1.7"]]} />
        </Row>
        <Row label="Spacing" title="letter-spacing: the space between letters" note={note("letter-spacing")}>
          <Stepper prop="letter-spacing" value={readProp(decls, "letter-spacing") ?? ""} onChange={set("letter-spacing")}
            placeholder={cs.letterSpacing === "normal" ? "0em" : cs.letterSpacing} />
        </Row>
        <Row label="Color" title="color" note={note("color")}>
          <ColorField prop="color" value={readProp(decls, "color")} computed={cs.color} onChange={set("color")} />
        </Row>
        <Row label="Align" title="text-align">
          <Align declared={readProp(decls, "text-align")} computed={cs.textAlign === "start" ? "left" : cs.textAlign} onPick={set("text-align")} />
        </Row>
      </Section>

      <Section title="Spacing">
        <BoxModel el={el} cs={cs} decls={decls} write={write} overriddenBy={overriddenBy} />
        {(isBox || readProp(decls, "gap")) && (
          <Row label="Gap" title="gap: the space between items" note={note("gap", "row-gap")}>
            <Stepper prop="gap" value={readProp(decls, "gap") ?? ""} onChange={set("gap")}
              placeholder={cs.rowGap === cs.columnGap ? px(cs.rowGap) : `${px(cs.rowGap)} ${px(cs.columnGap)}`} />
          </Row>
        )}
      </Section>

      {isBox && (
        <Section title={`Layout · ${cs.display}`}>
          <Row label="Justify" title="justify-content: along the main direction">
            <Choice prop="justify-content" decls={decls} write={write} computed={cs.justifyContent}
              options={["normal", "flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly", "stretch"]} />
          </Row>
          <Row label="Align" title="align-items: across the main direction">
            <Choice prop="align-items" decls={decls} write={write} computed={cs.alignItems}
              options={["normal", "stretch", "flex-start", "center", "flex-end", "baseline"]} />
          </Row>
        </Section>
      )}

      <Section title="Size">
        <Row label="Width" title="width" note={note("width")}>
          <Stepper prop="width" value={readProp(decls, "width") ?? ""} placeholder={px(cs.width)} onChange={set("width")} />
        </Row>
        <Row label="Max width" title="max-width" note={note("max-width")}>
          <Stepper prop="max-width" value={readProp(decls, "max-width") ?? ""} placeholder={cs.maxWidth} onChange={set("max-width")} />
        </Row>
      </Section>

      <Section title="Appearance">
        {(() => {
          // a `background: <colour>` shorthand is edited in place; otherwise background-color
          const bg = readProp(decls, "background");
          const bgProp = bg && typeof CSS !== "undefined" && CSS.supports("color", bg) ? "background" : "background-color";
          return (
            <Row label="Fill" title={`${bgProp}: the background colour`} note={note(bgProp, "background-color")}>
              <ColorField prop={bgProp} value={readProp(decls, bgProp)} computed={cs.backgroundColor} onChange={set(bgProp)} />
            </Row>
          );
        })()}
        <Row label="Opacity" title="opacity: how see-through the whole element is, contents included" note={note("opacity")}>
          <Opacity value={readProp(decls, "opacity")} computed={cs.opacity} onChange={set("opacity")} />
        </Row>
      </Section>
    </>
  );
}

function Note({ prop, over, from }: { prop: string; over: string | null; from: { el: Element; key: string } | null }) {
  if (over) {
    const live = over === "inline" ? null : store.live.find((l) => l.key === over);
    const editable = !!live?.source;
    const sel = over === "inline" ? "an inline style" : live?.source?.selector ?? live?.rule.selectorText ?? "another style";
    const where = over === "inline" ? "" : editable ? " Click to edit that one instead."
      : live?.origin === "style-tag" ? " It is written in a <style> tag in a component: change it there." : " It is not in your CSS files.";
    return (
      <Tip label={`A stronger style sets ${prop}, so changes here will not show.${where}`}>
        <button type="button" className="justify-self-start truncate text-left text-[10.5px] text-warning hover:underline"
          onClick={() => { if (editable) { store.target = over; store.emit(); } }}>
          overridden by {short(sel, 28)}
        </button>
      </Tip>
    );
  }
  if (from) {
    return (
      <Tip label="Inherited from a parent. Click to select it.">
        <button type="button" className="justify-self-start truncate text-left text-[10.5px] text-muted-foreground hover:text-foreground hover:underline"
          onClick={() => store.select(from.el)}>
          from {short(store.sources.get(from.key)?.selector ?? label(from.el), 28)}
        </button>
      </Tip>
    );
  }
  return null;
}

function RuleMeta({ m }: { m: Match }) {
  const src = m.live.source;
  const count = useMemo(() => countMatches(withoutStates(m.live.rule.selectorText)), [m.live.rule.selectorText]);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Tip label="Every element this style applies to: hover to outline them on the page">
        <Badge variant="outline" className="cursor-default tabular-nums"
          onMouseEnter={() => { store.highlight = m.live.key; }} onMouseLeave={() => { store.highlight = null; }}>
          {count} element{count === 1 ? "" : "s"}
        </Badge>
      </Tip>
      {m.live.conds.length > 0 && (
        <Tip label={conditionLabel(m.live)}>
          <Badge variant={m.active ? "secondary" : "warning"}>{describeCondition(conditionLabel(m.live))}{m.active ? "" : " · not now"}</Badge>
        </Tip>
      )}
      {m.state && <Badge variant="warning">{describeState(m.state)}</Badge>}
      {src && (
        <Tip label="Open in your code editor">
          <Button variant="link" size="sm" className="h-5 gap-1 font-mono text-[10.5px] text-muted-foreground hover:text-primary" onClick={() => openInEditor(src.file, src.line)}>
            <FileCode className="size-3" />{shortFile(src.file)}:{src.line}
          </Button>
        </Tip>
      )}
    </div>
  );
}

/** ".a:hover, .b::before" -> ".a, .b": the elements a state style is for, whatever their state now. */
const withoutStates = (selector: string) =>
  selector.replace(/::?(hover|focus-visible|focus-within|focus|active|visited|before|after|placeholder|marker|selection|first-line|first-letter)\b/g, "")
    .replace(/(^|,)\s*(?=,|$)/g, "$1*") || "*";

function countMatches(selector: string) {
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

/** Ask the dev server to open a file in your code editor (Next and Vite both offer this). */
function openInEditor(file: string, line: number) {
  const isNext = "next" in window;
  void fetch(isNext
    ? `/__nextjs_launch-editor?file=${encodeURIComponent(file)}&line1=${line}&column1=1`
    : `/__open-in-editor?file=${encodeURIComponent(`${store.root ? `${store.root}/` : ""}${file}:${line}`)}`);
}

// ---------- box model: margin and padding, each side editable

function BoxModel({ el, cs, decls, write, overriddenBy }: {
  el: Element; cs: CSSStyleDeclaration; decls: Decl[]; write: (fn: (d: Decl[]) => Decl[]) => void;
  overriddenBy: (longhand: string) => string | null;
}) {
  const [linked, setLinked] = useState<Record<string, boolean>>({});
  const r = el.getBoundingClientRect();
  const side = (base: "margin" | "padding", s: Side) => {
    const prop = `${base}-${s}`;
    const over = overriddenBy(prop);
    return (
      <ValueInput prop={prop} value={readProp(decls, prop) ?? ""} placeholder={px(cs.getPropertyValue(prop))}
        title={over ? `${prop}: overridden by ${store.sources.get(over)?.selector ?? "an inline style"}` : prop}
        className={cn("h-6 w-12 border-transparent bg-background/60 px-1 text-center text-[10.5px] shadow-none", over && "border-warning")}
        onChange={(v) => write((d) => (linked[base] ? writeSides(d, base, { top: v, right: v, bottom: v, left: v }) : writeProp(d, prop, v)))}
        onClear={() => write((d) => writeProp(d, prop, null))} />
    );
  };
  const ring = (base: "margin" | "padding") => (
    <Tip label={linked[base] ? `Editing all four ${base} sides together` : `Set all four ${base} sides together`}>
      <button type="button" aria-pressed={!!linked[base]} onClick={() => setLinked({ ...linked, [base]: !linked[base] })}
        className={cn("absolute top-1 left-1.5 inline-flex items-center gap-1 rounded px-1 text-[9.5px] font-semibold tracking-wider uppercase",
          linked[base] ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:text-foreground")}>
        {base} <Link2 className="size-3" />
      </button>
    </Tip>
  );
  const grid = "relative grid grid-cols-[56px_minmax(0,1fr)_56px] grid-rows-[32px_auto_32px] items-center justify-items-center rounded-md";
  return (
    <div className={cn(grid, "border border-dashed border-box-margin bg-box-margin")}>
      {ring("margin")}
      {SIDES.map((s) => <span key={s} className={SLOT[s]}>{side("margin", s)}</span>)}
      <div className={cn(grid, "col-start-2 row-start-2 w-full border border-box-padding bg-box-padding")}>
        {ring("padding")}
        {SIDES.map((s) => <span key={s} className={SLOT[s]}>{side("padding", s)}</span>)}
        <div className="col-start-2 row-start-2 m-0.5 w-[calc(100%-4px)] rounded border border-box-content bg-box-content px-1 py-2 text-center font-mono text-[11px]">
          {Math.round(r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth))}
          {" × "}
          {Math.round(r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - parseFloat(cs.borderTopWidth) - parseFloat(cs.borderBottomWidth))}
        </div>
      </div>
    </div>
  );
}
const SLOT: Record<Side, string> = {
  top: "col-start-2 row-start-1", bottom: "col-start-2 row-start-3", left: "col-start-1 row-start-2", right: "col-start-3 row-start-2",
};

// ---------- inputs

/** A text input for a CSS value: ↑/↓ change the number under the caret, Enter applies, Esc restores. */
function ValueInput({ prop, value, placeholder, onChange, onClear, className, title, disabled }: {
  prop: string; value: string; placeholder?: string; onChange: (v: string) => void; onClear?: () => void;
  className?: string; title?: string; disabled?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);
  const set = (v: string) => {
    setDraft(v);
    if (v.trim()) onChange(v.trim());
  };
  return (
    <Input
      className={cn(value ? "text-foreground" : "text-muted-foreground", className)} value={draft}
      placeholder={placeholder} title={title ?? prop} disabled={disabled} aria-label={prop}
      onFocus={() => { focused.current = true; }}
      onBlur={() => {
        focused.current = false;
        if (!draft.trim() && value) onClear?.();
        setDraft(value);
      }}
      onChange={(e) => set(e.target.value)}
      onKeyDown={(e) => {
        const input = e.currentTarget;
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          const base = draft.trim() ? draft : placeholder ?? "";
          const caret = draft.trim() ? input.selectionStart ?? base.length : 0;
          const steps = (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 10 : e.altKey ? 0.1 : 1);
          const r = nudge(base, caret, steps, prop);
          if (!r) return;
          e.preventDefault();
          set(r.value);
          requestAnimationFrame(() => input.setSelectionRange(r.start, r.end));
        } else if (e.key === "Enter") input.blur();
        else if (e.key === "Escape") {
          e.stopPropagation();
          setDraft(value);
          requestAnimationFrame(() => input.blur());
        }
      }}
    />
  );
}

// ---------- type controls

const SIZE_PRESETS = [12, 14, 16, 18, 20, 24, 32, 40, 48, 64];

function rootPx() {
  return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
}
const fmt = (n: number) => String(Math.round(n * 1000) / 1000);

/** Font size: a stepper, a slider and common sizes; a responsive clamp() is edited as smallest and largest. */
function FontSize({ value, cs, onChange }: { value: string | null; cs: CSSStyleDeclaration; onChange: (v: string | null) => void }) {
  const now = parseFloat(cs.fontSize);
  const clamp = value ? parseClamp(value) : null;
  const rem = !!value && /^[\d.]+rem$/.test(value.trim());
  const sized = (n: number) => (rem ? `${fmt(n / rootPx())}rem` : `${Math.round(n)}px`);
  if (clamp) {
    return (
      <div className="grid min-w-0 gap-2 rounded-md border bg-card p-2">
        <div className="flex min-w-0 items-center gap-2">
          <Badge>Responsive</Badge>
          <span className="min-w-0 truncate text-[10.5px] text-muted-foreground" title={value!}>now {Math.round(now)}px here</span>
          <Tip label={`Use one size everywhere (${Math.round(now)}px)`}>
            <Button variant="link" size="sm" className="ml-auto h-auto text-[10.5px]" onClick={() => onChange(`${Math.round(now)}px`)}>Make fixed</Button>
          </Tip>
        </div>
        <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-x-2 gap-y-1.5 text-[11px] text-muted-foreground">
          <span>Smallest</span>
          <Stepper prop="font-size" value={clamp[0]} onChange={(v) => v && onChange(composeClamp([v, clamp[1], clamp[2]]))} />
          <span>Largest</span>
          <Stepper prop="font-size" value={clamp[2]} onChange={(v) => v && onChange(composeClamp([clamp[0], clamp[1], v]))} />
        </div>
        <span className="text-[10.5px] text-muted-foreground">Grows with the screen in between ({clamp[1]}).</span>
      </div>
    );
  }
  return (
    <div className="grid gap-1.5">
      <Stepper prop="font-size" value={value ?? ""} placeholder={px(cs.fontSize)} onChange={onChange} />
      <input type="range" min={8} max={120} step={1} value={Math.round(now)} aria-label="Font size"
        className="h-4 w-full cursor-pointer accent-primary" onChange={(e) => onChange(sized(Number(e.target.value)))} />
      <div className="flex flex-wrap gap-1">
        {SIZE_PRESETS.map((n) => (
          <button key={n} type="button" onClick={() => onChange(sized(n))}
            className={cn("h-5 min-w-7 rounded-sm border px-1 font-mono text-[10.5px] tabular-nums text-muted-foreground hover:bg-accent hover:text-foreground",
              Math.round(now) === n && "border-primary bg-primary/15 text-foreground")}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Font weight by name: Regular 400, Semibold 600... */
function Weight({ value, computed, onChange }: { value: string | null; computed: string; onChange: (v: string | null) => void }) {
  const custom = value && !WEIGHT_NAMES.some(([n]) => String(n) === value) ? value : null;
  const n = Number(value ?? computed);
  const step = (dir: number) => {
    const next = dir > 0 ? (Math.floor(n / 100) + 1) * 100 : (Math.ceil(n / 100) - 1) * 100;
    onChange(String(Math.min(900, Math.max(100, next))));
  };
  return (
    <div className="flex gap-1">
      <Button variant="outline" size="icon" aria-label="Lighter" disabled={n <= 100} onClick={() => step(-1)}><Minus /></Button>
      <NativeSelect aria-label="font-weight" value={value ?? ""} className={value ? "font-sans" : "font-sans text-muted-foreground"}
        onChange={(e) => onChange(e.target.value || null)}>
        <option value="">{weightName(computed)} · {computed}{value ? " (remove)" : ""}</option>
        {custom && <option value={custom}>{weightName(custom)} · {custom}</option>}
        {WEIGHT_NAMES.map(([w, name]) => <option key={w} value={String(w)}>{name} · {w}</option>)}
      </NativeSelect>
      <Button variant="outline" size="icon" aria-label="Bolder" disabled={n >= 900} onClick={() => step(1)}><Plus /></Button>
    </div>
  );
}

/** − value + : the buttons and ↑/↓ change the number; presets fill in common values. */
function Stepper({ prop, value, placeholder, onChange, presets, disabled }: {
  prop: string; value: string; placeholder?: string; onChange: (v: string | null) => void;
  presets?: [string, string][]; disabled?: boolean;
}) {
  const bump = (dir: number) => {
    const r = nudge(value || placeholder || "0", 0, dir, prop);
    if (r) onChange(r.value);
  };
  return (
    <div className="grid gap-1">
      <div className="flex gap-1">
        <Button variant="outline" size="icon" aria-label={`Less ${prop}`} disabled={disabled} onClick={() => bump(-1)}><Minus /></Button>
        <ValueInput prop={prop} value={value} placeholder={placeholder} disabled={disabled} className="text-center"
          onChange={(v) => onChange(v)} onClear={() => onChange(null)} />
        <Button variant="outline" size="icon" aria-label={`More ${prop}`} disabled={disabled} onClick={() => bump(1)}><Plus /></Button>
      </div>
      {presets && (
        <div className="flex flex-wrap gap-1">
          {presets.map(([name, v]) => (
            <button key={v} type="button" onClick={() => onChange(v)} title={`${prop}: ${v}`}
              className={cn("h-5 rounded-sm border px-1.5 text-[10.5px] text-muted-foreground hover:bg-accent hover:text-foreground",
                (value || placeholder) === v && "border-primary bg-primary/15 text-foreground")}>
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** How see-through a colour is, 0–1: as written if the text says, else as the browser computed it. */
const alphaOf = (value: string | null, computed: string) => (value ? writtenAlpha(value) : null) ?? toRgba(computed)?.[3] ?? 1;

/** A colour: swatch (opens the picker), the value as written, and its opacity. */
function ColorField({ prop, value, computed, onChange }: { prop: string; value: string | null; computed: string; onChange: (v: string | null) => void }) {
  const alpha = alphaOf(value, computed);
  return (
    <div className="flex gap-1">
      <Tip label="Pick a colour">
        <label className="relative size-7 shrink-0 cursor-pointer overflow-hidden rounded-md border shadow-xs checkerboard">
          <span className="absolute inset-0" style={{ background: computed }} />
          <input type="color" aria-label={`${prop} picker`} value={toHex(computed)}
            // the picker has no alpha: keep the colour's opacity
            onChange={(e) => onChange(alpha < 0.995 ? withAlpha(e.target.value, alpha) : e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0" />
        </label>
      </Tip>
      <ValueInput prop={prop} value={value ?? ""} placeholder={toHex(computed)} onChange={(v) => onChange(v)} onClear={() => onChange(null)} />
      <AlphaInput prop={prop} alpha={alpha} onChange={(a) => onChange(withAlpha(value ?? computed, a))} />
    </div>
  );
}

/** A colour's opacity in %: type it, or ↑/↓ (Shift ×10). Writes the colour with transparency. */
function AlphaInput({ prop, alpha, onChange, className }: { prop: string; alpha: number; onChange: (a: number) => void; className?: string }) {
  const pct = Math.round(alpha * 100);
  const [draft, setDraft] = useState(String(pct));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setDraft(String(pct)); }, [pct]);
  const commit = (n: number) => {
    const c = Math.min(100, Math.max(0, Math.round(n)));
    setDraft(String(c));
    onChange(c / 100);
  };
  return (
    <Tip label="Opacity of this colour: 100% is solid, 0% is clear">
      <div className={cn("relative w-[54px] shrink-0", className)}>
        <Input value={draft} inputMode="numeric" aria-label={`${prop} opacity`} className={cn("pr-4 text-right tabular-nums", className)}
          onFocus={() => { focused.current = true; }}
          onBlur={() => { focused.current = false; setDraft(String(pct)); }}
          onChange={(e) => {
            const v = e.target.value.replace(/[^\d.]/g, "");
            setDraft(v);
            if (v !== "" && !Number.isNaN(+v)) commit(+v);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              commit(pct + (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 10 : 1));
            } else if (e.key === "Enter") e.currentTarget.blur();
          }} />
        <span className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-[10.5px] text-muted-foreground">%</span>
      </div>
    </Tip>
  );
}

/** opacity: a slider and a number in %. Writes the way the rule already does (0.6 or 60%); new values as 0.6. */
function Opacity({ value, computed, onChange }: { value: string | null; computed: string; onChange: (v: string | null) => void }) {
  const read = (v: string) => (v.trim().endsWith("%") ? parseFloat(v) : parseFloat(v) * 100);
  const declared = value !== null && !Number.isNaN(read(value)) ? read(value) : null;
  const pct = Math.round(declared ?? (parseFloat(computed) || 1) * 100);
  const write = (n: number) => {
    const c = Math.min(100, Math.max(0, Math.round(n)));
    onChange(value?.trim().endsWith("%") ? `${c}%` : String(+(c / 100).toFixed(2)));
  };
  return (
    <div className="flex items-center gap-2">
      <input type="range" min={0} max={100} step={1} value={pct} aria-label="opacity slider"
        className={cn("h-7 min-w-0 flex-1 cursor-pointer accent-primary", declared === null && "opacity-60")}
        onChange={(e) => write(+e.target.value)} />
      <AlphaInput prop="opacity" alpha={pct / 100} onChange={(a) => write(a * 100)} className={declared === null ? "text-muted-foreground" : ""} />
      {declared !== null && (
        <Tip label="Remove opacity from this style">
          <Button size="icon-sm" variant="ghost" aria-label="Remove opacity" className="size-5" onClick={() => onChange(null)}><X /></Button>
        </Tip>
      )}
    </div>
  );
}

const ALIGN_ICONS: Record<string, typeof AlignLeft> = { left: AlignLeft, center: AlignCenter, right: AlignRight, justify: AlignJustify };

function Align({ declared, computed, onPick }: { declared: string | null; computed: string; onPick: (v: string | null) => void }) {
  return (
    <ToggleGroup type="single" aria-label="text-align" value={declared ?? ""} onValueChange={(v) => onPick(v || null)}>
      {Object.entries(ALIGN_ICONS).map(([o, Icon]) => (
        <Tip key={o} label={declared === o ? `Remove "align ${o}" from this style` : `Align ${o}${!declared && computed === o ? " (current)" : ""}`}>
          <ToggleGroupItem value={o} aria-label={o} data-soft={!declared && computed === o}><Icon /></ToggleGroupItem>
        </Tip>
      ))}
    </ToggleGroup>
  );
}

function Choice({ prop, decls, write, computed, options }: {
  prop: string; decls: Decl[]; write: (fn: (d: Decl[]) => Decl[]) => void; computed: string; options: string[];
}) {
  const declared = readProp(decls, prop);
  return (
    <NativeSelect aria-label={prop} value={declared ?? ""} className={declared ? "" : "text-muted-foreground"}
      onChange={(e) => write((d) => writeProp(d, prop, e.target.value || null))}>
      <option value="">{computed}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </NativeSelect>
  );
}

// ---------- all styles: every rule for the element, grouped the way a designer thinks about them

const FRIENDLY: Record<string, string> = {
  "font-size": "Font size", "font-weight": "Weight", "font-family": "Font", "font-style": "Style", font: "Font", "line-height": "Line height",
  "letter-spacing": "Letter spacing", "text-transform": "Case", "text-align": "Align", "text-decoration": "Underline", "text-wrap": "Wrapping",
  "white-space": "Wrapping", color: "Text color", background: "Background", "background-color": "Background", "background-image": "Background image",
  padding: "Padding", "padding-top": "Padding top", "padding-right": "Padding right", "padding-bottom": "Padding bottom", "padding-left": "Padding left",
  "padding-inline": "Padding sides", "padding-block": "Padding top & bottom",
  margin: "Margin", "margin-top": "Margin top", "margin-right": "Margin right", "margin-bottom": "Margin bottom", "margin-left": "Margin left",
  "margin-inline": "Margin sides", "margin-block": "Margin top & bottom",
  gap: "Gap", "row-gap": "Row gap", "column-gap": "Column gap", width: "Width", height: "Height", "max-width": "Max width",
  "min-width": "Min width", "max-height": "Max height", "min-height": "Min height", border: "Border", "border-top": "Border top",
  "border-bottom": "Border bottom", "border-color": "Border color", "border-width": "Border width", "border-radius": "Corner radius",
  "box-shadow": "Shadow", opacity: "Opacity", display: "Display", position: "Position", top: "Top", right: "Right", bottom: "Bottom",
  left: "Left", inset: "Inset", "z-index": "Stacking", overflow: "Overflow", "justify-content": "Justify", "align-items": "Align items",
  "align-self": "Align self", "flex-direction": "Direction", "flex-wrap": "Wrap", flex: "Flex", "grid-template-columns": "Columns",
  "grid-template-rows": "Rows", transition: "Transition", transform: "Transform", cursor: "Cursor", "box-sizing": "Box sizing",
  "border-style": "Border style", "text-decoration-line": "Underline",
  "border-top-left-radius": "Corner top left", "border-top-right-radius": "Corner top right", "border-bottom-right-radius": "Corner bottom right",
  "border-bottom-left-radius": "Corner bottom left", "object-fit": "Image fit", "overflow-wrap": "Word breaking", "word-break": "Word breaking", "pointer-events": "Clicks", "aspect-ratio": "Aspect ratio", outline: "Outline", "outline-offset": "Outline offset",
};
const friendly = (prop: string) => (prop.startsWith("--") ? prop : FRIENDLY[prop] ?? prop);
const isColorish = (prop: string, value: string) =>
  /color|^background$|^fill$|^stroke$/.test(prop) && typeof CSS !== "undefined" && CSS.supports("color", value);

/** Page-wide defaults (`*`, `html`, `body`) and framework styles (Tailwind's). A component's own
 *  `<style>` rules are not base styles: they are listed with the rest, read-only. */
const isBase = (m: Match) =>
  (!m.live.source && m.live.origin !== "style-tag") || /^(\*|html|body|:root|:host)(?![\w-])/.test(m.part.trim());
/** Written by you (a .css file or a <style> tag), as opposed to a framework. */
const yours = (m: Match) => !!m.live.source || m.live.origin === "style-tag";

function AllStyles({ el, cas, target }: { el: Element; cas: Cascade; target: Match | null }) {
  const states = cas.matches.filter((m) => m.state && yours(m));
  const screens = cas.matches.filter((m) => !m.state && !m.active && yours(m));
  const here = cas.matches.filter((m) => !m.state && m.active && !isBase(m));
  const base = cas.matches.filter((m) => !states.includes(m) && !screens.includes(m) && !here.includes(m));
  const card = (m: Match) => <StyleCard key={m.live.key} m={m} cas={cas} isTarget={m === target} />;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] leading-relaxed text-muted-foreground">Strongest first. Where two styles set the same thing, the higher one wins; the other is marked <i>overridden</i>.</p>
        <NewRule el={el} cas={cas} />
      </div>
      {cas.matches.length === 0 && <p className="text-muted-foreground">No style in the project's CSS applies to this element.</p>}
      {here.length > 0 && <Group title="On this element" hint="Applies now, at this screen size.">{here.map(card)}</Group>}
      {screens.length > 0 && <Group title="Other screen sizes" hint="Applies at other widths only. Edit the phone layout from here.">{screens.map(card)}</Group>}
      {states.length > 0 && <Group title="Hover, focus and other states" hint="Applies while the element is hovered, focused…">{states.map(card)}</Group>}
      {base.length > 0 && (
        <Collapsible className="grid gap-2">
          <CollapsibleTrigger className="group flex items-center gap-1 text-left">
            <ChevronRight className="size-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
            <SectionTitle>Base styles · {base.length}</SectionTitle>
            <span className="ml-1 text-[10.5px] text-muted-foreground">page-wide defaults and framework styles</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="grid grid-cols-[minmax(0,1fr)] gap-2">{base.map(card)}</CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

function Group({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-2">
      <div className="grid gap-0.5"><SectionTitle>{title}</SectionTitle><p className="text-[10.5px] text-muted-foreground">{hint}</p></div>
      {children}
    </section>
  );
}

function StyleCard({ m, cas, isTarget }: { m: Match; cas: Cascade; isTarget: boolean }) {
  const key = m.live.key;
  const src = m.live.source;
  const decls = store.declsOf(key);
  const [adding, setAdding] = useState(false);
  const [prop, setProp] = useState("");
  const [val, setVal] = useState("");
  const changed = store.edits.has(key);
  const set = (fn: (d: Decl[]) => Decl[]) => store.setDecls(key, fn(store.declsOf(key)));

  return (
    <div className={cn("grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 rounded-lg border bg-card p-2.5", isTarget && "border-primary/60 ring-1 ring-primary/30")}>
      <div className="flex items-start gap-2">
        <code className="min-w-0 flex-1 font-mono text-[11.5px] break-words text-code" title={m.live.rule.selectorText}>{m.live.rule.selectorText}</code>
        {changed && (
          <Tip label="Undo the changes to this style">
            <Button size="icon-sm" variant="ghost" aria-label="Revert" className="size-5" onClick={() => store.revert(key)}><Undo2 /></Button>
          </Tip>
        )}
        {isTarget ? <Badge variant="outline">In Design</Badge> : src && !m.state && (
          <Tip label="Edit this style with the Design controls">
            <Button size="sm" variant="ghost" className="h-5 px-1.5" onClick={() => { store.target = key; store.emit(); }}>Use in Design</Button>
          </Tip>
        )}
      </div>
      <RuleMeta m={m} />
      {!src && m.live.origin === "style-tag" ? (
        <div className="grid gap-1.5">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Written in a <code className="font-mono">&lt;style&gt;</code> tag (a component&apos;s own styles), not in a .css file,
            so it can&apos;t be edited here. Change it in the component, or move it into a .css file.
          </p>
          {decls.map((d, i) => {
            const id = `${key}#${i}`;
            const applied = m.state ? !cas.stateOverridden.has(id) : cas.applied.has(id) || !m.active;
            return (
              <div key={`${d.prop}-${i}`} className={cn("grid grid-cols-[100px_minmax(0,1fr)] items-center gap-1.5", !applied && "opacity-60")}>
                <span className="grid min-w-0 leading-tight">
                  <span className="truncate text-[11.5px] text-foreground">{friendly(d.prop)}</span>
                  {!applied && <span className="text-[9.5px] text-warning">overridden</span>}
                </span>
                <span className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                  {isColorish(d.prop, d.value) && <span className="size-3 shrink-0 rounded-full border" style={{ background: d.value }} />}
                  <span className="truncate" title={d.value}>{d.value}{d.important ? " !important" : ""}</span>
                </span>
              </div>
            );
          })}
        </div>
      ) : !src ? (
        <p className="text-[11px] text-muted-foreground">Made by a framework (such as Tailwind), not written in your CSS, so it can't be edited here: <code className="font-mono break-all">{m.live.rule.style.cssText}</code></p>
      ) : (
        <div className="grid gap-1">
          {decls.map((d, i) => {
            const applied = m.state ? !cas.stateOverridden.has(`${key}#${i}`) : cas.applied.has(`${key}#${i}`) || !m.active;
            const swatch = isColorish(d.prop, d.value);
            return (
              <div key={`${d.prop}-${i}`} className={cn("group grid grid-cols-[100px_minmax(0,1fr)_20px] items-center gap-1.5", !applied && "opacity-60")}>
                <Tip label={applied ? d.prop : `${d.prop}: overridden, a stronger style sets this`}>
                  <span className="grid min-w-0 leading-tight">
                    <span className="truncate text-[11.5px] text-foreground">{friendly(d.prop)}</span>
                    {!applied && <span className="text-[9.5px] text-warning">overridden</span>}
                  </span>
                </Tip>
                <div className="flex min-w-0 gap-1">
                  <div className="relative min-w-0 flex-1">
                    {swatch && <span className="checkerboard pointer-events-none absolute top-1/2 left-1.5 size-3.5 -translate-y-1/2 overflow-hidden rounded-sm border shadow-xs"><span className="absolute inset-0" style={{ background: d.value }} /></span>}
                    <ValueInput prop={d.prop} value={d.value + (d.important ? " !important" : "")} className={cn("h-6", swatch && "pl-6")}
                      onChange={(v) => set((ds) => ds.map((x, j) => (j === i ? parseDecl(d.prop, v) : x)))}
                      onClear={() => set((ds) => ds.filter((_, j) => j !== i))} />
                  </div>
                  {swatch && (
                    <AlphaInput prop={d.prop} className="h-6" alpha={writtenAlpha(d.value) ?? toRgba(resolveOnPage(d.value) ?? d.value)?.[3] ?? 1}
                      onChange={(a) => set((ds) => ds.map((x, j) => (j === i ? { ...x, value: withAlpha(x.value, a) } : x)))} />
                  )}
                </div>
                <Button size="icon-sm" variant="ghost" aria-label={`Remove ${d.prop}`} className="size-5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  onClick={() => set((ds) => ds.filter((_, j) => j !== i))}><X /></Button>
              </div>
            );
          })}
          {adding ? (
            <form className="grid grid-cols-[100px_minmax(0,1fr)_20px] items-center gap-1.5" onSubmit={(e) => {
              e.preventDefault();
              if (!prop.trim() || !val.trim()) return;
              set((ds) => writeProp(ds, prop.trim(), val.trim()));
              setProp("");
              setVal("");
              setAdding(false);
            }}>
              <Input className="h-6" list="domeditor-props" placeholder="property" value={prop} onChange={(e) => setProp(e.target.value)} aria-label="New property" autoFocus />
              <Input className="h-6" placeholder="value" value={val} onChange={(e) => setVal(e.target.value)} aria-label="New value" />
              <Button type="submit" size="icon-sm" variant="ghost" aria-label="Add" className="size-5"><CornerDownLeft /></Button>
            </form>
          ) : (
            <Button variant="ghost" size="sm" className="justify-self-start text-muted-foreground" onClick={() => setAdding(true)}><Plus /> Add a style</Button>
          )}
        </div>
      )}
    </div>
  );
}

const parseDecl = (prop: string, v: string): Decl => {
  const important = /!\s*important\s*$/i.test(v);
  return { prop, value: v.replace(/!\s*important\s*$/i, "").trim(), important };
};

function NewRule({ el, cas }: { el: Element; cas: Cascade }) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState("");
  const [file, setFile] = useState("");
  if (!open) {
    return (
      <Tip label="Create a new style for this element in a CSS file">
        <Button size="sm" variant="outline" onClick={() => {
          setSel(suggestSelector(el));
          // the page's own stylesheet rather than a global one, where there is one
          const own = cas.matches.find((m) => m.live.source && !/(^|\/)(globals?|index|styles?|main|app)\.css$/.test(m.live.ref.file));
          setFile(own?.live.ref.file ?? cas.matches.find((m) => m.live.source)?.live.ref.file ?? store.files[0] ?? "");
          setOpen(true);
        }}><Plus /> New style</Button>
      </Tip>
    );
  }
  return (
    <form className="col-span-full grid w-full gap-1.5 rounded-lg border bg-card p-2.5" onSubmit={async (e) => {
      e.preventDefault();
      await store.createRule(file, sel);
      setOpen(false);
    }}>
      <label className="grid gap-1 text-[10.5px] text-muted-foreground">Which elements (a CSS selector)
        <Input value={sel} onChange={(e) => setSel(e.target.value)} aria-label="Selector" autoFocus />
      </label>
      <label className="grid gap-1 text-[10.5px] text-muted-foreground">In file
        <NativeSelect value={file} onChange={(e) => setFile(e.target.value)} aria-label="File">
          {store.files.map((f) => <option key={f} value={f}>{f}</option>)}
        </NativeSelect>
      </label>
      <div className="flex justify-end gap-1.5">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        <Button size="sm" type="submit">Add style</Button>
      </div>
    </form>
  );
}

// ---------- unsaved changes

function Footer() {
  const [saving, setSaving] = useState(false);
  const n = store.pending;
  const files = [...new Set([...store.edits.keys()].map((k) => store.sources.get(k)?.file).filter(Boolean))] as string[];
  const styles = store.edits.size + store.virtuals.size;
  const what = [styles ? `${styles} style${styles === 1 ? "" : "s"}` : "", store.texts.size ? `${store.texts.size} text${store.texts.size === 1 ? "" : "s"}` : ""].filter(Boolean).join(" and ");
  const msg = store.message;
  return (
    <footer className="grid shrink-0 gap-2 border-t bg-background px-3 py-2.5">
      <datalist id="domeditor-props">{PROPS.map((p) => <option key={p} value={p} />)}</datalist>
      {msg && (
        <p className={cn("flex items-start gap-1.5 text-[11px]", msg.kind === "ok" ? "text-success" : "text-destructive")}>
          {msg.kind === "ok" ? <Check className="mt-px size-3.5 shrink-0" /> : <CircleAlert className="mt-px size-3.5 shrink-0" />}
          {msg.text}
        </p>
      )}
      {n > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="group flex w-full items-center gap-1 text-left text-[11px] text-warning hover:underline">
            <ChevronRight className="size-3 transition-transform group-data-[state=open]:rotate-90" />
            {what} changed{files.length ? ` in ${files.map(shortFile).join(", ")}` : ""}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1.5 grid gap-1 pl-4">
            {[...store.edits.keys()].map((k) => (
              <div key={k} className="flex items-center justify-between gap-2">
                <code className="truncate font-mono text-[11px] text-code">{store.sources.get(k)?.selector}</code>
                <Button size="sm" variant="ghost" className="h-5 px-1.5" onClick={() => store.revert(k)}><Undo2 className="size-3" /> Revert</Button>
              </div>
            ))}
            {[...store.virtuals.values()].map((v, i) => (
              <div key={`v${i}`} className="flex items-center justify-between gap-2">
                <code className="truncate font-mono text-[11px] text-code" title={`${v.media ? `@media ${v.media} ` : ""}${v.selector}`}>{v.selector}{v.media ? ` @${v.media}` : ""}</code>
                <Button size="sm" variant="ghost" className="h-5 px-1.5" onClick={() => store.setVirtual(v.file, v, [])}><Undo2 className="size-3" /> Revert</Button>
              </div>
            ))}
            {[...store.texts.values()].map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="truncate text-[11px]">“{short(c.after, 34)}”</span>
                <Button size="sm" variant="ghost" className="h-5 px-1.5" onClick={() => store.revertText(c.key)}><Undo2 className="size-3" /> Revert</Button>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" disabled={!n} onClick={() => store.discardAll()}>Discard</Button>
        <Button disabled={!n || saving} onClick={async () => { setSaving(true); await store.save(); setSaving(false); }}>
          {saving ? "Saving…" : `Save${n ? ` ${n}` : ""}`} <Kbd>{MOD} S</Kbd>
        </Button>
      </div>
    </footer>
  );
}

// ---------- the page overlay: hover outline, box model of the selection, gaps, and a rule's elements

type Box = { left: number; top: number; width: number; height: number };
type Frame = {
  hover: Box | null; hoverLabel: string;
  sel: { margin: Box; border: Box; padding: Box; content: Box; m: number[]; p: number[]; gaps: Box[]; label: string } | null;
  many: Box[];
};

function Overlay() {
  const [f, setF] = useState<Frame>({ hover: null, hoverLabel: "", sel: null, many: [] });
  useEffect(() => {
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
  return (
    <div className="pointer-events-none fixed inset-0 z-[2147482999]" aria-hidden="true">
      {f.many.map((b, i) => <div key={i} className="fixed outline-[1.5px] outline-code outline-dashed" style={pos(b)} />)}
      {s && (
        <>
          <div className="fixed border-solid border-box-margin" style={{ ...pos(s.margin), borderWidth: s.m.map((v) => `${v}px`).join(" ") }} />
          <div className="fixed border-solid border-box-padding" style={{ ...pos(s.padding), borderWidth: s.p.map((v) => `${v}px`).join(" ") }} />
          <div className="fixed bg-box-content" style={pos(s.content)} />
          {s.gaps.map((g, i) => (
            <div key={i} className="fixed" style={{ ...pos(g), background: "repeating-linear-gradient(45deg, var(--box-gap) 0 4px, transparent 4px 8px)" }} />
          ))}
          <div className={cn(tag, "bg-background text-foreground")} style={labelPos(s.border)}>{s.label}</div>
        </>
      )}
      {f.hover && (
        <>
          <div className="fixed bg-primary/10 outline-[1.5px] outline-primary outline-solid" style={pos(f.hover)} />
          <div className={cn(tag, "bg-primary text-primary-foreground")} style={labelPos(f.hover)}>{f.hoverLabel}</div>
        </>
      )}
    </div>
  );
}

const pos = (b: Box) => ({ left: b.left, top: b.top, width: Math.max(0, b.width), height: Math.max(0, b.height) });
const labelPos = (b: Box) => ({ left: Math.max(4, b.left), top: b.top > 26 ? b.top - 24 : b.top + b.height + 4 });
const rect = (r: DOMRect): Box => ({ left: r.left, top: r.top, width: r.width, height: r.height });

function measure(): Frame {
  const frame: Frame = { hover: null, hoverLabel: "", sel: null, many: [] };
  const h = store.hovered;
  if (h?.isConnected) {
    const r = h.getBoundingClientRect();
    frame.hover = rect(r);
    frame.hoverLabel = `${short(label(h))}  ${Math.round(r.width)}×${Math.round(r.height)}`;
  }
  const el = store.selected;
  if (el?.isConnected) {
    const cs = getComputedStyle(el);
    const n = (p: string) => Math.max(0, parseFloat(cs.getPropertyValue(p)) || 0);
    const r = el.getBoundingClientRect();
    const m = SIDES.map((s) => n(`margin-${s}`));
    const b = SIDES.map((s) => n(`border-${s}-width`));
    const p = SIDES.map((s) => n(`padding-${s}`));
    const border = rect(r);
    const margin = { left: r.left - m[3]!, top: r.top - m[0]!, width: r.width + m[1]! + m[3]!, height: r.height + m[0]! + m[2]! };
    const padding = { left: r.left + b[3]!, top: r.top + b[0]!, width: r.width - b[1]! - b[3]!, height: r.height - b[0]! - b[2]! };
    const content = { left: padding.left + p[3]!, top: padding.top + p[0]!, width: padding.width - p[1]! - p[3]!, height: padding.height - p[0]! - p[2]! };
    frame.sel = { margin, border, padding, content, m, p, gaps: /flex|grid/.test(cs.display) ? gaps(el, content) : [], label: `${short(label(el))}  ${Math.round(r.width)}×${Math.round(r.height)}` };
  }
  if (store.highlight) {
    const live = store.live.find((l) => l.key === store.highlight);
    if (live) {
      let els: Element[] = [];
      try {
        els = Array.from(document.querySelectorAll(live.rule.selectorText.replace(/::?(hover|focus-visible|focus|active|before|after)\b/g, "") || "*"));
      } catch { /* selector the browser cannot query */ }
      frame.many = els.filter((e) => !mine(e)).slice(0, 300).map((e) => rect(e.getBoundingClientRect()));
    }
  }
  return frame;
}

/** The gaps between a flex/grid container's children, so `gap` is visible. */
function gaps(el: Element, content: Box): Box[] {
  const kids = Array.from(el.children)
    .filter((c) => { const s = getComputedStyle(c); return s.display !== "none" && s.position !== "absolute" && s.position !== "fixed"; })
    .map((c) => c.getBoundingClientRect());
  const out: Box[] = [];
  for (let i = 1; i < kids.length; i++) {
    const a = kids[i - 1]!, b = kids[i]!;
    if (b.left >= a.right - 0.5 && b.top < a.bottom && b.bottom > a.top) {
      const top = Math.min(a.top, b.top);
      out.push({ left: a.right, top, width: b.left - a.right, height: Math.max(a.bottom, b.bottom) - top });
    } else if (b.top >= a.bottom - 0.5) {
      out.push({ left: content.left, top: a.bottom, width: content.width, height: b.top - a.bottom });
    }
  }
  return out.filter((g) => g.width >= 1 && g.height >= 1);
}
