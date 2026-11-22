// How text the page shows may be written in source. Pure: shared by the dev server and core/classes.ts.

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// how a character the page shows may be written in source: JSX entities, escapes, line wrapping
const SPELLINGS: Record<string, string> = {
  "'": "(?:'|&apos;|&#39;|&rsquo;|\\\\')",
  "’": "(?:’|&rsquo;|')",
  '"': '(?:"|&quot;|&#34;|\\\\")',
  "&": "(?:&|&amp;)",
  "\u00a0": "(?:\u00a0|&nbsp;|&#160;|\\s)",
};

/** A pattern for text as the page shows it, matching the ways it is commonly written in source. */
export function textPattern(text: string): RegExp | null {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return null;
  let src = "";
  for (const ch of t) src += ch === " " ? "\\s+" : SPELLINGS[ch] ?? escapeRe(ch);
  return new RegExp(src, "g");
}
