# ⚠️ Security Policy & Personal-Use Disclaimer

> **Document:** `docs/SECURITY.md`  
> **Classification:** Critical Operational Notice  
> **Audience:** Homelab Operators, System Administrators, Developers  

---

## 1. What is this Document?

This document outlines the security posture, operational boundary, and intended deployment constraints of **Port Inventory**. It clarifies why authentication is omitted, the inherent risks of socket inspection, and how operators must protect their systems when running this utility.

---

## 2. Core Warning: Personal & Internal Use Only

> [!CAUTION]
> **NO AUTHENTICATION MECHANISM IS PRESENT IN THIS APPLICATION.**  
> Port Inventory has zero passwords, session cookies, API tokens, or user role distinctions. Anyone who can route network packets to the bound port (default Port 80) can view:
> - All listening TCP and UDP sockets on the operating system.
> - Active established inbound and outbound client connections.
> - Associated Process IDs (PIDs), executable paths, and invocation arguments.
> - System hostname, kernel release version, and socket topology.

---

## 3. The Operator's Responsibility

It is entirely at the discretion and responsibility of the operator to secure the network perimeter hosting Port Inventory. 

- **Do NOT expose Port 80 directly to the public internet.**
- **Do NOT configure port forwarding on consumer WAN routers for this tool.**
- **Do NOT run this tool on untrusted public Wi-Fi or multi-tenant corporate LANs without an authenticating reverse proxy.**

If external access is required across remote machines, you must encapsulate this service within a secure network perimeter.

---

## 4. Recommended Deployment Topologies

### Tier 1: Localhost Diagnostic Only (Safest)
Bind exclusively to the loopback interface (`127.0.0.1`):
```bash
HOST=127.0.0.1 PORT=8000 ./target/release/port-inventory
```
In this mode, only processes running locally on the exact same host can access the dashboard.

### Tier 2: Encrypted Mesh Overlays (Recommended for Homelabs)
Deploy Port Inventory on an encrypted point-to-point overlay network:
- **Tailscale**: Connect nodes via WireGuard tunnels. Only authenticated devices in your private tailnet can reach the service.
- **WireGuard**: Host within a private WireGuard VPN subnet (e.g., `10.0.0.0/24`).
- **Netbird / Nebula**: Peer-to-peer zero-trust mesh routing.

### Tier 3: Authenticating Reverse Proxy (Multi-Device Web Access)
If the tool must be reachable through standard browser URLs on a local LAN, front it with an authenticating reverse proxy that enforces authentication before forwarding requests.

#### Example: Caddy with HTTP Basic Authentication
```caddy
port-inventory.internal.lan {
    basicauth {
        admin $2a$14$ZkhxV... # Bcrypt hash
    }
    reverse_proxy 127.0.0.1:8000
}
```

#### Example: Nginx with `htpasswd`
```nginx
server {
    listen 80;
    server_name inventory.local;

    location / {
        auth_basic "Personal Diagnostic Area";
        auth_basic_user_file /etc/nginx/.htpasswd;
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Example: Cloudflare Zero Trust Access
If routing traffic through Cloudflare Tunnels (`cloudflared`), enforce an Access Policy requiring One-Time PIN (OTP) or GitHub OAuth authentication before traffic ever hits your machine.

---

## 5. Dangerous Services Audit Matrix

When auditing your active listening sockets with Port Inventory, pay immediate attention to these high-risk services if bound to `0.0.0.0`:

| Port | Service | Risk Profile | Remediation |
| :--- | :--- | :--- | :--- |
| **2375** | Docker REST API | Allows unauthenticated root command execution on the host | Rebind to unix socket or enforce mutual TLS on port 2376 |
| **6379** | Redis In-Memory DB | Historic remote code execution via config write | Bind strictly to `127.0.0.1` and require password |
| **27017**| MongoDB | Data wiping and ransomware attacks | Enable authentication (`auth=true`) and bind to localhost |
| **5432** | PostgreSQL | Credential brute forcing and SQL injection | Restrict `pg_hba.conf` to trusted subnets and enforce TLS |
| **3306** | MySQL / MariaDB | Cleartext protocol negotiation | Disallow root remote logins; listen only on private interface |
| **5900** | VNC Remote Desktop| Weak 8-character DES passwords | Tunnel VNC exclusively over SSH or WireGuard |
| **10250**| Kubelet API | Unauthorized container pod execution | Restrict via Kubernetes RBAC and webhook authorizers |

---

## 6. Host Firewall Hardening (UFW & Iptables)

Always enforce a default-deny ingress firewall policy on Linux hosts:

```bash
# Set default policies to deny inbound and allow outbound
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH from private administration subnet only
sudo ufw allow from 192.168.1.0/24 to any port 22 proto tcp

# Allow Port Inventory on Port 80 only from internal LAN
sudo ufw allow from 192.168.1.0/24 to any port 80 proto tcp

# Enable firewall logging and activate rules
sudo ufw logging on
sudo ufw enable
```

---

## 7. Security Audit Checklist

Before leaving Port Inventory running as a permanent background service:
- [ ] Confirmed Port 80 is NOT forwarded in router NAT settings.
- [ ] Verified the host has a firewall (UFW/nftables) actively running.
- [ ] Checked that sensitive database endpoints are bound to `127.0.0.1`.
- [ ] Granted `CAP_NET_BIND_SERVICE` rather than running the daemon as `root`.
- [ ] Confirmed that multi-device access uses Tailscale or an authenticating reverse proxy.

---

## 8. Vulnerability Reporting

If you discover an unexpected security regression or flaw in Port Inventory's socket parsing logic, please open a private GitHub security advisory.
