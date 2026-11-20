// domeditor for Vite: `plugins: [react(), domeditor()]` in vite.config. Only active under `vite`
// (apply: "serve"): it serves the file endpoint and adds the panel to index.html. Never in a build.
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { createHandler, type HandlerOptions } from "../core/server";

export type DomEditorViteOptions = Omit<HandlerOptions, "root"> & {
  /** Where the endpoint is served. Default: /__domeditor */
  endpoint?: string;
  /** Panel colours. "auto" (the default) follows the page's light/dark setting. */
  theme?: "auto" | "dark" | "light" | "system";
};

const DEFAULT_ENDPOINT = "/__domeditor";
// the panel's entry, served by Vite like any module so its imports resolve
const ENTRY_URL = "/@domeditor/entry.js";
const ENTRY_ID = "\0domeditor-entry";

/** Node's request as a web Request, for the shared handler. */
async function toRequest(req: IncomingMessage): Promise<Request> {
  const host = req.headers.host ?? "localhost";
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string") headers.set(k, v);
    else if (Array.isArray(v)) headers.set(k, v.join(", "));
  }
  let body: string | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 1_000_001) break; // the handler refuses it as too large
    }
  }
  return new Request(new URL(req.originalUrl ?? req.url ?? "/", `http://${host}`), { method: req.method, headers, body });
}

async function send(res: ServerResponse, r: Response) {
  res.statusCode = r.status;
  r.headers.forEach((v, k) => res.setHeader(k, v));
  res.end(await r.text());
}

declare module "node:http" {
  interface IncomingMessage {
    originalUrl?: string;
  }
}

export default function domeditor(options: DomEditorViteOptions = {}): Plugin {
  const endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
  let root = process.cwd();
  return {
    name: "domeditor",
    apply: "serve",
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      const handle = createHandler({ ...options, root });
      server.middlewares.use(endpoint, async (req, res) => {
        try {
          await send(res, await handle(await toRequest(req)));
        } catch (err) {
          res.statusCode = 500;
          res.end(String(err));
        }
      });
    },
    resolveId(id) {
      return id === ENTRY_URL ? ENTRY_ID : null;
    },
    load(id) {
      if (id !== ENTRY_ID) return null;
      return `import { mountDomEditor } from "domeditor/client";\nmountDomEditor(${JSON.stringify({ endpoint, theme: options.theme })});\n`;
    },
    transformIndexHtml() {
      return [{ tag: "script", attrs: { type: "module", src: ENTRY_URL }, injectTo: "body" }];
    },
  };
}

export { domeditor };
