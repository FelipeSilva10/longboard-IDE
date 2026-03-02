import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import logoSimples from '../assets/LogoSimples.png';

interface TeacherDashboardProps {
  onLogout: () => void;
  onOpenIde: (projectId: string) => void;
}

interface Turma { id: string; nome: string; ano_letivo: string; }
interface Aluno { id: string; nome: string; }
interface Projeto { id: string; nome: string; updated_at: string; }

export function TeacherDashboard({ onLogout, onOpenIde }: TeacherDashboardProps) {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [managingTurma, setManagingTurma] = useState<Turma | null>(null);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [viewingAlunoProjects, setViewingAlunoProjects] = useState<{ aluno: Aluno; projetos: Projeto[] } | null>(null);

  const fetchTurmas = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // MIGRADO: tabela `turmas`, filtro por `professor_id`
    const { data } = await supabase
      .from('turmas')
      .select('id, nome, ano_letivo')
      .eq('professor_id', user.id)
      .order('created_at', { ascending: false });

    setLoading(false);
    if (data) setTurmas(data);
  };

  useEffect(() => { fetchTurmas(); }, []);

  const openTurmaManager = async (turma: Turma) => {
    setManagingTurma(turma);
    setAlunos([]);
    setViewingAlunoProjects(null);

    // MIGRADO: tabela `perfis`, JOIN via `turma_id` direto no perfil
    const { data } = await supabase
      .from('perfis')
      .select('id, nome')
      .eq('turma_id', turma.id)
      .eq('role', 'student')
      .order('nome');

    if (data) setAlunos(data);
  };

  const viewAlunoProjects = async (aluno: Aluno) => {
    // MIGRADO: tabela `projetos`, coluna `dono_id`, coluna `nome`
    const { data } = await supabase
      .from('projetos')
      .select('id, nome, updated_at')
      .eq('dono_id', aluno.id)
      .order('updated_at', { ascending: false });

    setViewingAlunoProjects({ aluno, projetos: data || [] });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', padding: '20px' }}>

      {/* TOPBAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', backgroundColor: 'white', padding: '15px 25px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src={logoSimples} alt="Oficina Code" style={{ height: '40px' }} />
          <h1 style={{ color: 'var(--dark)', fontSize: '1.5rem', fontWeight: 900 }}>Painel do Professor</h1>
        </div>
        <button className="btn-outline" onClick={onLogout} style={{ padding: '10px 20px' }}>Sair</button>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      {!managingTurma ? (
        // TELA 1: LISTA DE TURMAS
        <div>
          <h2 style={{ color: 'var(--dark)', marginBottom: '20px', fontSize: '1.3rem' }}>Minhas Turmas</h2>
          {loading
            ? <p style={{ color: '#7f8c8d' }}>Carregando turmas...</p>
            : turmas.length === 0
              ? (
                <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                  <p style={{ color: '#7f8c8d', fontSize: '1.1rem' }}>Nenhuma turma encontrada. O administrador deve cadastrar suas turmas no OficinaAdmin.</p>
                </div>
              )
              : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                  {turmas.map(turma => (
                    <div key={turma.id} onClick={() => openTurmaManager(turma)} style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderTop: '5px solid var(--primary)', cursor: 'pointer', transition: 'transform 0.15s', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <h3 style={{ color: '#2c3e50', fontSize: '1.3rem' }}>{turma.nome}</h3>
                      <p style={{ color: '#aaa', fontSize: '0.9rem' }}>Ano letivo: {turma.ano_letivo}</p>
                      <p style={{ color: 'var(--primary)', fontSize: '0.95rem', fontWeight: 800, marginTop: 'auto' }}>Ver alunos →</p>
                    </div>
                  ))}
                </div>
              )
          }
        </div>

      ) : !viewingAlunoProjects ? (
        // TELA 2: ALUNOS DA TURMA
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
            <button className="btn-text" onClick={() => setManagingTurma(null)}>← Voltar</button>
            <h2 style={{ color: 'var(--dark)', fontSize: '1.3rem' }}>Turma: {managingTurma.nome}</h2>
          </div>

          {alunos.length === 0
            ? <p style={{ color: '#7f8c8d' }}>Nenhum aluno nesta turma ainda.</p>
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                {alunos.map(aluno => (
                  <div key={aluno.id} onClick={() => viewAlunoProjects(aluno)} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '5px solid var(--secondary)' }}>
                    <span style={{ color: '#2c3e50', fontWeight: 800, fontSize: '1.1rem' }}>👤 {aluno.nome}</span>
                    <span style={{ color: '#aaa', fontSize: '0.9rem' }}>Ver projetos →</span>
                  </div>
                ))}
              </div>
            )
          }
        </div>

      ) : (
        // TELA 3: PROJETOS DO ALUNO (SÓ LEITURA)
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
            <button className="btn-text" onClick={() => setViewingAlunoProjects(null)}>← Voltar</button>
            <h2 style={{ color: 'var(--dark)', fontSize: '1.3rem' }}>Projetos de {viewingAlunoProjects.aluno.nome}</h2>
          </div>

          {viewingAlunoProjects.projetos.length === 0
            ? <p style={{ color: '#7f8c8d' }}>Este aluno ainda não criou nenhum projeto.</p>
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {viewingAlunoProjects.projetos.map(proj => (
                  <div key={proj.id} style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderTop: '5px solid var(--secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* MIGRADO: proj.nome */}
                    <h3 style={{ color: '#2c3e50', fontSize: '1.3rem' }}>📄 {proj.nome}</h3>
                    <p style={{ color: '#aaa', fontSize: '0.9rem' }}>Salvo em: {new Date(proj.updated_at).toLocaleDateString()}</p>
                    <button className="btn-secondary" style={{ marginTop: 'auto', padding: '10px' }} onClick={() => onOpenIde(proj.id)}>
                      👀 Ver Código
                    </button>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}
    </div>
  );
}