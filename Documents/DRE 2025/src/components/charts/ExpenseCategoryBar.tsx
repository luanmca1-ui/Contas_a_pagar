import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

type CategoryDatum = {
  name: string;
  total: number;
  percent: number;
};

type ExpenseCategoryBarProps = {
  data: CategoryDatum[];
};

const ExpenseCategoryBar = ({ data }: ExpenseCategoryBarProps) => (
  <section className="rounded-3xl border border-border bg-white/90 p-6 shadow-soft backdrop-blur print-compact">
    <div>
      <h2 className="font-display text-xl font-semibold text-charcoal">Onde o dinheiro vai</h2>
      <p className="text-sm text-slate-500">Top categorias de despesas</p>
    </div>
    <div className="mt-6 h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 20, left: 20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis type="number" tickFormatter={formatCurrency} tick={{ fill: "#6B7280", fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fill: "#6B7280", fontSize: 12 }}
          />
          <Tooltip
            formatter={(value: number, name: string, props) => {
              const payload = props.payload as CategoryDatum;
              return [`${formatCurrency(value)} (${formatPercent(payload.percent)})`, name];
            }}
            contentStyle={{ borderRadius: 12, borderColor: "#E5E7EB" }}
          />
          <Bar dataKey="total" name="Despesas" fill="#C62828" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </section>
);

export default ExpenseCategoryBar;
