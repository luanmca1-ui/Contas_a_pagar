import { MonthlySummary, Kpis } from "../lib/aggregate";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

type InsightsProps = {
  monthly: MonthlySummary[];
  kpis: Kpis;
  uf?: string;
  revenueTotalAll: number;
  revenueTotalByUf: number;
};

const Insights = ({ monthly, kpis, uf, revenueTotalAll, revenueTotalByUf }: InsightsProps) => {
  const insights: string[] = [];

  if (monthly.length) {
    const bestRevenue = monthly.reduce(
      (acc, item) => (item.revenue > acc.revenue ? item : acc),
      monthly[0]
    );

    if (bestRevenue.revenue) {
      insights.push(`Maior faturamento em: ${bestRevenue.month} — ${formatCurrency(bestRevenue.revenue)}`);
    }

    const worstExpenseRate = monthly.reduce(
      (acc, item) => (item.expenseRate > acc.expenseRate ? item : acc),
      monthly[0]
    );

    if (worstExpenseRate.expenseRate) {
      insights.push(
        `Maior % de despesas em: ${worstExpenseRate.month} — ${formatPercent(
          worstExpenseRate.expenseRate
        )}`
      );
    }
  }

  if (kpis.revenueTotal || kpis.profitTotal) {
    insights.push(
      `Lucro acumulado no ano: ${formatCurrency(kpis.profitTotal)} (margem média ${formatPercent(
        kpis.profitRate
      )})`
    );
  }

  if (uf && uf !== "Todas" && revenueTotalAll > 0) {
    const share = revenueTotalByUf / revenueTotalAll;
    insights.push(`A UF ${uf} representa ${formatPercent(share)} do faturamento do ano.`);
  }

  if (!insights.length) return null;

  return (
    <section className="rounded-3xl border border-border bg-white/90 p-6 shadow-soft backdrop-blur print-compact">
      <h2 className="font-display text-xl font-semibold text-charcoal">Insights 2025</h2>
      <ul className="mt-4 space-y-2 text-sm text-slate-600">
        {insights.map((item) => (
          <li key={item} className="rounded-xl border border-border bg-white px-4 py-3">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default Insights;
