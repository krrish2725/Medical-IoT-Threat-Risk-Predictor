import { useEffect, useState } from 'react';
import { Settings, Shield, Activity, Database, AlertTriangle, Bell } from 'lucide-react';
import { healthCheck, startSimulation, stopSimulation, getSimulationStatus } from '../services/api';
import {
  loadNotificationPrefs,
  saveNotificationPrefs,
  type NotificationPrefs,
  type ToastMinSeverity,
} from '../hooks/useNotifications';

export default function SettingsPage() {
  const [health, setHealth] = useState<any | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [simStatus, setSimStatus] = useState<any | null>(null);
  const [simInterval, setSimInterval] = useState(3);
  const [simBusy, setSimBusy] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(() => loadNotificationPrefs());

  const updateNotifPrefs = (patch: Partial<NotificationPrefs>) => {
    const next = { ...notifPrefs, ...patch };
    setNotifPrefs(next);
    saveNotificationPrefs(next);
  };

  useEffect(() => {
    healthCheck().then(setHealth).catch(e => setHealthError(e.message));
    getSimulationStatus().then(setSimStatus).catch(() => null);
  }, []);

  const toggleSim = async () => {
    setSimBusy(true);
    try {
      const fn = simStatus?.is_running ? stopSimulation : () => startSimulation(simInterval);
      const res = await fn();
      setSimStatus(res);
    } catch (e: any) {
      alert('Simulation error: ' + e.message);
    } finally {
      setSimBusy(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings size={28} className="text-cyan-400" />
        <h2 className="text-2xl font-bold text-slate-100">Settings</h2>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 flex gap-4">
        <AlertTriangle size={24} className="text-amber-400 flex-shrink-0 mt-1" />
        <div className="text-sm text-amber-200 space-y-1">
          <p className="font-semibold text-amber-300 text-base">Academic Research Prototype</p>
          <p>This system is an academic demonstration and is <strong>not</strong> a certified or clinically validated medical device security product. Risk scores and threat predictions are based on machine learning models and configurable heuristics. They should not be used for clinical decision-making or as the sole basis for security response. Always follow institutional security policies.</p>
        </div>
      </div>

      {/* About */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={20} className="text-cyan-400" />
          <h3 className="text-slate-200 font-semibold">About This Project</h3>
        </div>
        <div className="text-sm text-slate-400 space-y-2">
          <p><span className="text-slate-200 font-medium">Project:</span> AI-Based Cybersecurity Risk Prediction and Threat Prioritization for Medical IoT Devices</p>
          <p><span className="text-slate-200 font-medium">Dataset:</span> CICIoMT2024 (University of New Brunswick) — requires manual download</p>
          <p><span className="text-slate-200 font-medium">ML Models:</span> Random Forest (baseline), XGBoost (comparison)</p>
          <p><span className="text-slate-200 font-medium">Risk Formula:</span> Score = (Likelihood × Impact / 25) × 100</p>
          <p><span className="text-slate-200 font-medium">Stack:</span> FastAPI + SQLAlchemy + SQLite · React + Vite + Tailwind CSS + Recharts</p>
          <p><span className="text-slate-200 font-medium">Version:</span> 1.0.0</p>
        </div>
      </div>

      {/* API Health */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={20} className="text-cyan-400" />
          <h3 className="text-slate-200 font-semibold">API Health</h3>
        </div>
        {healthError ? (
          <div className="text-red-400 text-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-red-400 rounded-full" /> Backend unreachable: {healthError}
          </div>
        ) : health ? (
          <div className="text-sm space-y-2">
            <div className="flex items-center gap-2 text-emerald-400">
              <span className="w-2 h-2 bg-emerald-400 rounded-full" />
              <span>Backend healthy</span>
            </div>
            <div className="flex gap-6 text-slate-400">
              <span>Model loaded: <span className={health.model_loaded ? 'text-emerald-400' : 'text-amber-400'}>{health.model_loaded ? 'Yes' : 'No (demo mode)'}</span></span>
              <span>Server time: <span className="text-slate-300">{new Date(health.timestamp).toLocaleString()}</span></span>
            </div>
          </div>
        ) : <p className="text-slate-500 text-sm">Checking…</p>}
      </div>

      {/* Notifications */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bell size={20} className="text-cyan-400" />
          <h3 className="text-slate-200 font-semibold">Notifications</h3>
        </div>
        <p className="text-slate-400 text-sm">
          Control toast pop-ups for new alerts. The notification inbox in the header still lists all new alerts.
        </p>
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={notifPrefs.toastEnabled}
            onChange={e => updateNotifPrefs({ toastEnabled: e.target.checked })}
            className="rounded border-slate-600 bg-slate-800"
          />
          Show toast pop-ups for new alerts
        </label>
        <div>
          <label className="text-slate-400 text-xs mb-1 block">Minimum severity for toasts</label>
          <select
            disabled={!notifPrefs.toastEnabled}
            value={notifPrefs.minSeverity}
            onChange={e => updateNotifPrefs({ minSeverity: e.target.value as ToastMinSeverity })}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-sm px-3 py-2 rounded-lg disabled:opacity-50"
          >
            <option value="Critical">Critical only</option>
            <option value="High">High and Critical</option>
            <option value="Medium">Medium and above</option>
            <option value="Low">All severities</option>
          </select>
        </div>
      </div>

      {/* Simulation Controls */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Database size={20} className="text-cyan-400" />
          <h3 className="text-slate-200 font-semibold">Live Simulation</h3>
        </div>
        <p className="text-slate-400 text-sm">The simulation engine generates synthetic network events and alerts to demonstrate the dashboard with live-like data.</p>
        {simStatus && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-slate-400">
            <div><span className="block text-slate-500 text-xs">Status</span><span className={simStatus.is_running ? 'text-emerald-400' : 'text-slate-500'}>{simStatus.is_running ? 'Running' : 'Stopped'}</span></div>
            <div><span className="block text-slate-500 text-xs">Events Generated</span><span className="text-slate-200">{simStatus.events_generated}</span></div>
            <div><span className="block text-slate-500 text-xs">Alerts Triggered</span><span className="text-slate-200">{simStatus.alerts_triggered}</span></div>
            <div><span className="block text-slate-500 text-xs">Interval</span><span className="text-slate-200">{simStatus.interval_seconds}s</span></div>
          </div>
        )}
        <div className="flex items-center gap-4">
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Interval (seconds)</label>
            <input type="number" min={1} max={30} value={simInterval} onChange={e => setSimInterval(Number(e.target.value))} className="w-24 bg-slate-900 border border-slate-700 text-slate-200 text-sm px-3 py-2 rounded-lg" />
          </div>
          <button onClick={toggleSim} disabled={simBusy} className={`px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${simStatus?.is_running ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white'}`}>
            {simBusy ? '…' : simStatus?.is_running ? 'Stop Simulation' : 'Start Simulation'}
          </button>
        </div>
      </div>

      {/* Dataset Info */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-slate-200 font-semibold mb-3">Dataset Setup</h3>
        <div className="text-sm text-slate-400 space-y-2">
          <p>Download the <strong className="text-slate-200">CICIoMT2024</strong> dataset from:</p>
          <code className="block bg-slate-900 rounded p-2 text-cyan-400 text-xs">https://www.unb.ca/cic/datasets/iomt-dataset-2024.html</code>
          <p>Place CSV files in: <code className="text-cyan-400 text-xs">data/raw/</code></p>
          <p>Then run training from Model Performance page or via PowerShell:</p>
          <code className="block bg-slate-900 rounded p-2 text-cyan-400 text-xs">python -m backend.app.ml.model</code>
        </div>
      </div>
    </div>
  );
}
