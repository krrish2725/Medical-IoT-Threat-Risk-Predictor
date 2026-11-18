import { Shield } from 'lucide-react';
import NotificationBell from './NotificationBell';
import type { AppNotification } from '../hooks/useNotifications';

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Security Dashboard',
  devices: 'Medical IoT Devices',
  threats: 'Threat Detection',
  alerts: 'Alert Management',
  notifications: 'Notifications',
  'risk-analysis': 'What-If Risk Analysis',
  model: 'Model Performance',
  reports: 'Security Reports',
  settings: 'Settings',
};

interface TopBarProps {
  activePage: string;
  notifications: AppNotification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  onNavigateNotifications: () => void;
}

export default function TopBar({
  activePage, notifications, unreadCount, onMarkAllRead, onMarkRead, onNavigateNotifications
}: TopBarProps) {
  return (
    <header className="h-14 flex-shrink-0 bg-slate-900/80 backdrop-blur border-b border-slate-700/50 flex items-center justify-between px-6">
      {/* Left: page title */}
      <div className="flex items-center gap-2">
        <Shield size={18} className="text-cyan-400" />
        <h1 className="text-slate-200 font-semibold text-sm">{PAGE_TITLES[activePage] ?? activePage}</h1>
      </div>

      {/* Right: status + bell */}
      <div className="flex items-center gap-4">
        {/* Live indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          <span>Live · Demo Mode</span>
        </div>

        {/* Notification Bell */}
        <NotificationBell
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAllRead={onMarkAllRead}
          onMarkRead={onMarkRead}
          onNavigateAlerts={onNavigateNotifications}
        />
      </div>
    </header>
  );
}
