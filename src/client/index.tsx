// domeditor's browser entry: mountDomEditor() adds the panel to the page, inside a shadow root so the
// page's CSS and the panel's never meet. The framework adapters call it; call it yourself elsewhere.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { store } from "./model";
import { Panel, setHost } from "./Panel";
import { PortalContainer } from "./ui/portal";
import { TooltipProvider } from "./ui/tooltip";
import css from "./styles.generated";

export type MountOptions = {
  /** The dev-server endpoint (domeditor/vite serves /__domeditor; the Next route /api/dev/domeditor). */
  endpoint?: string;
  /** Panel colours. Default: "dark". */
  theme?: "dark" | "light" | "system";
};

let mounted = false;

export function mountDomEditor(options: MountOptions = {}) {
  if (mounted || typeof document === "undefined") return;
  mounted = true;
  if (options.endpoint) store.endpoint = options.endpoint;

  const host = document.createElement("domeditor-root");
  const shadow = host.attachShadow({ mode: "open" });
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  shadow.adoptedStyleSheets = [sheet];
  const root = document.createElement("div");
  shadow.appendChild(root);
  setHost(host);

  const theme = options.theme ?? "dark";
  const applyTheme = () => {
    const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    root.className = `domeditor${dark ? " dark" : ""}`;
  };
  applyTheme();
  if (theme === "system") matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);

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
