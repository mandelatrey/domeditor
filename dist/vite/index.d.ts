import { Plugin } from 'vite';
import { HandlerOptions } from '../core/server.js';
import 'postcss';
import '../core/shared.js';

type DomEditorViteOptions = Omit<HandlerOptions, "root"> & {
    /** Where the endpoint is served. Default: /__domeditor */
    endpoint?: string;
    /** Panel colours. "auto" (the default) follows the page's light/dark setting. */
    theme?: "auto" | "dark" | "light" | "system";
};
declare module "node:http" {
    interface IncomingMessage {
        originalUrl?: string;
    }
}
declare function domeditor(options?: DomEditorViteOptions): Plugin;

export { domeditor as default, domeditor };
export type { DomEditorViteOptions };
