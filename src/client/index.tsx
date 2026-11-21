// domeditor's browser entry: mountDomEditor() adds the panel to the page, inside a shadow root so the
// page's CSS and the panel's never meet. The framework adapters call it; call it yourself elsewhere.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { toRgba } from "./color";
import { store } from "./model";
import { Panel, setHost } from "./Panel";
import { PortalContainer } from "./ui/portal";
import { TooltipProvider } from "./ui/tooltip";
import css from "./styles.generated";

export type MountOptions = {
  /** The dev-server endpoint (domeditor/vite serves /__domeditor; the Next route /api/dev/domeditor). */
  endpoint?: string;
  /** Panel colours. "auto" (the default) follows the page: its light/dark switch, or else the system setting. */
  theme?: Theme;
};

export type Theme = "auto" | "dark" | "light" | "system";

let mounted = false;

export function mountDomEditor(options: MountOptions = {}) {
  if (mounted || typeof document === "undefined") return;
  mounted = true;
  if (options.endpoint) store.endpoint = options.endpoint;

  const host = document.createElement("domeditor-root");
  // Scrolling inside the panel scrolls the panel, not the page. Smooth-scroll libraries (Lenis,
  // Locomotive, GSAP ScrollSmoother...) listen for the wheel on the window and scroll the page
  // themselves; Lenis skips elements marked data-lenis-prevent, and for the others the events stop
  // here, before they reach the window. The panel's own (native) scrolling is unaffected.
  host.setAttribute("data-lenis-prevent", "");
  for (const type of ["wheel", "touchstart", "touchmove"]) host.addEventListener(type, (e) => e.stopPropagation(), { passive: true });
  const shadow = host.attachShadow({ mode: "open" });
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  shadow.adoptedStyleSheets = [sheet];
  const root = document.createElement("div");
  shadow.appendChild(root);
  setHost(host);

  const theme = options.theme ?? "auto";
  const applyTheme = () => {
    const dark = theme === "dark" || (theme === "system" && systemDark()) || (theme === "auto" && pageIsDark());
    root.className = `domeditor${dark ? " dark" : ""}`;
  };
  applyTheme();
  if (theme === "system" || theme === "auto") matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => setTimeout(applyTheme, 50));
  if (theme === "auto") {
    // the page's theme switch: an attribute or class on <html>/<body>; background colours may fade, so look twice
    let timers: number[] = [];
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
    <StrictMode>
      <PortalContainer.Provider value={root}>
        <TooltipProvider>
          <Panel />
        </TooltipProvider>
      </PortalContainer.Provider>
    </StrictMode>,
  );
  void store.load();
  watchStylesheets();
}

/** The dev server added, swapped or dropped a stylesheet (our save, an edit in your code editor, a
 *  route with its own CSS): read the rules again once the new sheet has loaded. Next swaps <link>s;
 *  Vite rewrites the text of its <style>s. */
function watchStylesheets() {
  let timer = 0;
  const reload = () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => void store.load(), 120);
  };
  const isSheet = (n: Node | null): boolean =>
    n instanceof HTMLLinkElement ? n.rel === "stylesheet" : n instanceof HTMLStyleElement;
  new MutationObserver((records) => {
    let changed = false;
    for (const r of records) {
      if (r.type === "characterData" || (r.type === "childList" && isSheet(r.target))) {
        if (isSheet(r.target.parentNode) || isSheet(r.target)) changed = true;
        continue;
      }
      for (const n of r.addedNodes) {
        if (!isSheet(n)) continue;
        changed = true;
        if (n instanceof HTMLLinkElement && !n.sheet) n.addEventListener("load", reload, { once: true });
      }
      for (const n of r.removedNodes) if (isSheet(n)) changed = true;
    }
    if (changed) reload();
  }).observe(document.head, { childList: true, subtree: true, characterData: true });
}

const systemDark = () => matchMedia("(prefers-color-scheme: dark)").matches;

/** Whether the page is showing its dark theme: an explicit data-theme / class on <html> or <body>,
 *  else how dark its background is, else the system setting. */
function pageIsDark(): boolean {
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
