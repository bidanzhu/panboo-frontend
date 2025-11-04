import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { EnvValidator } from './components/EnvValidator';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { Home } from './pages/Home';
import { Swap } from './pages/Swap';
import { Farms } from './pages/Farms';
import { Charity } from './pages/Charity';
import { Admin } from './pages/Admin';
import Dashboard from './pages/Dashboard';
import Leaderboard from './pages/Leaderboard';

function AppContent() {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle 404 redirects - check if we came from a 404 page
    const redirectPath = sessionStorage.getItem('redirectPath');
    if (redirectPath && redirectPath !== '/') {
      sessionStorage.removeItem('redirectPath');
      navigate(redirectPath, { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <EnvValidator />
      <Header />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/swap" element={<Swap />} />
          <Route path="/farms" element={<Farms />} />
          <Route path="/charity" element={<Charity />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>

      <Footer />
      <PWAInstallPrompt />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
