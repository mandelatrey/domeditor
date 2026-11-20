// The editor panel: pick an element, adjust type, spacing and layout with live preview, save the
// change into the .css file its rule came from. Rendered inside a shadow root (see index.tsx).
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, ArrowDown, ArrowUp, Check, ChevronRight, CircleAlert,
  CornerDownLeft, FileCode, Link2, MousePointer2, PanelLeft, PanelRight, Plus, SquareDashedMousePointer, Undo2, X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { nudge, readProp, writeProp, writeSides, type Decl, type Side } from "../core/shared";
import {
  cascade, conditionLabel, defaultTarget, inheritedFrom, label, shortFile, store, suggestSelector, type Cascade, type Match,
} from "./model";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Input } from "./ui/input";
import { Kbd } from "./ui/kbd";
import { NativeSelect } from "./ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s" && store.edits.size) {
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
        {store.edits.size > 0 && <span className="size-1.5 rounded-full bg-warning" />}
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
        <li>Type a value, press <Kbd>↑</Kbd> <Kbd>↓</Kbd> on any number (<Kbd>⇧</Kbd> ×10, <Kbd>{ALT}</Kbd> ×0.1), or drag a label sideways.</li>
        <li>Changes show at once. <b className="text-foreground">Save</b> (<Kbd>{MOD} S</Kbd>) writes them into the .css file the rule lives in.</li>
        <li>Rules for other screen sizes are listed too: edit the phone layout from your desktop.</li>
      </ul>
    </div>
  );
}

// ---------- the inspector for one element

const TEXT_PROPS = ["font-size", "line-height", "font-weight", "letter-spacing", "text-align"];

function Inspector({ el }: { el: Element }) {
  const version = useStore();
  const cas = useMemo(() => cascade(el), [el, version]);
  const inherited = useMemo(() => inheritedFrom(el, TEXT_PROPS), [el, version]);
  const editable = cas.matches.filter((m) => !m.state && m.live.source);
  const target = (store.target && editable.find((m) => m.live.key === store.target)) || defaultTarget(el, cas.matches);
  const [tab, setTab] = useState(() => readLocal(TAB_KEY, "design"));
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();

  const ancestors: Element[] = [];
  for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) ancestors.unshift(p);

  return (
    <>
      <section className="grid gap-1.5 border-b px-3 pt-2.5 pb-3">
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
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate font-mono text-[12.5px] font-medium text-primary" title={label(el)}>{label(el)}</code>
          <Badge variant="outline" className="font-mono">{Math.round(r.width)} × {Math.round(r.height)}</Badge>
          <Tip label="Select the parent">
            <Button size="icon-sm" variant="ghost" aria-label="Parent" disabled={!el.parentElement || el.parentElement === document.documentElement}
              onClick={() => el.parentElement && store.select(el.parentElement)}><ArrowUp /></Button>
          </Tip>
          <Tip label="Select the first child">
            <Button size="icon-sm" variant="ghost" aria-label="First child" disabled={!el.children.length}
              onClick={() => el.children[0] && store.select(el.children[0])}><ArrowDown /></Button>
          </Tip>
        </div>
        <div className="font-mono text-[11px] text-muted-foreground">{cs.fontSize} / {lineHeightRatio(cs)} · {cs.fontWeight} · {cs.display}</div>
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
            <TabsTrigger value="rules">Rules <span className="text-muted-foreground tabular-nums">{cas.matches.length}</span></TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="design">
          <Quick el={el} cs={cs} cas={cas} target={target} editable={editable} inherited={inherited} />
        </TabsContent>
        <TabsContent value="rules" className="grid grid-cols-[minmax(0,1fr)] gap-2 p-3">
          <div className="flex items-center justify-between">
            <SectionTitle>Every rule for this element</SectionTitle>
            <NewRule el={el} cas={cas} />
          </div>
          {cas.matches.length === 0 && <p className="text-muted-foreground">No rule in the project's CSS matches it.</p>}
          {cas.matches.map((m) => <RuleCard key={m.live.key} m={m} cas={cas} isTarget={m === target} />)}
        </TabsContent>
      </Tabs>
    </>
  );
}

const SHORT_LABEL: Record<string, string> = {
  "font-size": "Size", "line-height": "Line", "font-weight": "Weight", "letter-spacing": "Tracking", "max-width": "Max W", width: "Width",
};
const short = (s: string, n = 26) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const px = (v: string) => `${Math.round(parseFloat(v) * 10) / 10 || 0}px`;
function lineHeightRatio(cs: CSSStyleDeclaration) {
  const lh = parseFloat(cs.lineHeight), fs = parseFloat(cs.fontSize);
  return lh && fs ? String(Math.round((lh / fs) * 100) / 100) : cs.lineHeight;
}

function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn("text-[10px] font-semibold tracking-wider text-muted-foreground uppercase", className)}>{children}</h3>;
}
function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-2.5 border-b px-3 py-3 last:border-b-0">
      <div className="flex min-h-5 items-center justify-between gap-2"><SectionTitle>{title}</SectionTitle>{aside}</div>
      {children}
    </section>
  );
}

type QuickProps = {
  el: Element; cs: CSSStyleDeclaration; cas: Cascade; target: Match | null; editable: Match[];
  inherited: Map<string, { el: Element; key: string }>;
};

/** The everyday controls: type, alignment, spacing, written to one chosen rule. */
function Quick({ el, cs, cas, target, editable, inherited }: QuickProps) {
  const key = target?.live.key ?? null;
  const decls = key ? store.declsOf(key) : [];
  const write = (fn: (d: Decl[]) => Decl[]) => key && store.setDecls(key, fn(store.declsOf(key)));
  const rank = (k: string) => (k === "inline" ? -1 : cas.matches.findIndex((m) => m.live.key === k));
  // a declaration in the target will not show if a rule with higher priority sets the same longhand
  const overriddenBy = (longhand: string) => {
    const w = cas.winner.get(longhand);
    if (!w || !key || w === key || rank(w) > rank(key)) return null;
    return w;
  };
  const isBox = /flex|grid/.test(cs.display);

  const field = (prop: string, placeholder: string) => (
    <Field key={prop} label={SHORT_LABEL[prop] ?? prop} prop={prop}
      value={readProp(decls, prop) ?? ""} placeholder={placeholder} disabled={!key}
      onChange={(v) => write((d) => writeProp(d, prop, v))} onClear={() => write((d) => writeProp(d, prop, null))}
      note={<Note prop={prop} over={overriddenBy(prop)} from={readProp(decls, prop) ? null : inherited.get(prop) ?? null} />} />
  );

  if (!target) {
    return (
      <div className="p-3 text-muted-foreground">
        No editable rule targets this element yet. Add one under <b className="text-foreground">Rules → New rule</b>, or select a parent.
      </div>
    );
  }

  return (
    <>
      <Section title="Rule">
        <NativeSelect aria-label="Rule the controls edit" value={key!} onChange={(e) => { store.target = e.target.value; store.emit(); }}>
          {editable.map((m) => (
            <option key={m.live.key} value={m.live.key}>
              {m.live.rule.selectorText}{m.live.conds.length ? `  @${conditionLabel(m.live).replace(/^@media /, "")}` : ""}{m.active ? "" : " (inactive)"}
            </option>
          ))}
        </NativeSelect>
        <RuleMeta m={target} />
      </Section>

      <Section title="Typography">
        <div className="grid grid-cols-2 items-start gap-x-3 gap-y-2">
          {field("font-size", px(cs.fontSize))}
          {field("line-height", lineHeightRatio(cs))}
          {field("font-weight", cs.fontWeight)}
          {field("letter-spacing", cs.letterSpacing === "normal" ? "0em" : cs.letterSpacing)}
        </div>
        <Align declared={readProp(decls, "text-align")} computed={cs.textAlign === "start" ? "left" : cs.textAlign}
          onPick={(v) => write((d) => writeProp(d, "text-align", v))} />
      </Section>

      <Section title="Spacing">
        <BoxModel el={el} cs={cs} decls={decls} write={write} overriddenBy={overriddenBy} />
        {(isBox || readProp(decls, "gap")) && (
          <div className="grid grid-cols-2 gap-x-3">
            <Field label="Gap" prop="gap" value={readProp(decls, "gap") ?? ""} disabled={!key}
              placeholder={cs.rowGap === cs.columnGap ? px(cs.rowGap) : `${px(cs.rowGap)} ${px(cs.columnGap)}`}
              onChange={(v) => write((d) => writeProp(d, "gap", v))} onClear={() => write((d) => writeProp(d, "gap", null))}
              note={<Note prop="gap" over={overriddenBy("row-gap")} from={null} />} />
          </div>
        )}
      </Section>

      {isBox && (
        <Section title={`Layout · ${cs.display}`}>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            <Choice label="Justify" prop="justify-content" decls={decls} write={write} computed={cs.justifyContent}
              options={["normal", "flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly", "stretch"]} />
            <Choice label="Align" prop="align-items" decls={decls} write={write} computed={cs.alignItems}
              options={["normal", "stretch", "flex-start", "center", "flex-end", "baseline"]} />
          </div>
        </Section>
      )}

      <Section title="Size">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          {field("max-width", cs.maxWidth)}
          {field("width", px(cs.width))}
        </div>
      </Section>
    </>
  );
}

function Note({ prop, over, from }: { prop: string; over: string | null; from: { el: Element; key: string } | null }) {
  if (over) {
    const sel = over === "inline" ? "an inline style" : store.sources.get(over)?.selector ?? "another rule";
    return (
      <Tip label={`A stronger rule sets ${prop}, so edits here will not show.${over === "inline" ? "" : " Click to edit that rule instead."}`}>
        <button type="button" className="col-start-2 justify-self-start truncate text-left text-[10.5px] text-warning hover:underline"
          onClick={() => { if (over !== "inline") { store.target = over; store.emit(); } }}>
          overridden by {short(sel, 22)}
        </button>
      </Tip>
    );
  }
  if (from) {
    return (
      <Tip label="Inherited. Click to select the element it comes from.">
        <button type="button" className="col-start-2 justify-self-start truncate text-left text-[10.5px] text-muted-foreground hover:text-foreground hover:underline"
          onClick={() => store.select(from.el)}>
          from {short(store.sources.get(from.key)?.selector ?? label(from.el), 22)}
        </button>
      </Tip>
    );
  }
  return null;
}

function RuleMeta({ m }: { m: Match }) {
  const src = m.live.source;
  const count = useMemo(() => countMatches(m.live.rule.selectorText), [m.live.rule.selectorText]);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {src && (
        <Tip label="Open in your code editor">
          <Button variant="link" size="sm" className="h-5 gap-1 font-mono text-[11px]" onClick={() => openInEditor(src.file, src.line)}>
            <FileCode className="size-3" />{shortFile(src.file)}:{src.line}
          </Button>
        </Tip>
      )}
      {m.live.conds.length > 0 && (
        <Badge variant={m.active ? "secondary" : "warning"} className="font-mono">{conditionLabel(m.live)}{m.active ? "" : " · not at this width"}</Badge>
      )}
      {m.state && <Badge variant="warning" className="font-mono">{m.state}</Badge>}
      <Tip label="Every element this rule styles on the page: hover to outline them">
        <Badge variant="outline" className="cursor-default tabular-nums"
          onMouseEnter={() => { store.highlight = m.live.key; }} onMouseLeave={() => { store.highlight = null; }}>
          {count} element{count === 1 ? "" : "s"}
        </Badge>
      </Tip>
    </div>
  );
}

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

/** A labelled value whose label can be dragged sideways to scrub the number. */
function Field({ label, prop, value, placeholder, onChange, onClear, note, disabled }: {
  label: string; prop: string; value: string; placeholder: string; onChange: (v: string) => void; onClear: () => void;
  note?: ReactNode; disabled?: boolean;
}) {
  const drag = useRef<{ x: number; base: string } | null>(null);
  return (
    <div className="grid grid-cols-[52px_minmax(0,1fr)] items-start gap-x-2 gap-y-0.5">
      <span
        className="cursor-ew-resize truncate leading-7 text-muted-foreground select-none hover:text-primary" style={{ touchAction: "none" }}
        title={`${prop}: drag sideways to change (Shift ×10, Alt ×0.1)`}
        onPointerDown={(e) => {
          if (disabled) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, base: value || placeholder };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const steps = Math.round((e.clientX - d.x) / 3) * (e.shiftKey ? 10 : e.altKey ? 0.1 : 1);
          const r = steps ? nudge(d.base, 0, steps, prop) : null;
          if (r) onChange(r.value);
        }}
        onPointerUp={() => { drag.current = null; }}
      >
        {label}
      </span>
      <ValueInput prop={prop} value={value} placeholder={placeholder} onChange={onChange} onClear={onClear} disabled={disabled} />
      {note}
    </div>
  );
}

const ALIGN_ICONS: Record<string, typeof AlignLeft> = { left: AlignLeft, center: AlignCenter, right: AlignRight, justify: AlignJustify };

function Align({ declared, computed, onPick }: { declared: string | null; computed: string; onPick: (v: string | null) => void }) {
  return (
    <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-x-2">
      <span className="text-muted-foreground">Align</span>
      <ToggleGroup type="single" aria-label="text-align" value={declared ?? ""} onValueChange={(v) => onPick(v || null)}>
        {Object.entries(ALIGN_ICONS).map(([o, Icon]) => (
          <Tip key={o} label={declared === o ? `Remove text-align: ${o} from this rule` : `text-align: ${o}${!declared && computed === o ? " (current)" : ""}`}>
            <ToggleGroupItem value={o} aria-label={o} data-soft={!declared && computed === o}><Icon /></ToggleGroupItem>
          </Tip>
        ))}
      </ToggleGroup>
    </div>
  );
}

function Choice({ label, prop, decls, write, computed, options }: {
  label: string; prop: string; decls: Decl[]; write: (fn: (d: Decl[]) => Decl[]) => void; computed: string; options: string[];
}) {
  const declared = readProp(decls, prop);
  return (
    <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-x-2">
      <span className="text-muted-foreground">{label}</span>
      <NativeSelect aria-label={prop} value={declared ?? ""} className={declared ? "" : "text-muted-foreground"}
        onChange={(e) => write((d) => writeProp(d, prop, e.target.value || null))}>
        <option value="">{computed}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </NativeSelect>
    </div>
  );
}

// ---------- every matching rule, editable as written

function RuleCard({ m, cas, isTarget }: { m: Match; cas: Cascade; isTarget: boolean }) {
  const key = m.live.key;
  const src = m.live.source;
  const decls = store.declsOf(key);
  const [prop, setProp] = useState("");
  const [val, setVal] = useState("");
  const changed = store.edits.has(key);
  const set = (fn: (d: Decl[]) => Decl[]) => store.setDecls(key, fn(store.declsOf(key)));

  return (
    <div className={cn("grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 rounded-lg border bg-card p-2.5", isTarget && "border-primary/60 ring-1 ring-primary/30", (!m.active || m.state) && "opacity-75")}>
      <div className="flex items-start gap-2">
        <code className="min-w-0 flex-1 font-mono text-[11.5px] break-words text-code" title={m.live.rule.selectorText}>{m.live.rule.selectorText}</code>
        {changed && (
          <Tip label="Undo the changes to this rule">
            <Button size="icon-sm" variant="ghost" aria-label="Revert" className="size-5" onClick={() => store.revert(key)}><Undo2 /></Button>
          </Tip>
        )}
        {src && !isTarget && !m.state && (
          <Button size="sm" variant="ghost" className="h-5 px-1.5" onClick={() => { store.target = key; store.emit(); }}>Edit in Design</Button>
        )}
      </div>
      <RuleMeta m={m} />
      {!src ? (
        <p className="text-[11px] text-muted-foreground">Generated (e.g. by Tailwind), not written in a source file, so read-only: <code className="font-mono break-all">{m.live.rule.style.cssText}</code></p>
      ) : (
        <div className="grid gap-1">
          {decls.map((d, i) => {
            const applied = cas.applied.has(`${key}#${i}`) || !!m.state || !m.active;
            return (
              <div key={`${d.prop}-${i}`} className="group grid grid-cols-[104px_minmax(0,1fr)_20px] items-center gap-1.5" title={applied ? undefined : "Overridden by a stronger rule"}>
                <span className={cn("truncate font-mono text-[11px] text-prop", !applied && "text-muted-foreground line-through")}>{d.prop}</span>
                <ValueInput prop={d.prop} value={d.value + (d.important ? " !important" : "")} className={cn("h-6", !applied && "line-through")}
                  onChange={(v) => set((ds) => ds.map((x, j) => (j === i ? parseDecl(d.prop, v) : x)))}
                  onClear={() => set((ds) => ds.filter((_, j) => j !== i))} />
                <Button size="icon-sm" variant="ghost" aria-label={`Remove ${d.prop}`} className="size-5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  onClick={() => set((ds) => ds.filter((_, j) => j !== i))}><X /></Button>
              </div>
            );
          })}
          <form className="grid grid-cols-[104px_minmax(0,1fr)_20px] items-center gap-1.5" onSubmit={(e) => {
            e.preventDefault();
            if (!prop.trim() || !val.trim()) return;
            set((ds) => writeProp(ds, prop.trim(), val.trim()));
            setProp("");
            setVal("");
          }}>
            <Input className="h-6" list="domeditor-props" placeholder="+ property" value={prop} onChange={(e) => setProp(e.target.value)} aria-label="New property" />
            <Input className="h-6" placeholder="value" value={val} onChange={(e) => setVal(e.target.value)} aria-label="New value" />
            <Button type="submit" size="icon-sm" variant="ghost" aria-label="Add" className="size-5"><CornerDownLeft /></Button>
          </form>
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
      <Button size="sm" variant="ghost" onClick={() => {
        setSel(suggestSelector(el));
        // the page's own stylesheet rather than a global one, where there is one
        const own = cas.matches.find((m) => m.live.source && !/(^|\/)(globals?|index|styles?|main|app)\.css$/.test(m.live.ref.file));
        setFile(own?.live.ref.file ?? cas.matches.find((m) => m.live.source)?.live.ref.file ?? store.files[0] ?? "");
        setOpen(true);
      }}><Plus /> New rule</Button>
    );
  }
  return (
    <form className="col-span-full grid w-full gap-1.5 rounded-lg border bg-card p-2.5" onSubmit={async (e) => {
      e.preventDefault();
      await store.createRule(file, sel);
      setOpen(false);
    }}>
      <Input value={sel} onChange={(e) => setSel(e.target.value)} aria-label="Selector" autoFocus />
      <NativeSelect value={file} onChange={(e) => setFile(e.target.value)} aria-label="File">
        {store.files.map((f) => <option key={f} value={f}>{f}</option>)}
      </NativeSelect>
      <div className="flex justify-end gap-1.5">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        <Button size="sm" type="submit">Add rule</Button>
      </div>
    </form>
  );
}

// ---------- unsaved changes

function Footer() {
  const [saving, setSaving] = useState(false);
  const n = store.edits.size;
  const files = [...new Set([...store.edits.keys()].map((k) => store.sources.get(k)?.file).filter(Boolean))] as string[];
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
            {n} rule{n === 1 ? "" : "s"} changed in {files.map(shortFile).join(", ")}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1.5 grid gap-1 pl-4">
            {[...store.edits.keys()].map((k) => (
              <div key={k} className="flex items-center justify-between gap-2">
                <code className="truncate font-mono text-[11px] text-code">{store.sources.get(k)?.selector}</code>
                <Button size="sm" variant="ghost" className="h-5 px-1.5" onClick={() => store.revert(k)}><Undo2 className="size-3" /> Revert</Button>
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
