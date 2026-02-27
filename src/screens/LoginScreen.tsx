import { useState } from 'react';
import { supabase } from '../lib/supabase'; // Certifique-se de que o caminho está correto

interface LoginScreenProps {
  onLogin: (role: 'student' | 'teacher' | 'visitor') => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [loginType, setLoginType] = useState<'none' | 'student' | 'teacher'>('none');
  
  // Estados do Aluno
  const [studentUsername, setStudentUsername] = useState('');
  const [studentPass, setStudentPass] = useState('');
  
  // Estados do Professor
  const [teacherEmail, setTeacherEmail] = useState(''); 
  const [teacherPass, setTeacherPass] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // --- O TRUQUE DO E-MAIL FANTASMA ---
  const DOMINIO_ALUNO = '@aluno.longboard.com';

  const handleStudentLogin = async () => {
    if (studentUsername.trim() === '' || studentPass.trim() === '') return;
    
    setErrorMsg('');
    setLoading(true);

    // Usa o truque do e-mail fantasma
    const emailFormatado = `${studentUsername.trim().toLowerCase()}${DOMINIO_ALUNO}`;

    // Apenas TENTA fazer o login. Se a conta não existir, ele vai barrar.
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailFormatado,
      password: studentPass,
    });

    setLoading(false);

    if (error) {
      setErrorMsg('Usuário não existe ou senha incorreta! Fale com seu professor.');
      return;
    }

    if (data.user) {
      onLogin('student');
    }
  };

  const handleTeacherLogin = async () => {
    if (!teacherEmail || !teacherPass) return;
    
    setErrorMsg('');
    setLoading(true);
    
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email: teacherEmail, 
      password: teacherPass 
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
        <h1>Oficina Code</h1>
        <p>Bem-vindo! Selecione como deseja entrar:</p>

        {loginType === 'none' && (
          <div className="login-options">
            <button className="btn-primary" onClick={() => setLoginType('student')}>👨‍🎓 Sou Aluno</button>
            <button className="btn-secondary" onClick={() => setLoginType('teacher')}>👨‍🏫 Sou Professor</button>
            <button className="btn-outline" onClick={() => onLogin('visitor')}>👀 Entrar como Visitante</button>
          </div>
        )}

        {/* Formulário do Aluno */}
        {loginType === 'student' && (
          <div className="login-form">
            <h3>Acesso do Aluno</h3>
            {errorMsg && <div style={{ color: '#ff4757', fontWeight: 'bold' }}>{errorMsg}</div>}
            
            <input 
              type="text" 
              placeholder="Seu Nome de Usuário..." 
              value={studentUsername}
              onChange={(e) => setStudentUsername(e.target.value)}
            />
            <input 
              type="password" 
              placeholder="Sua Senha (PIN)..." 
              value={studentPass}
              onChange={(e) => setStudentPass(e.target.value)}
            />
            
            <button className="btn-primary" onClick={handleStudentLogin} disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
            <button className="btn-text" onClick={() => setLoginType('none')}>Voltar</button>
          </div>
        )}

        {/* Formulário do Professor (COMPLETO DE NOVO) */}
        {loginType === 'teacher' && (
          <div className="login-form">
            <h3>Acesso do Professor</h3>
            {errorMsg && <div style={{ color: '#ff4757', fontWeight: 'bold' }}>{errorMsg}</div>}
            
            <input 
              type="email" 
              placeholder="Seu Email..." 
              value={teacherEmail} 
              onChange={(e) => setTeacherEmail(e.target.value)} 
            />
            <input 
              type="password" 
              placeholder="Sua Senha..." 
              value={teacherPass} 
              onChange={(e) => setTeacherPass(e.target.value)} 
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