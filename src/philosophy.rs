// ============================================================================
// File: src/philosophy.rs
// Description: Deployment Principles, Operational Practices & Philosophy
//
// What is this file?
// This module provides the philosophical foundation, security boundaries, and
// production deployment practices that govern the Port Inventory utility.
//
// It explicitly outlines:
//   1. Why this tool has NO authentication and is restricted to personal use.
//   2. How low-privilege Linux capabilities (`CAP_NET_BIND_SERVICE`) solve port 80.
//   3. Single-binary immutable distribution principles using Rust + Bun/Vite.
//   4. Observability ethics and non-intrusive kernel socket inspection.
//   5. Network isolation guidelines for homelab, WireGuard, and Tailscale networks.
//   6. Port conflict prevention and port allocation best practices.
//   7. Engineering craftsmanship: Biome linting, modularity, and explicit documentation.
// ============================================================================

use crate::models::{PhilosophySection, SystemStats};
use crate::scanner::scan_active_ports;
use std::fs;

/// Returns the comprehensive deployment principles, practices, and engineering philosophy.
pub fn get_philosophy_document() -> Vec<PhilosophySection> {
    vec![
        PhilosophySection {
            id: "personal-use-boundary".to_string(),
            title: "1. The Personal-Use Boundary & Zero-Auth Architecture".to_string(),
            summary: "This utility is intentionally built without authentication for local diagnostic speed, demanding strict perimeter isolation.".to_string(),
            details: vec![
                "Port Inventory provides full system socket visibility, process names, and system topology without requiring passwords, API keys, or session tokens.".to_string(),
                "This design prioritizes rapid troubleshooting, offline operations, and zero-configuration developer ergonomics.".to_string(),
                "Because there is no authentication layer, exposing this application to an untrusted or public network exposes your host's internal services to reconnaissance.".to_string(),
                "The software is intended exclusively for personal homelab use, local developer testing, and private internal administrative audits.".to_string(),
            ],
            recommendations: vec![
                "CRITICAL: Never map port 80 of this tool directly to a public IP address or forward port 80 on a consumer WAN router.".to_string(),
                "CRITICAL: Run this tool strictly on localhost (127.0.0.1) or behind authenticated private overlays (Tailscale, WireGuard, Cloudflare Access).".to_string(),
                "If multi-tenant access is required, deploy an authenticating reverse proxy (such as Authelia, Nginx with basic_auth, or Caddy) in front.".to_string(),
            ],
        },
        PhilosophySection {
            id: "port-80-privilege".to_string(),
            title: "2. The Port 80 Privilege Separation Dilemma".to_string(),
            summary: "Binding to port 80 traditionally required root; modern Linux systems should use capabilities rather than root execution.".to_string(),
            details: vec![
                "On Unix/Linux architectures, ports below 1024 are considered privileged system ports. Standard unprivileged users cannot bind them directly.".to_string(),
                "Running diagnostic web servers as the 'root' superuser violates the Principle of Least Privilege and creates severe security hazards.".to_string(),
                "Port Inventory handles this gracefully by attempting port 80 first, falling back to port 8080 if permissions are denied, and reporting exact capability commands.".to_string(),
                "This ensures the binary runs safely without administrative escalation while still delivering on port 80 when authorized.".to_string(),
            ],
            recommendations: vec![
                "Grant binary port binding capability without root: 'sudo setcap cap_net_bind_service=+ep ./target/release/port-inventory'".to_string(),
                "Alternatively, allow unprivileged port binding kernel-wide: 'sudo sysctl net.ipv4.ip_unprivileged_port_start=80'".to_string(),
                "In containerized setups, publish port 80 via Docker/Podman: 'docker run -p 80:8080' to preserve unprivileged container runtime.".to_string(),
            ],
        },
        PhilosophySection {
            id: "immutable-distribution".to_string(),
            title: "3. Immutable Single-Binary Distribution".to_string(),
            summary: "Combining compiled native Rust with Vite static assets produces a self-contained, dependency-free operational artifact.".to_string(),
            details: vec![
                "Modern deployment pipelines are frequently plagued by dependency rot, runtime version mismatches, and complex Node.js runtime production requirements.".to_string(),
                "Our philosophy separates build time from run time: Bun compiles and bundles the React TypeScript frontend into static production HTML/JS/CSS assets.".to_string(),
                "Rust then serves these static assets directly from disk or memory alongside native Axum REST controllers in a single, lean binary.".to_string(),
                "This creates an ultra-lean operational footprint that launches in milliseconds with negligible memory usage (< 15MB RAM).".to_string(),
            ],
            recommendations: vec![
                "Compile once, run anywhere: CI/CD should produce a standalone Linux binary with embedded web assets.".to_string(),
                "Zero runtime dependencies: No Node.js, Bun, or Python installation is required on the target production host.".to_string(),
                "Utilize systemd or lightweight OpenRC unit files to supervise process lifecycle and auto-restart on unexpected crashes.".to_string(),
            ],
        },
        PhilosophySection {
            id: "non-intrusive-observability".to_string(),
            title: "4. Non-Intrusive Kernel Observability".to_string(),
            summary: "Telemetry must never alter the state of the host or introduce heavy performance burdens on the inspected system.".to_string(),
            details: vec![
                "Traditional network scanning tools (like active SYN/connect port scanners) generate synthetic network packets that trip intrusion detection systems.".to_string(),
                "Port Inventory adopts a passive kernel inspection model: it parses /proc/net/tcp, /proc/net/udp, and process file descriptor symlinks.".to_string(),
                "This yields 100% accurate internal socket inventory in sub-millisecond execution time without injecting a single network packet into the network.".to_string(),
            ],
            recommendations: vec![
                "Prefer reading kernel procfs tables over external socket probing whenever operating on the local host.".to_string(),
                "Keep scan intervals reactive and lightweight; do not continuously poll faster than user interface consumption demands.".to_string(),
                "Respect process isolation permissions: if running as non-root, gracefully display 'Kernel / Protected Process' for foreign PIDs.".to_string(),
            ],
        },
        PhilosophySection {
            id: "homelab-hygiene".to_string(),
            title: "5. Homelab Hygiene & Defense-in-Depth".to_string(),
            summary: "Internal infrastructure utilities require conscious boundaries and deliberate network containment.".to_string(),
            details: vec![
                "Homelabs and internal development environments are prime targets for lateral movement when compromised.".to_string(),
                "Personal diagnostic tools should operate within isolated management VLANs or encrypted overlay networks (Tailscale tailnets, Netbird, Nebula).".to_string(),
                "Documenting reserved and active ports enables system administrators to quickly spot unauthorized rogue listeners (like accidental unauthenticated Redis or Docker daemon exposures).".to_string(),
            ],
            recommendations: vec![
                "Regularly audit listening ports using the 'Active Ports' view to identify rogue services bound to 0.0.0.0.".to_string(),
                "Ensure sensitive database ports (3306, 5432, 6379) are explicitly bound to 127.0.0.1 or a protected internal interface only.".to_string(),
                "Always run with a host-level firewall (UFW, nftables, or iptables) configured to DROP unsolicited incoming WAN connections.".to_string(),
            ],
        },
        PhilosophySection {
            id: "port-allocation-hygiene".to_string(),
            title: "6. Port Conflict Prevention & Availability Tiers".to_string(),
            summary: "Systematic port allocation prevents collision bugs between developer tooling and enterprise daemons.".to_string(),
            details: vec![
                "Well-known ports (0-1023) belong exclusively to core operating system daemons and standard RFC protocol endpoints.".to_string(),
                "Registered user ports (1024-49151) must be assigned with intention; developers should avoid squatting on common database ports.".to_string(),
                "Dynamic/ephemeral ports (49152-65535) are managed dynamically by the Linux TCP/IP stack for outbound ephemeral client connections.".to_string(),
            ],
            recommendations: vec![
                "Check the 'Reserved & Unavailable Ports' directory before assigning static ports to newly containerized services.".to_string(),
                "When port conflicts occur on port 80 or 8080, leverage reverse proxy host routing rather than shifting everything to random high ports.".to_string(),
                "Reserve dedicated port ranges per application team or subsystem in your homelab or enterprise infrastructure documentation.".to_string(),
            ],
        },
        PhilosophySection {
            id: "code-craftsmanship".to_string(),
            title: "7. Engineering Craftsmanship & Code Hygiene".to_string(),
            summary: "Clean architecture, Biome enforcement, and consistent file sizing ensure long-term maintainability.".to_string(),
            details: vec![
                "Codebases stay maintainable when files are sized appropriately (~200 lines per module), preventing bloated god-classes.".to_string(),
                "Biome provides blazing-fast formatting, linting, and import sorting, outperforming legacy multi-tool frontend pipelines.".to_string(),
                "Every file starts with a simple, clear explanation of its purpose, reducing onboarding friction for future maintainers.".to_string(),
            ],
            recommendations: vec![
                "Run 'bun run check' (Biome) and 'cargo check' before committing code to ensure consistent formatting across languages.".to_string(),
                "Maintain explicit type definitions across both Rust models and React TypeScript interfaces.".to_string(),
                "Keep each subsystem decoupled: UI components should not couple to underlying Linux procfs implementation details.".to_string(),
            ],
        },
    ]
}

/// Computes live system statistics and diagnostic metrics.
pub fn get_system_stats(server_port: u16) -> SystemStats {
    let hostname = fs::read_to_string("/proc/sys/kernel/hostname")
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|_| "localhost".to_string());

    let os_release = fs::read_to_string("/proc/version")
        .map(|s| {
            let first_part = s.split('(').next().unwrap_or("Linux");
            first_part.trim().to_string()
        })
        .unwrap_or_else(|_| "Linux Kernel".to_string());

    let uptime_seconds = fs::read_to_string("/proc/uptime")
        .map(|s| {
            s.split_whitespace()
                .next()
                .and_then(|val| val.parse::<f64>().ok())
                .map(|f| f as u64)
                .unwrap_or(0)
        })
        .unwrap_or(0);

    let active_sockets = scan_active_ports();
    let total_listening = active_sockets
        .iter()
        .filter(|s| s.state == crate::models::SocketState::Listen)
        .count();

    let disclaimer = "PERSONAL USE ONLY: This utility has NO authentication. Intended for local/homelab diagnostics. Do not expose publicly without an authenticating reverse proxy."
        .to_string();

    SystemStats {
        hostname,
        os_info: os_release,
        uptime_seconds,
        total_listening_ports: total_listening,
        total_connections: active_sockets.len(),
        server_port,
        usage_disclaimer: disclaimer,
    }
}
