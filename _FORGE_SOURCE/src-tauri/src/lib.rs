use tauri::{State, Manager};
use sqlx::{PgPool, postgres::PgPoolOptions};
use serde::{Serialize, Deserialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use std::path::{Path, PathBuf};
use std::fs;
use std::process::{Command, Stdio};
use std::io::Write;

// ─── Types ───────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug)]
struct FileEntry {
    name: String,
    path: String,
    is_dir: bool,
    children: Option<Vec<FileEntry>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct PythonSidecarRequest {
    mode: String,
    prompt: String,
    selection: Option<String>,
    context: Option<String>,
    model: Option<String>,
}

// ─── App State ───────────────────────────────────────────────────

struct AppState {
    db: Arc<Mutex<Option<PgPool>>>,
    vault_path: Arc<Mutex<Option<String>>>,
}

// ─── Vault Commands ──────────────────────────────────────────────

#[tauri::command]
async fn set_vault(path: String, state: State<'_, AppState>) -> Result<String, String> {
    let p = PathBuf::from(&path);
    if !p.exists() || !p.is_dir() {
        return Err(format!("Not a valid directory: {}", path));
    }
    let mut vault = state.vault_path.lock().await;
    *vault = Some(path.clone());
    Ok(format!("Vault set: {}", path))
}

#[tauri::command]
async fn get_vault_files(state: State<'_, AppState>) -> Result<Vec<FileEntry>, String> {
    let vault = state.vault_path.lock().await;
    let vault_path = vault.as_ref().ok_or("No vault selected")?;
    scan_directory(&PathBuf::from(vault_path), 0, 5).map_err(|e| e.to_string())
}

fn scan_directory(path: &PathBuf, depth: usize, max_depth: usize) -> Result<Vec<FileEntry>, std::io::Error> {
    if depth >= max_depth {
        return Ok(vec![]);
    }
    let mut entries = Vec::new();
    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let name = entry.file_name().to_string_lossy().to_string();
        
        if name.starts_with('.')
            || name == "node_modules"
            || name == "target"
            || name == "__pycache__"
            || name == ".obsidian"
        {
            continue;
        }
        
        let file_path = entry.path();
        let is_dir = file_path.is_dir();
        
        if is_dir {
            let children = scan_directory(&file_path, depth + 1, max_depth)?;
            if !children.is_empty() {
                entries.push(FileEntry {
                    name,
                    path: file_path.to_string_lossy().to_string(),
                    is_dir: true,
                    children: Some(children),
                });
            }
        } else if name.ends_with(".md") {
            entries.push(FileEntry {
                name,
                path: file_path.to_string_lossy().to_string(),
                is_dir: false,
                children: None,
            });
        }
    }
    
    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });
    
    Ok(entries)
}

fn is_ignored_folder(name: &str) -> bool {
    name.starts_with('.')
        || name == "node_modules"
        || name == "target"
        || name == "__pycache__"
        || name == ".obsidian"
        || name == "_versions"
        || name == "_data"
        || name == "_engines"
}

fn sanitize_note_segment(segment: &str) -> String {
    let cleaned = segment
        .chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => ' ',
            _ => c,
        })
        .collect::<String>();

    let trimmed = cleaned.trim().trim_matches('.').to_string();
    if trimmed.is_empty() {
        "Untitled".to_string()
    } else {
        trimmed
    }
}

fn build_note_relative_path(title: &str) -> Result<PathBuf, String> {
    let normalized = title.replace('\\', "/");
    let raw_segments = normalized
        .split('/')
        .map(|segment| segment.trim())
        .filter(|segment| !segment.is_empty())
        .collect::<Vec<_>>();

    if raw_segments.is_empty() {
        return Err("Wiki link title cannot be empty".to_string());
    }

    let mut rel = PathBuf::new();
    for (index, raw_segment) in raw_segments.iter().enumerate() {
        let mut segment = sanitize_note_segment(raw_segment);
        if index == raw_segments.len() - 1 && !segment.to_lowercase().ends_with(".md") {
            segment.push_str(".md");
        }
        rel.push(segment);
    }

    Ok(rel)
}

fn find_note_by_stem_recursive(dir: &Path, stem_lower: &str) -> Result<Option<PathBuf>, String> {
    let entries = fs::read_dir(dir).map_err(|e| e.to_string())?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        if path.is_dir() {
            if is_ignored_folder(&name) {
                continue;
            }
            if let Some(found) = find_note_by_stem_recursive(&path, stem_lower)? {
                return Ok(Some(found));
            }
            continue;
        }

        if !name.to_lowercase().ends_with(".md") {
            continue;
        }

        let file_stem = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or_default()
            .to_lowercase();
        if file_stem == stem_lower {
            return Ok(Some(path));
        }
    }

    Ok(None)
}

// ─── File Commands ───────────────────────────────────────────────

#[tauri::command]
async fn read_note(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read {}: {}", path, e))
}

#[tauri::command]
async fn write_note(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, &content).map_err(|e| format!("Failed to write {}: {}", path, e))
}

#[tauri::command]
async fn create_note(path: String, state: State<'_, AppState>) -> Result<String, String> {
    let vault = state.vault_path.lock().await;
    let vault_path = vault.as_ref().ok_or("No vault selected")?;
    let full_path = PathBuf::from(vault_path).join(&path);

    if full_path.exists() {
        return Err("File already exists".to_string());
    }

    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let stem = path.trim_end_matches(".md");
    let initial = format!("# {}\n\n", stem);
    fs::write(&full_path, &initial).map_err(|e| e.to_string())?;

    Ok(full_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn create_folder(path: String, state: State<'_, AppState>) -> Result<(), String> {
    let vault = state.vault_path.lock().await;
    let vault_path = vault.as_ref().ok_or("No vault selected")?;
    let full_path = PathBuf::from(vault_path).join(&path);
    fs::create_dir_all(full_path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn open_or_create_note_by_title(title: String, state: State<'_, AppState>) -> Result<String, String> {
    let trimmed = title.trim();
    if trimmed.is_empty() {
        return Err("Link target cannot be empty".to_string());
    }

    let vault = state.vault_path.lock().await;
    let vault_path = vault.as_ref().ok_or("No vault selected")?;
    let vault_root = PathBuf::from(vault_path);

    let basename = trimmed
        .replace('\\', "/")
        .split('/')
        .next_back()
        .unwrap_or(trimmed)
        .trim()
        .trim_end_matches(".md")
        .to_lowercase();

    if !basename.is_empty() {
        if let Some(found) = find_note_by_stem_recursive(&vault_root, &basename)? {
            return Ok(found.to_string_lossy().to_string());
        }
    }

    let relative_path = build_note_relative_path(trimmed)?;
    let full_path = vault_root.join(relative_path);

    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    if !full_path.exists() {
        let heading = full_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Untitled");
        let initial = format!("# {}\n\n", heading);
        fs::write(&full_path, initial).map_err(|e| e.to_string())?;
    }

    Ok(full_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn rename_item(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(old_path, new_path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_item(path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if p.is_dir() {
        fs::remove_dir_all(path).map_err(|e| e.to_string())
    } else {
        fs::remove_file(path).map_err(|e| e.to_string())
    }
}

// ─── Database Commands ───────────────────────────────────────────

#[tauri::command]
async fn connect_db(state: State<'_, AppState>) -> Result<String, String> {
    let mut db_lock = state.db.lock().await;
    
    if db_lock.is_some() {
        return Ok("Connected".to_string());
    }

    // Read database URL from environment, with fallback defaults
    let db_url_env = std::env::var("FORGE_DATABASE_URL").ok();
    let db_host = std::env::var("FORGE_DB_HOST").unwrap_or_else(|_| "192.168.1.177".to_string());
    let db_port = std::env::var("FORGE_DB_PORT").unwrap_or_else(|_| "2665".to_string());
    let db_name = std::env::var("FORGE_DB_NAME").unwrap_or_else(|_| "theophysics".to_string());
    let db_user = std::env::var("FORGE_DB_USER").unwrap_or_else(|_| "postgres".to_string());
    let db_pass = std::env::var("FORGE_DB_PASS").unwrap_or_else(|_| String::new());

    let urls: Vec<String> = if let Some(url) = db_url_env {
        vec![url]
    } else if !db_pass.is_empty() {
        vec![format!("postgres://{}:{}@{}:{}/{}", db_user, db_pass, db_host, db_port, db_name)]
    } else {
        // Fallback: try connecting without password
        vec![format!("postgres://{}@{}:{}/{}", db_user, db_host, db_port, db_name)]
    };

    for database_url in &urls {
        
        match PgPoolOptions::new()
            .max_connections(5)
            .acquire_timeout(std::time::Duration::from_secs(2))
            .connect(&database_url)
            .await
        {
            Ok(pool) => {
                *db_lock = Some(pool);
                return Ok(format!("Connected as {}", db_user));
            }
            Err(e) => {
                eprintln!("DB attempt failed: {}", e);
                continue;
            }
        }
    }
    
    // Don't block the app - just return local mode message
    eprintln!("⚠️  Database unavailable - running in local-only mode");
    Ok("Local mode (DB unavailable)".to_string())
}

fn resolve_sidecar_script() -> Result<PathBuf, String> {
    let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
    let candidates = vec![
        cwd.join("scripts").join("ai_sidecar.py"),
        cwd.join("..").join("scripts").join("ai_sidecar.py"),
        cwd.join("..").join("_FORGE_SOURCE").join("scripts").join("ai_sidecar.py"),
    ];

    for candidate in candidates {
        if candidate.exists() {
            return Ok(candidate);
        }
    }

    Err("Unable to locate scripts/ai_sidecar.py".to_string())
}

fn run_sidecar_with(program: &str, args: &[&str], payload: &str) -> Result<String, String> {
    let script = resolve_sidecar_script()?;
    let mut command = Command::new(program);
    command
        .args(args)
        .arg(script)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = command.spawn().map_err(|e| e.to_string())?;
    if let Some(stdin) = child.stdin.as_mut() {
        stdin.write_all(payload.as_bytes()).map_err(|e| e.to_string())?;
    }

    let output = child.wait_with_output().map_err(|e| e.to_string())?;
    if output.status.success() {
        let stdout = String::from_utf8(output.stdout).map_err(|e| e.to_string())?;
        Ok(stdout)
    } else {
        let stderr = String::from_utf8(output.stderr).unwrap_or_else(|_| "Python sidecar failed".to_string());
        Err(stderr)
    }
}

#[tauri::command]
async fn run_python_sidecar(request: PythonSidecarRequest) -> Result<String, String> {
    let payload = serde_json::to_string(&request).map_err(|e| e.to_string())?;

    run_sidecar_with("python", &[], &payload)
        .or_else(|_| run_sidecar_with("py", &["-3"], &payload))
}

// ─── Version Control Commands ───────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug)]
struct VersionSnapshot {
    id: String,
    file_path: String,
    timestamp: u64,
    size_bytes: u64,
    summary: String,
}

fn versions_dir(vault_path: &str) -> PathBuf {
    PathBuf::from(vault_path).join("_versions")
}

fn snapshot_dir_for_file(vault_path: &str, file_path: &str) -> PathBuf {
    // Create a safe directory name from the relative file path
    let vault = PathBuf::from(vault_path);
    let file = PathBuf::from(file_path);
    let relative = file.strip_prefix(&vault).unwrap_or(&file);
    let safe_name = relative
        .to_string_lossy()
        .replace(['/', '\\', ':'], "_")
        .replace(".md", "");
    versions_dir(vault_path).join(safe_name)
}

#[tauri::command]
async fn create_snapshot(
    file_path: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<VersionSnapshot, String> {
    let vault = state.vault_path.lock().await;
    let vault_path = vault.as_ref().ok_or("No vault selected")?;

    let snap_dir = snapshot_dir_for_file(vault_path, &file_path);
    fs::create_dir_all(&snap_dir).map_err(|e| e.to_string())?;

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis() as u64;

    let id = format!("{}", timestamp);
    let snap_path = snap_dir.join(format!("{}.md", id));

    fs::write(&snap_path, &content).map_err(|e| e.to_string())?;

    // Generate summary: first line or first 80 chars
    let summary = content
        .lines()
        .find(|l| !l.trim().is_empty())
        .unwrap_or("(empty)")
        .chars()
        .take(80)
        .collect::<String>();

    Ok(VersionSnapshot {
        id,
        file_path,
        timestamp,
        size_bytes: content.len() as u64,
        summary,
    })
}

#[tauri::command]
async fn list_snapshots(
    file_path: String,
    state: State<'_, AppState>,
) -> Result<Vec<VersionSnapshot>, String> {
    let vault = state.vault_path.lock().await;
    let vault_path = vault.as_ref().ok_or("No vault selected")?;

    let snap_dir = snapshot_dir_for_file(vault_path, &file_path);
    if !snap_dir.exists() {
        return Ok(vec![]);
    }

    let mut snapshots: Vec<VersionSnapshot> = Vec::new();

    for entry in fs::read_dir(&snap_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        if !name.ends_with(".md") {
            continue;
        }

        let id = name.trim_end_matches(".md").to_string();
        let timestamp: u64 = id.parse().unwrap_or(0);
        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        let size_bytes = metadata.len();

        // Read first line for summary
        let content = fs::read_to_string(entry.path()).unwrap_or_default();
        let summary = content
            .lines()
            .find(|l| !l.trim().is_empty())
            .unwrap_or("(empty)")
            .chars()
            .take(80)
            .collect::<String>();

        snapshots.push(VersionSnapshot {
            id,
            file_path: file_path.clone(),
            timestamp,
            size_bytes,
            summary,
        });
    }

    snapshots.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok(snapshots)
}

#[tauri::command]
async fn read_snapshot(
    file_path: String,
    snapshot_id: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let vault = state.vault_path.lock().await;
    let vault_path = vault.as_ref().ok_or("No vault selected")?;

    let snap_dir = snapshot_dir_for_file(vault_path, &file_path);
    let snap_path = snap_dir.join(format!("{}.md", snapshot_id));

    fs::read_to_string(&snap_path)
        .map_err(|e| format!("Failed to read snapshot: {}", e))
}

#[tauri::command]
async fn rollback_to_snapshot(
    file_path: String,
    snapshot_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let vault = state.vault_path.lock().await;
    let vault_path = vault.as_ref().ok_or("No vault selected")?;

    let snap_dir = snapshot_dir_for_file(vault_path, &file_path);
    let snap_path = snap_dir.join(format!("{}.md", snapshot_id));

    let content = fs::read_to_string(&snap_path)
        .map_err(|e| format!("Failed to read snapshot: {}", e))?;

    // Create a snapshot of current state before rollback
    let current_content = fs::read_to_string(&file_path).unwrap_or_default();
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis() as u64;
    let pre_rollback_path = snap_dir.join(format!("{}.md", timestamp));
    let _ = fs::write(&pre_rollback_path, &current_content);

    // Write the snapshot content to the file
    fs::write(&file_path, &content)
        .map_err(|e| format!("Failed to rollback: {}", e))
}

// ─── Data Mirror Commands ───────────────────────────────────────

#[tauri::command]
async fn ensure_mirror(state: State<'_, AppState>) -> Result<String, String> {
    let vault = state.vault_path.lock().await;
    let vault_path = vault.as_ref().ok_or("No vault selected")?;
    let mirror_path = PathBuf::from(vault_path).join("_data");
    fs::create_dir_all(&mirror_path).map_err(|e| e.to_string())?;
    Ok(mirror_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn get_mirror_files(state: State<'_, AppState>) -> Result<Vec<FileEntry>, String> {
    let vault = state.vault_path.lock().await;
    let vault_path = vault.as_ref().ok_or("No vault selected")?;
    let mirror_path = PathBuf::from(vault_path).join("_data");
    if !mirror_path.exists() {
        return Ok(vec![]);
    }
    scan_mirror_directory(&mirror_path, 0, 5).map_err(|e| e.to_string())
}

fn scan_mirror_directory(path: &PathBuf, depth: usize, max_depth: usize) -> Result<Vec<FileEntry>, std::io::Error> {
    if depth >= max_depth {
        return Ok(vec![]);
    }
    let mut entries = Vec::new();
    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue;
        }
        let file_path = entry.path();
        let is_dir = file_path.is_dir();
        if is_dir {
            let children = scan_mirror_directory(&file_path, depth + 1, max_depth)?;
            entries.push(FileEntry {
                name,
                path: file_path.to_string_lossy().to_string(),
                is_dir: true,
                children: if children.is_empty() { None } else { Some(children) },
            });
        } else {
            entries.push(FileEntry {
                name,
                path: file_path.to_string_lossy().to_string(),
                is_dir: false,
                children: None,
            });
        }
    }
    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });
    Ok(entries)
}

#[tauri::command]
async fn write_mirror_file(
    relative_path: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let vault = state.vault_path.lock().await;
    let vault_path = vault.as_ref().ok_or("No vault selected")?;
    let mirror_path = PathBuf::from(vault_path).join("_data").join(&relative_path);
    if let Some(parent) = mirror_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&mirror_path, &content).map_err(|e| e.to_string())?;
    Ok(mirror_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn read_mirror_file(
    relative_path: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let vault = state.vault_path.lock().await;
    let vault_path = vault.as_ref().ok_or("No vault selected")?;
    let mirror_path = PathBuf::from(vault_path).join("_data").join(&relative_path);
    fs::read_to_string(&mirror_path).map_err(|e| format!("Failed to read mirror file: {}", e))
}

// ─── Engine Commands ────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug)]
struct EngineEntry {
    id: String,
    config_path: String,
    script_path: Option<String>,
    raw_yaml: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct EngineRunResult {
    engine_id: String,
    ok: bool,
    stdout: String,
    stderr: String,
}

fn engines_dir(vault_path: &str) -> PathBuf {
    PathBuf::from(vault_path).join("_engines")
}

#[tauri::command]
async fn scan_engines(state: State<'_, AppState>) -> Result<Vec<EngineEntry>, String> {
    let vault = state.vault_path.lock().await;
    let vault_path = vault.as_ref().ok_or("No vault selected")?;

    let eng_dir = engines_dir(vault_path);
    if !eng_dir.exists() {
        fs::create_dir_all(&eng_dir).map_err(|e| e.to_string())?;
        return Ok(vec![]);
    }

    let mut engines = Vec::new();
    for entry in fs::read_dir(&eng_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();

        // Each engine is either a .yaml file or a directory with config.yaml
        if name.ends_with(".yaml") || name.ends_with(".yml") {
            let config_path = entry.path();
            let raw_yaml = fs::read_to_string(&config_path).unwrap_or_default();
            let id = name.trim_end_matches(".yaml").trim_end_matches(".yml").to_string();

            // Check for matching .py script
            let script_name = format!("{}.py", id);
            let script_path = eng_dir.join(&script_name);

            engines.push(EngineEntry {
                id,
                config_path: config_path.to_string_lossy().to_string(),
                script_path: if script_path.exists() {
                    Some(script_path.to_string_lossy().to_string())
                } else {
                    None
                },
                raw_yaml,
            });
        } else if entry.path().is_dir() {
            let config_path = entry.path().join("config.yaml");
            let config_path_alt = entry.path().join("config.yml");
            let actual_config = if config_path.exists() {
                Some(config_path)
            } else if config_path_alt.exists() {
                Some(config_path_alt)
            } else {
                None
            };

            if let Some(cfg) = actual_config {
                let raw_yaml = fs::read_to_string(&cfg).unwrap_or_default();
                let script_path = entry.path().join("run.py");

                engines.push(EngineEntry {
                    id: name.clone(),
                    config_path: cfg.to_string_lossy().to_string(),
                    script_path: if script_path.exists() {
                        Some(script_path.to_string_lossy().to_string())
                    } else {
                        None
                    },
                    raw_yaml,
                });
            }
        }
    }

    engines.sort_by(|a, b| a.id.cmp(&b.id));
    Ok(engines)
}

#[tauri::command]
async fn read_engine_config(engine_id: String, state: State<'_, AppState>) -> Result<String, String> {
    let vault = state.vault_path.lock().await;
    let vault_path = vault.as_ref().ok_or("No vault selected")?;

    let eng_dir = engines_dir(vault_path);

    // Try file-based engine first
    for ext in &["yaml", "yml"] {
        let path = eng_dir.join(format!("{}.{}", engine_id, ext));
        if path.exists() {
            return fs::read_to_string(&path).map_err(|e| e.to_string());
        }
    }

    // Try directory-based engine
    for name in &["config.yaml", "config.yml"] {
        let path = eng_dir.join(&engine_id).join(name);
        if path.exists() {
            return fs::read_to_string(&path).map_err(|e| e.to_string());
        }
    }

    Err(format!("Engine config not found: {}", engine_id))
}

#[tauri::command]
async fn write_engine_config(
    engine_id: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let vault = state.vault_path.lock().await;
    let vault_path = vault.as_ref().ok_or("No vault selected")?;

    let eng_dir = engines_dir(vault_path);
    fs::create_dir_all(&eng_dir).map_err(|e| e.to_string())?;

    // Try to find existing config file
    for ext in &["yaml", "yml"] {
        let path = eng_dir.join(format!("{}.{}", engine_id, ext));
        if path.exists() {
            return fs::write(&path, &content).map_err(|e| e.to_string());
        }
    }
    for name in &["config.yaml", "config.yml"] {
        let path = eng_dir.join(&engine_id).join(name);
        if path.exists() {
            return fs::write(&path, &content).map_err(|e| e.to_string());
        }
    }

    // Create new file-based engine
    let path = eng_dir.join(format!("{}.yaml", engine_id));
    fs::write(&path, &content).map_err(|e| e.to_string())
}

#[tauri::command]
async fn run_engine(
    engine_id: String,
    state: State<'_, AppState>,
) -> Result<EngineRunResult, String> {
    let vault = state.vault_path.lock().await;
    let vault_path = vault.as_ref().ok_or("No vault selected")?;

    let eng_dir = engines_dir(vault_path);

    // Find the script
    let mut script_path: Option<PathBuf> = None;
    let py_file = eng_dir.join(format!("{}.py", engine_id));
    if py_file.exists() {
        script_path = Some(py_file);
    } else {
        let dir_script = eng_dir.join(&engine_id).join("run.py");
        if dir_script.exists() {
            script_path = Some(dir_script);
        }
    }

    let script = script_path.ok_or(format!("No script found for engine: {}", engine_id))?;

    // Find the config
    let config_content = {
        let mut cfg = String::new();
        for ext in &["yaml", "yml"] {
            let path = eng_dir.join(format!("{}.{}", engine_id, ext));
            if path.exists() {
                cfg = fs::read_to_string(&path).unwrap_or_default();
                break;
            }
        }
        if cfg.is_empty() {
            for name in &["config.yaml", "config.yml"] {
                let path = eng_dir.join(&engine_id).join(name);
                if path.exists() {
                    cfg = fs::read_to_string(&path).unwrap_or_default();
                    break;
                }
            }
        }
        cfg
    };

    // Build JSON payload for the script
    let payload = serde_json::json!({
        "engine_id": engine_id,
        "vault_path": vault_path,
        "config": config_content,
        "mirror_path": PathBuf::from(vault_path).join("_data").to_string_lossy().to_string(),
    });

    // Try python, then py
    let result = run_engine_script("python", &script, &payload.to_string())
        .or_else(|_| run_engine_script("py", &script, &payload.to_string()));

    match result {
        Ok((stdout, stderr)) => Ok(EngineRunResult {
            engine_id,
            ok: true,
            stdout,
            stderr,
        }),
        Err(e) => Ok(EngineRunResult {
            engine_id,
            ok: false,
            stdout: String::new(),
            stderr: e,
        }),
    }
}

fn run_engine_script(program: &str, script: &PathBuf, payload: &str) -> Result<(String, String), String> {
    let mut child = Command::new(program)
        .arg(script)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    if let Some(stdin) = child.stdin.as_mut() {
        stdin.write_all(payload.as_bytes()).map_err(|e| e.to_string())?;
    }

    let output = child.wait_with_output().map_err(|e| e.to_string())?;
    let stdout = String::from_utf8(output.stdout).unwrap_or_default();
    let stderr = String::from_utf8(output.stderr).unwrap_or_default();

    if output.status.success() {
        Ok((stdout, stderr))
    } else {
        Err(stderr)
    }
}

// ─── App Entry ───────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            db: Arc::new(Mutex::new(None)),
            vault_path: Arc::new(Mutex::new(None)),
        })
        .invoke_handler(tauri::generate_handler![
            connect_db,
            set_vault,
            get_vault_files,
            read_note,
            write_note,
            create_note,
            create_folder,
            open_or_create_note_by_title,
            rename_item,
            delete_item,
            run_python_sidecar,
            create_snapshot,
            list_snapshots,
            read_snapshot,
            rollback_to_snapshot,
            ensure_mirror,
            get_mirror_files,
            write_mirror_file,
            read_mirror_file,
            scan_engines,
            read_engine_config,
            write_engine_config,
            run_engine,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
