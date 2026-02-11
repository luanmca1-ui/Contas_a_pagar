import { Fragment, useMemo, useState } from "react";
import { ExpensePivotRow, MonthlySummary } from "../lib/aggregate";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type ExpensePivotTableProps = {
  data: ExpensePivotRow[];
  monthlySummary: MonthlySummary[];
};

const ExpensePivotTable = ({ data, monthlySummary }: ExpensePivotTableProps) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const revenueRow = monthlySummary.map((item) => item.revenue);
  const profitRow = monthlySummary.map((item) => item.profit);
  const revenueTotal = revenueRow.reduce((sum, value) => sum + value, 0);

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { category: string; total: number; monthly: number[]; items: ExpensePivotRow[] }
    >();

    data.forEach((row) => {
      const key = row.category || "Sem categoria";
      if (!map.has(key)) {
        map.set(key, {
          category: key,
          total: 0,
          monthly: Array.from({ length: 12 }, () => 0),
          items: []
        });
      }
      const group = map.get(key)!;
      group.items.push(row);
      group.total += row.total;
      row.monthly.forEach((value, index) => {
        group.monthly[index] += value;
      });
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [data]);

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
  const toggleCategory = (category: string) => {
    setExpanded((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  return (
    <section className="rounded-3xl border border-border bg-white/90 p-6 shadow-soft backdrop-blur print-compact">
      <h2 className="font-display text-xl font-semibold text-charcoal">Pivot de despesas</h2>
      <div className="mt-4 max-h-[520px] overflow-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white text-xs uppercase tracking-widest text-slate-400">
            <tr>
              <th className="py-2">Categoria</th>
              <th className="py-2">Detalhe</th>
              {monthlySummary.map((item) => (
                <th key={item.month} className="py-2 text-right">
                  {item.month}
                </th>
              ))}
              <th className="py-2 text-right">Total</th>
              <th className="py-2 text-right">% do faturamento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {grouped.map((group) => {
              const isExpanded = expanded[group.category] ?? false;
              const percent = revenueTotal ? group.total / revenueTotal : 0;

              return (
                <Fragment key={group.category}>
                  <tr className="bg-slate-50 text-slate-700">
                    <td className="py-3 font-semibold text-charcoal">
                      <button
                        type="button"
                        onClick={() => toggleCategory(group.category)}
                        className="inline-flex items-center justify-center rounded-full border border-border bg-white text-xs font-semibold text-slate-500"
                        style={{ width: 28, height: 28 }}
                        aria-label={isExpanded ? "Recolher detalhes" : "Expandir detalhes"}
                      >
                        {isExpanded ? "−" : "+"}
                      </button>
                      <span className="ml-3">{group.category}</span>
                    </td>
                    <td className="py-3 text-slate-500">Resumo</td>
                    {group.monthly.map((value, index) => (
                      <td key={`${group.category}-${index}`} className="py-3 text-right">
                        {formatCurrency(value)}
                      </td>
                    ))}
                    <td className="py-3 text-right font-semibold text-charcoal">
                      {formatCurrency(group.total)}
                    </td>
                    <td className="py-3 text-right font-semibold text-charcoal">
                      {formatPercent(percent)}
                    </td>
                  </tr>
                  {isExpanded
                    ? group.items.map((row, index) => {
                        const rowPercent = revenueTotal ? row.total / revenueTotal : 0;
                        const zebraClass = index % 2 === 0 ? "bg-white" : "bg-slate-50";
                        return (
                          <tr key={row.key} className={`text-slate-600 ${zebraClass}`}>
                            <td className="py-3 font-medium text-charcoal">{row.category}</td>
                            <td className="py-3">{row.detail}</td>
                            {row.monthly.map((value, monthIndex) => (
                              <td key={`${row.key}-${monthIndex}`} className="py-3 text-right">
                                {formatCurrency(value)}
                              </td>
                            ))}
                            <td className="py-3 text-right font-semibold text-charcoal">
                              {formatCurrency(row.total)}
                            </td>
                            <td className="py-3 text-right font-semibold text-charcoal">
                              {formatPercent(rowPercent)}
                            </td>
                          </tr>
                        );
                      })
                    : null}
                </Fragment>
              );
            })}
            <tr className="bg-white text-slate-700">
              <td className="py-3 font-semibold text-charcoal">Faturado</td>
              <td className="py-3">—</td>
              {revenueRow.map((value, index) => (
                <td key={`rev-${index}`} className="py-3 text-right">
                  {formatCurrency(value)}
                </td>
              ))}
              <td className="py-3 text-right font-semibold text-charcoal">
                {formatCurrency(revenueTotal)}
              </td>
              <td className="py-3 text-right font-semibold text-charcoal">100,0%</td>
            </tr>
            <tr className="bg-white text-slate-700">
              <td className="py-3 font-semibold text-charcoal">Lucro</td>
              <td className="py-3">—</td>
              {profitRow.map((value, index) => (
                <td key={`profit-${index}`} className="py-3 text-right">
                  {formatCurrency(value)}
                </td>
              ))}
              <td className="py-3 text-right font-semibold text-charcoal">
                {formatCurrency(profitRow.reduce((sum, v) => sum + v, 0))}
              </td>
              <td className="py-3 text-right font-semibold text-charcoal">
                {formatPercent(
                  revenueTotal ? profitRow.reduce((sum, v) => sum + v, 0) / revenueTotal : 0
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ExpensePivotTable;
