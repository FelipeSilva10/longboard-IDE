import { useState } from 'react';

interface LoginScreenProps {
  onLogin: (role: 'student' | 'teacher' | 'visitor', token?: string) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [loginType, setLoginType] = useState<'none' | 'student' | 'teacher'>('none');
  
  // Estados para capturar o que o usuário digita
  const [studentCode, setStudentCode] = useState('');
  const [teacherUser, setTeacherUser] = useState('');
  const [teacherPass, setTeacherPass] = useState('');

  const handleStudentLogin = () => {
    // Futuramente: Validar studentCode no Supabase
    if (studentCode.trim() !== '') onLogin('student', studentCode);
  };

  const handleTeacherLogin = () => {
    // Futuramente: Validar teacherUser e teacherPass no Supabase Auth
    if (teacherUser && teacherPass) onLogin('teacher', 'fake-jwt-token');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Longboard IDE</h1>
        <p>Bem-vindo! Selecione como deseja entrar:</p>

        {/* Botões Principais de Escolha */}
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
            <h3>Aluno</h3>
            <input 
              type="text" 
              placeholder="Código da Turma ou Convite..." 
              value={studentCode}
              onChange={(e) => setStudentCode(e.target.value)}
            />
            <button className="btn-primary" onClick={handleStudentLogin}>Entrar na Turma</button>
            <button className="btn-text" onClick={() => setLoginType('none')}>Voltar</button>
          </div>
        )}

        {/* Formulário do Professor */}
        {loginType === 'teacher' && (
          <div className="login-form">
            <h3>Professor</h3>
            <input 
              type="text" 
              placeholder="Usuário" 
              value={teacherUser}
              onChange={(e) => setTeacherUser(e.target.value)}
            />
            <input 
              type="password" 
              placeholder="Senha" 
              value={teacherPass}
              onChange={(e) => setTeacherPass(e.target.value)}
            />
            <button className="btn-secondary" onClick={handleTeacherLogin}>Acessar Painel</button>
            <button className="btn-text" onClick={() => setLoginType('none')}>Voltar</button>
          </div>
        )}
      </div>
    </div>
  );
}