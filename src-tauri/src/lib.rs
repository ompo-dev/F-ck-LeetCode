// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::fs;
use std::path::Path;
use std::io::Cursor;
use screenshots::Screen;
use base64::{Engine as _, engine::general_purpose};
use image::ImageEncoder;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn delete_temp_image(file_path: String) -> Result<(), String> {
    if Path::new(&file_path).exists() {
        fs::remove_file(&file_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn capture_screen() -> Result<String, String> {
    // Capturar todos os displays conectados
    let screens = match Screen::all() {
        Ok(s) => s,
        Err(e) => {
            eprintln!("Erro ao acessar displays: {}", e);
            return Err(format!("Erro ao acessar displays: {}", e));
        }
    };
    
    // Se não houver displays, retorne um erro
    if screens.is_empty() {
        eprintln!("Nenhum display encontrado");
        return Err("Nenhum display encontrado".to_string());
    }
    
    // Usar o display principal (primeiro da lista)
    let screen = &screens[0];
    
    // Capturar a imagem do display
    let image = match screen.capture() {
        Ok(img) => img,
        Err(e) => {
            eprintln!("Erro ao capturar tela: {}", e);
            return Err(format!("Erro ao capturar tela: {}", e));
        }
    };
    
    // Converter a imagem para PNG usando a biblioteca image
    let mut buffer = Vec::new();
    let cursor = Cursor::new(&mut buffer);
    
    // Obter as dimensões da imagem
    let (width, height) = image.dimensions();
    eprintln!("Imagem capturada: {}x{}", width, height);
    
    // Obter os pixels como bytes
    let raw_pixels = image.into_raw();
    
    // Codificar a imagem como PNG
    let png_encoder = image::codecs::png::PngEncoder::new(cursor);
    if let Err(e) = png_encoder.write_image(
        &raw_pixels,
        width,
        height,
        image::ColorType::Rgba8
    ) {
        eprintln!("Erro ao codificar imagem: {}", e);
        return Err(format!("Erro ao codificar imagem: {}", e));
    }
    
    // Codificar o PNG para base64
    let base64_image = general_purpose::STANDARD.encode(&buffer);
    eprintln!("Imagem codificada em base64 com sucesso (tamanho: {})", base64_image.len());
    
    Ok(base64_image)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, delete_temp_image, capture_screen])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
