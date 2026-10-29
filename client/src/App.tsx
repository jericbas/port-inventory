// ============================================================================
// File: client/src/App.tsx
// Description: Main Dashboard Shell & State Orchestrator
//
// What is this file?
// This is the primary root component for the Port Inventory user interface.
// It coordinates:
//   1. System stats polling (hostname, OS info, uptime, bound port).
//   2. Active listening sockets & process discovery API calls.
//   3. Reserved and unavailable port directory state.
//   4. Tab navigation between "Active Sockets" and "Reserved Ports".
//   5. Prominent display of the Personal Use Warning Banner.
//   6. 9-theme picker and single-port deep inspector dialog.
// ============================================================================

import { Activity, Clock, Globe, Radio, Server, Wifi } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { ActivePortsTable } from "./components/ActivePortsTable";
import { PortInspectorModal } from "./components/PortInspectorModal";
import { ReservedPortsList } from "./components/ReservedPortsList";
import { ThemeSelector } from "./components/ThemeSelector";
import { WarningBanner } from "./components/WarningBanner";
import type { ActivePort, ActiveTab, ReservedPort, SystemStats } from "./types";
import { formatUptime } from "./types";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("active-ports");
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [activePorts, setActivePorts] = useState<ActivePort[]>([]);
  const [reservedPorts, setReservedPorts] = useState<ReservedPort[]>([]);
  const [selectedPort, setSelectedPort] = useState<number | null>(null);
  const [loadingActive, setLoadingActive] = useState<boolean>(true);

  // Fetch real-time host telemetry
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const data: SystemStats = await res.json();
        setStats(data);
      }
    } catch {
      // Backend unreachable or booting up
    }
  }, []);

  // Fetch active listening sockets and process information
  const fetchActivePorts = useCallback(async () => {
    setLoadingActive(true);
    try {
      const res = await fetch("/api/active-ports");
      if (res.ok) {
        const data: ActivePort[] = await res.json();
        setActivePorts(data);
      }
    } catch {
      // Retried automatically on user demand
    } finally {
      setLoadingActive(false);
    }
  }, []);

  // Fetch reserved and unavailable ports catalog
  const fetchReservedPorts = useCallback(async () => {
    try {
      const res = await fetch("/api/reserved-ports");
      if (res.ok) {
        const data: ReservedPort[] = await res.json();
        setReservedPorts(data);
      }
    } catch {
      // Handled silently
    }
  }, []);

  // Initial load and periodic telemetry refresh
  useEffect(() => {
    fetchStats();
    fetchActivePorts();
    fetchReservedPorts();

    const interval = setInterval(() => {
      fetchStats();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchStats, fetchActivePorts, fetchReservedPorts]);

  const currentPort = stats ? stats.server_port : 80;

  return (
    <div className="app-container">
      {/* Header Deck: Brand, Host Telemetry & Theme Switcher */}
      <header className="header-deck">
        <div className="brand-section">
          <div className="brand-icon">
            <Radio size={22} />
          </div>
          <div>
            <h1 className="brand-title">Port Inventory</h1>
            <div className="brand-subtitle">
              Live Socket Inspector &amp; IANA Directory &bull; Bound to Port {currentPort}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "var(--bg-card)",
              padding: "0.45rem 0.75rem",
              borderRadius: "8px",
              border: "1px solid var(--border-subtle)",
              fontSize: "0.8rem",
            }}
          >
            <Globe size={14} color="var(--accent-primary)" />
            <span style={{ fontWeight: 600 }}>{stats?.hostname || "localhost"}</span>
          </div>
          <ThemeSelector />
        </div>
      </header>

      {/* Warning Banner: Personal Use & Zero-Authentication Alert */}
      <WarningBanner currentPort={currentPort} />

      {/* System Telemetry Cards Grid */}
      <section className="stats-grid">
        <div className="stat-card">
          <div>
            <div className="stat-label">Listening Sockets</div>
            <div className="stat-value">{stats ? stats.total_listening_ports : "—"}</div>
          </div>
          <Activity size={24} color="var(--color-listening)" />
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Total Connections</div>
            <div className="stat-value">{stats ? stats.total_connections : "—"}</div>
          </div>
          <Wifi size={24} color="var(--accent-primary)" />
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">System Uptime</div>
            <div className="stat-value" style={{ fontSize: "1.2rem" }}>
              {stats ? formatUptime(stats.uptime_seconds) : "—"}
            </div>
          </div>
          <Clock size={24} color="var(--color-warning)" />
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Reserved Entries</div>
            <div className="stat-value">{reservedPorts.length}</div>
          </div>
          <Server size={24} color="var(--accent-secondary)" />
        </div>
      </section>

      {/* Main Tab Navigation Deck */}
      <nav className="tab-navigation">
        <button
          type="button"
          onClick={() => setActiveTab("active-ports")}
          className={`tab-btn ${activeTab === "active-ports" ? "active" : ""}`}
        >
          <Activity size={16} />
          <span>Active Listening Sockets ({activePorts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("reserved-ports")}
          className={`tab-btn ${activeTab === "reserved-ports" ? "active" : ""}`}
        >
          <Server size={16} />
          <span>Reserved &amp; Unavailable Ports ({reservedPorts.length})</span>
        </button>
      </nav>

      {/* Tab Panels */}
      <main>
        {activeTab === "active-ports" && (
          <ActivePortsTable
            ports={activePorts}
            isLoading={loadingActive}
            onRefresh={fetchActivePorts}
            onSelectPort={(port) => setSelectedPort(port)}
          />
        )}

        {activeTab === "reserved-ports" && (
          <ReservedPortsList ports={reservedPorts} onSelectPort={(port) => setSelectedPort(port)} />
        )}
      </main>

      {/* Single Port Deep Inspection Modal */}
      {selectedPort !== null && (
        <PortInspectorModal
          port={selectedPort}
          onClose={() => setSelectedPort(null)}
          onSelectAlternative={(altPort) => setSelectedPort(altPort)}
        />
      )}
    </div>
  );
};
