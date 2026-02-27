import { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import * as PtBr from 'blockly/msg/pt-br';
import { supabase } from '../lib/supabase'; // Importámos o Supabase!

Blockly.setLocale(PtBr as any);
const cppGenerator = new Blockly.Generator('CPP');

const BOARDS = {
  nano: { name: 'Arduino Nano', pins: [['Pino 13', '13'], ['Pino 12', '12']] },
  esp32: { name: 'ESP32 DevKit V1', pins: [['Pino 2', '2'], ['Pino 4', '4']] }
};
let currentBoardPins = BOARDS.nano.pins;

const customBlocks = [
  {
    "type": "configurar_pino",
    "message0": "⚙️ Configurar %1 como %2",
    "args0": [
      { "type": "field_dropdown", "name": "PIN", "options": () => currentBoardPins },
      { "type": "field_dropdown", "name": "MODE", "options": [["Saída", "OUTPUT"], ["Entrada", "INPUT"]] }
    ],
    "previousStatement": null, "nextStatement": null, "colour": 230
  }
];
Blockly.defineBlocksWithJsonArray(customBlocks);

cppGenerator.forBlock['configurar_pino'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const mode = block.getFieldValue('MODE');
  return `pinMode(${pin}, ${mode});\n`;
};

// Adicionámos o projectId aqui!
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
  
  // Novos estados para o sistema de guardar
  const [isSaving, setIsSaving] = useState(false);
  const [projectName, setProjectName] = useState('Projeto');

  useEffect(() => { currentBoardPins = BOARDS[board].pins; }, [board]);

  useEffect(() => {
    if (blocklyDiv.current && !workspace.current) {
      workspace.current = Blockly.inject(blocklyDiv.current, {
        toolbox: { kind: 'flyoutToolbox', contents: [{ kind: 'block', type: 'configurar_pino' }] },
        grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
      });

      workspace.current.addChangeListener((event) => {
        if (event.isUiEvent) return; 
        try {
          const code = cppGenerator.workspaceToCode(workspace.current!);
          setGeneratedCode(code || '// Arraste blocos...');
        } catch (e) { console.error(e); }
      });

      // --- MÁGICA 1: CARREGAR PROJETO SE EXISTIR ---
      if (projectId) {
        const loadProject = async () => {
          const { data, error } = await supabase.from('projects').select('*').eq('id', projectId).single();
          
          if (data && !error) {
            setProjectName(data.name);
            if (data.target_board) setBoard(data.target_board as 'nano' | 'esp32');
            
            // Se já tiver peças guardadas no banco, injeta elas na tela
            if (data.workspace_data && Object.keys(data.workspace_data).length > 0) {
              Blockly.serialization.workspaces.load(data.workspace_data, workspace.current!);
            }
          }
        };
        loadProject();
      }
    }
  }, [projectId]);

  useEffect(() => { if (workspace.current) { Blockly.svgResize(workspace.current); } }, [role]);

  // --- MÁGICA 2: GRAVAR PROJETO ---
  const handleSaveProject = async () => {
    if (!projectId || !workspace.current) return;
    setIsSaving(true);

    // O Blockly transforma todas as peças da tela num objeto JSON
    const workspaceData = Blockly.serialization.workspaces.save(workspace.current);

    const { error } = await supabase
      .from('projects')
      .update({ 
        workspace_data: workspaceData, 
        target_board: board,
        updated_at: new Date().toISOString() // Atualiza a hora para subir no painel
      })
      .eq('id', projectId);

    setIsSaving(false);

    if (!error) {
      alert("✅ Peças salvas com sucesso!");
    } else {
      alert("❌ Erro ao salvar: " + error.message);
    }
  };

  return (
    <div className="app-container">
      <div className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          
          {/* Mostra o nome real do projeto se for aluno */}
          <h2 style={{ margin: 0 }}>
            {role === 'student' && projectId ? `Mesa: ${projectName}` : 'Longboard IDE'}
            <span style={{ fontSize: '1rem', color: '#7f8c8d', marginLeft: '10px' }}>({role})</span>
          </h2>

          <select value={board} onChange={(e) => setBoard(e.target.value as 'nano' | 'esp32')} style={{ margin: 0 }}>
            <option value="nano">🖥️ Arduino Nano</option>
            <option value="esp32">📡 ESP32 DevKit</option>
          </select>
        </div>
        
        {/* Nova área de botões à direita */}
        <div style={{ display: 'flex', gap: '10px' }}>
          
          {/* O botão "Salvar" só aparece se a pessoa for Aluno e tiver aberto um projeto */}
          {role === 'student' && projectId && (
            <button className="btn-primary" onClick={handleSaveProject} disabled={isSaving} style={{ padding: '10px 20px', margin: 0 }}>
              {isSaving ? '⏳ A gravar...' : '💾 Salvar Projeto'}
            </button>
          )}

          <button className="btn-outline" onClick={onBack} style={{ borderColor: '#ff4757', color: '#ff4757', padding: '10px 20px', margin: 0 }}>
            {role === 'visitor' ? 'Sair da IDE' : 'Voltar ao Painel'}
          </button>
        </div>
      </div>
      
      <div className="workspace-area">
        <div ref={blocklyDiv} id="blocklyDiv" />
        {role === 'teacher' && (
          <div className="code-panel">
            <h3>Código (C++)</h3>
            <pre>{generatedCode}</pre>
          </div>
        )}
      </div>
    </div>
  );
}