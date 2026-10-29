// ============================================================================
// File: src/scanner.rs
// Description: Real-Time Host Network Socket, Process & File Inspector
//
// What is this file?
// This file implements a passive, zero-synthetic-traffic socket scanner for
// Linux systems. It directly inspects Linux virtual kernel procfs:
//   - /proc/net/tcp & /proc/net/tcp6
//   - /proc/net/udp & /proc/net/udp6
//   - /proc/[pid]/fd/* socket symlinks
//   - /proc/[pid]/comm, cmdline, exe, and cwd
//
// It performs deep attribution per port:
//   1. Resolves owning Process ID (PID) and executable name.
//   2. Pinpoints the exact application running (e.g. OmniRoute, Ollama, Docker Proxy,
//      BigBangLink, Vite, Antigravity CLI, Nginx).
//   3. Identifies the specific file per port (script entrypoint, configuration file,
//      or compiled binary executable on disk).
// ============================================================================

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use crate::models::{ActivePort, SocketState, TransportProtocol};
use crate::reserved_db::describe_port;

/// Represents a raw parsed socket entry from /proc/net/tcp or udp.
#[derive(Debug, Clone)]
struct RawSocket {
    port: u16,
    address: String,
    state: SocketState,
    inode: u64,
    protocol: TransportProtocol,
}

/// In-memory cache of inspected process metadata from /proc/[pid].
#[derive(Debug, Clone)]
struct ProcessInfo {
    pid: u32,
    comm: String,
    argv: Vec<String>,
    cmdline: String,
    exe: Option<String>,
    cwd: Option<String>,
}

/// Scans the operating system for all active listening and connected sockets
/// with comprehensive application and file attribution.
pub fn scan_active_ports() -> Vec<ActivePort> {
    let (inode_to_pid, pid_map, cmdline_port_map) = inspect_all_processes();

    let mut raw_sockets = Vec::new();
    raw_sockets.extend(parse_proc_file("/proc/net/tcp", TransportProtocol::Tcp));
    raw_sockets.extend(parse_proc_file("/proc/net/tcp6", TransportProtocol::Tcp));
    raw_sockets.extend(parse_proc_file("/proc/net/udp", TransportProtocol::Udp));
    raw_sockets.extend(parse_proc_file("/proc/net/udp6", TransportProtocol::Udp));

    let mut results: Vec<ActivePort> = raw_sockets
        .into_iter()
        .map(|raw| {
            let (service_name, description) = describe_port(raw.port);

            // Step 1: Attempt to match PID by socket inode
            let mut resolved_proc: Option<&ProcessInfo> = inode_to_pid
                .get(&raw.inode)
                .and_then(|pid| pid_map.get(pid));

            // Step 2: Fallback to command-line port binding mapping (e.g. docker-proxy, minio)
            if resolved_proc.is_none() {
                if let Some(pid) = cmdline_port_map.get(&(raw.port, raw.protocol.clone())) {
                    resolved_proc = pid_map.get(pid);
                }
            }

            // Step 3: Fallback for well-known system daemons if permissions restrict /proc/[pid]/fd
            if resolved_proc.is_none() {
                resolved_proc = find_well_known_daemon(&pid_map, raw.port);
            }

            // Step 4: Extract application name, specific file, and process attributes
            let (pid, process_name, app_name, file_path, exe_path, cwd, cmdline) =
                match resolved_proc {
                    Some(info) => {
                        let (app, file) =
                            identify_app_and_file(info, raw.port, &raw.protocol, &service_name);
                        (
                            Some(info.pid),
                            info.comm.clone(),
                            app,
                            file,
                            info.exe.clone(),
                            info.cwd.clone(),
                            Some(info.cmdline.clone()),
                        )
                    }
                    None => {
                        let default_app = if service_name != "Unassigned / Custom" {
                            service_name.clone()
                        } else {
                            "System / Kernel Daemon".to_string()
                        };
                        (
                            None,
                            "System / Kernel Daemon".to_string(),
                            default_app,
                            None,
                            None,
                            None,
                            None,
                        )
                    }
                };

            ActivePort {
                port: raw.port,
                protocol: raw.protocol,
                address: raw.address,
                state: raw.state,
                pid,
                process_name,
                app_name,
                file_path,
                exe_path,
                cwd,
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
        a.port == b.port
            && a.protocol == b.protocol
            && a.address == b.address
            && a.state == b.state
    });

    results
}

/// Inspects /proc to harvest inode associations, process metadata, and cmdline port definitions.
fn inspect_all_processes() -> (
    HashMap<u64, u32>,
    HashMap<u32, ProcessInfo>,
    HashMap<(u16, TransportProtocol), u32>,
) {
    let mut inode_to_pid = HashMap::new();
    let mut pid_map = HashMap::new();
    let mut cmdline_port_map = HashMap::new();

    let proc_dir = match fs::read_dir("/proc") {
        Ok(dir) => dir,
        Err(_) => return (inode_to_pid, pid_map, cmdline_port_map),
    };

    for entry in proc_dir.flatten() {
        let file_name = entry.file_name();
        let pid_str = match file_name.to_str() {
            Some(s) => s,
            None => continue,
        };

        let pid: u32 = match pid_str.parse() {
            Ok(p) => p,
            Err(_) => continue,
        };

        let proc_path = entry.path();
        let comm = fs::read_to_string(proc_path.join("comm"))
            .map(|s| s.trim().to_string())
            .unwrap_or_else(|_| format!("PID-{}", pid));

        let raw_cmd = fs::read(proc_path.join("cmdline")).unwrap_or_default();
        let argv: Vec<String> = raw_cmd
            .split(|&b| b == 0)
            .filter(|chunk| !chunk.is_empty())
            .map(|chunk| String::from_utf8_lossy(chunk).trim().to_string())
            .collect();

        let cmdline = if argv.is_empty() {
            comm.clone()
        } else {
            argv.join(" ")
        };

        let exe = fs::read_link(proc_path.join("exe"))
            .ok()
            .map(|p| p.to_string_lossy().replace(" (deleted)", ""));

        let cwd = fs::read_link(proc_path.join("cwd"))
            .ok()
            .map(|p| p.to_string_lossy().to_string());

        // Parse explicit command-line port arguments (e.g., docker-proxy, minio, --port)
        detect_cmdline_ports(pid, &comm, &argv, &mut cmdline_port_map);

        // Inspect open file descriptors for socket inodes
        if let Ok(fd_entries) = fs::read_dir(proc_path.join("fd")) {
            for fd_entry in fd_entries.flatten() {
                if let Ok(link) = fs::read_link(fd_entry.path()) {
                    let link_str = link.to_string_lossy();
                    if link_str.starts_with("socket:[") && link_str.ends_with(']') {
                        let inode_str = &link_str[8..link_str.len() - 1];
                        if let Ok(inode) = inode_str.parse::<u64>() {
                            inode_to_pid.insert(inode, pid);
                        }
                    }
                }
            }
        }

        pid_map.insert(
            pid,
            ProcessInfo {
                pid,
                comm,
                argv,
                cmdline,
                exe,
                cwd,
            },
        );
    }

    (inode_to_pid, pid_map, cmdline_port_map)
}

/// Identifies explicit port bindings encoded in command line arguments (like docker-proxy).
fn detect_cmdline_ports(
    pid: u32,
    comm: &str,
    argv: &[String],
    map: &mut HashMap<(u16, TransportProtocol), u32>,
) {
    let is_docker_proxy = comm.contains("docker-proxy") || argv.iter().any(|a| a.contains("docker-proxy"));
    if is_docker_proxy {
        let mut host_port = None;
        let mut proto = TransportProtocol::Tcp;

        for (i, arg) in argv.iter().enumerate() {
            if arg == "-host-port" && i + 1 < argv.len() {
                if let Ok(p) = argv[i + 1].parse::<u16>() {
                    host_port = Some(p);
                }
            } else if arg == "-proto" && i + 1 < argv.len() {
                if argv[i + 1].eq_ignore_ascii_case("udp") {
                    proto = TransportProtocol::Udp;
                }
            }
        }

        if let Some(port) = host_port {
            map.insert((port, proto), pid);
        }
    }
}

/// Matches well-known system services to active daemons when /proc/[pid]/fd is unreadable.
fn find_well_known_daemon<'a>(
    pid_map: &'a HashMap<u32, ProcessInfo>,
    port: u16,
) -> Option<&'a ProcessInfo> {
    let target_comm = match port {
        22 => "sshd",
        53 => "systemd-resolve",
        80 | 443 => "caddy",
        631 => "cupsd",
        3389 | 3350 => "xrdp",
        _ => return None,
    };

    pid_map.values().find(|info| {
        info.comm == target_comm
            || info.comm.starts_with(target_comm)
            || info.exe.as_deref().map(|e| e.contains(target_comm)).unwrap_or(false)
    })
}

/// Analyzes process invocation to pinpoint the exact application name and running file.
fn identify_app_and_file(
    info: &ProcessInfo,
    _port: u16,
    _protocol: &TransportProtocol,
    service_name: &str,
) -> (String, Option<String>) {
    let clean_comm = info
        .comm
        .split('(')
        .next()
        .unwrap_or(&info.comm)
        .trim();

    let exe_base = info
        .exe
        .as_deref()
        .and_then(|p| Path::new(p).file_name())
        .and_then(|n| n.to_str())
        .unwrap_or(clean_comm);

    // 1. Check known application registry
    let known_name = match clean_comm {
        "ollama" => Some("Ollama AI Engine".to_string()),
        "agy" => Some("Antigravity CLI (agy)".to_string()),
        "omniroute" => Some("OmniRoute".to_string()),
        "caddy" => Some("Caddy Web Server".to_string()),
        "nginx" => Some("Nginx Web Server".to_string()),
        "sshd" => Some("OpenSSH Server".to_string()),
        "systemd-resolve" | "systemd-resolved" => Some("systemd-resolved DNS".to_string()),
        "cupsd" => Some("CUPS Print Server".to_string()),
        "xrdp" => Some("XRDP Remote Desktop".to_string()),
        "xrdp-sesman" => Some("XRDP Session Manager".to_string()),
        "dockerd" => Some("Docker Daemon".to_string()),
        "containerd" => Some("Containerd Daemon".to_string()),
        "minio" => Some("MinIO Object Storage".to_string()),
        "redis-server" => Some("Redis Cache Server".to_string()),
        "postgres" => Some("PostgreSQL Database".to_string()),
        "mysqld" | "mariadbd" => Some("MySQL / MariaDB".to_string()),
        "tailscaled" => Some("Tailscale Mesh VPN".to_string()),
        "bigbang-link" => Some("BigBangLink".to_string()),
        "port-inventory" => Some("Port Inventory (This Service)".to_string()),
        _ => None,
    };

    // 2. Handle Docker Proxy specifically (extract container forwarding target)
    if clean_comm.contains("docker-proxy") || exe_base.contains("docker-proxy") {
        let mut container_port = None;
        for (i, arg) in info.argv.iter().enumerate() {
            if arg == "-container-port" && i + 1 < info.argv.len() {
                container_port = Some(info.argv[i + 1].clone());
            }
        }
        let app_name = match container_port {
            Some(cp) => format!("Docker Proxy (-> Container :{})", cp),
            None => "Docker Proxy".to_string(),
        };
        let file_path = info.exe.clone().or_else(|| {
            if Path::new("/usr/bin/docker-proxy").exists() {
                Some("/usr/bin/docker-proxy".to_string())
            } else {
                None
            }
        });
        return (app_name, file_path);
    }

    // 3. Check for runtime interpreters (Node, Bun, Python, Deno, Ruby, Bash)
    let is_runtime = [
        "node", "nodejs", "bun", "deno", "python", "python3", "ruby", "perl", "php", "bash", "sh",
    ]
    .iter()
    .any(|&rt| exe_base.to_lowercase().contains(rt) || clean_comm.to_lowercase().contains(rt));

    // Search argv for script files or configuration flags
    let mut script_file = None;
    let mut config_file = None;

    if info.argv.len() > 1 {
        for (i, arg) in info.argv.iter().enumerate().skip(1) {
            if arg.starts_with('-') {
                if (arg == "-c" || arg == "-C" || arg == "--config" || arg == "-config" || arg == "-f")
                    && i + 1 < info.argv.len()
                {
                    config_file = Some(info.argv[i + 1].clone());
                }
                continue;
            }

            let is_script_ext = [
                ".js", ".mjs", ".cjs", ".ts", ".mts", ".py", ".rb", ".php", ".sh", ".json",
            ]
            .iter()
            .any(|&ext| arg.ends_with(ext));

            if is_script_ext && script_file.is_none() {
                script_file = Some(arg.clone());
            }
        }
    }

    // Resolve script path against process cwd
    let resolved_script = script_file.map(|raw| resolve_path(&raw, info.cwd.as_deref()));
    let resolved_config = config_file.map(|raw| resolve_path(&raw, info.cwd.as_deref()));

    // If runtime and no script was passed explicitly in argv, check cwd for common entrypoint files
    let cwd_entry_file = if is_runtime && resolved_script.is_none() {
        find_cwd_entrypoint(info.cwd.as_deref())
    } else {
        None
    };

    let mut file_path = resolved_script
        .clone()
        .or(resolved_config)
        .or(cwd_entry_file)
        .or_else(|| info.exe.clone());

    // If file_path is still None, check well-known system binary paths
    if file_path.is_none() {
        let candidate_paths: &[&str] = match clean_comm {
            "sshd" => &["/usr/sbin/sshd", "/etc/ssh/sshd_config"],
            "systemd-resolve" | "systemd-resolved" => &["/usr/lib/systemd/systemd-resolved"],
            "cupsd" => &["/usr/sbin/cupsd", "/etc/cups/cupsd.conf"],
            "xrdp" => &["/usr/sbin/xrdp", "/etc/xrdp/xrdp.ini"],
            "xrdp-sesman" => &["/usr/sbin/xrdp-sesman"],
            "nginx" => &["/usr/sbin/nginx", "/etc/nginx/nginx.conf"],
            "caddy" => &["/etc/caddy/Caddyfile", "/usr/bin/caddy"],
            "dockerd" => &["/usr/bin/dockerd"],
            "containerd" => &["/usr/bin/containerd"],
            _ => &[],
        };
        for &cp in candidate_paths {
            if Path::new(cp).exists() {
                file_path = Some(cp.to_string());
                break;
            }
        }
    }

    // Determine finalized app name
    let app_name = if let Some(known) = known_name {
        known
    } else if is_runtime {
        if let Some(ref script) = resolved_script {
            let path_obj = Path::new(script);
            let script_name = path_obj
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("Script Application");

            // Check if inside node_modules package
            if let Some(pkg) = extract_npm_package_name(script) {
                pkg
            } else if let Some(pkg_name) = read_package_json_name(info.cwd.as_deref()) {
                pkg_name
            } else {
                script_name.to_string()
            }
        } else if let Some(pkg_name) = read_package_json_name(info.cwd.as_deref()) {
            pkg_name
        } else if clean_comm.len() > 2 {
            clean_comm.to_string()
        } else {
            service_name.to_string()
        }
    } else if !clean_comm.is_empty() && clean_comm != "PID" {
        clean_comm.to_string()
    } else {
        service_name.to_string()
    };

    (app_name, file_path)
}

/// Inspects the working directory for common entrypoint files when running via runtime.
fn find_cwd_entrypoint(cwd: Option<&str>) -> Option<String> {
    let working_dir = cwd?;
    let candidates = [
        "server.js",
        "index.js",
        "app.js",
        "main.js",
        "src/index.ts",
        "src/main.ts",
        "server.ts",
        "index.ts",
        "main.py",
        "app.py",
        "server.py",
        "package.json",
    ];
    for &c in &candidates {
        let p = Path::new(working_dir).join(c);
        if p.exists() {
            return Some(p.to_string_lossy().to_string());
        }
    }
    None
}

/// Resolves a file path, prepending current working directory if relative.
fn resolve_path(raw: &str, cwd: Option<&str>) -> String {
    let p = Path::new(raw);
    if p.is_absolute() {
        raw.to_string()
    } else if let Some(working_dir) = cwd {
        let combined = PathBuf::from(working_dir).join(raw);
        combined.to_string_lossy().to_string()
    } else {
        raw.to_string()
    }
}

/// Extracts package name from a node_modules path (e.g. node_modules/omniroute/... -> omniroute).
fn extract_npm_package_name(path_str: &str) -> Option<String> {
    let parts: Vec<&str> = path_str.split("node_modules/").collect();
    if parts.len() < 2 {
        return None;
    }
    let rest = parts[1];
    let subparts: Vec<&str> = rest.split('/').collect();
    if subparts.is_empty() {
        return None;
    }
    if subparts[0].starts_with('@') && subparts.len() > 1 {
        Some(format!("{}/{}", subparts[0], subparts[1]))
    } else {
        Some(subparts[0].to_string())
    }
}

/// Reads the "name" field from package.json in the current working directory if available.
fn read_package_json_name(cwd: Option<&str>) -> Option<String> {
    let working_dir = cwd?;
    let pkg_path = Path::new(working_dir).join("package.json");
    let content = fs::read_to_string(pkg_path).ok()?;
    let parsed: serde_json::Value = serde_json::from_str(&content).ok()?;
    parsed.get("name")?.as_str().map(|s| s.to_string())
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
        } else if ip_hex.ends_with("0000000000000000FFFF")
            || ip_hex.starts_with("0000000000000000FFFF")
        {
            Some(("::ffff:0.0.0.0".to_string(), port))
        } else {
            Some(("::[IPv6]".to_string(), port))
        }
    } else {
        Some((ip_hex.to_string(), port))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scan_active_ports() {
        let ports = scan_active_ports();
        println!("Inspected {} active sockets", ports.len());
        for p in ports.iter().filter(|s| s.state == SocketState::Listen) {
            println!(
                "Port {:5} | State: {:?} | App: {:30} | File: {:?}",
                p.port, p.state, p.app_name, p.file_path
            );
        }
        // Ensure hex parsing works
        let parsed = parse_hex_endpoint("0100007F:0050");
        assert_eq!(parsed, Some(("127.0.0.1".to_string(), 80)));
    }
}
