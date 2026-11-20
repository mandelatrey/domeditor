"use client";

// src/next/index.tsx
import { useEffect } from "react";
function DomEditor({ endpoint = "/api/dev/domeditor", theme }) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      void import("domeditor/client").then((m) => m.mountDomEditor({ endpoint, theme }));
    }
  }, [endpoint, theme]);
  return null;
}
var next_default = DomEditor;
export {
  DomEditor,
  next_default as default
};
