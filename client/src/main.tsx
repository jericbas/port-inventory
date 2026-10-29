// ============================================================================
// File: client/src/main.tsx
// Description: Client Application Mounting Point & Error Boundary Wrapper
//
// What is this file?
// This is the primary browser execution entry point bundled by Vite.
// It initializes:
//   1. Global CSS import cascades (themes.css for all 9 visual palettes,
//      globals.css for resets and layouts).
//   2. React 19 root container mounting to <div id="root">.
//   3. Top-level ThemeProvider context injection.
//   4. Global error boundary for capturing client-side execution exceptions.
//   5. Console banner indicating development / diagnostic mode.
//   6. Diagnostic telemetry logger for homelab operators.
// ============================================================================

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { ThemeProvider } from "./context/ThemeContext";
import "./styles/themes.css";
import "./styles/globals.css";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level application error boundary that prevents white-screen crashes
 * and provides clear debugging feedback in developer environments.
 */
class GlobalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught exception captured by GlobalErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "3rem 1.5rem",
            maxWidth: "600px",
            margin: "4rem auto",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            fontFamily: "system-ui, sans-serif",
            color: "#1f2937",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}
          >
            <span style={{ fontSize: "2rem" }}>⚠️</span>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
              Port Inventory Interface Error
            </h2>
          </div>
          <p style={{ fontSize: "0.9rem", color: "#4b5563", lineHeight: 1.6 }}>
            A client-side error occurred while rendering the socket monitoring dashboard.
          </p>
          {this.state.error && (
            <pre
              style={{
                marginTop: "1rem",
                padding: "1rem",
                backgroundColor: "#f3f4f6",
                borderRadius: "8px",
                fontSize: "0.8rem",
                overflowX: "auto",
                color: "#b91c1c",
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: "1.5rem",
              padding: "0.6rem 1.25rem",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload Dashboard
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Diagnostic logger providing terminal-style output in the browser console
 * for troubleshooting internal API responses and network latencies.
 */
function initializeDiagnosticLogger() {
  if (typeof window !== "undefined") {
    console.info(
      "%c[Port Inventory]%c Running high-performance local network socket monitor.",
      "color: #3b82f6; font-weight: bold; font-size: 1.1em;",
      "color: inherit;",
    );
    console.info(
      "%c[Notice]%c FOR PERSONAL HOMELAB USE ONLY — Zero authentication enabled.",
      "color: #f59e0b; font-weight: bold;",
      "color: inherit;",
    );
  }
}

// Execute initial diagnostics
initializeDiagnosticLogger();

// Mount React application into DOM
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Fatal: Failed to locate root element with id 'root' in document.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>,
);
