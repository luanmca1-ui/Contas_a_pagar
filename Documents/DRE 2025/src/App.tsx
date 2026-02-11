import { useEffect, useMemo, useState } from "react";
import Filters from "./components/Filters";
import KPIGrid from "./components/KPIGrid";
import MonthlySummaryTable from "./components/MonthlySummaryTable";
import ExpensePivotTable from "./components/ExpensePivotTable";
import Insights from "./components/Insights";
import AlertBanner from "./components/AlertBanner";
import RevenueVsExpenseBarChart from "./components/charts/RevenueVsExpenseBarChart";
import ProfitLineChart from "./components/charts/ProfitLineChart";
import MarginHeatmap from "./components/charts/MarginHeatmap";
import ExpenseCategoryBar from "./components/charts/ExpenseCategoryBar";
import UfSummaryBarChart from "./components/charts/UfSummaryBarChart";
import { fetchCsv } from "./lib/fetchCsv";
import { parseCsv } from "./lib/parseCsv";
import { aggregateData, AggregatedData, ExpenseRow, RevenueRow } from "./lib/aggregate";

const EXPENSES_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJwe4jEX741W1d7tfVQp9R2SL_N1S2ug9DN-GK8_UcEUesvq4Bq8y2KLclvDRKAIs6RQo4ndANSr8y/pub?gid=341087654&single=true&output=csv";
const REVENUE_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJwe4jEX741W1d7tfVQp9R2SL_N1S2ug9DN-GK8_UcEUesvq4Bq8y2KLclvDRKAIs6RQo4ndANSr8y/pub?gid=472912926&single=true&output=csv";

const YEAR = 2025;

const App = () => {
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [revenues, setRevenues] = useState<RevenueRow[]>([]);
  const [expenseHeaders, setExpenseHeaders] = useState<string[]>([]);
  const [revenueHeaders, setRevenueHeaders] = useState<string[]>([]);
  const [selectedUf, setSelectedUf] = useState("Todas");
  const [selectedUnit, setSelectedUnit] = useState("Todas");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useFunction, setUseFunction] = useState(false);
  const [functionData, setFunctionData] = useState<AggregatedData | null>(null);
  const [updatedAt, setUpdatedAt] = useState(new Date());

  const clientAggregated = useMemo(() => {
    if (!expenses.length && !revenues.length) return null;
    return aggregateData(
      expenses,
      revenues,
      YEAR,
      selectedUf,
      selectedUnit,
      expenseHeaders,
      revenueHeaders
    );
  }, [expenses, revenues, selectedUf, selectedUnit, expenseHeaders, revenueHeaders]);

  const data = useFunction ? functionData : clientAggregated;

  const categoryBarData = useMemo(() => {
    if (!data) return [] as { name: string; total: number; percent: number }[];
    const total = data.expensePivot.reduce((sum, row) => sum + row.total, 0);
    const byCategory = new Map<string, number>();
    data.expensePivot.forEach((row) => {
      byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + row.total);
    });

    const sorted = Array.from(byCategory.entries())
      .map(([name, value]) => ({ name, total: value }))
      .sort((a, b) => b.total - a.total);

    const top = sorted.slice(0, 6);
    const rest = sorted.slice(6);
    const othersTotal = rest.reduce((sum, item) => sum + item.total, 0);
    const result = [...top];
    if (othersTotal > 0) {
      result.push({ name: "Outros", total: othersTotal });
    }

    return result.map((item) => ({
      ...item,
      percent: total ? item.total / total : 0
    }));
  }, [data]);

  const loadClientData = async () => {
    try {
      const [expenseText, revenueText] = await Promise.all([
        fetchCsv(EXPENSES_URL, "expenses"),
        fetchCsv(REVENUE_URL, "revenues")
      ]);

      const expenseParsed = parseCsv(expenseText);
      const revenueParsed = parseCsv(revenueText);

      if (!expenseParsed.data.length || !revenueParsed.data.length) {
        throw new Error("CSV sem registros.");
      }

      setExpenses(expenseParsed.data);
      setRevenues(revenueParsed.data);
      setExpenseHeaders(expenseParsed.fields ?? []);
      setRevenueHeaders(revenueParsed.fields ?? []);
      setUpdatedAt(new Date());
      setLoading(false);
    } catch (err) {
      throw err instanceof Error ? err : new Error("Falha ao carregar CSVs.");
    }
  };

  const loadFunctionData = async (uf: string, unit: string) => {
    const url = `/.netlify/functions/summary?year=${YEAR}&uf=${encodeURIComponent(
      uf
    )}&unit=${encodeURIComponent(unit)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Falha ao carregar dados via função.");
    }
    const payload = (await response.json()) as AggregatedData & { updatedAt?: string };
    if (!payload) throw new Error("Resposta inválida da função.");
    setFunctionData(payload);
    if (payload.updatedAt) {
      setUpdatedAt(new Date(payload.updatedAt));
    } else {
      setUpdatedAt(new Date());
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        await loadClientData();
      } catch (err) {
        setUseFunction(true);
        try {
          await loadFunctionData(selectedUf, selectedUnit);
        } catch (fallbackError) {
          setError(
            fallbackError instanceof Error
              ? fallbackError.message
              : "Falha ao carregar dados."
          );
        } finally {
          setLoading(false);
        }
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (!useFunction) return;

    const refresh = async () => {
      setLoading(true);
      setError(null);
      try {
        await loadFunctionData(selectedUf, selectedUnit);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao atualizar dados.");
      } finally {
        setLoading(false);
      }
    };

    refresh();
  }, [selectedUf, selectedUnit, useFunction]);

  const units = data?.unitsList?.length ? data.unitsList : ["Todas"];
  const ufs = data?.ufsList?.length ? data.ufsList : ["Todas"];

  useEffect(() => {
    if (units.length && !units.includes(selectedUnit)) {
      setSelectedUnit("Todas");
    }
  }, [units, selectedUnit]);

  useEffect(() => {
    if (ufs.length && !ufs.includes(selectedUf)) {
      setSelectedUf("Todas");
    }
  }, [ufs, selectedUf]);

  const formattedDate = updatedAt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8">
      <Filters
        ufs={ufs}
        selectedUf={selectedUf}
        onUfChange={(value) => {
          setSelectedUf(value);
          setSelectedUnit("Todas");
        }}
        units={units}
        selectedUnit={selectedUnit}
        onUnitChange={setSelectedUnit}
        updatedAt={formattedDate}
      />

      {error && (
        <div className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {data?.warnings?.length ? <AlertBanner messages={data.warnings} /> : null}

      {loading || !data ? (
        <div className="rounded-3xl border border-border bg-white/90 p-6 text-sm text-slate-500 shadow-soft">
          Carregando dados...
        </div>
      ) : (
        <>
          <KPIGrid kpis={data.kpis} />

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <RevenueVsExpenseBarChart data={data.monthlySummary} />
            <Insights
              monthly={data.monthlySummary}
              kpis={data.kpis}
              uf={selectedUf}
              revenueTotalAll={data.revenueTotalAll}
              revenueTotalByUf={data.revenueTotalByUf}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ProfitLineChart data={data.monthlySummary} />
            <MarginHeatmap data={data.monthlySummary} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ExpenseCategoryBar data={categoryBarData} />
            <UfSummaryBarChart data={data.ufSummary} />
          </div>

          <MonthlySummaryTable data={data.monthlySummary} />

          <ExpensePivotTable data={data.expensePivot} monthlySummary={data.monthlySummary} />
        </>
      )}

      <footer className="print-hidden text-center text-xs text-slate-400">
        Atualização via {useFunction ? "Netlify Function" : "CSV direto"} • Ano {YEAR}
      </footer>
    </div>
  );
};

export default App;
