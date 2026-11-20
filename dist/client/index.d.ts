type MountOptions = {
    /** The dev-server endpoint (domeditor/vite serves /__domeditor; the Next route /api/dev/domeditor). */
    endpoint?: string;
    /** Panel colours. Default: "dark". */
    theme?: "dark" | "light" | "system";
};
declare function mountDomEditor(options?: MountOptions): void;

export { mountDomEditor };
export type { MountOptions };
