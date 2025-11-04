import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { EnvValidator } from './components/EnvValidator';
import { Home } from './pages/Home';
import { Swap } from './pages/Swap';
import { Farms } from './pages/Farms';
import { Charity } from './pages/Charity';
import { Admin } from './pages/Admin';
import Dashboard from './pages/Dashboard';
import Leaderboard from './pages/Leaderboard';

function App() {
  return (
    <BrowserRouter>
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
      </div>
    </BrowserRouter>
  );
}

export default App;
