use std::collections::HashMap;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::sync::Mutex;
use tauri::State;

struct FileHandles {
    handles: Mutex<HashMap<String, File>>,
}

#[derive(serde::Serialize)]
struct FileInfo {
    size: u64,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn open_file_handle(path: String, state: State<FileHandles>) -> Result<FileInfo, String> {
    let file = File::open(&path).map_err(|e| e.to_string())?;
    let metadata = file.metadata().map_err(|e| e.to_string())?;
    let size = metadata.len();

    let mut handles = state.handles.lock().unwrap();
    handles.insert(path, file);

    Ok(FileInfo { size })
}

#[tauri::command]
fn read_file_chunk(
    path: String,
    offset: u64,
    length: usize,
    state: State<FileHandles>,
) -> Result<Vec<u8>, String> {
    let mut handles = state.handles.lock().unwrap();
    let file = handles.get_mut(&path).ok_or("File handle not found")?;

    file.seek(SeekFrom::Start(offset))
        .map_err(|e| e.to_string())?;

    let mut buffer = vec![0u8; length];
    let bytes_read = file.read(&mut buffer).map_err(|e| e.to_string())?;
    buffer.truncate(bytes_read);

    Ok(buffer)
}

#[tauri::command]
fn close_file_handle(path: String, state: State<FileHandles>) -> Result<(), String> {
    let mut handles = state.handles.lock().unwrap();
    handles.remove(&path);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .manage(FileHandles {
            handles: Mutex::new(HashMap::new()),
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            open_file_handle,
            read_file_chunk,
            close_file_handle
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
