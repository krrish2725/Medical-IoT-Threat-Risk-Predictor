import { useState } from 'react';
import type { ReactElement } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ToastContainer from './components/ToastContainer';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import ThreatDetection from './pages/ThreatDetection';
import Alerts from './pages/Alerts';
import RiskAnalysis from './pages/RiskAnalysis';
import ModelPerformance from './pages/ModelPerformance';
import Reports from './pages/Reports';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import { startSimulation, stopSimulation } from './services/api';
import { useNotifications } from './hooks/useNotifications';
import { PageName } from './types';

const STATIC_PAGES: Partial<Record<PageName, ReactElement>> = {
  dashboard: <Dashboard />,
  devices: <Devices />,
  threats: <ThreatDetection />,
  alerts: <Alerts />,
  'risk-analysis': <RiskAnalysis />,
  model: <ModelPerformance />,
  reports: <Reports />,
  settings: <SettingsPage />,
};

export default function App() {
  const [activePage, setActivePage] = useState<PageName>('dashboard');
  const [simulationRunning, setSimulationRunning] = useState(false);

  const { notifications, toasts, unreadCount, markAllRead, markRead, dismissToast } = useNotifications();

  const handleToggleSim = async () => {
    try {
      if (simulationRunning) {
        await stopSimulation();
        setSimulationRunning(false);
      } else {
        await startSimulation(3);
        setSimulationRunning(true);
      }
    } catch {
      // ignore if backend not reachable
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        onNavigate={(p) => setActivePage(p as PageName)}
        simulationRunning={simulationRunning}
        onToggleSimulation={handleToggleSim}
        unreadCount={unreadCount}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header with Notifications */}
        <TopBar
          activePage={activePage}
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAllRead={markAllRead}
          onMarkRead={markRead}
          onNavigateNotifications={() => setActivePage('notifications')}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {activePage === 'notifications' ? (
            <NotificationsPage
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAllRead={markAllRead}
              onMarkRead={markRead}
              onNavigateAlerts={() => setActivePage('alerts')}
            />
          ) : (
            STATIC_PAGES[activePage]
          )}
        </main>
      </div>

      {/* Toast pop-ups — bottom right */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
