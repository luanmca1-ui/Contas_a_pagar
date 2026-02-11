export type NormalizedDate = {
  year: number | null;
  month: number | null;
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

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();

export const normalizeComparable = (value: string) =>
  value
    .replace(/^\uFEFF/, "")
    .replace(/\u200B/g, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "")
    .trim();

export const parsePtBrNumber = (raw: string | number | null | undefined): number => {
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

export const parseFlexibleDate = (raw: string | null | undefined): NormalizedDate => {
  if (!raw) return { year: null, month: null };
  const value = normalize(String(raw));

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
  if (monthOnly) {
    return { year: null, month: monthOnly };
  }

  return { year: null, month: null };
};

export const normalizeUnit = (value: string | null | undefined): string =>
  value?.toString().trim() || "Sem unidade";

export const normalizeUf = (value: string | null | undefined): string =>
  value?.toString().trim().toUpperCase() || "Sem UF";
