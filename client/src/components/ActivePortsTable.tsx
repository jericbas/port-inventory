// ============================================================================
// File: client/src/components/ActivePortsTable.tsx
// Description: Live System Socket, Application & File Attribution Table
//
// What is this file?
// This component renders the real-time table of all active listening sockets
// discovered on the host operating system, explicitly displaying:
//   - Specific application running per port (e.g. OmniRoute, Ollama, Docker Proxy, Caddy).
//   - Specific file executing per port (script file, config file, or binary executable).
//   - Direct copy-to-clipboard for the running file path.
//   - Live search by application, file path, service, process, or port number.
//   - Interactive click handler opening the detailed PortInspectorModal.
// ============================================================================

import {
  Check,
  Copy,
  ExternalLink,
  FileCode,
  Filter,
  RefreshCw,
  Search,
  Server,
} from "lucide-react";
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
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  const handleCopyPath = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(path);
    setCopiedFile(path);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const filteredPorts = ports.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      item.port.toString().includes(term) ||
      item.app_name.toLowerCase().includes(term) ||
      Boolean(item.file_path?.toLowerCase().includes(term)) ||
      item.service_name.toLowerCase().includes(term) ||
      item.process_name.toLowerCase().includes(term) ||
      Boolean(item.pid?.toString().includes(term));

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
          <div style={{ position: "relative", width: "100%", maxWidth: "380px" }}>
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
              placeholder="Search by app, file path, port, service, or PID..."
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
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            <span>Scan</span>
          </button>
        </div>
      </div>

      {/* Main Active Ports Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: "95px" }}>Port</th>
              <th>Application Running</th>
              <th>File / Executable Path</th>
              <th>Process &amp; PID</th>
              <th>Address</th>
              <th>State</th>
              <th style={{ textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredPorts.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}
                >
                  <Server size={28} style={{ margin: "0 auto 0.4rem", opacity: 0.5 }} />
                  <p>No active listening sockets matched the query.</p>
                </td>
              </tr>
            ) : (
              filteredPorts.map((item, idx) => {
                const isListening = item.state === "LISTEN";
                const isCopied = item.file_path && copiedFile === item.file_path;
                const fileBasename = item.file_path
                  ? item.file_path.split("/").pop() || item.file_path
                  : null;

                return (
                  <tr
                    key={`${item.protocol}-${item.port}-${item.address}-${item.inode}-${idx}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => onSelectPort(item.port)}
                  >
                    {/* Port & Protocol */}
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: "0.95rem",
                            color: isListening ? "var(--accent-primary)" : "var(--text-main)",
                          }}
                        >
                          {item.port}
                        </span>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            padding: "1px 4px",
                            borderRadius: "4px",
                            background: "var(--border-subtle)",
                            color: "var(--text-muted)",
                            fontWeight: 600,
                          }}
                        >
                          {item.protocol}
                        </span>
                      </div>
                    </td>

                    {/* Specific Application Running */}
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
                            {item.app_name}
                          </span>
                        </div>
                        {item.service_name && item.service_name !== item.app_name && (
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                            {item.service_name}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Specific File Running Per Port */}
                    <td>
                      {item.file_path ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            maxWidth: "420px",
                          }}
                        >
                          <FileCode
                            size={14}
                            color="var(--accent-primary)"
                            style={{ flexShrink: 0 }}
                          />
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              overflow: "hidden",
                              minWidth: 0,
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 600,
                                fontSize: "0.78rem",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                              title={item.file_path}
                            >
                              {fileBasename}
                            </span>
                            <span
                              style={{
                                fontSize: "0.68rem",
                                color: "var(--text-muted)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                fontFamily: "monospace",
                              }}
                              title={item.file_path}
                            >
                              {item.file_path}
                            </span>
                          </div>
                          <button
                            type="button"
                            title="Copy file path"
                            onClick={(e) => {
                              if (item.file_path) {
                                handleCopyPath(e, item.file_path);
                              }
                            }}
                            style={{
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              padding: "3px",
                              color: isCopied ? "var(--color-listening)" : "var(--text-muted)",
                              flexShrink: 0,
                            }}
                          >
                            {isCopied ? <Check size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>
                          Kernel socket / Inode {item.inode}
                        </span>
                      )}
                    </td>

                    {/* Process & PID */}
                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                          {item.pid ? `PID ${item.pid}` : "Kernel Daemon"}
                        </span>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--text-muted)",
                            maxWidth: "160px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={item.process_name}
                        >
                          {item.process_name}
                        </span>
                      </div>
                    </td>

                    {/* Address */}
                    <td>
                      <code style={{ fontSize: "0.78rem" }}>{item.address}</code>
                    </td>

                    {/* Socket State */}
                    <td>
                      <span
                        className={`badge ${isListening ? "badge-listen" : "badge-established"}`}
                      >
                        {item.state}
                      </span>
                    </td>

                    {/* Inspect Details Action */}
                    <td style={{ textAlign: "right" }}>
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
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.2rem",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                        }}
                      >
                        <span>Inspect</span>
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
