import { MonthlySummary } from "../../lib/aggregate";

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

const getTone = (value: number) => {
  if (value < 0) return "bg-danger/15 text-danger";
  if (value <= 0.1) return "bg-warning/20 text-warning";
  return "bg-success/15 text-success";
};

type MarginHeatmapProps = {
  data: MonthlySummary[];
};

const MarginHeatmap = ({ data }: MarginHeatmapProps) => (
  <section className="rounded-3xl border border-border bg-white/90 p-6 shadow-soft backdrop-blur print-compact">
    <div>
      <h2 className="font-display text-xl font-semibold text-charcoal">Mapa de margem</h2>
      <p className="text-sm text-slate-500">Margem por mês</p>
    </div>
    <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {data.map((item) => (
        <div
          key={item.month}
          className={`flex flex-col items-center justify-center rounded-2xl border border-border p-3 ${getTone(
            item.profitRate
          )}`}
        >
          <span className="text-xs uppercase tracking-[0.25em] text-slate-400">{item.month}</span>
          <span className="mt-2 text-sm font-semibold">{formatPercent(item.profitRate)}</span>
        </div>
      ))}
    </div>
  </section>
);

export default MarginHeatmap;
