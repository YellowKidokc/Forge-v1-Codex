use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

#[cfg(feature = "database")]
use sqlx::{postgres::PgPoolOptions, PgPool};

#[cfg(not(feature = "database"))]
type PgPool = ();

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

#[derive(Serialize, Deserialize, Clone, Debug)]
struct EngineEntry {
    id: String,
    name: String,
    file: String,
    enabled: bool,
    trigger: String,
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

    // Ensure required vault infrastructure exists.
    let _ = ensure_mirror_root(&p);
    let _ = ensure_engine_root(&p);

    Ok(format!("Vault set: {}", path))
}

#[tauri::command]
async fn get_vault_files(state: State<'_, AppState>) -> Result<Vec<FileEntry>, String> {
    let vault = state.vault_path.lock().await;
    let vault_path = vault.as_ref().ok_or("No vault selected")?;
    scan_directory(&PathBuf::from(vault_path), 0, 5).map_err(|e| e.to_string())
}

fn scan_directory(
    path: &PathBuf,
    depth: usize,
    max_depth: usize,
) -> Result<Vec<FileEntry>, std::io::Error> {
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
}

fn ensure_mirror_root(vault_root: &Path) -> Result<PathBuf, String> {
    let mirror_root = vault_root.join("_data");
    fs::create_dir_all(&mirror_root).map_err(|e| e.to_string())?;
    Ok(mirror_root)
}

fn ensure_engine_root(vault_root: &Path) -> Result<PathBuf, String> {
    let engine_root = vault_root.join("_engines");
    fs::create_dir_all(&engine_root).map_err(|e| e.to_string())?;
    Ok(engine_root)
}

fn sync_mirror_structure(
    vault_root: &Path,
    mirror_root: &Path,
    current: &Path,
) -> Result<(), String> {
    for entry in fs::read_dir(current).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        if name == "_data" || name == "_engines" || is_ignored_folder(&name) {
            continue;
        }

        if path.is_dir() {
            let relative = path.strip_prefix(vault_root).map_err(|e| e.to_string())?;
            let mirror_dir = mirror_root.join(relative);
            fs::create_dir_all(&mirror_dir).map_err(|e| e.to_string())?;
            sync_mirror_structure(vault_root, mirror_root, &path)?;
        }
    }

    Ok(())
}

fn sanitize_relative_path(input: &str) -> Result<PathBuf, String> {
    let normalized = input.replace('\\', "/");
    let trimmed = normalized.trim().trim_start_matches('/');
    if trimmed.is_empty() {
        return Err("Path cannot be empty".to_string());
    }

    let mut out = PathBuf::new();
    for segment in trimmed.split('/') {
        let seg = segment.trim();
        if seg.is_empty() || seg == "." {
            continue;
        }
        if seg == ".." {
            return Err("Path traversal is not allowed".to_string());
        }
        out.push(seg);
    }

    if out.as_os_str().is_empty() {
        return Err("Path cannot be empty".to_string());
    }

    Ok(out)
}

fn mirror_scan_directory(
    path: &PathBuf,
    depth: usize,
    max_depth: usize,
) -> Result<Vec<FileEntry>, std::io::Error> {
    if depth >= max_depth {
        return Ok(vec![]);
    }

    let mut entries = Vec::new();
    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let name = entry.file_name().to_string_lossy().to_string();
        let file_path = entry.path();
        let is_dir = file_path.is_dir();

        if is_dir {
            let children = mirror_scan_directory(&file_path, depth + 1, max_depth)?;
            entries.push(FileEntry {
                name,
                path: file_path.to_string_lossy().to_string(),
                is_dir: true,
                children: if children.is_empty() {
                    None
                } else {
                    Some(children)
                },
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

fn extract_engine_field(content: &str, key: &str) -> Option<String> {
    let prefix = format!("{}:", key);
    for line in content.lines() {
        let trimmed = line.trim();
        if !trimmed.starts_with(&prefix) {
            continue;
        }

        let value = trimmed[prefix.len()..]
            .trim()
            .trim_matches('"')
            .trim_matches('\'');
        if !value.is_empty() {
            return Some(value.to_string());
        }
    }
    None
}

fn parse_engine_entry(path: &PathBuf) -> Result<EngineEntry, String> {
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let file_name = path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or_default()
        .to_string();

    let stem = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("engine")
        .to_string();

    let name = extract_engine_field(&content, "name").unwrap_or_else(|| stem.clone());
    let enabled = extract_engine_field(&content, "enabled")
        .map(|v| v.eq_ignore_ascii_case("true"))
        .unwrap_or(false);
    let trigger = extract_engine_field(&content, "trigger").unwrap_or_else(|| "manual".to_string());

    Ok(EngineEntry {
        id: stem,
        name,
        file: file_name,
        enabled,
        trigger,
    })
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
async fn open_or_create_note_by_title(
    title: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
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
async fn delete_item(path: String, state: State<'_, AppState>) -> Result<(), String> {
    let target = PathBuf::from(&path)
        .canonicalize()
        .map_err(|e| format!("Invalid delete path: {}", e))?;
    let vault = state.vault_path.lock().await;
    let vault_path = vault.as_ref().ok_or("No vault selected")?;
    let vault_root = PathBuf::from(vault_path)
        .canonicalize()
        .map_err(|e| format!("Invalid vault path: {}", e))?;

    if !target.starts_with(&vault_root) {
        return Err("Refusing to delete outside active vault".to_string());
    }

    if target.is_dir() {
        fs::remove_dir_all(target).map_err(|e| e.to_string())
    } else {
        fs::remove_file(target).map_err(|e| e.to_string())
    }
}

#[tauri::command]
async fn create_mirror(state: State<'_, AppState>) -> Result<String, String> {
    let vault = state.vault_path.lock().await;
    let vault_path = vault.as_ref().ok_or("No vault selected")?;
    let vault_root = Path::new(vault_path);
    let mirror_path = ensure_mirror_root(vault_root)?;
    sync_mirror_structure(vault_root, &mirror_path, vault_root)?;
    Ok(mirror_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn get_mirror_files(state: State<'_, AppState>) -> Result<Vec<FileEntry>, String> {
    let vault = state.vault_path.lock().await;
    let vault_path = vault.as_ref().ok_or("No vault selected")?;
    let mirror_path = ensure_mirror_root(Path::new(vault_path))?;
    mirror_scan_directory(&mirror_path, 0, 7).map_err(|e| e.to_string())
}

#[tauri::command]
async fn write_mirror_file(
    relative_path: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let vault = state.vault_path.lock().await;
    let vault_path = vault.as_ref().ok_or("No vault selected")?;

    let mirror_root = ensure_mirror_root(Path::new(vault_path))?;
    let relative = sanitize_relative_path(&relative_path)?;
    let full = mirror_root.join(relative);
    if let Some(parent) = full.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&full, content).map_err(|e| e.to_string())?;
    Ok(full.to_string_lossy().to_string())
}

#[tauri::command]
async fn create_engine(
    file: String,
    name: String,
    trigger: Option<String>,
    enabled: Option<bool>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let vault = state.vault_path.lock().await;
    let vault_path = vault.as_ref().ok_or("No vault selected")?;
    let engine_root = ensure_engine_root(Path::new(vault_path))?;

    let mut relative = sanitize_relative_path(&file)?;
    if relative.extension().is_none() {
        relative.set_extension("yaml");
    }

    let full = engine_root.join(relative);
    if let Some(parent) = full.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let display_name = if name.trim().is_empty() {
        "Untitled Engine"
    } else {
        name.trim()
    };
    let trigger_value = trigger.unwrap_or_else(|| "manual".to_string());
    let enabled_value = enabled.unwrap_or(false);

    let yaml = format!(
        "name: \"{}\"\nenabled: {}\ntrigger: {}\nscript: \"\"\n",
        display_name, enabled_value, trigger_value
    );

    fs::write(&full, yaml).map_err(|e| e.to_string())?;
    Ok(full.to_string_lossy().to_string())
}

#[tauri::command]
async fn ensure_engine_folder(state: State<'_, AppState>) -> Result<String, String> {
    let vault = state.vault_path.lock().await;
    let vault_path = vault.as_ref().ok_or("No vault selected")?;
    let engine_root = ensure_engine_root(Path::new(vault_path))?;
    Ok(engine_root.to_string_lossy().to_string())
}

#[tauri::command]
async fn get_engines(state: State<'_, AppState>) -> Result<Vec<EngineEntry>, String> {
    let vault = state.vault_path.lock().await;
    let vault_path = vault.as_ref().ok_or("No vault selected")?;
    let engine_root = ensure_engine_root(Path::new(vault_path))?;

    let mut result = Vec::new();
    for entry in fs::read_dir(engine_root).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        let ext = path
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or_default()
            .to_lowercase();
        if ext != "yaml" && ext != "yml" {
            continue;
        }

        result.push(parse_engine_entry(&path)?);
    }

    result.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(result)
}

#[tauri::command]
async fn toggle_engine(
    file: String,
    enabled: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let vault = state.vault_path.lock().await;
    let vault_path = vault.as_ref().ok_or("No vault selected")?;
    let engine_root = ensure_engine_root(Path::new(vault_path))?;
    let path = engine_root.join(file);

    if !path.exists() {
        return Err("Engine file not found".to_string());
    }

    let existing = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut changed = false;
    let mut lines = Vec::new();

    for line in existing.lines() {
        if line.trim_start().starts_with("enabled:") {
            lines.push(format!("enabled: {}", enabled));
            changed = true;
        } else {
            lines.push(line.to_string());
        }
    }

    if !changed {
        lines.push(format!("enabled: {}", enabled));
    }

    fs::write(path, lines.join("\n")).map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Database Commands ───────────────────────────────────────────

#[tauri::command]
async fn connect_db(state: State<'_, AppState>) -> Result<String, String> {
    #[cfg(not(feature = "database"))]
    {
        let _ = state;
        return Ok("Local mode (database feature disabled)".to_string());
    }

    #[cfg(feature = "database")]
    {
    let mut db_lock = state.db.lock().await;

    if db_lock.is_some() {
        return Ok("Connected".to_string());
    }

    let (user, pass) = match (
        std::env::var("FORGE_DB_USER"),
        std::env::var("FORGE_DB_PASS"),
    ) {
        (Ok(user), Ok(pass)) => (user, pass),
        _ => {
            eprintln!("⚠️  FORGE_DB_USER/FORGE_DB_PASS not set - running in local-only mode");
            return Ok("Local mode (DB credentials missing)".to_string());
        }
    };

    let database_url = format!(
        "postgres://{}:{}@192.168.1.177:2665/theophysics",
        user, pass
    );

    match PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(std::time::Duration::from_secs(2))
        .connect(&database_url)
        .await
    {
        Ok(pool) => {
            *db_lock = Some(pool);
            Ok(format!("Connected as {}", user))
        }
        Err(e) => {
            eprintln!("DB connect failed for {}: {}", user, e);
            eprintln!("⚠️  Database unavailable - running in local-only mode");
            Ok("Local mode (DB unavailable)".to_string())
        }
    }
    }
}

fn resolve_sidecar_script() -> Result<PathBuf, String> {
    let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
    let candidates = vec![
        cwd.join("scripts").join("ai_sidecar.py"),
        cwd.join("..").join("scripts").join("ai_sidecar.py"),
        cwd.join("..")
            .join("_FORGE_SOURCE")
            .join("scripts")
            .join("ai_sidecar.py"),
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
        stdin
            .write_all(payload.as_bytes())
            .map_err(|e| e.to_string())?;
    }

    let output = child.wait_with_output().map_err(|e| e.to_string())?;
    if output.status.success() {
        let stdout = String::from_utf8(output.stdout).map_err(|e| e.to_string())?;
        Ok(stdout)
    } else {
        let stderr = String::from_utf8(output.stderr)
            .unwrap_or_else(|_| "Python sidecar failed".to_string());
        Err(stderr)
    }
}

#[tauri::command]
async fn run_python_sidecar(request: PythonSidecarRequest) -> Result<String, String> {
    let payload = serde_json::to_string(&request).map_err(|e| e.to_string())?;

    run_sidecar_with("python", &[], &payload).or_else(|_| run_sidecar_with("py", &["-3"], &payload))
}

// ─── App Entry ───────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
            create_mirror,
            get_mirror_files,
            write_mirror_file,
            ensure_engine_folder,
            create_engine,
            get_engines,
            toggle_engine,
            run_python_sidecar,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
