import { useState } from 'react';
import { LoginScreen } from './screens/LoginScreen';
import { IdeScreen } from './screens/IdeScreen';
import './App.css';

// Definição dos perfis possíveis
type UserRole = 'guest' | 'student' | 'teacher' | 'visitor';

function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('guest');

  // Função chamada pela tela de login quando a autenticação dá certo
  const handleLogin = (role: 'student' | 'teacher' | 'visitor') => {
    setCurrentRole(role);
    // Nota: Se fosse Professor ou Aluno, aqui redirecionaríamos para o Dashboard.
    // Como ainda não temos o Dashboard criado, vamos mandar direto pra IDE por enquanto.
  };

  const handleLogout = () => {
    setCurrentRole('guest'); // Volta para a tela de login
  };

  // Roteamento simples: Se for 'guest', mostra o Login. Senão, mostra a IDE.
  return (
    <>
      {currentRole === 'guest' ? (
        <LoginScreen onLogin={handleLogin} />
      ) : (
        <IdeScreen role={currentRole} onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;