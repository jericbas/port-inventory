// ============================================================================
// File: src/main.rs
// Description: Port Inventory Server Entrypoint & Capability Supervisor
//
// What is this file?
// This is the primary execution entrypoint for the Port Inventory service.
// It performs:
//   1. Command line argument and environment variable parsing (PORT, HOST, STATIC_DIR).
//   2. Attempting to bind to privileged Port 80 as requested by default.
//   3. Graceful fallback to Port 8080, 8000, etc. if non-root permissions or
//      collisions occur, with helpful guidance for Linux CAP_NET_BIND_SERVICE.
//   4. Setting up tracing subscriber diagnostics.
//   5. Orchestrating graceful asynchronous shutdown on SIGINT / SIGTERM signals.
// ============================================================================

mod models;
mod philosophy;
mod reserved_db;
mod scanner;
mod server;

use std::env;
use std::net::SocketAddr;
use std::path::PathBuf;
use tokio::net::TcpListener;
use tracing::{error, info, warn};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize structured logging and tracing formatters
    tracing_subscriber::fmt()
        .with_target(false)
        .with_thread_ids(false)
        .compact()
        .init();

    info!("==================================================================");
    info!("🚀 Initializing Port Inventory Service (Rust + Bun + Vite + React)");
    info!("==================================================================");

    // Read configuration overrides from environment or defaults
    let requested_host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let requested_port: u16 = env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(80); // Default to port 80 as requested

    let static_dir = env::var("STATIC_DIR").unwrap_or_else(|_| {
        if PathBuf::from("./dist").is_dir() {
            "./dist".to_string()
        } else {
            "./dist".to_string()
        }
    });

    // Attempt to bind to the primary requested port (Port 80) with dynamic fallbacks
    let (listener, actual_port) = match bind_with_fallback(&requested_host, requested_port).await {
        Ok(res) => res,
        Err(err) => {
            error!("❌ Fatal error: Unable to bind to any network socket: {}", err);
            std::process::exit(1);
        }
    };

    // Print explicit personal use and security warnings
    print_security_banner(actual_port);

    // Create the Axum application router
    let app = server::create_router(actual_port, static_dir);

    // Launch the asynchronous Axum server with graceful shutdown hook
    info!("🌐 Port Inventory is actively serving on: http://{}:{}", requested_host, actual_port);
    info!("📡 REST Endpoints: /api/status, /api/active-ports, /api/reserved-ports, /api/philosophy");

    let server_handle = axum::serve(listener, app).with_graceful_shutdown(shutdown_signal());

    if let Err(e) = server_handle.await {
        error!("Server terminated unexpectedly: {}", e);
    }

    info!("👋 Port Inventory daemon shut down cleanly. Goodbye!");
    Ok(())
}

/// Attempts to bind to preferred port; gracefully falls back if permissions or collisions occur.
async fn bind_with_fallback(
    host: &str,
    preferred_port: u16,
) -> Result<(TcpListener, u16), std::io::Error> {
    let preferred_addr: SocketAddr = format!("{}:{}", host, preferred_port)
        .parse()
        .expect("Valid socket address");

    match TcpListener::bind(preferred_addr).await {
        Ok(listener) => {
            info!("✅ Successfully bound to preferred Port {}", preferred_port);
            Ok((listener, preferred_port))
        }
        Err(err) => {
            if preferred_port == 80 {
                warn!("⚠️  Notice: Unable to bind directly to Port 80 ({})", err);
                warn!("ℹ️  Root privileges or Linux CAP_NET_BIND_SERVICE is required for ports < 1024.");
                warn!("💡 To enable Port 80 without running as root, execute:");
                warn!("    sudo setcap 'cap_net_bind_service=+ep' ./target/release/port-inventory");
                warn!("    Or alternatively set: sudo sysctl net.ipv4.ip_unprivileged_port_start=80");
            } else {
                warn!("⚠️  Notice: Port {} is unavailable: {}", preferred_port, err);
            }

            // Candidate unprivileged ports to try sequentially
            let candidate_ports = [8080, 8000, 8888, 3030, 5050, 0];
            for &candidate in &candidate_ports {
                let candidate_addr: SocketAddr = format!("{}:{}", host, candidate)
                    .parse()
                    .expect("Valid fallback address");

                match TcpListener::bind(candidate_addr).await {
                    Ok(listener) => {
                        let actual = listener.local_addr()?.port();
                        info!("✅ Successfully bound to fallback Port {}", actual);
                        return Ok((listener, actual));
                    }
                    Err(_) => {
                        // Continue to next candidate
                    }
                }
            }

            Err(err)
        }
    }
}

/// Prints operational hygiene and personal-use warning banner to stdout.
fn print_security_banner(port: u16) {
    println!("\n╔══════════════════════════════════════════════════════════════════════╗");
    println!("║                   ⚠️  PERSONAL USE ONLY DISCLAIMER  ⚠️               ║");
    println!("╠══════════════════════════════════════════════════════════════════════╣");
    println!("║  This utility has NO AUTHENTICATION by intentional design.          ║");
    println!("║  It exposes internal socket information, listening processes,        ║");
    println!("║  and system topology for local diagnostics and homelab audits.       ║");
    println!("║                                                                      ║");
    println!("║  • DO NOT EXPOSE TO THE PUBLIC INTERNET WITHOUT A SECURE PROXY       ║");
    println!("║  • Recommended: Tailscale, WireGuard, or Cloudflare Zero-Trust       ║");
    println!("║  • App URL: http://localhost:{}                                      ║", port);
    println!("╚══════════════════════════════════════════════════════════════════════╝\n");
}

/// Asynchronous hook listening for Ctrl+C or SIGTERM signals.
async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {
            info!("Received Ctrl+C interrupt signal. Initiating graceful shutdown...");
        },
        _ = terminate => {
            info!("Received SIGTERM signal. Initiating graceful shutdown...");
        },
    }
}
