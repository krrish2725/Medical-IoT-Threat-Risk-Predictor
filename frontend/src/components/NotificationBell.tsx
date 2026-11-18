import { useRef, useEffect, useState } from 'react';
import { Bell, X, CheckCheck, ShieldAlert, AlertTriangle, Info, ExternalLink } from 'lucide-react';
import type { AppNotification } from '../hooks/useNotifications';

interface NotificationBellProps {
  notifications: AppNotification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  onNavigateAlerts: () => void;
}

const SEV_ICON: Record<string, JSX.Element> = {
  Critical: <ShieldAlert size={15} className="text-red-400" />,
  High: <AlertTriangle size={15} className="text-amber-400" />,
  Medium: <Info size={15} className="text-blue-400" />,
  Low: <Info size={15} className="text-emerald-400" />,
};

const SEV_DOT: Record<string, string> = {
  Critical: 'bg-red-500',
  High: 'bg-amber-500',
  Medium: 'bg-blue-500',
  Low: 'bg-emerald-500',
};

function timeAgo(isoStr: string) {
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell({
  notifications, unreadCount, onMarkAllRead, onMarkRead, onNavigateAlerts
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleItemClick = (n: AppNotification) => {
    onMarkRead(n.id);
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 transition"
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-12 w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 flex flex-col max-h-[520px]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-cyan-400" />
              <span className="text-slate-200 font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full font-medium">{unreadCount} new</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllRead}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition"
                  title="Mark all as read"
                >
                  <CheckCheck size={13} /> All read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-600 hover:text-slate-300"><X size={14} /></button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Bell size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No notifications yet</p>
                <p className="text-xs mt-1">New alerts will appear here</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-800/60 transition ${!n.read ? 'bg-slate-800/30' : ''}`}
                >
                  {/* Unread dot */}
                  <div className="mt-1.5 flex-shrink-0">
                    {!n.read
                      ? <span className={`block w-2 h-2 rounded-full ${SEV_DOT[n.severity] ?? 'bg-slate-500'}`} />
                      : <span className="block w-2 h-2" />}
                  </div>

                  <div className="flex-shrink-0 mt-0.5">
                    {SEV_ICON[n.severity] ?? <Info size={15} className="text-slate-400" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-semibold ${!n.read ? 'text-slate-100' : 'text-slate-300'}`}>
                        {n.attack_type} — {n.severity}
                      </span>
                      <span className="text-slate-600 text-xs flex-shrink-0">{timeAgo(n.created_at)}</span>
                    </div>
                    <p className="text-xs font-mono text-cyan-500 mt-0.5">{n.device_id}{n.device_name ? ` · ${n.device_name}` : ''}</p>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.summary}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-600">Risk score: <span className="font-bold text-slate-400">{n.risk_score}</span></span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-slate-700 px-4 py-3">
              <button
                onClick={() => { setOpen(false); onNavigateAlerts(); }}
                className="w-full flex items-center justify-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition font-medium"
              >
                <ExternalLink size={13} /> View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
