import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Brain, Loader2 } from 'lucide-react';
import { fetchModelMetrics, trainModel } from '../services/api';

const CLASS_COLORS = ['#06b6d4', '#ef4444', '#f59e0b', '#a855f7', '#10b981'];

export default function ModelPerformance() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [modelType, setModelType] = useState('random_forest');
  const [trainMsg, setTrainMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const m = await fetchModelMetrics();
      setData(m);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startTraining = async () => {
    setTraining(true);
    setTrainMsg(null);
    try {
      await trainModel(modelType);
      setTrainMsg('Training complete! Reloading metrics…');
      await load();
    } catch (e: any) {
      setTrainMsg('Error: ' + e.message);
    } finally {
      setTraining(false);
    }
  };

  const fmt = (v?: number) => v !== undefined ? (v * 100).toFixed(2) + '%' : '—';
  const fmtSec = (v?: number) => v !== undefined ? v.toFixed(1) + 's' : '—';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Brain size={28} className="text-cyan-400" />
        <h2 className="text-2xl font-bold text-slate-100">ML Model Performance</h2>
      </div>

      {/* Train Button */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 flex flex-wrap items-center gap-4">
        <div>
          <h3 className="text-slate-200 font-semibold">Train Model</h3>
          <p className="text-slate-400 text-sm">Requires CICIoMT2024 dataset in <code className="text-cyan-400 text-xs">data/raw/</code> (or uses synthetic data).</p>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <select className="bg-slate-900 border border-slate-700 text-slate-200 text-sm px-3 py-2 rounded-lg" value={modelType} onChange={e => setModelType(e.target.value)}>
            <option value="random_forest">Random Forest</option>
            <option value="xgboost">XGBoost</option>
          </select>
          <button onClick={startTraining} disabled={training} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {training ? <><Loader2 size={14} className="animate-spin" /> Training…</> : 'Train Model'}
          </button>
        </div>
        {trainMsg && <p className={`w-full text-sm ${trainMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>{trainMsg}</p>}
      </div>

      {error && <div className="bg-red-900/30 border border-red-500/40 text-red-300 p-4 rounded-lg text-sm">{error}</div>}

      {loading ? (
        <div className="text-center py-16 text-slate-500"><Loader2 size={28} className="animate-spin mx-auto mb-2" /><p>Loading metrics…</p></div>
      ) : data?.status === 'not_available' || data?.is_placeholder ? (
        <div className="bg-slate-800/50 border border-amber-500/30 rounded-xl p-8 text-center space-y-3">
          <Brain size={48} className="text-amber-400 mx-auto" />
          <h3 className="text-slate-200 font-semibold text-lg">No trained model available</h3>
          <p className="text-slate-400 text-sm max-w-lg mx-auto">{data?.message ?? 'Train a model using the button above. Real metrics will appear here after training.'}</p>
          <p className="text-slate-500 text-xs">Model training requires the CICIoMT2024 dataset or uses synthetic data for demonstration.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overview Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Accuracy', value: fmt(data.accuracy), color: 'text-cyan-400' },
              { label: 'Precision (macro)', value: fmt(data.precision_macro), color: 'text-blue-400' },
              { label: 'Recall (macro)', value: fmt(data.recall_macro), color: 'text-purple-400' },
              { label: 'F1 (macro)', value: fmt(data.f1_macro), color: 'text-emerald-400' },
            ].map(m => (
              <div key={m.label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <p className="text-slate-400 text-sm">{m.label}</p>
                <p className={`text-3xl font-bold mt-1 ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Additional Stats */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><p className="text-slate-500">False Positive Rate</p><p className="text-slate-200 font-bold">{fmt(data.fpr)}</p></div>
            <div><p className="text-slate-500">False Negative Rate</p><p className="text-slate-200 font-bold">{fmt(data.fnr)}</p></div>
            <div><p className="text-slate-500">Training Duration</p><p className="text-slate-200 font-bold">{fmtSec(data.training_duration_seconds)}</p></div>
            <div><p className="text-slate-500">Training Samples</p><p className="text-slate-200 font-bold">{data.dataset_samples?.toLocaleString() ?? '—'}</p></div>
          </div>

          {/* Per-class metrics */}
          {data.per_class_metrics && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 overflow-x-auto">
              <h3 className="text-slate-200 font-semibold mb-4">Per-Class Metrics</h3>
              <table className="w-full text-sm text-slate-300">
                <thead><tr className="text-slate-500 text-xs">{['Class', 'Precision', 'Recall', 'F1 Score', 'Support'].map(h => <th key={h} className="text-left py-2 pr-6">{h}</th>)}</tr></thead>
                <tbody>
                  {Object.entries(data.per_class_metrics).map(([cls, m]: [string, any]) => (
                    <tr key={cls} className="border-t border-slate-700/30">
                      <td className="py-2 pr-6 font-medium">{cls}</td>
                      <td className="py-2 pr-6">{(m.precision * 100).toFixed(1)}%</td>
                      <td className="py-2 pr-6">{(m.recall * 100).toFixed(1)}%</td>
                      <td className="py-2 pr-6">{(m.f1_score * 100).toFixed(1)}%</td>
                      <td className="py-2 pr-6">{m.support}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Feature Importance */}
          {data.feature_importances && data.feature_importances.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
              <h3 className="text-slate-200 font-semibold mb-4">Top Feature Importances</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.feature_importances.slice(0, 15)} layout="vertical">
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis type="category" dataKey="feature" width={140} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
                  <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                    {data.feature_importances.slice(0, 15).map((_: any, i: number) => (
                      <Cell key={i} fill={CLASS_COLORS[i % CLASS_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Confusion Matrix */}
          {data.confusion_matrix && data.classes && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 overflow-x-auto">
              <h3 className="text-slate-200 font-semibold mb-4">Confusion Matrix</h3>
              <table className="text-xs text-center border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 text-slate-500">Actual \ Predicted</th>
                    {data.classes.map((c: string) => <th key={c} className="p-2 text-slate-400 font-normal">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.confusion_matrix.map((row: number[], i: number) => {
                    const rowTotal = row.reduce((a: number, b: number) => a + b, 0);
                    return (
                      <tr key={i}>
                        <td className="p-2 text-slate-400 font-medium text-left">{data.classes[i]}</td>
                        {row.map((v: number, j: number) => {
                          const intensity = rowTotal > 0 ? v / rowTotal : 0;
                          const bg = i === j ? `rgba(6,182,212,${0.1 + intensity * 0.6})` : intensity > 0.1 ? `rgba(239,68,68,${intensity * 0.5})` : 'transparent';
                          return <td key={j} className="p-2 rounded" style={{ backgroundColor: bg, color: intensity > 0.3 ? '#f1f5f9' : '#64748b', minWidth: 48 }}>{v}</td>;
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
