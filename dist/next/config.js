import "../chunk-MLKGABMK.js";

// src/next/config.ts
function withDomEditor(config) {
  const base = config.pageExtensions ?? ["tsx", "ts", "jsx", "js"];
  if (process.env.NODE_ENV !== "development") return { ...config, pageExtensions: base };
  return { ...config, pageExtensions: [...base.map((e) => `dev.${e}`), ...base] };
}
var config_default = withDomEditor;
export {
  config_default as default,
  withDomEditor
};
