export default function ChartPanel({ title, subtitle, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-soft ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}
