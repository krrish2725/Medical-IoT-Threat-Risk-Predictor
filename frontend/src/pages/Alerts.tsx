import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import { fetchAlerts, updateAlertStatus } from '../services/api';

const STATUSES = ['new', 'investigating', 'resolved', 'false_positive'];
const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];

export default function Alerts() {
  const [data, setData] = useState<any>({ alerts: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      if (filterSeverity) params.severity = filterSeverity;
      const res = await fetchAlerts(params);
      setData(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterStatus, filterSeverity]);

  const changeStatus = async (alertId: string, status: string) => {
    setUpdatingId(alertId);
    try {
      await updateAlertStatus(alertId, status);
      await load();
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const SEV_ICONS: Record<string, string> = { Critical: '🔴', High: '🟠', Medium: '🔵', Low: '🟢' };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Alert Management</h2>
          <p className="text-slate-400 text-sm">Total: {data.total} alerts</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select className="bg-slate-800 border border-slate-700 text-slate-200 text-sm px-3 py-2 rounded-lg" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="bg-slate-800 border border-slate-700 text-slate-200 text-sm px-3 py-2 rounded-lg" value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
          <option value="">All Severities</option>
          {SEVERITIES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {error && <div className="bg-red-900/30 border border-red-500/40 text-red-300 p-4 rounded-lg text-sm">{error}</div>}

      {/* Alerts List */}
      <div className="space-y-3">
        {loading ? (
          [...Array(5)].map((_, i) => <div key={i} className="h-20 bg-slate-800 rounded-xl animate-pulse" />)
        ) : data.alerts.length === 0 ? (
          <div className="text-center py-16 text-slate-500">No alerts match the selected filters.</div>
        ) : data.alerts.map((a: any) => {
          const expanded = expandedId === a.alert_id;
          return (
            <div key={a.alert_id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
              {/* Header row */}
              <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-700/20" onClick={() => setExpandedId(expanded ? null : a.alert_id)}>
                <span className="text-lg flex-shrink-0">{SEV_ICONS[a.severity] ?? '⚪'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono text-cyan-400">{a.device_id}</span>
                    <span className="text-slate-200 font-medium">{a.attack_type}</span>
                    <RiskBadge severity={a.severity} />
                    <span className="text-slate-400 text-xs">Risk: <span className="font-bold text-slate-200">{a.risk_score}</span></span>
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5 truncate">{a.summary}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <select
                    value={a.status}
                    disabled={updatingId === a.alert_id}
                    onClick={e => e.stopPropagation()}
                    onChange={e => changeStatus(a.alert_id, e.target.value)}
                    className="bg-slate-700 border border-slate-600 text-slate-200 text-xs px-2 py-1 rounded-lg disabled:opacity-50"
                  >
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <span className="text-slate-500">{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                </div>
              </div>
              {/* Expanded detail */}
              {expanded && (
                <div className="px-4 pb-4 pt-0 border-t border-slate-700/50 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-400 mt-3">
                    <div><span className="block text-slate-500">Likelihood</span><span className="text-slate-200 font-bold">{a.likelihood} / 5</span></div>
                    <div><span className="block text-slate-500">Impact</span><span className="text-slate-200 font-bold">{a.impact} / 5</span></div>
                    <div><span className="block text-slate-500">Confidence</span><span className="text-slate-200 font-bold">{(a.confidence * 100).toFixed(1)}%</span></div>
                    <div><span className="block text-slate-500">Device</span><span className="text-slate-200 font-bold">{a.device_name ?? a.device_id}</span></div>
                  </div>
                  {a.technical_details && (
                    <div>
                      <p className="text-slate-500 text-xs mb-1">Technical Details</p>
                      <pre className="bg-slate-900 rounded-lg p-3 text-xs text-slate-300 overflow-auto">
                        {JSON.stringify(a.technical_details, null, 2)}
                      </pre>
                    </div>
                  )}
                  {a.suggested_response && (
                    <div>
                      <p className="text-slate-500 text-xs mb-1">Suggested Response</p>
                      <p className="text-slate-300 text-sm">{a.suggested_response}</p>
                    </div>
                  )}
                  <p className="text-slate-500 text-xs">Created: {new Date(a.created_at).toLocaleString()}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
