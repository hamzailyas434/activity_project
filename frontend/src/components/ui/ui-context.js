import { createContext, useContext } from "react";

export const ToastCtx = createContext({ toast: () => {} });
export const ConfirmCtx = createContext({ ask: async () => false });

/* toast(msg, 'ok' | 'err') */
export const useToast = () => useContext(ToastCtx).toast;
/* await ask({ title, body, ok, danger, kicker }) → boolean */
export const useConfirm = () => useContext(ConfirmCtx).ask;
export const useUI = () => ({ toast: useToast(), ask: useConfirm() });
