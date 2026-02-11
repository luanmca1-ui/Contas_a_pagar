import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from "recharts";
import { MonthlySummary } from "../../lib/aggregate";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type ChartProps = {
  data: MonthlySummary[];
};

const ProfitLineChart = ({ data }: ChartProps) => (
  <section className="rounded-3xl border border-border bg-white/90 p-6 shadow-soft backdrop-blur print-compact">
    <div>
      <h2 className="font-display text-xl font-semibold text-charcoal">Lucro mensal</h2>
      <p className="text-sm text-slate-500">Linha com referência zero</p>
    </div>
    <div className="mt-6 h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="month" tick={{ fill: "#6B7280", fontSize: 12 }} />
          <YAxis tickFormatter={formatCurrency} tick={{ fill: "#6B7280", fontSize: 12 }} />
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{ borderRadius: 12, borderColor: "#E5E7EB" }}
          />
          <ReferenceLine y={0} stroke="#DC2626" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="profit"
            name="Lucro"
            stroke="#16A34A"
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, payload } = props;
              const color = payload.profit >= 0 ? "#16A34A" : "#DC2626";
              return <circle cx={cx} cy={cy} r={4} fill={color} stroke="white" strokeWidth={1} />;
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </section>
);

export default ProfitLineChart;
