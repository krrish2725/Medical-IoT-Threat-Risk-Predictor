import { useEffect, useState, useCallback } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Monitor, AlertTriangle, ShieldAlert, Shield, RefreshCw } from 'lucide-react';
import StatCard from '../components/StatCard';
import RiskBadge from '../components/RiskBadge';
import { fetchDashboard } from '../services/api';

const REFRESH_INTERVAL_MS = 10000;

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const load = useCallback(async () => {
    try {
      const d = await fetchDashboard();
      setData(d);
      setError(null);
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  if (loading && !data) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-slate-700 rounded w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-800 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-64 bg-slate-800 rounded-xl" />
          <div className="h-64 bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Security Dashboard</h2>
          <p className="text-slate-400 text-sm">Last updated: {lastRefresh.toLocaleTimeString()}</p>
        </div>
        <div className="flex items-center gap-3">
          {data?.demo_mode && (
            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs px-3 py-1 rounded-full">
              DEMO MODE – Synthetic Data
            </span>
          )}
          <button onClick={load} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500/40 text-red-300 p-4 rounded-lg text-sm">
          Failed to load dashboard: {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Devices" value={data?.total_devices ?? 0} icon={<Monitor size={28} />} accent="text-cyan-400" />
        <StatCard label="Devices at Risk" value={data?.devices_requiring_investigation ?? 0} icon={<AlertTriangle size={28} />} accent="text-amber-400" />
        <StatCard label="Suspicious Events" value={data?.suspicious_events ?? 0} icon={<ShieldAlert size={28} />} accent="text-orange-400" />
        <StatCard label="High / Critical Alerts" value={data?.high_critical_events ?? 0} icon={<Shield size={28} />} accent="text-red-400" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Threat Distribution Pie */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-slate-200 font-semibold mb-4">Threat Distribution</h3>
          {data?.threat_distribution?.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={data.threat_distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {data.threat_distribution.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-500 text-sm">No threat data available.</p>}
        </div>

        {/* Risk Distribution Bar */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-slate-200 font-semibold mb-4">Risk Severity Distribution</h3>
          {data?.risk_distribution?.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.risk_distribution}>
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {data.risk_distribution.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-500 text-sm">No risk data available.</p>}
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-slate-200 font-semibold mb-4">Recent Alerts</h3>
        {data?.recent_alerts?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-300">
              <thead>
                <tr className="text-slate-500 border-b border-slate-700">
                  <th className="text-left py-2 pr-4">Device</th>
                  <th className="text-left py-2 pr-4">Attack Type</th>
                  <th className="text-left py-2 pr-4">Severity</th>
                  <th className="text-left py-2 pr-4">Risk Score</th>
                  <th className="text-left py-2 pr-4">Status</th>
                  <th className="text-left py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_alerts.map((a: any) => (
                  <tr key={a.alert_id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="py-2 pr-4 font-mono text-xs text-cyan-400">{a.device_id}</td>
                    <td className="py-2 pr-4">{a.attack_type}</td>
                    <td className="py-2 pr-4"><RiskBadge severity={a.severity} /></td>
                    <td className="py-2 pr-4 font-bold">{a.risk_score}</td>
                    <td className="py-2 pr-4"><span className="text-xs text-slate-400">{a.status}</span></td>
                    <td className="py-2 text-xs text-slate-500">{new Date(a.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-slate-500 text-sm">No recent alerts.</p>}
      </div>

      {/* Model Status */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-slate-200 font-semibold mb-2">ML Model Status</h3>
        {data?.model_status?.status === 'loaded' ? (
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 bg-emerald-400 rounded-full" /> Trained model loaded
            </span>
            <span className="text-slate-400">Model: <span className="text-slate-200">{data.model_status.model_name}</span></span>
            {data.model_status.accuracy && <span className="text-slate-400">Accuracy: <span className="text-slate-200">{(data.model_status.accuracy * 100).toFixed(1)}%</span></span>}
            {data.model_status.f1_macro && <span className="text-slate-400">F1 (macro): <span className="text-slate-200">{(data.model_status.f1_macro * 100).toFixed(1)}%</span></span>}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-amber-400">
            <span className="w-2 h-2 bg-amber-400 rounded-full" />
            <span>No trained model. Running rule-based demo classifier. Go to Model Performance to train.</span>
          </div>
        )}
      </div>
    </div>
  );
}
