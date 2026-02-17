import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import RecordList from './pages/RecordList';
import RecordForm from './pages/RecordForm';
import Analytics from './pages/Analytics';
import CalendarView from './pages/CalendarView';
import Settings from './pages/Settings';
// import { seedIfEmpty } from './data/mockData';
import { trySync } from './data/sync';
import SyncToast from './components/SyncToast';
import ReloadPrompt from './components/ReloadPrompt';
import Navigation from './components/Navigation';

export default function App() {
  // useEffect(() => { seedIfEmpty(); trySync(); }, []);
  // Use trySync only
  useEffect(() => { trySync(); }, []);

  return (
    <Router>
      <div className="min-h-screen pb-20 bg-bg-dark text-text-primary antialiased selection:bg-primary/20 selection:text-primary">
        <SyncToast />
        <ReloadPrompt />
        <Routes>
          <Route path="/" element={<Navigate to="/list" replace />} />
          <Route path="/list" element={<RecordList />} />
          <Route path="/add" element={<RecordForm />} />
          <Route path="/edit/:id" element={<RecordForm />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
        <Navigation />
      </div>
    </Router>
  );
}
