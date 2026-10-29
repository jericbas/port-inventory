# 🔌 Port 80 Binding, Capabilities & Deployment Guide

> **Document:** `docs/PORT_BINDING.md`  
> **Classification:** Systems Administration & Deployment  
> **Audience:** DevOps Engineers, Linux Administrators, Homelab Users  

---

## 1. What is this Document?

This guide explains how **Port Inventory** binds to privileged **Port 80** on Linux without requiring execution as the `root` superuser, detailing Linux capabilities, sysctl configurations, systemd units, Docker deployments, and dynamic fallback behaviors.

---

## 2. Why Port 80?

Port 80 is the standard HTTP port defined in **RFC 2616**. By binding to Port 80:
- Users can navigate directly to `http://localhost` or `http://inventory.internal` without remembering custom port numbers like `:8080` or `:3000`.
- The interface integrates naturally into homelab local DNS or `/etc/hosts` configurations.

---

## 3. The Linux Privileged Port Mechanism

In Linux and Unix operating systems, TCP and UDP port numbers from `0` to `1023` are designated as privileged system ports. Traditionally, only processes with `UID 0` (the `root` superuser) could invoke `bind()` on these sockets.

Running complex network web applications as `root` violates the Principle of Least Privilege: if a vulnerability exists in any dependency, an attacker gains unrestricted host control.

---

## 4. Method 1: Linux File Capabilities (Recommended)

Modern Linux kernels allow assigning granular POSIX capabilities directly to binary executables without altering process user ownership.

The capability **`CAP_NET_BIND_SERVICE`** allows a process to bind to sockets with port numbers below 1024 without root privileges.

### How to Grant the Capability:
```bash
# 1. Build the production release binary
cargo build --release

# 2. Grant CAP_NET_BIND_SERVICE to the executable
sudo setcap 'cap_net_bind_service=+ep' ./target/release/port-inventory

# 3. Verify the assigned capability
getcap ./target/release/port-inventory
# Output: ./target/release/port-inventory cap_net_bind_service=ep

# 4. Launch as your normal unprivileged user
./target/release/port-inventory
```
The application will successfully bind to `0.0.0.0:80` with zero root permissions required during execution.

---

## 5. Method 2: Kernel Sysctl Unprivileged Port Start

On Linux kernel 4.11 and newer, you can lower the threshold where privileged ports begin across the entire system.

### How to Configure:
```bash
# Temporarily lower the privileged port threshold to 80
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80

# To make this permanent across reboots, add to /etc/sysctl.d/99-ports.conf:
echo "net.ipv4.ip_unprivileged_port_start=80" | sudo tee /etc/sysctl.d/99-ports.conf
sudo sysctl --system
```
Once configured, any standard user application can bind to ports 80 through 65535 directly.

---

## 6. Method 3: Systemd Daemon Service Unit

For production homelab servers, manage Port Inventory as a supervised background daemon using `systemd`. Systemd supports granting `AmbientCapabilities` directly to unprivileged service users.

### Create `/etc/systemd/system/port-inventory.service`:
```ini
[Unit]
Description=Port Inventory & Socket Monitor
After=network.target

[Service]
Type=simple
User=portuser
Group=portuser
WorkingDirectory=/opt/port-inventory
ExecStart=/opt/port-inventory/port-inventory
Restart=always
RestartSec=5s

# Grant port 80 binding capability without running as root
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE

# Sandboxing & security hardening
ProtectSystem=strict
ProtectHome=true
NoNewPrivileges=true
PrivateTmp=true

# Environment overrides
Environment=PORT=80
Environment=HOST=0.0.0.0
Environment=STATIC_DIR=/opt/port-inventory/dist

[Install]
WantedBy=multi-user.target
```

### Enable and Start Service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now port-inventory.service
sudo systemctl status port-inventory.service
```

---

## 7. Method 4: Containerized Deployment (Docker / Podman)

When running in a container, run the application on an unprivileged internal port (e.g., 8000) and publish it to Port 80 on the host:

```bash
docker run -d \
  --name port-inventory \
  --restart unless-stopped \
  -p 80:8000 \
  -e PORT=8000 \
  -v /proc:/proc:ro \
  jericbas/port-inventory:latest
```
*Note: Mounting `/proc:/proc:ro` allows the container to inspect the host kernel socket table directly.*

---

## 8. Dynamic Fallback Cascade

If Port Inventory is launched without root and without `CAP_NET_BIND_SERVICE`, it will not abort.

The server supervisor in `src/main.rs`:
1. Attempts preferred `PORT` (defaults to 80).
2. Catches `PermissionDenied (os error 13)`.
3. Outputs exact `setcap` guidance commands to standard error.
4. Tries sequential candidate fallback ports: `8080` -> `8000` -> `8888` -> `3030` -> `5050` -> ephemeral.
5. Successfully binds the first free candidate and reports the URL.
