import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useCurrency } from "../hooks/useCurrency";
import { Card, CardHeader } from "./rhythm/RhythmAtoms";

import { API_BASE_URL } from "../config";

function Profile({ onUpdate }) {
  const { token, user: authUser } = useAuth();
  const { currency, setCurrency, options: currencyOptions } = useCurrency();
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
      }
      
      // Check profile picture
      if (profileData.profile_picture && profileData.profile_picture !== user?.profile_picture) {
        updatePayload.profile_picture = profileData.profile_picture;
      }

      if (Object.keys(updatePayload).length === 0) {
        setSuccess("Profile is already up to date.");
        setTimeout(() => setSuccess(null), 2500);
        return;
      }

      const res = await authFetch(`${API_BASE_URL}/users/profile`, {
        method: "PUT",
        body: JSON.stringify(updatePayload),
      });

      const data = await res.json();

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
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid var(--border-strong)", borderTopColor: "var(--accent)", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || "User";

  // Group activity log completions by date
  const byDay = [];
  if (activityLog?.completions?.length) {
    const seen = {};
    activityLog.completions.forEach(c => {
      const key = c.completion_date.split("T")[0];
      if (!seen[key]) { seen[key] = { date: key, items: [] }; byDay.push(seen[key]); }
      seen[key].items.push(c);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Page header */}
      <div>
        <div className="eyebrow">Account</div>
        <h1 style={{ margin: "4px 0 0", fontSize: "var(--text-2xl)", fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--fg)" }}>
          Profile
        </h1>
      </div>

      {error  && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="prf-layout">

        {/* ── Left: Avatar + Settings ───────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: "0 0 auto", width: "100%", maxWidth: 480 }}>

          {/* Avatar card */}
          <Card>
            <div className="prf-hero">
              <div className="prf-av-wrap" onClick={() => fileInputRef.current?.click()} title="Change picture">
                {profileData.profile_picture ? (
                  <img src={profileData.profile_picture} alt="Avatar" className="prf-av-img" />
                ) : (
                  <div className="prf-av-placeholder">{displayName.charAt(0).toUpperCase()}</div>
                )}
                <div className="prf-av-overlay">Change</div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
              <div className="prf-hero-info">
                <div className="prf-hero-name">{displayName}</div>
                <div className="prf-hero-email">{user?.email}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <span className="prf-badge">{user?.role || "user"}</span>
                  <span className="prf-badge prf-badge--muted">
                    Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString("default", { month: "short", year: "numeric" }) : "—"}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Settings card */}
          <Card>
            <CardHeader eyebrow="Settings" title="Edit profile" />

            <div className="profile-tabs" style={{ marginTop: 4 }}>
              <button className={activeTab === "profile" ? "active" : ""} onClick={() => setActiveTab("profile")}>Profile info</button>
              <button className={activeTab === "password" ? "active" : ""} onClick={() => setActiveTab("password")}>Password</button>
            </div>

            {activeTab === "profile" && (
              <form onSubmit={handleProfileUpdate} className="prf-form">
                <div className="prf-form-row">
                  <div className="prf-field">
                    <label className="prf-label">First name</label>
                    <input className="prf-input" type="text" value={profileData.first_name}
                      onChange={e => setProfileData({ ...profileData, first_name: e.target.value })}
                      placeholder="First name" />
                  </div>
                  <div className="prf-field">
                    <label className="prf-label">Last name</label>
                    <input className="prf-input" type="text" value={profileData.last_name}
                      onChange={e => setProfileData({ ...profileData, last_name: e.target.value })}
                      placeholder="Last name" />
                  </div>
                </div>
                <div className="prf-field">
                  <label className="prf-label">Username</label>
                  <input className="prf-input" type="text" value={profileData.username}
                    onChange={e => setProfileData({ ...profileData, username: e.target.value })}
                    required minLength={3} />
                </div>
                <div className="prf-field">
                  <label className="prf-label">Email</label>
                  <input className="prf-input" type="email" value={profileData.email}
                    onChange={e => setProfileData({ ...profileData, email: e.target.value })}
                    required />
                </div>
                <div className="prf-field">
                  <label className="prf-label">Currency</label>
                  <select className="prf-input" value={currency} onChange={e => {
                    setCurrency(e.target.value);
                    setSuccess(`Currency set to ${e.target.value}`);
                    setTimeout(() => setSuccess(null), 2000);
                  }}>
                    {currencyOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <button type="submit" className="btn-primary" style={{ alignSelf: "flex-start", marginTop: 4 }}>
                  Save changes
                </button>
              </form>
            )}

            {activeTab === "password" && (
              <form onSubmit={handlePasswordChange} className="prf-form">
                <div className="prf-field">
                  <label className="prf-label">Current password</label>
                  <input className="prf-input" type="password" value={passwordData.currentPassword}
                    onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })} required />
                </div>
                <div className="prf-field">
                  <label className="prf-label">New password</label>
                  <input className="prf-input" type="password" value={passwordData.newPassword}
                    onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })} required minLength={6} />
                </div>
                <div className="prf-field">
                  <label className="prf-label">Confirm new password</label>
                  <input className="prf-input" type="password" value={passwordData.confirmPassword}
                    onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} required minLength={6} />
                </div>
                <button type="submit" className="btn-primary" style={{ alignSelf: "flex-start", marginTop: 4 }}>
                  Change password
                </button>
              </form>
            )}
          </Card>
        </div>

        {/* ── Right: Activity log ───────────────────────────── */}
        <Card style={{ flex: 1, minWidth: 0 }}>
          <CardHeader eyebrow="History" title="Activity log" />
          {logLoading && <p className="muted text-sm" style={{ padding: "8px 0" }}>Loading…</p>}
          {!logLoading && logError && <p style={{ color: "var(--danger)", fontSize: 13 }}>{logError}</p>}
          {!logLoading && activityLog && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 420, overflowY: "auto", paddingRight: 4 }}>
              {byDay.length === 0 ? (
                <p className="muted text-sm">No completed activities yet.</p>
              ) : byDay.map(({ date, items }) => (
                <div key={date} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ minWidth: 46, fontSize: 11, fontVariantNumeric: "tabular-nums", color: "var(--fg-muted)", flexShrink: 0, paddingTop: 3, fontFamily: "var(--font-mono)" }}>
                    {new Date(date + "T12:00:00").toLocaleDateString("default", { month: "short", day: "numeric" })}
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {items.map((c, i) => (
                      <span key={i} className="prf-log-chip">
                        <span className="prf-log-dot" />
                        {c.activity_name}
                        {c.value && <span style={{ opacity: 0.55 }}>· {c.value}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              {activityLog.securityEvents?.length > 0 && (
                <>
                  <div className="eyebrow" style={{ marginTop: 8 }}>Security events</div>
                  {activityLog.securityEvents.map((e, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 13 }}>
                      <span style={{ minWidth: 46, fontSize: 11, fontVariantNumeric: "tabular-nums", color: "var(--fg-muted)", flexShrink: 0, fontFamily: "var(--font-mono)" }}>
                        {new Date(e.created_at).toLocaleDateString("default", { month: "short", day: "numeric" })}
                      </span>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: e.status_code >= 400 ? "var(--danger)" : "var(--success)" }} />
                      <span style={{ color: "var(--fg)" }}>{e.action}</span>
                      {e.status_code >= 400 && <span style={{ color: "var(--danger)", fontSize: 11 }}>({e.status_code})</span>}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}

export default Profile;
