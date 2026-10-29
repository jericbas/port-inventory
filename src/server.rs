// ============================================================================
// File: src/server.rs
// Description: Axum Web Server, REST API Controllers & Static Asset Host
//
// What is this file?
// This module configures and launches the HTTP service using Axum and Tower.
// It exposes REST endpoints for:
//   - GET /api/status: Host telemetry, current bound port, and personal-use warning.
//   - GET /api/active-ports: Real-time scan of local sockets, processes, and PIDs.
//   - GET /api/reserved-ports: Catalog of IANA and system reserved ports.
//   - GET /api/inspect/:port: Deep-dive inspection into a specific port number.
//
// It also provides SPA fallback routing, serving the Vite-compiled React
// frontend located in ./dist.
// ============================================================================

use std::path::PathBuf;
use std::sync::Arc;

use axum::{
    extract::{Path as AxumPath, State},
    http::{header, HeaderValue, StatusCode},
    response::{Html, IntoResponse, Response},
    routing::get,
    Json, Router,
};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

use crate::models::{ActivePort, PortAvailability, PortDetail, ReservedPort, SystemStats};
use crate::reserved_db::{
    find_reserved_port, get_all_reserved_ports, is_privileged_port,
    suggest_alternative_ports,
};
use crate::scanner::scan_active_ports;
use crate::telemetry::get_system_stats;

/// Global shared state passed into Axum handlers.
#[derive(Clone)]
pub struct ServerState {
    pub bound_port: u16,
    pub static_dir: PathBuf,
}

/// Constructs the complete Axum Router with all API routes and fallback handlers.
pub fn create_router(bound_port: u16, static_dir: String) -> Router {
    let state = Arc::new(ServerState {
        bound_port,
        static_dir: PathBuf::from(static_dir),
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/api/status", get(handle_get_status))
        .route("/api/active-ports", get(handle_get_active_ports))
        .route("/api/reserved-ports", get(handle_get_reserved_ports))
        .route("/api/inspect/{port}", get(handle_inspect_port))
        .fallback(handle_static_or_spa)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

/// Handler for GET /api/status - Returns host metrics and security disclaimer.
async fn handle_get_status(State(state): State<Arc<ServerState>>) -> Json<SystemStats> {
    let stats = get_system_stats(state.bound_port);
    Json(stats)
}

/// Handler for GET /api/active-ports - Returns real-time host listening sockets.
async fn handle_get_active_ports() -> Json<Vec<ActivePort>> {
    let ports = scan_active_ports();
    Json(ports)
}

/// Handler for GET /api/reserved-ports - Returns reserved port catalog with availability.
async fn handle_get_reserved_ports() -> Json<Vec<ReservedPort>> {
    let active_sockets = scan_active_ports();
    let reserved_list = get_all_reserved_ports();

    let enriched: Vec<ReservedPort> = reserved_list
        .into_iter()
        .map(|mut r| {
            let is_active = active_sockets.iter().any(|a| a.port == r.port);
            if is_active {
                r.availability = PortAvailability::Active;
            } else if r.is_privileged {
                r.availability = PortAvailability::Privileged;
            } else {
                r.availability = PortAvailability::Available;
            }
            r
        })
        .collect();

    Json(enriched)
}

/// Handler for GET /api/inspect/:port - Deep dive investigation of a single port.
async fn handle_inspect_port(
    AxumPath(port): AxumPath<u16>,
) -> Result<Json<PortDetail>, StatusCode> {
    let active_sockets = scan_active_ports();
    let matching_bindings: Vec<ActivePort> = active_sockets
        .into_iter()
        .filter(|a| a.port == port)
        .collect();

    let reservation = find_reserved_port(port);
    let privileged = is_privileged_port(port);

    let verdict = if !matching_bindings.is_empty() {
        format!(
            "UNAVAILABLE: Port {} is currently occupied by active process(es): {}",
            port,
            matching_bindings
                .iter()
                .map(|b| b.process_name.as_str())
                .collect::<Vec<_>>()
                .join(", ")
        )
    } else if privileged {
        format!(
            "RESTRICTED: Port {} is free, but requires root or CAP_NET_BIND_SERVICE to bind.",
            port
        )
    } else {
        format!(
            "AVAILABLE: Port {} is completely unreserved and ready for application binding.",
            port
        )
    };

    let alternatives = suggest_alternative_ports(port);

    Ok(Json(PortDetail {
        port,
        reservation,
        active_bindings: matching_bindings,
        is_system_reserved: privileged,
        bind_verdict: verdict,
        suggested_alternatives: alternatives,
    }))
}


/// SPA and Static asset fallback handler.
/// Attempts to serve static files from the dist/ directory; falls back to index.html.
async fn handle_static_or_spa(
    State(state): State<Arc<ServerState>>,
    uri: axum::http::Uri,
) -> Response {
    let path = uri.path().trim_start_matches('/');
    let target_file = state.static_dir.join(path);

    // If requested static file exists directly on disk, serve it with proper MIME type
    if target_file.is_file() {
        if let Ok(bytes) = std::fs::read(&target_file) {
            let mime_type = mime_guess::from_path(&target_file).first_or_octet_stream();
            let mut response = bytes.into_response();
            response.headers_mut().insert(
                header::CONTENT_TYPE,
                HeaderValue::from_str(mime_type.as_ref()).unwrap_or(HeaderValue::from_static("application/octet-stream")),
            );
            return response;
        }
    }

    // Otherwise serve index.html for Single Page Application client-side routing
    let index_path = state.static_dir.join("index.html");
    if let Ok(index_html) = std::fs::read_to_string(&index_path) {
        Html(index_html).into_response()
    } else {
        // Fallback placeholder if frontend has not been compiled yet
        let placeholder = format!(
            "<!DOCTYPE html><html><head><title>Port Inventory</title></head>\
            <body style='font-family:sans-serif;padding:2rem;text-align:center;'>\
            <h1>Port Inventory API Server</h1>\
            <p>Running on Port {}</p>\
            <p>Frontend assets are being built. Check <a href='/api/status'>/api/status</a> or <a href='/api/active-ports'>/api/active-ports</a>.</p>\
            </body></html>",
            state.bound_port
        );
        Html(placeholder).into_response()
    }
}
