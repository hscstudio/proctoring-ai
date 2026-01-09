import { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import FaceVerification from './pages/FaceVerification';
import Exam from './pages/Exam';
import RearProctoring from './pages/RearProctoring';
import ExamViewer from './pages/ExamViewer';
import AdminProctoring from './pages/AdminProctoring';

// 1. Definisikan komponen Dashboard Utama di luar fungsi App
const MainDashboard = ({ user, screen, setScreen, handleLoginSuccess, handleLogout }) => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <main className="max-w-6xl mx-auto">
        {screen === 'login' && (
          <Login 
            onLoginSuccess={handleLoginSuccess} 
            onGoToRegister={() => setScreen('register')} 
          />
        )}

        {screen === 'register' && (
          <Register onDone={() => setScreen('login')} />
        )}

        {user && (
          <>
            {screen === 'verify' && (
              <FaceVerification 
                user={user} 
                onVerified={() => setScreen('exam')} 
                onLogout={handleLogout}
              />
            )}

            {screen === 'exam' && (
              <Exam user={user} onLogout={handleLogout} />
            )}
          </>
        )}
      </main>
    </div>
  );
};

// 2. Fungsi App utama hanya mengelola State dan Routing
function App() {
  const [user, setUser] = useState(() => {
    const loggedIn = sessionStorage.getItem('loggedInUser');
    return loggedIn ? JSON.parse(loggedIn) : null;
  });

  const [screen, setScreen] = useState(() => {
    const loggedIn = sessionStorage.getItem('loggedInUser');
    return loggedIn ? 'verify' : 'login';
  });

  const handleLogout = () => {
    sessionStorage.removeItem('loggedInUser');
    setUser(null);
    setScreen('login');
  };

  const handleLoginSuccess = (userData) => {
    sessionStorage.setItem('loggedInUser', JSON.stringify(userData));
    setUser(userData);
    setScreen('verify');
  };

  return (
    <Router>
      <Routes>
        {/* Rute Utama (Laptop) - Mengirimkan state sebagai props */}
        <Route path="/" element={
          <MainDashboard 
            user={user} 
            screen={screen} 
            setScreen={setScreen}
            handleLoginSuccess={handleLoginSuccess}
            handleLogout={handleLogout}
          />
        } />

        {/* Rute Khusus HP (Smartphone) */}
        <Route path="/rear-proctoring" element={<RearProctoring />} />

        {/* Rute Viewer (Proctor Monitoring) */}
        <Route path="/viewer" element={<ExamViewer />} />

        {/* Rute Admin Proctoring (Alternative Viewer) */}
        <Route path="/admin-proctoring" element={<AdminProctoring />} />

        {/* Redirect jika rute tidak ditemukan */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;