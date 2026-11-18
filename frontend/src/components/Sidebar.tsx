import { LucideIcon, BarChartHorizontal, LayoutDashboard, Monitor, ShieldAlert, Bell, BellRing, TrendingUp, Brain, FileText, Settings } from 'lucide-react';

export interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'devices', label: 'Devices', icon: Monitor },
  { key: 'threats', label: 'Threat Detection', icon: ShieldAlert },
  { key: 'alerts', label: 'Alerts', icon: Bell },
  { key: 'notifications', label: 'Notifications', icon: BellRing },
  { key: 'risk-analysis', label: 'Risk Analysis', icon: TrendingUp },
  { key: 'model', label: 'Model Performance', icon: Brain },
  { key: 'reports', label: 'Reports', icon: FileText },
  { key: 'settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  simulationRunning: boolean;
  onToggleSimulation: () => void;
  unreadCount?: number;
}

export default function Sidebar({ activePage, onNavigate, simulationRunning, onToggleSimulation, unreadCount = 0 }: SidebarProps) {
  return (
    <aside className="flex flex-col h-screen w-64 bg-slate-900 text-slate-100 p-4">
      <div className="flex items-center space-x-2 mb-8">
        <BarChartHorizontal className="text-cyan-500" size={28} />
        <h1 className="text-xl font-semibold text-cyan-400">IoMT Sentinel</h1>
      </div>
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const selected = activePage === item.key;
          return (
            <button
              key={item.key}
              className={`w-full flex items-center p-2 rounded-lg transition-colors 
                ${selected ? 'bg-slate-800 text-cyan-400' : 'text-slate-300 hover:bg-slate-800 hover:text-cyan-300'}`}
              onClick={() => onNavigate(item.key)}
            >
              <Icon size={20} className="mr-3" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.key === 'notifications' && unreadCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="mt-4 pt-4 border-t border-slate-700">
        <button
          className="w-full flex items-center justify-center p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          onClick={onToggleSimulation}
        >
          {simulationRunning ? 'Stop Simulation' : 'Start Simulation'}
        </button>
      </div>
    </aside>
  );
}
