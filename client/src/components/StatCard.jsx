export default function StatCard({ label, value, helper, tone = "default" }) {
  const toneClasses =
    tone === "accent"
      ? "from-accent-500/15 to-accent-50 border-accent-200"
      : tone === "warning"
        ? "from-amber-500/15 to-amber-50 border-amber-200"
        : tone === "danger"
          ? "from-rose-500/15 to-rose-50 border-rose-200"
          : "from-slate-500/10 to-white border-slate-200";

  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${toneClasses} p-5 shadow-soft`}>
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
      {helper ? <div className="mt-2 text-sm text-slate-500">{helper}</div> : null}
    </div>
  );
}
