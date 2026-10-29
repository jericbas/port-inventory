// ============================================================================
// File: client/src/types.ts
// Description: Frontend TypeScript Types, Enums & Interface Contracts
//
// What is this file?
// This file defines the TypeScript type definitions mirroring the Rust backend
// models. It provides strong type safety across the React application for:
//   - Active network socket entries (port, protocol, PID, process name, state).
//   - Specific application running and specific file attribution per port.
//   - IANA and standard system reserved ports database records.
//   - System statistics and telemetry (uptime, host, port binding, disclaimer).
//   - Port inspection results and suggested alternative unreserved ports.
//   - The 9 visual theme definitions (3 light, 3 dark, 3 light-dark).
// ============================================================================

/** Supported transport layer protocols */
export type TransportProtocol = "TCP" | "UDP" | "TCP/UDP" | "ALL";

/** Connection and socket listening states */
export type SocketState =
  | "LISTEN"
  | "ESTABLISHED"
  | "TIME_WAIT"
  | "CLOSE_WAIT"
  | "SYN_SENT"
  | "SYN_RECV"
  | "FIN_WAIT_1"
  | "FIN_WAIT_2"
  | "CLOSED"
  | "UNKNOWN";

/** Classification categories for network ports */
export type PortCategory =
  | "web-services"
  | "database"
  | "remote-access"
  | "file-transfer"
  | "messaging"
  | "cloud-dev-ops"
  | "core-network"
  | "security"
  | "system-reserved"
  | "custom-app";

/** Availability status for a port on the local host */
export type PortAvailability = "active" | "reserved" | "privileged" | "available";

/** An actively inspected socket connection on the host */
export interface ActivePort {
  port: u16Number;
  protocol: TransportProtocol;
  address: string;
  state: SocketState;
  pid: number | null;
  process_name: string;
  app_name: string;
  file_path: string | null;
  exe_path: string | null;
  cwd: string | null;
  cmdline: string | null;
  service_name: string;
  description: string;
  inode: number;
  custom_name?: string;
}

/** An IANA standard or well-known system reserved port */
export interface ReservedPort {
  port: u16Number;
  protocol: TransportProtocol;
  service_name: string;
  description: string;
  category: PortCategory;
  availability: PortAvailability;
  is_privileged: boolean;
  security_note: string;
  rfc_reference?: string;
  custom_name?: string;
}

/** Host system telemetry and operational statistics */
export interface SystemStats {
  hostname: string;
  os_info: string;
  uptime_seconds: number;
  total_listening_ports: number;
  total_connections: number;
  server_port: number;
  usage_disclaimer: string;
}

/** Deep inspection details for a selected port */
export interface PortDetail {
  port: number;
  reservation: ReservedPort | null;
  active_bindings: ActivePort[];
  is_system_reserved: boolean;
  bind_verdict: string;
  suggested_alternatives: number[];
  custom_name?: string;
}

/**
 * 9 Distinct Themes across 3 Categories:
 * - 3 Light Themes:
 *     1. arctic-snow   (Pure, modern, ultra-clean white & ice blue)
 *     2. paper-sand    (Warm sepia, natural parchment, terracotta)
 *     3. pastel-mint   (Soft emerald, sage daylight, botanical)
 * - 3 Dark Themes:
 *     1. midnight-obsidian (Deep OLED black, electric cyan telemetry)
 *     2. cyber-synthwave   (Vibrant retro violet, neon pink, cyberpunk)
 *     3. charcoal-slate    (Matte studio graphite, industrial steel)
 * - 3 Light-Dark / Hybrid Themes:
 *     1. solar-eclipse (Obsidian dark header & controls with daylight reading canvas)
 *     2. nordic-twilight (Muted low-contrast blue-gray twilight for reduced eye strain)
 *     3. oled-mono-duo (Ultra-high contrast stark monochrome duo-tone split)
 */
export type ThemeId =
  // 3 Light
  | "arctic-snow"
  | "paper-sand"
  | "pastel-mint"
  // 3 Dark
  | "midnight-obsidian"
  | "cyber-synthwave"
  | "charcoal-slate"
  // 3 Light-Dark Hybrid
  | "solar-eclipse"
  | "nordic-twilight"
  | "oled-mono-duo";

export type ThemeCategory = "light" | "dark" | "light-dark";

export interface ThemeMetadata {
  id: ThemeId;
  name: string;
  category: ThemeCategory;
  description: string;
  previewColors: {
    bg: string;
    card: string;
    accent: string;
    text: string;
  };
}

/** Numeric type alias representing standard u16 port numbers */
export type u16Number = number;

/** Active tab views available in the user interface */
export type ActiveTab = "active-ports" | "reserved-ports";

/** Filter options for sorting and searching port records */
export interface PortFilterOptions {
  searchQuery: string;
  category: string;
  availability: string;
  protocol: string;
}

/** Default empty filter parameters */
export const DEFAULT_FILTERS: PortFilterOptions = {
  searchQuery: "",
  category: "all",
  availability: "all",
  protocol: "all",
};

/** Column-level filters applied directly on table headers */
export interface HeaderColumnFilters {
  port: string;
  customName: string;
  appName: string;
  filePath: string;
  process: string;
  address: string;
  state: string;
}

export const DEFAULT_HEADER_FILTERS: HeaderColumnFilters = {
  port: "",
  customName: "",
  appName: "",
  filePath: "",
  process: "",
  address: "",
  state: "ALL",
};

/** Helper to format uptime into human-readable hours and minutes */
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${Math.floor(seconds % 60)}s`;
}

/** Formats socket state strings into badge styling classes */
export function getSocketStateColor(state: SocketState): string {
  switch (state) {
    case "LISTEN":
      return "badge-listen";
    case "ESTABLISHED":
      return "badge-established";
    case "TIME_WAIT":
    case "CLOSE_WAIT":
      return "badge-waiting";
    default:
      return "badge-other";
  }
}
