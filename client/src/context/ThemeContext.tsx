// ============================================================================
// File: client/src/context/ThemeContext.tsx
// Description: Multi-Theme State Manager & Persistence Engine
//
// What is this file?
// This module provides a React Context and Custom Hook for orchestrating the
// application's visual themes. It manages:
//   - Selection of 9 distinct themes:
//       • 3 Light themes: "arctic-snow", "paper-sand", "pastel-mint"
//       • 3 Dark themes: "midnight-obsidian", "cyber-synthwave", "charcoal-slate"
//       • 3 Light-Dark hybrids: "solar-eclipse", "nordic-twilight", "oled-mono-duo"
//   - Applying the [data-theme] attribute to document.documentElement.
//   - Persisting active preferences in localStorage for seamless reloading.
//   - Delivering preview swatches and descriptions for the ThemeSelector UI.
// ============================================================================

import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import type { ThemeId, ThemeMetadata } from "../types";

/** Comprehensive metadata registry for all 9 available themes */
export const THEMES_REGISTRY: ThemeMetadata[] = [
  // --- 3 LIGHT PALETTES ---
  {
    id: "arctic-snow",
    name: "Arctic Snow",
    category: "light",
    description: "Ultra-clean clinical white canvas with iced slate and cobalt blue accents.",
    previewColors: {
      bg: "#f8fafc",
      card: "#ffffff",
      accent: "#2563eb",
      text: "#0f172a",
    },
  },
  {
    id: "paper-sand",
    name: "Paper Sand",
    category: "light",
    description: "Warm sepia parchment and editorial aesthetic with terracotta highlights.",
    previewColors: {
      bg: "#fbf7ee",
      card: "#ffffff",
      accent: "#b45309",
      text: "#292524",
    },
  },
  {
    id: "pastel-mint",
    name: "Pastel Mint",
    category: "light",
    description: "Fresh daylight sage and botanical emerald daylight tones.",
    previewColors: {
      bg: "#f0fdf4",
      card: "#ffffff",
      accent: "#059669",
      text: "#064e3b",
    },
  },

  // --- 3 DARK PALETTES ---
  {
    id: "midnight-obsidian",
    name: "Midnight Obsidian",
    category: "dark",
    description: "Deep OLED pitch-black backdrop with neon electric cyan telemetry glow.",
    previewColors: {
      bg: "#09090b",
      card: "#18181f",
      accent: "#38bdf8",
      text: "#f4f4f5",
    },
  },
  {
    id: "cyber-synthwave",
    name: "Cyber Synthwave",
    category: "dark",
    description: "Vibrant retro-futuristic dark violet with hot magenta and electric cyan.",
    previewColors: {
      bg: "#0f0728",
      card: "#20134a",
      accent: "#ec4899",
      text: "#fdf4ff",
    },
  },
  {
    id: "charcoal-slate",
    name: "Charcoal Slate",
    category: "dark",
    description: "Matte studio graphite and industrial steel for reduced eye fatigue.",
    previewColors: {
      bg: "#18181b",
      card: "#27272a",
      accent: "#94a3b8",
      text: "#e4e4e7",
    },
  },

  // --- 3 LIGHT-DARK HYBRID PALETTES ---
  {
    id: "solar-eclipse",
    name: "Solar Eclipse",
    category: "light-dark",
    description: "Pitch-dark telemetry command deck paired with high-readability daylight canvas.",
    previewColors: {
      bg: "#f1f5f9",
      card: "#ffffff",
      accent: "#0f172a",
      text: "#0f172a",
    },
  },
  {
    id: "nordic-twilight",
    name: "Nordic Twilight",
    category: "light-dark",
    description: "Scandinavian blue-gray twilight balance, neither bright nor pitch black.",
    previewColors: {
      bg: "#242933",
      card: "#3b4252",
      accent: "#88c0d0",
      text: "#eceff4",
    },
  },
  {
    id: "oled-mono-duo",
    name: "OLED Mono Duo",
    category: "light-dark",
    description: "Stark minimalist architectural duo-tone high-contrast split.",
    previewColors: {
      bg: "#000000",
      card: "#121212",
      accent: "#ffffff",
      text: "#ffffff",
    },
  },
];

interface ThemeContextType {
  currentTheme: ThemeId;
  themeMeta: ThemeMetadata;
  setTheme: (theme: ThemeId) => void;
  themes: ThemeMetadata[];
}

const STORAGE_KEY = "port_inventory_theme_v1";
const DEFAULT_THEME: ThemeId = "midnight-obsidian";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
      if (saved && THEMES_REGISTRY.some((t) => t.id === saved)) {
        return saved;
      }
    } catch {
      // Ignore localStorage access restrictions in strict sandboxes
    }
    return DEFAULT_THEME;
  });

  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-theme", currentTheme);
      localStorage.setItem(STORAGE_KEY, currentTheme);
    } catch {
      // Ignore potential storage write errors
    }
  }, [currentTheme]);

  const activeMeta = THEMES_REGISTRY.find((t) => t.id === currentTheme) || THEMES_REGISTRY[0];

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        themeMeta: activeMeta,
        setTheme: setCurrentTheme,
        themes: THEMES_REGISTRY,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

/** Hook to access current theme state and switcher actions */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be consumed within a ThemeProvider wrapper");
  }
  return context;
}
