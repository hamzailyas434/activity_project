import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

import { API_BASE_URL } from "../config";

function DayDetailsModal({
  isOpen,
  onClose,
  date,
  note,
  onSaveNote,
  dayNumber,
}) {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("tasks"); // tasks | note
  const [noteText, setNoteText] = useState(note || "");
  const [tasks, setTasks] = useState([]);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskType, setNewTaskType] = useState("checkbox");
  const [loading, setLoading] = useState(false);

  // Format date for display
  const dateObj = new Date(date);
  const dateDisplay = dateObj.toLocaleDateString("default", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setNoteText(note || "");
      fetchTasks();
    }
  }, [isOpen, date, note]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/tasks?date=${date}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setTasks(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch tasks", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async e => {
    e.preventDefault();
    if (!newTaskName.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date,
          description: newTaskName.trim(),
          type: newTaskType,
        }),
      });
      if (res.ok) {
        setNewTaskName("");
        fetchTasks();
      }
    } catch (err) {
      console.error("Failed to add task", err);
    }
  };

  const handleDeleteTask = async id => {
    try {
      await fetch(`${API_BASE_URL}/tasks/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  const handleToggleTask = async task => {
    try {
      const newStatus = !task.is_completed;
      // Optimistic
      setTasks(prev =>
        prev.map(t =>
          t.id === task.id ? { ...t, is_completed: newStatus } : t
        )
      );

      await fetch(`${API_BASE_URL}/tasks/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_completed: newStatus }),
      });
    } catch (err) {
      fetchTasks(); // Revert
    }
  };

  const handleTaskValueChange = async (task, value) => {
    try {
      await fetch(`${API_BASE_URL}/tasks/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ value }),
      });
    } catch (err) {
      console.error("Failed to update value", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay fade-in" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{dateDisplay}</h2>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-tabs">
          <button
            className={`tab-btn ${activeTab === "tasks" ? "active" : ""}`}
            onClick={() => setActiveTab("tasks")}
          >
            📋 Daily Tasks {tasks.length > 0 && `(${tasks.length})`}
          </button>
          <button
            className={`tab-btn ${activeTab === "note" ? "active" : ""}`}
            onClick={() => setActiveTab("note")}
          >
            📝 Note {noteText && "•"}
          </button>
        </div>

        <div className="modal-body">
          {activeTab === "tasks" ? (
            <div className="tasks-section">
              <form onSubmit={handleAddTask} className="add-task-form">
                <input
                  type="text"
                  placeholder="Apppointment, To-Do, Reminder..."
                  value={newTaskName}
                  onChange={e => setNewTaskName(e.target.value)}
                  autoFocus
                />
                <select
                  value={newTaskType}
                  onChange={e => setNewTaskType(e.target.value)}
                  className="mini-select"
                >
                  <option value="checkbox">Check</option>
                  <option value="text">Input</option>
                </select>
                <button type="submit" className="btn btn-sm btn-primary">
                  +
                </button>
              </form>

              <div className="tasks-list">
                {loading ? (
                  <div className="spinner-sm"></div>
                ) : tasks.length === 0 ? (
                  <p className="empty-msg">No tasks for this day.</p>
                ) : (
                  tasks.map(task => (
                    <div key={task.id} className="task-item">
                      {task.type === "checkbox" ? (
                        <label className="task-checkbox-label">
                          <input
                            type="checkbox"
                            checked={!!task.is_completed}
                            onChange={() => handleToggleTask(task)}
                          />
                          <span
                            className={task.is_completed ? "completed" : ""}
                          >
                            {task.description}
                          </span>
                        </label>
                      ) : (
                        <div className="task-input-group">
                          <span className="task-label">{task.description}</span>
                          <input
                            type="text"
                            className="task-value-input"
                            defaultValue={task.value}
                            onBlur={e =>
                              handleTaskValueChange(task, e.target.value)
                            }
                            placeholder="Value..."
                          />
                        </div>
                      )}
                      <button
                        className="delete-task-btn"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        &times;
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="note-section">
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Journal entry or general note for the day..."
                rows={6}
                className="note-textarea"
              />
              <button
                className="btn btn-primary btn-block"
                onClick={() => {
                  onSaveNote(null, dayNumber, noteText);
                  // Don't close immediately, maybe show success?
                  // For now user might expect save.
                }}
              >
                Save Note
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DayDetailsModal;
