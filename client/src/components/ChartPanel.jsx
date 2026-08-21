export default function ChartPanel({ title, subtitle, children, className = "" }) {
  return (
    <section className={`surface-card rounded-2xl border border-slate-200 bg-white p-5 md:p-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}
