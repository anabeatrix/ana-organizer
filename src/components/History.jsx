import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { C, CATEGORIES, DEFAULT_PLAN } from "../constants";
import { monthLabel, fmtShort, catTotal } from "../utils";
import { Card, Label, Pill } from "./ui";

export default function History() {
  const [monthsData, setMonthsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [focusCat, setFocusCat] = useState(null);

  useEffect(() => {
    const load = async () => {
      const results = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        const mk = d.toISOString().slice(0, 7);
        try {
          const [expSnap, planSnap] = await Promise.all([
            getDoc(doc(db, "ana", "expenses_" + mk)),
            getDoc(doc(db, "ana", "plan_" + mk)),
          ]);
          const expenses = expSnap.exists() ? (expSnap.data().value || []) : [];
          const plan = planSnap.exists() ? (planSnap.data().value || DEFAULT_PLAN) : DEFAULT_PLAN;
          const tetos = plan.tetos || DEFAULT_PLAN.tetos;
          const spentByCat = expenses.reduce((acc, e) => {
            acc[e.cat] = (acc[e.cat] || 0) + e.amount;
            return acc;
          }, {});
          const total = Object.values(spentByCat).reduce((a, v) => a + v, 0);
          results.push({ mk, label: monthLabel(mk), expenses, tetos, spentByCat, total });
        } catch {
          results.push({ mk, label: monthLabel(mk), expenses: [], tetos: DEFAULT_PLAN.tetos, spentByCat: {}, total: 0 });
        }
      }
      setMonthsData(results);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <div style={{ color: C.muted, padding: 40, textAlign: "center" }}>Carregando histórico...</div>;
  }

  const maxTotal = Math.max(...monthsData.map(m => m.total), 1);
  const hasData = monthsData.some(m => m.total > 0);
  const visibleCats = focusCat ? CATEGORIES.filter(c => c.id === focusCat) : CATEGORIES;

  return (
    <div>
      {/* Bar chart */}
      <Label>Gasto total por mês</Label>
      <Card style={{ marginBottom: 20 }}>
        {!hasData ? (
          <div style={{ color: C.muted, textAlign: "center", fontSize: 13, padding: 16 }}>
            Nenhum dado ainda.
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100, marginBottom: 8 }}>
            {monthsData.map((m, i) => {
              const h = m.total > 0 ? Math.max(8, (m.total / maxTotal) * 90) : 4;
              const isLast = i === monthsData.length - 1;
              return (
                <div key={m.mk} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ fontSize: 9, color: isLast ? C.accent : C.muted }}>
                    {m.total > 0 ? fmtShort(m.total) : ""}
                  </div>
                  <div style={{ width: "100%", height: h, borderRadius: "4px 4px 0 0", background: isLast ? C.accent : C.muted + "66", transition: "height 0.4s" }} />
                </div>
              );
            })}
          </div>
        )}
        <div style={{ display: "flex", gap: 6 }}>
          {monthsData.map((m, i) => (
            <div key={m.mk} style={{ flex: 1, textAlign: "center", fontSize: 9, color: i === monthsData.length - 1 ? C.accent : C.muted }}>
              {m.label}
            </div>
          ))}
        </div>
      </Card>

      {/* Category filter */}
      <Label>Por categoria</Label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        <Pill active={!focusCat} onClick={() => setFocusCat(null)}>Todas</Pill>
        {CATEGORIES.map(c => (
          <Pill key={c.id} active={focusCat === c.id} onClick={() => setFocusCat(focusCat === c.id ? null : c.id)} color={c.color}>
            {c.label}
          </Pill>
        ))}
      </div>

      {/* Mini bar charts per category */}
      {visibleCats.map(cat => (
        <div key={cat.id} style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color }} />
            <span style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{cat.label}</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 48, marginBottom: 4 }}>
            {monthsData.map((m, i) => {
              const spent = m.spentByCat[cat.id] || 0;
              const teto = catTotal(m.tetos, cat.id);
              const maxV = Math.max(...monthsData.map(x => x.spentByCat[cat.id] || 0), teto, 1);
              const h = spent > 0 ? Math.max(4, (spent / maxV) * 44) : 3;
              const over = teto > 0 && spent > teto;
              const isLast = i === monthsData.length - 1;
              return (
                <div key={m.mk} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  {spent > 0 && <div style={{ fontSize: 8, color: over ? C.red : C.muted }}>{fmtShort(spent)}</div>}
                  <div style={{ width: "100%", height: h, borderRadius: "3px 3px 0 0", background: over ? C.red : isLast ? cat.color : cat.color + "55" }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {monthsData.map((m, i) => (
              <div key={m.mk} style={{ flex: 1, textAlign: "center", fontSize: 8, color: i === monthsData.length - 1 ? C.accent : C.muted }}>
                {m.label}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Summary table */}
      <Label>Tabela resumo</Label>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", color: C.muted, fontWeight: 600, padding: "6px 4px 10px", borderBottom: `1px solid ${C.border}` }}>
                Categoria
              </th>
              {monthsData.map(m => (
                <th key={m.mk} style={{ textAlign: "right", color: C.muted, fontWeight: 600, padding: "6px 4px 10px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map(cat => (
              <tr key={cat.id}>
                <td style={{ padding: "8px 4px", borderBottom: `1px solid ${C.border}`, color: C.text, whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                    {cat.label}
                  </div>
                </td>
                {monthsData.map(m => {
                  const spent = m.spentByCat[cat.id] || 0;
                  const over = catTotal(m.tetos, cat.id) > 0 && spent > catTotal(m.tetos, cat.id);
                  return (
                    <td key={m.mk} style={{ padding: "8px 4px", borderBottom: `1px solid ${C.border}`, textAlign: "right", color: over ? C.red : spent > 0 ? C.text : C.muted, whiteSpace: "nowrap" }}>
                      {spent > 0 ? fmtShort(spent) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td style={{ padding: "10px 4px", color: C.accent, fontSize: 12, fontWeight: 700 }}>Total</td>
              {monthsData.map(m => (
                <td key={m.mk} style={{ padding: "10px 4px", textAlign: "right", color: C.accent, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                  {m.total > 0 ? fmtShort(m.total) : "—"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
