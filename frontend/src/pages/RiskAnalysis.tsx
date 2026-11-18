import { useState } from 'react';
import { AlertTriangle, Calculator } from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import { whatIfAnalysis } from '../services/api';

const THREAT_CATEGORIES = ['DDoS', 'DoS', 'Recon', 'MQTT_Attack', 'Spoofing', 'Benign'];
const CRITICALITIES = ['Critical', 'High', 'Medium', 'Low'];

interface HistoryItem {
  threat: string;
  criticality: string;
  likelihood: number;
  impact: number;
  score: number;
  category: string;
  formula: string;
  implication: string;
  mitigation: string;
}

export default function RiskAnalysis() {
  const [threatCategory, setThreatCategory] = useState('DDoS');
  const [criticality, setCriticality] = useState('Medium');
  const [likelihood, setLikelihood] = useState(3);
  const [impact, setImpact] = useState(3);
  const [useOverrides, setUseOverrides] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const calculate = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: any = {
        device_criticality: criticality,
        threat_category: threatCategory,
      };
      if (useOverrides) {
        payload.likelihood_override = likelihood;
        payload.impact_override = impact;
      }
      const res = await whatIfAnalysis(payload);
      setResult(res);
      setHistory(prev => [{
        threat: res.threat_category,
        criticality: res.device_criticality,
        likelihood: res.calculated_likelihood,
        impact: res.calculated_impact,
        score: res.risk_score,
        category: res.risk_category,
        formula: res.formula_breakdown,
        implication: res.clinical_implication,
        mitigation: res.recommended_mitigation,
      }, ...prev.slice(0, 9)]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (s: number) => {
    if (s >= 75) return 'text-red-400';
    if (s >= 50) return 'text-amber-400';
    if (s >= 25) return 'text-blue-400';
    return 'text-emerald-400';
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-slate-100">What-If Risk Analysis</h2>

      {/* Simulation Banner */}
      <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-300 text-sm">
        <AlertTriangle size={20} className="flex-shrink-0" />
        <p><strong>SIMULATION:</strong> Results are hypothetical scenarios based on configurable rules. They are <em>not</em> detected threats or clinically validated risk ratings. Not for clinical decision-making.</p>
      </div>

      {/* Controls */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-5">
        <h3 className="text-slate-200 font-semibold">Scenario Parameters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="text-slate-400 text-sm mb-1 block">Threat Category</label>
            <select className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg" value={threatCategory} onChange={e => setThreatCategory(e.target.value)}>
              {THREAT_CATEGORIES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-sm mb-1 block">Device Criticality</label>
            <select className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg" value={criticality} onChange={e => setCriticality(e.target.value)}>
              {CRITICALITIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={useOverrides} onChange={e => setUseOverrides(e.target.checked)} className="accent-cyan-500" />
          <span className="text-slate-300 text-sm">Override automatic likelihood & impact values</span>
        </label>

        {useOverrides && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {([['Likelihood', likelihood, setLikelihood], ['Impact', impact, setImpact]] as [string, number, (v: number) => void][]).map(([label, val, setter]) => (
              <div key={label}>
                <label className="text-slate-400 text-sm mb-1 block">{label}: <span className="text-cyan-400 font-bold">{val}</span> / 5</label>
                <input type="range" min={1} max={5} step={1} value={val} onChange={e => setter(Number(e.target.value))} className="w-full accent-cyan-500" />
                <div className="flex justify-between text-slate-600 text-xs mt-1"><span>1 (Min)</span><span>5 (Max)</span></div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={calculate}
          disabled={loading}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2.5 rounded-lg font-medium transition disabled:opacity-50"
        >
          <Calculator size={16} /> {loading ? 'Calculating…' : 'Calculate Risk Score'}
        </button>
      </div>

      {error && <div className="bg-red-900/30 border border-red-500/40 text-red-300 p-4 rounded-lg text-sm">{error}</div>}

      {/* Result */}
      {result && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-200 font-semibold">Risk Assessment Result</h3>
            <RiskBadge severity={result.risk_category} />
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className={`text-7xl font-black ${scoreColor(result.risk_score)}`}>{result.risk_score}</div>
              <div className="text-slate-400 text-sm">Risk Score (0–100)</div>
            </div>
            <div className="flex-1 space-y-2 text-sm">
              <div className="flex justify-between border-b border-slate-700 pb-2">
                <span className="text-slate-400">Threat Category</span>
                <span className="text-slate-200">{result.threat_category}</span>
              </div>
              <div className="flex justify-between border-b border-slate-700 pb-2">
                <span className="text-slate-400">Device Criticality</span>
                <span className="text-slate-200">{result.device_criticality}</span>
              </div>
              <div className="flex justify-between border-b border-slate-700 pb-2">
                <span className="text-slate-400">Likelihood</span>
                <span className="text-slate-200">{result.calculated_likelihood} / 5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Impact</span>
                <span className="text-slate-200">{result.calculated_impact} / 5</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-lg p-4 text-sm space-y-2">
            <p className="text-slate-400 font-mono">{result.formula_breakdown}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs mb-1">Clinical Implication (Hypothetical)</p>
            <p className="text-slate-300 text-sm">{result.clinical_implication}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs mb-1">Recommended Mitigation</p>
            <p className="text-slate-300 text-sm">{result.recommended_mitigation}</p>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-slate-200 font-semibold mb-3">Scenario History (this session)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-300">
              <thead><tr className="text-slate-500 text-xs">{['Threat', 'Criticality', 'L', 'I', 'Score', 'Category'].map(h => <th key={h} className="text-left py-2 pr-4">{h}</th>)}</tr></thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} className="border-t border-slate-700/30">
                    <td className="py-2 pr-4">{h.threat}</td>
                    <td className="py-2 pr-4">{h.criticality}</td>
                    <td className="py-2 pr-4">{h.likelihood}</td>
                    <td className="py-2 pr-4">{h.impact}</td>
                    <td className="py-2 pr-4 font-bold">{h.score}</td>
                    <td className="py-2"><RiskBadge severity={h.category} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
