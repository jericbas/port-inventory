# 🌐 Port Inventory

> **High-performance host socket inspector, live process inventory, and IANA reserved port catalog.**  
> Built with **Rust (Axum + Tokio)**, **Bun**, **Vite**, **React 19**, **TypeScript**, and **Biome**. Defaulting to **Port 80**.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Trunk-Based](https://img.shields.io/badge/git-Trunk--Based-brightgreen.svg)](docs/TRUNK_BASED.md)
[![Release Please](https://img.shields.io/badge/release--please-automated-orange.svg)](docs/TRUNK_BASED.md)
[![Biome Checked](https://img.shields.io/badge/code_style-Biome-60a5fa.svg)](biome.json)

---

## ⚠️ PERSONAL & HOMELAB USE ONLY — NO AUTHENTICATION

> [!CAUTION]
> **NO AUTHENTICATION IS ENABLED BY DESIGN.**  
> This diagnostic utility has zero credentials or role checks. It exposes all host listening sockets, established connections, Process IDs (PIDs), and command-line arguments.
> - **DO NOT expose Port 80 directly to the public internet** or forward WAN ports on consumer routers.
> - **Best usage is strictly for personal homelab diagnostics**, local developer testing (`127.0.0.1`), or inside an encrypted mesh overlay (**Tailscale**, **WireGuard**, or **Netbird**).
> - See [**Security Policy & Isolation Guide**](docs/SECURITY.md) for reverse proxy setup (Authelia, Caddy, Nginx).

---

## ⚡ Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/jericbas/port-inventory.git
cd port-inventory
bun install
```

### 2. Build Frontend Assets
```bash
bun run build
```

### 3. Run on Port 80 (Recommended Linux Capability Setup)
Grant port binding capabilities to the compiled binary without needing root:
```bash
cargo build --release
sudo setcap 'cap_net_bind_service=+ep' ./target/release/port-inventory
./target/release/port-inventory
```
Open **`http://localhost`** in your browser.

*(If launched without capabilities, it automatically falls back gracefully to unprivileged Port `8080` / `8000`.)*

### 4. Or Run with Docker (Headless / Containerized)
```bash
# Build and run with host network & PID visibility in background
docker compose up -d
```
See [**Docker & Headless Deployment Guide**](docs/DOCKER_AND_HEADLESS.md) for headless daemon setups (`systemd`, CLI API querying, bridge mode).

---

## 🚀 Key Capabilities

- **Port 80 Native & Capability Supervisor**: Default target is Port 80 with automatic fallback if permissions are restricted. See [**Port 80 Binding Guide**](docs/PORT_BINDING.md).
- **Custom Port Naming & Aliases**: Name and label any port directly in the table or inspector modal (e.g. "Staging API", "Main Postgres DB"). Persisted across browser sessions with zero-latency local caching and server synchronization.
- **Table Header Column Filters & Sorting**: Direct column-level filtering for Port, Name/Alias, Application, File Path, Process/PID, Address, and State, plus multi-column sorting.
- **Passive Kernel Procfs Inspection**: Reads directly from `/proc/net/tcp`, `/proc/net/udp`, and `/proc/[pid]/fd` symlinks. Zero synthetic network packets are transmitted. See [**Architecture Guide**](docs/ARCHITECTURE.md).
- **IANA & System Reserved Directory**: Catalogs well-known privileged ports (0–1023) and high-profile registered ports (Docker, K8s, Redis, Postgres, MySQL) with real-time host availability.
- **Deep Single-Port Inspector**: Click any port to inspect process owners, binding verdicts, CVE attack surfaces, and suggested alternative ports.
- **9 Ergonomic Themes**: 3 Light, 3 Dark, and 3 Light-Dark Hybrid palettes with zero-reload switching and localStorage persistence. See [**Theme Catalog**](docs/THEMES.md).
- **Trunk-Based Development**: Main-branch development with automated Google `release-please` semantic releases. See [**Trunk-Based Workflow**](docs/TRUNK_BASED.md).

---

## 🎨 9 Visual Themes

Switch instantly via the dashboard header:

| Category | Theme Name | Accent | Ideal Environment |
| :--- | :--- | :--- | :--- |
| **Light** | **Arctic Snow** | `#2563eb` Cobalt | Daylight office & high-contrast monitors |
| **Light** | **Paper Sand** | `#b45309` Terracotta | Editorial sepia parchment for long reading |
| **Light** | **Pastel Mint** | `#059669` Emerald | Soft botanical sage daylight |
| **Dark** | **Midnight Obsidian** | `#38bdf8` Cyan | Deep OLED pitch-black void with neon telemetry |
| **Dark** | **Cyber Synthwave** | `#ec4899` Magenta | Retro-futuristic dark violet |
| **Dark** | **Charcoal Slate** | `#94a3b8` Steel | Low-glare matte graphite for dark rooms |
| **Hybrid** | **Solar Eclipse** | `#0f172a` Slate | Dark control header with crisp daylight canvas |
| **Hybrid** | **Nordic Twilight** | `#88c0d0` Frost | Balanced Scandinavian blue-gray twilight |
| **Hybrid** | **OLED Mono Duo** | `#ffffff` White | Stark architectural monochrome high-contrast |

---

## 📚 Documentation Index

To keep this README concise, detailed guides are organized into dedicated documentation files:

- 🐳 [**docs/DOCKER_AND_HEADLESS.md**](docs/DOCKER_AND_HEADLESS.md) — Docker containerization, systemd headless daemon, CLI API usage, & host namespaces.
- 🔒 [**docs/SECURITY.md**](docs/SECURITY.md) — Security boundary, danger matrix & reverse proxy isolation.
- 🔌 [**docs/PORT_BINDING.md**](docs/PORT_BINDING.md) — Linux `CAP_NET_BIND_SERVICE`, sysctl, systemd daemon, & Docker setup.
- 🎨 [**docs/THEMES.md**](docs/THEMES.md) — Detailed specifications, color tokens, and CSS variable architecture.
- 🏗️ [**docs/ARCHITECTURE.md**](docs/ARCHITECTURE.md) — Kernel procfs scanning internals, REST API, & file map.
- 🚀 [**docs/TRUNK_BASED.md**](docs/TRUNK_BASED.md) — Trunk-based branching model & Release-Please conventional commits.

---

## 🛠️ Developer Commands

```bash
# Start frontend Vite development server (port 3000 with API proxy)
bun run dev

# Run Biome linting and formatting verification
bun run check

# Auto-format codebase with Biome
bun run format

# Run Rust backend checks
cargo check

# Compile production Vite assets and Rust binary
bun run deploy

# Build and run Docker container with host network visibility
docker compose up -d --build

# View container logs
docker compose logs -f
```

---

## 📁 Modular Layout (~200 Lines Per File)

Every source file begins with an explicit comment explaining its role and stays around ~200 lines for cognitive clarity:

```
port-inventory/
├── src/
│   ├── main.rs                 # Port 80 supervisor & shutdown hooks (~170 lines)
│   ├── server.rs               # Axum REST controllers & SPA asset router (~190 lines)
│   ├── scanner.rs              # Linux procfs passive socket & file attribution (~560 lines)
│   ├── reserved_db.rs          # IANA system & registered port registry (~176 lines)
│   ├── telemetry.rs            # Host telemetry & diagnostic metrics (~50 lines)
│   └── models.rs               # Strongly-typed data structs and enums (~210 lines)
├── client/src/
│   ├── main.tsx                # React mount point & global error boundary (~153 lines)
│   ├── App.tsx                 # Main dashboard shell & telemetry polling (~215 lines)
│   ├── types.ts                # TypeScript domain contracts & utilities (~185 lines)
│   ├── hooks/
│   │   └── useCustomNames.ts   # Custom port aliases & offline sync hook (~140 lines)
│   ├── context/ThemeContext.tsx# 9-theme state manager & localStorage sync (~195 lines)
│   ├── components/
│   │   ├── ActivePortsTable.tsx    # Live listening socket, app & file table (~380 lines)
│   │   ├── ReservedPortsList.tsx   # IANA catalog & availability filter (~262 lines)
│   │   ├── PortInspectorModal.tsx  # Deep single-port diagnostic & file details (~360 lines)
│   │   ├── ThemeSelector.tsx       # Swatch picker for all 9 palettes (~239 lines)
│   │   └── WarningBanner.tsx       # Security disclaimer & capabilities note (~214 lines)
│   └── styles/
│       ├── themes.css          # CSS design tokens for 9 visual palettes (~242 lines)
│       └── globals.css         # Modern responsive reset & table styling (~262 lines)
├── docs/                       # Modular technical documentation guides
├── biome.json                  # Biome 2.6.4 formatter and linter config
├── Cargo.toml                  # Rust dependencies
└── LICENSE                     # MIT License
```

---

## 📄 License

Distributed under the [MIT License](LICENSE).
