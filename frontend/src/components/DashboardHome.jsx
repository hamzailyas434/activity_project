import { useEffect, useMemo, useState } from "react";
import StickyNoteModal from "./StickyNoteModal";
import { Card, CardHeader, Ring, RhythmCheck, Icon } from "./rhythm/RhythmAtoms";

function ExpBar({ cat, pct, amt }) {
  return (
    <div className="exp-bar">
      <div className="exp-bar-label">{cat}</div>
      <div className="exp-bar-track">
        <div className="exp-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="mono exp-bar-amt">{amt}</div>
    </div>
  );
}

function stripHtml(html) {
  if (!html) return "";
  const d = document.createElement("div");
  d.innerHTML = html;
  return d.textContent || d.innerText || "";
}

export default function DashboardHome({
  monthLabel,
  greetParts,
  monthNav,
  summary,
  activities,
  todayDay,
  completionKey,
  getCompletionData,
  onToggleToday,
  onValueToday,
  stickyNotes,
  stickyColors,
  onAddSticky,
  onStickyChange,
  onStickyColor,
  onDeleteSticky,
  booksSummary,
  expenseBars,
  expenseTotalFormatted,
  qazaRemaining,
  favouriteBookNotes = [],
  onOpenBooks,
  onOpenExpenses,
  setActiveTab,
}) {
  const [stickyModalId, setStickyModalId] = useState(null);
  const daily = summary?.daily;
  const pct = daily ? Math.min(100, Math.round(daily.percentage || 0)) : 0;
  const ringColor = "var(--indigo-400)";

  const openSticky = stickyNotes.find(n => n.id === stickyModalId) ?? null;

  useEffect(() => {
    if (stickyModalId == null) return;
    if (!stickyNotes.some(n => n.id === stickyModalId)) setStickyModalId(null);
  }, [stickyNotes, stickyModalId]);

  const handleAddStickyOpen = async () => {
    const created = await onAddSticky();
    if (created?.id != null) setStickyModalId(created.id);
  };

  const favNotesPreview = useMemo(() => {
    if (!favouriteBookNotes?.length) return [];
    return [...favouriteBookNotes]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 5);
  }, [favouriteBookNotes]);

  return (
    <div className="dashboard fade-in">
      <div className="greet-row">
        <div>
          <div className="greet-row-meta">
            <span className="eyebrow" style={{ marginBottom: 0 }}>
              {greetParts.dateLine}
            </span>
            <span className="eyebrow muted" style={{ marginBottom: 0 }}>
              ·
            </span>
            <span className="eyebrow" style={{ marginBottom: 0 }}>
              {monthNav.label}
            </span>
            <button type="button" className="icon-btn" aria-label="Previous month" onClick={monthNav.onPrev}>
              <Icon name="chevronL" size={14} />
            </button>
            <button type="button" className="icon-btn" aria-label="Next month" onClick={monthNav.onNext}>
              <Icon name="chevron" size={14} />
            </button>
          </div>
          <h1 className="greet">{greetParts.greeting}</h1>
        </div>
        <button type="button" className="btn-primary" onClick={() => setActiveTab("activities")}>
          <Icon name="plus" size={14} /> Add activity
        </button>
      </div>

      <div className="grid-12">
        <div className="col-span-8">
          <div className="card card-glass hero-card">
            <div className="hero-left">
              <div className="eyebrow">Today&apos;s rhythm</div>
              <div className="hero-stats">
                <div>
                  <div className="hero-num">
                    {daily ? daily.completed : 0}
                    <span className="hero-of">/ {daily ? daily.total : 0}</span>
                  </div>
                  <div className="hero-sub">activities done</div>
                </div>
                <div className="hero-div" />
                <div>
                  <div className="hero-num">—</div>
                  <div className="hero-sub">day streak</div>
                </div>
                <div className="hero-div" />
                <div>
                  <div className="hero-num">{qazaRemaining != null ? String(qazaRemaining).padStart(2, "0") : "—"}</div>
                  <div className="hero-sub">qaza remaining</div>
                </div>
              </div>
            </div>
            <Ring pct={pct} color={ringColor} size={110} label={`${pct}%`} sub="today" />
          </div>
        </div>

        <div className="col-span-4">
          <Card className="favourite-notes-dash-card">
            <CardHeader
              eyebrow="Books"
              title="Favourite notes"
              right={
                favNotesPreview.length > 0 ? (
                  <span className="favourite-notes-dash-count mono">{favouriteBookNotes.length}</span>
                ) : null
              }
            />
            <div className="favourite-notes-dash-list">
              {favNotesPreview.length === 0 ? (
                <p className="muted text-sm" style={{ margin: "4px 0 8px", lineHeight: 1.5 }}>
                  No favourite notes yet. Open Books, add a page note, and tap the heart to save it here.
                </p>
              ) : (
                favNotesPreview.map(note => {
                  const raw = stripHtml(note.content || "").trim().replace(/\s+/g, " ");
                  const snippet = raw.length > 96 ? `${raw.slice(0, 96)}…` : raw;
                  return (
                    <button
                      key={note.id}
                      type="button"
                      className="favourite-notes-dash-row"
                      onClick={onOpenBooks}
                    >
                      <span className="favourite-notes-dash-heart" aria-hidden>
                        ♥
                      </span>
                      <span className="favourite-notes-dash-body">
                        <span className="favourite-notes-dash-snippet">{snippet || "—"}</span>
                        <span className="favourite-notes-dash-meta">
                          {note.book_title || "Book"} · p.{note.page_number ?? "—"}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            <button type="button" className="btn-ghost-sm favourite-notes-dash-cta" onClick={onOpenBooks}>
              Open Books
            </button>
          </Card>
        </div>

        <div className="col-span-8 dashboard-activities-col">
          <Card>
            <CardHeader
              eyebrow={greetParts.weekday}
              title="Activities"
              right={
                <button type="button" className="btn-ghost-sm" onClick={() => setActiveTab("activities")}>
                  See all
                </button>
              }
            />
            <div className="list-rows">
              {!todayDay || activities.length === 0 ? (
                <p className="muted text-sm" style={{ padding: "8px 0" }}>
                  No activities for today in this month view, or switch to the current month.
                </p>
              ) : (
                activities.map(activity => {
                  const data = getCompletionData(activity.id, todayDay);
                  const isCompleted = typeof data.isCompleted === "boolean" ? data.isCompleted : !!data.isCompleted;
                  const value = data.value ?? "";
                  const isInput = activity.type === "number" || activity.type === "text";
                  return (
                    <div key={activity.id} className="list-row">
                      {isInput ? (
                        <span style={{ width: 20 }} />
                      ) : (
                        <RhythmCheck
                          done={isCompleted}
                          onClick={() => onToggleToday(activity.id, todayDay)}
                        />
                      )}
                      <div className={`row-title${isCompleted && !isInput ? " done" : ""}`}>{activity.name}</div>
                      <span className="mono row-meta">—</span>
                      {isInput ? (
                        <input
                          className="cell-input"
                          type={activity.type}
                          value={value}
                          onChange={e => onValueToday(activity.id, todayDay, e.target.value)}
                          onClick={e => e.stopPropagation()}
                          style={{ maxWidth: 88 }}
                        />
                      ) : (
                        <div className="mono row-meta">today</div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        <div className="col-span-4">
          <Card className="sticky-notes-card">
            <div className="sticky-notes-card__head">
              <div>
                <div className="sticky-notes-card__eyebrow">Pinned</div>
                <h3 className="sticky-notes-card__title">Sticky notes</h3>
              </div>
              <button
                type="button"
                className="sticky-notes-card__add"
                onClick={handleAddStickyOpen}
                title="Add note"
                aria-label="Add note"
              >
                <Icon name="plus" size={18} />
              </button>
            </div>
            <div className="sticky-notes-grid">
              {stickyNotes.length === 0 ? (
                <p className="sticky-notes-card__empty">
                  No notes yet. Tap + to add — click a note to edit.
                </p>
              ) : (
                stickyNotes.map((note, idx) => {
                  const raw = note.text || "";
                  const plain = stripHtml(raw).trim();
                  const titleLine = plain.split(/\n/)[0] || "Untitled note";
                  const bodyRest = plain
                    .split(/\n/)
                    .slice(1)
                    .join(" ")
                    .trim();
                  const n = stickyNotes.length;
                  const wide = n === 1 || (n === 3 && idx === 2);
                  return (
                    <button
                      key={note.id}
                      type="button"
                      className={
                        wide ? "sticky-notes-tile sticky-notes-tile--wide" : "sticky-notes-tile"
                      }
                      style={{ background: note.color }}
                      onClick={() => setStickyModalId(note.id)}
                    >
                      <span className="sticky-notes-tile__title">{titleLine.slice(0, 80)}</span>
                      {bodyRest ? (
                        <span className="sticky-notes-tile__body">{bodyRest.slice(0, 120)}</span>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </Card>
          <StickyNoteModal
            open={openSticky != null}
            note={openSticky}
            stickyColors={stickyColors}
            onClose={() => setStickyModalId(null)}
            onStickyChange={onStickyChange}
            onStickyColor={onStickyColor}
            onDeleteSticky={onDeleteSticky}
          />
        </div>

        <div className="col-span-6">
          <Card>
            <CardHeader
              eyebrow={monthLabel}
              title="Expenses"
              right={
                expenseTotalFormatted ? (
                  <span className="meta-right mono">{expenseTotalFormatted}</span>
                ) : (
                  <button type="button" className="btn-ghost-sm" onClick={onOpenExpenses}>
                    Open
                  </button>
                )
              }
            />
            {expenseBars && expenseBars.length > 0 ? (
              <div className="exp-bars">
                {expenseBars.map(row => (
                  <ExpBar key={row.cat} cat={row.cat} pct={row.pct} amt={row.amt} />
                ))}
              </div>
            ) : (
              <p className="muted text-sm">
                No expense data this month.{" "}
                <button type="button" className="btn-link" onClick={onOpenExpenses}>
                  Add expenses
                </button>
              </p>
            )}
          </Card>
        </div>

        <div className="col-span-6">
          <Card>
            <CardHeader
              eyebrow="Reading"
              title="Currently on"
              right={
                <button type="button" className="btn-ghost-sm" onClick={onOpenBooks}>
                  Library
                </button>
              }
            />
            {booksSummary?.current_book ? (
              <div className="book-row">
                <div
                  className="book-cover"
                  style={{ background: "linear-gradient(145deg, #36309C, #7C3AED)" }}
                >
                  <div className="book-title-vert">{booksSummary.current_book.title?.slice(0, 18)}</div>
                </div>
                <div className="book-info">
                  <div className="book-title">{booksSummary.current_book.title}</div>
                  <div className="book-author">{booksSummary.current_book.author || " "}</div>
                  <div className="book-prog">
                    <div
                      className="book-prog-fill"
                      style={{
                        width: `${Math.min(
                          100,
                          booksSummary.current_book.total_pages > 0
                            ? Math.round(
                                (booksSummary.current_book.current_page / booksSummary.current_book.total_pages) * 100
                              )
                            : 0
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="mono text-xs muted">
                    {booksSummary.current_book.current_page} / {booksSummary.current_book.total_pages || "—"} pp
                    {booksSummary.current_book.total_pages > 0
                      ? ` · ${Math.round(
                          (booksSummary.current_book.current_page / booksSummary.current_book.total_pages) * 100
                        )}%`
                      : ""}
                  </div>
                  <button type="button" className="btn-ghost-sm" style={{ marginTop: 8 }} onClick={onOpenBooks}>
                    Open notes
                  </button>
                </div>
              </div>
            ) : (
              <p className="muted text-sm">
                No book in progress.{" "}
                <button type="button" className="btn-link" onClick={onOpenBooks}>
                  Open Books
                </button>
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
