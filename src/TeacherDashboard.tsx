import { useState, useEffect } from 'react';
import { supabase } from 'src/lib/superbase.ts';

interface Classroom {
  id: string;
  name: string;
  join_code: string;
}

interface TeacherDashboardProps {
  onLogout: () => void;
  onOpenIde: () => void;
}

export function TeacherDashboard({ onLogout, onOpenIde }: TeacherDashboardProps) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  // Função que vai à base de dados procurar as turmas deste professor
  const fetchClassrooms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('classrooms')
      .select('id, name, join_code')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setClassrooms(data);
    }
    setLoading(false);
  };

  // Carrega as turmas assim que o ecrã abre
  useEffect(() => {
    fetchClassrooms();
  }, []);

  // Função mágica para gerar código e criar a turma no banco
  const handleCreateClass = async () => {
    if (newClassName.trim() === '') return;
    
    // Gera um código alfanumérico de 6 caracteres (Maiúsculo)
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Pega o ID do professor logado neste momento
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase.from('classrooms').insert([
        { 
          teacher_id: user.id, 
          name: newClassName, 
          join_code: joinCode 
        }
      ]);

      if (!error) {
        setNewClassName('');
        setIsCreating(false);
        fetchClassrooms(); // Recarrega a lista para mostrar a nova turma
      } else {
        alert("Erro ao criar turma: " + error.message);
      }
    }
  };

  return (
    <div className="app-container" style={{ backgroundColor: '#f4f7f6', overflowY: 'auto' }}>
      <div className="topbar">
        <h2>Painel do Professor</h2>
        <button className="btn-secondary" onClick={onOpenIde} style={{ marginLeft: 'auto', marginRight: '10px' }}>
          Abrir IDE (Modo Teste)
        </button>
        <button className="btn-logout" onClick={onLogout}>Sair</button>
      </div>

      <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#2c3e50' }}>As Minhas Turmas</h1>
          
          {!isCreating && (
            <button className="btn-primary" onClick={() => setIsCreating(true)}>
              ➕ Nova Turma
            </button>
          )}
        </div>

        {/* Formulário de Criação de Turma (Aparece ao clicar em Nova Turma) */}
        {isCreating && (
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', marginBottom: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              placeholder="Nome da Turma (Ex: Robótica 8º Ano)" 
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '2px solid #e0e6ed', fontSize: '1rem' }}
            />
            <button className="btn-primary" onClick={handleCreateClass}>Guardar</button>
            <button className="btn-outline" onClick={() => setIsCreating(false)}>Cancelar</button>
          </div>
        )}
        
        {loading ? (
          <p style={{ textAlign: 'center', color: '#7f8c8d' }}>A carregar turmas...</p>
        ) : classrooms.length === 0 ? (
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            <p style={{ color: '#7f8c8d', fontSize: '1.2rem' }}>Ainda não tem turmas criadas.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {classrooms.map((cls) => (
              <div key={cls.id} style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderTop: '5px solid #00a8ff' }}>
                <h3 style={{ color: '#2c3e50', marginBottom: '15px', fontSize: '1.4rem' }}>{cls.name}</h3>
                <div style={{ backgroundColor: '#f8fafd', padding: '15px', borderRadius: '10px', border: '2px dashed #00a8ff', textAlign: 'center' }}>
                  <p style={{ color: '#7f8c8d', fontSize: '0.9rem', marginBottom: '5px', fontWeight: 'bold' }}>CÓDIGO DE ACESSO DO ALUNO:</p>
                  <p style={{ color: '#00a8ff', fontSize: '1.8rem', fontWeight: '900', letterSpacing: '2px' }}>{cls.join_code}</p>
                </div>
                <button className="btn-outline" style={{ width: '100%', marginTop: '15px' }}>Ver Projetos dos Alunos</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}