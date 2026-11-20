// domeditor for Next.js: `export default withDomEditor(nextConfig)` in next.config.ts.
// Under `next dev`, files named `*.dev.ts(x)` also count as routes, so the editor's route
// (app/api/dev/domeditor/route.dev.ts) exists only in development and never in `next build`.

type Config = { pageExtensions?: string[]; [key: string]: unknown };

export function withDomEditor<T extends Config>(config: T): T {
  const base = config.pageExtensions ?? ["tsx", "ts", "jsx", "js"];
  if (process.env.NODE_ENV !== "development") return { ...config, pageExtensions: base };
  return { ...config, pageExtensions: [...base.map((e) => `dev.${e}`), ...base] };
}

export default withDomEditor;
