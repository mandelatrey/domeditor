// Popups (tooltips) must render inside the editor's shadow root to get its styles, not in <body>.
import { createContext, useContext } from "react";

export const PortalContainer = createContext<HTMLElement | null>(null);
export const usePortalContainer = () => useContext(PortalContainer) ?? undefined;
