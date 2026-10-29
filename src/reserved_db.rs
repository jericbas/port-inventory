// ============================================================================
// File: src/reserved_db.rs
// Description: Standard IANA and Well-Known System Port Registry
//
// What is this file?
// This file serves as the definitive reference database for well-known network ports,
// IANA standardized reservations, and common enterprise/developer daemon ports.
//
// In networking, ports 0-1023 are privileged system ports requiring administrative
// permissions on Unix-like systems. Ports 1024-49151 are registered user ports.
// This module provides lookup tables, security risk profiles, protocol associations,
// and descriptions so users understand what each port does and why it may be reserved.
// ============================================================================

use crate::models::{PortAvailability, PortCategory, ReservedPort, TransportProtocol};

/// Returns the comprehensive catalog of well-known and system reserved ports.
pub fn get_all_reserved_ports() -> Vec<ReservedPort> {
    vec![
        // System and Core Network Services (0-1023)
        entry(0, TransportProtocol::All, "Reserved / Wildcard", "Reserved by IANA; often used in programming as a dynamic port wildcard.", PortCategory::SystemReserved, true, "Cannot be bound directly as a listening service.", "RFC 1700"),
        entry(7, TransportProtocol::Tcp, "Echo Protocol", "Echo service sends back whatever it receives; historical diagnostic test.", PortCategory::CoreNetwork, true, "Prone to ping-pong amplification denial of service.", "RFC 862"),
        entry(20, TransportProtocol::Tcp, "FTP-DATA", "File Transfer Protocol (FTP) active data channel.", PortCategory::FileTransfer, true, "Transmits unencrypted data packets; vulnerable to sniffing.", "RFC 959"),
        entry(21, TransportProtocol::Tcp, "FTP-CONTROL", "File Transfer Protocol (FTP) command and control channel.", PortCategory::FileTransfer, true, "Transmits credentials in cleartext unless FTPS is enforced.", "RFC 959"),
        entry(22, TransportProtocol::Tcp, "SSH / SFTP", "Secure Shell remote login, command execution, and secure file transfer.", PortCategory::RemoteAccess, true, "High-value target for automated brute force attacks.", "RFC 4253"),
        entry(23, TransportProtocol::Tcp, "Telnet", "Legacy unencrypted interactive text communication terminal.", PortCategory::RemoteAccess, true, "Insecure protocol. Never expose to untrusted networks.", "RFC 854"),
        entry(25, TransportProtocol::Tcp, "SMTP", "Simple Mail Transfer Protocol used for internet email routing.", PortCategory::Messaging, true, "Frequently targeted for open mail relay exploitation and spam.", "RFC 5321"),
        entry(53, TransportProtocol::All, "DNS", "Domain Name System resolving human hostnames to IP addresses.", PortCategory::CoreNetwork, true, "Susceptible to DNS amplification DDoS and cache poisoning.", "RFC 1035"),
        entry(67, TransportProtocol::Udp, "DHCP-Server", "Dynamic Host Configuration Protocol server assigning IP addresses.", PortCategory::CoreNetwork, true, "Rogue DHCP servers can intercept all local subnet traffic.", "RFC 2131"),
        entry(68, TransportProtocol::Udp, "DHCP-Client", "Dynamic Host Configuration Protocol client lease negotiation.", PortCategory::CoreNetwork, true, "Local network address acquisition.", "RFC 2131"),
        entry(69, TransportProtocol::Udp, "TFTP", "Trivial File Transfer Protocol used for diskless booting and PXE.", PortCategory::FileTransfer, true, "No authentication mechanism whatsoever; highly insecure.", "RFC 1350"),
        entry(80, TransportProtocol::Tcp, "HTTP", "Hypertext Transfer Protocol for standard web page delivery.", PortCategory::WebServices, true, "Cleartext web traffic. Port where this application prefers to bind.", "RFC 2616"),
        entry(88, TransportProtocol::All, "Kerberos", "Kerberos network authentication service for single sign-on tickets.", PortCategory::Security, true, "Domain controller target for ticket forging attacks (Golden Ticket).", "RFC 4120"),
        entry(110, TransportProtocol::Tcp, "POP3", "Post Office Protocol version 3 for email retrieval.", PortCategory::Messaging, true, "Plaintext credentials unless upgraded via STLS or POP3S (995).", "RFC 1939"),
        entry(111, TransportProtocol::All, "rpcbind / SUN-RPC", "RPC portmapper coordinating NFS and remote procedure call services.", PortCategory::CoreNetwork, true, "High historical vulnerability rate; reveals internal RPC services.", "RFC 1833"),
        entry(123, TransportProtocol::Udp, "NTP", "Network Time Protocol synchronizing system clocks across the globe.", PortCategory::CoreNetwork, true, "Used frequently in UDP reflection denial of service vectors.", "RFC 5905"),
        entry(137, TransportProtocol::Udp, "NetBIOS-NS", "NetBIOS Name Service used in legacy Windows networking.", PortCategory::CoreNetwork, true, "Leans internal hostnames and active domain configurations.", "RFC 1001"),
        entry(138, TransportProtocol::Udp, "NetBIOS-DGM", "NetBIOS Datagram Service for Windows workgroup browsing.", PortCategory::CoreNetwork, true, "Broadcast chatty protocol on internal LAN segments.", "RFC 1002"),
        entry(139, TransportProtocol::Tcp, "NetBIOS-SSN", "NetBIOS Session Service providing file and printer sharing.", PortCategory::FileTransfer, true, "Historical target for SMB worms and enumeration.", "RFC 1001"),
        entry(143, TransportProtocol::Tcp, "IMAP", "Internet Message Access Protocol for email folder synchronization.", PortCategory::Messaging, true, "Cleartext login unless IMAPS (993) is utilized.", "RFC 3501"),
        entry(161, TransportProtocol::Udp, "SNMP", "Simple Network Management Protocol monitoring switches and servers.", PortCategory::CoreNetwork, true, "Weak community strings (public/private) allow unauthorized telemetry.", "RFC 1157"),
        entry(162, TransportProtocol::Udp, "SNMP-Trap", "Asynchronous alert notification channel for SNMP traps.", PortCategory::CoreNetwork, true, "Telemetry alert ingestion point.", "RFC 1157"),
        entry(179, TransportProtocol::Tcp, "BGP", "Border Gateway Protocol routing autonomous systems on the Internet backbone.", PortCategory::CoreNetwork, true, "BGP hijacking can redirect internet-scale traffic routes.", "RFC 4271"),
        entry(389, TransportProtocol::All, "LDAP", "Lightweight Directory Access Protocol for enterprise directories.", PortCategory::Security, true, "LDAP injection and sensitive corporate organizational disclosure.", "RFC 4511"),
        entry(443, TransportProtocol::Tcp, "HTTPS", "Hypertext Transfer Protocol Secure with TLS encryption.", PortCategory::WebServices, true, "Standard modern internet secure transport channel.", "RFC 2818"),
        entry(445, TransportProtocol::Tcp, "SMB / CIFS", "Microsoft Server Message Block direct host file sharing.", PortCategory::FileTransfer, true, "Critical security surface (EternalBlue / WannaCry exploits).", "MS-SMB2"),
        entry(465, TransportProtocol::Tcp, "SMTPS", "Secure SMTP over SSL/TLS for outgoing mail submission.", PortCategory::Messaging, true, "Secure authenticated outgoing email.", "RFC 8314"),
        entry(500, TransportProtocol::Udp, "ISAKMP / IKE", "Internet Security Association and Key Management Protocol for IPsec VPN.", PortCategory::Security, true, "VPN handshake negotiation target for aggressive mode profiling.", "RFC 2408"),
        entry(514, TransportProtocol::Udp, "Syslog", "Standard system event logging and central telemetry collection.", PortCategory::CoreNetwork, true, "Unauthenticated UDP logs can be forged or overwhelmed.", "RFC 5424"),
        entry(587, TransportProtocol::Tcp, "SMTP-Submission", "Modern standard email message submission port.", PortCategory::Messaging, true, "Requires client authentication and STARTTLS.", "RFC 6409"),
        entry(636, TransportProtocol::Tcp, "LDAPS", "Lightweight Directory Access Protocol over TLS tunnel.", PortCategory::Security, true, "Encrypted Active Directory and OpenLDAP access.", "RFC 4513"),
        entry(853, TransportProtocol::Tcp, "DNS over TLS (DoT)", "Encrypted DNS lookups preventing upstream ISP eavesdropping.", PortCategory::CoreNetwork, true, "Privacy enhancing standard DNS transport channel.", "RFC 7858"),
        entry(873, TransportProtocol::Tcp, "rsync", "Remote file copy and delta synchronization daemon.", PortCategory::FileTransfer, true, "Unrestricted rsync configurations allow arbitrary file extraction.", "RFC 5781"),
        entry(993, TransportProtocol::Tcp, "IMAPS", "Secure Internet Message Access Protocol over TLS.", PortCategory::Messaging, true, "Industry standard secure email synchronization.", "RFC 8314"),
        entry(995, TransportProtocol::Tcp, "POP3S", "Secure Post Office Protocol version 3 over TLS.", PortCategory::Messaging, true, "Encrypted mail download protocol.", "RFC 8314"),

        // Registered Enterprise, Database, and Modern Cloud/DevOps Ports (1024-49151)
        entry(1194, TransportProtocol::Udp, "OpenVPN", "Open-source virtual private network tunnel protocol.", PortCategory::Security, false, "VPN gateway entry point; target for authentication tampering.", "OpenVPN Spec"),
        entry(1433, TransportProtocol::Tcp, "MSSQL", "Microsoft SQL Server relational database engine.", PortCategory::Database, false, "Target of credential guessing and SQL injection vectors.", "MS-TDS"),
        entry(1521, TransportProtocol::Tcp, "Oracle DB", "Oracle Database Listener for enterprise RDBMS connections.", PortCategory::Database, false, "TNS listener poisoning and privilege escalation exploits.", "Oracle Net"),
        entry(1883, TransportProtocol::Tcp, "MQTT (Plain)", "Lightweight machine-to-machine IoT messaging protocol.", PortCategory::Messaging, false, "No encryption in plain mode; sends sensor telemetry unencrypted.", "OASIS MQTT"),
        entry(2049, TransportProtocol::All, "NFS", "Network File System for mounting distributed storage on Unix.", PortCategory::FileTransfer, false, "Improper IP export filters grant root filesystem mounts.", "RFC 7530"),
        entry(2181, TransportProtocol::Tcp, "Apache ZooKeeper", "Centralized service for maintaining configuration information and naming.", PortCategory::CloudDevOps, false, "ZooKeeper cluster coordination and node configuration.", "Apache ZooKeeper"),
        entry(2375, TransportProtocol::Tcp, "Docker Daemon (HTTP)", "Unencrypted Docker REST API socket.", PortCategory::CloudDevOps, false, "EXTREME RISK: Grants unauthenticated root container host access.", "Docker API"),
        entry(2376, TransportProtocol::Tcp, "Docker Daemon (TLS)", "TLS-secured Docker REST API management socket.", PortCategory::CloudDevOps, false, "Requires client mutual TLS certificates for access.", "Docker API"),
        entry(2379, TransportProtocol::Tcp, "etcd Client", "Distributed key-value store powering Kubernetes cluster state.", PortCategory::CloudDevOps, false, "Contains all cluster secrets, tokens, and cluster configurations.", "etcd v3"),
        entry(2380, TransportProtocol::Tcp, "etcd Peer", "Peer-to-peer communication port for etcd consensus clustering.", PortCategory::CloudDevOps, false, "Cluster replication heartbeat and Raft consensus channel.", "etcd v3"),
        entry(3000, TransportProtocol::Tcp, "Node/Vite Dev", "Default development server port for Vite, React, Next.js, and Grafana.", PortCategory::CustomApp, false, "Frequently left running unintentionally in development setups.", "Developer standard"),
        entry(3306, TransportProtocol::Tcp, "MySQL / MariaDB", "World's most popular open-source relational database server.", PortCategory::Database, false, "Vulnerable if exposed without firewall and with weak passwords.", "MySQL Spec"),
        entry(3389, TransportProtocol::Tcp, "RDP", "Microsoft Remote Desktop Protocol for graphical Windows sessions.", PortCategory::RemoteAccess, false, "BlueKeep vulnerability; continuous ransomware entry vector.", "MS-RDPBCGR"),
        entry(4222, TransportProtocol::Tcp, "NATS", "High-performance cloud-native messaging system.", PortCategory::Messaging, false, "Pub/sub event streaming message broker.", "NATS IO"),
        entry(5000, TransportProtocol::Tcp, "Docker Registry / Flask", "Private Docker image registry and default Python Flask port.", PortCategory::CloudDevOps, false, "May expose private proprietary container images.", "OCI Distribution"),
        entry(5060, TransportProtocol::All, "SIP (VoIP)", "Session Initiation Protocol signaling multimedia voice calls.", PortCategory::Messaging, false, "Target for toll fraud and VoIP eavesdropping exploits.", "RFC 3261"),
        entry(5432, TransportProtocol::Tcp, "PostgreSQL", "Advanced object-relational database system.", PortCategory::Database, false, "Default database port; must never be bound on 0.0.0.0 without SSL.", "Postgres Doc"),
        entry(5672, TransportProtocol::Tcp, "RabbitMQ / AMQP", "Advanced Message Queuing Protocol messaging broker.", PortCategory::Messaging, false, "Message bus handling business transactions and background queues.", "AMQP 0-9-1"),
        entry(5900, TransportProtocol::Tcp, "VNC", "Virtual Network Computing remote desktop graphical viewer.", PortCategory::RemoteAccess, false, "Short 8-character passwords; frequently vulnerable to cracking.", "RFC 6143"),
        entry(6379, TransportProtocol::Tcp, "Redis", "In-memory data structure store, cache, and message broker.", PortCategory::Database, false, "No auth by default; easily hijacked via config write exploits.", "Redis Protocol"),
        entry(6443, TransportProtocol::Tcp, "Kubernetes API Server", "The primary target for controlling and administering a Kubernetes cluster.", PortCategory::CloudDevOps, false, "Controls entire cluster orchestration; requires token or client cert.", "Kubernetes Core"),
        entry(8000, TransportProtocol::Tcp, "Dev Web / Django", "Alternative HTTP port commonly used by Python Django and FastAPI.", PortCategory::WebServices, false, "Standard unprivileged developer port.", "Common Dev"),
        entry(8080, TransportProtocol::Tcp, "HTTP Alternate / Proxy", "Standard alternative HTTP port and Port Inventory fallback port.", PortCategory::WebServices, false, "Standard fallback when port 80 cannot be bound without root.", "RFC 2616"),
        entry(8443, TransportProtocol::Tcp, "HTTPS Alternate", "Standard alternative secure HTTPS port.", PortCategory::WebServices, false, "Used for secondary web applications and internal admin panels.", "Common Dev"),
        entry(8883, TransportProtocol::Tcp, "MQTTS (Secure)", "Encrypted MQTT broker channel for authenticated IoT hardware.", PortCategory::Messaging, false, "Industry recommended transport for smart home and IoT hubs.", "OASIS MQTT"),
        entry(9000, TransportProtocol::Tcp, "SonarQube / Portainer", "Management panels and code quality analysis services.", PortCategory::CloudDevOps, false, "Frequently used for internal administrative dev tools.", "Tooling Standard"),
        entry(9090, TransportProtocol::Tcp, "Prometheus Server", "Prometheus metrics collection server and telemetry engine.", PortCategory::CloudDevOps, false, "Exposes internal system topology and infrastructure metrics.", "Prometheus"),
        entry(9100, TransportProtocol::Tcp, "Node Exporter", "Prometheus hardware and OS metrics exporter daemon.", PortCategory::CloudDevOps, false, "Provides host-level hardware telemetry without auth by default.", "Prometheus Metrics"),
        entry(9200, TransportProtocol::Tcp, "Elasticsearch", "Elasticsearch RESTful distributed search and analytics engine.", PortCategory::Database, false, "Contains indexed logs and business data; frequently breached.", "Elastic Doc"),
        entry(9418, TransportProtocol::Tcp, "Git Daemon", "Native Git protocol transfer service without authentication.", PortCategory::CloudDevOps, false, "Transfers unencrypted git objects without user access control.", "RFC Git"),
        entry(10250, TransportProtocol::Tcp, "Kubelet API", "Kubernetes node management agent daemon.", PortCategory::CloudDevOps, false, "Unauthenticated access permits remote command execution in pods.", "Kubernetes"),
        entry(11211, TransportProtocol::All, "Memcached", "High-performance distributed memory object caching system.", PortCategory::Database, false, "Memcrashed UDP reflection attacks reached over 1.3 Tbps.", "Memcached Spec"),
        entry(25565, TransportProtocol::Tcp, "Minecraft Server", "Default network port for hosting Minecraft multiplayer sessions.", PortCategory::CustomApp, false, "Commonly opened on home routers; target for Log4Shell in 2021.", "Minecraft Protocol"),
        entry(27017, TransportProtocol::Tcp, "MongoDB", "NoSQL document database storage engine.", PortCategory::Database, false, "Historic default lack of auth led to mass database wipeouts.", "Mongo Wire"),
        entry(51820, TransportProtocol::Udp, "WireGuard VPN", "Modern high-speed, state-of-the-art encrypted VPN tunneling protocol.", PortCategory::Security, false, "Silent protocol: drops packets from unrecognized handshakes.", "WireGuard Spec"),
    ]
}

/// Helper constructor for creating clean `ReservedPort` entries.
fn entry(
    port: u16,
    protocol: TransportProtocol,
    service_name: &str,
    description: &str,
    category: PortCategory,
    is_privileged: bool,
    security_note: &str,
    rfc: &str,
) -> ReservedPort {
    ReservedPort {
        port,
        protocol,
        service_name: service_name.to_string(),
        description: description.to_string(),
        category,
        availability: if is_privileged {
            PortAvailability::Privileged
        } else {
            PortAvailability::Reserved
        },
        is_privileged,
        security_note: security_note.to_string(),
        rfc_reference: Some(rfc.to_string()),
        custom_name: None,
    }
}

/// Finds a specific port in the reserved database.
pub fn find_reserved_port(port: u16) -> Option<ReservedPort> {
    get_all_reserved_ports().into_iter().find(|p| p.port == port)
}

/// Returns all reserved ports filtered by a specific category.
#[allow(dead_code)]
pub fn filter_by_category(category: PortCategory) -> Vec<ReservedPort> {
    get_all_reserved_ports()
        .into_iter()
        .filter(|p| p.category == category)
        .collect()
}

/// Returns a human-friendly description and label for an arbitrary port number.
pub fn describe_port(port: u16) -> (String, String) {
    if let Some(res) = find_reserved_port(port) {
        (res.service_name, res.description)
    } else if port < 1024 {
        (
            format!("System Port {}", port),
            "Privileged system port (0-1023) reserved by IANA standards. Requires root.".to_string(),
        )
    } else if port < 49152 {
        (
            format!("Registered Port {}", port),
            "Registered user/application port range (1024-49151). Unprivileged.".to_string(),
        )
    } else {
        (
            format!("Dynamic/Ephemeral Port {}", port),
            "Dynamic/ephemeral private port range (49152-65535). Assigned temporarily.".to_string(),
        )
    }
}

/// Checks whether a given port number falls within the privileged root range.
pub fn is_privileged_port(port: u16) -> bool {
    port < 1024
}

/// Generates a list of suggested alternative unprivileged ports.
pub fn suggest_alternative_ports(base_port: u16) -> Vec<u16> {
    match base_port {
        80 => vec![8080, 8000, 3000, 5000],
        443 => vec![8443, 9443, 4443],
        22 => vec![2222, 2200],
        3306 => vec![3307, 13306],
        5432 => vec![5433, 15432],
        6379 => vec![6380, 16379],
        _ => vec![base_port.saturating_add(8000), base_port.saturating_add(1000)],
    }
}
