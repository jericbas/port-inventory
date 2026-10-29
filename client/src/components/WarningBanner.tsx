// ============================================================================
// File: client/src/components/WarningBanner.tsx
// Description: Security Warning Banner & Personal-Use Disclaimer
//
// What is this file?
// This component prominently renders the essential security warning requested
// by the user:
//   - CLEAR NOTICE: This utility is strictly designed for personal homelab use.
//   - NO AUTHENTICATION: Anyone on the local network can inspect host sockets.
//   - OPERATOR DISCRETION: It is up to the operator to secure network boundaries.
//   - PERIMETER GUIDANCE: Explains how to securely access the tool via Tailscale,
//     WireGuard, or reverse proxies with Basic Auth / Authelia.
//   - CAPABILITIES NOTICE: Guidance for granting Linux Port 80 permissions safely.
// ============================================================================

import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Lock,
  ShieldAlert,
  Terminal,
  Wifi,
} from "lucide-react";
import type React from "react";
import { useState } from "react";

interface WarningBannerProps {
  currentPort: number;
}

export const WarningBanner: React.FC<WarningBannerProps> = ({ currentPort }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      style={{
        backgroundColor: "var(--color-warning-bg)",
        border: "1px solid var(--color-warning)",
        borderRadius: "12px",
        padding: "1rem 1.25rem",
        color: "var(--text-main)",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              padding: "0.4rem",
              borderRadius: "8px",
              backgroundColor: "var(--color-warning)",
              color: "#000000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertTriangle size={20} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                ⚠️ FOR PERSONAL USE ONLY — NO AUTHENTICATION
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  padding: "0.15rem 0.4rem",
                  borderRadius: "4px",
                  background: "var(--border-subtle)",
                  fontWeight: 600,
                }}
              >
                Port {currentPort} Active
              </span>
            </div>
            <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginTop: "2px" }}>
              This diagnostic utility runs without credentials or role checks. It displays all host
              listening sockets and processes.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            background: "transparent",
            border: "1px solid var(--border-subtle)",
            padding: "0.35rem 0.75rem",
            borderRadius: "6px",
            fontSize: "0.775rem",
            fontWeight: 600,
            cursor: "pointer",
            color: "var(--text-main)",
          }}
        >
          <span>{isExpanded ? "Hide Security Guide" : "View Security Rules"}</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {isExpanded && (
        <div
          style={{
            marginTop: "0.5rem",
            paddingTop: "0.75rem",
            borderTop: "1px dashed var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            fontSize: "0.825rem",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
              <ShieldAlert
                size={18}
                color="var(--color-danger)"
                style={{ flexShrink: 0, marginTop: "2px" }}
              />
              <div>
                <strong style={{ display: "block", color: "var(--text-main)" }}>
                  Operator Responsibility
                </strong>
                <p style={{ color: "var(--text-muted)", marginTop: "2px" }}>
                  It is up to you how you deploy this application. Do not expose Port 80 directly to
                  the public internet or open router WAN ports.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
              <Lock
                size={18}
                color="var(--accent-primary)"
                style={{ flexShrink: 0, marginTop: "2px" }}
              />
              <div>
                <strong style={{ display: "block", color: "var(--text-main)" }}>
                  Authentication Options
                </strong>
                <p style={{ color: "var(--text-muted)", marginTop: "2px" }}>
                  If accessing across multiple devices, place this service behind an authenticating
                  reverse proxy like Authelia, Nginx Basic Auth, or Cloudflare Zero Trust.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
              <Wifi
                size={18}
                color="var(--color-listening)"
                style={{ flexShrink: 0, marginTop: "2px" }}
              />
              <div>
                <strong style={{ display: "block", color: "var(--text-main)" }}>
                  Safe Encrypted Overlays
                </strong>
                <p style={{ color: "var(--text-muted)", marginTop: "2px" }}>
                  Optimal usage is strictly on localhost (127.0.0.1) or within an encrypted
                  peer-to-peer mesh network such as Tailscale, Netbird, or WireGuard.
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              background: "var(--bg-card)",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <Terminal size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: "0.775rem" }}>
              <span style={{ fontWeight: 600 }}>Port 80 Linux Privilege Command: </span>
              <code
                style={{ background: "var(--bg-badge)", padding: "2px 6px", borderRadius: "4px" }}
              >
                sudo setcap &apos;cap_net_bind_service=+ep&apos; ./target/release/port-inventory
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
