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

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

use axum::{
    extract::{Path as AxumPath, State},
    http::{header, HeaderValue, StatusCode},
    response::{Html, IntoResponse, Response},
    routing::{get, put},
    Json, Router,
};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

use crate::models::{
    ActivePort, CustomNamePayload, PortAvailability, PortDetail, ReservedPort, SystemStats,
};
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
    pub custom_names: Arc<RwLock<HashMap<u16, String>>>,
    pub custom_names_path: PathBuf,
}

/// Constructs the complete Axum Router with all API routes and fallback handlers.
pub fn create_router(bound_port: u16, static_dir: String) -> Router {
    let custom_names_path = std::env::var("PORT_INVENTORY_DATA_FILE")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("custom_names.json"));

    let initial_names: HashMap<u16, String> = if custom_names_path.exists() {
        std::fs::read_to_string(&custom_names_path)
            .ok()
            .and_then(|content| serde_json::from_str(&content).ok())
            .unwrap_or_default()
    } else {
        HashMap::new()
    };

    let state = Arc::new(ServerState {
        bound_port,
        static_dir: PathBuf::from(static_dir),
        custom_names: Arc::new(RwLock::new(initial_names)),
        custom_names_path,
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
        .route("/api/custom-names", get(handle_get_custom_names))
        .route(
            "/api/custom-names/{port}",
            put(handle_set_custom_name).delete(handle_delete_custom_name),
        )
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

/// Handler for GET /api/active-ports - Returns real-time host listening sockets with custom names.
async fn handle_get_active_ports(
    State(state): State<Arc<ServerState>>,
) -> Json<Vec<ActivePort>> {
    let mut ports = scan_active_ports();
    let names = state.custom_names.read().await;
    for p in &mut ports {
        if let Some(custom) = names.get(&p.port) {
            p.custom_name = Some(custom.clone());
        }
    }
    Json(ports)
}

/// Handler for GET /api/reserved-ports - Returns reserved port catalog with availability and custom names.
async fn handle_get_reserved_ports(
    State(state): State<Arc<ServerState>>,
) -> Json<Vec<ReservedPort>> {
    let active_sockets = scan_active_ports();
    let reserved_list = get_all_reserved_ports();
    let names = state.custom_names.read().await;

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
            if let Some(custom) = names.get(&r.port) {
                r.custom_name = Some(custom.clone());
            }
            r
        })
        .collect();

    Json(enriched)
}

/// Handler for GET /api/inspect/:port - Deep dive investigation of a single port.
async fn handle_inspect_port(
    State(state): State<Arc<ServerState>>,
    AxumPath(port): AxumPath<u16>,
) -> Result<Json<PortDetail>, StatusCode> {
    let active_sockets = scan_active_ports();
    let names = state.custom_names.read().await;
    let custom_name = names.get(&port).cloned();

    let matching_bindings: Vec<ActivePort> = active_sockets
        .into_iter()
        .filter(|a| a.port == port)
        .map(|mut a| {
            a.custom_name = custom_name.clone();
            a
        })
        .collect();

    let mut reservation = find_reserved_port(port);
    if let Some(ref mut res) = reservation {
        res.custom_name = custom_name.clone();
    }
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
        custom_name,
    }))
}

/// Handler for GET /api/custom-names - Returns all user-configured port aliases.
async fn handle_get_custom_names(
    State(state): State<Arc<ServerState>>,
) -> Json<HashMap<u16, String>> {
    let names = state.custom_names.read().await;
    Json(names.clone())
}

/// Handler for PUT /api/custom-names/:port - Assigns or updates a custom alias for a port.
async fn handle_set_custom_name(
    State(state): State<Arc<ServerState>>,
    AxumPath(port): AxumPath<u16>,
    Json(payload): Json<CustomNamePayload>,
) -> StatusCode {
    let trimmed = payload.name.trim().to_string();
    let mut names = state.custom_names.write().await;
    if trimmed.is_empty() {
        names.remove(&port);
    } else {
        names.insert(port, trimmed);
    }

    if let Ok(serialized) = serde_json::to_string_pretty(&*names) {
        let _ = std::fs::write(&state.custom_names_path, serialized);
    }

    StatusCode::OK
}

/// Handler for DELETE /api/custom-names/:port - Removes custom alias for a port.
async fn handle_delete_custom_name(
    State(state): State<Arc<ServerState>>,
    AxumPath(port): AxumPath<u16>,
) -> StatusCode {
    let mut names = state.custom_names.write().await;
    names.remove(&port);

    if let Ok(serialized) = serde_json::to_string_pretty(&*names) {
        let _ = std::fs::write(&state.custom_names_path, serialized);
    }

    StatusCode::OK
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

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_custom_name_lifecycle() {
        let temp_dir = std::env::temp_dir();
        let custom_file = temp_dir.join(format!("test_custom_names_{}.json", std::process::id()));

        let state = Arc::new(ServerState {
            bound_port: 8080,
            static_dir: PathBuf::from("./dist"),
            custom_names: Arc::new(RwLock::new(HashMap::new())),
            custom_names_path: custom_file.clone(),
        });

        // Set name for port 5432
        let payload = CustomNamePayload {
            name: "Main Postgres DB".to_string(),
        };
        let res = handle_set_custom_name(State(state.clone()), AxumPath(5432), Json(payload)).await;
        assert_eq!(res, StatusCode::OK);

        // Verify stored in memory
        let names = handle_get_custom_names(State(state.clone())).await;
        assert_eq!(names.get(&5432), Some(&"Main Postgres DB".to_string()));

        // Delete name
        let del_res = handle_delete_custom_name(State(state.clone()), AxumPath(5432)).await;
        assert_eq!(del_res, StatusCode::OK);

        let names_after = handle_get_custom_names(State(state.clone())).await;
        assert_eq!(names_after.get(&5432), None);

        // Clean up test file
        let _ = std::fs::remove_file(custom_file);
    }
}
