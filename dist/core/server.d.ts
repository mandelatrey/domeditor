import postcss, { Rule } from 'postcss';
import { Decl, RuleRef, SourceRule } from './shared.js';

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
/** Add a new rule at the end of a stylesheet, written one-line or multi-line to match most of the file's rules. */
declare function appendRule(css: string, selector: string, decls: Decl[]): string;
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
/** GET lists the rules in every stylesheet; POST writes edits. Development only. */
declare function createHandler(options?: HandlerOptions): (req: Request) => Promise<Response>;

export { EditError, appendRule, applyRuleEdit, createHandler, cssFiles, sourceRules };
export type { HandlerOptions };
