// ============================================================================
// File: client/src/components/ActivePortsTable.tsx
// Description: Live System Socket & Process Inventory Presentation Table
//
// What is this file?
// This component renders the real-time table of all active listening and
// established network sockets discovered on the host operating system.
//
// Key capabilities:
//   - Live search by port number, service name, process name, or PID.
//   - Protocol filtering (All, TCP, UDP).
//   - State indicators (LISTENING, ESTABLISHED, TIME_WAIT).
//   - Direct process command line disclosure when authorized.
//   - Interactive click handler opening the detailed PortInspectorModal.
// ============================================================================

import { ExternalLink, Filter, RefreshCw, Search, Server } from "lucide-react";
import type React from "react";
import { useState } from "react";
import type { ActivePort } from "../types";

interface ActivePortsTableProps {
  ports: ActivePort[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelectPort: (port: number) => void;
}

export const ActivePortsTable: React.FC<ActivePortsTableProps> = ({
  ports,
  isLoading,
  onRefresh,
  onSelectPort,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [protocolFilter, setProtocolFilter] = useState<string>("ALL");

  const filteredPorts = ports.filter((item) => {
    const matchesSearch =
      item.port.toString().includes(searchTerm) ||
      item.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.process_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      Boolean(item.pid?.toString().includes(searchTerm));

    const matchesProtocol =
      protocolFilter === "ALL" || item.protocol.toUpperCase() === protocolFilter;

    return matchesSearch && matchesProtocol;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Control bar: Search, Filter, Refresh */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          background: "var(--bg-surface)",
          padding: "0.75rem 1rem",
          borderRadius: "10px",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flex: 1,
            minWidth: "260px",
          }}
        >
          <div style={{ position: "relative", width: "100%", maxWidth: "320px" }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-faint)",
              }}
            />
            <input
              type="text"
              placeholder="Search port, service, process, or PID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "0.45rem 0.65rem 0.45rem 2.1rem",
                borderRadius: "6px",
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-card)",
                color: "var(--text-main)",
                fontSize: "0.825rem",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Filter size={14} color="var(--text-muted)" />
            <select
              value={protocolFilter}
              onChange={(e) => setProtocolFilter(e.target.value)}
              style={{
                padding: "0.4rem 0.5rem",
                borderRadius: "6px",
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-card)",
                color: "var(--text-main)",
                fontSize: "0.8rem",
              }}
            >
              <option value="ALL">All Protocols</option>
              <option value="TCP">TCP Only</option>
              <option value="UDP">UDP Only</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Showing {filteredPorts.length} / {ports.length} sockets
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.4rem 0.75rem",
              borderRadius: "6px",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-card)",
              color: "var(--text-main)",
              fontSize: "0.8rem",
              cursor: isLoading ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            <RefreshCw size={13} />
            <span>Scan</span>
          </button>
        </div>
      </div>

      {/* Main Active Ports Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Port</th>
              <th>Protocol</th>
              <th>Address</th>
              <th>State</th>
              <th>PID</th>
              <th>Process Name</th>
              <th>Service</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredPorts.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}
                >
                  <Server size={28} style={{ margin: "0 auto 0.4rem", opacity: 0.5 }} />
                  <p>No active listening or connected sockets matched the query.</p>
                </td>
              </tr>
            ) : (
              filteredPorts.map((item, idx) => {
                const isListening = item.state === "LISTEN";
                return (
                  <tr
                    key={`${item.protocol}-${item.port}-${item.address}-${item.inode}-${idx}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => onSelectPort(item.port)}
                  >
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: isListening ? "var(--accent-primary)" : "var(--text-main)",
                        }}
                      >
                        {item.port}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {item.protocol}
                      </span>
                    </td>
                    <td>
                      <code style={{ fontSize: "0.8rem" }}>{item.address}</code>
                    </td>
                    <td>
                      <span
                        className={`badge ${isListening ? "badge-listen" : "badge-established"}`}
                      >
                        {item.state}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.8rem" }}>
                        {item.pid ? `PID ${item.pid}` : "System"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 600 }}>{item.process_name}</span>
                        {item.cmdline && (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              color: "var(--text-muted)",
                              maxWidth: "260px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.cmdline}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.8rem" }}>{item.service_name}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPort(item.port);
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--accent-primary)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.2rem",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                        }}
                      >
                        <span>Details</span>
                        <ExternalLink size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
