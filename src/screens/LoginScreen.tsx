import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface LoginScreenProps {
  onLogin: (role: 'student' | 'teacher' | 'visitor') => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [loginType, setLoginType] = useState<'none' | 'student' | 'teacher'>('none');
  
  // Novos estados para o Aluno
  const [studentUsername, setStudentUsername] = useState('');
  const [studentPass, setStudentPass] = useState('');
  
  const [teacherEmail, setTeacherEmail] = useState(''); 
  const [teacherPass, setTeacherPass] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // --- O TRUQUE DO E-MAIL FANTASMA ---
  const DOMINIO_ALUNO = '@aluno.longboard';

  const handleStudentLogin = async () => {
    if (studentUsername.trim() === '' || studentPass.trim() === '') return;
    
    setErrorMsg('');
    setLoading(true);

    // 1. Monta o e-mail falso invisível (remove espaços e põe tudo em minúsculo)
    const emailFormatado = `${studentUsername.trim().toLowerCase()}${DOMINIO_ALUNO}`;

    // 2. Tenta fazer o login no Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailFormatado,
      password: studentPass,
    });

    setLoading(false);

    if (error) {
      setErrorMsg('Usuário ou senha incorretos!');
      return;
    }

    if (data.user) {
      onLogin('student');
    }
  };

  const handleTeacherLogin = async () => {
    // ... (Mantenha o código do professor exatamente como já estava)
    setErrorMsg('');
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: teacherEmail, password: teacherPass });
    setLoading(false);
    if (error) { setErrorMsg('Email ou senha incorretos!'); return; }
    if (data.user) onLogin('teacher');
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

        {/* --- NOVO FORMULÁRIO DO ALUNO --- */}
        {loginType === 'student' && (
          <div className="login-form">
            <h3>Login do Aluno</h3>
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

        {/* Formulário do Professor */}
        {loginType === 'teacher' && (
          <div className="login-form">
            {/* ... (Mantenha o formulário do professor como estava) ... */}
          </div>
        )}
      </div>
    </div>
  );
}