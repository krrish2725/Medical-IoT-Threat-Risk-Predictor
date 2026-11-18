const SEVERITY_CLASSES: Record<string, string> = {
  Critical: 'bg-red-500/20 text-red-400 border border-red-500/30',
  High: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  Medium: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  Low: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  Benign: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
};

export default function RiskBadge({ severity }: { severity: string }) {
  const cls = SEVERITY_CLASSES[severity] ?? 'bg-slate-700 text-slate-300 border border-slate-600';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {severity}
    </span>
  );
}
