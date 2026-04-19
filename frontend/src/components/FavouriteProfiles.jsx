import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import Swal from "sweetalert2";

import { API_BASE_URL } from "../config";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

const emptyProfile = () => ({ name: "", category: "", notes: "" });
const emptyRecord  = () => ({
  month: new Date().getMonth() + 1,
  year: currentYear,
  gift_item: "",
  gift_color: "",
  note: "",
});

// ── Shared input/button class snippets ────────────────────────────────────────
const inputCls = "w-full px-[0.65rem] py-[0.45rem] border-[1.5px] border-edge rounded-lg text-[0.875rem] bg-canvas text-ink outline-none transition-[border-color] duration-150 focus:border-primary font-[inherit]";
const selectCls = `${inputCls}`;
const textareaCls = `${inputCls} resize-y`;
const btnSaveSm = "px-3 py-1 bg-[#16a34a] text-white text-xs font-semibold rounded-md border-none cursor-pointer whitespace-nowrap transition-opacity duration-150 hover:opacity-90";
const btnCancelSm = "px-3 py-1 bg-[#f1f5f9] text-[#475569] text-xs rounded-md border border-[#e2e8f0] cursor-pointer whitespace-nowrap hover:bg-[#e2e8f0] transition-[background] duration-150";
const btnIcon = "bg-transparent border-none cursor-pointer text-[0.9rem] p-1 rounded-md transition-[background] duration-150 hover:bg-gtint-hov";
const labelCls = "block text-xs font-semibold text-ink-muted uppercase tracking-[0.04em]";

// ── Category Row (inline editable) ───────────────────────────────────────────
function CategoryRow({ row, profileId, onSaved, onDelete }) {
  const { token } = useAuth();
  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const [category, setCategory] = useState(row.category || "");
  const [notes, setNotes]       = useState(row.notes || "");
  const [editing, setEditing]   = useState(row._new || false);

  const save = async () => {
    try {
      if (row._new) {
        const res = await fetch(`${API_BASE_URL}/favourite-profiles/${profileId}/categories`, {
          method: "POST", headers: authHeaders,
          body: JSON.stringify({ category, notes, sort_order: row.sort_order || 0 }),
        });
        onSaved(row.id, await res.json());
      } else {
        const res = await fetch(`${API_BASE_URL}/favourite-profiles/categories/${row.id}`, {
          method: "PUT", headers: authHeaders, body: JSON.stringify({ category, notes }),
        });
        onSaved(row.id, await res.json());
      }
      setEditing(false);
    } catch { Swal.fire({ icon: "error", title: "Save failed" }); }
  };

  const rowCls = "border-b border-[#f1f5f9] hover:bg-[#fafafa] transition-[background] duration-100";
  const cellCls = "px-3 py-[0.45rem] text-[0.84rem] text-[#334155] align-middle";

  if (editing) {
    return (
      <tr className={rowCls}>
        <td className={cellCls}>
          <input className={inputCls} value={category} onChange={e => setCategory(e.target.value)}
            placeholder="Category" autoFocus
            onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { if (row._new) onDelete(row.id); else setEditing(false); } }} />
        </td>
        <td className={cellCls}>
          <input className={inputCls} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Notes" onKeyDown={e => { if (e.key === "Enter") save(); }} />
        </td>
        <td className="px-3 py-[0.45rem] align-middle">
          <div className="flex gap-1">
            <button className={btnSaveSm} onClick={save}>✓</button>
            <button className={btnCancelSm} onClick={() => { if (row._new) onDelete(row.id); else setEditing(false); }}>✕</button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`${rowCls} cursor-pointer`} onClick={() => setEditing(true)} title="Click to edit">
      <td className={cellCls}>{category || <em className="text-ink-muted not-italic">—</em>}</td>
      <td className={`${cellCls} text-ink-muted`}>{notes || <em className="text-ink-muted not-italic">—</em>}</td>
      <td className="px-3 py-[0.45rem] align-middle">
        <button className={`${btnIcon} hover:!bg-[#fee2e2]`}
          onClick={e => { e.stopPropagation(); onDelete(row.id); }} title="Delete">🗑️</button>
      </td>
    </tr>
  );
}

// ── Monthly Record Row ────────────────────────────────────────────────────────
function RecordRow({ record, onDelete }) {
  const cellCls = "px-3 py-[0.45rem] text-[0.83rem] text-[#334155] align-middle";
  return (
    <tr className="border-b border-[#f1f5f9] hover:bg-[#fafafa] transition-[background] duration-100">
      <td className={`${cellCls} font-semibold text-[#1e293b] whitespace-nowrap`}>
        {MONTHS[record.month - 1]?.slice(0, 3)} {record.year}
      </td>
      <td className={cellCls}>{record.gift_item || "—"}</td>
      <td className={cellCls}>{record.gift_color || "—"}</td>
      <td className={`${cellCls} text-ink-muted max-w-[150px] truncate`}>{record.note || "—"}</td>
      <td className="px-3 py-[0.45rem] align-middle">
        <button className={`${btnIcon} hover:!bg-[#fee2e2]`} title="Delete record" onClick={() => onDelete(record.id)}>🗑️</button>
      </td>
    </tr>
  );
}

// ── Profile Card ─────────────────────────────────────────────────────────────
function ProfileCard({ profile, onUpdate, onDelete }) {
  const { token } = useAuth();
  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({ name: profile.name, category: profile.category || "", notes: profile.notes || "" });
  const [catRows, setCatRows] = useState([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [showCats, setShowCats]       = useState(false);
  const [records, setRecords]         = useState([]);
  const [loadingRec, setLoadingRec]   = useState(false);
  const [showRecords, setShowRecords] = useState(false);
  const [showRecForm, setShowRecForm] = useState(false);
  const [recForm, setRecForm]         = useState(emptyRecord());

  const loadCats = async () => {
    setLoadingCats(true);
    try {
      const res = await fetch(`${API_BASE_URL}/favourite-profiles/${profile.id}/categories`, { headers: authHeaders });
      const data = await res.json();
      setCatRows(Array.isArray(data) ? data : []);
    } catch { console.error("Failed to load categories"); }
    finally { setLoadingCats(false); }
  };

  const toggleCats = () => { if (!showCats) loadCats(); setShowCats(v => !v); };

  const handleAddCatRow = () => {
    const tempId = `new-${Date.now()}`;
    setCatRows(prev => [...prev, { id: tempId, category: "", notes: "", sort_order: prev.length, _new: true }]);
  };

  const handleCatSaved = (tempId, saved) => setCatRows(prev => prev.map(r => r.id === tempId ? saved : r));

  const handleDeleteCat = async (id) => {
    const isNew = String(id).startsWith("new-");
    setCatRows(prev => prev.filter(r => r.id !== id));
    if (!isNew) {
      try { await fetch(`${API_BASE_URL}/favourite-profiles/categories/${id}`, { method: "DELETE", headers: authHeaders }); }
      catch { console.error("Failed to delete category"); }
    }
  };

  const loadRecords = async () => {
    setLoadingRec(true);
    try {
      const res = await fetch(`${API_BASE_URL}/favourite-profiles/${profile.id}/records`, { headers: authHeaders });
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch { console.error("Failed to load records"); }
    finally { setLoadingRec(false); }
  };

  const toggleRecords = () => { if (!showRecords) loadRecords(); setShowRecords(v => !v); };

  const handleSaveProfile = async () => {
    if (!form.name.trim()) { Swal.fire({ icon: "warning", title: "Name required" }); return; }
    try { await onUpdate(profile.id, form); setEditing(false); }
    catch { Swal.fire({ icon: "error", title: "Save failed" }); }
  };

  const handleSaveRecord = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/favourite-profiles/${profile.id}/records`, {
        method: "POST", headers: authHeaders,
        body: JSON.stringify({ month: Number(recForm.month), year: Number(recForm.year), gift_item: recForm.gift_item, gift_color: recForm.gift_color, note: recForm.note }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setRecords(prev => {
        const idx = prev.findIndex(r => r.month === saved.month && r.year === saved.year);
        return idx >= 0 ? prev.map((r, i) => i === idx ? saved : r) : [saved, ...prev];
      });
      setShowRecForm(false);
      setRecForm(emptyRecord());
      Swal.fire({ icon: "success", title: "Record saved!", timer: 1200, showConfirmButton: false });
    } catch { Swal.fire({ icon: "error", title: "Save failed" }); }
  };

  const handleDeleteRecord = async (id) => {
    const result = await Swal.fire({ title: "Delete this record?", icon: "warning", showCancelButton: true, confirmButtonColor: "#dc2626", confirmButtonText: "Delete" });
    if (!result.isConfirmed) return;
    try {
      await fetch(`${API_BASE_URL}/favourite-profiles/records/${id}`, { method: "DELETE", headers: authHeaders });
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch { Swal.fire({ icon: "error", title: "Delete failed" }); }
  };

  const toggleBtnCls = "w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-ink cursor-pointer border-none bg-transparent hover:bg-gtint-hov transition-[background] duration-150";
  const thCls = "px-3 py-2 text-left text-[0.68rem] font-bold uppercase tracking-[0.05em] text-ink-muted bg-[#f8fafc] border-b border-edge";

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-edge">
        <div className="fp-avatar">{profile.name.charAt(0).toUpperCase()}</div>
        <div className="flex-1 min-w-0">
          {editing
            ? <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" autoFocus />
            : <h3 className="text-base font-bold text-ink m-0">{profile.name}</h3>
          }
          {!editing && profile.category && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gtint-surf text-primary font-semibold mt-0.5 inline-block">
              {profile.category}
            </span>
          )}
        </div>
        <div className="flex gap-1 ml-auto shrink-0">
          {editing ? (
            <>
              <button className={btnSaveSm} onClick={handleSaveProfile}>Save</button>
              <button className={btnCancelSm} onClick={() => { setEditing(false); setForm({ name: profile.name, category: profile.category || "", notes: profile.notes || "" }); }}>Cancel</button>
            </>
          ) : (
            <>
              <button className={btnIcon} onClick={() => setEditing(true)} title="Edit">✏️</button>
              <button className={`${btnIcon} hover:!bg-[#fee2e2]`} onClick={() => onDelete(profile.id)} title="Delete">🗑️</button>
            </>
          )}
        </div>
      </div>

      {/* Inline edit fields */}
      {editing && (
        <div className="px-5 py-3 border-b border-edge flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Category</label>
            <input className={inputCls} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Family, Work" />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Notes</label>
            <textarea className={textareaCls} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes…" />
          </div>
        </div>
      )}

      {/* Notes preview */}
      {!editing && profile.notes && (
        <div className="px-5 py-3 text-sm text-ink-sub border-b border-edge italic">{profile.notes}</div>
      )}

      {/* ── Category Rows Table ── */}
      <div className="border-t border-edge">
        <button className={toggleBtnCls} onClick={toggleCats}>
          <span>📋 Category Table</span>
          <span className="text-xs text-ink-muted">{showCats ? "▲" : "▼"}</span>
        </button>
        {showCats && (
          <div className="border-t border-edge px-4 py-3">
            {loadingCats ? (
              <p className="text-sm text-ink-muted italic text-center py-2">Loading…</p>
            ) : (
              <table className="w-full border-collapse text-[0.875rem]">
                <thead>
                  <tr>
                    <th className={thCls}>Category</th>
                    <th className={thCls}>Notes</th>
                    <th className={thCls}></th>
                  </tr>
                </thead>
                <tbody>
                  {catRows.map(row => (
                    <CategoryRow key={row.id} row={row} profileId={profile.id} onSaved={handleCatSaved} onDelete={handleDeleteCat} />
                  ))}
                </tbody>
              </table>
            )}
            <button
              className="mt-2 text-sm text-primary border border-dashed border-primary rounded-lg px-3 py-1.5 bg-transparent cursor-pointer transition-[background] duration-150 hover:bg-gactive"
              onClick={handleAddCatRow}
            >
              + Add Row
            </button>
          </div>
        )}
      </div>

      {/* ── Monthly Records ── */}
      <div className="border-t border-edge">
        <button className={toggleBtnCls} onClick={toggleRecords}>
          <span>🎁 Monthly Gift Records</span>
          <span className="text-xs text-ink-muted">{showRecords ? "▲" : "▼"}</span>
        </button>
        {showRecords && (
          <div className="border-t border-edge px-4 py-3">
            {loadingRec ? (
              <p className="text-sm text-ink-muted italic text-center py-2">Loading…</p>
            ) : records.length === 0 && !showRecForm ? (
              <p className="text-sm text-ink-muted italic text-center py-2">No records yet.</p>
            ) : (
              <table className="w-full border-collapse text-[0.875rem]">
                <thead>
                  <tr>
                    {["Month","Gift Item","Color","Note",""].map(h => (
                      <th key={h} className={thCls}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => <RecordRow key={r.id} record={r} onDelete={handleDeleteRecord} />)}
                </tbody>
              </table>
            )}

            {showRecForm ? (
              <form className="mt-3 flex flex-col gap-2" onSubmit={handleSaveRecord}>
                <div className="flex gap-2 flex-wrap">
                  <select className={`${selectCls} flex-1 min-w-[100px]`} value={recForm.month} onChange={e => setRecForm(f => ({ ...f, month: e.target.value }))}>
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                  <select className={`${selectCls} flex-1 min-w-[80px]`} value={recForm.year} onChange={e => setRecForm(f => ({ ...f, year: e.target.value }))}>
                    {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <input className={`${inputCls} flex-1 min-w-[110px]`} placeholder="Gift item" value={recForm.gift_item} onChange={e => setRecForm(f => ({ ...f, gift_item: e.target.value }))} />
                  <input className={`${inputCls} flex-1 min-w-[110px]`} placeholder="Color gifted" value={recForm.gift_color} onChange={e => setRecForm(f => ({ ...f, gift_color: e.target.value }))} />
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                  <input className={`${inputCls} flex-[2] min-w-[160px]`} placeholder="Note (optional)" value={recForm.note} onChange={e => setRecForm(f => ({ ...f, note: e.target.value }))} />
                  <button type="submit" className={btnSaveSm}>Save</button>
                  <button type="button" className={btnCancelSm} onClick={() => { setShowRecForm(false); setRecForm(emptyRecord()); }}>Cancel</button>
                </div>
              </form>
            ) : (
              <button
                className="mt-2 text-sm text-primary border border-dashed border-primary rounded-lg px-3 py-1.5 bg-transparent cursor-pointer transition-[background] duration-150 hover:bg-gactive"
                onClick={() => setShowRecForm(true)}
              >
                + Add Record
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main FavouriteProfiles Component ─────────────────────────────────────────
export default function FavouriteProfiles() {
  const { token } = useAuth();
  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [profiles, setProfiles]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newForm, setNewForm]       = useState(emptyProfile());
  const [rowCount, setRowCount]     = useState(0);
  const [newCatRows, setNewCatRows] = useState([]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/favourite-profiles`, { headers: authHeaders });
        const data = await res.json();
        setProfiles(Array.isArray(data) ? data : []);
      } catch { console.error("Failed to load profiles"); }
      finally { setLoading(false); }
    })();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRowCountChange = (val) => {
    const n = Math.max(0, Math.min(20, parseInt(val) || 0));
    setRowCount(n);
    setNewCatRows(Array.from({ length: n }, (_, i) => ({ _tempIdx: i, category: "", notes: "" })));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newForm.name.trim()) { Swal.fire({ icon: "warning", title: "Name is required" }); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/favourite-profiles`, {
        method: "POST", headers: authHeaders, body: JSON.stringify(newForm),
      });
      const created = await res.json();

      for (let i = 0; i < newCatRows.length; i++) {
        const row = newCatRows[i];
        if (row.category.trim() || row.notes.trim()) {
          await fetch(`${API_BASE_URL}/favourite-profiles/${created.id}/categories`, {
            method: "POST", headers: authHeaders,
            body: JSON.stringify({ category: row.category, notes: row.notes, sort_order: i }),
          });
        }
      }

      setProfiles(prev => [...prev, created]);
      setNewForm(emptyProfile());
      setNewCatRows([]);
      setRowCount(0);
      setShowAddForm(false);
      Swal.fire({ icon: "success", title: "Profile created!", timer: 1200, showConfirmButton: false });
    } catch { Swal.fire({ icon: "error", title: "Failed to create profile" }); }
  };

  const handleUpdate = async (id, fields) => {
    const res = await fetch(`${API_BASE_URL}/favourite-profiles/${id}`, {
      method: "PUT", headers: authHeaders, body: JSON.stringify(fields),
    });
    if (!res.ok) throw new Error("Update failed");
    const updated = await res.json();
    setProfiles(prev => prev.map(p => p.id === id ? updated : p));
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Delete this profile?", text: "All records will also be deleted.",
      icon: "warning", showCancelButton: true, confirmButtonColor: "#dc2626", confirmButtonText: "Delete",
    });
    if (!result.isConfirmed) return;
    try {
      await fetch(`${API_BASE_URL}/favourite-profiles/${id}`, { method: "DELETE", headers: authHeaders });
      setProfiles(prev => prev.filter(p => p.id !== id));
    } catch { Swal.fire({ icon: "error", title: "Delete failed" }); }
  };

  const thCls = "px-3 py-2 text-left text-[0.68rem] font-bold uppercase tracking-[0.05em] text-ink-muted bg-[#f8fafc] border-b border-edge";

  return (
    <div className="py-6 max-w-[960px] mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-extrabold text-ink m-0 mb-1 tracking-[-0.02em]">
            ⭐ Favourite Profiles
          </h2>
          <p className="text-[0.88rem] text-ink-muted m-0">
            Store preferences and monthly gift records for your loved ones
          </p>
        </div>
        <button
          className="px-[1.2rem] py-[0.55rem] text-white border-none rounded-[10px] text-[0.875rem] font-semibold cursor-pointer whitespace-nowrap transition-all duration-150 hover:opacity-90 hover:translate-y-[-1px]"
          style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)" }}
          onClick={() => setShowAddForm(v => !v)}
        >
          {showAddForm ? "✕ Cancel" : "+ New Profile"}
        </button>
      </div>

      {/* Add Profile Form */}
      {showAddForm && (
        <form
          className="bg-surface border-[1.5px] border-[#fecaca] rounded-2xl px-6 py-5 mb-6"
          onSubmit={handleCreate}
        >
          <h3 className="text-[0.95rem] font-bold text-[#dc2626] m-0 mb-4">New Profile</h3>
          <div className="grid grid-cols-2 gap-3 mb-4 max-sm:grid-cols-1">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Name *</label>
              <input className={inputCls} value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Mother, Wife" autoFocus />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Category</label>
              <input className={inputCls} value={newForm.category} onChange={e => setNewForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Family, Work" />
            </div>
            <div className="flex flex-col gap-1 col-span-2 max-sm:col-span-1">
              <label className={labelCls}>Notes</label>
              <textarea className={textareaCls} value={newForm.notes} onChange={e => setNewForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any extra details…" rows={2} />
            </div>
            <div className="flex flex-col gap-1 col-span-2 max-sm:col-span-1">
              <label className={labelCls}>How many category rows?</label>
              <input
                className={`${inputCls} max-w-[200px]`}
                type="text" inputMode="numeric"
                value={rowCount || ""} onChange={e => handleRowCountChange(e.target.value)}
                placeholder="Enter a number, e.g. 4"
              />
            </div>
            {newCatRows.length > 0 && (
              <div className="col-span-2 max-sm:col-span-1 overflow-x-auto">
                <table className="w-full border-collapse text-[0.875rem]">
                  <thead>
                    <tr>
                      <th className={`${thCls} w-8`}>#</th>
                      <th className={thCls}>Category</th>
                      <th className={thCls}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newCatRows.map((row, i) => (
                      <tr key={i} className="border-b border-[#f1f5f9]">
                        <td className="px-3 py-[0.45rem] text-xs text-ink-muted text-center">{i + 1}</td>
                        <td className="px-3 py-[0.45rem]">
                          <input className={inputCls} value={row.category}
                            onChange={e => setNewCatRows(prev => prev.map((r, idx) => idx === i ? { ...r, category: e.target.value } : r))}
                            placeholder="Category" />
                        </td>
                        <td className="px-3 py-[0.45rem]">
                          <input className={inputCls} value={row.notes}
                            onChange={e => setNewCatRows(prev => prev.map((r, idx) => idx === i ? { ...r, notes: e.target.value } : r))}
                            placeholder="Notes" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button type="submit"
              className="px-5 py-2 text-white border-none rounded-lg text-[0.875rem] font-semibold cursor-pointer transition-opacity duration-150 hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)" }}
            >
              Create Profile
            </button>
            <button type="button" className={btnCancelSm}
              onClick={() => { setShowAddForm(false); setNewForm(emptyProfile()); setNewCatRows([]); setRowCount(0); }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Profiles list */}
      {loading ? (
        <div className="flex flex-col items-center gap-4 py-16 text-ink-muted">
          <div className="w-8 h-8 border-4 border-edge border-t-primary rounded-full animate-spin-slow" />
          <p>Loading profiles…</p>
        </div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-16 text-ink-muted">
          <p className="text-4xl mb-2">⭐</p>
          <p>No profiles yet. Click + New Profile to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
          {profiles.map(p => (
            <ProfileCard key={p.id} profile={p} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
