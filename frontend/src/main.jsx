import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { ConfirmProvider, ToastProvider } from "./components/ui";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <ErrorBoundary>
        <ToastProvider>
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
        </ToastProvider>
      </ErrorBoundary>
    </AuthProvider>
  </StrictMode>
);
