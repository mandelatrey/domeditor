// Opening a file at a line in the developer's own code editor. Most editors register a link scheme
// (`vscode://file/<path>:<line>:<col>`, and the same shape for VS Code's forks: Kiro, Cursor,
// Windsurf…), so the page opens them directly. Which one is asked once and remembered in this browser.
// "server" keeps the dev server's own launcher (Next's /__nextjs_launch-editor, Vite's
// /__open-in-editor), which picks an editor from $EDITOR or what is running.

export type EditorChoice = string; // an EDITORS id, "server", or "scheme:<name>" for any other editor

export const EDITORS: { id: string; label: string; scheme: string }[] = [
  { id: "kiro", label: "Kiro", scheme: "kiro" },
  { id: "vscode", label: "VS Code", scheme: "vscode" },
  { id: "cursor", label: "Cursor", scheme: "cursor" },
  { id: "windsurf", label: "Windsurf", scheme: "windsurf" },
  { id: "vscodium", label: "VSCodium", scheme: "vscodium" },
  { id: "zed", label: "Zed", scheme: "zed" },
];

const KEY = "domeditor:editor";

export function getEditor(): EditorChoice | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setEditor(choice: EditorChoice | null) {
  try {
    if (choice) localStorage.setItem(KEY, choice);
    else localStorage.removeItem(KEY);
  } catch {
    /* private mode: asked again next time */
  }
}

export function editorLabel(choice: EditorChoice | null): string {
  if (!choice) return "your code editor";
  if (choice === "server") return "the editor the dev server picks";
  if (choice.startsWith("scheme:")) return choice.slice(7);
  return EDITORS.find((e) => e.id === choice)?.label ?? choice;
}

/** A link scheme name as typed ("Trae", "trae://") -> "trae", or null if it can't be one. */
export function cleanScheme(input: string): string | null {
  const s = input.trim().toLowerCase().replace(/:\/*$/, "");
  return /^[a-z][a-z0-9+.-]*$/.test(s) ? s : null;
}

/** The link that opens `absPath` at `line` in the chosen editor (null for "server"). */
export function editorUrl(choice: EditorChoice, absPath: string, line: number): string | null {
  const scheme = choice.startsWith("scheme:") ? choice.slice(7) : EDITORS.find((e) => e.id === choice)?.scheme;
  if (!scheme) return null;
  const path = encodeURI(absPath.startsWith("/") ? absPath : `/${absPath}`); // Windows "C:/x" -> "/C:/x"
  return scheme === "zed" ? `zed://file${path}:${line}` : `${scheme}://file${path}:${line}:1`;
}
