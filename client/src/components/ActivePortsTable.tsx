// ============================================================================
// File: client/src/components/ActivePortsTable.tsx
// Description: Live System Socket, Application & File Attribution Table
//
// What is this file?
// This component renders the real-time table of all active listening sockets
// discovered on the host operating system, explicitly displaying:
//   - Specific application running per port (e.g. OmniRoute, Ollama, Docker Proxy, Caddy).
//   - Specific file executing per port (script file, config file, or binary executable).
//   - User-assigned custom names / aliases for ports (persisted in localStorage & synced with server).
//   - Table header column filters allowing precise filtering per column.
//   - Column sorting (ascending / descending) on table headers.
//   - Direct copy-to-clipboard for the running file path.
//   - Live search by application, custom name, file path, service, process, or port number.
//   - Interactive click handler opening the detailed PortInspectorModal.
// ============================================================================

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Copy,
  ExternalLink,
  FileCode,
  Filter,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { useCustomNames } from "../hooks/useCustomNames";
import type { ActivePort, HeaderColumnFilters } from "../types";
import { DEFAULT_HEADER_FILTERS } from "../types";

interface ActivePortsTableProps {
  ports: ActivePort[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelectPort: (port: number) => void;
}

type SortColumn = "port" | "customName" | "appName" | "filePath" | "process" | "address" | "state";

export const ActivePortsTable: React.FC<ActivePortsTableProps> = ({
  ports,
  isLoading,
  onRefresh,
  onSelectPort,
}) => {
  const { customNames, setPortName, removePortName } = useCustomNames();

  const [searchTerm, setSearchTerm] = useState("");
  const [protocolFilter, setProtocolFilter] = useState<string>("ALL");
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  // Table header column filters
  const [headerFilters, setHeaderFilters] = useState<HeaderColumnFilters>(DEFAULT_HEADER_FILTERS);
  const [showFilterRow, setShowFilterRow] = useState<boolean>(true);

  // Column sorting
  const [sortColumn, setSortColumn] = useState<SortColumn>("port");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Inline custom name editing state
  const [editingPort, setEditingPort] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  const handleCopyPath = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(path);
    setCopiedFile(path);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortOrder("asc");
    }
  };

  const activeHeaderFilterCount = useMemo(() => {
    let count = 0;
    if (headerFilters.port.trim()) count++;
    if (headerFilters.customName.trim()) count++;
    if (headerFilters.appName.trim()) count++;
    if (headerFilters.filePath.trim()) count++;
    if (headerFilters.process.trim()) count++;
    if (headerFilters.address.trim()) count++;
    if (headerFilters.state !== "ALL") count++;
    return count;
  }, [headerFilters]);

  const handleResetFilters = () => {
    setHeaderFilters(DEFAULT_HEADER_FILTERS);
  };

  const handleStartEdit = (e: React.MouseEvent, port: number, currentName?: string) => {
    e.stopPropagation();
    setEditingPort(port);
    setEditingValue(currentName || "");
  };

  const handleSaveEdit = (e: React.MouseEvent | React.FormEvent, port: number) => {
    e.stopPropagation();
    e.preventDefault();
    setPortName(port, editingValue);
    setEditingPort(null);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPort(null);
    setEditingValue("");
  };

  const handleDeleteName = (e: React.MouseEvent, port: number) => {
    e.stopPropagation();
    removePortName(port);
    if (editingPort === port) {
      setEditingPort(null);
    }
  };

  // Filter and sort ports
  const filteredPorts = useMemo(() => {
    return ports
      .filter((item) => {
        const customName = customNames[item.port] || item.custom_name || "";
        const term = searchTerm.toLowerCase().trim();

        // Global search term
        const matchesSearch =
          !term ||
          item.port.toString().includes(term) ||
          customName.toLowerCase().includes(term) ||
          item.app_name.toLowerCase().includes(term) ||
          Boolean(item.file_path?.toLowerCase().includes(term)) ||
          item.service_name.toLowerCase().includes(term) ||
          item.process_name.toLowerCase().includes(term) ||
          Boolean(item.pid?.toString().includes(term));

        // Protocol dropdown filter
        const matchesProtocol =
          protocolFilter === "ALL" || item.protocol.toUpperCase() === protocolFilter;

        // Table Header Column Filters
        const matchesHeaderPort =
          !headerFilters.port.trim() || item.port.toString().includes(headerFilters.port.trim());

        const matchesHeaderName =
          !headerFilters.customName.trim() ||
          customName.toLowerCase().includes(headerFilters.customName.toLowerCase().trim());

        const matchesHeaderApp =
          !headerFilters.appName.trim() ||
          item.app_name.toLowerCase().includes(headerFilters.appName.toLowerCase().trim()) ||
          item.service_name.toLowerCase().includes(headerFilters.appName.toLowerCase().trim());

        const matchesHeaderFilePath =
          !headerFilters.filePath.trim() ||
          Boolean(
            item.file_path?.toLowerCase().includes(headerFilters.filePath.toLowerCase().trim()),
          );

        const matchesHeaderProcess =
          !headerFilters.process.trim() ||
          item.process_name.toLowerCase().includes(headerFilters.process.toLowerCase().trim()) ||
          Boolean(item.pid?.toString().includes(headerFilters.process.trim()));

        const matchesHeaderAddress =
          !headerFilters.address.trim() ||
          item.address.toLowerCase().includes(headerFilters.address.toLowerCase().trim());

        const matchesHeaderState =
          headerFilters.state === "ALL" ||
          item.state.toUpperCase() === headerFilters.state.toUpperCase();

        return (
          matchesSearch &&
          matchesProtocol &&
          matchesHeaderPort &&
          matchesHeaderName &&
          matchesHeaderApp &&
          matchesHeaderFilePath &&
          matchesHeaderProcess &&
          matchesHeaderAddress &&
          matchesHeaderState
        );
      })
      .sort((a, b) => {
        const nameA = customNames[a.port] || a.custom_name || "";
        const nameB = customNames[b.port] || b.custom_name || "";

        let valA: string | number = "";
        let valB: string | number = "";

        switch (sortColumn) {
          case "port":
            valA = a.port;
            valB = b.port;
            break;
          case "customName":
            valA = nameA.toLowerCase();
            valB = nameB.toLowerCase();
            break;
          case "appName":
            valA = a.app_name.toLowerCase();
            valB = b.app_name.toLowerCase();
            break;
          case "filePath":
            valA = (a.file_path || "").toLowerCase();
            valB = (b.file_path || "").toLowerCase();
            break;
          case "process":
            valA = a.process_name.toLowerCase();
            valB = b.process_name.toLowerCase();
            break;
          case "address":
            valA = a.address.toLowerCase();
            valB = b.address.toLowerCase();
            break;
          case "state":
            valA = a.state;
            valB = b.state;
            break;
          default:
            valA = a.port;
            valB = b.port;
        }

        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
  }, [ports, customNames, searchTerm, protocolFilter, headerFilters, sortColumn, sortOrder]);

  const renderSortIndicator = (col: SortColumn) => {
    if (sortColumn !== col) {
      return <ArrowUpDown size={12} style={{ opacity: 0.35, marginLeft: "4px" }} />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp size={12} color="var(--accent-primary)" style={{ marginLeft: "4px" }} />
    ) : (
      <ArrowDown size={12} color="var(--accent-primary)" style={{ marginLeft: "4px" }} />
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Control bar: Search, Protocol, Header Filter Toggle, Refresh */}
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
          {/* Global search input */}
          <div style={{ position: "relative", width: "100%", maxWidth: "340px" }}>
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
              placeholder="Search by app, alias, file path, port, or PID..."
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

          {/* Protocol dropdown */}
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

          {/* Toggle Header Column Filters */}
          <button
            type="button"
            onClick={() => setShowFilterRow((prev) => !prev)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.4rem 0.65rem",
              borderRadius: "6px",
              border: `1px solid ${
                activeHeaderFilterCount > 0
                  ? "var(--accent-primary)"
                  : showFilterRow
                    ? "var(--border-focus)"
                    : "var(--border-subtle)"
              }`,
              background: showFilterRow ? "var(--bg-card)" : "transparent",
              color: activeHeaderFilterCount > 0 ? "var(--accent-primary)" : "var(--text-main)",
              fontSize: "0.8rem",
              cursor: "pointer",
              fontWeight: 500,
            }}
            title="Toggle table header column filters"
          >
            <Filter size={13} />
            <span>Header Filters</span>
            {activeHeaderFilterCount > 0 && (
              <span
                style={{
                  background: "var(--accent-primary)",
                  color: "#fff",
                  fontSize: "0.68rem",
                  padding: "1px 5px",
                  borderRadius: "10px",
                  fontWeight: 700,
                }}
              >
                {activeHeaderFilterCount}
              </span>
            )}
          </button>

          {/* Reset Filters button if any are active */}
          {activeHeaderFilterCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.4rem 0.55rem",
                borderRadius: "6px",
                border: "1px solid var(--border-subtle)",
                background: "transparent",
                color: "var(--color-warning)",
                fontSize: "0.78rem",
                cursor: "pointer",
              }}
              title="Reset all header filters"
            >
              <RotateCcw size={12} />
              <span>Reset Filters</span>
            </button>
          )}
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
            {/* Primary Header Row with Sorting */}
            <tr>
              <th
                style={{ width: "95px", cursor: "pointer", userSelect: "none" }}
                onClick={() => handleSort("port")}
                title="Sort by port number"
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span>Port</span>
                  {renderSortIndicator("port")}
                </div>
              </th>

              <th
                style={{ width: "160px", cursor: "pointer", userSelect: "none" }}
                onClick={() => handleSort("customName")}
                title="Sort by custom name / alias"
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span>Name / Alias</span>
                  {renderSortIndicator("customName")}
                </div>
              </th>

              <th
                style={{ cursor: "pointer", userSelect: "none" }}
                onClick={() => handleSort("appName")}
                title="Sort by application name"
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span>Application Running</span>
                  {renderSortIndicator("appName")}
                </div>
              </th>

              <th
                style={{ cursor: "pointer", userSelect: "none" }}
                onClick={() => handleSort("filePath")}
                title="Sort by file path"
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span>File / Executable Path</span>
                  {renderSortIndicator("filePath")}
                </div>
              </th>

              <th
                style={{ width: "150px", cursor: "pointer", userSelect: "none" }}
                onClick={() => handleSort("process")}
                title="Sort by process / PID"
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span>Process &amp; PID</span>
                  {renderSortIndicator("process")}
                </div>
              </th>

              <th
                style={{ width: "120px", cursor: "pointer", userSelect: "none" }}
                onClick={() => handleSort("address")}
                title="Sort by bound address"
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span>Address</span>
                  {renderSortIndicator("address")}
                </div>
              </th>

              <th
                style={{ width: "110px", cursor: "pointer", userSelect: "none" }}
                onClick={() => handleSort("state")}
                title="Sort by state"
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span>State</span>
                  {renderSortIndicator("state")}
                </div>
              </th>

              <th style={{ width: "90px", textAlign: "right" }}>Action</th>
            </tr>

            {/* Table Header Filter Row */}
            {showFilterRow && (
              <tr style={{ background: "var(--bg-surface)" }}>
                {/* Port filter */}
                <th style={{ padding: "0.35rem 0.5rem" }}>
                  <input
                    type="text"
                    placeholder="Filter port..."
                    value={headerFilters.port}
                    onChange={(e) =>
                      setHeaderFilters((prev) => ({ ...prev, port: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      padding: "0.25rem 0.4rem",
                      fontSize: "0.74rem",
                      borderRadius: "4px",
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-card)",
                      color: "var(--text-main)",
                      outline: "none",
                    }}
                  />
                </th>

                {/* Name / Alias filter */}
                <th style={{ padding: "0.35rem 0.5rem" }}>
                  <input
                    type="text"
                    placeholder="Filter alias..."
                    value={headerFilters.customName}
                    onChange={(e) =>
                      setHeaderFilters((prev) => ({ ...prev, customName: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      padding: "0.25rem 0.4rem",
                      fontSize: "0.74rem",
                      borderRadius: "4px",
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-card)",
                      color: "var(--text-main)",
                      outline: "none",
                    }}
                  />
                </th>

                {/* Application filter */}
                <th style={{ padding: "0.35rem 0.5rem" }}>
                  <input
                    type="text"
                    placeholder="Filter application..."
                    value={headerFilters.appName}
                    onChange={(e) =>
                      setHeaderFilters((prev) => ({ ...prev, appName: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      padding: "0.25rem 0.4rem",
                      fontSize: "0.74rem",
                      borderRadius: "4px",
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-card)",
                      color: "var(--text-main)",
                      outline: "none",
                    }}
                  />
                </th>

                {/* File path filter */}
                <th style={{ padding: "0.35rem 0.5rem" }}>
                  <input
                    type="text"
                    placeholder="Filter path or binary..."
                    value={headerFilters.filePath}
                    onChange={(e) =>
                      setHeaderFilters((prev) => ({ ...prev, filePath: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      padding: "0.25rem 0.4rem",
                      fontSize: "0.74rem",
                      borderRadius: "4px",
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-card)",
                      color: "var(--text-main)",
                      outline: "none",
                    }}
                  />
                </th>

                {/* Process / PID filter */}
                <th style={{ padding: "0.35rem 0.5rem" }}>
                  <input
                    type="text"
                    placeholder="Filter PID or name..."
                    value={headerFilters.process}
                    onChange={(e) =>
                      setHeaderFilters((prev) => ({ ...prev, process: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      padding: "0.25rem 0.4rem",
                      fontSize: "0.74rem",
                      borderRadius: "4px",
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-card)",
                      color: "var(--text-main)",
                      outline: "none",
                    }}
                  />
                </th>

                {/* Address filter */}
                <th style={{ padding: "0.35rem 0.5rem" }}>
                  <input
                    type="text"
                    placeholder="Filter IP..."
                    value={headerFilters.address}
                    onChange={(e) =>
                      setHeaderFilters((prev) => ({ ...prev, address: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      padding: "0.25rem 0.4rem",
                      fontSize: "0.74rem",
                      borderRadius: "4px",
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-card)",
                      color: "var(--text-main)",
                      outline: "none",
                    }}
                  />
                </th>

                {/* State filter */}
                <th style={{ padding: "0.35rem 0.5rem" }}>
                  <select
                    value={headerFilters.state}
                    onChange={(e) =>
                      setHeaderFilters((prev) => ({ ...prev, state: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      padding: "0.25rem 0.3rem",
                      fontSize: "0.74rem",
                      borderRadius: "4px",
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-card)",
                      color: "var(--text-main)",
                      outline: "none",
                    }}
                  >
                    <option value="ALL">All States</option>
                    <option value="LISTEN">LISTEN</option>
                    <option value="ESTABLISHED">ESTABLISHED</option>
                    <option value="TIME_WAIT">TIME_WAIT</option>
                    <option value="CLOSE_WAIT">CLOSE_WAIT</option>
                  </select>
                </th>

                {/* Reset button cell */}
                <th style={{ padding: "0.35rem 0.5rem", textAlign: "right" }}>
                  {activeHeaderFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--color-warning)",
                        cursor: "pointer",
                        fontSize: "0.7rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.2rem",
                        padding: "2px 4px",
                      }}
                      title="Clear column filters"
                    >
                      <RotateCcw size={11} />
                      <span>Clear</span>
                    </button>
                  )}
                </th>
              </tr>
            )}
          </thead>
          <tbody>
            {filteredPorts.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}
                >
                  <Server size={28} style={{ margin: "0 auto 0.4rem", opacity: 0.5 }} />
                  <p>No active listening sockets matched the query or header filters.</p>
                </td>
              </tr>
            ) : (
              filteredPorts.map((item, idx) => {
                const isListening = item.state === "LISTEN";
                const isCopied = item.file_path && copiedFile === item.file_path;
                const fileBasename = item.file_path
                  ? item.file_path.split("/").pop() || item.file_path
                  : null;

                const customName = customNames[item.port] || item.custom_name;
                const isEditingThisPort = editingPort === item.port;

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

                    {/* Custom Name / Alias Column with Inline Editor */}
                    <td onClick={(e) => e.stopPropagation()}>
                      {isEditingThisPort ? (
                        <form
                          onSubmit={(e) => handleSaveEdit(e, item.port)}
                          style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}
                        >
                          <input
                            // biome-ignore lint/a11y/noAutofocus: intentional focus for inline editing
                            autoFocus
                            type="text"
                            value={editingValue}
                            placeholder="e.g. My Dev Server"
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape")
                                handleCancelEdit(e as unknown as React.MouseEvent);
                            }}
                            style={{
                              width: "115px",
                              padding: "0.2rem 0.35rem",
                              fontSize: "0.78rem",
                              borderRadius: "4px",
                              border: "1px solid var(--accent-primary)",
                              background: "var(--bg-card)",
                              color: "var(--text-main)",
                              outline: "none",
                            }}
                          />
                          <button
                            type="submit"
                            title="Save custom name"
                            style={{
                              background: "var(--color-listening-bg)",
                              border: "1px solid var(--color-listening)",
                              color: "var(--color-listening)",
                              borderRadius: "4px",
                              padding: "2px 4px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <Check size={12} />
                          </button>
                          <button
                            type="button"
                            title="Cancel editing"
                            onClick={handleCancelEdit}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--text-muted)",
                              padding: "2px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <X size={12} />
                          </button>
                        </form>
                      ) : customName ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              fontSize: "0.76rem",
                              fontWeight: 600,
                              background: "rgba(59, 130, 246, 0.12)",
                              color: "var(--accent-primary)",
                              border: "1px solid rgba(59, 130, 246, 0.25)",
                              padding: "0.15rem 0.45rem",
                              borderRadius: "6px",
                              maxWidth: "120px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={customName}
                          >
                            <Tag size={10} style={{ flexShrink: 0 }} />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                              {customName}
                            </span>
                          </span>
                          <button
                            type="button"
                            title="Edit alias"
                            onClick={(e) => handleStartEdit(e, item.port, customName)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--text-muted)",
                              cursor: "pointer",
                              padding: "2px",
                            }}
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            type="button"
                            title="Remove alias"
                            onClick={(e) => handleDeleteName(e, item.port)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--text-faint)",
                              cursor: "pointer",
                              padding: "2px",
                            }}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleStartEdit(e, item.port)}
                          style={{
                            background: "transparent",
                            border: "1px dashed var(--border-subtle)",
                            borderRadius: "4px",
                            color: "var(--text-muted)",
                            fontSize: "0.72rem",
                            padding: "0.15rem 0.4rem",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                          title="Add custom name for this port"
                        >
                          <Plus size={10} />
                          <span>Name</span>
                        </button>
                      )}
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
                            maxWidth: "380px",
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
                            maxWidth: "140px",
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
