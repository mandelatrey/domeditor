// domeditor for Next.js (App Router): render <DomEditor /> in the root layout. It mounts the panel
// only when NODE_ENV is "development"; in `next build` the import below is dropped, so it never ships.
import { useEffect } from "react";

export type DomEditorProps = {
  /** Where the route is served. Default: /api/dev/domeditor (app/api/dev/domeditor/route.dev.ts) */
  endpoint?: string;
  /** Panel colours. "auto" (the default) follows the page's light/dark setting. */
  theme?: "auto" | "dark" | "light" | "system";
};

export function DomEditor({ endpoint = "/api/dev/domeditor", theme }: DomEditorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      void import("domeditor/client").then((m) => m.mountDomEditor({ endpoint, theme }));
    }
  }, [endpoint, theme]);
  return null;
}

export default DomEditor;
