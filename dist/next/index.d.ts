type DomEditorProps = {
    /** Where the route is served. Default: /api/dev/domeditor (app/api/dev/domeditor/route.dev.ts) */
    endpoint?: string;
    /** Panel colours. Default: "dark". */
    theme?: "dark" | "light" | "system";
};
declare function DomEditor({ endpoint, theme }: DomEditorProps): null;

export { DomEditor, DomEditor as default };
export type { DomEditorProps };
