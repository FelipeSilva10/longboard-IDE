import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Project { id: string; name: string; updated_at: string; }
interface StudentDashboardProps { onLogout: () => void; onOpenIde: (projectId?: string) => void; }

export function StudentDashboard({ onLogout, onOpenIde }: StudentDashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  
  // Estado para controlar o Modal de Exclusão
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  useEffect(() => {
    const fetchStudentData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        if (profile) setStudentName(profile.full_name);

        const { data: projData } = await supabase.from('projects').select('id, name, updated_at').eq('student_id', user.id).order('updated_at', { ascending: false });
        if (projData) setProjects(projData);
      }
      setLoading(false);
    };
    fetchStudentData();
  }, []);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase.from('projects').insert([{ student_id: user.id, name: newProjectName }]).select().single();
      if (!error && data) { setShowModal(false); onOpenIde(data.id); }
    }
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    await supabase.from('projects').delete().eq('id', projectToDelete.id);
    setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
    setProjectToDelete(null); // Fecha o modal
  };

  return (
    <div className="app-container" style={{ backgroundColor: '#f4f7f6', overflowY: 'auto', position: 'relative' }}>
      {/* Topo Alinhado */}
      <div className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>👨‍🎓 Mesa de Trabalho: {studentName}</h2>
        <button className="btn-outline" onClick={onLogout} style={{ borderColor: '#ff4757', color: '#ff4757', padding: '10px 20px', margin: 0 }}>Sair</button>
      </div>

      <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#2c3e50', margin: 0 }}>Meus Projetos</h1>
          <button className="btn-primary" onClick={() => setShowModal(true)}>➕ Novo Projeto</button>
        </div>

        {loading ? ( <p style={{ textAlign: 'center', color: '#7f8c8d' }}>Carregando...</p> ) 
        : projects.length === 0 ? (
            <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
              <p style={{ color: '#7f8c8d', fontSize: '1.2rem' }}>Você ainda não tem projetos. Clique em Novo Projeto para começar!</p>
            </div>
        ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {projects.map((proj) => (
              <div key={proj.id} style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderTop: '5px solid #4cd137', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ color: '#2c3e50', marginBottom: '10px', fontSize: '1.4rem' }}>{proj.name}</h3>
                <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '20px' }}>Salvo em: {new Date(proj.updated_at).toLocaleDateString()}</p>
                
                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                  <button className="btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => onOpenIde(proj.id)}>Abrir Código</button>
                  <button className="btn-outline" style={{ padding: '10px 15px', borderColor: '#ff4757', color: '#ff4757' }} onClick={() => setProjectToDelete(proj)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: CRIAR PROJETO */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h2 style={{ color: '#2c3e50', marginBottom: '10px' }}>Novo Projeto</h2>
            <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>Dê um nome bem legal para a sua invenção:</p>
            <input type="text" placeholder="Ex: Robô Dançarino" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '2px solid #e0e6ed', fontSize: '1.1rem', marginBottom: '20px', backgroundColor: '#f8fafd' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-outline" style={{ flex: 1 }} onClick={() => { setShowModal(false); setNewProjectName(''); }}>Cancelar</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleCreateProject}>Criar!</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXCLUIR PROJETO */}
      {projectToDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200 }}>
          <div style={{ backgroundColor: 'white', padding: '35px', borderRadius: '24px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '10px' }}>🗑️</div>
            <h2 style={{ color: '#2c3e50', marginBottom: '10px' }}>Atenção!</h2>
            <p style={{ color: '#7f8c8d', marginBottom: '25px', fontSize: '1.1rem' }}>Tem certeza que deseja apagar o projeto <b>{projectToDelete.name}</b>? Isso não pode ser desfeito!</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-outline" style={{ flex: 1, padding: '12px' }} onClick={() => setProjectToDelete(null)}>Cancelar</button>
              <button className="btn-primary" style={{ flex: 1, padding: '12px', backgroundColor: '#ff4757', boxShadow: '0 6px 0px #ff1e34' }} onClick={confirmDeleteProject}>Sim, Apagar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}