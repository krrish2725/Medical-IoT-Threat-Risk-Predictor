import { useEffect, useRef } from 'react';
import { X, ShieldAlert, AlertTriangle, Info } from 'lucide-react';
import type { AppNotification } from '../hooks/useNotifications';

interface ToastProps {
  toasts: AppNotification[];
  onDismiss: (id: string) => void;
}

const SEV_STYLES: Record<string, { bar: string; icon: JSX.Element; bg: string }> = {
  Critical: { bar: 'bg-red-500', bg: 'border-red-500/40 bg-red-950/60', icon: <ShieldAlert size={18} className="text-red-400 flex-shrink-0" /> },
  High: { bar: 'bg-amber-500', bg: 'border-amber-500/40 bg-amber-950/60', icon: <AlertTriangle size={18} className="text-amber-400 flex-shrink-0" /> },
  Medium: { bar: 'bg-blue-500', bg: 'border-blue-500/40 bg-blue-950/60', icon: <Info size={18} className="text-blue-400 flex-shrink-0" /> },
  Low: { bar: 'bg-emerald-500', bg: 'border-emerald-500/40 bg-emerald-950/60', icon: <Info size={18} className="text-emerald-400 flex-shrink-0" /> },
};

function Toast({ notif, onDismiss }: { notif: AppNotification; onDismiss: () => void }) {
  const style = SEV_STYLES[notif.severity] ?? SEV_STYLES.Medium;

  // Auto-dismiss after 6 seconds
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    timer.current = setTimeout(onDismiss, 6000);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [onDismiss]);

  return (
    <div className={`relative flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-sm w-80 animate-slide-in ${style.bg}`}>
      {/* Left severity bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${style.bar}`} />
      <div className="ml-1">{style.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-200">{notif.severity} Alert</span>
          <span className="text-xs text-slate-500">Risk: {notif.risk_score}</span>
        </div>
        <p className="text-xs font-semibold text-slate-200 mt-0.5">{notif.attack_type}</p>
        <p className="text-xs text-slate-400 font-mono">{notif.device_id}</p>
        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{notif.summary}</p>
      </div>
      <button onClick={onDismiss} className="text-slate-600 hover:text-slate-300 flex-shrink-0 transition">
        <X size={14} />
      </button>
    </div>
  );
}

export default function ToastContainer({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end">
      {toasts.map(t => (
        <Toast key={t.id} notif={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}
