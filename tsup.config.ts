import { defineConfig } from "tsup";

// React stays external (the host app's copy); radix-ui, lucide-react and friends are bundled into the
// client so a project installs nothing but domeditor itself. process.env.NODE_ENV is left as written
// so the host's build can drop the editor from production bundles.
const shared = {
  format: "esm" as const,
  target: "es2022",
  dts: true,
  sourcemap: false,
  external: ["react", "react-dom", "vite", "postcss", "domeditor/client"],
};

export default defineConfig([
  {
    ...shared,
    entry: {
      "client/index": "src/client/index.tsx",
      "core/server": "src/core/server.ts",
      "core/shared": "src/core/shared.ts",
      "vite/index": "src/vite/index.ts",
      "next/route": "src/next/route.ts",
      "next/config": "src/next/config.ts",
    },
    splitting: true,
    noExternal: [/^radix-ui/, /^@radix-ui\//, "lucide-react", "class-variance-authority", "clsx", "tailwind-merge"],
  },
  {
    ...shared,
    // a client component: Next needs the directive at the top of the file
    entry: { "next/index": "src/next/index.tsx" },
    banner: { js: '"use client";' },
  },
]);
