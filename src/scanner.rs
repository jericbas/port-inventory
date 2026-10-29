// ============================================================================
// File: src/scanner.rs
// Description: Real-Time Host Network Socket and Process Inspector
//
// What is this file?
// This file implements a low-overhead, zero-external-dependency socket scanner
// for Linux systems. It directly inspects the Linux virtual kernel filesystem:
//   - /proc/net/tcp & /proc/net/tcp6
//   - /proc/net/udp & /proc/net/udp6
//   - /proc/[pid]/fd/* socket symlinks
//
// By reading socket inodes directly from the kernel and cross-referencing them
// with active process file descriptors, this module maps every listening port
// to its owning Process ID (PID), executable name, and invocation command line.
// ============================================================================

use std::collections::HashMap;
use std::fs;
use std::path::Path;

use crate::models::{ActivePort, SocketState, TransportProtocol};
use crate::reserved_db::describe_port;

/// Represents a raw parsed socket entry from /proc/net/tcp or udp.
#[derive(Debug)]
struct RawSocket {
    port: u16,
    address: String,
    state: SocketState,
    inode: u64,
    protocol: TransportProtocol,
}

/// Scans the operating system for all active listening and connected sockets.
pub fn scan_active_ports() -> Vec<ActivePort> {
    let inode_map = build_inode_process_map();
    let mut raw_sockets = Vec::new();

    // Parse IPv4 and IPv6 TCP sockets
    raw_sockets.extend(parse_proc_file("/proc/net/tcp", TransportProtocol::Tcp));
    raw_sockets.extend(parse_proc_file("/proc/net/tcp6", TransportProtocol::Tcp));

    // Parse IPv4 and IPv6 UDP sockets
    raw_sockets.extend(parse_proc_file("/proc/net/udp", TransportProtocol::Udp));
    raw_sockets.extend(parse_proc_file("/proc/net/udp6", TransportProtocol::Udp));

    let mut results: Vec<ActivePort> = raw_sockets
        .into_iter()
        .map(|raw| {
            let (service_name, description) = describe_port(raw.port);
            let proc_info = inode_map.get(&raw.inode);

            let (pid, process_name, cmdline) = match proc_info {
                Some((pid, name, cmd)) => (Some(*pid), name.clone(), Some(cmd.clone())),
                None => (None, "System / Kernel Daemon".to_string(), None),
            };

            ActivePort {
                port: raw.port,
                protocol: raw.protocol,
                address: raw.address,
                state: raw.state,
                pid,
                process_name,
                cmdline,
                service_name,
                description,
                inode: raw.inode,
            }
        })
        .collect();

    // Sort cleanly: Listening ports first, then ascending by port number
    results.sort_by(|a, b| {
        let a_listen = a.state == SocketState::Listen;
        let b_listen = b.state == SocketState::Listen;
        match (a_listen, b_listen) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.port.cmp(&b.port),
        }
    });

    // Deduplicate any duplicate reports caused by dual-stack IPv4/IPv6 binds
    results.dedup_by(|a, b| {
        a.port == b.port && a.protocol == b.protocol && a.address == b.address && a.state == b.state
    });

    results
}

/// Builds an Inode -> (PID, ProcessName, Cmdline) lookup table by inspecting /proc.
fn build_inode_process_map() -> HashMap<u64, (u32, String, String)> {
    let mut map = HashMap::new();
    let proc_dir = match fs::read_dir("/proc") {
        Ok(dir) => dir,
        Err(_) => return map,
    };

    for entry in proc_dir.flatten() {
        let file_name = entry.file_name();
        let pid_str = match file_name.to_str() {
            Some(s) => s,
            None => continue,
        };

        // We only care about directories that are numeric PIDs
        let pid: u32 = match pid_str.parse() {
            Ok(p) => p,
            Err(_) => continue,
        };

        let fd_dir_path = entry.path().join("fd");
        let fd_entries = match fs::read_dir(&fd_dir_path) {
            Ok(entries) => entries,
            Err(_) => continue, // Permission denied for processes owned by other users
        };

        let (comm, cmdline) = read_process_info(pid, &entry.path());

        for fd_entry in fd_entries.flatten() {
            if let Ok(link) = fs::read_link(fd_entry.path()) {
                let link_str = link.to_string_lossy();
                // Socket symlinks look like: "socket:[123456]"
                if link_str.starts_with("socket:[") && link_str.ends_with(']') {
                    let inode_str = &link_str[8..link_str.len() - 1];
                    if let Ok(inode) = inode_str.parse::<u64>() {
                        map.insert(inode, (pid, comm.clone(), cmdline.clone()));
                    }
                }
            }
        }
    }

    map
}

/// Reads executable name and command line for a given process PID.
fn read_process_info(pid: u32, proc_path: &Path) -> (String, String) {
    let comm = fs::read_to_string(proc_path.join("comm"))
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|_| format!("PID-{}", pid));

    let cmdline = fs::read_to_string(proc_path.join("cmdline"))
        .map(|s| s.replace('\0', " ").trim().to_string())
        .unwrap_or_else(|_| comm.clone());

    let final_cmd = if cmdline.is_empty() { comm.clone() } else { cmdline };

    (comm, final_cmd)
}

/// Parses a /proc/net/ socket file into structured RawSocket objects.
fn parse_proc_file(file_path: &str, protocol: TransportProtocol) -> Vec<RawSocket> {
    let content = match fs::read_to_string(file_path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };

    let mut sockets = Vec::new();
    let mut lines = content.lines();

    // Skip the kernel table column header row
    let _ = lines.next();

    for line in lines {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 10 {
            continue;
        }

        let local_addr_hex = parts[1];
        let state_hex = parts[3];
        let inode_str = parts[9];

        let (address, port) = match parse_hex_endpoint(local_addr_hex) {
            Some(pair) => pair,
            None => continue,
        };

        let state = match (state_hex, &protocol) {
            ("0A", TransportProtocol::Tcp) => SocketState::Listen,
            ("01", TransportProtocol::Tcp) => SocketState::Established,
            ("06", TransportProtocol::Tcp) => SocketState::TimeWait,
            ("08", TransportProtocol::Tcp) => SocketState::CloseWait,
            (_, TransportProtocol::Udp) => SocketState::Listen,
            _ => SocketState::Unknown,
        };

        let inode = inode_str.parse::<u64>().unwrap_or(0);

        sockets.push(RawSocket {
            port,
            address,
            state,
            inode,
            protocol: protocol.clone(),
        });
    }

    sockets
}

/// Converts a hex encoded IP:Port pair (e.g. 0100007F:0050) into (127.0.0.1, 80).
fn parse_hex_endpoint(raw: &str) -> Option<(String, u16)> {
    let mut split = raw.split(':');
    let ip_hex = split.next()?;
    let port_hex = split.next()?;

    let port = u16::from_str_radix(port_hex, 16).ok()?;

    if ip_hex.len() == 8 {
        // IPv4 hex parsing (little-endian bytes)
        let num = u32::from_str_radix(ip_hex, 16).ok()?;
        let b1 = (num & 0xFF) as u8;
        let b2 = ((num >> 8) & 0xFF) as u8;
        let b3 = ((num >> 16) & 0xFF) as u8;
        let b4 = ((num >> 24) & 0xFF) as u8;
        Some((format!("{}.{}.{}.{}", b1, b2, b3, b4), port))
    } else if ip_hex.len() == 32 {
        // IPv6 hex parsing (format representation)
        if ip_hex.chars().all(|c| c == '0') {
            Some(("::".to_string(), port))
        } else if ip_hex.ends_with("0000000000000000FFFF") || ip_hex.starts_with("0000000000000000FFFF") {
            Some(("::ffff:0.0.0.0".to_string(), port))
        } else {
            Some(("::[IPv6]".to_string(), port))
        }
    } else {
        Some((ip_hex.to_string(), port))
    }
}
