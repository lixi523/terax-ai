//! On Windows, spawned servers inherit the full user environment, so no
//! login-shell capture is needed; the overlay stays empty.

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::OnceLock;

/// Empty on Windows (full user env is inherited there).
pub fn server_env_overlay() -> &'static HashMap<String, String> {
    static ENV: OnceLock<HashMap<String, String>> = OnceLock::new();
    ENV.get_or_init(HashMap::new)
}

pub fn resolve_binary(command: &str) -> Option<PathBuf> {
    let command = command.trim();
    if command.is_empty() {
        return None;
    }
    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("/"));
    let path = server_env_overlay()
        .get("PATH")
        .cloned()
        .or_else(|| std::env::var("PATH").ok());
    which::which_in(command, path, cwd).ok()
}
