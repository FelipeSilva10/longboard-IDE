import { useState } from 'react';
import { supabase } from 'src/lib/supabase.ts'; // Importe a nossa conexão

interface LoginScreenProps {
  onLogin: (role: 'student' | 'teacher' | 'visitor') => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [loginType, setLoginType] = useState<'none' | 'student' | 'teacher'>('none');
  const [studentCode, setStudentCode] = useState('');
  
  // Modificado: Usaremos email em vez de apenas 'user' porque o Supabase Auth exige email por padrão
  const [teacherEmail, setTeacherEmail] = useState(''); 
  const [teacherPass, setTeacherPass] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleStudentLogin = () => {
    if (studentCode.trim() !== '') onLogin('student');
  };

  const handleTeacherLogin = async () => {
    setErrorMsg('');
    setLoading(true);

    // Chama o serviço de autenticação real do Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: teacherEmail,
      password: teacherPass,
    });

    setLoading(false);

    if (error) {
      setErrorMsg('Email ou senha incorretos!');
      return;
    }

    if (data.user) {
      onLogin('teacher');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Longboard IDE</h1>
        <p>Bem-vindo! Selecione como deseja entrar:</p>

        {loginType === 'none' && (
          <div className="login-options">
            <button className="btn-primary" onClick={() => setLoginType('student')}>👨‍🎓 Sou Aluno</button>
            <button className="btn-secondary" onClick={() => setLoginType('teacher')}>👨‍🏫 Sou Professor</button>
            <button className="btn-outline" onClick={() => onLogin('visitor')}>👀 Entrar como Visitante</button>
          </div>
        )}

        {loginType === 'student' && (
          <div className="login-form">
            <h3>Aluno</h3>
            <input 
              type="text" placeholder="Código da Turma..." 
              value={studentCode} onChange={(e) => setStudentCode(e.target.value)}
            />
            <button className="btn-primary" onClick={handleStudentLogin}>Entrar na Turma</button>
            <button className="btn-text" onClick={() => setLoginType('none')}>Voltar</button>
          </div>
        )}

        {loginType === 'teacher' && (
          <div className="login-form">
            <h3>Professor</h3>
            {errorMsg && <div style={{ color: '#ff4757', fontWeight: 'bold' }}>{errorMsg}</div>}
            <input 
              type="email" placeholder="Seu Email..." 
              value={teacherEmail} onChange={(e) => setTeacherEmail(e.target.value)}
            />
            <input 
              type="password" placeholder="Sua Senha..." 
              value={teacherPass} onChange={(e) => setTeacherPass(e.target.value)}
            />
            <button className="btn-secondary" onClick={handleTeacherLogin} disabled={loading}>
              {loading ? 'Validando...' : 'Acessar Painel'}
            </button>
            <button className="btn-text" onClick={() => setLoginType('none')}>Voltar</button>
          </div>
        )}
      </div>
    </div>
  );
}