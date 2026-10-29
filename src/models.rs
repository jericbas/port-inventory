// ============================================================================
// File: src/models.rs
// Description: Core Domain Models & Data Structures
//
// What is this file?
// This file defines all the fundamental data types, enumerations, and serialization
// structs used across the Port Inventory application. It represents:
// 1. Active network sockets detected on the host operating system.
// 2. IANA well-known and system reserved port definitions.
// 3. System telemetry (CPU, memory, uptime, host details).
// 4. Detailed process, application, and file attribution per port.
//
// Every struct derives serde Serialize/Deserialize for seamless JSON transmission
// to the Vite/React frontend client.
// ============================================================================

use serde::{Deserialize, Serialize};

/// Transport layer protocol for a network port.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum TransportProtocol {
    Tcp,
    Udp,
    All,
}

impl std::fmt::Display for TransportProtocol {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Tcp => write!(f, "TCP"),
            Self::Udp => write!(f, "UDP"),
            Self::All => write!(f, "TCP/UDP"),
        }
    }
}

/// Operational state of a listening or established socket connection.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SocketState {
    Listen,
    Established,
    TimeWait,
    CloseWait,
    SynSent,
    SynRecv,
    FinWait1,
    FinWait2,
    Closed,
    Unknown,
}

impl SocketState {
    /// Formats the state into human-friendly text for frontend display.
    #[allow(dead_code)]
    pub fn as_label(&self) -> &'static str {
        match self {
            Self::Listen => "LISTENING",
            Self::Established => "ESTABLISHED",
            Self::TimeWait => "TIME_WAIT",
            Self::CloseWait => "CLOSE_WAIT",
            Self::SynSent => "SYN_SENT",
            Self::SynRecv => "SYN_RECV",
            Self::FinWait1 => "FIN_WAIT_1",
            Self::FinWait2 => "FIN_WAIT_2",
            Self::Closed => "CLOSED",
            Self::Unknown => "ACTIVE",
        }
    }
}

/// Category classification for well-known and registered ports.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PortCategory {
    WebServices,
    Database,
    RemoteAccess,
    FileTransfer,
    Messaging,
    CloudDevOps,
    CoreNetwork,
    Security,
    SystemReserved,
    CustomApp,
}

/// Availability status indicating whether a port is free, active, or restricted.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PortAvailability {
    Active,
    Reserved,
    Privileged,
    Available,
}

/// Represents an actively inspected port on the local Linux/Unix host.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivePort {
    /// Port number (e.g., 80, 443, 8080)
    pub port: u16,
    /// Protocol (TCP or UDP)
    pub protocol: TransportProtocol,
    /// IP address bound to the socket (e.g. 0.0.0.0, 127.0.0.1, ::)
    pub address: String,
    /// State of the socket (e.g. LISTEN, ESTABLISHED)
    pub state: SocketState,
    /// Process ID that owns this socket inode (if accessible)
    pub pid: Option<u32>,
    /// Executable name of the owning process (e.g., nginx, docker, node)
    pub process_name: String,
    /// Specific human-readable application name (e.g., OmniRoute, Ollama, Docker Proxy)
    pub app_name: String,
    /// Specific file path running this service (script, config file, or binary)
    pub file_path: Option<String>,
    /// Binary executable path (/proc/[pid]/exe)
    pub exe_path: Option<String>,
    /// Working directory of the owning process (/proc/[pid]/cwd)
    pub cwd: Option<String>,
    /// Complete command line arguments used to invoke the process
    pub cmdline: Option<String>,
    /// Well-known service name matching this port if recognized
    pub service_name: String,
    /// Simple summary description of standard expected usage
    pub description: String,
    /// Inode identifier within the Linux kernel socket table
    pub inode: u64,
    /// User-assigned custom human-readable nickname or alias (e.g., 'Staging API')
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub custom_name: Option<String>,
}

/// Represents a standard IANA or system-reserved port specification.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReservedPort {
    /// Port number (0 through 65535)
    pub port: u16,
    /// Protocol specification
    pub protocol: TransportProtocol,
    /// Standard service or daemon identifier (e.g., HTTP, SSH, DNS)
    pub service_name: String,
    /// Description explaining what the port is used for
    pub description: String,
    /// Category grouping
    pub category: PortCategory,
    /// Current real-time availability on this host
    pub availability: PortAvailability,
    /// Whether port requires root/CAP_NET_BIND_SERVICE (< 1024)
    pub is_privileged: bool,
    /// Common vulnerabilities or security considerations for this port
    pub security_note: String,
    /// Official RFC or standard document reference
    pub rfc_reference: Option<String>,
    /// User-assigned custom human-readable nickname or alias
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub custom_name: Option<String>,
}

/// System diagnostics and host telemetry summary.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemStats {
    /// Hostname of the current operating system
    pub hostname: String,
    /// Operating system platform and kernel version
    pub os_info: String,
    /// System uptime in human readable format
    pub uptime_seconds: u64,
    /// Total count of active listening sockets
    pub total_listening_ports: usize,
    /// Total count of established client connections
    pub total_connections: usize,
    /// Port this inventory application server is actively bound to
    pub server_port: u16,
    /// Warning message indicating personal homelab usage boundaries
    pub usage_disclaimer: String,
}

/// Comprehensive deep-dive detail packet for inspecting a specific port.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortDetail {
    /// Port number requested
    pub port: u16,
    /// Known IANA specification if present
    pub reservation: Option<ReservedPort>,
    /// Active processes currently bound to this port (if any)
    pub active_bindings: Vec<ActivePort>,
    /// Whether this port requires root privilege to bind on Linux
    pub is_system_reserved: bool,
    /// Operational verdict on whether a developer can bind a new app here
    pub bind_verdict: String,
    /// Recommended alternative ports if this one is occupied or reserved
    pub suggested_alternatives: Vec<u16>,
    /// User-assigned custom human-readable nickname or alias
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub custom_name: Option<String>,
}

/// Request payload to assign or update a custom name/alias for a port.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomNamePayload {
    pub name: String,
}


/// Runtime configuration options for the server backend.
#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct AppConfig {
    /// Primary bind address
    pub host: String,
    /// Preferred primary port (e.g. 80)
    pub port: u16,
    /// Fallback port if primary port requires ungranted privileges
    pub fallback_port: u16,
    /// Root path to static web assets (Vite dist build)
    pub static_dir: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            host: "0.0.0.0".to_string(),
            port: 80,
            fallback_port: 8080,
            static_dir: "./dist".to_string(),
        }
    }
}
