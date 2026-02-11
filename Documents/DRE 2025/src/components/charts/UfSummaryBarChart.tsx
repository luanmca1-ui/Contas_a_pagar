import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";
import { UfSummaryRow } from "../../lib/aggregate";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

type UfSummaryBarChartProps = {
  data: UfSummaryRow[];
};

const UfSummaryBarChart = ({ data }: UfSummaryBarChartProps) => (
  <section className="rounded-3xl border border-border bg-white/90 p-6 shadow-soft backdrop-blur print-compact">
    <div>
      <h2 className="font-display text-xl font-semibold text-charcoal">Resumo por UF</h2>
      <p className="text-sm text-slate-500">Faturamento e despesas por UF</p>
    </div>
    <div className="mt-6 h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="uf" tick={{ fill: "#6B7280", fontSize: 12 }} />
          <YAxis tickFormatter={formatCurrency} tick={{ fill: "#6B7280", fontSize: 12 }} />
          <Tooltip
            formatter={(value: number, name: string, props) => {
              const payload = props.payload as UfSummaryRow;
              if (name === "Despesas") {
                return [
                  `${formatCurrency(value)} (${formatPercent(payload.expenseRate)})`,
                  name
                ];
              }
              if (name === "Lucro") {
                return [
                  `${formatCurrency(value)} (${formatPercent(payload.profitRate)})`,
                  name
                ];
              }
              return [formatCurrency(value), name];
            }}
            contentStyle={{ borderRadius: 12, borderColor: "#E5E7EB" }}
          />
          <Legend />
          <Bar dataKey="revenue" name="Faturamento" fill="#2563EB" radius={[6, 6, 0, 0]} />
          <Bar dataKey="expenses" name="Despesas" fill="#111827" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </section>
);

export default UfSummaryBarChart;
