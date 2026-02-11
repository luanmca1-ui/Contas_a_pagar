import Papa from "papaparse";

export type ParsedCsv<T = Record<string, string>> = {
  data: T[];
  errors: Papa.ParseError[];
  fields: string[];
};

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

export const parseCsv = <T = Record<string, string>>(csvText: string): ParsedCsv<T> => {
  const delimiter = detectDelimiter(csvText);
  const result = Papa.parse<T>(csvText, {
    header: true,
    skipEmptyLines: true,
    delimiter
  });

  return {
    data: result.data,
    errors: result.errors,
    fields: result.meta.fields ?? []
  };
};
