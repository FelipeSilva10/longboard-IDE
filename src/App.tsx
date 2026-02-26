import { useState } from 'react';
import { LoginScreen } from './screens/LoginScreen';
import { IdeScreen } from './screens/IdeScreen';
import { TeacherDashboard } from "./TeacherDashboard";
import './App.css';

// Adicionamos o 'teacher-dashboard' nas rotas possíveis
type UserRole = 'guest' | 'student' | 'teacher' | 'teacher-dashboard' | 'visitor';

function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('guest');

  const handleLogin = (role: 'student' | 'teacher' | 'visitor') => {
    // Se for professor, vai para o painel. Se for aluno/visitante, vai direto pra IDE.
    if (role === 'teacher') {
      setCurrentRole('teacher-dashboard');
    } else {
      setCurrentRole(role);
    }
  };

  const handleLogout = () => {
    setCurrentRole('guest');
  };

  // Renderização condicional simples (o nosso roteador)
  if (currentRole === 'guest') {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (currentRole === 'teacher-dashboard') {
    return (
      <TeacherDashboard 
        onLogout={handleLogout} 
        onOpenIde={() => setCurrentRole('teacher')} // Sai do painel e vai pra IDE
      />
    );
  }

  // Se for student, visitor ou teacher (querendo ver a IDE), renderiza o Blockly
  return <IdeScreen role={currentRole} onLogout={handleLogout} />;
}

export default App;