# domeditor

A development-only visual editor. Point at anything on the page, adjust type, spacing and layout, or change
its words, with live preview, and **save the change into the file it came from**: styles into the `.css`
rule, text into the component it is written in. Your files keep their formatting, so the result is an
ordinary `git diff`.

Works with **Next.js** (App Router, Turbopack or webpack) and **Vite**. It never ships: there is nothing
of it in a production build.

- **Pick** an element, or <kbd>Alt</kbd>+click anything. The page shows its margin, padding and the gaps between its children.
- **Design** tab:
  - **Text**: the element's words. Edit them in place; Save writes the new copy into the component where it
    is written (a JSX text or a `"string"`). Text that comes from data (a product name, a shop name) is
    marked as such; text written in more than one place asks which one you mean.
  - Text a script splits up (a sentence turned into a `<span>` per word or letter for an animation, as GSAP
    SplitText or a `Words` component does) is found as the string(s) it came from and edited whole, even
    when you select a single word; the preview spreads the new words over the pieces.
  - **Typography**: size with −/+, a slider and common sizes (a responsive `clamp()` size is shown as
    *smallest* and *largest*), weight by name (Regular 400, Semibold 600…), line height with presets,
    letter spacing, text colour, alignment.
  - **Spacing** (a box model for margin and padding, and gaps), **layout** (flex/grid alignment) and **size**.
  - Type values, use −/+, or <kbd>↑</kbd>/<kbd>↓</kbd> on any number (<kbd>Shift</kbd> ×10, <kbd>Alt</kbd> ×0.1).
    Shorthands are edited in place (`padding: 18px 20px` stays one line; `font: 650 clamp(…)/1.04 …` keeps its shape).
- **Copy style** (the copy icon next to the element's name) takes the selected element's look: what you see,
  including unsaved edits and inherited text styles. Select another element and a **Paste the look of…**
  card shows only what differs, grouped (Typography, Colour, Border & corners, Padding & gap, Layout, and,
  off by default because they depend on where an element sits, Size and Margin). Paste writes into the
  style chosen under *Changes apply to*, using the source's own values where it has them (`var(--token)`,
  `rem`, `clamp()`), as shorthands where every side matches. What a stronger style keeps is reported. The
  look is also put on the system clipboard as CSS.
- **When** (under *Changes apply to*): make edits apply only in **dark mode** or **light mode**, and/or only
  at a **screen size** (the project's own breakpoints that apply at the window's current width: "Up to 640px",
  "720px and up"). The edits go into a scoped copy of the style, written the way the project already writes
  dark mode: in a `prefers-color-scheme` media query (with its selector prefix, e.g.
  `:root:not([data-theme=light])`), with its theme attribute or class (`[data-theme=dark] .x`, `.dark .x`), or
  both when the project switches dark mode by the system setting *and* a theme switch. A scoped style that
  already exists is edited; otherwise it is previewed and created on Save. The panel's header shows the scope,
  and warns when the page is not showing it (light mode, another width).
- **All styles** tab: every style that applies to the element, grouped as *on this element*, *other screen
  sizes* ("Screens up to 640px wide"), *hover, focus and other states*, and collapsed *base styles*
  (page-wide defaults, framework styles). Properties have plain names, colours show a swatch, and a value a
  stronger style beats is marked *overridden*.
- **Save** (<kbd>Ctrl/⌘</kbd>+<kbd>S</kbd>) writes the changes. The dev server reloads the CSS.
- <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>E</kbd> opens and closes the panel.

## Install

```bash
npm i -D github:mandelatrey/domeditor
```

React 18 or 19 is the only requirement; everything else the panel uses is bundled.

npm 12 and later refuse git dependencies unless a project allows them. If `npm i` stops with `EALLOWGIT`,
add `--allow-git=root` (allows only git dependencies listed in your own `package.json`), or put
`allow-git=root` in the project's `.npmrc` so every install, including CI, gets it.

### Vite

```ts
// vite.config.ts
import react from "@vitejs/plugin-react";
import domeditor from "domeditor/vite";

export default defineConfig({
  plugins: [react(), domeditor()],
});
```

That is all: the plugin serves the editor's endpoint and adds the panel to `index.html` under `vite`
(`apply: "serve"`), and does nothing in `vite build`.

### Next.js (App Router)

1. Wrap the config. Under `next dev`, files named `*.dev.ts` become routes too, so the editor's route
   exists only in development:

   ```ts
   // next.config.ts
   import { withDomEditor } from "domeditor/next/config";

   export default withDomEditor({ /* your config */ });
   ```

2. Add the route that reads and writes the CSS files:

   ```ts
   // app/api/dev/domeditor/route.dev.ts
   export { GET, POST } from "domeditor/next/route";

   export const dynamic = "force-dynamic";
   ```

3. Render the panel from the root layout:

   ```tsx
   // app/layout.tsx
   import { DomEditor } from "domeditor/next";

   // inside <body>
   {process.env.NODE_ENV === "development" && <DomEditor />}
   ```

   In `next build`, `NODE_ENV` is `"production"`, so the panel's code is dropped from the bundle.

### Options

| Option | Where | Default | |
|---|---|---|---|
| `theme` | `domeditor({ theme })`, `<DomEditor theme />` | `"auto"` | `"auto"` follows the page: its own light/dark switch (`data-theme`, a `dark`/`light` class), else its background, else the system. Or `"dark"`, `"light"`, `"system"`. |
| `include` | `domeditor({ include })`, `createHandler({ include })` | the whole project | folders (relative to the root) to look for `.css` in |
| `exclude` | same | | folder names to skip, on top of `node_modules`, `.next`, `dist`, `build`, `out`, `public`... |
| `endpoint` | `domeditor({ endpoint })`, `<DomEditor endpoint />` | `/__domeditor` (Vite), `/api/dev/domeditor` (Next) | |

For another server, `createHandler(options)` from `domeditor/server` is a `(Request) => Promise<Response>`
handler, and `mountDomEditor({ endpoint })` from `domeditor/client` adds the panel to a page.

## What it edits

**Text** written in your components and pages (`.tsx`, `.jsx`, `.ts`, `.js`, `.html`, `.md`, `.mdx`, `.vue`,
`.svelte`, `.astro`): a run of JSX text between tags, or a whole string. Text with `{ } < >` in it is left to
the code.

**Styles** in plain `.css` files in your project: global stylesheets, per-route CSS, CSS imported from components. It finds
each rule the browser has in its source file:

- **Vite** names each stylesheet by its file.
- **Next (Turbopack)** serves CSS in chunks that mark where each file starts. Next compiles CSS with Lightning
  CSS, which merges adjacent rules with identical declarations, splits selector lists, and adds `@supports`
  fallbacks; the editor lines the compiled rules up with the source in order, and puts merged rules back as
  separate rules in the page so each can be previewed on its own.
- With `next dev --webpack` there is no file information; rules are matched by selector, and fewer are found.
- **Container queries** (`@container shop (min-width: 720px)`) are found too, even though Lightning CSS rewrites
  them as `(width >= 720px)`: conditions are compared in one spelling. A container rule counts as applying when
  the element's container is that size right now (the panel measures it), so *All styles* lists it with the
  rules that apply, in plain words ("When the “shop” container is 720px and wider"), and marks what it overrides.

Not editable (shown read-only): rules generated by Tailwind (utilities, preflight), CSS Modules, CSS-in-JS,
and inline `style={{...}}` (flagged, since it beats the CSS: change it in the component).

### Safety

- The endpoint only runs when `NODE_ENV` is `"development"`, only answers requests from the page itself (a
  custom header forces a CORS preflight on other sites), and only writes `.css` files and source files of the
  types above that it found in the project (never `node_modules`, build output or dot-folders).
- An edit is refused if the rule changed on disk since the panel read it (reload and try again). If any edit in
  a save is refused, no file is written.

### Notes

- Safari can keep an old copy of a stylesheet when the dev server swaps in a new one at the same URL
  (WebKit bug 187726), which makes a saved edit look undone. After each save the panel compares the page's
  CSS with the server's and re-loads any stale sheet.
- The panel lives in a shadow root with its own styles (shadcn/ui components, compiled with Tailwind), so the
  page's CSS cannot change it and its CSS cannot change the page.

## Developing domeditor

```bash
npm install
npm test          # unit tests (rule matching, editing, the file handler)
npm run typecheck
npm run build     # compiles the panel's CSS, then builds dist/
```

`dist/` is committed so that `npm i github:mandelatrey/domeditor` works without a build step: run
`npm run build` before committing a change. To try a change in a project, `npm pack` here and
`npm i -D /path/to/domeditor-x.y.z.tgz` there.

| Folder | |
|---|---|
| `src/core` | `shared.ts`: pure helpers (selectors, specificity, shorthands, lining up compiled CSS with the source). `server.ts`: reading rules with PostCSS and writing edits back. |
| `src/client` | the browser side: `model.ts` (finding rules, the cascade, unsaved edits), `Panel.tsx` (the UI), `ui/` (shadcn components), `styles.css` (the panel's Tailwind theme). |
| `src/vite`, `src/next` | the framework adapters. |
