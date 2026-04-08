import { useState } from "react";
import { C, CATEGORIES, BOX_BLOCKS, DEFAULT_PLAN } from "../constants";
import { fmt, monthKey, catTotal, getNextMonths, prevMonthKey } from "../utils";
import { useFirestore } from "../hooks/useFirestore";
import { Label, Pill } from "./ui";

// ─── Box status badge ───────────────────────────────────────────────────────
function BoxStatusBadge({ mk }) {
  const [plan] = useFirestore("plan_" + mk, DEFAULT_PLAN);
  const [incomes] = useFirestore("incomes_" + mk, []);

  const tetos = plan.tetos || DEFAULT_PLAN.tetos;
  const renda = plan.renda || 0;
  const totalIncome = incomes.reduce((a, i) => a + i.amount, 0);
  const rendaReal = totalIncome > 0 ? totalIncome : renda;
  const totalTeto = CATEGORIES.reduce((a, c) => a + catTotal(tetos, c.id), 0);
  const saldo = rendaReal - totalTeto;
  const planejado = rendaReal > 0;
  const zerado = planejado && Math.abs(saldo) < 1;

  const style = {
    width: 28, height: 28, borderRadius: "50%", display: "flex",
    alignItems: "center", justifyContent: "center", fontSize: 12,
  };

  if (!planejado) return <div style={{ ...style, background: "#2a2318", border: "1.5px solid #3a3228", color: C.muted }}>—</div>;
  if (zerado)    return <div style={{ ...style, background: C.green + "22", border: `1.5px solid ${C.green}`, color: C.green }}>✓</div>;
  if (saldo > 0) return <div style={{ ...style, background: C.blue + "22", border: `1.5px solid ${C.blue}`, color: C.blue }}>↑</div>;
  return               <div style={{ ...style, background: C.red + "22", border: `1.5px solid ${C.red}`, color: C.red }}>⚠</div>;
}

// ─── Single month box ───────────────────────────────────────────────────────
function MonthBox({ mk, isCurrentMonth }) {
  const [plan, setPlan] = useFirestore("plan_" + mk, DEFAULT_PLAN);
  const [prevPlan] = useFirestore("plan_" + prevMonthKey(mk), DEFAULT_PLAN);
  const [expenses, , expReady] = useFirestore("expenses_" + mk, []);
  const [incomes] = useFirestore("incomes_" + mk, []);
  const [editingRenda, setEditingRenda] = useState(false);
  const [rendaInput, setRendaInput] = useState("");

  const tetos = plan.tetos || DEFAULT_PLAN.tetos;
  const renda = plan.renda || 0;
  const setRenda = val => setPlan({ ...plan, renda: val });

  const totalIncome = incomes.reduce((a, i) => a + i.amount, 0);
  const rendaReal = isCurrentMonth && totalIncome > 0 ? totalIncome : renda;

  const spentByCat = expenses.reduce((acc, e) => {
    acc[e.cat] = (acc[e.cat] || 0) + e.amount;
    return acc;
  }, {});

  const blockData = BOX_BLOCKS.map(block => {
    const teto = block.cats.reduce((a, cid) => a + catTotal(tetos, cid), 0);
    const spent = block.cats.reduce((a, cid) => a + (spentByCat[cid] || 0), 0);
    const pct = rendaReal > 0 ? (teto / rendaReal) * 100 : 0;
    return { ...block, teto, spent, pct };
  });

  const totalTeto = blockData.reduce((a, b) => a + b.teto, 0);
  const totalSpent = blockData.reduce((a, b) => a + b.spent, 0);
  const saldoPlano = rendaReal - totalTeto;
  const saldoReal = rendaReal - totalSpent;
  const boxZerado = rendaReal > 0 && Math.abs(saldoPlano) < 1;
  const isPlanejado = rendaReal > 0;

  const copyFromPrev = () => {
    setPlan({ renda: prevPlan.renda || 0, tetos: prevPlan.tetos || DEFAULT_PLAN.tetos });
  };

  if (!expReady) return <div style={{ color: C.muted, padding: 24, textAlign: "center", fontSize: 13 }}>Carregando...</div>;

  return (
    <div>
      {/* Renda */}
      <div style={{ background: "#161310", border: `1px solid #2a2318`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <Label>{isCurrentMonth ? "Renda do mês" : "Renda esperada"}</Label>
        {editingRenda ? (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              autoFocus
              value={rendaInput}
              onChange={e => setRendaInput(e.target.value)}
              type="number"
              placeholder="Ex: 9500"
              style={{ flex: 1, background: "#1e1a14", border: `1px solid #2a2318`, color: "#f0e6d4", borderRadius: 8, padding: "9px 12px", fontSize: 18, fontWeight: 700, outline: "none", fontFamily: "inherit" }}
            />
            <button
              onClick={() => { setRenda(parseFloat(rendaInput) || 0); setEditingRenda(false); }}
              style={{ background: C.accent, border: "none", color: "#fff", borderRadius: 8, padding: "9px 16px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
            >OK</button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: C.green, fontFamily: "Georgia, serif" }}>
              {rendaReal > 0 ? fmt(rendaReal) : "—"}
            </div>
            {isCurrentMonth && totalIncome > 0 && (
              <div style={{ fontSize: 10, color: C.muted }}>receitas lançadas</div>
            )}
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              {!isPlanejado && (
                <button onClick={copyFromPrev} style={{ background: "none", border: `1px solid #2a2318`, color: C.muted, borderRadius: 8, padding: "4px 10px", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
                  Copiar mês anterior
                </button>
              )}
              <button onClick={() => { setRendaInput(String(renda || "")); setEditingRenda(true); }}
                style={{ background: "none", border: `1px solid #2a2318`, color: C.muted, borderRadius: 8, padding: "4px 10px", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
                Editar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status banner */}
      {isPlanejado && (
        <div style={{
          background: boxZerado ? C.green + "18" : saldoPlano > 0 ? C.blue + "18" : C.red + "18",
          border: `1px solid ${(boxZerado ? C.green : saldoPlano > 0 ? C.blue : C.red)}44`,
          borderRadius: 12, padding: 12, marginBottom: 16, display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{ fontSize: 20 }}>{boxZerado ? "✓" : saldoPlano > 0 ? "↑" : "⚠"}</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: boxZerado ? C.green : saldoPlano > 0 ? C.blue : C.red }}>
              {boxZerado
                ? "Box zerado!"
                : saldoPlano > 0
                  ? `Sobram ${fmt(saldoPlano)} para alocar`
                  : `Déficit de ${fmt(Math.abs(saldoPlano))}`}
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
              {boxZerado
                ? "Plano equilibrado."
                : saldoPlano > 0
                  ? "Aloque o restante em Sonhos."
                  : "Revise os tetos ou planeje um resgate."}
            </div>
          </div>
        </div>
      )}

      {!isPlanejado && (
        <div style={{ background: "#161310", border: `1px solid #2a2318`, borderRadius: 12, padding: 16, marginBottom: 16, textAlign: "center" }}>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 10 }}>Mês não planejado ainda.</div>
          <button onClick={copyFromPrev} style={{ background: C.accent, border: "none", color: "#fff", borderRadius: 10, padding: "10px 20px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
            Copiar plano do mês anterior
          </button>
        </div>
      )}

      {/* Blocks */}
      {isPlanejado && blockData.map(block => (
        <div key={block.id} style={{ background: "#161310", border: `1px solid #2a2318`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: block.color }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#f0e6d4" }}>{block.label}</span>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: block.color, fontFamily: "Georgia, serif" }}>{fmt(block.teto)}</div>
              <div style={{ fontSize: 9, color: C.muted }}>{rendaReal > 0 ? block.pct.toFixed(1) : 0}% da renda</div>
            </div>
          </div>
          <div style={{ fontSize: 9, color: C.muted, marginBottom: 3 }}>Plano</div>
          <div style={{ background: "#2a2318", borderRadius: 999, height: 5, overflow: "hidden", marginBottom: 8 }}>
            <div style={{ width: `${Math.min(100, block.pct)}%`, height: "100%", background: block.color, borderRadius: 999 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.muted, marginBottom: 3 }}>
            <span>Realizado</span>
            <span style={{ color: block.teto > 0 && block.spent > block.teto ? C.red : C.muted }}>
              {fmt(block.spent)}{block.teto > 0 ? ` / ${fmt(block.teto)}` : ""}
            </span>
          </div>
          <div style={{ background: "#2a2318", borderRadius: 999, height: 4, overflow: "hidden" }}>
            <div style={{
              width: `${Math.min(100, block.teto > 0 ? (block.spent / block.teto) * 100 : 0)}%`,
              height: "100%", borderRadius: 999, transition: "width 0.4s",
              background: block.teto > 0 && block.spent > block.teto ? C.red : block.color + "88",
            }} />
          </div>
        </div>
      ))}

      {/* Totals */}
      {isPlanejado && (
        <div style={{ borderTop: `1px solid #2a2318`, paddingTop: 14, marginTop: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: C.muted }}>Total planejado</span>
            <span style={{ fontSize: 12, color: "#f0e6d4", fontWeight: 700 }}>{fmt(totalTeto)}</span>
          </div>
          {isCurrentMonth && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: C.muted }}>Total realizado</span>
                <span style={{ fontSize: 12, color: "#f0e6d4", fontWeight: 700 }}>{fmt(totalSpent)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: C.muted, fontWeight: 700 }}>Saldo real</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: saldoReal >= 0 ? C.green : C.red, fontFamily: "Georgia, serif" }}>
                  {saldoReal >= 0 ? "+" : ""}{fmt(saldoReal)}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Box root ───────────────────────────────────────────────────────────────
export default function Box() {
  const months = getNextMonths(6);
  const [selectedMk, setSelectedMk] = useState(monthKey());

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Planejamento</div>
        <div style={{ fontSize: 22, fontFamily: "Georgia, serif", color: "#f0e6d4" }}>Box Zerado</div>
      </div>

      {/* Status row */}
      <Label>Status dos meses</Label>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
        {months.map(m => (
          <div key={m.mk} onClick={() => setSelectedMk(m.mk)}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer", flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: selectedMk === m.mk ? C.accent : C.muted, fontWeight: selectedMk === m.mk ? 700 : 400 }}>
              {m.label.charAt(0).toUpperCase() + m.label.slice(1)}
            </div>
            <BoxStatusBadge mk={m.mk} />
            {m.isCurrent && <div style={{ width: 4, height: 4, borderRadius: "50%", background: C.accent }} />}
          </div>
        ))}
      </div>

      {/* Month tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {months.map(m => (
          <Pill key={m.mk} active={selectedMk === m.mk} onClick={() => setSelectedMk(m.mk)}>
            {m.label.charAt(0).toUpperCase() + m.label.slice(1)}{m.isCurrent && " ·"}
          </Pill>
        ))}
      </div>

      <MonthBox key={selectedMk} mk={selectedMk} isCurrentMonth={selectedMk === monthKey()} />
    </div>
  );
}
