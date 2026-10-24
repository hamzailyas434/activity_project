import { useCallback, useMemo, useRef, useState } from "react";
import Icon from "./Icon";
import { Modal } from "./Overlay";
import { ConfirmCtx, ToastCtx } from "./ui-context";

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const seq = useRef(0);
  const toast = useCallback((msg, kind = "ok") => {
    const id = ++seq.current;
    setToasts(t => [...t.slice(-3), { id, msg, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), kind === "err" ? 5000 : 3200);
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={"toast " + (t.kind === "err" ? "err" : "")}><i />{t.msg}
            <button type="button" aria-label="Dismiss" onClick={() => setToasts(x => x.filter(y => y.id !== t.id))}><Icon n="x" s={13} /></button></div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function ConfirmProvider({ children }) {
  const [confirm, setConfirm] = useState(null);
  const ask = useCallback(opts => new Promise(res => setConfirm({ ...opts, res })), []);
  const value = useMemo(() => ({ ask }), [ask]);
  const done = ok => { confirm.res(ok); setConfirm(null); };
  return (
    <ConfirmCtx.Provider value={value}>
      {children}
      {confirm && (
        <Modal size="sm" kicker={confirm.kicker || "Confirm"} title={confirm.title} onClose={() => done(false)}
          foot={<><button type="button" className="btn" onClick={() => done(false)}>Cancel</button>
            <button type="button" className={"btn " + (confirm.danger ? "danger solid" : "primary")} autoFocus onClick={() => done(true)}>{confirm.ok || "Confirm"}</button></>}>
          {confirm.body && <p className="ut" style={{ color: "var(--fg-2)", lineHeight: 1.6 }}>{confirm.body}</p>}
        </Modal>
      )}
    </ConfirmCtx.Provider>
  );
}
