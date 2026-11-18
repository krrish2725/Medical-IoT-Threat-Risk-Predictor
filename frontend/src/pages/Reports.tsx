import { useEffect, useState } from 'react';
import { FileText, Download, Printer } from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import { fetchReportSummary, exportReportCsv } from '../services/api';

export default function Reports() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setData(await fetchReportSummary());
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-6 text-slate-400">Loading report…</div>;
  if (error) return <div className="p-6 text-red-400">Error: {error}</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <FileText size={28} className="text-cyan-400" />
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Security Report</h2>
            <p className="text-slate-400 text-xs">Generated: {new Date(data?.report_generated_at).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => exportReportCsv()} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg text-sm">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg text-sm">
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {data?.demo_mode && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm p-3 rounded-lg">
          ⚠ Demo Mode — data shown is synthetic and for demonstration purposes only.
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Devices', value: data?.total_devices },
          { label: 'Devices at Risk', value: data?.devices_requiring_investigation },
          { label: 'Suspicious Events', value: data?.suspicious_events },
          { label: 'High/Critical Alerts', value: data?.high_critical_events },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
            <p className="text-slate-400 text-sm">{s.label}</p>
            <p className="text-3xl font-bold text-slate-100 mt-1">{s.value ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Device Risk Table */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 overflow-x-auto">
        <h3 className="text-slate-200 font-semibold mb-4">Device Risk Summary</h3>
        <table className="w-full text-sm text-slate-300">
          <thead>
            <tr className="text-slate-500 text-xs uppercase">
              {['Device', 'Name', 'Type', 'Department', 'Criticality', 'Risk Score', 'Last Threat', 'Alerts', 'Status'].map(h => (
                <th key={h} className="text-left py-2 pr-4 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.device_risk_summaries ?? []).map((d: any) => (
              <tr key={d.device_id} className="border-t border-slate-700/30 hover:bg-slate-700/20">
                <td className="py-2 pr-4 font-mono text-xs text-cyan-400">{d.device_id}</td>
                <td className="py-2 pr-4 font-medium text-slate-200">{d.name}</td>
                <td className="py-2 pr-4">{d.device_type}</td>
                <td className="py-2 pr-4">{d.department}</td>
                <td className="py-2 pr-4"><RiskBadge severity={d.criticality} /></td>
                <td className="py-2 pr-4 font-bold">{d.latest_risk_score ?? 0}</td>
                <td className="py-2 pr-4 text-xs">{d.latest_threat || '—'}</td>
                <td className="py-2 pr-4">{d.alert_count}</td>
                <td className="py-2 pr-4 text-xs">{d.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
