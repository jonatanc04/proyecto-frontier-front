import './App.css';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Nav from './components/nav/Nav';
import HomePage from './pages/home/HomePage';
import ManagementPage from './pages/management/ManagementPage';
import PlayersPage from './pages/players/PlayersPage';
import TeamPage from './pages/team/TeamPage';

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Nav />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/management" element={<ManagementPage />} />
            <Route path="/players" element={<PlayersPage />} />
            <Route path="/team/:teamId" element={<TeamPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
