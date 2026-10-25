import { useState } from "react";
import { Empty, Field, Head, Icon, Modal, Seg, Skeleton, Toggle, useUI } from "../components/ui";
import { useApi } from "../lib/api";
import { MON, isoDate, toDate, ymd } from "../lib/format";
import { go } from "../shell/route";
import { CATS, CAT_C, LABEL, SUGGEST, amtOf, dayOf, useMoney } from "../lib/money";

const ICON = { Bills: "bell", Family: "user", Other: "wallet" };

export default function Money({ sub }) {
  const { toast, money, symbol, now, ty, tm, y, m, setYm, f, setF, sort, setSort, edit, setEdit, led, setLed, key, data, setIncDraft, adding, win, shift, isFuture, D, spent, income, left, by, cone, view, days, sentTo, inc, saveBudget, incOk, saveIncome, del, delLedger } = useMoney(sub);
  const head = (
    <div className="row wrap" style={{ gap: 6 }}>
      <button type="button" className="btn ghost sm icon" aria-label="Earlier months" onClick={() => shift(-1)}><Icon n="chevL" s={15} /></button>
      <Seg value={key} onChange={k => setYm(k.split("-").map(Number))} label="Month" options={win.map(([wy, wm]) => [`${wy}-${wm}`, MON[wm - 1] + (wy !== ty ? " " + String(wy).slice(2) : "")])} />
      <button type="button" className="btn ghost sm icon" aria-label="Later months" onClick={() => shift(1)}><Icon n="chevR" s={15} /></button>
    </div>
  );
  if (!D) {
    return (
      <>
        <Head n="05" eyebrow={`Money · ${MON[m - 1]} ${y}`} title={<>Where it <em>went</em>.</>}>{head}</Head>
        {data.error ? <Empty title="Couldn't load" body={data.error} action={<button type="button" className="btn primary" onClick={data.reload}>Try again</button>} />
          : <Skeleton tiles={[["s5", 420], ["s7", 420], ["s12", 200]]} />}
      </>
    );
  }
  return (
    <>
      <Head n="05" eyebrow={`Money · ${MON[m - 1]} ${y}`}
        title={!income ? <><em>{money(spent)}</em> spent.</> : left < 0 ? <>Over by <em>{money(-left)}</em>.</> : <><em>{money(left)}</em> still yours.</>}
        sub={income ? `${money(spent)} spent of ${money(income)} income this month.` : "Add this month's income to see what's left."}>
        {head}
        <button type="button" className="btn primary" disabled={isFuture} onClick={() => go("expenses/new")}><Icon n="plus" />Expense</button>
      </Head>

      <div className="bento money">
        <section className="tile ink s5" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="row wrap" style={{ gap: 22 }}>
            <div role="img" aria-label={income ? `${Math.round((spent / income) * 100)}% of income used` : "No income set"}
              style={{ width: 150, height: 150, borderRadius: "50%", background: `conic-gradient(${cone})`, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <div style={{ width: 104, height: 104, borderRadius: "50%", background: "#0B0B0E", display: "grid", placeContent: "center", textAlign: "center" }}>
                <b className="serif" style={{ fontSize: 36, lineHeight: 1 }}>{income ? Math.round((spent / income) * 100) + "%" : "—"}</b>
                <span className="mono" style={{ fontSize: 10, color: "#8B867D" }}>used</span>
              </div>
            </div>
            <div className="stack grow" style={{ gap: 10, minWidth: 160 }}>{by.map(x => (
              <div key={x.c} className="row sb"><span className="row" style={{ gap: 8 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: CAT_C[x.c] }} />{x.c}</span><b className="mono" style={{ fontSize: 13 }}>{money(x.v)}</b></div>
            ))}</div>
          </div>
          <div className="field">
            <span className="label" style={{ color: "#C9C4BA" }}>Income · {MON[m - 1]}</span>
            <div className="row">
              <div className="pre grow" style={{ background: "var(--ink-3)" }}><span>{symbol}</span>
                <input type="number" min="0" aria-label="Income" value={inc} onChange={e => setIncDraft({ key, v: e.target.value })} style={{ color: "#fff" }}
                  onKeyDown={e => e.key === "Enter" && incOk && saveIncome()} /></div>
              <button type="button" className="btn red" disabled={!incOk} onClick={saveIncome}>Save</button>
            </div>
          </div>
          <div className="row" style={{ background: "var(--ink-3)", borderRadius: 18, padding: 14 }}>
            <div className="grow"><b>Remaining sent home</b>
              <div className="mono" style={{ fontSize: 11.5, color: "#8B867D" }}>{D.sentHome ? `${money(Math.max(0, left))} marked as sent` : "Mark when the leftover goes home"}</div></div>
            <Toggle on={D.sentHome} label="Remaining sent home" onChange={v => saveBudget(income, v).then(ok => ok && toast(v ? "Marked as sent home" : "Unmarked"))} />
          </div>
        </section>

        <section className="tile s7 flush">
          <div className="row sb wrap" style={{ padding: "20px 22px 12px", gap: 10 }}>
            <h3 className="serif" style={{ fontSize: 30 }}>Transactions</h3>
            <div className="row wrap" style={{ gap: 6 }}>
              {["All", ...Object.keys(CATS)].map(c => <button type="button" key={c} className={"chip" + (f === c ? " on" : "")} aria-pressed={f === c} onClick={() => setF(c)}>{c}</button>)}
              <Seg value={sort} onChange={setSort} label="Sort" options={[["date", "By date"], ["amt", "By amount"]]} />
            </div>
          </div>
          <div style={{ padding: "0 22px 18px" }}>
            {!view.length ? <Empty title={D.rows.length ? "Nothing here" : "No expenses"} body={D.rows.length ? `No ${f} expenses this month.` : `Nothing logged for ${MON[m - 1]}.`}
              action={!isFuture && <button type="button" className="btn primary" onClick={() => go("expenses/new")}>Add expense</button>} />
              : days.map(d => (
                <div key={d || "none"}>
                  {d !== "all" && <div className="cap" style={{ padding: "14px 0 4px" }}>{d ? toDate(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : "No date"}</div>}
                  {view.filter(r => d === "all" || dayOf(r) === d).map(r => {
                    const c = LABEL[r.category] || "Other";
                    return (
                      <div key={r.id} className="list-row" style={{ opacity: amtOf(r) ? 1 : 0.6 }}>
                        <span style={{ width: 38, height: 38, borderRadius: 12, background: `color-mix(in oklab,${CAT_C[c]} 26%,transparent)`, display: "grid", placeItems: "center", flexShrink: 0 }}><Icon n={ICON[c]} s={16} /></span>
                        <button type="button" className="grow" onClick={() => setEdit(r)} style={{ border: "none", background: "none", textAlign: "left", cursor: "pointer", padding: 0, minWidth: 0, color: "inherit" }}>
                          <b dir="auto" className="ut">{r.name}</b>{!amtOf(r) && <span className="pill" style={{ marginLeft: 6, height: 20 }}>memo</span>}
                          <div className="faint ut" dir="auto" style={{ fontSize: 12 }}>{c}{r.note ? " · " + r.note : ""}</div>
                        </button>
                        <b className="mono" style={{ fontSize: 14, whiteSpace: "nowrap" }}>{amtOf(r) ? "−" + money(amtOf(r)) : "—"}</b>
                        <button type="button" className="btn ghost sm icon" aria-label={"Delete " + r.name} onClick={() => del(r)}><Icon n="trash" s={13} /></button>
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>
        </section>

        <section className="tile s12">
          <div className="th"><div><div className="cap">Person ledger</div><h3>Held <em>for family</em></h3></div><button type="button" className="btn sm" onClick={() => setLed({})}><Icon n="plus" s={14} />Entry</button></div>
          {!D.ledger.length ? <Empty title="Ledger is empty" body="Track money you keep or owe for someone." /> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(260px,100%),1fr))", gap: 12 }}>{D.ledger.map(x => (
              <div key={x.id} className="ledger-card">
                <div className="row sb">
                  <button type="button" onClick={() => setLed(x)} style={{ border: "none", background: "none", padding: 0, cursor: "pointer", color: "inherit", textAlign: "left", minWidth: 0 }}>
                    <b dir="auto" className="ut" style={{ fontSize: 16 }}>{x.person_name}</b></button>
                  <button type="button" className="btn ghost sm icon" aria-label={"Remove " + x.person_name} onClick={() => delLedger(x)}><Icon n="x" s={14} /></button>
                </div>
                <div className="cap" style={{ marginTop: 8 }}>Held{x.carried ? ` · from ${MON[x.month - 1]}` : ""}</div>
                <div className="lbig">{money(Number(x.amount || 0))}</div>
                <div className="lm">
                  <span className={"pill " + (Number(x.other_amount) ? "warn" : "")}>Pending {money(Number(x.other_amount || 0))}</span>
                  <span className="pill">Sent this month {money(sentTo(x.person_name))}</span>
                </div>
                {x.note && <p dir="auto" className="muted ut" style={{ fontSize: 12.5, marginTop: 10 }}>{x.note}</p>}
              </div>
            ))}</div>
          )}
        </section>
      </div>

      {(adding || edit) && <ExpForm r={edit} y={y} m={m} today={y === ty && m === tm ? isoDate(now) : ymd(y, m, 1)} symbol={symbol}
        onClose={() => { setEdit(null); if (adding) go("expenses"); }}
        onSaved={(row, isNew) => data.setData(s => ({ ...s, rows: isNew ? [...s.rows, row] : s.rows.map(x => (x.id === row.id ? row : x)) }))} />}
      {led && <LedgerForm x={led.id ? led : null} y={y} m={m} symbol={symbol} onClose={() => setLed(null)} onSaved={data.reload} />}
    </>
  );
}

export function ExpForm({ r, y, m, today, symbol, onClose, onSaved }) {
  const api = useApi();
  const { toast, ask } = useUI();
  const init = r ? { cat: LABEL[r.category] || "Other", name: r.name || "", amt: String(r.amount ?? ""), date: dayOf(r), note: r.note || "" }
    : { cat: "Bills", name: "", amt: "", date: today, note: "" };
  const [f, setF] = useState(init), [t, setT] = useState({}), [busy, setBusy] = useState(false);
  const e1 = t.name && !f.name.trim(), e2 = t.amt && (f.amt === "" || +f.amt < 0);
  const dirty = JSON.stringify(f) !== JSON.stringify(init);
  const close = async () => { if (!dirty || await ask({ title: "Discard changes?", body: "This expense won't be saved.", ok: "Discard", danger: true })) onClose(); };
  const save = async () => {
    setT({ name: true, amt: true });
    if (!f.name.trim() || f.amt === "" || +f.amt < 0 || busy) return;
    setBusy(true);
    try {
      const body = { name: f.name.trim(), amount: +f.amt, note: f.note, bill_date: f.date || null };
      const row = r ? await api.put(`/expenses/${r.id}`, body) : await api.post("/expenses", { ...body, category: CATS[f.cat], month: m, year: y });
      onSaved(row, !r); toast(r ? "Expense updated" : "Expense added"); onClose();
    } catch (e) { toast(e.message, "err"); setBusy(false); }
  };
  return (
    <Modal kicker="Money" title={r ? "Edit expense" : "Add expense"} onClose={close}
      foot={<><button type="button" className="btn" onClick={close}>Cancel</button><button type="button" className="btn primary" disabled={busy} onClick={save}>{r ? "Save" : "Add"}</button></>}>
      {r ? <span className="pill" style={{ alignSelf: "flex-start" }}>{f.cat}</span>
        : <Seg value={f.cat} onChange={c => setF({ ...f, cat: c })} label="Category" options={Object.keys(CATS).map(c => [c, c])} />}
      {SUGGEST[f.cat].length > 0 && <div className="row wrap" style={{ gap: 6 }}>{SUGGEST[f.cat].map(n => <button type="button" key={n} className={"chip" + (f.name === n ? " on" : "")} onClick={() => setF({ ...f, name: n })}>{n}</button>)}</div>}
      <Field label="Name" req err={e1 && "Required"}>
        <input className={"input" + (e1 ? " bad" : "")} dir="auto" autoFocus={!r} maxLength={200} value={f.name} onBlur={() => setT(x => ({ ...x, name: true }))} onChange={e => setF({ ...f, name: e.target.value })} />
      </Field>
      <div className="row wrap" style={{ alignItems: "flex-start" }}>
        <Field label="Amount" req err={e2 && "Enter an amount (0 = memo)"} style={{ flex: "1 1 160px" }}>
          <div className="pre" style={e2 ? { borderColor: "var(--err)" } : undefined}><span>{symbol}</span>
            <input type="number" min="0" inputMode="decimal" aria-label="Amount" value={f.amt} onBlur={() => setT(x => ({ ...x, amt: true }))} onChange={e => setF({ ...f, amt: e.target.value })} /></div>
        </Field>
        <Field label={f.cat === "Bills" ? "Bill date" : "Date"} style={{ flex: "1 1 160px" }}>
          <input className="input mono" type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} />
        </Field>
      </div>
      <Field label="Note"><input className="input" dir="auto" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} placeholder="Paid, pending, reason…" /></Field>
    </Modal>
  );
}

export function LedgerForm({ x, y, m, symbol, onClose, onSaved }) {
  const api = useApi();
  const { toast } = useUI();
  const [f, setF] = useState({ person: x?.person_name || "", amt: x ? String(Number(x.amount || 0)) : "", other: x ? String(Number(x.other_amount || 0)) : "", note: x?.note || "" });
  const [busy, setBusy] = useState(false);
  const ok = f.person.trim() && f.amt !== "" && +f.amt >= 0;
  const save = async () => {
    if (!ok || busy) return;
    setBusy(true);
    try {
      const body = { person_name: f.person.trim(), amount: +f.amt, other_amount: +f.other || 0, note: f.note };
      // an entry carried from an earlier month is saved as this month's balance
      if (x && !x.carried) await api.put(`/expenses/ledger/${x.id}`, body);
      else await api.post("/expenses/ledger", { ...body, month: m, year: y });
      await onSaved(); toast("Ledger updated"); onClose();
    } catch (e) { toast(e.message, "err"); setBusy(false); }
  };
  return (
    <Modal size="sm" kicker="Ledger" title={x ? "Edit entry" : "New entry"} onClose={onClose}
      foot={<><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="button" className="btn primary" disabled={!ok || busy} onClick={save}>{x ? "Save" : "Add"}</button></>}>
      <Field label="Person" req><input className="input" dir="auto" autoFocus value={f.person} maxLength={200} onChange={e => setF({ ...f, person: e.target.value })} /></Field>
      <Field label="Held amount" req><div className="pre"><span>{symbol}</span><input type="number" min="0" aria-label="Held amount" value={f.amt} onChange={e => setF({ ...f, amt: e.target.value })} /></div></Field>
      <Field label="Pending / other"><div className="pre"><span>{symbol}</span><input type="number" min="0" aria-label="Pending amount" value={f.other} onChange={e => setF({ ...f, other: e.target.value })} /></div></Field>
      <Field label="Note"><input className="input" dir="auto" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} /></Field>
    </Modal>
  );
}
