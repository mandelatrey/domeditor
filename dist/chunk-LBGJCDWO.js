// src/core/shared.ts
var ruleKey = (r) => JSON.stringify([r.file, r.context, r.selector, r.occurrence]);
function normSelector(sel) {
  return sel.replace(/["']/g, "").replace(/\*(?=[.#:[])/g, "").replace(/\(\s*odd\s*\)/gi, "(2n+1)").replace(/\(\s*even\s*\)/gi, "(2n)").replace(/(^|[^:]):(before|after|first-line|first-letter)\b/gi, "$1::$2").replace(/\s+/g, " ").replace(/\s*([>+~,()])\s*/g, "$1").trim();
}
var normCondition = (s) => s.toLowerCase().replace(/["'\s]/g, "");
function splitTop(s, sep = ",") {
  const out = [];
  let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    if (depth === 0 && (sep === "," ? ch === "," : /\s/.test(ch))) {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
var LEGACY_PSEUDO_ELEMENTS = /* @__PURE__ */ new Set(["before", "after", "first-line", "first-letter"]);
function identEnd(s, i) {
  while (i < s.length && /[\w\-\\ -￿]/.test(s[i])) i += s[i] === "\\" ? 2 : 1;
  return i;
}
function parenEnd(s, open) {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")" && --depth === 0) return i;
  }
  return s.length - 1;
}
var maxSpec = (list) => splitTop(list).map(specificity).reduce((m, s) => compareSpec(s, m) > 0 ? s : m, [0, 0, 0]);
function specificity(sel) {
  const sp = [0, 0, 0];
  const add = (o) => {
    sp[0] += o[0];
    sp[1] += o[1];
    sp[2] += o[2];
  };
  let i = 0;
  while (i < sel.length) {
    const ch = sel[i];
    if (ch === "#") {
      sp[0]++;
      i = identEnd(sel, i + 1);
    } else if (ch === ".") {
      sp[1]++;
      i = identEnd(sel, i + 1);
    } else if (ch === "[") {
      sp[1]++;
      const j = sel.indexOf("]", i);
      i = j < 0 ? sel.length : j + 1;
    } else if (ch === ":") {
      const element = sel[i + 1] === ":";
      const start = i + (element ? 2 : 1);
      i = identEnd(sel, start);
      const name = sel.slice(start, i).toLowerCase();
      let args = null;
      if (sel[i] === "(") {
        const end = parenEnd(sel, i);
        args = sel.slice(i + 1, end);
        i = end + 1;
      }
      if (element || LEGACY_PSEUDO_ELEMENTS.has(name)) sp[2]++;
      else if (name === "where") {
      } else if (["is", "not", "has", "matches"].includes(name) && args) add(maxSpec(args));
      else if (/^nth-(last-)?child$/.test(name) && args && /\sof\s/i.test(args)) {
        sp[1]++;
        add(maxSpec(args.split(/\sof\s/i)[1]));
      } else sp[1]++;
    } else if (/[a-zA-Z_\- -￿]/.test(ch)) {
      sp[2]++;
      i = identEnd(sel, i);
    } else i++;
  }
  return sp;
}
var compareSpec = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
var NUMBER = /(?<![\w#.-])(-?(?:\d+\.?\d*|\.\d+))([a-z%]*)/gi;
function numberAt(value, caret) {
  const all = [];
  for (const m of value.matchAll(NUMBER)) {
    const start = m.index;
    all.push({ start, end: start + m[0].length, num: parseFloat(m[1]), unit: m[2].toLowerCase() });
  }
  return all.find((t) => caret >= t.start && caret <= t.end) ?? [...all].reverse().find((t) => t.end <= caret) ?? all[0] ?? null;
}
function stepFor(prop, tok) {
  if (prop === "font-weight" || prop === "font" && !tok.unit && tok.num >= 100) return 10;
  if (prop === "letter-spacing" && (tok.unit === "em" || tok.unit === "rem")) return 5e-3;
  if (tok.unit === "ms") return 10;
  if (tok.unit === "em" || tok.unit === "rem" || tok.unit === "s" || !tok.unit && Math.abs(tok.num) < 10) return 0.05;
  return 1;
}
var formatNumber = (n) => String(Number(n.toFixed(4)) || 0);
function nudge(value, caret, steps, prop) {
  const tok = numberAt(value, caret);
  if (!tok) return null;
  let next = tok.num + steps * stepFor(prop, tok);
  if (prop === "font-weight" || prop === "font" && !tok.unit && tok.num >= 100) next = Math.min(1e3, Math.max(1, next));
  const text = formatNumber(next) + tok.unit;
  return { value: value.slice(0, tok.start) + text + value.slice(tok.end), start: tok.start, end: tok.start + text.length };
}
var SIDES = ["top", "right", "bottom", "left"];
function expandBox(v) {
  const t = splitTop(v, " ");
  if (t.length < 1 || t.length > 4) return null;
  const [a, b = a, c = a, d = b] = t;
  return [a, b, c, d];
}
function composeBox([t, r, b, l]) {
  if (r === l) {
    if (t === b) return t === r ? t : `${t} ${r}`;
    return `${t} ${r} ${b}`;
  }
  return `${t} ${r} ${b} ${l}`;
}
var isFontSize = (t) => /^(-?[\d.]+[a-z%]+|(calc|clamp|min|max)\(.*\))$/i.test(t);
function fontParts(v) {
  const tokens = splitTop(v.replace(/\s*\/\s*/g, "/"), " ");
  const sizeIdx = tokens.findIndex((t) => isFontSize(t.split("/")[0]));
  if (sizeIdx < 0 || sizeIdx === tokens.length - 1) return null;
  const weightIdx = tokens.slice(0, sizeIdx).findIndex((t) => /^(\d{1,4}|bold|bolder|lighter|normal)$/i.test(t));
  return { tokens, sizeIdx, weightIdx };
}
function readFont(v, part) {
  const p = fontParts(v);
  if (!p) return null;
  const [size, lh] = p.tokens[p.sizeIdx].split("/");
  if (part === "font-size") return size.trim();
  if (part === "line-height") return lh?.trim() ?? "normal";
  return p.weightIdx >= 0 ? p.tokens[p.weightIdx] : "normal";
}
function writeFont(v, part, value) {
  const p = fontParts(v);
  if (!p) return null;
  const t = [...p.tokens];
  const [size, lh] = t[p.sizeIdx].split("/");
  if (part === "font-size") t[p.sizeIdx] = lh !== void 0 ? `${value}/${lh}` : value;
  else if (part === "line-height") t[p.sizeIdx] = `${size}/${value}`;
  else if (p.weightIdx >= 0) t[p.weightIdx] = value;
  else t.unshift(value);
  return t.join(" ");
}
function shorthandOf(prop) {
  const box = /^(padding|margin)-(top|right|bottom|left)$/.exec(prop);
  if (box) {
    const i = SIDES.indexOf(box[2]);
    return {
      name: box[1],
      read: (v) => expandBox(v)?.[i] ?? null,
      write: (v, x) => {
        const s = expandBox(v);
        if (!s) return null;
        s[i] = x;
        return composeBox(s);
      }
    };
  }
  if (prop === "row-gap" || prop === "column-gap") {
    const i = prop === "row-gap" ? 0 : 1;
    return {
      name: "gap",
      read: (v) => {
        const t = splitTop(v, " ");
        return t[i] ?? t[0] ?? null;
      },
      write: (v, x) => {
        const t = splitTop(v, " ");
        const pair = [t[0], t[1] ?? t[0]];
        pair[i] = x;
        return pair[0] === pair[1] ? pair[0] : pair.join(" ");
      }
    };
  }
  if (prop === "font-size" || prop === "line-height" || prop === "font-weight") {
    return { name: "font", read: (v) => readFont(v, prop), write: (v, x) => writeFont(v, prop, x) };
  }
  return null;
}
function readProp(decls, prop) {
  const sh = shorthandOf(prop);
  for (let i = decls.length - 1; i >= 0; i--) {
    const d = decls[i];
    if (d.prop === prop) return d.value;
    if (sh && d.prop === sh.name) return sh.read(d.value);
  }
  return null;
}
function writeProp(decls, prop, value) {
  const out = decls.map((d) => ({ ...d }));
  const sh = shorthandOf(prop);
  for (let i = out.length - 1; i >= 0; i--) {
    const d = out[i];
    if (d.prop === prop) {
      if (value === null) out.splice(i, 1);
      else d.value = value;
      return out;
    }
    if (sh && d.prop === sh.name) {
      if (value === null) return out;
      const next = sh.write(d.value, value);
      if (next !== null) {
        d.value = next;
        return out;
      }
      break;
    }
  }
  if (value !== null) out.push({ prop, value, important: false });
  return out;
}
function writeSides(decls, base, sides) {
  const all = SIDES.every((s) => sides[s] !== void 0);
  if (all && !decls.some((d) => d.prop.startsWith(`${base}-`))) {
    return writeProp(decls, base, composeBox(SIDES.map((s) => sides[s])));
  }
  let out = [...decls];
  for (const s of SIDES) if (sides[s] !== void 0) out = writeProp(out, `${base}-${s}`, sides[s]);
  return out;
}
var sameDecls = (a, b) => a.length === b.length && a.every((d, i) => d.prop === b[i].prop && d.value.trim() === b[i].value.trim() && d.important === b[i].important);
var serializeDecls = (decls) => decls.map((d) => `${d.prop}: ${d.value}${d.important ? " !important" : ""};`).join(" ");
var sameContext = (a, b) => a.length === b.length && a.every((c, i) => c === b[i]);
function alignRules(items, sources) {
  const written = new Set(sources.flatMap((s) => s.context));
  const ctxOf = (item) => item.context.filter((c) => !c.startsWith("supports ") || written.has(c));
  const partsOf = sources.map((s) => splitTop(s.selector));
  const startsWith = (list, from, sub) => sub.every((p, k) => list[from + k] === p);
  const out = [];
  let i = 0;
  let used = 0;
  const tryAt = (item, ctx, parts, j, from) => {
    const s = sources[j];
    if (!s || !sameContext(s.context, ctx)) return null;
    if (startsWith(partsOf[j], from, parts)) {
      out.push({ kind: "one", item, source: s });
      return from + parts.length >= partsOf[j].length ? [j + 1, 0] : [j, from + parts.length];
    }
    if (from === 0 && parts.length > partsOf[j].length) {
      const group = [];
      let covered = 0;
      for (let k = j; k < sources.length && covered < parts.length && sameContext(sources[k].context, ctx); k++) {
        if (!startsWith(parts, covered, partsOf[k])) break;
        group.push(sources[k]);
        covered += partsOf[k].length;
      }
      if (group.length > 1 && covered === parts.length) {
        out.push({ kind: "merged", item, sources: group });
        return [j + group.length, 0];
      }
    }
    return null;
  };
  for (const item of items) {
    const ctx = ctxOf(item), parts = splitTop(item.selector);
    let next = tryAt(item, ctx, parts, i, used);
    const prev = used ? i : i - 1;
    if (!next && sources[prev] && sameContext(sources[prev].context, ctx) && parts.every((p) => partsOf[prev].includes(p))) {
      out.push({ kind: "one", item, source: sources[prev] });
      continue;
    }
    for (let j = i + 1; !next && j < sources.length; j++) next = tryAt(item, ctx, parts, j, 0);
    if (next) [i, used] = next;
    else out.push({ kind: "none", item });
  }
  return out;
}

export {
  ruleKey,
  normSelector,
  normCondition,
  splitTop,
  specificity,
  compareSpec,
  numberAt,
  stepFor,
  formatNumber,
  nudge,
  expandBox,
  composeBox,
  readProp,
  writeProp,
  writeSides,
  sameDecls,
  serializeDecls,
  alignRules
};
