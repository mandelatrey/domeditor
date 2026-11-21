import { describe, expect, it } from "vitest";
import { cleanScheme, editorLabel, editorUrl } from "../src/client/editor";

describe("domeditor: opening files in your editor", () => {
  it("builds each editor's link to a file and line", () => {
    const f = "/Users/m/Desktop/REPOS/HALI/app/page.tsx";
    expect(editorUrl("kiro", f, 265)).toBe("kiro://file/Users/m/Desktop/REPOS/HALI/app/page.tsx:265:1");
    expect(editorUrl("vscode", f, 1)).toBe("vscode://file/Users/m/Desktop/REPOS/HALI/app/page.tsx:1:1");
    expect(editorUrl("cursor", f, 9)).toBe("cursor://file/Users/m/Desktop/REPOS/HALI/app/page.tsx:9:1");
    expect(editorUrl("zed", f, 9)).toBe("zed://file/Users/m/Desktop/REPOS/HALI/app/page.tsx:9");
    expect(editorUrl("scheme:trae", f, 3)).toBe("trae://file/Users/m/Desktop/REPOS/HALI/app/page.tsx:3:1");
    // Windows drive paths and spaces / brackets in folder names
    expect(editorUrl("vscode", "C:/Users/m/my app/app/(buyer)/x.css", 2)).toBe("vscode://file/C:/Users/m/my%20app/app/(buyer)/x.css:2:1");
    expect(editorUrl("server", f, 1)).toBe(null);
  });
  it("reads a typed link name", () => {
    expect(cleanScheme("Trae")).toBe("trae");
    expect(cleanScheme("trae://")).toBe("trae");
    expect(cleanScheme("not a scheme")).toBe(null);
    expect(editorLabel("kiro")).toBe("Kiro");
    expect(editorLabel("scheme:trae")).toBe("trae");
    expect(editorLabel(null)).toBe("your code editor");
  });
});
