import { Kpis } from "../lib/aggregate";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

type KPIGridProps = {
  kpis: Kpis;
};

const KPIGrid = ({ kpis }: KPIGridProps) => {
  const profitPositive = kpis.profitTotal >= 0;
  const items = [
    {
      label: "Faturamento",
      value: formatCurrency(kpis.revenueTotal),
      foot: "Soma da coluna Total",
      accent: "text-revenue",
      tooltip: "Soma da coluna Total"
    },
    {
      label: "Despesas",
      value: formatCurrency(kpis.expenseTotal),
      foot: `% do faturamento ${formatPercent(kpis.expenseRate)}`,
      accent: "text-expense",
      tooltip: "Soma da coluna Valor"
    },
    {
      label: "Lucro",
      value: formatCurrency(kpis.profitTotal),
      foot: `Margem ${formatPercent(kpis.profitRate)}`,
      accent: profitPositive ? "text-success" : "text-danger",
      tooltip: "Faturamento - Despesas"
    },
    {
      label: "Margem",
      value: formatPercent(kpis.profitRate),
      foot: "Lucro / Faturamento",
      accent: profitPositive ? "text-success" : "text-danger",
      tooltip: "Lucro dividido pelo faturamento"
    }
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-3xl border border-border bg-white/90 p-5 shadow-soft backdrop-blur print-compact"
          title={item.tooltip}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              {item.label}
            </span>
            <span className={`text-sm font-semibold ${item.accent}`}>2025</span>
          </div>
          <div className="mt-4 text-3xl font-semibold text-charcoal">{item.value}</div>
          <div className="mt-2 text-sm text-slate-500">{item.foot}</div>
        </div>
      ))}
    </section>
  );
};

export default KPIGrid;
