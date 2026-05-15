import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./activities-matrix.css";
import "./rhythm-kit-layout.css";
import App from "./App.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </AuthProvider>
  </StrictMode>
);
