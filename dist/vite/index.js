import {
  createHandler
} from "../chunk-N7HVWC2T.js";
import "../chunk-CLNWSQP6.js";
import "../chunk-MLKGABMK.js";

// src/vite/index.ts
var DEFAULT_ENDPOINT = "/__domeditor";
var ENTRY_URL = "/@domeditor/entry.js";
var ENTRY_ID = "\0domeditor-entry";
async function toRequest(req) {
  const host = req.headers.host ?? "localhost";
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string") headers.set(k, v);
    else if (Array.isArray(v)) headers.set(k, v.join(", "));
  }
  let body;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 1000001) break;
    }
  }
  return new Request(new URL(req.originalUrl ?? req.url ?? "/", `http://${host}`), { method: req.method, headers, body });
}
async function send(res, r) {
  res.statusCode = r.status;
  r.headers.forEach((v, k) => res.setHeader(k, v));
  res.end(await r.text());
}
function domeditor(options = {}) {
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
      return `import { mountDomEditor } from "domeditor/client";
mountDomEditor(${JSON.stringify({ endpoint, theme: options.theme })});
`;
    },
    transformIndexHtml() {
      return [{ tag: "script", attrs: { type: "module", src: ENTRY_URL }, injectTo: "body" }];
    }
  };
}
export {
  domeditor as default,
  domeditor
};
