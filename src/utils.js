import { CATEGORIES, DEFAULT_PLAN } from "./constants";

// ─── Date helpers ──────────────────────────────────────────────────────────

/** Returns today's date in YYYY-MM-DD format, adjusted for Brasília (UTC-3). */
export const todayKey = () => {
  const d = new Date();
  d.setHours(d.getHours() - 3);
  return d.toISOString().slice(0, 10);
};

/** Returns the current month in YYYY-MM format. */
export const monthKey = () => new Date().toISOString().slice(0, 7);

/** Returns the previous month key for a given YYYY-MM string. */
export const prevMonthKey = mk => {
  const [y, m] = mk.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return d.toISOString().slice(0, 7);
};

/**
 * Returns an array of { mk, label, isCurrent } for the next `n` months
 * starting from the current month.
 */
export const getNextMonths = (n = 6) => {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const mk = d.toISOString().slice(0, 7);
    return {
      mk,
      label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      isCurrent: i === 0,
    };
  });
};

// ─── Formatting ────────────────────────────────────────────────────────────

export const fmt = v =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmtShort = v => {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `R$${(v / 1_000).toFixed(1)}k`;
  return fmt(v);
};

export const monthLabel = mk => {
  const [y, m] = mk.split("-");
  return new Date(y, m - 1).toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
  });
};

// ─── Budget calculations ────────────────────────────────────────────────────

/** Sum of all subcategory tetos for a given category. */
export const catTotal = (tetos, catId) =>
  Object.values(tetos?.[catId] || {}).reduce((a, v) => a + (v || 0), 0);

/** Sum of tetos across all categories. */
export const totalTetos = tetos =>
  CATEGORIES.reduce((a, c) => a + catTotal(tetos, c.id), 0);

/**
 * Aggregate expenses into a { catId: totalAmount } map.
 */
export const aggregateByCat = expenses =>
  expenses.reduce((acc, e) => {
    acc[e.cat] = (acc[e.cat] || 0) + e.amount;
    return acc;
  }, {});

/**
 * Aggregate expenses into a { catId: { subKey: totalAmount } } map.
 */
export const aggregateBySub = (expenses, catId, toKey) =>
  expenses
    .filter(e => e.cat === catId)
    .reduce((acc, e) => {
      const sk = toKey(e.sub);
      acc[sk] = (acc[sk] || 0) + e.amount;
      return acc;
    }, {});

// ─── Plan helpers ───────────────────────────────────────────────────────────

/** Merge a saved plan with defaults, ensuring all keys exist. */
export const mergePlan = (saved, defaults = DEFAULT_PLAN) => ({
  renda: saved?.renda ?? defaults.renda,
  tetos: saved?.tetos ?? defaults.tetos,
});
