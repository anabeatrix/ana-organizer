import { useState, useEffect, useCallback, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDKKMD2qgp_WXIoZoDL9jTqaJlZJxXbY4Y",
  authDomain: "ana-organizer.firebaseapp.com",
  projectId: "ana-organizer",
  storageBucket: "ana-organizer.firebasestorage.app",
  messagingSenderId: "21585629064",
  appId: "1:21585629064:web:679b8a2f44e1b853f2343d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const APP_PASSWORD = process.env.REACT_APP_PASSWORD;

const C = {
  bg: "#0e0c0a", surface: "#161310", border: "#2a2318",
  text: "#f0e6d4", muted: "#6a5a48", accent: "#d4874a",
  green: "#6db87a", red: "#d46a6a", blue: "#6a9bd4", gold: "#c8a84a",
  orange: "#d4a44a",
};

const todayKey = () => new Date().toISOString().slice(0, 10);
const monthKey = () => new Date().toISOString().slice(0, 7);
const fmt = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtShort = v => {
  if (v >= 1000000) return `R$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$${(v / 1000).toFixed(1)}k`;
  return fmt(v);
};
const monthLabel = mk => {
  const [y, m] = mk.split("-");
  return new Date(y, m - 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
};

const CATEGORIES = [
  { id: "moradia", label: "Moradia", color: C.blue, type: "fixa", subs: ["Aluguel", "Luz", "Água", "Condomínio", "Outros"] },
  { id: "pessoal", label: "Pessoal Fixo", color: C.gold, type: "fixa", subs: ["Celular", "Internet", "Academia", "Pilates", "Outros"] },
  { id: "educacao", label: "Educação", color: C.accent, type: "fixa", subs: ["Faculdade", "Escola Irmã", "Inglês", "Italiano", "Cursos/Livros", "Outros"] },
  { id: "outras_fixas", label: "Outras Fixas", color: "#a07ab8", type: "fixa", subs: ["Assinaturas", "Donativos", "Terapia", "Terceiros/Empréstimo", "Reforma/Casa", "Outros"] },
  { id: "variaveis", label: "Variáveis", color: C.green, type: "variavel", subs: ["Dia a dia", "Mercado", "Feira", "Padaria/Lanche", "Combustível/Uber", "Farmácia", "Consultas", "Beleza", "Roupas/Compras", "Lazer/Passeio", "Pets", "Papelaria", "Presentes", "Extra", "Outros"] },
  { id: "viagem", label: "Viagem", color: C.orange, type: "variavel", subs: ["Passagem", "Hospedagem", "Passeio", "Alimentação", "Outros"] },
];

const DEFAULT_TETOS = { moradia: 2700, pessoal: 123, educacao: 1870, outras_fixas: 570, variaveis: 4330, viagem: 0 };

function useFirestore(docPath, fallback) {
  const [data, setData] = useState(fallback);
  const [ready, setReady] = useState(false);
  const fallbackRef = useRef(fallback);

  useEffect(() => {
    const ref = doc(db, "ana", docPath);
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) setData(snap.data().value ?? fallbackRef.current);
      else setData(fallbackRef.current);
      setReady(true);
    });
    return unsub;
  }, [docPath]);

  const save = useCallback(async (val) => {
    const next = typeof val === "function" ? val(data) : val;
    setData(next);
    await setDoc(doc(db, "ana", docPath), { value: next });
  }, [docPath, data]);

  return [data, save, ready];
}

function Input({ style, ...props }) {
  return <input {...props} style={{
    background: "#1e1a14", border: `1px solid ${C.border}`, color: C.text,
    borderRadius: 8, padding: "9px 12px", fontSize: 14, outline: "none",
    fontFamily: "inherit", ...style
  }} />;
}

function Select({ style, children, ...props }) {
  return <select {...props} style={{
    background: "#1e1a14", border: `1px solid ${C.border}`, color: C.text,
    borderRadius: 8, padding: "9px 12px", fontSize: 14, outline: "none",
    fontFamily: "inherit", cursor: "pointer", ...style
  }}>{children}</select>;
}

function Card({ children, style }) {
  return <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, ...style }}>{children}</div>;
}

function Label({ children }) {
  return <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10, fontWeight: 700 }}>{children}</div>;
}

function Pill({ children, active, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      background: active ? (color || C.accent) + "22" : "none",
      border: `1px solid ${active ? (color || C.accent) : C.border}`,
      color: active ? (color || C.accent) : C.muted,
      borderRadius: 20, padding: "5px 14px", fontSize: 12,
      cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
      fontWeight: active ? 600 : 400,
    }}>{children}</button>
  );
}

function BudgetBar({ label, spent, teto, color, onPress }) {
  const pct = teto > 0 ? Math.min(100, (spent / teto) * 100) : 0;
  const over = spent > teto && teto > 0;
  const warn = pct >= 80 && !over;
  const barColor = over ? C.red : warn ? C.orange : color;
  return (
    <button onClick={onPress} style={{
      width: "100%", background: "none", border: "none", padding: "12px 0",
      borderBottom: `1px solid ${C.border}`, cursor: "pointer", textAlign: "left"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: over ? C.red : C.text, fontWeight: over ? 700 : 400 }}>{label}</span>
        <span style={{ fontSize: 12, color: over ? C.red : warn ? C.orange : C.muted }}>
          {fmt(spent)}{teto > 0 ? ` / ${fmt(teto)}` : ""}{over && " ⚠"}
        </span>
      </div>
      {teto > 0 && (
        <div style={{ background: "#2a2318", borderRadius: 999, height: 4, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 999, transition: "width 0.4s" }} />
        </div>
      )}
    </button>
  );
}

function computeStreak(history, key) {
  let streak = 0;
  const today = todayKey();
  let d = new Date(today);
  while (true) {
    const k = d.toISOString().slice(0, 10);
    if (k === today && !history[k]?.[key]) break;
    if (k !== today && !history[k]?.[key]) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function StreakFlame({ n, color }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
      <span style={{ fontSize: 18 }}>🔥</span>
      <span style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "Georgia, serif" }}>{n}</span>
      <span style={{ fontSize: 11, color: C.muted }}>days</span>
    </div>
  );
}

// ─── TODAY ─────────────────────────────────────────────────────────────────
function Today() {
  const today = todayKey();
  const [history, setHistory, histReady] = useFirestore("checkin_history", {});
  const [priority, setPriority] = useFirestore("priority_" + today, "");
  const todayData = history[today] || { english: false, gym: false };
  const toggle = (key) => setHistory({ ...history, [today]: { ...todayData, [key]: !todayData[key] } });
  const engStreak = computeStreak(history, "english");
  const gymStreak = computeStreak(history, "gym");
  const habits = [
    { key: "english", label: "English", sub: "Voice conversation", color: C.blue, emoji: "🗣️" },
    { key: "gym", label: "Gym / Run", sub: "Move your body", color: C.green, emoji: "🏃‍♀️" },
  ];
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning, Ana.";
    if (h < 18) return "Good afternoon, Ana.";
    return "Good evening, Ana.";
  };
  const allDone = todayData.english && todayData.gym && priority?.trim();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i);
    return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString("en", { weekday: "short" }).slice(0, 1) };
  });
  if (!histReady) return <div style={{ color: C.muted, padding: 40, textAlign: "center" }}>Loading...</div>;
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontFamily: "Georgia, serif", color: C.text, marginBottom: 4 }}>{greeting()}</div>
        <div style={{ fontSize: 13, color: C.muted }}>{new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        {habits.map(h => {
          const done = todayData[h.key];
          const streak = h.key === "english" ? engStreak : gymStreak;
          return (
            <button key={h.key} onClick={() => toggle(h.key)} style={{
              background: done ? h.color + "18" : C.surface, border: `2px solid ${done ? h.color : C.border}`,
              borderRadius: 14, padding: 16, cursor: "pointer", textAlign: "left", transition: "all 0.25s", outline: "none"
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{h.emoji}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: done ? h.color : C.text, marginBottom: 2 }}>{h.label}</div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>{h.sub}</div>
              <StreakFlame n={streak} color={done ? h.color : C.muted} />
            </button>
          );
        })}
      </div>
      <Card style={{ marginBottom: 20 }}>
        <Label>Today's one priority</Label>
        <Input value={priority || ""} onChange={e => setPriority(e.target.value)}
          placeholder="What's the one thing that matters today?" style={{ width: "100%", boxSizing: "border-box" }} />
      </Card>
      <Card style={{ marginBottom: 20 }}>
        <Label>This week</Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
          {weekDays.map(({ key, label }) => {
            const d = history[key];
            const both = d?.english && d?.gym;
            const one = d?.english || d?.gym;
            const isToday = key === today;
            return (
              <div key={key} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: isToday ? C.accent : C.muted, marginBottom: 6, fontWeight: isToday ? 700 : 400 }}>{label}</div>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", margin: "0 auto",
                  background: both ? C.green + "33" : one ? C.accent + "33" : C.border,
                  border: `2px solid ${both ? C.green : one ? C.accent : "transparent"}`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.text
                }}>{both ? "✓" : one ? "·" : ""}</div>
              </div>
            );
          })}
        </div>
      </Card>
      {allDone && (
        <div style={{ background: C.green + "18", border: `1px solid ${C.green}44`, borderRadius: 12, padding: 14, textAlign: "center" }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>🎯</div>
          <div style={{ color: C.green, fontSize: 14, fontWeight: 600 }}>Day complete. Well done.</div>
        </div>
      )}
    </div>
  );
}

// ─── FINANCE ───────────────────────────────────────────────────────────────
function Finance() {
  const mk = monthKey();
  const [expenses, setExpenses, expReady] = useFirestore("expenses_" + mk, []);
  const [tetos, setTetos] = useFirestore("tetos_" + mk, DEFAULT_TETOS);
  const [investments, setInvestments] = useFirestore("investments", []);
  const [view, setView] = useState("overview");
  const [filterCat, setFilterCat] = useState(null);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState("variaveis");
  const [sub, setSub] = useState("Dia a dia");
  const [showLog, setShowLog] = useState(false);
  const [invName, setInvName] = useState("");
  const [invVal, setInvVal] = useState("");
  const [invCat, setInvCat] = useState("Renda Fixa");
  const INV_CATS = ["Stocks", "FII", "Renda Fixa", "Crypto", "Internacional", "Caixa"];

  const addExpense = () => {
    if (!desc.trim() || !amount) return;
    const catObj = CATEGORIES.find(c => c.id === cat);
    setExpenses([...expenses, { id: Date.now(), desc, amount: parseFloat(amount), cat, sub, date: todayKey(), label: catObj?.label || cat }]);
    setDesc(""); setAmount(""); setShowLog(false);
  };

  const addInv = () => {
    if (!invName.trim() || !invVal) return;
    setInvestments([...investments, { id: Date.now(), name: invName, cat: invCat, value: parseFloat(invVal) }]);
    setInvName(""); setInvVal("");
  };

  const spentByCat = expenses.reduce((acc, e) => { acc[e.cat] = (acc[e.cat] || 0) + e.amount; return acc; }, {});
  const totalSpent = Object.values(spentByCat).reduce((a, v) => a + v, 0);
  const totalTeto = Object.values(tetos).reduce((a, v) => a + v, 0);
  const netWorth = investments.reduce((a, i) => a + i.value, 0);
  const overBudget = CATEGORIES.filter(c => spentByCat[c.id] > tetos[c.id] && tetos[c.id] > 0);
  const filteredExpenses = filterCat ? expenses.filter(e => e.cat === filterCat) : expenses;
  const currentCat = CATEGORIES.find(c => c.id === cat);

  if (!expReady) return <div style={{ color: C.muted, padding: 40, textAlign: "center" }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <Card>
          <Label>{new Date().toLocaleDateString("pt-BR", { month: "long" })}</Label>
          <div style={{ fontSize: 20, fontWeight: 800, color: totalSpent > totalTeto ? C.red : C.text, fontFamily: "Georgia, serif" }}>{fmtShort(totalSpent)}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>de {fmtShort(totalTeto)}</div>
          <div style={{ background: C.border, borderRadius: 999, height: 4, marginTop: 8, overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, (totalSpent / totalTeto) * 100)}%`, height: "100%", background: totalSpent > totalTeto ? C.red : C.accent, transition: "width 0.4s" }} />
          </div>
        </Card>
        <Card>
          <Label>Patrimônio</Label>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.gold, fontFamily: "Georgia, serif" }}>{fmtShort(netWorth)}</div>
          {overBudget.length > 0 && <div style={{ fontSize: 11, color: C.red, marginTop: 6 }}>⚠ {overBudget.length} estourada{overBudget.length > 1 ? "s" : ""}</div>}
        </Card>
      </div>

      <button onClick={() => setShowLog(!showLog)} style={{
        width: "100%", background: showLog ? C.surface : C.accent, border: `1px solid ${showLog ? C.border : C.accent}`,
        color: showLog ? C.muted : "#fff", borderRadius: 12, padding: "12px 0",
        fontSize: 14, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, marginBottom: 16, transition: "all 0.2s"
      }}>{showLog ? "Cancelar" : "+ Registrar gasto"}</button>

      {showLog && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <Input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="R$ 0,00"
                style={{ width: 110, fontSize: 18, fontWeight: 700 }} autoFocus />
              <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição"
                onKeyDown={e => e.key === "Enter" && addExpense()} style={{ flex: 1 }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Select value={cat} onChange={e => { setCat(e.target.value); setSub(CATEGORIES.find(c => c.id === e.target.value)?.subs[0] || ""); }} style={{ flex: 1 }}>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </Select>
              <Select value={sub} onChange={e => setSub(e.target.value)} style={{ flex: 1 }}>
                {(currentCat?.subs || []).map(s => <option key={s}>{s}</option>)}
              </Select>
            </div>
            <button onClick={addExpense} style={{
              background: C.accent, border: "none", color: "#fff", borderRadius: 8,
              padding: "11px 0", fontSize: 14, cursor: "pointer", fontFamily: "inherit", fontWeight: 700
            }}>Salvar</button>
          </div>
        </Card>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["overview", "gastos", "tetos", "investimentos"].map(v => (
          <Pill key={v} active={view === v} onClick={() => { setView(v); setFilterCat(null); }}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </Pill>
        ))}
      </div>

      {view === "overview" && (
        <div>
          <Label>Teto vs realizado</Label>
          {CATEGORIES.map(c => (
            <BudgetBar key={c.id} label={c.label} spent={spentByCat[c.id] || 0} teto={tetos[c.id] || 0}
              color={c.color} onPress={() => { setFilterCat(c.id); setView("gastos"); }} />
          ))}
          <div style={{ fontSize: 11, color: C.muted, marginTop: 12, textAlign: "center" }}>Toque numa categoria para ver os gastos</div>
        </div>
      )}

      {view === "gastos" && (
        <div>
          {filterCat && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: C.muted }}>Filtrando:</span>
              <span style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>{CATEGORIES.find(c => c.id === filterCat)?.label}</span>
              <button onClick={() => setFilterCat(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, marginLeft: "auto" }}>Ver tudo</button>
            </div>
          )}
          {filteredExpenses.length === 0 && <div style={{ color: C.muted, textAlign: "center", padding: 32, fontSize: 13 }}>Nenhum gasto registrado ainda.</div>}
          {filteredExpenses.slice().reverse().map(e => {
            const catObj = CATEGORIES.find(c => c.id === e.cat);
            return (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: catObj?.color || C.muted, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: C.text }}>{e.desc}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{e.sub} · {e.date}</div>
                </div>
                <span style={{ color: C.red, fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>-{fmt(e.amount)}</span>
                <button onClick={() => setExpenses(expenses.filter(x => x.id !== e.id))}
                  style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, padding: 0 }}>×</button>
              </div>
            );
          })}
        </div>
      )}

      {view === "tetos" && (
        <div>
          <Label>Teto mensal por categoria</Label>
          {CATEGORIES.map(c => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: C.text }}>{c.label}</span>
              <Input type="number" value={tetos[c.id] || 0}
                onChange={e => setTetos({ ...tetos, [c.id]: parseFloat(e.target.value) || 0 })}
                style={{ width: 110, textAlign: "right" }} />
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 4, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: C.muted, fontSize: 13 }}>Total</span>
            <span style={{ color: C.accent, fontWeight: 700 }}>{fmt(totalTeto)}</span>
          </div>
        </div>
      )}

      {view === "investimentos" && (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <Label>Adicionar posição</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Input value={invName} onChange={e => setInvName(e.target.value)} placeholder="Nome do ativo (ex: BOVA11)" style={{ width: "100%", boxSizing: "border-box" }} />
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
          <div style={{ marginBottom: 20 }}>
            {Object.entries(investments.reduce((acc, i) => { acc[i.cat] = (acc[i.cat] || 0) + i.value; return acc; }, {}))
              .sort((a, b) => b[1] - a[1]).map(([c, val]) => (
                <div key={c} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                    <span style={{ color: C.text }}>{c}</span>
                    <span style={{ color: C.gold }}>{fmt(val)} · {netWorth > 0 ? ((val / netWorth) * 100).toFixed(1) : 0}%</span>
                  </div>
                  <div style={{ background: C.border, borderRadius: 999, height: 5, overflow: "hidden" }}>
                    <div style={{ width: `${netWorth > 0 ? (val / netWorth) * 100 : 0}%`, height: "100%", background: C.gold, borderRadius: 999 }} />
                  </div>
                </div>
              ))}
          </div>
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
          {investments.length === 0 && <div style={{ color: C.muted, textAlign: "center", padding: 24, fontSize: 13 }}>Nenhuma posição cadastrada.</div>}
        </div>
      )}
    </div>
  );
}

// ─── HISTORY ───────────────────────────────────────────────────────────────
function History() {
  const [monthsData, setMonthsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [focusCat, setFocusCat] = useState(null);

  useEffect(() => {
    const loadHistory = async () => {
      const results = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        const mk = d.toISOString().slice(0, 7);
        try {
          const expSnap = await getDoc(doc(db, "ana", "expenses_" + mk));
          const tetosSnap = await getDoc(doc(db, "ana", "tetos_" + mk));
          const expenses = expSnap.exists() ? (expSnap.data().value || []) : [];
          const tetos = tetosSnap.exists() ? (tetosSnap.data().value || DEFAULT_TETOS) : DEFAULT_TETOS;
          const spentByCat = expenses.reduce((acc, e) => { acc[e.cat] = (acc[e.cat] || 0) + e.amount; return acc; }, {});
          const total = Object.values(spentByCat).reduce((a, v) => a + v, 0);
          results.push({ mk, label: monthLabel(mk), expenses, tetos, spentByCat, total });
        } catch {
          results.push({ mk, label: monthLabel(mk), expenses: [], tetos: DEFAULT_TETOS, spentByCat: {}, total: 0 });
        }
      }
      setMonthsData(results);
      setLoading(false);
    };
    loadHistory();
  }, []);

  if (loading) return <div style={{ color: C.muted, padding: 40, textAlign: "center" }}>Carregando histórico...</div>;

  const maxTotal = Math.max(...monthsData.map(m => m.total), 1);
  const hasData = monthsData.some(m => m.total > 0);

  return (
    <div>
      {/* Bar chart — total por mês */}
      <Label>Gasto total por mês</Label>
      <Card style={{ marginBottom: 20 }}>
        {!hasData ? (
          <div style={{ color: C.muted, textAlign: "center", fontSize: 13, padding: 16 }}>Nenhum dado ainda. Comece a registrar gastos.</div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100, marginBottom: 8 }}>
            {monthsData.map((m, i) => {
              const h = m.total > 0 ? Math.max(8, (m.total / maxTotal) * 90) : 4;
              const isLast = i === monthsData.length - 1;
              return (
                <div key={m.mk} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ fontSize: 9, color: isLast ? C.accent : C.muted, fontWeight: isLast ? 700 : 400 }}>
                    {m.total > 0 ? fmtShort(m.total) : ""}
                  </div>
                  <div style={{
                    width: "100%", height: h, borderRadius: "4px 4px 0 0",
                    background: isLast ? C.accent : C.muted + "66",
                    transition: "height 0.4s"
                  }} />
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

      {/* Filtro por categoria */}
      <Label>Por categoria</Label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        <Pill active={!focusCat} onClick={() => setFocusCat(null)}>Todas</Pill>
        {CATEGORIES.map(c => (
          <Pill key={c.id} active={focusCat === c.id} onClick={() => setFocusCat(focusCat === c.id ? null : c.id)} color={c.color}>
            {c.label}
          </Pill>
        ))}
      </div>

      {/* Mini barras por categoria por mês */}
      {(focusCat ? CATEGORIES.filter(c => c.id === focusCat) : CATEGORIES).map(cat => (
        <div key={cat.id} style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color }} />
            <span style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{cat.label}</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 48, marginBottom: 4 }}>
            {monthsData.map((m, i) => {
              const spent = m.spentByCat[cat.id] || 0;
              const teto = m.tetos[cat.id] || 0;
              const maxV = Math.max(...monthsData.map(x => x.spentByCat[cat.id] || 0), teto, 1);
              const h = spent > 0 ? Math.max(4, (spent / maxV) * 44) : 3;
              const over = teto > 0 && spent > teto;
              const isLast = i === monthsData.length - 1;
              return (
                <div key={m.mk} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  {spent > 0 && <div style={{ fontSize: 8, color: over ? C.red : C.muted }}>{fmtShort(spent)}</div>}
                  <div style={{
                    width: "100%", height: h, borderRadius: "3px 3px 0 0",
                    background: over ? C.red : isLast ? cat.color : cat.color + "55"
                  }} />
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

      {/* Tabela resumo */}
      <Label style={{ marginTop: 8 }}>Tabela resumo</Label>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", color: C.muted, fontWeight: 600, padding: "6px 4px 10px", borderBottom: `1px solid ${C.border}` }}>Categoria</th>
              {monthsData.map(m => (
                <th key={m.mk} style={{ textAlign: "right", color: C.muted, fontWeight: 600, padding: "6px 4px 10px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{m.label}</th>
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
                  const over = m.tetos[cat.id] > 0 && spent > m.tetos[cat.id];
                  return (
                    <td key={m.mk} style={{ padding: "8px 4px", borderBottom: `1px solid ${C.border}`, textAlign: "right", color: over ? C.red : spent > 0 ? C.text : C.muted, whiteSpace: "nowrap" }}>
                      {spent > 0 ? fmtShort(spent) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr style={{ fontWeight: 700 }}>
              <td style={{ padding: "10px 4px", color: C.accent, fontSize: 12 }}>Total</td>
              {monthsData.map(m => (
                <td key={m.mk} style={{ padding: "10px 4px", textAlign: "right", color: C.accent, fontSize: 12, whiteSpace: "nowrap" }}>
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

// ─── LOGIN ─────────────────────────────────────────────────────────────────
function Login({ onUnlock }) {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState(false);
  const attempt = () => {
    if (pwd === APP_PASSWORD) { onUnlock(); }
    else { setError(true); setPwd(""); setTimeout(() => setError(false), 1500); }
  };
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ fontSize: 10, letterSpacing: 3, color: C.muted, textTransform: "uppercase", marginBottom: 12 }}>Ana's space</div>
      <div style={{ fontSize: 32, fontFamily: "Georgia, serif", color: C.text, marginBottom: 48 }}>Personal OS</div>
      <div style={{ width: "100%", maxWidth: 320 }}>
        <input type="password" value={pwd} onChange={e => setPwd(e.target.value)}
          onKeyDown={e => e.key === "Enter" && attempt()} placeholder="Password" autoFocus
          style={{ width: "100%", boxSizing: "border-box", background: error ? "#d46a6a18" : "#1e1a14", border: `1px solid ${error ? C.red : C.border}`, color: C.text, borderRadius: 10, padding: "12px 16px", fontSize: 16, outline: "none", fontFamily: "inherit", textAlign: "center", letterSpacing: 4, marginBottom: 12, transition: "border 0.2s" }} />
        <button onClick={attempt} style={{ width: "100%", background: C.accent, border: "none", color: "#fff", borderRadius: 10, padding: "12px 0", fontSize: 15, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>Enter</button>
        {error && <div style={{ color: C.red, textAlign: "center", marginTop: 12, fontSize: 13 }}>Senha incorreta.</div>}
      </div>
    </div>
  );
}

// ─── APP ───────────────────────────────────────────────────────────────────
const TABS = [
  { id: "today", label: "Today", icon: "◎" },
  { id: "finance", label: "Finanças", icon: "◈" },
  { id: "history", label: "Histórico", icon: "◑" },
];

export default function App() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("ana_unlocked") === "1");
  const [tab, setTab] = useState("today");
  const unlock = () => { sessionStorage.setItem("ana_unlocked", "1"); setUnlocked(true); };

  if (!unlocked) return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } body { background: #0e0c0a; }`}</style>
      <Login onUnlock={unlock} />
    </>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } input::placeholder { color: #4a3a28; } select option { background: #1e1a14; } body { background: #0e0c0a; }`}</style>
      <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 80 }}>
        <div style={{ padding: "32px 20px 20px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: C.muted, textTransform: "uppercase", marginBottom: 6 }}>Ana's space</div>
          <div style={{ fontSize: 26, fontFamily: "'DM Serif Display', Georgia, serif", color: C.text }}>Personal OS</div>
        </div>
        <div style={{ padding: "24px 20px" }}>
          {tab === "today" && <Today />}
          {tab === "finance" && <Finance />}
          {tab === "history" && <History />}
        </div>
      </div>
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, background: "none", border: "none", color: tab === t.id ? C.accent : C.muted,
            padding: "14px 0 18px", cursor: "pointer", fontFamily: "inherit",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            borderTop: `2px solid ${tab === t.id ? C.accent : "transparent"}`, transition: "all 0.2s"
          }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <span style={{ fontSize: 11, fontWeight: tab === t.id ? 700 : 400, letterSpacing: 0.5 }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}