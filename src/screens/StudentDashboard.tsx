import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Project {
  id: string;
  name: string;
  updated_at: string;
}

interface StudentDashboardProps {
  onLogout: () => void;
  onOpenIde: (projectId?: string) => void;
}

export function StudentDashboard({ onLogout, onOpenIde }: StudentDashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState('');

  useEffect(() => {
    const fetchStudentData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Pega o nome do aluno para dar boas-vindas
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        if (profile) setStudentName(profile.full_name);

        // Puxa os projetos do banco de dados
        const { data: projData } = await supabase.from('projects').select('id, name, updated_at').eq('student_id', user.id).order('updated_at', { ascending: false });
        if (projData) setProjects(projData);
      }
      setLoading(false);
    };

    fetchStudentData();
  }, []);

  const handleCreateProject = async () => {
    const nome = prompt("Qual o nome do seu novo projeto?");
    if (!nome) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase.from('projects').insert([{ student_id: user.id, name: nome }]).select().single();
      if (!error && data) onOpenIde(data.id);
    }
  };

  return (
    <div className="app-container" style={{ backgroundColor: '#f4f7f6', overflowY: 'auto' }}>
      <div className="topbar">
        <h2>👨‍🎓 Mesa de Trabalho: {studentName}</h2>
        <button className="btn-logout" onClick={onLogout}>Sair</button>
      </div>

      <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#2c3e50' }}>Meus Projetos</h1>
          <button className="btn-primary" onClick={handleCreateProject}>➕ Novo Projeto</button>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#7f8c8d' }}>Carregando...</p>
        ) : projects.length === 0 ? (
            <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
              <p style={{ color: '#7f8c8d', fontSize: '1.2rem' }}>Você ainda não tem projetos. Clique em Novo Projeto para começar!</p>
            </div>
        ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {projects.map((proj) => (
              <div key={proj.id} style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderTop: '5px solid #4cd137' }}>
                <h3 style={{ color: '#2c3e50', marginBottom: '10px', fontSize: '1.4rem' }}>{proj.name}</h3>
                <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '15px' }}>Salvo em: {new Date(proj.updated_at).toLocaleDateString()}</p>
                <button className="btn-secondary" style={{ width: '100%' }} onClick={() => onOpenIde(proj.id)}>Abrir Código</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}