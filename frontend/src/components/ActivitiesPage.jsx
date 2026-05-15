import Calendar from "./Calendar";
import MonthlyTodos from "./MonthlyTodos";
import ActivityManager from "./ActivityManager";
import { Card, CardHeader, Icon } from "./rhythm/RhythmAtoms";

/**
 * Kit CalendarScreen layout: page header + month controls, grid with calendar + sidebar.
 */
export default function ActivitiesPage({
  monthLabel,
  yearLabel,
  onPrevMonth,
  onNextMonth,
  currentYear,
  currentMonth,
  activities,
  completions,
  onToggleCompletion,
  onSaveNote,
  onValueChange,
  onActivityReorder,
  previousMonthHasRoutines,
  onImportPreviousMonth,
  onActivityAdded,
  onActivityDeleted,
  onActivityUpdated,
  authHeaders,
  summaryStats,
}) {
  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <div className="eyebrow">
            {monthLabel} {yearLabel}
          </div>
          <h1>Month at a glance</h1>
        </div>
        <div className="row-controls">
          <button type="button" className="icon-btn" onClick={onPrevMonth} aria-label="Previous month">
            <Icon name="chevronL" size={14} />
          </button>
          <button type="button" className="icon-btn" onClick={onNextMonth} aria-label="Next month">
            <Icon name="chevron" size={14} />
          </button>
        </div>
      </div>

      <div className="grid-12">
        <div className="col-span-8">
          <Calendar
            activities={activities}
            completions={completions}
            year={currentYear}
            month={currentMonth}
            onToggleCompletion={onToggleCompletion}
            onSaveNote={onSaveNote}
            onValueChange={onValueChange}
            onActivityReorder={onActivityReorder}
          />
        </div>
        <div className="col-span-4">
          <Card>
            <CardHeader eyebrow="Summary" title={`${monthLabel}`} />
            <div className="stat-list">
              {summaryStats?.map(([label, value]) => (
                <div key={label} className="stat-line">
                  <span>{label}</span>
                  <span className="mono">{value}</span>
                </div>
              ))}
            </div>
          </Card>
          <div style={{ marginTop: 16 }}>
            <MonthlyTodos month={currentMonth} year={currentYear} authHeaders={authHeaders} />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <div className="page-header" style={{ marginBottom: 16 }}>
          <div>
            <div className="eyebrow">Routines</div>
            <h2 className="card-title" style={{ fontSize: "var(--text-2xl)" }}>
              Manage activities
            </h2>
          </div>
        </div>
        <ActivityManager
          activities={activities}
          year={currentYear}
          month={currentMonth}
          previousMonthHasRoutines={previousMonthHasRoutines}
          onImportPreviousMonth={onImportPreviousMonth}
          onActivityAdded={onActivityAdded}
          onActivityDeleted={onActivityDeleted}
          onActivityUpdated={onActivityUpdated}
        />
      </div>
    </div>
  );
}
