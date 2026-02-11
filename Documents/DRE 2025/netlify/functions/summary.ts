import type { Handler } from "@netlify/functions";
import Papa from "papaparse";

const EXPENSES_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJwe4jEX741W1d7tfVQp9R2SL_N1S2ug9DN-GK8_UcEUesvq4Bq8y2KLclvDRKAIs6RQo4ndANSr8y/pub?gid=341087654&single=true&output=csv";
const REVENUE_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJwe4jEX741W1d7tfVQp9R2SL_N1S2ug9DN-GK8_UcEUesvq4Bq8y2KLclvDRKAIs6RQo4ndANSr8y/pub?gid=472912926&single=true&output=csv";

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

const sanitizeHeader = (value: string) =>
  value
    .replace(/^\uFEFF/, "")
    .replace(/\u200B/g, "")
    .trim();

const normalizeKey = (value: string) =>
  sanitizeHeader(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/g, "");

const normalizeComparable = (value: string) =>
  value
    .replace(/^\uFEFF/, "")
    .replace(/\u200B/g, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "")
    .trim();

const detectDelimiter = (csvText: string): string => {
  const firstLine = csvText.split(/\r?\n/)[0] ?? "";
  const counts = {
    ",": (firstLine.match(/,/g) || []).length,
    ";": (firstLine.match(/;/g) || []).length,
    "\t": (firstLine.match(/\t/g) || []).length
  };
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : ",";
};

const findHeader = (headers: string[], candidates: string[]) => {
  const normalized = headers.map((header) => ({
    header,
    key: normalizeKey(header),
    raw: sanitizeHeader(header)
  }));
  const targetKeys = candidates.map(normalizeKey);

  if (targetKeys.includes("uf")) {
    const direct = normalized.find((item) => item.raw.toUpperCase() === "UF");
    if (direct) return direct.header;
  }

  for (const key of targetKeys) {
    const match = normalized.find((item) => item.key === key);
    if (match) return match.header;
  }

  for (const key of targetKeys) {
    const match = normalized.find((item) => item.key.includes(key));
    if (match) return match.header;
  }

  return null;
};

const detectExpenseSchema = (headers: string[]) => {
  const warnings: string[] = [];
  const date = findHeader(headers, ["Data", "Date", "Competência", "Competencia", "Mes", "Mês"]);
  const unit = findHeader(headers, ["Unidade", "Unidades", "Loja", "Unit"]);
  const uf = findHeader(headers, ["UF", "Estado", "State"]);
  const value = findHeader(headers, ["Valor", "Value", "Total", "Amount"]);
  const category = findHeader(headers, ["Category", "Categoria"]);
  const detail = findHeader(headers, ["Detalhe", "Detail", "Descricao", "Descrição"]);

  if (!date) warnings.push("Coluna de data não encontrada em despesas.");
  if (!value) warnings.push("Coluna de valor não encontrada em despesas.");
  if (!category) warnings.push("Coluna de categoria não encontrada em despesas.");
  if (!detail) warnings.push("Coluna de detalhe não encontrada em despesas.");
  if (!uf) warnings.push("Coluna UF não encontrada em despesas.");

  return { date, unit, uf, value, category, detail, warnings };
};

const detectRevenueSchema = (headers: string[]) => {
  const warnings: string[] = [];
  const date = findHeader(headers, ["Data", "Date", "Competência", "Competencia", "Mes", "Mês"]);
  const unit = findHeader(headers, ["Unidade", "Unidades", "Loja", "Unit"]);
  const uf = findHeader(headers, ["UF", "Estado", "State"]);
  const total = findHeader(headers, ["Total", "Faturamento", "Receita", "Revenue"]);

  if (!date) warnings.push("Coluna de data não encontrada em faturamento.");
  if (!total) warnings.push("Coluna de total não encontrada em faturamento.");
  if (!uf) warnings.push("Coluna UF não encontrada em faturamento.");

  return { date, unit, uf, total, warnings };
};

const monthMap: Record<string, number> = {
  jan: 1,
  janeiro: 1,
  feb: 2,
  fev: 2,
  fevereiro: 2,
  mar: 3,
  marco: 3,
  março: 3,
  apr: 4,
  abr: 4,
  abril: 4,
  may: 5,
  mai: 5,
  maio: 5,
  jun: 6,
  junho: 6,
  jul: 7,
  julho: 7,
  aug: 8,
  ago: 8,
  agosto: 8,
  sep: 9,
  set: 9,
  setembro: 9,
  oct: 10,
  out: 10,
  outubro: 10,
  nov: 11,
  novembro: 11,
  dec: 12,
  dez: 12,
  dezembro: 12
};

const normalizeValue = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();

const parsePtBrNumber = (raw: string | number | null | undefined): number => {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  const cleaned = raw
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseFlexibleDate = (raw: string | null | undefined) => {
  if (!raw) return { year: null, month: null };
  const value = normalizeValue(String(raw));

  const isoMatch = value.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return { year: Number(isoMatch[1]), month: Number(isoMatch[2]) };
  }

  const brMatch = value.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (brMatch) {
    return { year: Number(brMatch[3]), month: Number(brMatch[2]) };
  }

  const yearMonthMatch = value.match(/(\d{4})[-/](\d{1,2})/);
  if (yearMonthMatch) {
    return { year: Number(yearMonthMatch[1]), month: Number(yearMonthMatch[2]) };
  }

  const monthYearMatch = value.match(/(\d{1,2})[-/](\d{4})/);
  if (monthYearMatch) {
    return { year: Number(monthYearMatch[2]), month: Number(monthYearMatch[1]) };
  }

  const parts = value.split(/\s+/);
  if (parts.length >= 2) {
    const month = monthMap[parts[0]] || monthMap[parts[0].slice(0, 3)];
    const year = Number(parts[1]);
    if (month && Number.isFinite(year)) return { year, month };
  }

  const monthOnly = monthMap[value] || monthMap[value.slice(0, 3)];
  if (monthOnly) return { year: null, month: monthOnly };

  return { year: null, month: null };
};

const buildMonthBuckets = () => Array.from({ length: 12 }, () => 0);

const safeDivide = (num: number, den: number) => (den === 0 ? 0 : num / den);

const normalizeUnit = (value: string | null | undefined) => value?.toString().trim() || "Sem unidade";
const normalizeUf = (value: string | null | undefined) => value?.toString().trim().toUpperCase() || "Sem UF";

const findUfByComparable = (target: string, unitsByUf: Map<string, Set<string>>) => {
  for (const uf of unitsByUf.keys()) {
    if (normalizeComparable(uf) === target) return uf;
  }
  return "Sem UF";
};

export const handler: Handler = async (event) => {
  const queryYear = event.queryStringParameters?.year;
  const queryUf = event.queryStringParameters?.uf || "Todas";
  const queryUnit = event.queryStringParameters?.unit || "Todas";
  const year = queryYear ? Number(queryYear) : 2025;

  try {
    const [expenseResponse, revenueResponse] = await Promise.all([
      fetch(EXPENSES_URL),
      fetch(REVENUE_URL)
    ]);

    if (!expenseResponse.ok || !revenueResponse.ok) {
      throw new Error("Falha ao baixar CSVs.");
    }

    const [expenseCsv, revenueCsv] = await Promise.all([
      expenseResponse.text(),
      revenueResponse.text()
    ]);

    const expenseParsed = Papa.parse<Record<string, string>>(expenseCsv, {
      header: true,
      skipEmptyLines: true,
      delimiter: detectDelimiter(expenseCsv)
    });
    const revenueParsed = Papa.parse<Record<string, string>>(revenueCsv, {
      header: true,
      skipEmptyLines: true,
      delimiter: detectDelimiter(revenueCsv)
    });

    const expenseSchema = detectExpenseSchema(expenseParsed.meta.fields ?? []);
    const revenueSchema = detectRevenueSchema(revenueParsed.meta.fields ?? []);
    const resolveHeader = (row: Record<string, string>, key: string | null, fallback: string) => {
      if (key && key in row) return key;
      const candidate = Object.keys(row).find(
        (header) => normalizeComparable(header) === normalizeComparable(fallback)
      );
      return candidate ?? key;
    };

    const expenseUfKey = resolveHeader(expenseParsed.data[0] ?? {}, expenseSchema.uf, "UF");
    const revenueUfKey = resolveHeader(revenueParsed.data[0] ?? {}, revenueSchema.uf, "UF");

    const warnings = [...expenseSchema.warnings, ...revenueSchema.warnings].filter((w) => {
      if (w.includes("Coluna UF") && (expenseUfKey || revenueUfKey)) return false;
      return true;
    });

    const unitsByUf = new Map<string, Set<string>>();
    const ufs = new Set<string>();

    const expenseMonthly = buildMonthBuckets();
    const revenueMonthly = buildMonthBuckets();
    const expensePivotMap = new Map<string, { category: string; detail: string; monthly: number[]; total: number }>();

    const normalizedUfFilter = normalizeComparable(queryUf);
    const normalizedUnitFilter = normalizeComparable(queryUnit);

    let revenueTotalAll = 0;
    let revenueTotalByUf = 0;

    const ufSummaryMap = new Map<string, { revenue: number; expenses: number }>();

    expenseParsed.data.forEach((row) => {
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

    revenueParsed.data.forEach((row) => {
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
      const expenses = expenseMonthly[index];
      const profit = revenue - expenses;
      return {
        month: label,
        monthIndex: index + 1,
        revenue,
        expenses,
        expenseRate: safeDivide(expenses, revenue),
        profit,
        profitRate: safeDivide(profit, revenue)
      };
    });

    const revenueTotal = revenueMonthly.reduce((sum, value) => sum + value, 0);
    const expenseTotal = expenseMonthly.reduce((sum, value) => sum + value, 0);
    const profitTotal = revenueTotal - expenseTotal;

    const kpis = {
      revenueTotal,
      expenseTotal,
      expenseRate: safeDivide(expenseTotal, revenueTotal),
      profitTotal,
      profitRate: safeDivide(profitTotal, revenueTotal)
    };

    const expensePivot = Array.from(expensePivotMap.entries())
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => b.total - a.total);

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
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=900, s-maxage=900, stale-while-revalidate=600"
      },
      body: JSON.stringify({
        kpis,
        monthlySummary,
        expensePivot,
        unitsList,
        ufsList,
        revenueTotalAll,
        revenueTotalByUf,
        ufSummary,
        warnings,
        updatedAt: new Date().toISOString()
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Falha inesperada."
      })
    };
  }
};
