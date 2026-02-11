const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type CacheEntry = {
  timestamp: number;
  data: string;
};

const CACHE_VERSION = "v2";
const cacheKey = (key: string) => `dre-2025-${CACHE_VERSION}-${key}`;

export const getCachedCsv = (key: string): string | null => {
  try {
    const raw = localStorage.getItem(cacheKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
};

export const setCachedCsv = (key: string, data: string) => {
  try {
    const payload: CacheEntry = { timestamp: Date.now(), data };
    localStorage.setItem(cacheKey(key), JSON.stringify(payload));
  } catch {
    // ignore cache write errors
  }
};

export const fetchCsv = async (url: string, cacheId: string): Promise<string> => {
  const cached = getCachedCsv(cacheId);
  if (cached) return cached;

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Falha ao baixar CSV (${response.status}).`);
  }

  const text = await response.text();
  if (!text) throw new Error("CSV vazio.");

  setCachedCsv(cacheId, text);
  return text;
};
