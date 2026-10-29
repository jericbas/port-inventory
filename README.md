# 🌐 Port Inventory

> **High-performance host socket inspector, live process inventory, and IANA reserved port catalog.**  
> Built with **Rust (Axum + Tokio)**, **Bun**, **Vite**, **React 19**, **TypeScript**, and **Biome**. Defaulting to **Port 80**.

---

## ⚠️ CRITICAL NOTICE: FOR PERSONAL & INTERNAL USE ONLY

> [!CAUTION]
> **NO AUTHENTICATION IS ENABLED BY DESIGN.**  
> This utility intentionally does **NOT** contain passwords, user accounts, or authentication tokens. It exposes:
> - All listening TCP/UDP sockets and active established connections on your host.
> - Associated Process IDs (PIDs), executable names, and command-line arguments.
> - System hostname, kernel version, and network topology.
>
> **IT IS ENTIRELY UP TO YOU HOW YOU DEPLOY AND ACCESS THIS UTILITY.**  
> - **DO NOT expose Port 80 directly to the public internet** or forward WAN ports on consumer routers.
> - **Best usage is strictly for personal homelab diagnostics**, local developer troubleshooting (`127.0.0.1`), or within an encrypted mesh overlay (e.g. **Tailscale**, **WireGuard**, or **Netbird**).
> - If you must access this dashboard remotely across multiple devices, place it behind an authenticating reverse proxy (e.g. **Cloudflare Zero Trust Access**, **Authelia**, **Caddy with basic_auth**, or **Nginx**).

---

## 🚀 Key Features

- **Port 80 Native & Capability-Aware**: Automatically targets privileged Port 80 (`http://localhost`). Features intelligent fallback and capability instructions if non-root permissions prevent binding.
- **Real-Time Linux Kernel Socket Inspection**: Reads directly from `/proc/net/tcp`, `/proc/net/udp`, and `/proc/[pid]/fd` symlinks. Zero synthetic network packets are transmitted; 100% passive, sub-millisecond kernel socket discovery.
- **Comprehensive IANA & System Reserved Port Directory**: Catalogs well-known privileged ports (0–1023) and high-profile registered ports (Docker, Kubernetes, Redis, PostgreSQL, MySQL, etcd, etc.), marking which are active, reserved, or available.
- **Deep Single-Port Inspector**: Click any port to inspect process owners, binding verdicts, known CVE attack surfaces, and suggested clean alternative ports.
- **9 Ergonomic Themes (3 Light, 3 Dark, 3 Light-Dark Hybrid)**: Instant switching with zero page refresh and localStorage persistence.
- **Deployment Principles & Philosophy**: In-depth architecture documentation embedded both in code and as an interactive dashboard tab.
- **Engineering Craftsmanship**: Strict modular codebase where every file averages ~200 lines, fully checked and formatted with Biome.

---

## 🎨 9 Distinct Thematic Palettes

Switch effortlessly using the **Theme Selector** in the dashboard header:

| Category | Theme Name | Description | Key Accents |
| :--- | :--- | :--- | :--- |
| **Light** | **Arctic Snow** | Ultra-clean clinical daylight with crisp slate | `#2563eb` Cobalt / `#f8fafc` Canvas |
| **Light** | **Paper Sand** | Warm sepia parchment and editorial aesthetic | `#b45309` Terracotta / `#fbf7ee` Sand |
| **Light** | **Pastel Mint** | Fresh sage daylight and botanical emerald | `#059669` Mint / `#f0fdf4` Sage |
| **Dark** | **Midnight Obsidian** | Deep OLED pitch-black with neon cyan telemetry | `#38bdf8` Electric Cyan / `#09090b` Void |
| **Dark** | **Cyber Synthwave** | Retro-futuristic dark violet with hot magenta | `#ec4899` Neon Pink / `#0f0728` Purple |
| **Dark** | **Charcoal Slate** | Matte studio graphite and industrial steel | `#94a3b8` Steel / `#18181b` Charcoal |
| **Hybrid** | **Solar Eclipse** | Dark command header deck with daylight canvas | `#0f172a` Obsidian / `#ffffff` Crisp Card |
| **Hybrid** | **Nordic Twilight** | Balanced blue-gray twilight reducing eye strain | `#88c0d0` Frost Blue / `#242933` Twilight |
| **Hybrid** | **OLED Mono Duo** | Stark architectural duo-tone high-contrast split | `#ffffff` White / `#000000` True Black |

---

## 🛠️ Tech Stack & Philosophy

| Layer | Technology | Role |
| :--- | :--- | :--- |
| **Backend** | **Rust** (`axum`, `tokio`, `tower-http`) | High-speed passive socket scanner & static file server |
| **Runtime & Bundler** | **Bun** + **Vite** | Blazing-fast TypeScript transpilation and asset compilation |
| **Frontend** | **React 19** + **TypeScript** | Responsive UI with real-time socket inspection modals |
| **Icons** | **Lucide React** | Clean, accessible SVG iconography |
| **Code Quality** | **Biome** (`@biomejs/biome`) | Lightning-fast linting, formatting, and import sorting |

---

## 📋 Deployment Principles, Practices & Philosophy

### 1. The Personal-Use Boundary & Zero-Auth Architecture
The utility is intentionally designed without authentication to ensure friction-free, instantaneous local diagnostics during network emergencies or homelab audits. Because no auth barrier exists, the security boundary must be enforced at the network perimeter (host firewall, private VLAN, or VPN tunnel).

### 2. The Port 80 Privilege Separation Dilemma
On Linux, ports below 1024 are privileged. Running diagnostic servers as `root` violates the Principle of Least Privilege:
- **Recommended**: Grant Linux capabilities to the compiled binary without root:
  ```bash
  sudo setcap 'cap_net_bind_service=+ep' ./target/release/port-inventory
  ```
- **Alternative**: Permit unprivileged low port binding system-wide:
  ```bash
  sudo sysctl net.ipv4.ip_unprivileged_port_start=80
  ```
- **Automatic Fallback**: If permissions are not granted, Port Inventory automatically falls back to Port `8080` (or `PORT` environment variable) and prints exact instructions.

### 3. Immutable Single-Binary Distribution
Build-time is strictly decoupled from run-time: Bun compiles React and Vite assets into static files in `./dist/`. Rust then serves these assets directly alongside REST endpoints. In production, no Node.js or Bun runtime is required on the server.

### 4. Non-Intrusive Kernel Observability
Unlike port scanners that flood the local network with SYN packets (triggering firewalls and IDS alarms), Port Inventory passively parses `/proc/net/tcp`, `/proc/net/udp`, and `/proc/[pid]/fd/*`. This achieves 100% accurate socket and PID mapping with zero network packet overhead.

### 5. Port Allocation Hygiene & Availability Tiers
- **Well-Known Ports (0–1023)**: Reserved for system daemons and standard protocols.
- **Registered Ports (1024–49151)**: Allocated for specific developer tools and services (Postgres, Redis, Docker).
- **Dynamic / Ephemeral Ports (49152–65535)**: Temporarily allocated by the kernel for outbound client sockets.

---

## ⚡ Quick Start

### Prerequisites
- **Rust Toolchain**: `rustc` and `cargo` (1.75+)
- **Bun**: `bun` (1.0+)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/jericbas/port-inventory.git
cd port-inventory
bun install
```

### 2. Build Frontend Assets
```bash
bun run build
```

### 3. Run with Port 80 (Root or Capabilities)
To bind to Port 80 directly:
```bash
# Option A: Grant capability once, then run as normal user
cargo build --release
sudo setcap 'cap_net_bind_service=+ep' ./target/release/port-inventory
./target/release/port-inventory

# Option B: Run via sudo
sudo ./target/release/port-inventory

# Option C: Run on alternative port without root
PORT=8000 ./target/release/port-inventory
```

Open your browser at **`http://localhost`** (or **`http://localhost:8080`** if running in unprivileged fallback mode).

---

## 🔧 Developer Commands

```bash
# Start frontend Vite development server (port 3000 with API proxy)
bun run dev

# Run Biome formatting and linting check
bun run check

# Auto-format codebase with Biome
bun run format

# Compile production Vite assets and Rust backend
bun run deploy

# Verify Rust backend logic
cargo check
```

---

## 📁 Modular Architecture (~200 Lines Per File)

Every source file begins with an explicit comment explaining its role and stays around ~200 lines for maximum maintainability:

```
port-inventory/
├── src/
│   ├── main.rs                 # Port 80 binding supervisor & shutdown hooks (~170 lines)
│   ├── server.rs               # Axum REST controllers & SPA asset router (~198 lines)
│   ├── scanner.rs              # Linux /proc/net passive socket inspector (~232 lines)
│   ├── reserved_db.rs          # IANA system & registered port registry (~176 lines)
│   ├── philosophy.rs           # Deployment principles & operational guidelines (~178 lines)
│   └── models.rs               # Strongly-typed data structs and enums (~221 lines)
├── client/src/
│   ├── main.tsx                # React mount point & global error boundary (~153 lines)
│   ├── App.tsx                 # Main dashboard shell & telemetry polling (~227 lines)
│   ├── types.ts                # TypeScript domain contracts & utilities (~199 lines)
│   ├── context/ThemeContext.tsx# 9-theme state manager & localStorage sync (~195 lines)
│   ├── components/
│   │   ├── ActivePortsTable.tsx    # Live listening socket table & search (~233 lines)
│   │   ├── ReservedPortsList.tsx   # IANA catalog & availability filter (~262 lines)
│   │   ├── PortInspectorModal.tsx  # Deep single-port diagnostic dialog (~246 lines)
│   │   ├── PhilosophyView.tsx      # Interactive principles & practices tab (~215 lines)
│   │   ├── ThemeSelector.tsx       # Swatch picker for all 9 palettes (~239 lines)
│   │   └── WarningBanner.tsx       # Security disclaimer & capabilities note (~214 lines)
│   └── styles/
│       ├── themes.css          # CSS design tokens for 9 visual palettes (~242 lines)
│       └── globals.css         # Modern responsive reset & table styling (~262 lines)
├── biome.json                  # Biome 2.6.4 formatter and linter config
├── vite.config.ts              # Vite bundling config
└── Cargo.toml                  # Rust dependencies (Axum, Tokio, Tower-Http)
```

---

## 📄 License & Disclaimer

Provided for personal diagnostic use. The authors and contributors assume no liability for unintended network exposures or configurations. Always protect your network perimeter.
