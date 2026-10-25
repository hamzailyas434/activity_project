import { Avatar, Empty, Field, Icon, Skeleton } from "../components/ui";
import { MON, fmtDate, isoDate, ymd } from "../lib/format";
import { CATS, CAT_C, LABEL, amtOf, dayOf, useMoney } from "../lib/money";
import { ExpForm, LedgerForm } from "../screens/Money";
import { go } from "../shell/route";
import PageHead from "./PageHead";

/* v2 · 05 Expenses — income-used bar by category, income + sent-home, transactions table, person ledger */
export default function Money({ sub }) {
  const { money, symbol, now, ty, tm, y, m, setYm, f, setF, sort, setSort, edit, setEdit, led, setLed, key, data, setIncDraft, adding, win, shift, isFuture, D,
    spent, income, left, by, view, sentTo, inc, saveBudget, incOk, saveIncome, del, delLedger } = useMoney(sub);
  const months = (
    <div className="row" style={{ gap: 4 }}>
      <button type="button" className="btn icon sm ghost" aria-label="Earlier months" onClick={() => shift(-1)}><Icon n="chevL" s={14} /></button>
      <div className="seg">{win.map(([wy, wm]) => { const k = `${wy}-${wm}`; return <button type="button" key={k} className={key === k ? "on" : ""} onClick={() => setYm([wy, wm])}>{MON[wm - 1]}{wy !== ty ? " " + String(wy).slice(2) : ""}</button>; })}</div>
      <button type="button" className="btn icon sm ghost" aria-label="Later months" onClick={() => shift(1)}><Icon n="chevR" s={14} /></button>
    </div>
  );
  if (!D) return (
    <>
      <PageHead idx="05" meta={`Expenses · ${MON[m - 1]} ${y}`} title={<>Where it <em>went</em></>}>{months}</PageHead>
      {data.error ? <Empty title="Couldn't load" body={data.error} action={<button type="button" className="btn primary" onClick={data.reload}>Try again</button>} /> : <Skeleton tiles={[["s8", 200], ["s4", 200], ["s12", 320]]} />}
    </>
  );
  const pct = income ? Math.min(100, (spent / income) * 100) : 0;
  const sortBy = k => setSort(k);

  return (
    <>
      <PageHead idx="05" meta={`Expenses · ${MON[m - 1]} ${y}`}
        title={income ? <>{left < 0 ? "Over by " : ""}<em>{money(Math.abs(left))}</em>{left < 0 ? "" : " left"}</> : <><em>{money(spent)}</em> spent</>}
        sub={income ? `${money(spent)} spent of a ${money(income)} income.` : "Set this month's income to see what's left."}>
        {months}
        <button type="button" className="btn primary" disabled={isFuture} onClick={() => go("expenses/new")}><Icon n="plus" />Expense</button>
      </PageHead>

      <div className="grid g-12" style={{ marginBottom: 16 }}>
        <section className="card c8">
          <div className="card-h"><div><div className="k">Income used</div><h3>{income ? `${Math.round(pct)}% of month` : money(spent)}</h3></div>
            {!!income && <span className={"badge " + (pct > 90 ? "red" : pct > 70 ? "warn" : "ok")}>{pct > 90 ? "Tight" : pct > 70 ? "Watch" : "On track"}</span>}</div>
          <div style={{ display: "flex", height: 18, borderRadius: 3, overflow: "hidden", background: "var(--bg-3)" }}>
            {by.map(x => <div key={x.c} title={`${x.c} ${money(x.v)}`} style={{ width: (x.v / (Math.max(income, spent) || 1)) * 100 + "%", background: CAT_C[x.c] }} />)}
          </div>
          <div className="row wrap" style={{ gap: 22, marginTop: 16 }}>
            {by.map(x => <div key={x.c}><div className="row" style={{ gap: 6 }}><i style={{ width: 8, height: 8, borderRadius: 2, background: CAT_C[x.c] }} /><span className="label">{x.c}</span></div><div className="disp" style={{ fontSize: 30, marginTop: 4 }}>{Math.round(x.v / 100) / 10}k</div></div>)}
          </div>
        </section>
        <section className="card c4">
          <div className="card-h"><div><div className="k">{MON[m - 1]} {y}</div><h3>Income</h3></div></div>
          <Field label="Total income" hint="What came in this month — the base for everything else.">
            <div className="pre"><span>{symbol}</span><input type="number" min="0" value={inc} onChange={e => setIncDraft({ key, v: e.target.value })} onKeyDown={e => e.key === "Enter" && incOk && saveIncome()} /></div>
          </Field>
          <label className="toggle-row">
            <input type="checkbox" checked={D.sentHome} onChange={e => saveBudget(income, e.target.checked)} /><span className="tg" />
            <span><b>Remaining sent home</b><small>{D.sentHome ? `${money(Math.max(0, left))} marked as sent` : "Mark when the leftover is transferred"}</small></span>
          </label>
          <button type="button" className="btn" style={{ marginTop: 12, width: "100%" }} disabled={!incOk} onClick={saveIncome}>Save income</button>
        </section>
      </div>

      <section className="card flush">
        <div className="row sb wrap" style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", gap: 10 }}>
          <h3 className="disp" style={{ fontSize: 24 }}>Transactions</h3>
          <div className="row wrap">{["All", ...Object.keys(CATS)].map(c => <button type="button" key={c} className={"chip " + (f === c ? "on" : "")} onClick={() => setF(c)}>{c}</button>)}</div>
        </div>
        {!view.length ? <div style={{ padding: 18 }}><Empty title="No expenses" body={`Nothing logged for ${MON[m - 1]} yet.`} /></div> : (
          <div className="tbl-wrap">
            <table className="tbl tbl-stack">
              <thead><tr>
                <th>Name</th><th>Category</th>
                <th><button type="button" className="th-sort" onClick={() => sortBy("date")}>Date {sort === "date" && "↓"}</button></th>
                <th>Note</th>
                <th className="num"><button type="button" className="th-sort" onClick={() => sortBy("amt")}>Amount {sort === "amt" && "↓"}</button></th>
                <th />
              </tr></thead>
              <tbody>{view.map(r => {
                const c = LABEL[r.category] || "Other", memo = !amtOf(r);
                return (
                  <tr key={r.id} style={memo ? { opacity: 0.7 } : undefined}>
                    <td data-l="Name" style={{ fontWeight: 600 }}><button type="button" className="th-sort" style={{ fontWeight: 600, color: "var(--fg)" }} onClick={() => setEdit(r)} dir="auto">{r.name}</button>{memo && <span className="badge" style={{ marginLeft: 6 }}>memo</span>}</td>
                    <td data-l="Category"><span className="row" style={{ gap: 6 }}><i style={{ width: 7, height: 7, borderRadius: 2, background: CAT_C[c] }} />{c}</span></td>
                    <td data-l="Date" className="mono muted">{dayOf(r) ? fmtDate(dayOf(r)) : "—"}</td>
                    <td data-l="Note" className="muted" dir="auto">{r.note || "—"}</td>
                    <td data-l="Amount" className="num" style={{ fontWeight: 600 }}>{memo ? "—" : money(amtOf(r))}</td>
                    <td style={{ textAlign: "right" }}><button type="button" className="btn sm icon ghost" aria-label={"Delete " + r.name} onClick={() => del(r)}><Icon n="trash" s={13} /></button></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="card-h"><div><div className="k">Person ledger · money held for family</div><h3>Ledger</h3></div><button type="button" className="btn sm" onClick={() => setLed({})}><Icon n="plus" s={13} />Entry</button></div>
        {!D.ledger.length ? <Empty title="No ledger entries" body="Track money you hold or owe for family members." /> : (
          <div className="ledger">{D.ledger.map(x => (
            <div key={x.id} className="ledger-row">
              <Avatar name={x.person_name} c={x.id} s={34} />
              <button type="button" onClick={() => setLed(x)} style={{ minWidth: 0, border: "none", background: "none", padding: 0, textAlign: "left", cursor: "pointer", color: "inherit" }}>
                <b dir="auto">{x.person_name}</b><div className="muted" style={{ fontSize: 12 }} dir="auto">{x.note || (x.carried ? `from ${MON[x.month - 1]}` : "—")}</div>
              </button>
              <div className="lg-n"><span className="k">Held</span><b className="mono">{money(Number(x.amount || 0))}</b></div>
              <div className="lg-n"><span className="k">Pending</span><b className="mono" style={{ color: Number(x.other_amount) ? "var(--gold)" : "var(--fg-3)" }}>{money(Number(x.other_amount || 0))}</b></div>
              <div className="lg-n"><span className="k">Sent this month</span><b className="mono">{money(sentTo(x.person_name))}</b></div>
              <button type="button" className="btn sm icon ghost" aria-label={"Remove " + x.person_name} onClick={() => delLedger(x)}><Icon n="trash" s={13} /></button>
            </div>
          ))}</div>
        )}
      </section>

      {(adding || edit) && <ExpForm r={edit} y={y} m={m} today={y === ty && m === tm ? isoDate(now) : ymd(y, m, 1)} symbol={symbol}
        onClose={() => { setEdit(null); if (adding) go("expenses"); }}
        onSaved={(row, isNew) => data.setData(s => ({ ...s, rows: isNew ? [...s.rows, row] : s.rows.map(x => (x.id === row.id ? row : x)) }))} />}
      {led && <LedgerForm x={led.id ? led : null} y={y} m={m} symbol={symbol} onClose={() => setLed(null)} onSaved={data.reload} />}
    </>
  );
}
