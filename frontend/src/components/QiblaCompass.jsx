import { useState, useEffect, useRef } from "react";
import { calculateQiblaWithCompass } from "@masaajid/qibla";

function QiblaCompass() {
  const [location, setLocation] = useState(null);
  const [qibla, setQibla] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deviceOrientation, setDeviceOrientation] = useState(null);
  const canvasRef = useRef(null);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setLocation(coords);
          try {
            const result = calculateQiblaWithCompass(coords, {
              includeCardinalDirection: true,
              includeMagneticDeclination: true,
              bearingPrecision: 2,
              distancePrecision: 1,
            });
            setQibla(result);
            setError(null);
          } catch (err) {
            setError("Failed to calculate Qibla direction: " + err.message);
            console.error("Qibla calculation error:", err);
          }
          setLoading(false);
        },
        (err) => {
          setError("Location permission denied. Please enable location access.");
          setLoading(false);
          // Avoid console noise when user deliberately denied permission (code 1)
          if (err?.code !== 1) {
            console.error("Geolocation error:", err);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      setError("Geolocation is not supported by your browser");
      setLoading(false);
    }
  }, []);

  // Listen to device orientation for compass
  useEffect(() => {
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      // iOS 13+ requires permission
      const handleOrientation = (event) => {
        if (event.alpha !== null) {
          setDeviceOrientation(event.alpha);
        }
      };
      window.addEventListener("deviceorientation", handleOrientation);
      return () => window.removeEventListener("deviceorientation", handleOrientation);
    } else if (typeof DeviceOrientationEvent !== "undefined") {
      const handleOrientation = (event) => {
        if (event.alpha !== null) {
          setDeviceOrientation(event.alpha);
        }
      };
      window.addEventListener("deviceorientation", handleOrientation);
      return () => window.removeEventListener("deviceorientation", handleOrientation);
    }
  }, []);

  // Draw compass
  useEffect(() => {
    if (!canvasRef.current || !qibla) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw outer circle
    ctx.strokeStyle = "var(--border)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw cardinal directions
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "var(--text-primary)";
    
    const directions = ["N", "E", "S", "W"];
    const angles = [0, 90, 180, 270];
    directions.forEach((dir, i) => {
      const angle = angles[i] * (Math.PI / 180);
      const x = centerX + (radius - 15) * Math.sin(angle);
      const y = centerY - (radius - 15) * Math.cos(angle);
      ctx.fillText(dir, x, y);
    });

    // Calculate rotation (qibla bearing - device orientation)
    const rotation = deviceOrientation !== null 
      ? (qibla.bearing - deviceOrientation + 360) % 360
      : qibla.bearing;

    // Draw Qibla arrow
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    
    // Arrow pointing up (towards Qibla)
    ctx.fillStyle = "var(--primary-color)";
    ctx.beginPath();
    ctx.moveTo(0, -radius + 30);
    ctx.lineTo(-10, -radius + 50);
    ctx.lineTo(0, -radius + 40);
    ctx.lineTo(10, -radius + 50);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();

    // Draw center dot
    ctx.fillStyle = "var(--primary-color)";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
    ctx.fill();

    // Draw direction indicator circle
    ctx.strokeStyle = "var(--primary-color)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 10, 0, 2 * Math.PI);
    ctx.stroke();
  }, [qibla, deviceOrientation]);

  const requestOrientationPermission = async () => {
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === "granted") {
          window.addEventListener("deviceorientation", (event) => {
            if (event.alpha !== null) {
              setDeviceOrientation(event.alpha);
            }
          });
        }
      } catch (err) {
        console.error("Orientation permission error:", err);
      }
    }
  };

  if (loading) {
    return (
      <div className="qibla-card motivation-card">
        <div className="card-header">
          <h3>🧭 Qibla Direction</h3>
        </div>
        <div className="qibla-loading">
          <div className="spinner"></div>
          <p>Loading location...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="qibla-card motivation-card">
        <div className="card-header">
          <h3>🧭 Qibla Direction</h3>
        </div>
        <div className="qibla-error">
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!qibla) {
    return null;
  }

  return (
    <div className="qibla-card motivation-card">
      <div className="card-header">
        <h3>🧭 Qibla Direction</h3>
        {deviceOrientation === null && typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function" && (
          <button 
            className="btn-compass-permission" 
            onClick={requestOrientationPermission}
            title="Enable compass"
          >
            📱
          </button>
        )}
      </div>
      <div className="qibla-content">
        <div className="qibla-compass-container">
          <canvas
            ref={canvasRef}
            width={200}
            height={200}
            className="qibla-compass"
          />
        </div>
        <div className="qibla-info">
          <div className="qibla-detail">
            <span className="qibla-label">Direction:</span>
            <span className="qibla-value">{qibla.cardinalDirection || "N/A"}</span>
          </div>
          <div className="qibla-detail">
            <span className="qibla-label">Bearing:</span>
            <span className="qibla-value">{qibla.bearing}°</span>
          </div>
          {qibla.magneticBearing && (
            <div className="qibla-detail">
              <span className="qibla-label">Magnetic:</span>
              <span className="qibla-value">{qibla.magneticBearing}°</span>
            </div>
          )}
          <div className="qibla-detail">
            <span className="qibla-label">Distance:</span>
            <span className="qibla-value">{qibla.distance.toLocaleString()} km</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QiblaCompass;
