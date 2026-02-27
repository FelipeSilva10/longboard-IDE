import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

interface Classroom { id: string; name: string; }
interface Student { id: string; name: string; }
interface Project { id: string; name: string; }

interface TeacherDashboardProps { onLogout: () => void; onOpenIde: () => void; }

export function TeacherDashboard({ onLogout, onOpenIde }: TeacherDashboardProps) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  
  const [managingClass, setManagingClass] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentPass, setNewStudentPass] = useState('');
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);

  // Estados para ver os projetos do aluno
  const [viewingStudentProjects, setViewingStudentProjects] = useState<string | null>(null);
  const [studentProjects, setStudentProjects] = useState<Project[]>([]);

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
      if (!error) { setNewClassName(''); setIsCreatingClass(false); fetchClassrooms(); }
    }
  };

  // --- NOVA FUNÇÃO: DELETAR TURMA ---
  const handleDeleteClass = async (classId: string) => {
    if (window.confirm("🚨 ATENÇÃO: Isto vai apagar a turma inteira e todos os alunos nela! Continuar?")) {
      await supabase.from('classrooms').delete().eq('id', classId);
      setClassrooms(prev => prev.filter(c => c.id !== classId));
    }
  };

  const openClassManager = async (cls: Classroom) => {
    setManagingClass(cls);
    setStudents([]);
    setIsCreatingStudent(false);
    setViewingStudentProjects(null);
    
    const { data, error } = await supabase.from('classroom_students').select('student_id, profiles(full_name)').eq('classroom_id', cls.id);
    if (data && !error) {
      const formattedStudents = data.map((d: any) => ({ id: d.student_id, name: d.profiles?.full_name || 'Desconhecido' }));
      setStudents(formattedStudents);
    }
  };

  const handleCreateStudentAccount = async () => {
    if (!newStudentName || !newStudentPass || !managingClass) return;
    const { supabaseHelper } = await import('./lib/supabase');
    const emailFormatado = `${newStudentName.trim().toLowerCase()}@aluno.longboard.com`;
    const { data: authData, error: authError } = await supabaseHelper.auth.signUp({ email: emailFormatado, password: newStudentPass });
    
    if (authError) { alert("Erro: " + authError.message); return; }

    if (authData.user) {
      await supabase.from('profiles').insert([{ id: authData.user.id, role: 'student', full_name: newStudentName }]);
      await supabase.from('classroom_students').insert([{ classroom_id: managingClass.id, student_id: authData.user.id }]);
      setStudents(prev => [...prev, { id: authData.user!.id, name: newStudentName }]);
      setNewStudentName(''); setNewStudentPass(''); setIsCreatingStudent(false);
    }
  };

  // --- NOVA FUNÇÃO: DELETAR ALUNO ---
  const handleDeleteStudent = async (studentId: string) => {
    if (window.confirm("Apagar este aluno? Todos os projetos dele serão destruídos.")) {
      await supabase.from('profiles').delete().eq('id', studentId);
      setStudents(prev => prev.filter(s => s.id !== studentId));
    }
  };

  // --- NOVAS FUNÇÕES: VER E DELETAR PROJETOS DO ALUNO ---
  const handleToggleStudentProjects = async (studentId: string) => {
    if (viewingStudentProjects === studentId) {
      setViewingStudentProjects(null); 
      return;
    }
    setViewingStudentProjects(studentId);
    setStudentProjects([]); 
    const { data } = await supabase.from('projects').select('id, name').eq('student_id', studentId);
    if (data) setStudentProjects(data);
  };

  const handleDeleteStudentProject = async (projectId: string) => {
    if (window.confirm("Apagar o projeto deste aluno?")) {
      await supabase.from('projects').delete().eq('id', projectId);
      setStudentProjects(prev => prev.filter(p => p.id !== projectId));
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
          {!isCreatingClass && <button className="btn-primary" onClick={() => setIsCreatingClass(true)}>➕ Nova Turma</button>}
        </div>

        {isCreatingClass && (
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', marginBottom: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', gap: '10px' }}>
            <input type="text" placeholder="Nome da Turma" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '2px solid #e0e6ed' }} />
            <button className="btn-primary" onClick={handleCreateClass}>Guardar</button>
            <button className="btn-outline" onClick={() => setIsCreatingClass(false)}>Cancelar</button>
          </div>
        )}
        
        {loading ? <p>Carregando...</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {classrooms.map((cls) => (
              <div key={cls.id} style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderTop: '5px solid #00a8ff', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ color: '#2c3e50', marginBottom: '20px', fontSize: '1.4rem', textAlign: 'center' }}>{cls.name}</h3>
                
                {/* BOTÕES DE TURMA */}
                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={() => openClassManager(cls)}>⚙️ Gerenciar</button>
                  <button className="btn-outline" style={{ padding: '10px 15px', borderColor: '#ff4757', color: '#ff4757' }} onClick={() => handleDeleteClass(cls.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {managingClass && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '24px', width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e0e6ed', paddingBottom: '20px', marginBottom: '20px' }}>
              <h2 style={{ color: '#2c3e50', margin: 0 }}>{managingClass.name}</h2>
              <button className="btn-outline" style={{ padding: '8px 15px' }} onClick={() => setManagingClass(null)}>Fechar</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ color: '#7f8c8d' }}>Alunos ({students.length})</h3>
              {!isCreatingStudent && <button className="btn-primary" style={{ padding: '8px 15px' }} onClick={() => setIsCreatingStudent(true)}>➕ Novo Aluno</button>}
            </div>

            {isCreatingStudent && (
              <div style={{ backgroundColor: '#f8fafd', padding: '20px', borderRadius: '16px', marginBottom: '20px', border: '2px dashed #00a8ff' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                  <input type="text" placeholder="Nome de Usuário" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ced6e0' }} />
                  <input type="text" placeholder="Senha do Aluno" value={newStudentPass} onChange={(e) => setNewStudentPass(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ced6e0' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-primary" onClick={handleCreateStudentAccount}>Salvar</button>
                  <button className="btn-outline" onClick={() => setIsCreatingStudent(false)}>Cancelar</button>
                </div>
              </div>
            )}

            {students.length === 0 ? <p style={{ textAlign: 'center', color: '#aaa' }}>Nenhum aluno nesta turma.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {students.map((student) => (
                  <div key={student.id} style={{ backgroundColor: '#f1f2f6', padding: '15px', borderRadius: '12px' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 'bold', color: '#2f3542', fontSize: '1.1rem' }}>👤 {student.name}</div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.9rem' }} onClick={() => handleToggleStudentProjects(student.id)}>
                          Projetos {viewingStudentProjects === student.id ? '▲' : '▼'}
                        </button>
                        <button className="btn-outline" style={{ padding: '5px 10px', fontSize: '0.9rem', borderColor: '#ff4757', color: '#ff4757' }} onClick={() => handleDeleteStudent(student.id)}>Excluir</button>
                      </div>
                    </div>

                    {/* Projetos do aluno na lista */}
                    {viewingStudentProjects === student.id && (
                      <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #dfe4ea' }}>
                        <h4 style={{ color: '#7f8c8d', marginBottom: '10px', fontSize: '0.9rem' }}>Projetos:</h4>
                        {studentProjects.length === 0 ? <p style={{ color: '#aaa', fontSize: '0.9rem' }}>Nenhum projeto salvo.</p> : (
                          studentProjects.map(proj => (
                            <div key={proj.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '10px', borderRadius: '8px', marginBottom: '5px' }}>
                              <span style={{ color: '#2c3e50', fontSize: '0.95rem' }}>📄 {proj.name}</span>
                              <div style={{ display: 'flex', gap: '5px' }}>
                                {/* Abrir código do aluno virá depois */}
                                <button className="btn-outline" style={{ padding: '4px 8px', fontSize: '0.8rem', color: '#4cd137', borderColor: '#4cd137' }} onClick={() => alert('Em breve: abrir IDE com este projeto')}>Ver</button>
                                <button className="btn-outline" style={{ padding: '4px 8px', fontSize: '0.8rem', color: '#ff4757', borderColor: '#ff4757' }} onClick={() => handleDeleteStudentProject(proj.id)}>🗑️</button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}