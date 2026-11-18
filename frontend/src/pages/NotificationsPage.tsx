import { Bell, CheckCheck, ShieldAlert, AlertTriangle, Info } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AppNotification } from '../hooks/useNotifications';

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'] as const;

const SEV_ICON: Record<string, JSX.Element> = {
  Critical: <ShieldAlert size={18} className="text-red-400" />,
  High: <AlertTriangle size={18} className="text-amber-400" />,
  Medium: <Info size={18} className="text-blue-400" />,
  Low: <Info size={18} className="text-emerald-400" />,
};

function timeAgo(isoStr: string) {
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface NotificationsPageProps {
  notifications: AppNotification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  onNavigateAlerts: () => void;
}

export default function NotificationsPage({
  notifications, unreadCount, onMarkAllRead, onMarkRead, onNavigateAlerts
}: NotificationsPageProps) {
  const [filterSeverity, setFilterSeverity] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const filtered = useMemo(() => {
    return notifications.filter(n => {
      if (filterSeverity && n.severity !== filterSeverity) return false;
      if (unreadOnly && n.read) return false;
      return true;
    });
  }, [notifications, filterSeverity, unreadOnly]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Bell size={28} className="text-cyan-400" />
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Notifications</h2>
            <p className="text-slate-400 text-sm">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'} · {notifications.length} total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm transition"
            >
              <CheckCheck size={16} /> Mark all read
            </button>
          )}
          <button
            onClick={onNavigateAlerts}
            className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition"
          >
            Open alerts
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          className="bg-slate-800 border border-slate-700 text-slate-200 text-sm px-3 py-2 rounded-lg"
          value={filterSeverity}
          onChange={e => setFilterSeverity(e.target.value)}
        >
          <option value="">All severities</option>
          {SEVERITIES.map(s => <option key={s}>{s}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={e => setUnreadOnly(e.target.checked)}
            className="rounded border-slate-600 bg-slate-800"
          />
          Unread only
        </label>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Bell size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No notifications to show</p>
            <p className="text-xs mt-1">New high-priority alerts will appear here as they arrive</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filtered.map(n => (
              <button
                key={n.id}
                type="button"
                onClick={() => onMarkRead(n.id)}
                className={`w-full text-left flex items-start gap-4 px-5 py-4 hover:bg-slate-700/20 transition ${!n.read ? 'bg-slate-800/40' : ''}`}
              >
                <div className="mt-1">{SEV_ICON[n.severity] ?? <Info size={18} className="text-slate-400" />}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {!n.read && <span className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />}
                    <span className={`text-sm font-semibold ${!n.read ? 'text-slate-100' : 'text-slate-300'}`}>
                      {n.attack_type}
                    </span>
                    <span className="text-xs text-slate-500">{n.severity}</span>
                    <span className="text-xs text-slate-500">Risk {n.risk_score}</span>
                  </div>
                  <p className="text-xs font-mono text-cyan-400 mt-1">{n.device_id}{n.device_name ? ` · ${n.device_name}` : ''}</p>
                  <p className="text-sm text-slate-400 mt-1">{n.summary}</p>
                </div>
                <span className="text-xs text-slate-500 flex-shrink-0">{timeAgo(n.created_at)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
