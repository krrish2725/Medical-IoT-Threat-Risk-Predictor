import { useState, useRef } from 'react';
import { UploadCloud, X, Play, Download, AlertTriangle } from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import { predictBatch } from '../services/api';

const ATTACK_COLORS: Record<string, string> = {
  DDoS: 'text-red-400', DoS: 'text-orange-400', Spoofing: 'text-purple-400',
  MQTT_Attack: 'text-cyan-400', Recon: 'text-yellow-400', Benign: 'text-emerald-400',
};

export default function ThreatDetection() {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [filterAttack, setFilterAttack] = useState('');
  const [filterRisk, setFilterRisk] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | null) => {
    if (!f) return;
    setResult(null);
    setApiError(null);
    if (!f.name.endsWith('.csv')) { setFileError('Only CSV files are supported.'); return; }
    if (f.size > 50 * 1024 * 1024) { setFileError('File exceeds 50 MB limit.'); return; }
    setFileError(null);
    setFile(f);
    // Parse first 5 rows for preview
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(Boolean);
      if (lines.length < 2) { setFileError('CSV has no data rows.'); return; }
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1, 6).map(l => {
        const vals = l.split(',');
        return Object.fromEntries(headers.map((h, i) => [h, vals[i]?.trim() ?? '']));
      });
      setPreviewHeaders(headers.slice(0, 10));
      setPreviewRows(rows);
    };
    reader.readAsText(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0] ?? null);
  };

  const runAnalysis = async () => {
    if (!file) return;
    setRunning(true);
    setApiError(null);
    try {
      const res = await predictBatch(file);
      setResult(res);
    } catch (e: any) {
      setApiError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const exportCsv = () => {
    if (!result) return;
    const headers = ['Row', 'Label', 'Attack Type', 'Risk Score', 'Risk Category', 'Confidence'];
    const rows = result.results.map((r: any) => [r.row_index, r.predicted_label, r.predicted_attack_type, r.risk_score, r.risk_category, r.confidence]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'predictions.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const filteredResults = result?.results?.filter((r: any) => {
    const matchA = !filterAttack || r.predicted_attack_type === filterAttack;
    const matchR = !filterRisk || r.risk_category === filterRisk;
    return matchA && matchR;
  }) ?? [];

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-slate-100">Threat Detection & Classification</h2>

      {/* Upload area */}
      <div
        className="border-2 border-dashed border-slate-600 rounded-xl p-10 text-center hover:border-cyan-500 transition cursor-pointer bg-slate-800/30"
        onClick={() => fileRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
      >
        <UploadCloud size={40} className="mx-auto text-slate-500 mb-3" />
        <p className="text-slate-300 font-medium">Drop a CSV file here or click to browse</p>
        <p className="text-slate-500 text-sm mt-1">Max 50 MB · Max 10,000 rows · CSV only</p>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => handleFile(e.target.files?.[0] ?? null)} />
      </div>

      {fileError && <div className="bg-red-900/30 border border-red-500/40 text-red-300 p-3 rounded-lg text-sm">{fileError}</div>}

      {file && !fileError && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex justify-between items-center">
          <div>
            <p className="text-slate-200 font-medium">{file.name}</p>
            <p className="text-slate-400 text-sm">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setFile(null); setPreviewRows([]); setResult(null); }} className="text-slate-500 hover:text-slate-200"><X size={18} /></button>
            <button onClick={runAnalysis} disabled={running} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              <Play size={14} /> {running ? 'Analyzing…' : 'Run Analysis'}
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      {previewRows.length > 0 && !result && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <h3 className="text-slate-200 font-semibold mb-3 text-sm">Preview (first 5 rows, first 10 columns)</h3>
          <div className="overflow-x-auto">
            <table className="text-xs text-slate-300">
              <thead><tr>{previewHeaders.map(h => <th key={h} className="px-3 py-1 text-left text-slate-500 font-mono">{h}</th>)}</tr></thead>
              <tbody>{previewRows.map((row, i) => <tr key={i}>{previewHeaders.map(h => <td key={h} className="px-3 py-1 font-mono">{row[h]}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {apiError && <div className="bg-red-900/30 border border-red-500/40 text-red-300 p-4 rounded-lg text-sm">Error: {apiError}</div>}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Records', val: result.total_records, color: 'text-slate-200' },
              { label: 'Attacks', val: result.attack_count, color: 'text-red-400' },
              { label: 'Benign', val: result.benign_count, color: 'text-emerald-400' },
              { label: 'High / Critical', val: result.high_critical_count, color: 'text-amber-400' },
            ].map(item => (
              <div key={item.label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
                <p className="text-slate-400 text-sm">{item.label}</p>
                <p className={`text-3xl font-bold ${item.color}`}>{item.val}</p>
              </div>
            ))}
          </div>

          {/* Distribution */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <h3 className="text-slate-200 font-semibold mb-3 text-sm">Attack Distribution</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(result.distribution).map(([k, v]: [string, any]) => (
                <span key={k} className={`px-3 py-1 rounded-full text-sm font-medium bg-slate-700/50 ${ATTACK_COLORS[k] ?? 'text-slate-300'}`}>
                  {k}: <span className="font-bold">{v}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Filters + table */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
              <div className="flex gap-3">
                <select className="bg-slate-800 border border-slate-700 text-slate-200 text-sm px-3 py-1.5 rounded-lg" value={filterAttack} onChange={e => setFilterAttack(e.target.value)}>
                  <option value="">All Attacks</option>
                  {Object.keys(result.distribution).map(k => <option key={k}>{k}</option>)}
                </select>
                <select className="bg-slate-800 border border-slate-700 text-slate-200 text-sm px-3 py-1.5 rounded-lg" value={filterRisk} onChange={e => setFilterRisk(e.target.value)}>
                  <option value="">All Risk Levels</option>
                  {['Critical', 'High', 'Medium', 'Low'].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <button onClick={exportCsv} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg text-sm">
                <Download size={14} /> Export CSV
              </button>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm text-slate-300">
                <thead className="sticky top-0 bg-slate-700/80">
                  <tr className="text-slate-400 text-xs">
                    {['Row', 'Label', 'Attack Type', 'Confidence', 'Risk Score', 'Risk Level'].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((r: any) => (
                    <tr key={r.row_index} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                      <td className="py-2 px-3 text-slate-500">#{r.row_index}</td>
                      <td className={`py-2 px-3 font-medium ${r.predicted_label === 'Attack' ? 'text-red-400' : 'text-emerald-400'}`}>{r.predicted_label}</td>
                      <td className={`py-2 px-3 ${ATTACK_COLORS[r.predicted_attack_type] ?? ''}`}>{r.predicted_attack_type}</td>
                      <td className="py-2 px-3">{(r.confidence * 100).toFixed(1)}%</td>
                      <td className="py-2 px-3 font-bold">{r.risk_score}</td>
                      <td className="py-2 px-3"><RiskBadge severity={r.risk_category} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredResults.length === 0 && <p className="text-center py-6 text-slate-500">No matching results</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
