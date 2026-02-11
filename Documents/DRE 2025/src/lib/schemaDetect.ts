export type SchemaWarning = {
  field: string;
  message: string;
};

export type ExpenseSchema = {
  date: string | null;
  unit: string | null;
  uf: string | null;
  value: string | null;
  category: string | null;
  detail: string | null;
  warnings: SchemaWarning[];
};

export type RevenueSchema = {
  date: string | null;
  unit: string | null;
  uf: string | null;
  total: string | null;
  warnings: SchemaWarning[];
};

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

export const detectExpenseSchema = (headers: string[]): ExpenseSchema => {
  const warnings: SchemaWarning[] = [];
  const date = findHeader(headers, ["Data", "Date", "Competência", "Competencia", "Mes", "Mês"]);
  const unit = findHeader(headers, ["Unidade", "Unidades", "Loja", "Unit"]);
  const uf = findHeader(headers, ["UF", "Estado", "State"]);
  const value = findHeader(headers, ["Valor", "Value", "Total", "Amount"]);
  const category = findHeader(headers, ["Category", "Categoria"]);
  const detail = findHeader(headers, ["Detalhe", "Detail", "Descricao", "Descrição"]);

  if (!date) warnings.push({ field: "Data", message: "Coluna de data não encontrada em despesas." });
  if (!value) warnings.push({ field: "Valor", message: "Coluna de valor não encontrada em despesas." });
  if (!category) warnings.push({ field: "Categoria", message: "Coluna de categoria não encontrada em despesas." });
  if (!detail) warnings.push({ field: "Detalhe", message: "Coluna de detalhe não encontrada em despesas." });
  if (!uf) warnings.push({ field: "UF", message: "Coluna UF não encontrada em despesas." });

  return { date, unit, uf, value, category, detail, warnings };
};

export const detectRevenueSchema = (headers: string[]): RevenueSchema => {
  const warnings: SchemaWarning[] = [];
  const date = findHeader(headers, ["Data", "Date", "Competência", "Competencia", "Mes", "Mês"]);
  const unit = findHeader(headers, ["Unidade", "Unidades", "Loja", "Unit"]);
  const uf = findHeader(headers, ["UF", "Estado", "State"]);
  const total = findHeader(headers, ["Total", "Faturamento", "Receita", "Revenue"]);

  if (!date) warnings.push({ field: "Data", message: "Coluna de data não encontrada em faturamento." });
  if (!total) warnings.push({ field: "Total", message: "Coluna de total não encontrada em faturamento." });
  if (!uf) warnings.push({ field: "UF", message: "Coluna UF não encontrada em faturamento." });

  return { date, unit, uf, total, warnings };
};

export const normalizeHeaderKey = normalizeKey;
