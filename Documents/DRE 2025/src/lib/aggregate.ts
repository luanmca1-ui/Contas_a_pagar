import {
  parseFlexibleDate,
  parsePtBrNumber,
  normalizeUnit,
  normalizeUf,
  normalizeComparable
} from "./normalize";
import { detectExpenseSchema, detectRevenueSchema } from "./schemaDetect";

export type ExpenseRow = Record<string, string>;
export type RevenueRow = Record<string, string>;

export type MonthlySummary = {
  month: string;
  monthIndex: number;
  revenue: number;
  expenses: number;
  expenseRate: number;
  profit: number;
  profitRate: number;
};

export type ExpensePivotRow = {
  key: string;
  category: string;
  detail: string;
  monthly: number[];
  total: number;
};

export type Kpis = {
  revenueTotal: number;
  expenseTotal: number;
  expenseRate: number;
  profitTotal: number;
  profitRate: number;
};

export type UfSummaryRow = {
  uf: string;
  revenue: number;
  expenses: number;
  profit: number;
  expenseRate: number;
  profitRate: number;
};

export type AggregatedData = {
  kpis: Kpis;
  monthlySummary: MonthlySummary[];
  expensePivot: ExpensePivotRow[];
  unitsList: string[];
  ufsList: string[];
  revenueTotalAll: number;
  revenueTotalByUf: number;
  ufSummary: UfSummaryRow[];
  warnings: string[];
};

const monthLabels = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez"
];

const buildMonthBuckets = () => Array.from({ length: 12 }, () => 0);

const safeDivide = (num: number, den: number) => (den === 0 ? 0 : num / den);

const findUfByComparable = (target: string, unitsByUf: Map<string, Set<string>>) => {
  for (const uf of unitsByUf.keys()) {
    if (normalizeComparable(uf) === target) return uf;
  }
  return "Sem UF";
};

export const aggregateData = (
  expenses: ExpenseRow[],
  revenues: RevenueRow[],
  year: number,
  ufFilter: string,
  unitFilter: string,
  expenseHeaders?: string[],
  revenueHeaders?: string[]
): AggregatedData => {
  const expenseSchema = detectExpenseSchema(expenseHeaders?.length ? expenseHeaders : Object.keys(expenses[0] ?? {}));
  const revenueSchema = detectRevenueSchema(revenueHeaders?.length ? revenueHeaders : Object.keys(revenues[0] ?? {}));

  const resolveHeader = (row: Record<string, string>, key: string | null, fallback: string) => {
    if (key && key in row) return key;
    const candidate = Object.keys(row).find(
      (header) => normalizeComparable(header) === normalizeComparable(fallback)
    );
    return candidate ?? key;
  };

  const expenseUfKey = resolveHeader(expenses[0] ?? {}, expenseSchema.uf, "UF");
  const revenueUfKey = resolveHeader(revenues[0] ?? {}, revenueSchema.uf, "UF");

  const warnings = [...expenseSchema.warnings, ...revenueSchema.warnings]
    .filter((w) => {
      if (w.field === "UF" && (expenseUfKey || revenueUfKey)) return false;
      return true;
    })
    .map((w) => w.message);

  const unitsByUf = new Map<string, Set<string>>();
  const ufs = new Set<string>();

  const expenseMonthly = buildMonthBuckets();
  const revenueMonthly = buildMonthBuckets();
  const expensePivotMap = new Map<string, ExpensePivotRow>();

  const normalizedUfFilter = normalizeComparable(ufFilter);
  const normalizedUnitFilter = normalizeComparable(unitFilter);

  let revenueTotalAll = 0;
  let revenueTotalByUf = 0;

  const ufSummaryMap = new Map<string, { revenue: number; expenses: number }>();

  expenses.forEach((row) => {
    const unit = normalizeUnit(expenseSchema.unit ? row[expenseSchema.unit] : "");
    const uf = normalizeUf(expenseUfKey ? row[expenseUfKey] : "");
    if (uf && uf !== "Sem UF") ufs.add(uf);
    if (!unitsByUf.has(uf)) unitsByUf.set(uf, new Set<string>());
    if (unit) unitsByUf.get(uf)!.add(unit);

    const ufComparable = normalizeComparable(uf);
    const unitComparable = normalizeComparable(unit);

    if (normalizedUfFilter !== "todas" && ufComparable !== normalizedUfFilter) return;
    if (normalizedUnitFilter !== "todas" && unitComparable !== normalizedUnitFilter) return;

    const date = parseFlexibleDate(expenseSchema.date ? row[expenseSchema.date] : "");
    if (date.year !== year || !date.month) return;

    const monthIndex = date.month - 1;
    const value = parsePtBrNumber(expenseSchema.value ? row[expenseSchema.value] : 0);
    expenseMonthly[monthIndex] += value;

    if (!ufSummaryMap.has(uf)) ufSummaryMap.set(uf, { revenue: 0, expenses: 0 });
    ufSummaryMap.get(uf)!.expenses += value;

    const category = expenseSchema.category ? row[expenseSchema.category] : "Sem categoria";
    const detail = expenseSchema.detail ? row[expenseSchema.detail] : "";
    const key = `${category}::${detail}`.trim();

    if (!expensePivotMap.has(key)) {
      expensePivotMap.set(key, {
        key,
        category: category || "Sem categoria",
        detail: detail || "",
        monthly: buildMonthBuckets(),
        total: 0
      });
    }

    const pivotRow = expensePivotMap.get(key)!;
    pivotRow.monthly[monthIndex] += value;
    pivotRow.total += value;
  });

  revenues.forEach((row) => {
    const unit = normalizeUnit(revenueSchema.unit ? row[revenueSchema.unit] : "");
    const uf = normalizeUf(revenueUfKey ? row[revenueUfKey] : "");
    if (uf && uf !== "Sem UF") ufs.add(uf);
    if (!unitsByUf.has(uf)) unitsByUf.set(uf, new Set<string>());
    if (unit) unitsByUf.get(uf)!.add(unit);

    const ufComparable = normalizeComparable(uf);
    const unitComparable = normalizeComparable(unit);

    const date = parseFlexibleDate(revenueSchema.date ? row[revenueSchema.date] : "");
    if (date.year !== year || !date.month) return;

    const monthIndex = date.month - 1;
    const value = parsePtBrNumber(revenueSchema.total ? row[revenueSchema.total] : 0);

    revenueTotalAll += value;
    if (normalizedUfFilter === "todas" || ufComparable === normalizedUfFilter) {
      revenueTotalByUf += value;
    }

    if (normalizedUfFilter !== "todas" && ufComparable !== normalizedUfFilter) return;
    if (normalizedUnitFilter !== "todas" && unitComparable !== normalizedUnitFilter) return;

    revenueMonthly[monthIndex] += value;

    if (!ufSummaryMap.has(uf)) ufSummaryMap.set(uf, { revenue: 0, expenses: 0 });
    ufSummaryMap.get(uf)!.revenue += value;
  });

  const monthlySummary = monthLabels.map((label, index) => {
    const revenue = revenueMonthly[index];
    const expensesValue = expenseMonthly[index];
    const profit = revenue - expensesValue;
    return {
      month: label,
      monthIndex: index + 1,
      revenue,
      expenses: expensesValue,
      expenseRate: safeDivide(expensesValue, revenue),
      profit,
      profitRate: safeDivide(profit, revenue)
    };
  });

  const revenueTotal = revenueMonthly.reduce((sum, value) => sum + value, 0);
  const expenseTotal = expenseMonthly.reduce((sum, value) => sum + value, 0);
  const profitTotal = revenueTotal - expenseTotal;

  const kpis: Kpis = {
    revenueTotal,
    expenseTotal,
    expenseRate: safeDivide(expenseTotal, revenueTotal),
    profitTotal,
    profitRate: safeDivide(profitTotal, revenueTotal)
  };

  const expensePivot = Array.from(expensePivotMap.values()).sort((a, b) => b.total - a.total);
  const ufKey = normalizedUfFilter === "todas" ? null : normalizedUfFilter;
  const unitsForUf = ufKey
    ? Array.from(unitsByUf.get(findUfByComparable(ufKey, unitsByUf)) ?? [])
    : Array.from(unitsByUf.values()).flatMap((set) => Array.from(set));

  const unitsList = ["Todas", ...Array.from(new Set(unitsForUf)).filter(Boolean).sort()];
  const ufsList = ["Todas", ...Array.from(ufs).filter(Boolean).sort()];

  const ufSummary = Array.from(ufSummaryMap.entries())
    .filter(([uf]) => uf && uf !== "Sem UF")
    .map(([uf, totals]) => {
      const profit = totals.revenue - totals.expenses;
      return {
        uf,
        revenue: totals.revenue,
        expenses: totals.expenses,
        profit,
        expenseRate: safeDivide(totals.expenses, totals.revenue),
        profitRate: safeDivide(profit, totals.revenue)
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  return {
    kpis,
    monthlySummary,
    expensePivot,
    unitsList,
    ufsList,
    revenueTotalAll,
    revenueTotalByUf,
    ufSummary,
    warnings
  };
};
