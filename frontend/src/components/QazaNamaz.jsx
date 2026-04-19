import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "./ToastContainer";

import { API_BASE_URL } from "../config";

function QazaNamaz() {
  const { token } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [namazUpdatedAt, setNamazUpdatedAt] = useState({
    Fajr: null,
    Zuhr: null,
    Asr: null,
    Maghrib: null,
    Isha: null,
  });

  // Namaz data with rakat counts
  const namazList = [
    { name: "Fajr", rakat: 2 },
    { name: "Zuhr", rakat: 4 },
    { name: "Asr", rakat: 4 },
    { name: "Maghrib", rakat: 3 },
    { name: "Isha", rakat: 4 },
  ];

  // State to store years for each Namaz
  const [yearsData, setYearsData] = useState({
    Fajr: "",
    Zuhr: "",
    Asr: "",
    Maghrib: "",
    Isha: "",
  });

  // State to store manual adjustments (can be negative or positive)
  const [adjustments, setAdjustments] = useState({
    Fajr: 0,
    Zuhr: 0,
    Asr: 0,
    Maghrib: 0,
    Isha: 0,
  });

  // Load data on component mount
  useEffect(() => {
    if (token) {
      loadQazaNamaz();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Load Qaza Namaz data from API
  const loadQazaNamaz = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/qaza-namaz`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-cache',
      });

      if (response.ok) {
        const data = await response.json();
        
        setYearsData({
          Fajr: data.Fajr !== undefined ? String(data.Fajr) : "",
          Zuhr: data.Zuhr !== undefined ? String(data.Zuhr) : "",
          Asr: data.Asr !== undefined ? String(data.Asr) : "",
          Maghrib: data.Maghrib !== undefined ? String(data.Maghrib) : "",
          Isha: data.Isha !== undefined ? String(data.Isha) : "",
        });
        
        setAdjustments({
          Fajr: data.adjustments?.Fajr || 0,
          Zuhr: data.adjustments?.Zuhr || 0,
          Asr: data.adjustments?.Asr || 0,
          Maghrib: data.adjustments?.Maghrib || 0,
          Isha: data.adjustments?.Isha || 0,
        });

        // Set updated_at if available
        if (data.updated_at) {
          setUpdatedAt(data.updated_at);
        }
        
        // Set individual namaz updated_at timestamps
        if (data.namaz_updated_at) {
          setNamazUpdatedAt({
            Fajr: data.namaz_updated_at.Fajr || null,
            Zuhr: data.namaz_updated_at.Zuhr || null,
            Asr: data.namaz_updated_at.Asr || null,
            Maghrib: data.namaz_updated_at.Maghrib || null,
            Isha: data.namaz_updated_at.Isha || null,
          });
        }
      } else {
        console.error('Failed to load Qaza Namaz:', response.status);
      }
    } catch (error) {
      console.error("Error loading Qaza Namaz:", error);
      showToast("Error loading Qaza Namaz data", "error");
    } finally {
      setLoading(false);
    }
  };

  // Save Qaza Namaz data to API
  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/qaza-namaz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...yearsData,
          adjustments,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        showToast("Saved successfully!", "success");
        
        // Update the updated_at timestamp
        if (result.updated_at) {
          setUpdatedAt(result.updated_at);
        }
        
        // Update individual namaz timestamps
        if (result.namaz_updated_at) {
          setNamazUpdatedAt(prev => ({
            ...prev,
            ...result.namaz_updated_at,
          }));
        }
        
        // Reload data to get latest from server
        setTimeout(async () => {
          await loadQazaNamaz();
        }, 100);
      } else {
        showToast("Failed to save", "error");
      }
    } catch (error) {
      console.error("Error saving Qaza Namaz:", error);
      showToast("Error saving data", "error");
    } finally {
      setSaving(false);
    }
  };

  // Update years for a specific Namaz
  const handleYearsChange = (namazName, value) => {
    setYearsData((prev) => ({
      ...prev,
      [namazName]: value,
    }));
  };

  // Calculate days for a specific Namaz
  const calculateDays = (namazName) => {
    const years = yearsData[namazName];
    return years ? parseFloat(years) * 365 : 0;
  };

  // Calculate Qaza prayers for a specific Namaz
  const calculateQaza = (namazName) => {
    const days = calculateDays(namazName);
    const calculatedQaza = days * 1;
    return calculatedQaza + (adjustments[namazName] || 0);
  };

  // Handle subtract button click
  const handleSubtract = (namazName) => {
    setAdjustments((prev) => ({
      ...prev,
      [namazName]: (prev[namazName] || 0) - 1,
    }));
  };

  // Handle add button click
  const handleAdd = (namazName) => {
    setAdjustments((prev) => ({
      ...prev,
      [namazName]: (prev[namazName] || 0) + 1,
    }));
  };

  return (
    <div className="qaza-namaz-section fade-in">
      <ToastContainer />
      <div className="section-header">
        <h2>🕌 Qaza Namaz Calculator</h2>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      ) : (
        <div className="qaza-form">
          <div className="qaza-table">
            <table>
              <thead>
                <tr>
                  <th>Namaz</th>
                  <th>Years</th>
                  <th>Days</th>
                  <th>Qaza Prayers</th>
                  <th>Adjust</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {namazList.map((namaz) => {
                  const days = calculateDays(namaz.name);
                  const qaza = calculateQaza(namaz.name);
                  return (
                    <tr key={namaz.name}>
                      <td>
                        {namaz.name} ({namaz.rakat} rakat)
                      </td>
                      <td>
                        <input
                          type="number"
                          value={yearsData[namaz.name]}
                          onChange={(e) =>
                            handleYearsChange(namaz.name, e.target.value)
                          }
                          placeholder="Years"
                          min="0"
                          step="0.1"
                          className="years-input"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={days.toLocaleString() || "0"}
                          readOnly
                          className="readonly-input days-input"
                        />
                      </td>
                      <td className="qaza-result">
                        {qaza.toLocaleString()}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", justifyContent: "center" }}>
                          <button
                            type="button"
                            className="qaza-adjust-btn qaza-subtract-btn"
                            onClick={() => handleSubtract(namaz.name)}
                            title="Subtract 1"
                          >
                            −
                          </button>
                          <span style={{ minWidth: "30px", textAlign: "center", fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: "500" }}>
                            {adjustments[namaz.name] !== 0 ? (adjustments[namaz.name] > 0 ? `+${adjustments[namaz.name]}` : String(adjustments[namaz.name])) : "0"}
                          </span>
                          <button
                            type="button"
                            className="qaza-adjust-btn qaza-add-btn"
                            onClick={() => handleAdd(namaz.name)}
                            title="Add 1"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td>
                        {namazUpdatedAt[namaz.name] ? (
                          <small style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                            {new Date(namazUpdatedAt[namaz.name]).toLocaleString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric', 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            })}
                          </small>
                        ) : (
                          <small style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>-</small>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="qaza-form-actions">
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "💾 Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default QazaNamaz;
