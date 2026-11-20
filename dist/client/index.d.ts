type MountOptions = {
    /** The dev-server endpoint (domeditor/vite serves /__domeditor; the Next route /api/dev/domeditor). */
    endpoint?: string;
    /** Panel colours. "auto" (the default) follows the page: its light/dark switch, or else the system setting. */
    theme?: Theme;
};
type Theme = "auto" | "dark" | "light" | "system";
declare function mountDomEditor(options?: MountOptions): void;

export { mountDomEditor };
export type { MountOptions, Theme };
