#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::process::Command;
use std::env;

#[tauri::command]
fn upload_code(codigo: String, placa: String, porta: String) -> Result<String, String> {
    // 1. Mapear o nome da placa para a linguagem que o arduino-cli entende (FQBN)
    let fqbn = match placa.as_str() {
        "uno" => "arduino:avr:uno",
        "nano" => "arduino:avr:nano",
        "esp32" => "esp32:esp32:esp32",
        _ => "arduino:avr:uno", // Padrão de segurança
    };

    // 2. Preparar a pasta temporária (O Arduino exige que o arquivo .ino tenha o mesmo nome da pasta)
    let temp_dir = env::temp_dir();
    let sketch_dir = temp_dir.join("oficina_code_sketch");
    let sketch_path = sketch_dir.join("oficina_code_sketch.ino");

    // Cria a pasta
    let _ = fs::create_dir_all(&sketch_dir);

    // 3. Salva o código em C++ dentro do arquivo .ino
    if let Err(e) = fs::write(&sketch_path, codigo) {
        return Err(format!("Erro ao criar o arquivo da placa: {}", e));
    }

    // 4. Fase de Compilação (Verificar se o código tem erros)
    let compile_output = Command::new("arduino-cli")
        .arg("compile")
        .arg("-b")
        .arg(fqbn)
        .arg(&sketch_dir)
        .output();

    let compile_output = match compile_output {
        Ok(out) => out,
        Err(e) => return Err(format!("Erro ao chamar o compilador: {}", e)),
    };

    if !compile_output.status.success() {
        let stderr = String::from_utf8_lossy(&compile_output.stderr);
        return Err(format!("O seu código tem um erro de lógica:\n{}", stderr));
    }

    // 5. Fase de Upload (Enviar para o cabo USB)
    let upload_output = Command::new("arduino-cli")
        .arg("upload")
        .arg("-b")
        .arg(fqbn)
        .arg("-p")
        .arg(&porta)
        .arg(&sketch_dir)
        .output();

    let upload_output = match upload_output {
        Ok(out) => out,
        Err(e) => return Err(format!("Erro ao iniciar envio: {}", e)),
    };

    if !upload_output.status.success() {
        let stderr = String::from_utf8_lossy(&upload_output.stderr);
        return Err(format!("Erro na Porta {}. A placa está conectada?\nDetalhes: {}", porta, stderr));
    }

    Ok("Sucesso! O seu robô já está rodando o código novo!".to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![upload_code])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}