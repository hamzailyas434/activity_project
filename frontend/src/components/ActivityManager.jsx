import { useState, memo } from "react";
import { useAuth } from "../contexts/AuthContext";

import { API_BASE_URL } from "../config";

function ActivityManager({
  activities,
  year,
  month,
  previousMonthHasRoutines,
  onImportPreviousMonth,
  onActivityAdded,
  onActivityDeleted,
}) {
  const { token } = useAuth();
  const [activityName, setActivityName] = useState("");
  const [activityType, setActivityType] = useState("checkbox");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState(null);
  // Collapse the form by default when activities already exist
  const [formOpen, setFormOpen] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();

    if (!activityName.trim()) {
      setError("Activity name cannot be empty");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/activities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: activityName.trim(),
          type: activityType,
          year: year ?? new Date().getFullYear(),
          month: month ?? new Date().getMonth() + 1,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create activity");
      }

      const newActivity = await response.json();
      onActivityAdded(newActivity);
      setActivityName("");
      setActivityType("checkbox");
    } catch (err) {
      console.error("Error creating activity:", err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async activityId => {
    if (
      !confirm(
        "Remove this activity from this month only? It will still appear in past months with its data."
      )
    ) {
      return;
    }

    const params = new URLSearchParams();
    if (year != null) params.set("year", year);
    if (month != null) params.set("month", month);
    const query = params.toString() ? `?${params.toString()}` : "";

    try {
      const response = await fetch(`${API_BASE_URL}/activities/${activityId}${query}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // 404 when removing from this month can mean "already not in this month's routine" — treat as success
      const removingFromMonthOnly = year != null && month != null;
      if (response.status === 404 && removingFromMonthOnly) {
        setError(null);
        onActivityDeleted(activityId, { monthOnly: true });
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to delete activity");
      }

      setError(null);
      onActivityDeleted(activityId, removingFromMonthOnly ? { monthOnly: true } : undefined);
    } catch (err) {
      console.error("Error deleting activity:", err);
      setError("Failed to delete activity");
    }
  };

  return (
    <div className="activity-controls fade-in">
      {/* Section Header */}
      <div className="activity-section-header" onClick={() => setFormOpen(o => !o)}>
        <div className="activity-section-title">
          <span className="activity-section-icon">⚙️</span>
          <span>Manage Activities</span>
          {activities.length > 0 && (
            <span className="activity-section-count">{activities.length}</span>
          )}
        </div>
        <span className={`activity-section-chevron${formOpen ? " open" : ""}`}>›</span>
      </div>

      {/* Collapsible form area */}
      {formOpen && (
        <div className="activity-form-area">
          {(activities.length === 0 || previousMonthHasRoutines) && (
            <div className="import-routines-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={async e => {
                  e.stopPropagation();
                  setIsImporting(true);
                  setError(null);
                  try {
                    await onImportPreviousMonth?.();
                  } finally {
                    setIsImporting(false);
                  }
                }}
                disabled={isImporting}
              >
                {isImporting ? "Importing…" : "📥 Import previous month's routines"}
              </button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="activity-form">
            <div className="activity-form-field">
              <label className="activity-form-label">Activity name</label>
              <input
                type="text"
                value={activityName}
                onChange={e => setActivityName(e.target.value)}
                placeholder="e.g. Read 5 pages"
                disabled={isSubmitting}
              />
            </div>
            <div className="activity-form-field">
              <label className="activity-form-label">Type</label>
              <select
                value={activityType}
                onChange={e => setActivityType(e.target.value)}
                className="type-select"
                disabled={isSubmitting}
              >
                <option value="checkbox">☑️ Checkbox</option>
                <option value="number">🔢 Number</option>
                <option value="text">🔤 Text</option>
              </select>
            </div>
            <div className="activity-form-field activity-form-submit">
              <label className="activity-form-label">&nbsp;</label>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Adding..." : "+ Add"}
              </button>
            </div>
          </form>

          {error && (
            <div className="error" style={{ marginTop: "0.75rem" }}>
              {error}
            </div>
          )}
        </div>
      )}

      <div className="activity-list">
        {activities.length === 0 ? (
          <p
            style={{
              color: "var(--text-muted)",
              padding: "0.75rem",
              fontSize: "0.85rem",
            }}
          >
            No activities yet. Add your first activity above!
          </p>
        ) : (
          <div className="activity-chips-scroll">
            {activities.map(activity => (
              <div key={activity.id} className="activity-chip">
                <span className="activity-type-icon">
                  {activity.type === "number"
                    ? "🔢"
                    : activity.type === "text"
                    ? "🔤"
                    : "☑️"}
                </span>
                <span className="activity-chip-name">{activity.name}</span>
                <button
                  onClick={() => handleDelete(activity.id)}
                  className="activity-chip-delete"
                  title="Remove activity"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ActivityManager);
