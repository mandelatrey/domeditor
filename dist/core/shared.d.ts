type Decl = {
    prop: string;
    value: string;
    important: boolean;
};
/** Which rule in the source: its file, the at-rules around it (outermost first), its selector, and
 *  which repeat of that (context, selector) pair it is in the file. The browser's CSSOM and PostCSS
 *  both produce one of these, so a rule seen in the page can be found again in its .css file. */
type RuleRef = {
    file: string;
    context: string[];
    selector: string;
    occurrence: number;
};
type SourceRule = RuleRef & {
    line: number;
    decls: Decl[];
};
declare const ruleKey: (r: RuleRef) => string;
/** A selector in one canonical spelling, so the browser's serialisation and the source text compare equal.
 *  Next's CSS compiler (Lightning CSS) also rewrites some selectors on the way to the browser, e.g.
 *  `.a *::before` arrives as `.a :before`, so a `*` next to a class, id, attribute or pseudo is dropped. */
declare function normSelector(sel: string): string;
/** An at-rule's condition (media query, container query, supports test...) in one canonical spelling.
 *  Size features are written the legacy way, because a compiler may rewrite one spelling as the other:
 *  Next's Lightning CSS turns `@container (min-width: 720px)` into `@container (width >= 720px)`. */
declare const normCondition: (s: string) => string;
type SizeEnv = {
    width: number;
    height: number;
    em: number;
    rem: number;
};
/**
 * Does a size query hold for a box this big? For container queries, which the browser has no
 * `matchMedia` for. Understands width/height/inline-size/block-size as min-/max- features or ranges
 * (`>=`, `<=`, `>`, `<`), joined by `and` or `or`, in px, em and rem. Null when the query uses
 * anything else (a style() query, `not`, other units): the caller decides what that means.
 */
declare function sizeQueryMatches(query: string, env: SizeEnv): boolean | null;
/** Split on top-level commas: "a, b:is(c, d)" -> ["a", "b:is(c, d)"]. Also splits values on spaces with splitTop(v, " "). */
declare function splitTop(s: string, sep?: "," | " "): string[];
type Spec = [number, number, number];
/** Specificity of one complex selector (no top-level commas), per Selectors Level 4. */
declare function specificity(sel: string): Spec;
declare const compareSpec: (a: Spec, b: Spec) => number;
type NumberToken = {
    start: number;
    end: number;
    num: number;
    unit: string;
};
/** The number under (or nearest before) the caret in a CSS value. */
declare function numberAt(value: string, caret: number): NumberToken | null;
/** How much one arrow-key press changes a number, by property and unit. */
declare function stepFor(prop: string, tok: NumberToken): number;
declare const formatNumber: (n: number) => string;
/** Change the number at the caret by `steps` (+1 = one arrow press). Returns the new value and the token's new span. */
declare function nudge(value: string, caret: number, steps: number, prop: string): {
    value: string;
    start: number;
    end: number;
} | null;
declare const SIDES: readonly ["top", "right", "bottom", "left"];
type Side = (typeof SIDES)[number];
/** "8px 12px" -> ["8px", "12px", "8px", "12px"] */
declare function expandBox(v: string): [string, string, string, string] | null;
/** ["8px", "12px", "8px", "12px"] -> "8px 12px" */
declare function composeBox([t, r, b, l]: readonly string[]): string;
/** What a rule declares for a property, counting a shorthand that sets it (the last declaration wins). */
declare function readProp(decls: readonly Decl[], prop: string): string | null;
/** Set (or with null, remove) one property in a rule, editing a shorthand in place where the rule uses one,
 *  so the source keeps its shape: `padding: 18px 20px` + left=24px -> `padding: 18px 20px 18px 24px`. */
declare function writeProp(decls: readonly Decl[], prop: string, value: string | null): Decl[];
/** Set several sides of padding/margin at once; all four on a rule with no longhands becomes one shorthand. */
declare function writeSides(decls: readonly Decl[], base: "padding" | "margin", sides: Partial<Record<Side, string>>): Decl[];
declare const sameDecls: (a: readonly Decl[], b: readonly Decl[]) => boolean;
declare const serializeDecls: (decls: readonly Decl[]) => string;
/** Where one compiled rule came from: one source rule, several adjacent ones the compiler merged into a
 *  single selector list, or none (generated, e.g. by Tailwind or for vendor prefixes). */
type Alignment<T> = {
    kind: "one";
    item: T;
    source: SourceRule;
} | {
    kind: "merged";
    item: T;
    sources: SourceRule[];
} | {
    kind: "none";
    item: T;
};
/**
 * Pair the rules the browser got from one file (in order) with the file's source rules (in order).
 * Next compiles CSS with Lightning CSS, which changes the rule list on the way:
 *  - adjacent rules with identical declarations become one: `.a { x } .b { x }` -> `.a, .b { x }`
 *  - a selector list is split, one rule per selector, when some selector might be unsupported:
 *    `.a:focus-visible, .b:focus-visible { x }` -> `.a:focus-visible { x } .b:focus-visible { x }`
 *  - a rule is split around a value that needs a fallback: `.a { x; color-mix(...); y }` ->
 *    `.a { x; fallback }  @supports (color: color-mix(...)) { .a { color-mix(...) } }  .a { y }`
 *  - rules are added (Tailwind's output, vendor-prefixed copies)
 * Both lists keep the source order, so a single forward pass lines them up.
 */
declare function alignRules<T extends {
    selector: string;
    context: string[];
}>(items: readonly T[], sources: readonly SourceRule[]): Alignment<T>[];
/** A media/supports condition in plain words: "(max-width: 640px)" -> "Screens up to 640px wide". */
declare function describeCondition(text: string): string;
/** ":hover::before" -> "On hover · Added before the content" */
declare function describeState(state: string): string;
/** "clamp(32px, 5vw, 56px)" -> ["32px", "5vw", "56px"], or null if the value is not a clamp(). */
declare function parseClamp(v: string): [string, string, string] | null;
declare const composeClamp: ([a, b, c]: readonly string[]) => string;
declare const WEIGHT_NAMES: [number, string][];
/** 650 -> "Semibold+"; "bold" -> "Bold" */
declare function weightName(w: string): string;
/** "color: red; font: 500 14px/1 var(--f) !important" -> declarations (semicolons inside () or quotes kept). */
declare function parseDecls(text: string): Decl[];
/** How see-through a colour is *as written* (0 = clear, 1 = solid), or null when the text does not say
 *  (a var(), a name): then read it from the computed colour. */
declare function writtenAlpha(value: string): number | null;
/**
 * The same colour, `alpha` see-through (0–1; 1 = solid), keeping how it is written:
 *   #14161a -> #14161a99 · rgb(20, 22, 26) -> rgb(20 22 26 / 60%) · oklch(…) -> oklch(… / 60%)
 *   var(--color-bg) / white -> color-mix(in srgb, var(--color-bg) 60%, transparent)
 * A token stays a token (so it still follows dark mode). At 1 the transparency is taken off again.
 */
declare function withAlpha(value: string, alpha: number): string;

export { WEIGHT_NAMES, alignRules, compareSpec, composeBox, composeClamp, describeCondition, describeState, expandBox, formatNumber, normCondition, normSelector, nudge, numberAt, parseClamp, parseDecls, readProp, ruleKey, sameDecls, serializeDecls, sizeQueryMatches, specificity, splitTop, stepFor, weightName, withAlpha, writeProp, writeSides, writtenAlpha };
export type { Alignment, Decl, NumberToken, RuleRef, Side, SizeEnv, SourceRule, Spec };
