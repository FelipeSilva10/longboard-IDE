import { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import * as PtBr from 'blockly/msg/pt-br';
import { supabase } from '../lib/supabase'; 

Blockly.setLocale(PtBr as any);
const cppGenerator = new Blockly.Generator('CPP');

// 1. AS NOSSAS PLACAS E AS SUAS PORTAS REAIS
const BOARDS = {
  nano: { 
    name: 'Arduino Nano', 
    pins: [['D2', '2'], ['D3', '3'], ['D4', '4'], ['D5', '5'], ['D6', '6'], ['D7', '7'], ['D8', '8'], ['D9', '9'], ['D10', '10'], ['D11', '11'], ['D12', '12'], ['D13 (LED Interno)', '13']] 
  },
  esp32: { 
    name: 'ESP32 DevKit', 
    pins: [['GPIO 2 (LED)', '2'], ['GPIO 4', '4'], ['GPIO 5', '5'], ['GPIO 12', '12'], ['GPIO 13', '13'], ['GPIO 14', '14'], ['GPIO 15', '15'], ['GPIO 18', '18'], ['GPIO 19', '19'], ['GPIO 21', '21'], ['GPIO 22', '22'], ['GPIO 23', '23']] 
  }
};

// Variável que guarda os pinos atuais. O Blockly vai lê-la sempre que o aluno abrir um bloco!
let currentBoardPins = BOARDS.nano.pins;

// 2. DEFINIÇÃO DOS BLOCOS CUSTOMIZADOS LÚDICOS (Evitando erros de Hot Reload do React)
if (!Blockly.Blocks['configurar_pino']) {
  const customBlocks = [
    {
      "type": "configurar_pino",
      "message0": "⚙️ Configurar pino %1 como %2",
      "args0": [
        { "type": "field_dropdown", "name": "PIN", "options": () => currentBoardPins }, // <-- Menu Dinâmico!
        { "type": "field_dropdown", "name": "MODE", "options": [["Saída (Enviar sinal)", "OUTPUT"], ["Entrada (Ler sensor)", "INPUT"]] }
      ],
      "previousStatement": null, "nextStatement": null, "colour": 230
    },
    {
      "type": "escrever_pino",
      "message0": "💡 Colocar pino %1 em estado %2",
      "args0": [
        { "type": "field_dropdown", "name": "PIN", "options": () => currentBoardPins },
        { "type": "field_dropdown", "name": "STATE", "options": [["Ligado (HIGH)", "HIGH"], ["Desligado (LOW)", "LOW"]] }
      ],
      "previousStatement": null, "nextStatement": null, "colour": 230
    },
    {
      "type": "esperar",
      "message0": "⏱️ Esperar %1 milissegundos",
      "args0": [
        { "type": "field_number", "name": "TIME", "value": 1000, "min": 0 }
      ],
      "previousStatement": null, "nextStatement": null, "colour": 120
    },
    {
      "type": "repetir_vezes",
      "message0": "🔁 Repetir %1 vezes %2 %3",
      "args0": [
        { "type": "field_number", "name": "TIMES", "value": 5, "min": 1 },
        { "type": "input_dummy" },
        { "type": "input_statement", "name": "DO" }
      ],
      "previousStatement": null, "nextStatement": null, "colour": 120
    }
  ];
  Blockly.defineBlocksWithJsonArray(customBlocks);

  // 3. TRADUÇÃO DOS BLOCOS PARA C++
  cppGenerator.forBlock['configurar_pino'] = function(block: Blockly.Block) {
    return `pinMode(${block.getFieldValue('PIN')}, ${block.getFieldValue('MODE')});\n`;
  };
  cppGenerator.forBlock['escrever_pino'] = function(block: Blockly.Block) {
    return `digitalWrite(${block.getFieldValue('PIN')}, ${block.getFieldValue('STATE')});\n`;
  };
  cppGenerator.forBlock['esperar'] = function(block: Blockly.Block) {
    return `delay(${block.getFieldValue('TIME')});\n`;
  };
  cppGenerator.forBlock['repetir_vezes'] = function(block: Blockly.Block) {
    const times = block.getFieldValue('TIMES');
    const branch = cppGenerator.statementToCode(block, 'DO') || '';
    return `for (int i = 0; i < ${times}; i++) {\n${branch}}\n`;
  };
}

// 4. ESTRUTURA DAS CATEGORIAS (Menu Lateral)
const toolboxConfig = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: '🔌 Pinos & LEDs',
      colour: '230',
      contents: [
        { kind: 'block', type: 'configurar_pino' },
        { kind: 'block', type: 'escrever_pino' }
      ]
    },
    {
      kind: 'category',
      name: '⚙️ Controle',
      colour: '120',
      contents: [
        { kind: 'block', type: 'esperar' },
        { kind: 'block', type: 'repetir_vezes' }
      ]
    }
  ]
};

interface IdeScreenProps {
  role: 'student' | 'teacher' | 'visitor';
  onBack: () => void; 
  projectId?: string; 
}

export function IdeScreen({ role, onBack, projectId }: IdeScreenProps) {
  const blocklyDiv = useRef<HTMLDivElement>(null);
  const workspace = useRef<Blockly.WorkspaceSvg | null>(null);
  
  const [board, setBoard] = useState<'nano' | 'esp32'>('nano');
  const [generatedCode, setGeneratedCode] = useState<string>('// O código C++ aparecerá aqui...');
  
  const [isSaving, setIsSaving] = useState(false);
  const [projectName, setProjectName] = useState('Projeto');
  
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Magia do Menu Dinâmico: Sempre que a placa muda, o Blockly recebe as novas portas
  useEffect(() => { currentBoardPins = BOARDS[board].pins; }, [board]);

  useEffect(() => {
    if (blocklyDiv.current && !workspace.current) {
      workspace.current = Blockly.inject(blocklyDiv.current, {
        toolbox: toolboxConfig, // Usamos as Categorias
        grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
        readOnly: role === 'teacher' && projectId !== undefined 
      });

      workspace.current.addChangeListener((event) => {
        if (event.isUiEvent) return; 
        try {
          const code = cppGenerator.workspaceToCode(workspace.current!);
          setGeneratedCode(code || '// Arraste blocos para começar a programar!');
        } catch (e) { console.error(e); }
      });

      if (projectId) {
        const loadProject = async () => {
          const { data, error } = await supabase.from('projects').select('*').eq('id', projectId).single();
          if (data && !error) {
            setProjectName(data.name);
            if (data.target_board) setBoard(data.target_board as 'nano' | 'esp32');
            if (data.workspace_data && Object.keys(data.workspace_data).length > 0) {
              Blockly.serialization.workspaces.load(data.workspace_data, workspace.current!);
            }
          }
        };
        loadProject();
      }
    }
  }, [projectId, role]);

  useEffect(() => { if (workspace.current) { Blockly.svgResize(workspace.current); } }, [role]);

  const handleSaveProject = async () => {
    if (!projectId || !workspace.current) return;
    setIsSaving(true);
    const workspaceData = Blockly.serialization.workspaces.save(workspace.current);
    const { error } = await supabase.from('projects')
      .update({ workspace_data: workspaceData, target_board: board, updated_at: new Date().toISOString() })
      .eq('id', projectId);

    setIsSaving(false);
    if (!error) setSaveStatus('success');
    else { setErrorMessage(error.message); setSaveStatus('error'); }
  };

  return (
    <div className="app-container">
      
      {/* COCKPIT DE CONTROLE NO TOPO */}
      <div className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '15px' }}>
        
        {/* Título */}
        <h2 style={{ margin: 0, minWidth: 'fit-content' }}>
          {role === 'student' && projectId ? `Mesa: ${projectName}` : 
           role === 'teacher' && projectId ? `👀 Inspecionando: ${projectName}` : 
           'Longboard IDE'}
        </h2>

        {/* CONTROLES DE HARDWARE (MOCK) */}
        <div style={{ display: 'flex', gap: '10px', backgroundColor: '#eef2f5', padding: '6px 12px', borderRadius: '12px', flexWrap: 'wrap' }}>
          
          <select value={board} onChange={(e) => setBoard(e.target.value as 'nano' | 'esp32')} disabled={role === 'teacher' && projectId !== undefined} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #d1d8e0', margin: 0 }}>
            <option value="nano">🖥️ Arduino Nano</option>
            <option value="esp32">📡 ESP32 DevKit</option>
          </select>

          <select style={{ padding: '8px', borderRadius: '8px', border: '1px solid #d1d8e0', margin: 0 }}>
            <option value="">🔌 Selecionar Porta COM...</option>
            <option value="COM3">COM3 (USB-SERIAL CH340)</option>
            <option value="COM4">COM4 (Dispositivo Desconhecido)</option>
          </select>

          <button className="btn-primary" onClick={() => alert('Em breve: Este botão enviará o código C++ silenciosamente para a placa via Rust!')} style={{ margin: 0, padding: '8px 15px', backgroundColor: '#4cd137', border: 'none', boxShadow: '0 4px 0px #44bd32' }}>
            🚀 Enviar
          </button>
        </div>
        
        {/* BOTÕES DE NAVEGAÇÃO E SAVE */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {role === 'student' && projectId && (
            <button className="btn-primary" onClick={handleSaveProject} disabled={isSaving} style={{ padding: '10px 20px', margin: 0 }}>
              {isSaving ? '⏳ A gravar...' : '💾 Salvar'}
            </button>
          )}

          <button className="btn-outline" onClick={onBack} style={{ borderColor: '#ff4757', color: '#ff4757', padding: '10px 20px', margin: 0 }}>
            Voltar
          </button>
        </div>
      </div>
      
      {/* ÁREA DE TRABALHO */}
      <div className="workspace-area">
        <div ref={blocklyDiv} id="blocklyDiv" />
        {role === 'teacher' && (
          <div className="code-panel">
            <h3>Código (C++)</h3>
            <pre>{generatedCode}</pre>
          </div>
        )}
      </div>

      {/* MODAL BONITO DE SUCESSO AO SALVAR */}
      {saveStatus === 'success' && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '24px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: '4.5rem', marginBottom: '10px' }}>✅</div>
            <h2 style={{ color: '#2c3e50', marginBottom: '15px' }}>Projeto Salvo!</h2>
            <p style={{ color: '#7f8c8d', marginBottom: '25px', fontSize: '1.1rem' }}>As suas peças e progressos foram guardados na nuvem com sucesso.</p>
            <button className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1.1rem' }} onClick={() => setSaveStatus(null)}>
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* MODAL BONITO DE ERRO */}
      {saveStatus === 'error' && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '24px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: '4.5rem', marginBottom: '10px' }}>❌</div>
            <h2 style={{ color: '#2c3e50', marginBottom: '15px' }}>Ocorreu um Erro</h2>
            <p style={{ color: '#7f8c8d', marginBottom: '25px', fontSize: '1rem' }}>{errorMessage}</p>
            <button className="btn-outline" style={{ width: '100%', padding: '14px', borderColor: '#ff4757', color: '#ff4757' }} onClick={() => setSaveStatus(null)}>
              Tentar Novamente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}