import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAlerts } from '../services/api';

export interface AppNotification {
  id: string;
  alert_id: string;
  device_id: string;
  device_name: string | null;
  attack_type: string;
  severity: string;
  risk_score: number;
  summary: string;
  created_at: string;
  read: boolean;
}

export type ToastMinSeverity = 'Critical' | 'High' | 'Medium' | 'Low';

export interface NotificationPrefs {
  toastEnabled: boolean;
  minSeverity: ToastMinSeverity;
}

const POLL_INTERVAL_MS = 8000;
const PREFS_KEY = 'iomt-notification-prefs';
const READ_KEY = 'iomt-notification-read-ids';

const SEV_RANK: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  toastEnabled: true,
  minSeverity: 'High',
};

export function loadNotificationPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFS;
    const parsed = JSON.parse(raw);
    return {
      toastEnabled: parsed.toastEnabled !== false,
      minSeverity: (['Critical', 'High', 'Medium', 'Low'].includes(parsed.minSeverity)
        ? parsed.minSeverity
        : 'High') as ToastMinSeverity,
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

export function saveNotificationPrefs(prefs: NotificationPrefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new Event('iomt-notification-prefs'));
}

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function persistReadIds(ids: Set<string>) {
  localStorage.setItem(READ_KEY, JSON.stringify([...ids].slice(-200)));
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => loadNotificationPrefs());
  const seenIds = useRef<Set<string>>(new Set());
  const readIds = useRef<Set<string>>(loadReadIds());
  const isFirst = useRef(true);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  useEffect(() => {
    const sync = () => setPrefs(loadNotificationPrefs());
    window.addEventListener('iomt-notification-prefs', sync);
    return () => window.removeEventListener('iomt-notification-prefs', sync);
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = await fetchAlerts({ status: 'new', limit: '50' });
      const alerts: any[] = res.alerts ?? [];

      const fresh: AppNotification[] = [];

      for (const a of alerts) {
        if (seenIds.current.has(a.alert_id)) continue;
        seenIds.current.add(a.alert_id);
        fresh.push({
          id: a.alert_id,
          alert_id: a.alert_id,
          device_id: a.device_id,
          device_name: a.device_name,
          attack_type: a.attack_type,
          severity: a.severity,
          risk_score: a.risk_score,
          summary: a.summary,
          created_at: a.created_at,
          read: readIds.current.has(a.alert_id),
        });
      }

      if (fresh.length > 0) {
        setNotifications(prev => [...fresh, ...prev].slice(0, 50));

        if (!isFirst.current) {
          const current = prefsRef.current;
          if (current.toastEnabled) {
            const minRank = SEV_RANK[current.minSeverity] ?? 3;
            const important = fresh.filter(n => (SEV_RANK[n.severity] ?? 0) >= minRank);
            if (important.length > 0) {
              setToasts(prev => [...important.slice(0, 3), ...prev].slice(0, 5));
            }
          }
        }
      }

      isFirst.current = false;
    } catch {
      // silently ignore poll errors
    }
  }, []);

  useEffect(() => {
    poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [poll]);

  const markAllRead = () => {
    setNotifications(prev => {
      prev.forEach(n => readIds.current.add(n.id));
      persistReadIds(readIds.current);
      return prev.map(n => ({ ...n, read: true }));
    });
  };

  const markRead = (id: string) => {
    readIds.current.add(id);
    persistReadIds(readIds.current);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, toasts, unreadCount, markAllRead, markRead, dismissToast };
}
