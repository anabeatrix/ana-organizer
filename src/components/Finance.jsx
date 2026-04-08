import { useState } from "react";
import { C, CATEGORIES, INCOME_CATS, INV_CATS, DEFAULT_PLAN, toKey } from "../constants";
import { todayKey, monthKey, fmt, fmtShort, catTotal, getNextMonths } from "../utils";
import { useFirestore } from "../hooks/useFirestore";
import { Input, Select, Card, Label, Pill, BudgetBar } from "./ui";

// ─── Expense log form ──────────────────────────────────────────────────────
function ExpenseForm({ onSave, onCancel }) {
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("variaveis");
  const [sub, setSub] = useState("Dia a dia");

  const currentCat = CATEGORIES.find(c => c.id === cat);

  const handleSave = () => {
    if (!desc.trim() || !amount) return;
    onSave({ amount: parseFloat(amount), desc, cat, sub, date: todayKey() });
    onCancel();
  };

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <Input
            value={amount}
            onChange={e => setAmount(e.target.value)}
            type="number"
            placeholder="R$ 0,00"
            style={{ width: 110, fontSize: 18, fontWeight: 700 }}
            autoFocus
          />
          <Input
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Descrição"
            onKeyDown={e => e.key === "Enter" && handleSave()}
            style={{ flex: 1 }}
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Select
            value={cat}
            onChange={e => { setCat(e.target.value); setSub(CATEGORIES.find(c => c.id === e.target.value)?.subs[0] || ""); }}
            style={{ flex: 1 }}
          >
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </Select>
          <Select value={sub} onChange={e => setSub(e.target.value)} style={{ flex: 1 }}>
            {(currentCat?.subs || []).map(s => <option key={s}>{s}</option>)}
          </Select>
        </div>
        <button
          onClick={handleSave}
          style={{ background: C.accent, border: "none", color: "#fff", borderRadius: 8, padding: "11px 0", fontSize: 14, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}
        >
          Salvar
        </button>
      </div>
    </Card>
  );
}

// ─── Income log form ───────────────────────────────────────────────────────
function IncomeForm({ onSave, onCancel }) {
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("Salário");

  const handleSave = () => {
    if (!desc.trim() || !amount) return;
    onSave({ amount: parseFloat(amount), desc, cat, date: todayKey() });
    onCancel();
  };

  return (
    <Card style={{ marginBottom: 16, borderColor: C.green + "44" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <Input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="R$ 0,00"
            style={{ width: 110, fontSize: 18, fontWeight: 700 }} autoFocus />
          <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição"
            onKeyDown={e => e.key === "Enter" && handleSave()} style={{ flex: 1 }} />
        </div>
        <Select value={cat} onChange={e => setCat(e.target.value)} style={{ width: "100%" }}>
          {INCOME_CATS.map(c => <option key={c}>{c}</option>)}
        </Select>
        <button onClick={handleSave}
          style={{ background: C.green, border: "none", color: "#fff", borderRadius: 8, padding: "11px 0", fontSize: 14, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
          Salvar receita
        </button>
      </div>
    </Card>
  );
}

// ─── Overview view ─────────────────────────────────────────────────────────
function Overview({ expenses, tetos, onSelectCat }) {
  const [focusCat, setFocusCat] = useState(null);

  const spentByCat = expenses.reduce((acc, e) => {
    acc[e.cat] = (acc[e.cat] || 0) + e.amount;
    return acc;
  }, {});

  if (focusCat) {
    const cat = CATEGORIES.find(c => c.id === focusCat);
    const catSubs = tetos[focusCat] || {};
    const spentBySub = expenses
      .filter(e => e.cat === focusCat)
      .reduce((acc, e) => { acc[toKey(e.sub)] = (acc[toKey(e.sub)] || 0) + e.amount; return acc; }, {});

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <button onClick={() => setFocusCat(null)}
            style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, padding: 0 }}>←</button>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: cat.color }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{cat.label}</span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: cat.color, fontWeight: 700 }}>
            {fmt(spentByCat[focusCat] || 0)} / {fmt(catTotal(tetos, focusCat))}
          </span>
        </div>
        {cat.subs.map(sub => {
          const sk = toKey(sub);
          const subTeto = catSubs[sk] || 0;
          const subSpent = spentBySub[sk] || 0;
          if (subTeto === 0 && subSpent === 0) return null;
          const over = subTeto > 0 && subSpent > subTeto;
          const warn = subTeto > 0 && subSpent / subTeto >= 0.8 && !over;
          const pct = subTeto > 0 ? Math.min(100, (subSpent / subTeto) * 100) : 0;
          const barColor = over ? C.red : warn ? C.orange : cat.color;
          return (
            <div key={sub} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: over ? C.red : C.text, fontWeight: over ? 700 : 400 }}>
                  {sub}{over && " ⚠"}
                </span>
                <span style={{ fontSize: 12, color: over ? C.red : warn ? C.orange : C.muted }}>
                  {fmt(subSpent)}{subTeto > 0 ? ` / ${fmt(subTeto)}` : ""}
                </span>
              </div>
              {subTeto > 0 && (
                <div style={{ background: "#2a2318", borderRadius: 999, height: 4, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 999, transition: "width 0.4s" }} />
                </div>
              )}
            </div>
          );
        })}
        <button onClick={() => onSelectCat(focusCat)} style={{
          marginTop: 16, width: "100%", background: "none", border: `1px solid ${C.border}`,
          color: C.muted, borderRadius: 10, padding: "10px 0", fontSize: 13, cursor: "pointer", fontFamily: "inherit"
        }}>Ver todos os gastos desta categoria →</button>
      </div>
    );
  }

  return (
    <div>
      <Label>Teto vs realizado</Label>
      {CATEGORIES.map(c => (
        <BudgetBar
          key={c.id}
          label={c.label}
          spent={spentByCat[c.id] || 0}
          teto={catTotal(tetos, c.id)}
          color={c.color}
          onPress={() => setFocusCat(c.id)}
        />
      ))}
      <div style={{ fontSize: 11, color: C.muted, marginTop: 12, textAlign: "center" }}>
        Toque numa categoria para detalhar
      </div>
    </div>
  );
}

// ─── Expenses list view ────────────────────────────────────────────────────
function ExpensesList({ expenses, filterCat, onRemove, onClearFilter }) {
  const filtered = filterCat ? expenses.filter(e => e.cat === filterCat) : expenses;
  return (
    <div>
      {filterCat && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: C.muted }}>Filtrando:</span>
          <span style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>
            {CATEGORIES.find(c => c.id === filterCat)?.label}
          </span>
          <button onClick={onClearFilter}
            style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, marginLeft: "auto" }}>
            Ver tudo
          </button>
        </div>
      )}
      {filtered.length === 0 && (
        <div style={{ color: C.muted, textAlign: "center", padding: 32, fontSize: 13 }}>
          Nenhum gasto registrado ainda.
        </div>
      )}
      {filtered.slice().reverse().map(e => {
        const catObj = CATEGORIES.find(c => c.id === e.cat);
        return (
          <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: catObj?.color || C.muted, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: C.text }}>{e.desc}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{e.sub} · {e.date}</div>
            </div>
            <span style={{ color: C.red, fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>
              -{fmt(e.amount)}
            </span>
            <button onClick={() => onRemove(e.id)}
              style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, padding: 0 }}>×</button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tetos view with month selector ────────────────────────────────────────
function TetosView() {
  const months = getNextMonths(6);
  const [selectedMk, setSelectedMk] = useState(monthKey());
  const [plan, setPlan] = useFirestore("plan_" + selectedMk, DEFAULT_PLAN);

  const tetos = plan.tetos || DEFAULT_PLAN.tetos;
  const setTetos = newTetos => setPlan({ ...plan, tetos: newTetos });
  const totalTeto = CATEGORIES.reduce((a, c) => a + catTotal(tetos, c.id), 0);

  return (
    <div>
      {/* Month selector */}
      <Label>Mês</Label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {months.map(m => (
          <Pill
            key={m.mk}
            active={selectedMk === m.mk}
            onClick={() => setSelectedMk(m.mk)}
          >
            {m.label.charAt(0).toUpperCase() + m.label.slice(1)}
            {m.isCurrent && " ·"}
          </Pill>
        ))}
      </div>

      {/* Categories with subcategories */}
      {CATEGORIES.map(c => {
        const catSubs = tetos[c.id] || {};
        const catTeto = catTotal(tetos, c.id);
        return (
          <div key={c.id} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C.text }}>{c.label}</span>
              <span style={{ fontSize: 12, color: c.color, fontWeight: 700 }}>{fmt(catTeto)}</span>
            </div>
            {c.subs.map(sub => {
              const sk = toKey(sub);
              const val = catSubs[sk] ?? 0;
              return (
                <div key={sub} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, paddingLeft: 16 }}>
                  <span style={{ flex: 1, fontSize: 12, color: C.muted }}>{sub}</span>
                  <Input
                    type="number"
                    value={val}
                    onChange={e => {
                      const newCat = { ...catSubs, [sk]: parseFloat(e.target.value) || 0 };
                      setTetos({ ...tetos, [c.id]: newCat });
                    }}
                    style={{ width: 100, textAlign: "right", fontSize: 12, padding: "6px 10px" }}
                  />
                </div>
              );
            })}
          </div>
        );
      })}

      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 4, display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: C.muted, fontSize: 13 }}>Total geral</span>
        <span style={{ color: C.accent, fontWeight: 700 }}>{fmt(totalTeto)}</span>
      </div>
    </div>
  );
}

// ─── Investments view ──────────────────────────────────────────────────────
function InvestmentsView() {
  const [investments, setInvestments] = useFirestore("investments", []);
  const [invName, setInvName] = useState("");
  const [invVal, setInvVal] = useState("");
  const [invCat, setInvCat] = useState("Renda Fixa");

  const netWorth = investments.reduce((a, i) => a + i.value, 0);
  const byCat = investments.reduce((acc, i) => { acc[i.cat] = (acc[i.cat] || 0) + i.value; return acc; }, {});

  const addInv = () => {
    if (!invName.trim() || !invVal) return;
    setInvestments([...investments, { id: Date.now(), name: invName, cat: invCat, value: parseFloat(invVal) }]);
    setInvName(""); setInvVal("");
  };

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Label>Adicionar posição</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Input value={invName} onChange={e => setInvName(e.target.value)}
            placeholder="Nome do ativo (ex: BOVA11)" style={{ width: "100%", boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <Input value={invVal} onChange={e => setInvVal(e.target.value)} type="number" placeholder="Valor atual" style={{ flex: 1 }} />
            <Select value={invCat} onChange={e => setInvCat(e.target.value)}>
              {INV_CATS.map(c => <option key={c}>{c}</option>)}
            </Select>
          </div>
          <button onClick={addInv} style={{
            background: C.gold + "cc", border: "none", color: "#1a1410", borderRadius: 8,
            padding: "10px 0", fontSize: 14, cursor: "pointer", fontFamily: "inherit", fontWeight: 700
          }}>+ Adicionar</button>
        </div>
      </Card>

      {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
        <div key={cat} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
            <span style={{ color: C.text }}>{cat}</span>
            <span style={{ color: C.gold }}>{fmt(val)} · {netWorth > 0 ? ((val / netWorth) * 100).toFixed(1) : 0}%</span>
          </div>
          <div style={{ background: C.border, borderRadius: 999, height: 5, overflow: "hidden" }}>
            <div style={{ width: `${netWorth > 0 ? (val / netWorth) * 100 : 0}%`, height: "100%", background: C.gold, borderRadius: 999 }} />
          </div>
        </div>
      ))}

      {investments.map(inv => (
        <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, color: C.text }}>{inv.name}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{inv.cat}</div>
          </div>
          <span style={{ color: C.gold, fontWeight: 700, fontSize: 14 }}>{fmt(inv.value)}</span>
          <button onClick={() => setInvestments(investments.filter(x => x.id !== inv.id))}
            style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, padding: 0 }}>×</button>
        </div>
      ))}
      {investments.length === 0 && (
        <div style={{ color: C.muted, textAlign: "center", padding: 24, fontSize: 13 }}>Nenhuma posição cadastrada.</div>
      )}
    </div>
  );
}

// ─── Finance root ──────────────────────────────────────────────────────────
export default function Finance() {
  const mk = monthKey();
  const [expenses, setExpenses, expReady] = useFirestore("expenses_" + mk, []);
  const [incomes, setIncomes] = useFirestore("incomes_" + mk, []);
  const [plan] = useFirestore("plan_" + mk, DEFAULT_PLAN);

  const tetos = plan.tetos || DEFAULT_PLAN.tetos;

  const [view, setView] = useState("overview");
  const [filterCat, setFilterCat] = useState(null);
  const [showLog, setShowLog] = useState(false);
  const [showIncome, setShowIncome] = useState(false);

  const spentByCat = expenses.reduce((acc, e) => { acc[e.cat] = (acc[e.cat] || 0) + e.amount; return acc; }, {});
  const totalSpent = Object.values(spentByCat).reduce((a, v) => a + v, 0);
  const totalTeto = CATEGORIES.reduce((a, c) => a + catTotal(tetos, c.id), 0);
  const totalIncome = incomes.reduce((a, i) => a + i.amount, 0);
  const saldo = totalIncome - totalSpent;
  const overBudget = CATEGORIES.filter(c => spentByCat[c.id] > catTotal(tetos, c.id) && catTotal(tetos, c.id) > 0);

  const addExpense = e => setExpenses([...expenses, { id: Date.now(), ...e, label: CATEGORIES.find(c => c.id === e.cat)?.label || e.cat }]);
  const addIncome = i => setIncomes([...incomes, { id: Date.now(), ...i }]);

  if (!expReady) return <div style={{ color: C.muted, padding: 40, textAlign: "center" }}>Loading...</div>;

  const VIEWS = ["overview", "gastos", "receitas", "tetos", "investimentos"];

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <Card>
          <Label>Receitas</Label>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.green, fontFamily: "Georgia, serif" }}>{fmtShort(totalIncome)}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{incomes.length} lançamento{incomes.length !== 1 ? "s" : ""}</div>
        </Card>
        <Card>
          <Label>Despesas</Label>
          <div style={{ fontSize: 20, fontWeight: 800, color: totalSpent > totalTeto ? C.red : C.text, fontFamily: "Georgia, serif" }}>{fmtShort(totalSpent)}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>de {fmtShort(totalTeto)}</div>
          <div style={{ background: C.border, borderRadius: 999, height: 4, marginTop: 6, overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, totalTeto > 0 ? (totalSpent / totalTeto) * 100 : 0)}%`, height: "100%", background: totalSpent > totalTeto ? C.red : C.accent, transition: "width 0.4s" }} />
          </div>
        </Card>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <Card>
          <Label>Saldo</Label>
          <div style={{ fontSize: 20, fontWeight: 800, color: saldo >= 0 ? C.green : C.red, fontFamily: "Georgia, serif" }}>{fmtShort(Math.abs(saldo))}</div>
          <div style={{ fontSize: 11, color: saldo >= 0 ? C.green : C.red, marginTop: 2 }}>{saldo >= 0 ? "sobra" : "déficit"}</div>
        </Card>
        <Card>
          <Label>Patrimônio</Label>
          <InvestmentsSummary />
          {overBudget.length > 0 && <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>⚠ {overBudget.length} estourada{overBudget.length > 1 ? "s" : ""}</div>}
        </Card>
      </div>

      {/* Log buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: showLog || showIncome ? 0 : 16 }}>
        <button onClick={() => { setShowLog(!showLog); setShowIncome(false); }} style={{
          background: showLog ? C.surface : C.accent, border: `1px solid ${showLog ? C.border : C.accent}`,
          color: showLog ? C.muted : "#fff", borderRadius: 12, padding: "12px 0",
          fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, transition: "all 0.2s"
        }}>{showLog ? "Cancelar" : "− Gasto"}</button>
        <button onClick={() => { setShowIncome(!showIncome); setShowLog(false); }} style={{
          background: showIncome ? C.surface : C.green, border: `1px solid ${showIncome ? C.border : C.green}`,
          color: showIncome ? C.muted : "#fff", borderRadius: 12, padding: "12px 0",
          fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, transition: "all 0.2s"
        }}>{showIncome ? "Cancelar" : "+ Receita"}</button>
      </div>

      {showLog && <ExpenseForm onSave={addExpense} onCancel={() => setShowLog(false)} />}
      {showIncome && <IncomeForm onSave={addIncome} onCancel={() => setShowIncome(false)} />}

      {/* View tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", marginTop: showLog || showIncome ? 16 : 0 }}>
        {VIEWS.map(v => (
          <Pill key={v} active={view === v} onClick={() => { setView(v); setFilterCat(null); }}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </Pill>
        ))}
      </div>

      {view === "overview" && (
        <Overview
          expenses={expenses}
          tetos={tetos}
          onSelectCat={cat => { setFilterCat(cat); setView("gastos"); }}
        />
      )}

      {view === "gastos" && (
        <ExpensesList
          expenses={expenses}
          filterCat={filterCat}
          onRemove={id => setExpenses(expenses.filter(x => x.id !== id))}
          onClearFilter={() => setFilterCat(null)}
        />
      )}

      {view === "receitas" && (
        <div>
          {incomes.length === 0 && <div style={{ color: C.muted, textAlign: "center", padding: 32, fontSize: 13 }}>Nenhuma receita registrada ainda.</div>}
          {incomes.slice().reverse().map(inc => (
            <div key={inc.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: C.text }}>{inc.desc}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{inc.cat} · {inc.date}</div>
              </div>
              <span style={{ color: C.green, fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>+{fmt(inc.amount)}</span>
              <button onClick={() => setIncomes(incomes.filter(x => x.id !== inc.id))}
                style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, padding: 0 }}>×</button>
            </div>
          ))}
        </div>
      )}

      {view === "tetos" && <TetosView />}
      {view === "investimentos" && <InvestmentsView />}
    </div>
  );
}

// Small investments summary for the card
function InvestmentsSummary() {
  const [investments] = useFirestore("investments", []);
  const netWorth = investments.reduce((a, i) => a + i.value, 0);
  return (
    <div style={{ fontSize: 20, fontWeight: 800, color: C.gold, fontFamily: "Georgia, serif" }}>
      {fmtShort(netWorth)}
    </div>
  );
}
