# 🐳 Dockerization & Headless Execution Guide

> **Document:** `docs/DOCKER_AND_HEADLESS.md`  
> **Classification:** Systems Administration & Container Architecture  
> **Audience:** DevOps Engineers, Linux Administrators, Homelab Users  

---

## 1. What is this Document?

This guide explains how to deploy and operate **Port Inventory** in **headless environments** (Linux servers, homelab nodes, Raspberry Pis, cloud VPS) and **containerized environments** (Docker, Docker Compose, Podman).

It covers:
- Running headlessly as a native supervised background daemon (`systemd` or background process).
- Consuming Port Inventory headlessly via terminal commands (`curl`, `jq`, and shell scripts) without a graphical web browser.
- Multi-stage Docker containerization and layer optimization.
- Crucial container networking concepts: why `--net=host` and `--pid=host` are essential for host procfs socket inspection.
- Complete Docker Compose and Docker CLI workflows.

---

## 2. Running Headlessly

Because Port Inventory is a compiled native binary with an embedded Axum HTTP server and REST API, it is naturally designed to run headlessly without a display server (X11/Wayland) or local GUI.

### Option A: Supervised Background Daemon via Systemd (Recommended for Bare-Metal & VMs)

On a Linux server, run Port Inventory as an unprivileged, supervised system daemon.

1. **Build and install the release assets:**
   ```bash
   bun run deploy
   sudo mkdir -p /opt/port-inventory
   sudo cp ./target/release/port-inventory /opt/port-inventory/
   sudo cp -r ./dist /opt/port-inventory/dist
   ```

2. **Grant port-binding capabilities to the binary (so it binds port 80 without root):**
   ```bash
   sudo setcap 'cap_net_bind_service=+ep' /opt/port-inventory/port-inventory
   ```

3. **Create the systemd service file `/etc/systemd/system/port-inventory.service`:**
   ```ini
   [Unit]
   Description=Port Inventory Socket Monitor & Catalog
   After=network.target

   [Service]
   Type=simple
   User=nobody
   Group=nogroup
   WorkingDirectory=/opt/port-inventory
   ExecStart=/opt/port-inventory/port-inventory
   Restart=always
   RestartSec=5s

   # Capabilities and sandboxing
   AmbientCapabilities=CAP_NET_BIND_SERVICE
   CapabilityBoundingSet=CAP_NET_BIND_SERVICE
   ProtectSystem=strict
   ProtectHome=true
   NoNewPrivileges=true
   PrivateTmp=true

   # Environment configuration
   Environment=HOST=0.0.0.0
   Environment=PORT=80
   Environment=STATIC_DIR=/opt/port-inventory/dist
   Environment=RUST_LOG=info

   [Install]
   WantedBy=multi-user.target
   ```

4. **Enable and activate the daemon:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now port-inventory
   sudo systemctl status port-inventory
   ```

5. **Inspect daemon logs headlessly:**
   ```bash
   journalctl -u port-inventory -f
   ```

---

### Option B: Quick Ad-Hoc Background Execution (`nohup` / `disown`)

For ad-hoc background execution without systemd:

```bash
# Run in background redirecting output to a log file
nohup ./target/release/port-inventory > port-inventory.log 2>&1 &

# Verify process is running
ps aux | grep port-inventory
```

To terminate the background process:
```bash
killall port-inventory
```

---

### Option C: Headless CLI & Terminal API Consumption

You do not need a browser to consume Port Inventory. All data gathered by kernel procfs is available through JSON endpoints:

#### 1. System Telemetry & Bound Port
```bash
curl -s http://localhost/api/status | jq .
```
*Output snippet:*
```json
{
  "bound_port": 80,
  "hostname": "homelab-node-01",
  "os_flavor": "Linux 6.8.0-x86_64",
  "uptime_seconds": 184320,
  "total_active_ports": 24,
  "security_warning": "..."
}
```

#### 2. Query Active Listening Sockets & Process Owners
```bash
curl -s http://localhost/api/active-ports | jq '.[] | select(.state=="Listen") | {port, protocol, process_name, pid}'
```
*Output snippet:*
```json
{"port": 22, "protocol": "Tcp", "process_name": "sshd", "pid": 941}
{"port": 80, "protocol": "Tcp", "process_name": "port-inventory", "pid": 14205}
{"port": 5432, "protocol": "Tcp", "process_name": "postgres", "pid": 1102}
```

#### 3. Deep-Inspect a Specific Port (e.g., Port 5432 or 8080)
```bash
curl -s http://localhost/api/inspect/5432 | jq .
```

#### 4. Headless Socket Watcher Script
You can monitor newly opened ports headlessly using a lightweight Bash loop:
```bash
watch -n 5 "curl -s http://localhost/api/active-ports | jq -r '.[] | \"\(.protocol)/\(.port)\t\(.process_name)\t(PID: \(.pid // \"kernel\"))\"'"
```

---

## 3. Docker Containerization

Port Inventory provides a production-grade multi-stage `Dockerfile` and a `docker-compose.yml`.

### Architecture of the Container Build

The build is partitioned into 3 isolated stages:
1. **`frontend-builder` (`oven/bun:1`)**: Installs dependencies with `bun install --frozen-lockfile` and compiles the React 19 / Vite SPA into static assets inside `/app/dist`.
2. **`backend-builder` (`rust:bookworm`)**: Compiles the Rust backend with `cargo build --release --locked`.
3. **`runtime` (`debian:bookworm-slim`)**: A lightweight container packaging only the final binary, static assets, and minimal healthcheck utilities (`curl`, `ca-certificates`).

---

## 4. Understanding Host Mode vs. Bridge Mode

> [!IMPORTANT]
> **Procfs Inspection Requirement:**  
> Port Inventory discovers active sockets by parsing `/proc/net/tcp`, `/proc/net/udp`, and cross-referencing process file descriptors in `/proc/[pid]/fd`.  
> By default, standard Docker containers isolate both the network namespace and the PID namespace:
> - In standard container isolation (**Bridge mode**), `/proc/net/tcp` only contains sockets opened *inside that single container*.
> - To inspect the **host machine's sockets and processes**, Docker must attach to the host namespaces using `--net=host` and `--pid=host`.

### Host Mode (Recommended for Server & Homelab Inspection)
```bash
docker run -d \
  --name port-inventory \
  --restart unless-stopped \
  --network host \
  --pid host \
  port-inventory:latest
```
- The container binds directly to host interfaces (defaults to `0.0.0.0:80`).
- The scanner reads the host's actual kernel socket table and process tree.
- Port mapping flags (`-p 80:80`) are **not** needed with `--network host`.

### Bridge Mode (Isolated Container Inspection)
If you intentionally want Port Inventory to run in an isolated Docker network (e.g. testing or container mesh diagnostics):
```bash
docker run -d \
  --name port-inventory \
  --restart unless-stopped \
  -p 8080:80 \
  -e PORT=80 \
  port-inventory:latest
```
- In bridge mode, the dashboard will only reflect sockets open within the container itself.

---

## 5. Docker Deployment Workflows

### Option 1: Docker Compose (Quickest)

1. **Start the service in the background:**
   ```bash
   docker compose up -d
   ```

2. **Verify container status:**
   ```bash
   docker compose ps
   ```

3. **View live logs:**
   ```bash
   docker compose logs -f
   ```

4. **Stop the container:**
   ```bash
   docker compose down
   ```

### Option 2: Docker CLI Commands

1. **Build the container image:**
   ```bash
   docker build -t port-inventory:latest .
   ```

2. **Run container headlessly with host visibility:**
   ```bash
   docker run -d \
     --name port-inventory \
     --restart unless-stopped \
     --network host \
     --pid host \
     -e PORT=80 \
     -e RUST_LOG=info \
     port-inventory:latest
   ```

3. **Check container health:**
   ```bash
   docker inspect --format='{{json .State.Health}}' port-inventory | jq .
   ```

---

## 6. Environment Variables Reference

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `HOST` | `0.0.0.0` | IP address to bind (use `127.0.0.1` for local-only access). |
| `PORT` | `80` | Preferred port to bind (falls back to `8080`, `8000`, etc. if blocked). |
| `STATIC_DIR` | `./dist` (local) / `/app/dist` (Docker) | Path to compiled React SPA static distribution. |
| `RUST_LOG` | `info` | Logging verbosity (`error`, `warn`, `info`, `debug`, `trace`). |

---

## 7. Remote Headless Access & Security

When Port Inventory runs headlessly on a remote server:

- **LAN / Local Access:** Open `http://<server-ip>` or `http://<server-hostname>.local` from any client device on your local network.
- **VPN / Mesh Access:** Use [**Tailscale**](https://tailscale.com), [**WireGuard**](https://www.wireguard.com), or [**Netbird**](https://netbird.io) to access `http://100.x.y.z` securely over the internet.
- **Reverse Proxy Protection:** If you must place Port Inventory behind a reverse proxy (e.g. Caddy, Nginx, Traefik), refer to [**docs/SECURITY.md**](SECURITY.md) for mutual TLS (mTLS) or Authelia authentication configurations.
