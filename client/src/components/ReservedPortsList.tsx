// ============================================================================
// File: client/src/components/ReservedPortsList.tsx
// Description: Reserved, System & Unavailable Ports Directory
//
// What is this file?
// This component presents the definitive catalog of IANA standardized ports,
// system privileged ranges (0-1023), and common enterprise registered ports.
//
// Key features:
//   - Identifies whether a reserved port is currently ACTIVE on the host,
//     PRIVILEGED (requires root / CAP_NET_BIND_SERVICE), or AVAILABLE.
//   - Filtering by category (Web, Database, Remote Access, DevOps, etc.).
//   - Outlines security risks, attack surfaces, and official RFC standards.
//   - Provides click-through access to inspect deep details for any port.
// ============================================================================

import { CheckCircle, ExternalLink, Lock, Search, ShieldAlert, Tag } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useCustomNames } from "../hooks/useCustomNames";
import type { PortCategory, ReservedPort } from "../types";

interface ReservedPortsListProps {
  ports: ReservedPort[];
  onSelectPort: (port: number) => void;
}

export const ReservedPortsList: React.FC<ReservedPortsListProps> = ({ ports, onSelectPort }) => {
  const { customNames } = useCustomNames();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const categories: { key: string; label: string }[] = [
    { key: "all", label: "All Categories" },
    { key: "web-services", label: "Web Services" },
    { key: "database", label: "Databases" },
    { key: "remote-access", label: "Remote Access" },
    { key: "cloud-dev-ops", label: "Cloud & DevOps" },
    { key: "core-network", label: "Core Network" },
    { key: "messaging", label: "Messaging / Mail" },
    { key: "security", label: "Security & Auth" },
  ];

  const filtered = ports.filter((item) => {
    const customName = customNames[item.port] || item.custom_name || "";
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      item.port.toString().includes(term) ||
      customName.toLowerCase().includes(term) ||
      item.service_name.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term) ||
      item.security_note.toLowerCase().includes(term);

    const matchesCat =
      selectedCategory === "all" || item.category === (selectedCategory as PortCategory);

    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "active" && item.availability === "active") ||
      (selectedStatus === "privileged" && item.availability === "privileged") ||
      (selectedStatus === "available" && item.availability === "available");

    return matchesSearch && matchesCat && matchesStatus;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Filtering Deck */}
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
            gap: "0.5rem",
            flex: 1,
            minWidth: "260px",
          }}
        >
          <div style={{ position: "relative", width: "100%", maxWidth: "300px" }}>
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
              placeholder="Search reserved port, RFC, or daemon..."
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

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: "0.45rem 0.65rem",
              borderRadius: "6px",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-card)",
              color: "var(--text-main)",
              fontSize: "0.825rem",
            }}
          >
            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              padding: "0.45rem 0.65rem",
              borderRadius: "6px",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-card)",
              color: "var(--text-main)",
              fontSize: "0.825rem",
            }}
          >
            <option value="all">All Availability</option>
            <option value="active">Active On Host</option>
            <option value="privileged">Privileged (0-1023)</option>
            <option value="available">Available To Bind</option>
          </select>
        </div>

        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          Showing {filtered.length} of {ports.length} reserved ports
        </span>
      </div>

      {/* Reserved Ports Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Port</th>
              <th>Protocol</th>
              <th>Standard Service</th>
              <th>Host Availability</th>
              <th>Purpose & Description</th>
              <th>Security / Risk Note</th>
              <th>RFC Ref</th>
              <th>Inspect</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const isHostActive = item.availability === "active";
              const isPrivileged = item.is_privileged;

              return (
                <tr
                  key={`reserved-${item.port}-${item.protocol}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => onSelectPort(item.port)}
                >
                  <td>
                    <span style={{ fontWeight: 700, color: "var(--text-main)" }}>{item.port}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {item.protocol}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontWeight: 600, color: "var(--accent-primary)" }}>
                        {item.service_name}
                      </span>
                      {(customNames[item.port] || item.custom_name) && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.2rem",
                            fontSize: "0.72rem",
                            color: "var(--accent-secondary)",
                            fontWeight: 600,
                          }}
                        >
                          <Tag size={10} />
                          <span>{customNames[item.port] || item.custom_name}</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {isHostActive ? (
                      <span className="badge badge-listen">
                        <CheckCircle size={11} /> Busy / In-Use
                      </span>
                    ) : isPrivileged ? (
                      <span className="badge badge-privileged">
                        <Lock size={11} /> Privileged (Root)
                      </span>
                    ) : (
                      <span className="badge badge-established">Available</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-main)" }}>
                      {item.description}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <ShieldAlert
                        size={14}
                        color="var(--color-warning)"
                        style={{ flexShrink: 0 }}
                      />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {item.security_note}
                      </span>
                    </div>
                  </td>
                  <td>
                    {item.rfc_reference ? (
                      <code
                        style={{
                          fontSize: "0.75rem",
                          background: "var(--bg-badge)",
                          padding: "2px 5px",
                          borderRadius: "4px",
                        }}
                      >
                        {item.rfc_reference}
                      </code>
                    ) : (
                      <span style={{ color: "var(--text-faint)", fontSize: "0.75rem" }}>—</span>
                    )}
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
                      <span>Check</span>
                      <ExternalLink size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
