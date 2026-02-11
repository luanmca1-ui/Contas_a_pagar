import { MonthlySummary } from "../lib/aggregate";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

type MonthlySummaryTableProps = {
  data: MonthlySummary[];
};

const MonthlySummaryTable = ({ data }: MonthlySummaryTableProps) => (
  <section className="rounded-3xl border border-border bg-white/90 p-6 shadow-soft backdrop-blur print-compact">
    <h2 className="font-display text-xl font-semibold text-charcoal">Resumo mensal</h2>
    <div className="mt-4 max-h-[420px] overflow-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="sticky top-0 z-10 bg-white text-xs uppercase tracking-widest text-slate-400">
          <tr>
            <th className="py-3">Mês</th>
            <th className="py-3 text-right">Faturado</th>
            <th className="py-3 text-right">Despesas</th>
            <th className="py-3 text-right">% Despesas</th>
            <th className="py-3 text-right">Lucro</th>
            <th className="py-3 text-right">% Lucro</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, index) => (
            <tr key={row.month} className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
              <td className="py-3 font-medium text-charcoal">{row.month}</td>
              <td className="py-3 text-right">{formatCurrency(row.revenue)}</td>
              <td className="py-3 text-right">{formatCurrency(row.expenses)}</td>
              <td className="py-3 text-right">{formatPercent(row.expenseRate)}</td>
              <td className="py-3 text-right">{formatCurrency(row.profit)}</td>
              <td className="py-3 text-right">{formatPercent(row.profitRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

export default MonthlySummaryTable;
