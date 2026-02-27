import { useState } from 'react';
import { LoginScreen } from './screens/LoginScreen';
import { IdeScreen } from './screens/IdeScreen';
import { TeacherDashboard } from "./TeacherDashboard";
import { StudentDashboard } from "./screens/StudentDashboard";
import './App.css';

type UserRole = 'guest' | 'student' | 'teacher' | 'teacher-dashboard' | 'student-dashboard' | 'visitor';

function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('guest');
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>();

  const handleLogin = (role: 'student' | 'teacher' | 'visitor') => {
    if (role === 'teacher') setCurrentRole('teacher-dashboard');
    else if (role === 'student') setCurrentRole('student-dashboard');
    else setCurrentRole(role);
  };

  const handleLogout = () => {
    setCurrentRole('guest');
    setActiveProjectId(undefined);
  };

  const handleBackToDashboard = () => {
    if (currentRole === 'teacher') setCurrentRole('teacher-dashboard');
    else if (currentRole === 'student') setCurrentRole('student-dashboard');
    else handleLogout(); 
  };

  if (currentRole === 'guest') return <LoginScreen onLogin={handleLogin} />;
  
  if (currentRole === 'teacher-dashboard') {
    return (
      <TeacherDashboard 
        onLogout={handleLogout} 
        onOpenIde={(projectId) => {
          setActiveProjectId(projectId); // Guarda o ID do projeto do aluno
          setCurrentRole('teacher');     // Envia o professor para a IDE
        }} 
      />
    );
  }
  
  if (currentRole === 'student-dashboard') {
    return (
      <StudentDashboard 
        onLogout={handleLogout} 
        onOpenIde={(projectId) => {
          setActiveProjectId(projectId);
          setCurrentRole('student');
        }} 
      />
    );
  }

  return <IdeScreen role={currentRole} onBack={handleBackToDashboard} projectId={activeProjectId} />;
}

export default App;