import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import Swal from "sweetalert2";

import { API_BASE_URL } from "../config";

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const BILL_SUGGESTIONS = ["Electricity", "PTCL", "Sui Gas", "Water"];
const PERSON_SUGGESTIONS = ["Mother", "Wife", "Father", "Sister", "Brother"];

const CATEGORY_LABELS = {
  home_bills: "Bills",
  home_person: "Persons / Family",
  other: "Other",
};

const SECTION_CATEGORIES = {
  home: ["home_bills", "home_person"],
  other: ["other"],
};

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ── Shared class snippets ─────────────────────────────────────────────────────
const inputCls = "px-[0.65rem] py-[0.45rem] border-[1.5px] border-edge rounded-lg text-[0.875rem] bg-canvas text-ink outline-none transition-[border-color] duration-150 focus:border-primary font-[inherit]";
const btnPrimary = "px-4 py-[0.45rem] text-white border-none rounded-lg text-[0.875rem] font-semibold cursor-pointer whitespace-nowrap transition-opacity duration-150 hover:opacity-90 disabled:opacity-50";
const btnSecondary = "px-3 py-[0.45rem] bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0] rounded-lg text-[0.875rem] cursor-pointer whitespace-nowrap hover:bg-[#e2e8f0] transition-[background] duration-150";

// ── Expense Row ───────────────────────────────────────────────────────────────
function ExpenseRow({ item, category, onSave, onDelete }) {
  const [editing, setEditing] = useState(item._new || false);
  const [name, setName]       = useState(item.name || "");
  const [amount, setAmount]   = useState(item.amount != null ? String(item.amount) : "");
  const [note, setNote]       = useState(item.note || "");
  const [billDate, setBillDate] = useState(item.bill_date ? item.bill_date.slice(0, 10) : "");
  const nameRef = useRef(null);

  useEffect(() => {
    if (editing && nameRef.current) nameRef.current.focus();
  }, [editing]);

  const commit = async () => {
    if (!name.trim()) { onDelete(item.id, true); return; }
    await onSave(item.id, {
      name: name.trim(),
      amount: amount.trim ? amount.trim() : amount,
      note,
      bill_date: billDate || null,
    });
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") { setEditing(false); if (item._new) onDelete(item.id, true); }
  };

  const handleDeleteClick = async (e) => {
    e.stopPropagation();
    if (item._new) { onDelete(item.id, true); return; }
    const result = await Swal.fire({
      title: `Delete "${item.name}"?`, text: "This action cannot be undone.",
      icon: "warning", showCancelButton: true,
      confirmButtonColor: "#dc2626", cancelButtonColor: "#94a3b8", confirmButtonText: "Delete",
    });
    if (result.isConfirmed) onDelete(item.id, false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary bg-canvas flex-wrap">
        <input
          ref={nameRef}
          list={category === "home_bills" ? "bill-suggestions" : category === "home_person" ? "person-suggestions" : undefined}
          className={`${inputCls} flex-1 min-w-[120px]`}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            category === "home_bills"  ? "Select or type a bill name" :
            category === "home_person" ? "Select or type a name" : "Name"
          }
        />
        {category === "home_bills" && (
          <datalist id="bill-suggestions">
            {BILL_SUGGESTIONS.map(s => <option key={s} value={s} />)}
          </datalist>
        )}
        {category === "home_person" && (
          <datalist id="person-suggestions">
            {PERSON_SUGGESTIONS.map(s => <option key={s} value={s} />)}
          </datalist>
        )}
        <div className="flex items-center gap-1 bg-canvas border border-edge rounded-lg px-2 py-[0.45rem]">
          <span className="text-xs font-bold text-ink-muted shrink-0">PKR</span>
          <input
            className="w-28 bg-transparent border-none text-ink text-sm font-semibold outline-none"
            type="text" inputMode="numeric"
            value={amount} onChange={e => setAmount(e.target.value)}
            onKeyDown={handleKeyDown} placeholder="0"
          />
        </div>
        {category === "home_bills" && (
          <input
            className={`${inputCls} text-xs`}
            type="date" value={billDate}
            onChange={e => setBillDate(e.target.value)} title="Bill date"
          />
        )}
        <input
          className={`${inputCls} flex-1 min-w-[100px]`}
          value={note} onChange={e => setNote(e.target.value)}
          onKeyDown={handleKeyDown} placeholder="Note (optional)"
        />
        <button className="px-3 py-[0.45rem] bg-ok text-white border-none rounded-lg text-sm cursor-pointer transition-opacity duration-150 hover:opacity-90" onClick={commit} title="Save">✓</button>
        <button
          className={btnSecondary}
          onClick={() => { setEditing(false); if (item._new) onDelete(item.id, true); }}
          title="Cancel"
        >✕</button>
      </div>
    );
  }

  const formattedDate = item.bill_date
    ? new Date(item.bill_date).toLocaleDateString("en-PK", { day: "2-digit", month: "short" })
    : null;

  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded-lg border border-edge bg-canvas cursor-pointer hover:border-primary hover:bg-gtint-hov transition-all duration-150"
      onClick={() => setEditing(true)}
      title="Click to edit"
    >
      <span className="text-[0.875rem] font-medium text-ink flex-1 min-w-0 truncate">
        {item.name || <em className="not-italic text-ink-muted">Unnamed</em>}
      </span>
      {formattedDate && category === "home_bills" && (
        <span className="text-xs text-primary shrink-0">📅 {formattedDate}</span>
      )}
      {item.note && (
        <span className="text-xs text-ink-muted shrink-0 max-w-[100px] truncate">{item.note}</span>
      )}
      <span className="text-sm font-bold text-primary shrink-0 ml-auto">PKR {fmt(item.amount)}</span>
      <button
        className="bg-transparent border-none cursor-pointer text-xs text-ink-muted px-1 rounded transition-all duration-150 hover:bg-[#fee2e2] hover:text-danger"
        onClick={handleDeleteClick}
        title="Delete"
      >✕</button>
    </div>
  );
}

// ── Main Expenses Component ───────────────────────────────────────────────────
function Expenses({ year, month }) {
  const { token } = useAuth();
  const [loading, setLoading]         = useState(true);
  const [budget, setBudget]           = useState(0);
  const [budgetInput, setBudgetInput] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);
  const [expenses, setExpenses]       = useState([]);

  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

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
        setExpenses(Array.isArray(eData) ? eData : []);
      } catch (err) { console.error("Failed to load expenses:", err); }
      finally { setLoading(false); }
    };
    load();
  }, [token, month, year]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveBudget = async () => {
    setSavingBudget(true);
    try {
      const res = await fetch(`${API_BASE_URL}/expenses/budget`, {
        method: "POST", headers: authHeaders,
        body: JSON.stringify({ month, year, total_income: parseFloat(String(budgetInput).replace(/,/g, "")) || 0 }),
      });
      const data = await res.json();
      setBudget(parseFloat(data.total_income) || 0);
      Swal.fire({ icon: "success", title: "Budget saved!", timer: 1200, showConfirmButton: false });
    } catch (err) {
      console.error("Failed to save budget:", err);
      Swal.fire({ icon: "error", title: "Error", text: "Could not save budget." });
    } finally { setSavingBudget(false); }
  };

  const handleAdd = (category) => {
    const tempId = `new-${Date.now()}`;
    setExpenses(prev => [...prev, { id: tempId, category, name: "", amount: 0, note: "", _new: true, month, year }]);
  };

  const handleSave = async (id, fields) => {
    const isNew = String(id).startsWith("new-");
    const item = expenses.find(e => e.id === id);
    if (!item) return;
    const normalizedFields = { ...fields, amount: parseFloat(String(fields.amount).replace(/,/g, "")) || 0, bill_date: fields.bill_date || null };
    try {
      if (isNew) {
        const res = await fetch(`${API_BASE_URL}/expenses`, {
          method: "POST", headers: authHeaders,
          body: JSON.stringify({ ...normalizedFields, category: item.category, month, year }),
        });
        const newExpense = await res.json();
        setExpenses(prev => prev.map(e => e.id === id ? { ...newExpense } : e));
      } else {
        const res = await fetch(`${API_BASE_URL}/expenses/${id}`, {
          method: "PUT", headers: authHeaders, body: JSON.stringify(normalizedFields),
        });
        const updatedExpense = await res.json();
        setExpenses(prev => prev.map(e => e.id === id ? { ...updatedExpense } : e));
      }
    } catch (err) {
      console.error("Failed to save expense:", err);
      Swal.fire({ icon: "error", title: "Save failed", text: "Could not save this expense." });
    }
  };

  const handleDelete = async (id, skipConfirm = false) => {
    const isNew = String(id).startsWith("new-");
    setExpenses(prev => prev.filter(e => e.id !== id));
    if (!isNew) {
      try { await fetch(`${API_BASE_URL}/expenses/${id}`, { method: "DELETE", headers: authHeaders }); }
      catch (err) { console.error("Failed to delete expense:", err); }
    }
  };

  const byCategory = (cat) => expenses.filter(e => e.category === cat && !String(e.id).startsWith("new-"));
  const total = (cat) => byCategory(cat).reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  const totalBills   = total("home_bills");
  const totalPersons = total("home_person");
  const totalOther   = total("other");
  const totalSpent   = totalBills + totalPersons + totalOther;
  const remaining    = budget - totalSpent;

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-ink-muted">
        <div className="w-8 h-8 border-4 border-edge border-t-primary rounded-full animate-spin-slow" />
        <p>Loading expenses…</p>
      </div>
    );
  }

  const renderSection = (sectionKey, sectionLabel, categories) => (
    <div className="glass rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-edge bg-gtint-surf">
        <h3 className="text-base font-bold text-ink m-0">{sectionLabel}</h3>
        <span className="text-sm font-bold text-primary">
          PKR {fmt(categories.reduce((s, c) => s + total(c), 0))}
        </span>
      </div>
      {categories.map(cat => (
        <div key={cat} className="border-t border-edge px-5 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-ink-muted uppercase tracking-[0.04em]">
              {CATEGORY_LABELS[cat]}
            </span>
            <button
              className="text-sm text-primary font-semibold bg-transparent border border-dashed border-primary rounded-lg px-3 py-1 cursor-pointer hover:bg-gactive transition-[background] duration-150"
              onClick={() => handleAdd(cat)}
            >
              + Add
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {expenses.filter(e => e.category === cat).length === 0 && (
              <p className="text-sm text-ink-muted italic py-1">No items yet. Click + Add to start.</p>
            )}
            {expenses.filter(e => e.category === cat).map(item => (
              <ExpenseRow
                key={item.id}
                item={item}
                category={item.category}
                onSave={handleSave}
                onDelete={handleDelete}
              />
            ))}
          </div>
          {!String(expenses.filter(e => e.category === cat).slice(-1)[0]?.id || "").startsWith("new-") && (
            <div className="text-xs font-semibold text-ink-muted pt-2 text-right">
              Subtotal: <strong>PKR {fmt(total(cat))}</strong>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="py-6 max-w-[900px] mx-auto animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-ink m-0 mb-0.5 tracking-[-0.02em]">💰 Expenses</h2>
        <p className="text-[0.9rem] text-ink-muted m-0">{MONTH_NAMES[month - 1]} {year}</p>
      </div>

      {/* ── Budget Card ── */}
      <div className="glass rounded-xl px-6 py-4 mb-4">
        <div className="text-xs font-bold text-ink-muted uppercase tracking-[0.06em] mb-2">
          Monthly Budget / Total Sent
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-canvas border border-edge rounded-lg px-3 py-[0.45rem]">
            <span className="text-xs font-bold text-ink-muted shrink-0">PKR</span>
            <input
              className="w-36 bg-transparent border-none text-ink text-sm font-semibold outline-none"
              type="text" inputMode="numeric"
              value={budgetInput}
              onChange={e => setBudgetInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSaveBudget()}
              placeholder="e.g. 50000"
            />
          </div>
          <button
            className={btnPrimary}
            style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)" }}
            onClick={handleSaveBudget}
            disabled={savingBudget}
          >
            {savingBudget ? "Saving…" : "Save Budget"}
          </button>
        </div>
      </div>

      {/* ── Expense Sections ── */}
      <div className="flex flex-col gap-4">
        {renderSection("home",  "🏠 Home Expense",  SECTION_CATEGORIES.home)}
        {renderSection("other", "📦 Other Expense", SECTION_CATEGORIES.other)}
      </div>

      {/* ── Summary ── */}
      <div className="glass rounded-xl px-6 py-4 mt-4">
        <h3 className="text-base font-bold text-ink m-0 mb-3">Summary</h3>
        <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-2">
          {[
            { label: "Monthly Budget",   value: fmt(budget),       cls: "" },
            { label: "Home Bills",        value: fmt(totalBills),   cls: "" },
            { label: "Persons / Family",  value: fmt(totalPersons), cls: "" },
            { label: "Other Expenses",    value: fmt(totalOther),   cls: "" },
            { label: "Total Spent",       value: fmt(totalSpent),   cls: "border-t border-edge pt-2" },
            { label: "Remaining",         value: fmt(remaining),    cls: `border-t border-edge pt-2 ${remaining < 0 ? "text-danger" : "text-ok"}` },
          ].map(({ label, value, cls }) => (
            <div key={label} className={`flex flex-col gap-0.5 ${cls}`}>
              <span className="text-xs text-ink-muted">{label}</span>
              <span className={`text-sm font-bold ${cls.includes("text-") ? cls.split(" ").find(c => c.startsWith("text-")) : "text-ink"}`}>
                PKR {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Expenses;
