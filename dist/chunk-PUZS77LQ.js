// src/core/text.ts
var escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
var SPELLINGS = {
  "'": "(?:'|&apos;|&#39;|&rsquo;|\\\\')",
  "\u2019": "(?:\u2019|&rsquo;|')",
  '"': '(?:"|&quot;|&#34;|\\\\")',
  "&": "(?:&|&amp;)",
  "\xA0": "(?:\xA0|&nbsp;|&#160;|\\s)"
};
function textPattern(text) {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return null;
  let src = "";
  for (const ch of t) src += ch === " " ? "\\s+" : SPELLINGS[ch] ?? escapeRe(ch);
  return new RegExp(src, "g");
}

// src/core/classes.ts
var isClassName = (s) => /^-?[_a-zA-Z][\w-]*$/.test(s);
var hasClassToken = (selector, cls) => new RegExp(`\\.${cls.replace(/[-\\]/g, "\\$&")}(?![\\w-])`).test(selector);
var renameClassToken = (selector, from, to) => selector.replace(new RegExp(`\\.${from.replace(/[-\\]/g, "\\$&")}(?![\\w-])`, "g"), `.${to}`);
function narrowSelector(part, cls) {
  const s = part.trim();
  let depth = 0, start = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (depth === 0 && /[\s>+~]/.test(ch)) start = i + 1;
  }
  const last = s.slice(start);
  depth = 0;
  for (let i = 0; i < last.length; i++) {
    const ch = last[i];
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (depth === 0 && ch === ":" && (last[i + 1] === ":" || /^:(before|after|first-line|first-letter)\b/i.test(last.slice(i)))) {
      return s.slice(0, start) + last.slice(0, i) + `.${cls}` + last.slice(i);
    }
  }
  return `${s}.${cls}`;
}
var MAX_TAG = 6e3;
function tagEnd(src, at, nameEnd) {
  let depth = 0;
  let quote = null;
  const attrs = [];
  let runStart = nameEnd;
  const limit = Math.min(src.length, at + MAX_TAG);
  for (let i = nameEnd; i < limit; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{") {
      if (depth === 0) attrs.push([runStart, i]);
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) runStart = i + 1;
      if (depth < 0) return null;
    } else if (depth === 0 && ch === ">") {
      attrs.push([runStart, i]);
      return { end: i + 1, self: src[i - 1] === "/", attrs };
    } else if (depth === 0 && ch === "<") return null;
  }
  return null;
}
function classValue(src, from, to) {
  const re = /(?<![\w-])(?:className|class)\s*=\s*/g;
  re.lastIndex = from;
  for (let m = re.exec(src); m && m.index < to; m = re.exec(src)) {
    let i = m.index + m[0].length;
    let braced = false;
    if (src[i] === "{") {
      braced = true;
      i++;
      while (/\s/.test(src[i] ?? "")) i++;
    }
    const q = src[i];
    if (q !== '"' && q !== "'" && !(braced && q === "`")) continue;
    const valueStart = i + 1;
    let j = valueStart;
    let tdepth = 0;
    for (; j < src.length && j - valueStart < 2e3; j++) {
      const ch = src[j];
      if (ch === "\\") {
        j++;
        continue;
      }
      if (q === "`" && ch === "$" && src[j + 1] === "{") {
        tdepth++;
        j++;
        continue;
      }
      if (tdepth > 0) {
        if (ch === "{") tdepth++;
        else if (ch === "}") tdepth--;
        continue;
      }
      if (ch === q) break;
      if (ch === "\n" && q !== "`") return null;
    }
    if (src[j] !== q) return null;
    if (braced) {
      let k = j + 1;
      while (/\s/.test(src[k] ?? "")) k++;
      if (src[k] !== "}") return null;
    }
    const text = src.slice(valueStart, j).replace(/\$\{[^}]*\}/g, " ");
    return { valueStart, valueEnd: j, tokens: text.split(/\s+/).filter(Boolean) };
  }
  return null;
}
function bodyOf(src, tag, from) {
  const re = new RegExp(`<(/?)${tag.replace(/[.$]/g, "\\$&")}(?=[\\s/>])`, "g");
  re.lastIndex = from;
  let depth = 1;
  for (let m = re.exec(src); m && m.index - from < 5e4; m = re.exec(src)) {
    if (m[1]) {
      if (--depth === 0) return src.slice(from, m.index);
    } else {
      const t = tagEnd(src, m.index, m.index + m[0].length);
      if (t && !t.self) depth++;
    }
  }
  return null;
}
function classSites(content, file) {
  const out = [];
  const re = /<([a-zA-Z][\w.:-]*)(?=[\s/>])/g;
  for (let m = re.exec(content); m; m = re.exec(content)) {
    const t = tagEnd(content, m.index, m.index + m[0].length);
    if (!t) continue;
    let v = null;
    for (const [a, b] of t.attrs) if (v = classValue(content, a, b)) break;
    if (!v) continue;
    out.push({
      file,
      line: content.slice(0, m.index).split("\n").length,
      tag: m[1],
      ...v,
      body: t.self ? null : bodyOf(content, m[1], t.end)
    });
  }
  return out;
}
function matchSites(content, file, el) {
  const has = new Set(el.classes);
  const re = el.text ? textPattern(el.text) : null;
  return classSites(content, file).filter((s) => s.tag.toLowerCase() === el.tag.toLowerCase() && s.tokens.length > 0 && s.tokens.every((t) => has.has(t))).map((s) => ({ ...s, text: !!re && s.body !== null && new RegExp(re.source).test(s.body) }));
}
function addClass(content, at, cls) {
  if (!isClassName(cls)) throw new Error(`not a class name: ${cls}`);
  const sites = matchSites(content, at.file, { tag: at.tag, classes: [...at.classes, cls], text: "" }).filter((s2) => s2.line === at.line);
  if (sites.length !== 1) throw new Error(`the <${at.tag}> on line ${at.line} of ${at.file} is no longer there; reload and try again`);
  const s = sites[0];
  if (s.tokens.includes(cls)) return content;
  const value = content.slice(s.valueStart, s.valueEnd);
  const trimmed = value.replace(/\s+$/, "");
  const insert = trimmed ? ` ${cls}` : cls;
  const at2 = s.valueStart + trimmed.length;
  return content.slice(0, at2) + insert + content.slice(at2);
}

export {
  textPattern,
  isClassName,
  hasClassToken,
  renameClassToken,
  narrowSelector,
  matchSites,
  addClass
};
