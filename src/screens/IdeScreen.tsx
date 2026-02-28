import { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import * as PtBr from 'blockly/msg/pt-br';
import { supabase } from '../lib/supabase'; 
import logoSimples from '../assets/LogoSimples.png'; 
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

Blockly.setLocale(PtBr as any);
const cppGenerator = new Blockly.Generator('CPP');

cppGenerator.scrub_ = function(block, code, opt_thisOnly) {
  const nextBlock = block.nextConnection && block.nextConnection.targetBlock();
  const nextCode = opt_thisOnly ? '' : cppGenerator.blockToCode(nextBlock);
  return code + nextCode;
};

const BOARDS = {
  uno: { name: 'Arduino Uno', pins: [['D2', '2'], ['D3', '3'], ['D4', '4'], ['D5', '5'], ['D6', '6'], ['D7', '7'], ['D8', '8'], ['D9', '9'], ['D10', '10'], ['D11', '11'], ['D12', '12'], ['D13 (LED Interno)', '13']] },
  nano: { name: 'Arduino Nano', pins: [['D2', '2'], ['D3', '3'], ['D4', '4'], ['D5', '5'], ['D6', '6'], ['D7', '7'], ['D8', '8'], ['D9', '9'], ['D10', '10'], ['D11', '11'], ['D12', '12'], ['D13 (LED Interno)', '13']] },
  esp32: { name: 'ESP32 DevKit V1', pins: [['GPIO 2 (LED)', '2'], ['GPIO 4', '4'], ['GPIO 5', '5'], ['GPIO 12', '12'], ['GPIO 13', '13'], ['GPIO 14', '14'], ['GPIO 15', '15'], ['GPIO 18', '18'], ['GPIO 19', '19'], ['GPIO 21', '21'], ['GPIO 22', '22'], ['GPIO 23', '23']] }
};

let currentBoardPins = BOARDS.nano.pins;

if (!Blockly.Blocks['configurar_pino']) {
  const customBlocks = [
    { "type": "bloco_setup", "message0": "⚙️ PREPARAR (Roda 1 vez) %1", "args0": [{ "type": "input_statement", "name": "DO" }], "colour": 290, "tooltip": "Configurações iniciais.", "helpUrl": "" },
    { "type": "bloco_loop", "message0": "🔄 AGIR (Roda para sempre) %1", "args0": [{ "type": "input_statement", "name": "DO" }], "colour": 260, "tooltip": "Ações que vão se repetir.", "helpUrl": "" },
    { "type": "configurar_pino", "message0": "⚙️ Configurar pino %1 como %2", "args0": [{ "type": "field_dropdown", "name": "PIN", "options": () => currentBoardPins }, { "type": "field_dropdown", "name": "MODE", "options": [["Saída (Enviar sinal)", "OUTPUT"], ["Entrada (Ler sensor)", "INPUT"]] }], "previousStatement": null, "nextStatement": null, "colour": 230 },
    { "type": "escrever_pino", "message0": "💡 Colocar pino %1 em estado %2", "args0": [{ "type": "field_dropdown", "name": "PIN", "options": () => currentBoardPins }, { "type": "field_dropdown", "name": "STATE", "options": [["Ligado (HIGH)", "HIGH"], ["Desligado (LOW)", "LOW"]] }], "previousStatement": null, "nextStatement": null, "colour": 230 },
    { "type": "esperar", "message0": "⏱️ Esperar %1 milissegundos", "args0": [{ "type": "field_number", "name": "TIME", "value": 1000, "min": 0 }], "previousStatement": null, "nextStatement": null, "colour": 120 },
    { "type": "repetir_vezes", "message0": "🔁 Repetir %1 vezes %2 %3", "args0": [{ "type": "field_number", "name": "TIMES", "value": 5, "min": 1 }, { "type": "input_dummy" }, { "type": "input_statement", "name": "DO" }], "previousStatement": null, "nextStatement": null, "colour": 120 }
  ];
  Blockly.defineBlocksWithJsonArray(customBlocks);

  cppGenerator.forBlock['bloco_setup'] = function(block: Blockly.Block) { return `void setup() {\n${cppGenerator.statementToCode(block, 'DO') || '  // Suas configurações entrarão aqui...\n'}}\n\n`; };
  cppGenerator.forBlock['bloco_loop'] = function(block: Blockly.Block) { return `void loop() {\n${cppGenerator.statementToCode(block, 'DO') || '  // Suas ações principais entrarão aqui...\n'}}\n\n`; };
  cppGenerator.forBlock['configurar_pino'] = function(block: Blockly.Block) { return `  pinMode(${block.getFieldValue('PIN')}, ${block.getFieldValue('MODE')});\n`; };
  cppGenerator.forBlock['escrever_pino'] = function(block: Blockly.Block) { return `  digitalWrite(${block.getFieldValue('PIN')}, ${block.getFieldValue('STATE')});\n`; };
  cppGenerator.forBlock['esperar'] = function(block: Blockly.Block) { return `  delay(${block.getFieldValue('TIME')});\n`; };
  cppGenerator.forBlock['repetir_vezes'] = function(block: Blockly.Block) { return `  for (int i = 0; i < ${block.getFieldValue('TIMES')}; i++) {\n${cppGenerator.statementToCode(block, 'DO') || ''}  }\n`; };
}

const toolboxConfig = {
  kind: 'categoryToolbox',
  contents: [
    { kind: 'category', name: '🔌 Pinos & LEDs', colour: '230', contents: [{ kind: 'block', type: 'configurar_pino' }, { kind: 'block', type: 'escrever_pino' }] },
    { kind: 'category', name: '⚙️ Controle', colour: '120', contents: [{ kind: 'block', type: 'esperar' }, { kind: 'block', type: 'repetir_vezes' }] }
  ]
};

interface IdeScreenProps { role: 'student' | 'teacher' | 'visitor'; onBack: () => void; projectId?: string; }

export function IdeScreen({ role, onBack, projectId }: IdeScreenProps) {
  const blocklyDiv = useRef<HTMLDivElement>(null);
  const workspace = useRef<Blockly.WorkspaceSvg | null>(null);
  
  const [board, setBoard] = useState<'nano' | 'esp32' | 'uno'>('uno'); 
  const [port, setPort] = useState('/dev/ttyUSB0'); 
  const [generatedCode, setGeneratedCode] = useState<string>('// O código C++ aparecerá aqui...');
  const [isSaving, setIsSaving] = useState(false);
  const [projectName, setProjectName] = useState('Projeto');
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSerialOpen, setIsSerialOpen] = useState(false);
  const [serialMessages, setSerialMessages] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null); 
  const [isCodeVisible, setIsCodeVisible] = useState(false); 
  const [isFullscreenCode, setIsFullscreenCode] = useState(false); 

  const oficinaTheme = Blockly.Theme.defineTheme('oficinaTheme', {
    name: 'oficinaTheme', base: Blockly.Themes.Classic,
    componentStyles: { workspaceBackgroundColour: '#f4f7f6', toolboxBackgroundColour: '#2f3542', toolboxForegroundColour: '#ffffff', flyoutBackgroundColour: '#3b4252', flyoutForegroundColour: '#ffffff', flyoutOpacity: 1, scrollbarColour: '#a4b0be', insertionMarkerColour: '#ffffff', insertionMarkerOpacity: 0.3, }
  });

  useEffect(() => { currentBoardPins = BOARDS[board].pins; }, [board]);

  useEffect(() => {
    if (blocklyDiv.current && !workspace.current) {
      workspace.current = Blockly.inject(blocklyDiv.current, {
        toolbox: toolboxConfig, grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
        readOnly: role === 'teacher' && projectId !== undefined,
        move: { scrollbars: true, drag: true, wheel: true },
        theme: oficinaTheme, zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 },
      });

      workspace.current.addChangeListener((event) => {
        if (event.isUiEvent) return; 
        try { setGeneratedCode(cppGenerator.workspaceToCode(workspace.current!) || '// Arraste blocos para dentro de PREPARAR e AGIR!'); } catch (e) { console.error(e); }
      });

      const ensureRootBlocks = () => {
        if (!workspace.current) return;
        let setupBlock = workspace.current.getTopBlocks(false).find(b => b.type === 'bloco_setup');
        if (!setupBlock) { setupBlock = workspace.current.newBlock('bloco_setup'); setupBlock.moveBy(50, 50); setupBlock.initSvg(); setupBlock.render(); }
        setupBlock.setDeletable(false); 

        let loopBlock = workspace.current.getTopBlocks(false).find(b => b.type === 'bloco_loop');
        if (!loopBlock) { loopBlock = workspace.current.newBlock('bloco_loop'); loopBlock.moveBy(450, 50); loopBlock.initSvg(); loopBlock.render(); }
        loopBlock.setDeletable(false); 
      };

      if (projectId) {
        const loadProject = async () => {
          const { data, error } = await supabase.from('projects').select('*').eq('id', projectId).single();
          if (data && !error) {
            setProjectName(data.name); if (data.target_board) setBoard(data.target_board as 'nano' | 'esp32');
            try { if (data.workspace_data && Object.keys(data.workspace_data).length > 0) Blockly.serialization.workspaces.load(data.workspace_data, workspace.current!); } catch (err) { }
            ensureRootBlocks(); 
          }
        }; loadProject();
      } else { ensureRootBlocks(); }
    }
  }, [projectId, role]);

  useEffect(() => { if (workspace.current) { Blockly.svgResize(workspace.current); } }, [role, isCodeVisible, isFullscreenCode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [serialMessages, isSerialOpen]);

  useEffect(() => {
    let unlisten: () => void;
    
    const setupListener = async () => {
      unlisten = await listen<string>('serial-message', (event) => {
        setSerialMessages(prev => [...prev, event.payload]);
      });
    };
    setupListener();

    return () => { if (unlisten) unlisten(); };
  }, []);

  const handleToggleSerial = async () => {
    try {
      if (isSerialOpen) {
        await invoke('stop_serial');
        setIsSerialOpen(false);
      } else {
        setSerialMessages([]);
        await invoke('start_serial', { porta: port });
        setIsSerialOpen(true);
      }
    } catch (error) {
      alert("Erro no Serial: " + error);
    }
  };

  const handleSaveProject = async () => {
    if (!projectId || !workspace.current) return;
    setIsSaving(true);
    const { error } = await supabase.from('projects').update({ workspace_data: Blockly.serialization.workspaces.save(workspace.current), target_board: board, updated_at: new Date().toISOString() }).eq('id', projectId);
    setIsSaving(false);
    if (!error) setSaveStatus('success'); else { setErrorMessage(error.message); setSaveStatus('error'); }
  };

const handleUploadCode = async () => {
    try {
      setSaveStatus(null);
      // alert('Compilando e enviando para a placa...'); // Pode apagar/comentar esse alert
      
      const respostaDoRust = await invoke('upload_code', { 
        codigo: generatedCode, 
        placa: board, 
        porta: port // Usa a porta selecionada
      });

      alert(respostaDoRust);
      
    } catch (error) {
      alert("❌ " + error);
    }
  };

  return (
    <div className="app-container">
      
      {/* BARRA SUPERIOR (TOPBAR) */}
      <div className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '15px' }}>
        
        {/* 5. A Logo substitui o texto "Oficina Code" */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', minWidth: 'fit-content' }}>
          <img src={logoSimples} alt="Oficina Code" style={{ height: '35px' }} />
          {projectId && (
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--dark)' }}>
              {role === 'student' ? `Mesa: ${projectName}` : `👀 Inspecionando: ${projectName}`}
            </h2>
          )}
        </div>

<div className="hardware-controls">
          <select value={board} onChange={(e) => setBoard(e.target.value as 'nano' | 'esp32' | 'uno')} disabled={role === 'teacher' && projectId !== undefined}>
            <option value="uno">Arduino Uno</option>
            <option value="nano">Arduino Nano</option>
            <option value="esp32">ESP32</option>
          </select>
          <select value={port} onChange={(e) => setPort(e.target.value)}>
            <option value="/dev/ttyACM0">/dev/ttyACM0 (Linux Uno)</option>
            <option value="/dev/ttyUSB0">/dev/ttyUSB0 (Linux Nano)</option>
            <option value="COM3">COM3 (Windows)</option>
          </select>
          
          <button onClick={handleUploadCode}>
            🚀 Enviar
          </button>
          
          {/* NOVO BOTÃO DO MONITOR SERIAL */}
          <button 
            style={{ backgroundColor: isSerialOpen ? '#ff4757' : '#2c3e50' }} 
            onClick={handleToggleSerial}
          >
            {isSerialOpen ? 'Parar Chat' : '💬 Chat Robô'}
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          
          {/* 1. Menu C++ Oculto para Crianças (Aparece para professor ou visitante adulto) */}
          {role !== 'student' && (
            <button className="btn-secondary" onClick={() => setIsCodeVisible(!isCodeVisible)} style={{ margin: 0, backgroundColor: '#34495e', boxShadow: '0 4px 0px #2c3e50' }}>
              {isCodeVisible ? '🙈 Ocultar Código' : '💻 Ver Código'}
            </button>
          )}

          {role === 'student' && projectId && (
            <button className="btn-primary" onClick={handleSaveProject} disabled={isSaving} style={{ margin: 0 }}>
              {isSaving ? '⏳ A gravar...' : '💾 Salvar'}
            </button>
          )}

          {/* 4. Botão de Sair com classe btn-danger para máxima legibilidade */}
          <button className="btn-danger" onClick={onBack} style={{ margin: 0 }}>
            Sair
          </button>
        </div>
      </div>
      
      {/* ÁREA DE TRABALHO */}
      <div className="workspace-area">
        <div ref={blocklyDiv} id="blocklyDiv" />
        
        {isCodeVisible && (
          // 3. Aplica a classe fullscreen se o estado for verdadeiro
          <div className={`code-panel ${isFullscreenCode ? 'fullscreen' : ''}`}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: 'var(--secondary)' }}>Código (C++)</h3>
              
              {/* 3. Botão de Tela Cheia */}
              <button 
                onClick={() => setIsFullscreenCode(!isFullscreenCode)}
                style={{ 
                  background: 'transparent', border: '1px solid #a4b0be', color: '#a4b0be', 
                  padding: '4px 8px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', margin: 0
                }}
              >
                {isFullscreenCode ? '↙️ Reduzir' : '⛶ Tela Cheia'}
              </button>
            </div>

            <pre>{generatedCode}</pre>
          </div>
        )}
      </div>

      {/* MODAIS */}
      {saveStatus === 'success' && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999 }}>
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '24px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: '4.5rem', marginBottom: '10px' }}>✅</div>
            <h2 style={{ color: 'var(--dark)', marginBottom: '15px' }}>Projeto Salvo!</h2>
            <p style={{ color: '#7f8c8d', marginBottom: '25px', fontSize: '1.1rem' }}>As suas peças e progressos foram guardados na nuvem.</p>
            <button className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1.1rem' }} onClick={() => setSaveStatus(null)}>Continuar</button>
          </div>
        </div>
      )}

      {saveStatus === 'error' && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999 }}>
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '24px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: '4.5rem', marginBottom: '10px' }}>❌</div>
            <h2 style={{ color: 'var(--dark)', marginBottom: '15px' }}>Ocorreu um Erro</h2>
            <p style={{ color: '#7f8c8d', marginBottom: '25px', fontSize: '1rem' }}>{errorMessage}</p>
            <button className="btn-danger" style={{ width: '100%', padding: '14px' }} onClick={() => setSaveStatus(null)}>Tentar Novamente</button>
          </div>
        </div>
      )}
      {/* --- JANELA DO MONITOR SERIAL --- */}
      {isSerialOpen && (
        <div style={{
          position: 'fixed', bottom: '20px', right: '20px', width: '350px', height: '400px',
          backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column', zIndex: 9000, overflow: 'hidden', border: '2px solid #e0e6ed'
        }}>
          {/* Cabeçalho do Chat */}
          <div style={{ backgroundColor: '#2c3e50', color: 'white', padding: '15px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
            <span>🤖 O Robô diz...</span>
            <span style={{ cursor: 'pointer' }} onClick={handleToggleSerial}>✕</span>
          </div>
          
          {/* Área de Mensagens */}
          <div style={{ flex: 1, padding: '15px', overflowY: 'auto', backgroundColor: '#f8fafd', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {serialMessages.length === 0 ? (
              <p style={{ color: '#a4b0be', textAlign: 'center', marginTop: '50px', fontStyle: 'italic' }}>
                Aguardando o robô falar...
              </p>
            ) : (
              serialMessages.map((msg, idx) => (
                <div key={idx} style={{ 
                  backgroundColor: '#dfe6e9', padding: '10px 15px', borderRadius: '15px', 
                  borderBottomLeftRadius: '2px', alignSelf: 'flex-start', color: '#2d3436',
                  maxWidth: '85%', wordBreak: 'break-word', fontFamily: 'monospace'
                }}>
                  {msg}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}