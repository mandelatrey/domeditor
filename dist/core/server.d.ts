import postcss, { Rule } from 'postcss';
import { Decl, RuleRef, SourceRule } from './shared.js';

/** A pattern for text as the page shows it, matching the ways it is commonly written in source. */
declare function textPattern(text: string): RegExp | null;

declare class EditError extends Error {
}
/** Every style rule in a stylesheet, with the reference the browser side uses to find it. */
declare function sourceRules(css: string, file: string): {
    root: postcss.Root;
    rules: {
        rule: Rule;
        ref: SourceRule;
    }[];
};
/** Apply one rule edit to a stylesheet's text. Refuses if the rule changed on disk since the browser read it. */
declare function applyRuleEdit(css: string, edit: {
    ref: RuleRef;
    before: Decl[];
    after: Decl[];
}): string;
/** Add a new rule at the end of a stylesheet, written one-line or multi-line to match most of the file's
 *  rules. With `media`, inside `@media <media> { }`: the file's last block if it has that condition, else a
 *  new one. */
declare function appendRule(css: string, selector: string, decls: Decl[], media?: string | null): string;
/** Where a piece of text a page shows is written in a source file. */
type TextHit = {
    file: string;
    line: number;
    index: number;
    length: number;
};
type TextEdit = {
    before: string;
    after: string;
    at?: {
        file: string;
        line: number;
    };
};
/** Every place a text is written in one file's contents: as a whole "string", or as a whole run of
 *  JSX/HTML text between tags and {expressions} (the same pieces React and the browser make text nodes of). */
declare function findTextIn(content: string, file: string, text: string): TextHit[];
/** Replace one hit with new text, escaped for where it sits: a "string" or JSX/markup text. */
declare function replaceText(content: string, hit: TextHit, after: string): string;
/** A string in the source that makes up part of a text on the page; start/end are offsets in that
 *  text with its spacing collapsed. */
type Piece = {
    file: string;
    line: number;
    text: string;
    start: number;
    end: number;
};
/** Every string literal and JSX text run in a file, as the page would show it. */
declare function literalsIn(content: string): {
    text: string;
    index: number;
}[];
/** The source strings that, in order, make up a text the page shows: the largest cover of the text by
 *  non-overlapping strings (so "Haali gives … fulfil." split into one <span> per word is found as the one
 *  constant it was split from). Empty if nothing in the code makes up a real part of it. */
declare function findPieces(files: {
    file: string;
    content: string;
}[], shown: string): Piece[];
type HandlerOptions = {
    /** The project root; file paths are relative to it. Default: process.cwd(). */
    root?: string;
    /** Folders (relative to root) to look for .css files in. Default: the whole project. */
    include?: string[];
    /** Folder names never searched. Added to the defaults (node_modules, .next, dist, build...). */
    exclude?: string[];
};
/** Every editable stylesheet, as root-relative paths with forward slashes ("app/(admin)/admin.css"),
 *  the spelling Turbopack uses in its CSS chunks ("[project]/app/(admin)/admin.css"). */
declare function cssFiles(root: string, include?: string[], exclude?: string[]): string[];
/** Files under the project root whose name matches, root-relative with forward slashes. */
declare function projectFiles(root: string, include: string[] | undefined, exclude: string[] | undefined, match: RegExp): string[];
/** A text change that cannot be made as asked: not in the code, or in more than one place. */
declare class TextError extends EditError {
    readonly text: string;
    readonly hits: TextHit[];
    constructor(message: string, text: string, hits: TextHit[]);
}
declare function createHandler(options?: HandlerOptions): (req: Request) => Promise<Response>;

export { EditError, TextError, appendRule, applyRuleEdit, createHandler, cssFiles, findPieces, findTextIn, literalsIn, projectFiles, replaceText, sourceRules, textPattern };
export type { HandlerOptions, Piece, TextEdit, TextHit };
