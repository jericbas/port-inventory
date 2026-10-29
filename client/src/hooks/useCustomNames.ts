// ============================================================================
// File: client/src/hooks/useCustomNames.ts
// Description: State Management & Persistence for User Custom Port Names/Aliases
//
// What is this file?
// This hook enables users to assign friendly, human-readable aliases to any
// port number (e.g. "Main Postgres DB", "Dev Vite Server", "OmniRoute AI Gateway").
//
// Persistence:
// 1. Stored locally in browser `localStorage` for immediate, zero-latency access.
// 2. Synced asynchronously with the backend `/api/custom-names` REST API so aliases
//    persist across container restarts and can be shared across local clients.
// 3. Reactively dispatches storage events so updates reflect across all components.
// ============================================================================

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "port_inventory_custom_names";
const CUSTOM_EVENT = "port_custom_names_changed";

function loadFromStorage(): Record<number, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const result: Record<number, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      const portNum = Number.parseInt(k, 10);
      if (!Number.isNaN(portNum) && typeof v === "string") {
        result[portNum] = v;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function saveToStorage(data: Record<number, string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage quota or disabled
  }
}

export function useCustomNames() {
  const [customNames, setCustomNames] = useState<Record<number, string>>(loadFromStorage);

  // Sync with backend API on mount
  useEffect(() => {
    let isMounted = true;
    fetch("/api/custom-names")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to fetch custom names from server");
      })
      .then((serverNames: Record<string, string>) => {
        if (!isMounted) return;
        setCustomNames((prev) => {
          const merged: Record<number, string> = { ...prev };
          for (const [k, v] of Object.entries(serverNames)) {
            const portNum = Number.parseInt(k, 10);
            if (!Number.isNaN(portNum) && typeof v === "string") {
              merged[portNum] = v;
            }
          }
          saveToStorage(merged);
          return merged;
        });
      })
      .catch(() => {
        // Fallback to local storage if API is not available
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for storage and custom sync events across tabs and components
  useEffect(() => {
    const handleSync = () => {
      setCustomNames(loadFromStorage());
    };

    window.addEventListener("storage", handleSync);
    window.addEventListener(CUSTOM_EVENT, handleSync);

    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener(CUSTOM_EVENT, handleSync);
    };
  }, []);

  const setPortName = useCallback((port: number, name: string) => {
    const trimmed = name.trim();
    setCustomNames((prev) => {
      const next = { ...prev };
      if (!trimmed) {
        delete next[port];
      } else {
        next[port] = trimmed;
      }
      saveToStorage(next);
      window.dispatchEvent(new Event(CUSTOM_EVENT));
      return next;
    });

    // Send async update to backend
    if (!trimmed) {
      fetch(`/api/custom-names/${port}`, { method: "DELETE" }).catch(() => {});
    } else {
      fetch(`/api/custom-names/${port}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      }).catch(() => {});
    }
  }, []);

  const removePortName = useCallback((port: number) => {
    setCustomNames((prev) => {
      const next = { ...prev };
      delete next[port];
      saveToStorage(next);
      window.dispatchEvent(new Event(CUSTOM_EVENT));
      return next;
    });

    fetch(`/api/custom-names/${port}`, { method: "DELETE" }).catch(() => {});
  }, []);

  return {
    customNames,
    setPortName,
    removePortName,
  };
}
