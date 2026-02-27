import { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import * as PtBr from 'blockly/msg/pt-br';
import { supabase } from '../lib/supabase'; 

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
  
  // Novo Estado para a Tela Bonita de Sucesso/Erro
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => { currentBoardPins = BOARDS[board].pins; }, [board]);

  useEffect(() => {
    if (blocklyDiv.current && !workspace.current) {
      // Injeta o Blockly no ecrã e desativa a edição se o professor estiver a ver
      workspace.current = Blockly.inject(blocklyDiv.current, {
        toolbox: { kind: 'flyoutToolbox', contents: [{ kind: 'block', type: 'configurar_pino' }] },
        grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
        readOnly: role === 'teacher' && projectId !== undefined // Se for prof a ver projeto, não deixa editar
      });

      workspace.current.addChangeListener((event) => {
        if (event.isUiEvent) return; 
        try {
          const code = cppGenerator.workspaceToCode(workspace.current!);
          setGeneratedCode(code || '// Arraste blocos...');
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

    const { error } = await supabase
      .from('projects')
      .update({ 
        workspace_data: workspaceData, 
        target_board: board,
        updated_at: new Date().toISOString() 
      })
      .eq('id', projectId);

    setIsSaving(false);

    if (!error) {
      setSaveStatus('success');
    } else {
      setErrorMessage(error.message);
      setSaveStatus('error');
    }
  };

  return (
    <div className="app-container">
      <div className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          
          <h2 style={{ margin: 0 }}>
            {/* O Título Adapta-se se for o Aluno ou o Professor a espreitar */}
            {role === 'student' && projectId ? `Mesa: ${projectName}` : 
             role === 'teacher' && projectId ? `👀 Inspecionando: ${projectName}` : 
             'Longboard IDE'}
            <span style={{ fontSize: '1rem', color: '#7f8c8d', marginLeft: '10px' }}>({role})</span>
          </h2>

          <select value={board} onChange={(e) => setBoard(e.target.value as 'nano' | 'esp32')} style={{ margin: 0 }} disabled={role === 'teacher' && projectId !== undefined}>
            <option value="nano">🖥️ Arduino Nano</option>
            <option value="esp32">📡 ESP32 DevKit</option>
          </select>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
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