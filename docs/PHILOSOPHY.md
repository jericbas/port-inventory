# 🧠 Deployment Principles, Operational Practices & Philosophy

> **Document:** `docs/PHILOSOPHY.md`  
> **Classification:** Engineering & Operational Philosophy  
> **Audience:** Operators, Architects, Contributors  

---

## 1. What is this Document?

This document codifies the engineering philosophy, operational practices, and architectural principles that govern the design, implementation, and deployment of **Port Inventory**.

---

## 2. Principle 1: The Personal-Use Boundary & Zero-Auth Architecture

### The Dilemma
Diagnostic utilities in homelabs and developer environments face a common friction point: complex authentication layers (OAuth flows, JWT tokens, session databases) slow down emergency troubleshooting. When a service goes down or a port collision breaks a deployment, developers need instant visibility without logging into an administrative dashboard.

### The Solution
Port Inventory embraces a **Zero-Auth Local Model**:
- No user accounts, credentials, or session cookies exist in the codebase.
- The utility starts in sub-second time and delivers full socket visibility immediately.
- The security boundary is deliberately shifted from application-level authentication to **network perimeter encapsulation** (loopback binding, host firewalls, WireGuard/Tailscale mesh overlays).

---

## 3. Principle 2: Privilege Separation & The Port 80 Dilemma

### The Dilemma
Port 80 is the universal standard for web traffic, eliminating the need to type custom port suffixes like `:8080` or `:3000` in the browser. However, on Unix-like operating systems, ports below 1024 are privileged. Historically, running a server on Port 80 meant executing the binary as the `root` superuser, violating the Principle of Least Privilege.

### The Solution
Port Inventory leverages modern Linux capabilities and dynamic fallback:
1. **Capabilities over Root**: By granting `CAP_NET_BIND_SERVICE`, the binary binds to Port 80 while running under a standard unprivileged user account:
   ```bash
   sudo setcap 'cap_net_bind_service=+ep' ./target/release/port-inventory
   ```
2. **Dynamic Fallback Cascade**: If the operator launches the binary without root or capabilities, Port Inventory does not crash; it logs helpful setup commands and automatically attempts a sequence of fallback ports (`8080`, `8000`, `8888`, `3030`).

---

## 4. Principle 3: Immutable Single-Binary Distribution

### The Dilemma
Modern web applications often require complex production environments: a Node.js runtime for the frontend, a Python or Ruby interpreter for the backend, dynamic shared libraries, and sprawling `node_modules` trees that rot over time.

### The Solution
We enforce a strict separation between **Build Time** and **Run Time**:
- **Build Time**: Bun compiles TypeScript, validates Biome lint rules, and bundles React 19 into static HTML, CSS, and JS assets in `./dist/`.
- **Run Time**: The compiled Rust binary natively hosts the Axum REST endpoints and serves the static assets directly. No Bun, Node.js, or runtime interpreter is needed on the production machine.

---

## 5. Principle 4: Passive Kernel Observability (Zero Packet Injection)

### The Dilemma
Active network port scanners (such as Nmap or Masscan) inspect network ports by sending synthetic TCP SYN or UDP probe packets. On production machines and monitored cloud instances, this synthetic traffic triggers intrusion detection systems (IDS), trips host firewalls, and adds unnecessary network overhead.

### The Solution
Port Inventory implements **Passive Procfs Inspection**:
- It reads local socket state directly from the Linux kernel virtual filesystem (`/proc/net/tcp`, `/proc/net/udp`).
- It maps socket inodes to owning processes by inspecting `/proc/[pid]/fd/*` symlinks.
- Result: **Zero network packets are transmitted**. The scan completes in sub-millisecond execution time with 100% accuracy and negligible CPU impact (< 15MB RAM).

---

## 6. Principle 5: Homelab Hygiene & Defense-in-Depth

### Operational Practices
1. **Regular Listener Audits**: Run Port Inventory periodically to detect rogue listeners that inadvertently bound to `0.0.0.0` (such as unauthenticated Redis or Docker daemon instances).
2. **Interface Binding Discipline**: Ensure sensitive databases listen exclusively on `127.0.0.1` or internal Docker network bridges.
3. **Firewall Enforcement**: Maintain an active host-level firewall (`ufw` or `nftables`) configured with default-deny inbound rules.

---

## 7. Principle 6: Port Allocation Tiers

To avoid service collisions, follow standardized allocation tiers:
- **0–1023 (Well-Known Privileged)**: Reserved strictly for core OS daemons and RFC protocols.
- **1024–49151 (Registered Services)**: Explicitly allocated per homelab service in infrastructure documentation.
- **49152–65535 (Dynamic / Ephemeral)**: Reserved for the kernel TCP stack for outbound client connections.

---

## 8. Principle 7: Engineering Craftsmanship & Modularity

- **~200 Lines Per File**: Source modules average ~200 lines to preserve cognitive clarity and prevent monolithic god-classes.
- **Biome Toolchain**: Biome enforces consistent formatting, import sorting, and linting across all TypeScript, CSS, and JSON files.
- **Self-Documenting Code**: Every source file starts with a header explaining its purpose and role in the system architecture.
