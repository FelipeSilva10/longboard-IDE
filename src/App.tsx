import { useState } from 'react';
import { LoginScreen } from './screens/LoginScreen';
import { IdeScreen } from './screens/IdeScreen';
import { TeacherDashboard } from "./TeacherDashboard";
import { StudentDashboard } from "./screens/StudentDashboard"; // <--- Importando a tela!
import './App.css';

type UserRole = 'guest' | 'student' | 'teacher' | 'teacher-dashboard' | 'student-dashboard' | 'visitor';

function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('guest');
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>();

  const handleLogin = (role: 'student' | 'teacher' | 'visitor') => {
    if (role === 'teacher') setCurrentRole('teacher-dashboard');
    else if (role === 'student') setCurrentRole('student-dashboard'); // <--- Aluno vai pro Painel
    else setCurrentRole(role);
  };

  const handleLogout = () => {
    setCurrentRole('guest');
    setActiveProjectId(undefined);
  };

  if (currentRole === 'guest') return <LoginScreen onLogin={handleLogin} />;
  
  if (currentRole === 'teacher-dashboard') return <TeacherDashboard onLogout={handleLogout} onOpenIde={() => setCurrentRole('teacher')} />;
  
  if (currentRole === 'student-dashboard') {
    return (
      <StudentDashboard 
        onLogout={handleLogout} 
        onOpenIde={(projectId) => {
          setActiveProjectId(projectId);
          setCurrentRole('student'); // Abre o Blockly
        }} 
      />
    );
  }

  // IdeScreen
  return <IdeScreen role={currentRole} onLogout={handleLogout} />;
}

export default App;