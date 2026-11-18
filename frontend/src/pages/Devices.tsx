import { useEffect, useState } from 'react';
import { Plus, Pencil, X, Check, Monitor } from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import { fetchDevices, createDevice, updateDevice } from '../services/api';

const DEVICE_TYPES = ['ICU Monitor', 'Infusion Pump', 'Wearable Sensor', 'Connected ECG', 'Smart Ventilator', 'Imaging System', 'Pharmacy Dispenser', 'Other'];
const CRITICALITIES = ['Critical', 'High', 'Medium', 'Low'];
const DEPARTMENTS = ['ICU', 'Emergency', 'Cardiology', 'Radiology', 'Oncology', 'Pharmacy', 'General Ward', 'Other'];

const STATUS_COLORS: Record<string, string> = {
  online: 'text-emerald-400',
  offline: 'text-slate-500',
  warning: 'text-amber-400',
};

const EMPTY_FORM = {
  device_id: '', name: '', device_type: 'ICU Monitor', department: 'ICU',
  criticality: 'Medium', ip_address: '', mac_address: '', protocol: 'Wi-Fi / TCP', status: 'online',
};

export default function Devices() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCrit, setFilterCrit] = useState('');
  const [filterType, setFilterType] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const d = await fetchDevices();
      setDevices(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setShowModal(true); };
  const openEdit = (d: any) => {
    setForm({ device_id: d.device_id, name: d.name, device_type: d.device_type, department: d.department, criticality: d.criticality, ip_address: d.ip_address ?? '', mac_address: d.mac_address ?? '', protocol: d.protocol ?? '', status: d.status });
    setEditingId(d.device_id);
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await updateDevice(editingId, form);
      } else {
        await createDevice(form);
      }
      setShowModal(false);
      await load();
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = devices.filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.device_id.toLowerCase().includes(search.toLowerCase());
    const matchCrit = !filterCrit || d.criticality === filterCrit;
    const matchType = !filterType || d.device_type === filterType;
    return matchSearch && matchCrit && matchType;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-100">Medical IoT Devices</h2>
        <button onClick={openAdd} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg transition text-sm font-medium">
          <Plus size={16} /> Add Device
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input className="bg-slate-800 border border-slate-700 text-slate-200 text-sm px-3 py-2 rounded-lg placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-56" placeholder="Search name or ID…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="bg-slate-800 border border-slate-700 text-slate-200 text-sm px-3 py-2 rounded-lg" value={filterCrit} onChange={e => setFilterCrit(e.target.value)}>
          <option value="">All Criticalities</option>
          {CRITICALITIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="bg-slate-800 border border-slate-700 text-slate-200 text-sm px-3 py-2 rounded-lg" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {DEVICE_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {error && <div className="bg-red-900/30 border border-red-500/40 text-red-300 p-4 rounded-lg text-sm">{error}</div>}

      {/* Table */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-300">
            <thead className="bg-slate-700/50">
              <tr className="text-slate-400 text-xs uppercase">
                {['Device ID', 'Name', 'Type', 'Department', 'Criticality', 'Status', 'Risk Score', 'Last Threat', 'Actions'].map(h => (
                  <th key={h} className="text-left py-3 px-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-700/30">
                    {[...Array(9)].map((_, j) => <td key={j} className="py-3 px-4"><div className="h-4 bg-slate-700 rounded animate-pulse" /></td>)}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-slate-500">No devices found</td></tr>
              ) : filtered.map((d) => (
                <tr key={d.device_id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition">
                  <td className="py-3 px-4 font-mono text-xs text-cyan-400">{d.device_id}</td>
                  <td className="py-3 px-4 font-medium text-slate-200">{d.name}</td>
                  <td className="py-3 px-4">{d.device_type}</td>
                  <td className="py-3 px-4">{d.department}</td>
                  <td className="py-3 px-4"><RiskBadge severity={d.criticality} /></td>
                  <td className={`py-3 px-4 font-medium ${STATUS_COLORS[d.status] ?? 'text-slate-400'}`}>{d.status}</td>
                  <td className="py-3 px-4 font-bold text-slate-200">{d.latest_risk_score ?? 0}</td>
                  <td className="py-3 px-4 text-xs">{d.latest_threat || '—'}</td>
                  <td className="py-3 px-4">
                    <button onClick={() => openEdit(d)} className="text-slate-400 hover:text-cyan-400 transition"><Pencil size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-lg space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-slate-100 font-semibold">{editingId ? 'Edit Device' : 'Add Device'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-200"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[['device_id', 'Device ID'], ['name', 'Name'], ['ip_address', 'IP Address'], ['mac_address', 'MAC Address'], ['protocol', 'Protocol']].map(([field, label]) => (
                <div key={field}>
                  <label className="text-slate-400 text-xs mb-1 block">{label}</label>
                  <input disabled={editingId !== null && field === 'device_id'} className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm px-3 py-2 rounded-lg disabled:opacity-50" value={(form as any)[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />
                </div>
              ))}
              {([['device_type', 'Type', DEVICE_TYPES], ['department', 'Department', DEPARTMENTS], ['criticality', 'Criticality', CRITICALITIES], ['status', 'Status', ['online', 'offline', 'warning']]] as [string, string, string[]][]).map(([field, label, opts]) => (
                <div key={field}>
                  <label className="text-slate-400 text-xs mb-1 block">{label}</label>
                  <select className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm px-3 py-2 rounded-lg" value={(form as any)[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}>
                    {opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.device_id || !form.name} className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm disabled:opacity-50 flex items-center gap-2">
                {saving ? 'Saving…' : <><Check size={14} /> Save</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
