import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

interface Classroom { id: string; name: string; }

interface TeacherDashboardProps { onLogout: () => void; onOpenIde: () => void; }

export function TeacherDashboard({ onLogout, onOpenIde }: TeacherDashboardProps) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentPass, setNewStudentPass] = useState('');

  const fetchClassrooms = async () => {
    setLoading(true);
    const { data } = await supabase.from('classrooms').select('id, name').order('created_at', { ascending: false });
    if (data) setClassrooms(data);
    setLoading(false);
  };

  useEffect(() => { fetchClassrooms(); }, []);

  const handleCreateClass = async () => {
    if (newClassName.trim() === '') return;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('classrooms').insert([{ teacher_id: user.id, name: newClassName, join_code: 'REMOVIDO' }]);
      if (!error) { setNewClassName(''); setIsCreating(false); fetchClassrooms(); }
    }
  };

  const handleCreateStudentAccount = async (classroomId: string) => {
    if (!newStudentName || !newStudentPass) return;

    const { supabaseHelper } = await import('./lib/supabase');
    // Mudamos para .com para o Supabase não barrar a formatação
    const emailFormatado = `${newStudentName.trim().toLowerCase()}@aluno.longboard.com`;

    const { data: authData, error: authError } = await supabaseHelper.auth.signUp({ email: emailFormatado, password: newStudentPass });

    if (authError) { alert("Erro ao criar aluno: " + authError.message); return; }

    if (authData.user) {
      await supabase.from('profiles').insert([{ id: authData.user.id, role: 'student', full_name: newStudentName }]);
      await supabase.from('classroom_students').insert([{ classroom_id: classroomId, student_id: authData.user.id }]);
      alert(`Aluno ${newStudentName} adicionado à turma!`);
      setNewStudentName(''); setNewStudentPass(''); setSelectedClassId(null);
    }
  };

  return (
    <div className="app-container" style={{ backgroundColor: '#f4f7f6', overflowY: 'auto' }}>
      <div className="topbar">
        <h2>Painel do Professor</h2>
        <button className="btn-secondary" onClick={onOpenIde} style={{ marginLeft: 'auto', marginRight: '10px' }}>Abrir IDE (Teste)</button>
        <button className="btn-logout" onClick={onLogout}>Sair</button>
      </div>

      <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#2c3e50' }}>As Minhas Turmas</h1>
          {!isCreating && <button className="btn-primary" onClick={() => setIsCreating(true)}>➕ Nova Turma</button>}
        </div>

        {isCreating && (
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', marginBottom: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', gap: '10px' }}>
            <input type="text" placeholder="Nome da Turma" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '2px solid #e0e6ed' }} />
            <button className="btn-primary" onClick={handleCreateClass}>Guardar</button>
            <button className="btn-outline" onClick={() => setIsCreating(false)}>Cancelar</button>
          </div>
        )}
        
        {loading ? <p>Carregando...</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {classrooms.map((cls) => (
              <div key={cls.id} style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderTop: '5px solid #00a8ff', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ color: '#2c3e50', marginBottom: '20px', fontSize: '1.4rem', textAlign: 'center' }}>{cls.name}</h3>
                
                {/* Botões mais organizados */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
                  <button className="btn-outline">Ver Projetos dos Alunos</button>
                  {selectedClassId === cls.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#f1f2f6', padding: '15px', borderRadius: '10px' }}>
                      <input type="text" placeholder="Nome do Aluno" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ced6e0' }} />
                      <input type="text" placeholder="Senha do Aluno" value={newStudentPass} onChange={(e) => setNewStudentPass(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ced6e0' }} />
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn-primary" style={{ flex: 1, padding: '8px' }} onClick={() => handleCreateStudentAccount(cls.id)}>Salvar</button>
                        <button className="btn-outline" style={{ padding: '8px' }} onClick={() => setSelectedClassId(null)}>X</button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn-secondary" onClick={() => setSelectedClassId(cls.id)}>Adicionar Aluno</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}