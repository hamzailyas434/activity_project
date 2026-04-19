import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";

import { API_BASE_URL } from "../config";

function ProfileDropdown({ user: authUser, onLogout, onNavigateToProfile }) {
  const { token } = useAuth();
  const [user, setUser] = useState(authUser);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchUserProfile();
  }, [token]);

  useEffect(() => {
    const handleClickOutside = event => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const authFetch = (url, options = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  };

  const fetchUserProfile = async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/users/me`);
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  return (
    <>
      <div className="profile-dropdown-container" ref={dropdownRef}>
        <button
          className="profile-dropdown-trigger"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          {user?.profile_picture ? (
            <img
              src={user.profile_picture}
              alt={user?.username || "User"}
              className="profile-avatar"
            />
          ) : (
            <div className="profile-avatar-placeholder">
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </div>
          )}
          <span className="profile-username">
            {[user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || "User"}
          </span>
          <span className="dropdown-arrow">▼</span>
        </button>

        {showDropdown && (
          <div className="profile-dropdown-menu">
            <div className="dropdown-header">
              <div className="dropdown-user-info">
                {user?.profile_picture ? (
                  <img
                    src={user.profile_picture}
                    alt={user?.username || "User"}
                    className="dropdown-avatar"
                  />
                ) : (
                  <div className="dropdown-avatar-placeholder">
                    {user?.username?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
                <div>
                  <div className="dropdown-username">
                    {user?.username || "User"}
                  </div>
                  <div className="dropdown-email">{user?.email || ""}</div>
                </div>
              </div>
            </div>
            <div className="dropdown-divider"></div>
            <button
              className="dropdown-item"
              onClick={() => {
                if (onNavigateToProfile) {
                  onNavigateToProfile();
                }
                setShowDropdown(false);
              }}
            >
              <span>👤</span> Profile Settings
            </button>
            <button className="dropdown-item" onClick={onLogout}>
              <span>🚪</span> Logout
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default ProfileDropdown;
