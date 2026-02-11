import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";
import { MonthlySummary } from "../lib/aggregate";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type ChartProps = {
  data: MonthlySummary[];
};

const RevenueExpenseProfitChart = ({ data }: ChartProps) => (
  <section className="rounded-3xl border border-border bg-white/90 p-6 shadow-soft backdrop-blur print-compact">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="font-display text-xl font-semibold text-charcoal">Evolucao mensal</h2>
        <p className="text-sm text-slate-500">Faturamento, despesas e lucro</p>
      </div>
    </div>
    <div className="mt-6 h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="10%" stopColor="#2563EB" stopOpacity={0.4} />
              <stop offset="90%" stopColor="#2563EB" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="expGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="10%" stopColor="#111827" stopOpacity={0.35} />
              <stop offset="90%" stopColor="#111827" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="10%" stopColor="#16A34A" stopOpacity={0.35} />
              <stop offset="90%" stopColor="#16A34A" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="month" tick={{ fill: "#6B7280", fontSize: 12 }} />
          <YAxis tickFormatter={formatCurrency} tick={{ fill: "#6B7280", fontSize: 12 }} />
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{ borderRadius: 12, borderColor: "#E5E7EB" }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Faturamento"
            stroke="#2563EB"
            fill="url(#revGradient)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="expenses"
            name="Despesas"
            stroke="#111827"
            fill="url(#expGradient)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="profit"
            name="Lucro"
            stroke="#16A34A"
            fill="url(#profitGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </section>
);

export default RevenueExpenseProfitChart;
