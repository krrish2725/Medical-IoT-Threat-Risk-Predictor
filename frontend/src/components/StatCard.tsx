interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent?: string;
  subtitle?: string;
}

export default function StatCard({ label, value, icon, accent = 'text-cyan-400', subtitle }: StatCardProps) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 flex items-center space-x-4">
      <div className={`${accent} flex-shrink-0`}>{icon}</div>
      <div>
        <p className="text-slate-400 text-sm">{label}</p>
        <p className={`text-2xl font-bold ${accent}`}>{value}</p>
        {subtitle && <p className="text-slate-500 text-xs mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
