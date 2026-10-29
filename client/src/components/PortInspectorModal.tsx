// ============================================================================
// File: client/src/components/PortInspectorModal.tsx
// Description: Detailed Single-Port Diagnostic & Inspection Dialog
//
// What is this file?
// This modal component delivers a comprehensive operational report when a user
// clicks on any port. It queries the `/api/inspect/:port` endpoint and presents:
//   - Official IANA reservation and RFC standard metadata.
//   - Active host processes currently bound to the socket (PID, executable, cmdline).
//   - Privilege analysis (whether root or CAP_NET_BIND_SERVICE is needed).
//   - Operational bind verdict (can a developer deploy a service on this port right now?).
//   - Suggested clean alternative unreserved ports if this one is blocked.
// ============================================================================

import { AlertCircle, CheckCircle, Copy, Server, Shield, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import type { PortDetail } from "../types";

interface PortInspectorModalProps {
  port: number | null;
  onClose: () => void;
  onSelectAlternative: (port: number) => void;
}

export const PortInspectorModal: React.FC<PortInspectorModalProps> = ({
  port,
  onClose,
  onSelectAlternative,
}) => {
  const [detail, setDetail] = useState<PortDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!port) return;
    setLoading(true);

    fetch(`/api/inspect/${port}`)
      .then((res) => res.json())
      .then((data: PortDetail) => {
        setDetail(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [port]);

  if (!port) return null;

  const copyBindCommand = () => {
    navigator.clipboard.writeText(`PORT=${port} cargo run --release`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid var(--border-subtle)",
            paddingBottom: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Server size={22} color="var(--accent-primary)" />
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-main)" }}>
              Port {port} Diagnostic
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {loading || !detail ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            Analyzing port {port} sockets and IANA database...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
            {/* Operational Verdict Banner */}
            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                background:
                  detail.active_bindings.length > 0
                    ? "var(--color-danger-bg)"
                    : "var(--color-listening-bg)",
                border: `1px solid ${detail.active_bindings.length > 0 ? "var(--color-danger)" : "var(--color-listening)"}`,
                color: "var(--text-main)",
                fontSize: "0.85rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              {detail.active_bindings.length > 0 ? (
                <AlertCircle size={18} color="var(--color-danger)" />
              ) : (
                <CheckCircle size={18} color="var(--color-listening)" />
              )}
              <span>{detail.bind_verdict}</span>
            </div>

            {/* Standard Specification */}
            {detail.reservation ? (
              <div
                style={{
                  background: "var(--bg-card)",
                  padding: "0.85rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    color: "var(--text-muted)",
                  }}
                >
                  IANA Standard Assignment
                </span>
                <div style={{ fontSize: "1rem", fontWeight: 700, marginTop: "4px" }}>
                  {detail.reservation.service_name} ({detail.reservation.protocol})
                </div>
                <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  {detail.reservation.description}
                </p>
                {detail.reservation.security_note && (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      fontSize: "0.775rem",
                      color: "var(--color-warning)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    <Shield size={14} />
                    <span>Risk Profile: {detail.reservation.security_note}</span>
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  background: "var(--bg-card)",
                  padding: "0.85rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  No dedicated IANA standard reservation registered for Port {port}.
                </span>
              </div>
            )}

            {/* Active Host Processes */}
            <div>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-main)" }}>
                Active Host Processes ({detail.active_bindings.length})
              </span>
              {detail.active_bindings.length === 0 ? (
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  No host processes are currently listening or connected on this port.
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    marginTop: "0.5rem",
                  }}
                >
                  {detail.active_bindings.map((b, i) => (
                    <div
                      key={`bind-${i}-${b.inode}`}
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                        padding: "0.6rem 0.75rem",
                        borderRadius: "6px",
                        fontSize: "0.8rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <strong>{b.process_name}</strong>
                        <span className="badge badge-listen">{b.state}</span>
                      </div>
                      <div
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.75rem",
                          marginTop: "2px",
                        }}
                      >
                        PID: {b.pid ? b.pid : "Kernel / Foreign"} | Address: {b.address}
                      </div>
                      {b.cmdline && (
                        <code
                          style={{
                            display: "block",
                            marginTop: "4px",
                            fontSize: "0.725rem",
                            color: "var(--text-muted)",
                            wordBreak: "break-all",
                          }}
                        >
                          {b.cmdline}
                        </code>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Suggested Alternative Ports */}
            {detail.suggested_alternatives.length > 0 && (
              <div>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-main)" }}>
                  Suggested Alternative Ports
                </span>
                <div
                  style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem", flexWrap: "wrap" }}
                >
                  {detail.suggested_alternatives.map((alt) => (
                    <button
                      key={alt}
                      type="button"
                      onClick={() => onSelectAlternative(alt)}
                      style={{
                        padding: "0.3rem 0.6rem",
                        borderRadius: "6px",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--accent-primary)",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                      }}
                    >
                      Port {alt} →
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Bind Command Copy */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={copyBindCommand}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.45rem 0.85rem",
                  borderRadius: "6px",
                  background: "var(--accent-primary)",
                  color: "#ffffff",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                <Copy size={13} />
                <span>{copied ? "Command Copied!" : `Copy Bind Command (PORT=${port})`}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
