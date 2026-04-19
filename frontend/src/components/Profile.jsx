import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";

import { API_BASE_URL } from "../config";

function Profile({ onUpdate }) {
  const { token, user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState("profile"); // profile or password
  const fileInputRef = useRef(null);

  const [activityLog, setActivityLog] = useState(null);
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState(null);

  const [profileData, setProfileData] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    profile_picture: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const authFetch = (url, options = {}) => {
    return fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  };

  useEffect(() => {
    fetchProfile();
    fetchActivityLog();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE_URL}/users/me`);
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setProfileData({
          username: data.username || "",
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          profile_picture: data.profile_picture || "",
        });
      } else {
        setError("Failed to load profile");
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLog = async () => {
    if (!token) return;
    setLogLoading(true);
    setLogError(null);
    try {
      const res = await authFetch(`${API_BASE_URL}/users/activity-log?limit=100`);
      if (res.ok) {
        setActivityLog(await res.json());
      } else {
        const err = await res.json().catch(() => ({}));
        setLogError(err.error || `Error ${res.status}`);
      }
    } catch (e) {
      console.error("Activity log fetch failed:", e);
      setLogError("Failed to load activity log");
    } finally {
      setLogLoading(false);
    }
  };

  const handleProfileUpdate = async e => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      // Only send fields that are being updated
      const updatePayload = {};
      
      // Always check username if it's different (case-insensitive comparison)
      const currentUsername = (user?.username || "").trim().toLowerCase();
      const newUsername = (profileData.username || "").trim();
      
      if (newUsername && newUsername.toLowerCase() !== currentUsername) {
        updatePayload.username = newUsername;
        console.log("Username change detected:", { current: currentUsername, new: newUsername });
      }
      
      // Check first name
      const currentFirstName = user?.first_name ? user.first_name.trim() : "";
      const newFirstName = (profileData.first_name || "").trim();
      
      if (newFirstName !== currentFirstName) {
        updatePayload.first_name = newFirstName || null;
      }
      
      // Check last name
      const currentLastName = user?.last_name ? user.last_name.trim() : "";
      const newLastName = (profileData.last_name || "").trim();
      
      if (newLastName !== currentLastName) {
        updatePayload.last_name = newLastName || null;
      }
      
      // Check email
      const currentEmail = (user?.email || "").trim().toLowerCase();
      const newEmail = (profileData.email || "").trim().toLowerCase();
      
      if (newEmail && newEmail !== currentEmail) {
        updatePayload.email = newEmail;
        console.log("Email change detected:", { current: currentEmail, new: newEmail });
      }
      
      // Check profile picture
      if (profileData.profile_picture && profileData.profile_picture !== user?.profile_picture) {
        updatePayload.profile_picture = profileData.profile_picture;
      }

      console.log("Update payload:", updatePayload);

      if (Object.keys(updatePayload).length === 0) {
        setError("No changes to save");
        return;
      }

      const res = await authFetch(`${API_BASE_URL}/users/profile`, {
        method: "PUT",
        body: JSON.stringify(updatePayload),
      });

      const data = await res.json();
      console.log("Response:", { status: res.status, data });

      if (res.ok) {
        setUser(data);
        setProfileData({
          username: data.username || "",
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          profile_picture: data.profile_picture || "",
        });
        setSuccess("Profile updated successfully!");
        if (onUpdate) onUpdate();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || data.details || "Failed to update profile");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Failed to update profile. Please try again.");
    }
  };

  const handlePasswordChange = async e => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    try {
      const res = await authFetch(`${API_BASE_URL}/users/password`, {
        method: "PUT",
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (res.ok) {
        setSuccess("Password changed successfully!");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to change password");
      }
    } catch (err) {
      console.error("Error changing password:", err);
      setError("Failed to change password");
    }
  };

  const handleImageUpload = async e => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("Image size must be less than 2MB");
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      setProfileData({ ...profileData, profile_picture: base64String });

      // Auto-save
      try {
        const res = await authFetch(`${API_BASE_URL}/users/profile`, {
          method: "PUT",
          body: JSON.stringify({
            ...profileData,
            profile_picture: base64String,
          }),
        });

        if (res.ok) {
          const updated = await res.json();
          setUser(updated);
          setSuccess("Profile picture updated!");
          if (onUpdate) onUpdate();
          setTimeout(() => setSuccess(null), 3000);
        }
      } catch (err) {
        console.error("Error updating profile picture:", err);
        setError("Failed to update profile picture");
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="profile-section">
      <div className="section-header">
        <h2>👤 Profile Settings</h2>
        {user && (user.first_name || user.last_name) && (
          <div className="profile-full-name">
            <strong>
              {[user.first_name, user.last_name].filter(Boolean).join(" ") || user.username}
            </strong>
          </div>
        )}
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {/* Profile Picture */}
      <div className="profile-picture-section">
        <div className="profile-picture-container">
          {profileData.profile_picture ? (
            <img
              src={profileData.profile_picture}
              alt="Profile"
              className="profile-picture"
            />
          ) : (
            <div className="profile-picture-placeholder">
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary btn-sm"
            style={{ marginTop: "0.5rem" }}
          >
            {profileData.profile_picture ? "Change Picture" : "Upload Picture"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: "none" }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        <button
          className={activeTab === "profile" ? "active" : ""}
          onClick={() => setActiveTab("profile")}
        >
          Profile Info
        </button>
        <button
          className={activeTab === "password" ? "active" : ""}
          onClick={() => setActiveTab("password")}
        >
          Change Password
        </button>
      </div>

      {/* Profile Info Tab */}
      {activeTab === "profile" && (
        <form onSubmit={handleProfileUpdate} className="profile-form">
          <div className="form-group">
            <label>First Name</label>
            <input
              type="text"
              value={profileData.first_name}
              onChange={e =>
                setProfileData({ ...profileData, first_name: e.target.value })
              }
              placeholder="Enter your first name"
            />
          </div>

          <div className="form-group">
            <label>Last Name</label>
            <input
              type="text"
              value={profileData.last_name}
              onChange={e =>
                setProfileData({ ...profileData, last_name: e.target.value })
              }
              placeholder="Enter your last name"
            />
          </div>

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={profileData.username}
              onChange={e =>
                setProfileData({ ...profileData, username: e.target.value })
              }
              required
              minLength={3}
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={profileData.email}
              onChange={e =>
                setProfileData({ ...profileData, email: e.target.value })
              }
              required
            />
          </div>

          <button type="submit" className="btn btn-primary">
            Update Profile
          </button>
        </form>
      )}

      {/* Password Change Tab */}
      {activeTab === "password" && (
        <form onSubmit={handlePasswordChange} className="profile-form">
          <div className="form-group">
            <label>Current Password</label>
            <input
              type="password"
              value={passwordData.currentPassword}
              onChange={e =>
                setPasswordData({
                  ...passwordData,
                  currentPassword: e.target.value,
                })
              }
              required
            />
          </div>

          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={e =>
                setPasswordData({
                  ...passwordData,
                  newPassword: e.target.value,
                })
              }
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={e =>
                setPasswordData({
                  ...passwordData,
                  confirmPassword: e.target.value,
                })
              }
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="btn btn-primary">
            Change Password
          </button>
        </form>
      )}

      {/* Account Info */}
      <div className="account-info">
        <h3>Account Information</h3>
        <div className="info-item">
          <span className="info-label">Member since:</span>
          <span className="info-value">
            {user?.created_at
              ? new Date(user.created_at).toLocaleDateString()
              : "N/A"}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">User ID:</span>
          <span className="info-value">{user?.id || "N/A"}</span>
        </div>
      </div>

      {/* Activity Log */}
      <div className="account-info" style={{ marginTop: "1.5rem" }}>
        <h3>📋 Activity Log</h3>
        {logLoading && <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Loading…</p>}
        {!logLoading && logError && <p style={{ color: "var(--danger-color, #ef4444)", fontSize: "0.875rem" }}>{logError}</p>}
        {!logLoading && activityLog && (
          <>
            {activityLog.completions.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>No completed activities yet.</p>
            ) : (() => {
              // Group completions by date
              const byDay = [];
              const seen = {};
              activityLog.completions.forEach(c => {
                const dateKey = c.completion_date.split("T")[0];
                if (!seen[dateKey]) {
                  seen[dateKey] = { date: dateKey, items: [] };
                  byDay.push(seen[dateKey]);
                }
                seen[dateKey].items.push(c);
              });
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "400px", overflowY: "auto" }}>
                  {byDay.map(({ date, items }) => (
                    <div key={date} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                      <span
                        className="info-label"
                        style={{ minWidth: "52px", fontVariantNumeric: "tabular-nums", flexShrink: 0, paddingTop: "0.15rem" }}
                      >
                        {new Date(date + "T12:00:00").toLocaleDateString("default", { month: "short", day: "numeric" })}
                      </span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", flex: 1 }}>
                        {items.map((c, i) => (
                          <span
                            key={i}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: "0.3rem",
                              background: "var(--surface, rgba(0,0,0,0.04))",
                              border: "1px solid var(--border-color, rgba(0,0,0,0.08))",
                              borderRadius: "20px",
                              padding: "0.18rem 0.65rem",
                              fontSize: "0.8rem",
                              color: "var(--text-primary)",
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary-color)", flexShrink: 0, display: "inline-block" }} />
                            {c.activity_name}
                            {c.value && <span style={{ opacity: 0.65 }}>· {c.value}</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {activityLog.securityEvents.length > 0 && (
              <>
                <h3 style={{ marginTop: "1.25rem" }}>🔒 Recent Security Events</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {activityLog.securityEvents.map((e, i) => (
                    <div key={i} className="info-item">
                      <span className="info-label" style={{ minWidth: "90px", fontVariantNumeric: "tabular-nums" }}>
                        {new Date(e.created_at).toLocaleDateString("default", { month: "short", day: "numeric" })}
                      </span>
                      <span className="info-value" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span
                          style={{
                            display: "inline-block", width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                            background: e.status_code >= 400 ? "var(--danger-color, #ef4444)" : "#22c55e",
                          }}
                        />
                        {e.action}
                        {e.resource && <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>· {e.resource}</span>}
                        {e.status_code >= 400 && (
                          <span style={{ fontSize: "0.75rem", color: "var(--danger-color, #ef4444)" }}>({e.status_code})</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Profile;
