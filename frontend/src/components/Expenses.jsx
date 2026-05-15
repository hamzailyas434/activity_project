import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import Swal from "sweetalert2";

import { API_BASE_URL } from "../config";
import { Ring } from "./rhythm/RhythmAtoms";

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/** API may return `YYYY-MM-DD` or ISO datetime — never split on `-` alone (breaks the day segment). */
function toDateInputValue(v) {
  if (v == null || v === "") return "";
  const s = String(v);
  const ymd = s.includes("T") ? s.slice(0, 10) : s.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : "";
}

function formatExpenseDate(v) {
  const ymd = toDateInputValue(v);
  if (!ymd) return "—";
  const [, y, m, d] = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/) || [];
  if (!y) return "—";
  return `${d}/${m}/${y}`;
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const BILL_SUGGESTIONS = ["Electricity", "PTCL", "Sui Gas", "Water", "Internet", "Rent"];
const PERSON_SUGGESTIONS = ["Mother", "Wife", "Father", "Sister", "Brother"];

/** Use semantic tokens remapped by data-color-family (see color-family-overrides.css), not fixed --teal-600 / --iris-600. */
const OTHER_BREAKDOWN = "color-mix(in oklab, var(--accent) 38%, var(--secondary-color) 62%)";

const SECTION_META = {
  home_bills: { title: "🏠 Home Bills", addLabel: "+ Add bill", iconBg: "color-mix(in oklab, var(--accent) 15%, transparent)", icon: "🧾" },
  home_person: { title: "👨‍👩‍👦 Persons / Family", addLabel: "+ Add person", iconBg: "color-mix(in oklab, var(--secondary-dark) 15%, transparent)", icon: "👤" },
  other: { title: "📦 Other", addLabel: "+ Add", iconBg: `color-mix(in oklab, ${OTHER_BREAKDOWN} 16%, transparent)`, icon: "📝" },
};

function DelBtn({ onClick }) {
  return (
    <button
      type="button"
      className="exp-del-btn"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label="Delete"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M3 6h18M8 6V4h8v2M5 6l1 14h12l1-14" />
      </svg>
    </button>
  );
}

function AddExpenseRow({ category, onSave, onCancel }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [billDate, setBillDate] = useState("");
  const sub = category === "home_bills" ? "bills" : category === "home_person" ? "persons" : "other";
  const opts = sub === "bills" ? BILL_SUGGESTIONS : sub === "persons" ? PERSON_SUGGESTIONS : null;

  const save = () => {
    if (!name.trim() && !String(amount).trim()) {
      onCancel();
      return;
    }
    onSave({
      name: name.trim(),
      amount: Number(String(amount).replace(/,/g, "")) || 0,
      note: note.trim(),
      bill_date: billDate || null,
    });
  };

  return (
    <div className={`exp-add-form${sub === "bills" ? " exp-add-form--bills" : ""}`}>
      {opts ? (
        <select className="exp-fi exp-fi-sel" value={name} onChange={(e) => setName(e.target.value)}>
          <option value="">Select name…</option>
          {opts.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input className="exp-fi" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      )}
      <div className="exp-pkr-input">
        <span className="exp-pkr-pre">PKR</span>
        <input type="text" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      {sub === "bills" && (
        <input className="exp-fi exp-fi-mono" type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} title="Bill date" />
      )}
      <input className="exp-fi" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <button type="button" className="exp-btn-save-row" onClick={save}>Save</button>
    </div>
  );
}

function ExpenseRow({ item, category, onSave, onDelete }) {
  const [editing, setEditing] = useState(item._new || false);
  const [name, setName] = useState(item.name || "");
  const [amount, setAmount] = useState(item.amount != null ? String(item.amount) : "");
  const [note, setNote] = useState(item.note || "");
  const [billDate, setBillDate] = useState(() => toDateInputValue(item.bill_date));
  const nameRef = useRef(null);

  useEffect(() => {
    if (editing && nameRef.current) nameRef.current.focus();
  }, [editing]);

  const commit = async () => {
    if (!name.trim()) {
      onDelete(item.id, true);
      return;
    }
    await onSave(item.id, {
      name: name.trim(),
      amount: amount.trim ? amount.trim() : amount,
      note,
      bill_date: billDate || null,
    });
    setEditing(false);
  };

  const handleDeleteClick = async (e) => {
    e.stopPropagation();
    if (item._new) {
      onDelete(item.id, true);
      return;
    }
    const result = await Swal.fire({
      title: `Delete "${item.name}"?`,
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Delete",
    });
    if (result.isConfirmed) onDelete(item.id, false);
  };

  const meta = SECTION_META[category];

  if (editing) {
    return (
      <div className={`exp-add-form exp-add-form--edit${category === "home_bills" ? " exp-add-form--bills" : ""}`}>
        <input
          ref={nameRef}
          list={category === "home_bills" ? "exp-bill-suggestions" : category === "home_person" ? "exp-person-suggestions" : undefined}
          className="exp-fi"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); if (item._new) onDelete(item.id, true); } }}
          placeholder={category === "home_bills" ? "Bill name" : category === "home_person" ? "Name" : "Name"}
        />
        <div className="exp-pkr-input">
          <span className="exp-pkr-pre">PKR</span>
          <input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </div>
        {category === "home_bills" && (
          <input className="exp-fi exp-fi-mono" type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
        )}
        <input className="exp-fi" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" />
        <button type="button" className="exp-btn-save-row" onClick={commit}>Save</button>
      </div>
    );
  }

  return (
    <div
      className={`exp-txn-row${category === "home_bills" ? " exp-txn-row--with-date" : ""}`}
      onClick={() => setEditing(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setEditing(true); }}
    >
      <div className="exp-txn-icon" style={{ background: meta.iconBg }}>{meta.icon}</div>
      <div className="exp-txn-mid">
        <div className="exp-txn-name">{item.name || "—"}</div>
        {item.note && <div className="exp-txn-note">{item.note}</div>}
      </div>
      {category === "home_bills" && (
        <div className="exp-txn-date">{formatExpenseDate(item.bill_date)}</div>
      )}
      <div className="exp-txn-right">
        <span className="exp-txn-amt">PKR {fmt(item.amount)}</span>
        <DelBtn onClick={handleDeleteClick} />
      </div>
    </div>
  );
}

/**
 * Expenses — layout aligned with Activity Tracker Design System ui_kits/web/Expense.html + styles-v2.css
 * Hero uses Ring labelOnly (no arc SVG) for theme-safe, accessible summary.
 */
function Expenses({ year, month, onSelectMonthIndex }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState(0);
  const [budgetInput, setBudgetInput] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);
  const [remainingSentHome, setRemainingSentHome] = useState(false);
  const [savingSentHome, setSavingSentHome] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [adding, setAdding] = useState(null);

  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const parseBudgetIncome = () => parseFloat(String(budgetInput).replace(/,/g, "")) || 0;

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setLoading(true);
      try {
        const [bRes, eRes] = await Promise.all([
          fetch(`${API_BASE_URL}/expenses/budget?month=${month}&year=${year}`, { headers: authHeaders }),
          fetch(`${API_BASE_URL}/expenses?month=${month}&year=${year}`, { headers: authHeaders }),
        ]);
        const bData = await bRes.json();
        const eData = await eRes.json();
        const income = parseFloat(bData.total_income) || 0;
        setBudget(income);
        setBudgetInput(income > 0 ? String(income) : "");
        setRemainingSentHome(Boolean(bData.remaining_sent_home));
        setExpenses(Array.isArray(eData) ? eData : []);
      } catch (err) {
        console.error("Failed to load expenses:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, month, year]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveBudget = async () => {
    setSavingBudget(true);
    try {
      const res = await fetch(`${API_BASE_URL}/expenses/budget`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          month,
          year,
          total_income: parseBudgetIncome(),
          remaining_sent_home: remainingSentHome,
        }),
      });
      const data = await res.json();
      setBudget(parseFloat(data.total_income) || 0);
      setRemainingSentHome(Boolean(data.remaining_sent_home));
      Swal.fire({ icon: "success", title: "Budget saved!", timer: 1200, showConfirmButton: false });
    } catch (err) {
      console.error("Failed to save budget:", err);
      Swal.fire({ icon: "error", title: "Error", text: "Could not save budget." });
    } finally {
      setSavingBudget(false);
    }
  };

  const handleRemainingSentHomeChange = async (checked) => {
    const prev = remainingSentHome;
    setRemainingSentHome(checked);
    setSavingSentHome(true);
    try {
      const res = await fetch(`${API_BASE_URL}/expenses/budget`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          month,
          year,
          total_income: parseBudgetIncome(),
          remaining_sent_home: checked,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.errors?.map?.((e) => e.msg).filter(Boolean).join(" ")
          || data?.error
          || `Could not save (${res.status})`;
        throw new Error(msg);
      }
      setBudget(parseFloat(data.total_income) || 0);
      setRemainingSentHome(Boolean(data.remaining_sent_home));
    } catch (err) {
      console.error("Failed to update sent-home flag:", err);
      setRemainingSentHome(prev);
      Swal.fire({
        icon: "error",
        title: "Could not save",
        text: err?.message || "Try again. If this persists, run the DB migration for expense_budgets.remaining_sent_home.",
      });
    } finally {
      setSavingSentHome(false);
    }
  };

  const handleAdd = (category) => {
    setAdding((a) => (a === category ? null : category));
  };

  const handleSave = async (id, fields) => {
    const isNew = String(id).startsWith("new-");
    const item = expenses.find((e) => e.id === id);
    if (!item) return;
    const normalizedFields = {
      ...fields,
      amount: parseFloat(String(fields.amount).replace(/,/g, "")) || 0,
      bill_date: fields.bill_date || null,
    };
    try {
      if (isNew) {
        const res = await fetch(`${API_BASE_URL}/expenses`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ ...normalizedFields, category: item.category, month, year }),
        });
        const newExpense = await res.json();
        setExpenses((prev) => prev.map((e) => (e.id === id ? { ...newExpense } : e)));
      } else {
        const res = await fetch(`${API_BASE_URL}/expenses/${id}`, {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify(normalizedFields),
        });
        const updatedExpense = await res.json();
        setExpenses((prev) => prev.map((e) => (e.id === id ? { ...updatedExpense } : e)));
      }
    } catch (err) {
      console.error("Failed to save expense:", err);
      Swal.fire({ icon: "error", title: "Save failed", text: "Could not save this expense." });
    }
  };

  const handleSaveNewFromForm = async (category, data) => {
    if (!data.name?.trim()) {
      Swal.fire({ icon: "warning", title: "Name required", text: "Choose or enter a name for this expense." });
      return;
    }
    setAdding(null);
    try {
      const res = await fetch(`${API_BASE_URL}/expenses`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          category,
          month,
          year,
          name: data.name,
          amount: data.amount,
          note: data.note || "",
          bill_date: data.bill_date || null,
        }),
      });
      const newExpense = await res.json();
      setExpenses((prev) => [...prev, newExpense]);
    } catch (err) {
      console.error("Failed to save expense:", err);
      Swal.fire({ icon: "error", title: "Save failed", text: "Could not save this expense." });
    }
  };

  const handleDelete = async (id, skipConfirm = false) => {
    const isNew = String(id).startsWith("new-");
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    if (!isNew) {
      try {
        await fetch(`${API_BASE_URL}/expenses/${id}`, { method: "DELETE", headers: authHeaders });
      } catch (err) {
        console.error("Failed to delete expense:", err);
      }
    }
  };

  const byCategory = (cat) => expenses.filter((e) => e.category === cat && !String(e.id).startsWith("new-"));
  const total = (cat) => byCategory(cat).reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  const totalBills = total("home_bills");
  const totalPersons = total("home_person");
  const totalOther = total("other");
  const totalSpent = totalBills + totalPersons + totalOther;
  const remaining = budget - totalSpent;
  /** When marked sent home, show 0 here (funds no longer “outstanding” in this view). */
  const displayRemaining = remainingSentHome ? 0 : remaining;
  const pct = budget > 0 ? Math.min(100, Math.round((totalSpent / budget) * 100)) : 0;
  /** When remaining was sent home, treat month as fully allocated (100% in ring + bar). */
  const ringPct = remainingSentHome ? 100 : pct;
  const barPct = remainingSentHome ? 100 : pct;
  const fillColor = pct < 70 ? "var(--success)" : pct < 90 ? "var(--warning)" : "var(--danger)";
  const barFillColor = remainingSentHome ? "var(--success)" : fillColor;
  const remClass =
    remaining < 0 ? "danger" : budget > 0 && remaining / budget < 0.15 ? "warn" : "ok";
  const displayRemClass = remainingSentHome ? "ok" : remClass;

  const CATS_VIZ = [
    { label: "Home Bills", icon: "🏠", total: totalBills, color: "var(--accent)" },
    { label: "Persons / Family", icon: "👨‍👩‍👦", total: totalPersons, color: "var(--secondary-dark)" },
    { label: "Other", icon: "📦", total: totalOther, color: OTHER_BREAKDOWN },
  ];

  if (loading) {
    return (
      <div className="exp-page">
        <div className="exp-loading">
          <div className="exp-loading-spin" />
          <p>Loading expenses…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="exp-page dashboard fade-in">
      <datalist id="exp-bill-suggestions">
        {BILL_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
      </datalist>
      <datalist id="exp-person-suggestions">
        {PERSON_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
      </datalist>

      <div className="exp-month-bar">
        {MONTH_SHORT.map((m, i) => (
          <button
            key={m}
            type="button"
            className={`exp-month-tab${i + 1 === month ? " active" : ""}`}
            onClick={() => onSelectMonthIndex?.(i)}
          >
            {m} {year}
          </button>
        ))}
      </div>

      <div className="exp-hero">
        <div className="exp-hero-card exp-hero-card--main">
          <Ring
            labelOnly
            size={110}
            pct={ringPct}
            label={`${ringPct}%`}
            sub={remainingSentHome ? "complete" : "used"}
            className={remainingSentHome ? "ring--complete" : ""}
          />

          <div className="exp-hero-mid">
            <div className="exp-hero-label">Monthly budget — {MONTH_FULL[month - 1]} {year}</div>
            <div className="exp-hero-big">PKR {fmt(totalSpent)}</div>
            <div className="exp-hero-spent-note">Total spent</div>
            <div
              className={`exp-hero-remaining-inline${remainingSentHome ? " exp-hero-remaining-inline--complete" : ""}`}
            >
              {remainingSentHome ? (
                <>
                  <div className="exp-hero-sum" aria-label={`Spent ${fmt(totalSpent)} plus sent home ${fmt(remaining)} equals budget ${fmt(budget)}`}>
                    <span className="exp-hero-sum-label">Accounted</span>
                    <div className="exp-hero-sum-equation">
                      <span className="exp-hero-sum-part">PKR {fmt(totalSpent)}</span>
                      <span className="exp-hero-sum-op" aria-hidden> + </span>
                      <span className="exp-hero-sum-part exp-hero-sum-part--accent">PKR {fmt(remaining)}</span>
                      <span className="exp-hero-sum-note"> sent home</span>
                      <span className="exp-hero-sum-op" aria-hidden> = </span>
                      <span className="exp-hero-sum-total">PKR {fmt(budget)}</span>
                    </div>
                  </div>
                  <span className="exp-hero-complete-tag" aria-live="polite">
                    Complete
                  </span>
                </>
              ) : (
                <>
                  <span className="exp-hero-remaining-inline-label">Remaining</span>
                  <span className={`exp-hero-remaining-inline-amt exp-hero-remaining-inline-amt--${displayRemClass}`}>
                    PKR {fmt(displayRemaining)}
                  </span>
                </>
              )}
            </div>
            <div className="exp-budget-bar-wrap">
              <div className="exp-budget-bar-labels">
                <span>spent</span>
                <span>budget PKR {fmt(budget)}</span>
              </div>
              <div className="exp-budget-bar">
                <div
                  className="exp-budget-fill"
                  style={{ width: `${barPct}%`, background: barFillColor }}
                />
              </div>
            </div>
          </div>

          <div className="exp-hero-sep" />

          <div className="exp-hero-stat">
            <div className="exp-hero-stat-label">Budget</div>
            <div className="exp-pkr-input exp-pkr-input--tight">
              <span className="exp-pkr-pre">PKR</span>
              <input
                type="text"
                inputMode="decimal"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                onBlur={() => setBudget(parseFloat(String(budgetInput).replace(/,/g, "")) || 0)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveBudget()}
                placeholder="0"
              />
            </div>
            <button
              type="button"
              className="exp-btn-add exp-btn-add--budget"
              onClick={handleSaveBudget}
              disabled={savingBudget || savingSentHome}
            >
              {savingBudget ? "Saving…" : "Save budget"}
            </button>
          </div>

          <div className="exp-hero-sep" />

          <div className={`exp-hero-stat exp-hero-stat--remaining${remainingSentHome ? " exp-hero-stat--sent" : ""}`}>
            <div
              className={`exp-hero-stat-val exp-hero-stat-val--${displayRemClass}`}
              title={remainingSentHome ? `Calculated remaining: PKR ${fmt(remaining)}` : undefined}
            >
              PKR {fmt(displayRemaining)}
            </div>
            <div className="exp-hero-stat-sublabel">Remaining</div>
            <label
              className="exp-sent-home"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={remainingSentHome}
                disabled={savingSentHome || savingBudget}
                onChange={(e) => { void handleRemainingSentHomeChange(e.target.checked); }}
              />
              <span>Sent remaining home</span>
            </label>
            {remainingSentHome && <div className="exp-sent-badge" aria-live="polite">Sent</div>}
          </div>
        </div>
      </div>

      <div className="exp-cat-breakdown">
        <div className="exp-cat-head">
          <div className="exp-cat-head-title">Breakdown</div>
        </div>
        {CATS_VIZ.map((c) => (
          <div className="exp-cat-row" key={c.label}>
            <div className="exp-cat-name">
              <span className="exp-cat-icon">{c.icon}</span>
              {c.label}
            </div>
            <div className="exp-cat-bar-wrap">
              <div
                className="exp-cat-bar-fill"
                style={{
                  width: `${budget ? Math.min(100, (c.total / budget) * 100) : 0}%`,
                  background: c.color,
                }}
              />
            </div>
            <div className="exp-cat-amount">PKR {fmt(c.total)}</div>
          </div>
        ))}
      </div>

      {(["home_bills", "home_person", "other"]).map((cat) => {
        const meta = SECTION_META[cat];
        const list = expenses.filter((e) => e.category === cat);
        return (
          <div className="exp-txn-section" key={cat}>
            <div className="exp-txn-head">
              <div className="exp-txn-title">{meta.title}</div>
              <button type="button" className="exp-btn-add" onClick={() => handleAdd(cat)}>
                {meta.addLabel}
              </button>
            </div>
            {list.length === 0 && !adding && (
              <p className="exp-empty">No items yet. Click {meta.addLabel} to start.</p>
            )}
            {list.map((item) => (
              <ExpenseRow
                key={item.id}
                item={item}
                category={cat}
                onSave={handleSave}
                onDelete={handleDelete}
              />
            ))}
            {adding === cat && (
              <AddExpenseRow
                category={cat}
                onSave={(data) => { void handleSaveNewFromForm(cat, data); }}
                onCancel={() => setAdding(null)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default Expenses;
