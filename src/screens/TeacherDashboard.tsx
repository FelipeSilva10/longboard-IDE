import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Classroom { id: string; name: string; }
interface Student { id: string; name: string; }
interface Project { id: string; name: string; }

// Adicionamos a opção de passar o projectId
interface TeacherDashboardProps { onLogout: () => void; onOpenIde: (projectId?: string) => void; }

type DeleteAction = { type: 'class' | 'student' | 'project'; id: string; name: string } | null;

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

  const [viewingStudentProjects, setViewingStudentProjects] = useState<string | null>(null);
  const [studentProjects, setStudentProjects] = useState<Project[]>([]);

  const [itemToDelete, setItemToDelete] = useState<DeleteAction>(null);

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
    const { supabaseHelper } = await import('../lib/supabase');
    const emailFormatado = `${newStudentName.trim().toLowerCase()}@aluno.oficinacode.com`;
    const { data: authData, error: authError } = await supabaseHelper.auth.signUp({ email: emailFormatado, password: newStudentPass });
    
    if (authError) { alert("Erro: " + authError.message); return; }

    if (authData.user) {
      await supabase.from('profiles').insert([{ id: authData.user.id, role: 'student', full_name: newStudentName }]);
      await supabase.from('classroom_students').insert([{ classroom_id: managingClass.id, student_id: authData.user.id }]);
      setStudents(prev => [...prev, { id: authData.user!.id, name: newStudentName }]);
      setNewStudentName(''); setNewStudentPass(''); setIsCreatingStudent(false);
    }
  };

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

const confirmDeletion = async () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === 'class') {
      await supabase.from('classrooms').delete().eq('id', itemToDelete.id);
      setClassrooms(prev => prev.filter(c => c.id !== itemToDelete.id));
      if (managingClass?.id === itemToDelete.id) setManagingClass(null);
    } 
    else if (itemToDelete.type === 'student') {
      // --- MÁGICA AQUI: Em vez de tentar apagar o perfil, chamamos o super-poder do Supabase ---
    const { error } = await supabase.rpc('delete_student_user', { p_student_id: itemToDelete.id });
      
      if (!error) {
        setStudents(prev => prev.filter(s => s.id !== itemToDelete.id));
      } else {
        alert("Erro ao excluir aluno: " + error.message);
      }
    } 
    else if (itemToDelete.type === 'project') {
      await supabase.from('projects').delete().eq('id', itemToDelete.id);
      setStudentProjects(prev => prev.filter(p => p.id !== itemToDelete.id));
    }

    setItemToDelete(null); 
  };

  return (
    <div className="app-container" style={{ backgroundColor: '#f4f7f6', overflowY: 'auto' }}>
      <div className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Painel do Professor</h2>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button className="btn-secondary" style={{ padding: '10px 20px', margin: 0 }} onClick={() => onOpenIde()}>Abrir IDE (Teste)</button>
          <button className="btn-outline" style={{ borderColor: '#ff4757', color: '#ff4757', padding: '10px 20px', margin: 0 }} onClick={onLogout}>Sair</button>
        </div>
      </div>

      <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#2c3e50', margin: 0 }}>As Minhas Turmas</h1>
          {!isCreatingClass && <button className="btn-primary" onClick={() => setIsCreatingClass(true)}>➕ Nova Turma</button>}
        </div>

        {isCreatingClass && (
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', marginBottom: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', gap: '10px' }}>
            <input type="text" placeholder="Nome da Turma" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '2px solid #e0e6ed' }} />
            <button className="btn-outline" onClick={() => setIsCreatingClass(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleCreateClass}>Guardar</button>
          </div>
        )}
        
        {loading ? <p>Carregando...</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {classrooms.map((cls) => (
              <div key={cls.id} style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderTop: '5px solid #00a8ff', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ color: '#2c3e50', marginBottom: '20px', fontSize: '1.4rem', textAlign: 'center' }}>{cls.name}</h3>
                
                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={() => openClassManager(cls)}>⚙️ Gerenciar</button>
                  <button className="btn-outline" style={{ padding: '10px 15px', borderColor: '#ff4757', color: '#ff4757' }} onClick={() => setItemToDelete({ type: 'class', id: cls.id, name: cls.name })}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {managingClass && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '24px', width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e0e6ed', paddingBottom: '20px', marginBottom: '20px' }}>
              <h2 style={{ color: '#2c3e50', margin: 0 }}>{managingClass.name}</h2>
              <button className="btn-outline" style={{ padding: '8px 15px' }} onClick={() => setManagingClass(null)}>✕ Fechar</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ color: '#7f8c8d', margin: 0 }}>Alunos ({students.length})</h3>
              {!isCreatingStudent && <button className="btn-primary" style={{ padding: '8px 15px' }} onClick={() => setIsCreatingStudent(true)}>➕ Novo Aluno</button>}
            </div>

            {isCreatingStudent && (
              <div style={{ backgroundColor: '#f8fafd', padding: '20px', borderRadius: '16px', marginBottom: '20px', border: '2px dashed #00a8ff' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                  <input type="text" placeholder="Nome do Aluno" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ced6e0' }} />
                  <input type="text" placeholder="Senha do Aluno" value={newStudentPass} onChange={(e) => setNewStudentPass(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ced6e0' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-outline" style={{ flex: 1 }} onClick={() => setIsCreatingStudent(false)}>Cancelar</button>
                  <button className="btn-primary" style={{ flex: 1 }} onClick={handleCreateStudentAccount}>Salvar</button>
                </div>
              </div>
            )}

            {students.length === 0 ? <p style={{ textAlign: 'center', color: '#aaa', marginTop: '30px' }}>Nenhum aluno nesta turma.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {students.map((student) => (
                  <div key={student.id} style={{ backgroundColor: '#f1f2f6', padding: '15px', borderRadius: '12px' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 'bold', color: '#2f3542', fontSize: '1.1rem' }}>👤 {student.name}</div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.9rem' }} onClick={() => handleToggleStudentProjects(student.id)}>
                          Projetos {viewingStudentProjects === student.id ? '▲' : '▼'}
                        </button>
                        <button className="btn-outline" style={{ padding: '5px 10px', fontSize: '0.9rem', borderColor: '#ff4757', color: '#ff4757' }} onClick={() => setItemToDelete({ type: 'student', id: student.id, name: student.name })}>Excluir</button>
                      </div>
                    </div>

                    {viewingStudentProjects === student.id && (
                      <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #dfe4ea' }}>
                        <h4 style={{ color: '#7f8c8d', marginBottom: '10px', fontSize: '0.9rem' }}>Projetos:</h4>
                        {studentProjects.length === 0 ? <p style={{ color: '#aaa', fontSize: '0.9rem' }}>Nenhum projeto salvo.</p> : (
                          studentProjects.map(proj => (
                            <div key={proj.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '10px', borderRadius: '8px', marginBottom: '5px' }}>
                              <span style={{ color: '#2c3e50', fontSize: '0.95rem' }}>📄 {proj.name}</span>
                              <div style={{ display: 'flex', gap: '5px' }}>
                                {/* --- A MÁGICA ACONTECE AQUI! Ao clicar, ele abre o projeto do aluno --- */}
                                <button className="btn-outline" style={{ padding: '4px 8px', fontSize: '0.8rem', color: '#4cd137', borderColor: '#4cd137' }} onClick={() => onOpenIde(proj.id)}>Ver Código</button>
                                <button className="btn-outline" style={{ padding: '4px 8px', fontSize: '0.8rem', color: '#ff4757', borderColor: '#ff4757' }} onClick={() => setItemToDelete({ type: 'project', id: proj.id, name: proj.name })}>🗑️</button>
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

      {itemToDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: 'white', padding: '35px', borderRadius: '24px', width: '90%', maxWidth: '420px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '10px' }}>⚠️</div>
            <h2 style={{ color: '#2c3e50', marginBottom: '15px' }}>Tem certeza?</h2>
            
            <p style={{ color: '#7f8c8d', marginBottom: '25px', fontSize: '1.1rem', lineHeight: '1.5' }}>
              Você está prestes a excluir {itemToDelete.type === 'class' ? 'a turma' : itemToDelete.type === 'student' ? 'o aluno' : 'o projeto'} <b>{itemToDelete.name}</b>.<br/><br/>
              <span style={{ color: '#ff4757', fontWeight: 'bold' }}>Isto apagará os dados para sempre.</span>
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-outline" style={{ flex: 1, padding: '12px' }} onClick={() => setItemToDelete(null)}>Cancelar</button>
              <button className="btn-primary" style={{ flex: 1, padding: '12px', backgroundColor: '#ff4757', boxShadow: '0 6px 0px #ff1e34' }} onClick={confirmDeletion}>Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}