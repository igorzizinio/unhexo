use std::collections::HashMap;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom, Write};
use std::sync::Mutex;
use tauri::State;

struct FileHandles {
    handles: Mutex<HashMap<String, File>>,
}

#[derive(serde::Serialize)]
struct FileInfo {
    size: u64,
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

#[tauri::command]
fn create_temp_file(size: u64) -> Result<String, String> {
    use std::env;

    // Get system temp directory
    let temp_dir = env::temp_dir();

    // Create a unique filename
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let filename = format!("unhexo_temp_{}.bin", timestamp);
    let temp_path = temp_dir.join(filename);

    // Create the file and fill it with zeros
    let mut file = File::create(&temp_path).map_err(|e| e.to_string())?;
    let zeros = vec![0u8; 4096]; // 4KB buffer
    let mut remaining = size;

    while remaining > 0 {
        let to_write = remaining.min(zeros.len() as u64) as usize;
        file.write_all(&zeros[..to_write])
            .map_err(|e| e.to_string())?;
        remaining -= to_write as u64;
    }

    file.flush().map_err(|e| e.to_string())?;

    Ok(temp_path.to_string_lossy().to_string())
}

#[tauri::command]
fn delete_temp_file(path: String) -> Result<(), String> {
    std::fs::remove_file(&path).map_err(|e| e.to_string())?;
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
            open_file_handle,
            read_file_chunk,
            close_file_handle,
            create_temp_file,
            delete_temp_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
