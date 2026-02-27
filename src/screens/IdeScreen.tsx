import { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import * as PtBr from 'blockly/msg/pt-br';

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

// --- MUDANÇA AQUI: Trocamos onLogout por onBack ---
interface IdeScreenProps {
  role: 'student' | 'teacher' | 'visitor';
  onBack: () => void; 
}

export function IdeScreen({ role, onBack }: IdeScreenProps) {
  const blocklyDiv = useRef<HTMLDivElement>(null);
  const workspace = useRef<Blockly.WorkspaceSvg | null>(null);
  
  const [board, setBoard] = useState<'nano' | 'esp32'>('nano');
  const [generatedCode, setGeneratedCode] = useState<string>('// O código C++ aparecerá aqui...');

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
    }
  }, []);

  useEffect(() => { if (workspace.current) { Blockly.svgResize(workspace.current); } }, [role]);

  return (
    <div className="app-container">
      <div className="topbar">
        <h2>Longboard IDE ({role})</h2>
        <select value={board} onChange={(e) => setBoard(e.target.value as 'nano' | 'esp32')}>
          <option value="nano">🖥️ Arduino Nano</option>
          <option value="esp32">📡 ESP32 DevKit</option>
        </select>
        {/* --- MUDANÇA AQUI: Botão inteligente de voltar --- */}
        <button className="btn-logout" onClick={onBack}>
          {role === 'visitor' ? 'Sair' : 'Voltar ao Painel'}
        </button>
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