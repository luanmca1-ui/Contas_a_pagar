import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Line
} from "recharts";
import { MonthlySummary } from "../../lib/aggregate";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

type ChartProps = {
  data: MonthlySummary[];
};

const RevenueVsExpenseBarChart = ({ data }: ChartProps) => (
  <section className="rounded-3xl border border-border bg-white/90 p-6 shadow-soft backdrop-blur print-compact">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="font-display text-xl font-semibold text-charcoal">
          Faturamento x Despesas
        </h2>
        <p className="text-sm text-slate-500">Comparativo mensal + linha de lucro</p>
      </div>
    </div>
    <div className="mt-6 h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="month" tick={{ fill: "#6B7280", fontSize: 12 }} />
          <YAxis tickFormatter={formatCurrency} tick={{ fill: "#6B7280", fontSize: 12 }} />
          <Tooltip
            formatter={(value: number, name: string, props) => {
              if (name === "Despesas") {
                const payload = props.payload as MonthlySummary;
                return [
                  `${formatCurrency(value)} (${formatPercent(payload.expenseRate)})`,
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
          <Line type="monotone" dataKey="profit" name="Lucro" stroke="#16A34A" strokeWidth={2} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </section>
);

export default RevenueVsExpenseBarChart;
