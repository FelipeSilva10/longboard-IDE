import { useState } from 'react';
import { supabase } from '../lib/supabase'; 
import logoHorizontal from '../assets/LogoHorizontal.png'; 
import { InteractiveBackground } from '../components/InteractiveBackground';

interface LoginScreenProps {
  onLogin: (role: 'student' | 'teacher' | 'visitor') => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [loginType, setLoginType] = useState<'none' | 'student' | 'teacher'>('none');
  
  const [studentUsername, setStudentUsername] = useState('');
  const [studentPass, setStudentPass] = useState('');
  
  const [teacherEmail, setTeacherEmail] = useState(''); 
  const [teacherPass, setTeacherPass] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const DOMINIO_ALUNO = '@aluno.oficinacode.com';

  const handleStudentLogin = async () => {
    if (studentUsername.trim() === '' || studentPass.trim() === '') return;
    
    setErrorMsg('');
    setLoading(true);

    const emailFormatado = `${studentUsername.trim().toLowerCase()}${DOMINIO_ALUNO}`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailFormatado,
      password: studentPass,
    });

    setLoading(false);

    if (error) {
      setErrorMsg('Usuário não existe ou senha incorreta! Fale com seu professor.');
      return;
    }
    if (data.user) onLogin('student');
  };

  const handleTeacherLogin = async () => {
    if (!teacherEmail || !teacherPass) return;
    setErrorMsg('');
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: teacherEmail, password: teacherPass });
    setLoading(false);
    
    if (error) { setErrorMsg('Email ou senha incorretos!'); return; }
    if (data.user) onLogin('teacher');
  };

  return (
    // Agrupamos tudo num Fragment vazio <> para o React permitir o fundo e o cartão juntos
    <>
      {/* O FUNDO INTERATIVO ENTRA AQUI! */}
      <InteractiveBackground />

      <div className="login-container">
        <div className="login-card" style={{ textAlign: 'center' }}>
          
          {/* IDENTIDADE VISUAL */}
          <img src={logoHorizontal} alt="Oficina Code" style={{ width: '85%', maxWidth: '500px', marginBottom: '10px', display: 'block', margin: '0 auto 15px' }} />
          
          {loginType === 'none' && (
            <div className="login-options">
              <button className="btn-primary" onClick={() => setLoginType('student')}>👨‍🎓 Sou Aluno</button>
              <button className="btn-secondary" onClick={() => setLoginType('teacher')}>👨‍🏫 Sou Professor</button>
              <button className="btn-outline" onClick={() => onLogin('visitor')} style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>👀 Entrar como Visitante</button>
            </div>
          )}

          {loginType === 'student' && (
            <div className="login-form">
              <h3 style={{ color: 'var(--dark)' }}>Acesso do Aluno</h3>
              {errorMsg && <div style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{errorMsg}</div>}
              <input type="text" placeholder="Seu Nome" value={studentUsername} onChange={(e) => setStudentUsername(e.target.value)} />
              <input type="password" placeholder="Sua Senha" value={studentPass} onChange={(e) => setStudentPass(e.target.value)} />
              <button className="btn-primary" onClick={handleStudentLogin} disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
              <button className="btn-text" onClick={() => setLoginType('none')}>Voltar</button>
            </div>
          )}

          {loginType === 'teacher' && (
            <div className="login-form">
              <h3 style={{ color: 'var(--dark)' }}>Acesso do Professor</h3>
              {errorMsg && <div style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{errorMsg}</div>}
              <input type="email" placeholder="Seu Email" value={teacherEmail} onChange={(e) => setTeacherEmail(e.target.value)} />
              <input type="password" placeholder="Sua Senha" value={teacherPass} onChange={(e) => setTeacherPass(e.target.value)} />
              <button className="btn-secondary" onClick={handleTeacherLogin} disabled={loading}>{loading ? 'Validando...' : 'Acessar Painel'}</button>
              <button className="btn-text" onClick={() => setLoginType('none')}>Voltar</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}