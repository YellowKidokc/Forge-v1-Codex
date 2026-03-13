use tauri::State;
use sqlx::{PgPool, postgres::PgPoolOptions};
use serde::{Serialize, Deserialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use std::path::{Path, PathBuf};
use std::fs;

// ─── Types ───────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug)]
struct FileEntry {
    name: String,
    path: String,
    is_dir: bool,
    children: Option<Vec<FileEntry>>,
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

    // Try multiple credential combinations
    let credentials = vec![
        ("Yellowkid", "Moss9pep2828"),
        ("postgres", "Yellowkid"),
        ("lowes", "Moss9pep2828"),
        ("david", "Moss9pep2828"),
        ("postgres", "Moss9pep2828"),
    ];
    
    for (user, pass) in credentials {
        let database_url = format!("postgres://{}:{}@192.168.1.177:2665/theophysics", user, pass);
        
        match PgPoolOptions::new()
            .max_connections(5)
            .acquire_timeout(std::time::Duration::from_secs(2))
            .connect(&database_url)
            .await
        {
            Ok(pool) => {
                *db_lock = Some(pool);
                return Ok(format!("Connected as {}", user));
            }
            Err(e) => {
                eprintln!("DB attempt {}: {}", user, e);
                continue;
            }
        }
    }
    
    // Don't block the app - just return local mode message
    eprintln!("⚠️  Database unavailable - running in local-only mode");
    Ok("Local mode (DB unavailable)".to_string())
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
