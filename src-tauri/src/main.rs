#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::process::Command;
use std::env;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::Manager;
use std::time::Duration;

// Isso guarda o "interruptor" global para ligar/desligar a escuta do USB
struct AppState {
    is_reading_serial: Arc<AtomicBool>,
}

// --- COMANDO 1: ENVIAR CÓDIGO (Atualizado) ---
#[tauri::command]
fn upload_code(codigo: String, placa: String, porta: String, state: tauri::State<AppState>) -> Result<String, String> {
    
    // REGRA DE OURO: Desliga o Monitor Serial antes de tentar fazer upload!
    state.is_reading_serial.store(false, Ordering::Relaxed);
    std::thread::sleep(Duration::from_millis(500)); // Dá meio segundo pra porta USB ser liberada

    let fqbn = match placa.as_str() {
        "uno" => "arduino:avr:uno",
        "nano" => "arduino:avr:nano",
        "esp32" => "esp32:esp32:esp32",
        _ => "arduino:avr:uno",
    };

    let temp_dir = env::temp_dir();
    let sketch_dir = temp_dir.join("oficina_code_sketch");
    let sketch_path = sketch_dir.join("oficina_code_sketch.ino");

    let _ = fs::create_dir_all(&sketch_dir);

    if let Err(e) = fs::write(&sketch_path, codigo) {
        return Err(format!("Erro ao criar arquivo: {}", e));
    }

    let compile_output = Command::new("arduino-cli").arg("compile").arg("-b").arg(fqbn).arg(&sketch_dir).output();
    let compile_output = match compile_output { Ok(out) => out, Err(e) => return Err(format!("Erro compilador: {}", e)) };

    if !compile_output.status.success() {
        return Err(format!("Erro no código:\n{}", String::from_utf8_lossy(&compile_output.stderr)));
    }

    let upload_output = Command::new("arduino-cli").arg("upload").arg("-b").arg(fqbn).arg("-p").arg(&porta).arg(&sketch_dir).output();
    let upload_output = match upload_output { Ok(out) => out, Err(e) => return Err(format!("Erro upload: {}", e)) };

    if !upload_output.status.success() {
        return Err(format!("Erro na Porta {}:\n{}", porta, String::from_utf8_lossy(&upload_output.stderr)));
    }

    Ok("Sucesso!".to_string())
}

// --- COMANDO 2: LIGAR O MONITOR SERIAL ---
#[tauri::command]
fn start_serial(porta: String, window: tauri::Window, state: tauri::State<AppState>) -> Result<String, String> {
    // Para qualquer escuta antiga primeiro
    state.is_reading_serial.store(false, Ordering::Relaxed);
    std::thread::sleep(Duration::from_millis(200));

    // Liga o interruptor
    let is_reading = Arc::clone(&state.is_reading_serial);
    is_reading.store(true, Ordering::Relaxed);

    // Cria uma tarefa em "background" (Thread) para ficar vigiando o cabo USB infinitamente
    std::thread::spawn(move || {
        // Tenta abrir a porta na velocidade 9600
        let mut port = match serialport::new(&porta, 9600).timeout(Duration::from_millis(100)).open() {
            Ok(p) => p,
            Err(_) => {
                let _ = window.emit("serial-error", format!("Não foi possível abrir a porta {}", porta));
                return;
            }
        };

        let mut serial_buf: Vec<u8> = vec![0; 1000];
        let mut string_acumulada = String::new();

        // Enquanto o interruptor estiver ligado...
        while is_reading.load(Ordering::Relaxed) {
            if let Ok(t) = port.read(serial_buf.as_mut_slice()) {
                if t > 0 {
                    let pedaco = String::from_utf8_lossy(&serial_buf[..t]);
                    string_acumulada.push_str(&pedaco);
                    
                    // Se o robô pulou uma linha (\n), manda a frase inteira pro React!
                    while let Some(pos) = string_acumulada.find('\n') {
                        let frase = string_acumulada[..pos].trim_end().to_string();
                        string_acumulada = string_acumulada[pos+1..].to_string();
                        
                        // 🚀 EMITE O EVENTO "serial-message" PRO FRONTEND REACT
                        let _ = window.emit("serial-message", frase);
                    }
                }
            }
        }
    });

    Ok("Monitor iniciado".to_string())
}

// --- COMANDO 3: DESLIGAR O MONITOR SERIAL ---
#[tauri::command]
fn stop_serial(state: tauri::State<AppState>) -> Result<String, String> {
    state.is_reading_serial.store(false, Ordering::Relaxed);
    Ok("Monitor parado".to_string())
}

fn main() {
    let app_state = AppState {
        is_reading_serial: Arc::new(AtomicBool::new(false)),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init()) 
        .manage(app_state) 
        .invoke_handler(tauri::generate_handler![upload_code, start_serial, stop_serial])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}