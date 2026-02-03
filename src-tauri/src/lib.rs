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

/// Returns byte offsets that differ within the specified range
#[tauri::command]
fn diff_in_range(
    path_left: String,
    path_right: String,
    offset: u64,
    length: usize,
    state: State<FileHandles>,
) -> Result<Vec<u64>, String> {
    let mut handles = state.handles.lock().unwrap();
    
    // Seek left file
    if let Some(file) = handles.get_mut(&path_left) {
        file.seek(SeekFrom::Start(offset))
            .map_err(|e| e.to_string())?;
    } else {
        return Err("Left file handle not found".to_string());
    }
    
    // Seek right file
    if let Some(file) = handles.get_mut(&path_right) {
        file.seek(SeekFrom::Start(offset))
            .map_err(|e| e.to_string())?;
    } else {
        return Err("Right file handle not found".to_string());
    }

    let mut diffs: Vec<u64> = vec![];
    let buffer_size = 4096;
    let mut pos = offset;
    let end = offset + length as u64;
    let mut buffer_left = vec![0u8; buffer_size];
    let mut buffer_right = vec![0u8; buffer_size];

    while pos < end {
        let to_read = ((end - pos).min(buffer_size as u64)) as usize;

        // Read from left file
        let bytes_read_left = {
            let file_left = handles
                .get_mut(&path_left)
                .ok_or("Left file handle not found")?;
            file_left
                .read(&mut buffer_left[..to_read])
                .map_err(|e| e.to_string())?
        };

        // Read from right file
        let bytes_read_right = {
            let file_right = handles
                .get_mut(&path_right)
                .ok_or("Right file handle not found")?;
            file_right
                .read(&mut buffer_right[..to_read])
                .map_err(|e| e.to_string())?
        };

        let min_bytes = bytes_read_left.min(bytes_read_right);
        
        for i in 0..min_bytes {
            if buffer_left[i] != buffer_right[i] {
                diffs.push(pos + i as u64);
            }
        }

        // Handle case where files have different lengths
        if bytes_read_left != bytes_read_right {
            let max_bytes = bytes_read_left.max(bytes_read_right);
            for i in min_bytes..max_bytes {
                diffs.push(pos + i as u64);
            }
        }

        pos += to_read as u64;
        
        if bytes_read_left == 0 && bytes_read_right == 0 {
            break;
        }
    }

    Ok(diffs)
}

/// Finds the next byte offset that differs, starting from the given offset
#[tauri::command]
fn find_next_diff(
    path_left: String,
    path_right: String,
    from_offset: u64,
    state: State<FileHandles>,
) -> Result<Option<u64>, String> {
    let mut handles = state.handles.lock().unwrap();
    
    // Seek both files to the starting offset
    if let Some(file) = handles.get_mut(&path_left) {
        file.seek(SeekFrom::Start(from_offset))
            .map_err(|e| e.to_string())?;
    } else {
        return Err("Left file handle not found".to_string());
    }
    
    if let Some(file) = handles.get_mut(&path_right) {
        file.seek(SeekFrom::Start(from_offset))
            .map_err(|e| e.to_string())?;
    } else {
        return Err("Right file handle not found".to_string());
    }

    let buffer_size = 4096;
    let mut pos = from_offset;
    let mut buffer_left = vec![0u8; buffer_size];
    let mut buffer_right = vec![0u8; buffer_size];

    loop {
        // Read from left file
        let bytes_read_left = {
            let file_left = handles
                .get_mut(&path_left)
                .ok_or("Left file handle not found")?;
            file_left
                .read(&mut buffer_left)
                .map_err(|e| e.to_string())?
        };

        // Read from right file
        let bytes_read_right = {
            let file_right = handles
                .get_mut(&path_right)
                .ok_or("Right file handle not found")?;
            file_right
                .read(&mut buffer_right)
                .map_err(|e| e.to_string())?
        };

        if bytes_read_left == 0 && bytes_read_right == 0 {
            break; // End of both files
        }

        let max_bytes = bytes_read_left.max(bytes_read_right);

        for i in 0..max_bytes {
            let byte_left = if i < bytes_read_left {
                buffer_left[i]
            } else {
                0
            };
            let byte_right = if i < bytes_read_right {
                buffer_right[i]
            } else {
                0
            };

            if byte_left != byte_right {
                return Ok(Some(pos + i as u64));
            }
        }

        pos += max_bytes as u64;
    }

    Ok(None)
}

/// Finds the previous byte offset that differs, before the given offset
#[tauri::command]
fn find_prev_diff(
    path_left: String,
    path_right: String,
    from_offset: u64,
    state: State<FileHandles>,
) -> Result<Option<u64>, String> {
    if from_offset == 0 {
        return Ok(None);
    }

    let mut handles = state.handles.lock().unwrap();
    
    let buffer_size = 4096;
    let mut buffer_left = vec![0u8; buffer_size];
    let mut buffer_right = vec![0u8; buffer_size];

    // Search backwards in chunks
    let mut search_end = from_offset;
    
    while search_end > 0 {
        let chunk_start = if search_end > buffer_size as u64 {
            search_end - buffer_size as u64
        } else {
            0
        };
        let chunk_len = (search_end - chunk_start) as usize;

        // Seek and read left file
        if let Some(file) = handles.get_mut(&path_left) {
            file.seek(SeekFrom::Start(chunk_start))
                .map_err(|e| e.to_string())?;
        } else {
            return Err("Left file handle not found".to_string());
        }
        
        let bytes_read_left = {
            let file_left = handles
                .get_mut(&path_left)
                .ok_or("Left file handle not found")?;
            file_left
                .read(&mut buffer_left[..chunk_len])
                .map_err(|e| e.to_string())?
        };

        // Seek and read right file
        if let Some(file) = handles.get_mut(&path_right) {
            file.seek(SeekFrom::Start(chunk_start))
                .map_err(|e| e.to_string())?;
        } else {
            return Err("Right file handle not found".to_string());
        }
        
        let bytes_read_right = {
            let file_right = handles
                .get_mut(&path_right)
                .ok_or("Right file handle not found")?;
            file_right
                .read(&mut buffer_right[..chunk_len])
                .map_err(|e| e.to_string())?
        };

        let max_bytes = bytes_read_left.max(bytes_read_right);

        // Search backwards within this chunk
        for i in (0..max_bytes).rev() {
            let byte_left = if i < bytes_read_left {
                buffer_left[i]
            } else {
                0
            };
            let byte_right = if i < bytes_read_right {
                buffer_right[i]
            } else {
                0
            };

            if byte_left != byte_right {
                return Ok(Some(chunk_start + i as u64));
            }
        }

        search_end = chunk_start;
    }

    Ok(None)
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
            delete_temp_file,
            diff_in_range,
            find_next_diff,
            find_prev_diff,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
