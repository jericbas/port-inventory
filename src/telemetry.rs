// ============================================================================
// File: src/telemetry.rs
// Description: Real-Time Host Telemetry & System Diagnostics
//
// What is this file?
// This module collects fundamental host telemetry metrics and system diagnostics
// including hostname, kernel version, uptime, total listening ports, and the
// active bound port of the Port Inventory daemon.
// ============================================================================

use std::fs;

use crate::models::SystemStats;
use crate::scanner::scan_active_ports;

/// Collects real-time telemetry metrics directly from the Linux procfs filesystem.
pub fn get_system_stats(server_port: u16) -> SystemStats {
    let hostname = fs::read_to_string("/etc/hostname")
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|_| "localhost".to_string());

    let os_release = fs::read_to_string("/proc/sys/kernel/osrelease")
        .or_else(|_| fs::read_to_string("/proc/version"))
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
