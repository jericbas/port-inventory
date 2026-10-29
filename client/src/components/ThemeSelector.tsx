// ============================================================================
// File: client/src/components/ThemeSelector.tsx
// Description: Interactive 9-Theme Selector with Visual Swatches
//
// What is this file?
// This component renders an interactive theme selection deck in the application
// header. It organizes the 9 themes into three distinct ergonomic groups:
//   1. Light Themes (Arctic Snow, Paper Sand, Pastel Mint)
//   2. Dark Themes (Midnight Obsidian, Cyber Synthwave, Charcoal Slate)
//   3. Light-Dark Hybrids (Solar Eclipse, Nordic Twilight, OLED Mono Duo)
//
// Each option features live circular color swatches displaying background, card,
// and accent values so users can preview the color harmony before switching.
// ============================================================================

import { Check, Moon, Palette, Sparkles, Sun } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import type { ThemeCategory, ThemeMetadata } from "../types";

export const ThemeSelector: React.FC = () => {
  const { currentTheme, themeMeta, setTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ThemeCategory>(themeMeta.category);

  const categories: { key: ThemeCategory; label: string; icon: React.ReactNode }[] = [
    { key: "light", label: "3 Light", icon: <Sun size={14} /> },
    { key: "dark", label: "3 Dark", icon: <Moon size={14} /> },
    { key: "light-dark", label: "3 Hybrid", icon: <Sparkles size={14} /> },
  ];

  const filteredThemes = themes.filter((t) => t.category === activeCategory);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-main)",
          padding: "0.5rem 0.85rem",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "0.85rem",
          fontWeight: 600,
        }}
        title="Change application visual theme"
      >
        <Palette size={16} color="var(--accent-primary)" />
        <span>Theme: {themeMeta.name}</span>
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: themeMeta.previewColors.accent,
            border: "1px solid var(--border-subtle)",
          }}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop dismiss */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 900,
            }}
          />

          {/* Theme Dropdown Panel */}
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 8px)",
              width: "330px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "12px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
              zIndex: 950,
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>
                Select Palette (9 Themes)
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Instant Switch
              </span>
            </div>

            {/* Category Filter Tabs */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "0.25rem",
                background: "var(--bg-card)",
                padding: "3px",
                borderRadius: "8px",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(cat.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.35rem",
                    padding: "0.35rem 0.25rem",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    background:
                      activeCategory === cat.key ? "var(--accent-primary)" : "transparent",
                    color: activeCategory === cat.key ? "#ffffff" : "var(--text-muted)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              ))}
            </div>

            {/* List of Themes in Current Category */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {filteredThemes.map((t: ThemeMetadata) => {
                const isSelected = t.id === currentTheme;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTheme(t.id);
                      setIsOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.6rem 0.75rem",
                      borderRadius: "8px",
                      border: isSelected
                        ? "1px solid var(--accent-primary)"
                        : "1px solid var(--border-subtle)",
                      background: isSelected ? "var(--bg-card-hover)" : "var(--bg-card)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span
                          style={{
                            fontSize: "0.85rem",
                            fontWeight: isSelected ? 700 : 500,
                            color: "var(--text-main)",
                          }}
                        >
                          {t.name}
                        </span>
                        {isSelected && <Check size={14} color="var(--accent-primary)" />}
                      </div>
                      <span
                        style={{
                          fontSize: "0.725rem",
                          color: "var(--text-muted)",
                          maxWidth: "220px",
                          lineHeight: 1.2,
                        }}
                      >
                        {t.description}
                      </span>
                    </div>

                    {/* Color Swatch Preview Dot Cluster */}
                    <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: t.previewColors.bg,
                          border: "1px solid #94a3b8",
                        }}
                        title={`Background: ${t.previewColors.bg}`}
                      />
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: t.previewColors.card,
                          border: "1px solid #94a3b8",
                        }}
                        title={`Card: ${t.previewColors.card}`}
                      />
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: t.previewColors.accent,
                        }}
                        title={`Accent: ${t.previewColors.accent}`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
