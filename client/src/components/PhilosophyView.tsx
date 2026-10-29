// ============================================================================
// File: client/src/components/PhilosophyView.tsx
// Description: Deployment Principles, Operational Practices & Philosophy View
//
// What is this file?
// This component renders the complete deployment philosophy and engineering
// principles behind Port Inventory.
//
// It articulates:
//   1. Personal Use Boundaries & Zero-Authentication Rationale.
//   2. Port 80 Privilege Separation via Linux CAP_NET_BIND_SERVICE capabilities.
//   3. Single-Binary Immutable Distribution (Rust + Bun/Vite).
//   4. Passive Procfs Kernel Observability vs invasive packet injection.
//   5. Homelab Hygiene and defense-in-depth perimeter containment.
//   6. Port conflict mitigation and registered allocation tiers.
//   7. Engineering craftsmanship, Biome formatting, and modular 200-line architecture.
// ============================================================================

import { CheckCircle2, ChevronRight, Compass } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import type { PhilosophySection } from "../types";

export const PhilosophyView: React.FC = () => {
  const [sections, setSections] = useState<PhilosophySection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/philosophy")
      .then((res) => res.json())
      .then((data: PhilosophySection[]) => {
        setSections(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
        Loading engineering philosophy and operational guidelines...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Intro Hero Box */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "12px",
          padding: "1.5rem",
          display: "flex",
          alignItems: "flex-start",
          gap: "1rem",
        }}
      >
        <div
          style={{
            padding: "0.6rem",
            borderRadius: "10px",
            background: "var(--accent-primary)",
            color: "#ffffff",
          }}
        >
          <Compass size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)" }}>
            Deployment Principles, Practices &amp; Engineering Philosophy
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "4px" }}>
            The architectural blueprint and operational ethics guiding how Port Inventory is
            engineered, secured, and deployed in personal homelabs and development environments.
          </p>
        </div>
      </div>

      {/* Sections Accordion / Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {sections.map((section) => (
          <div
            key={section.id}
            id={section.id}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "12px",
              padding: "1.25rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-main)" }}>
                {section.title}
              </h3>
              <p
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "var(--accent-primary)",
                  marginTop: "2px",
                }}
              >
                {section.summary}
              </p>
            </div>

            {/* Architectural Details */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <span
                style={{
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                }}
              >
                Core Architectural Mechanics
              </span>
              <ul
                style={{
                  listStyleType: "none",
                  paddingLeft: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                }}
              >
                {section.details.map((detail, idx) => (
                  <li
                    key={`detail-${idx}`}
                    style={{
                      fontSize: "0.825rem",
                      color: "var(--text-main)",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.5rem",
                    }}
                  >
                    <ChevronRight
                      size={14}
                      color="var(--accent-primary)"
                      style={{ flexShrink: 0, marginTop: "3px" }}
                    />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Operator Recommendations & Best Practices */}
            <div
              style={{
                background: "var(--bg-surface)",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <CheckCircle2 size={13} color="var(--color-listening)" />
                Actionable Recommendations for Operators
              </span>
              <ul
                style={{
                  listStyleType: "none",
                  paddingLeft: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                }}
              >
                {section.recommendations.map((rec, idx) => (
                  <li
                    key={`rec-${idx}`}
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.5rem",
                    }}
                  >
                    <span style={{ color: "var(--accent-primary)", fontWeight: 700 }}>•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
