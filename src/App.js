import { useState, useEffect, useCallback, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from "firebase/firestore";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";

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
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const ALLOWED_EMAIL = process.env.REACT_APP_ALLOWED_EMAIL;

const C = {
  bg: "#0e0c0a", surface: "#161310", border: "#2a2318",
  text: "#f0e6d4", muted: "#6a5a48", accent: "#d4874a",
  green: "#6db87a", red: "#d46a6a", blue: "#6a9bd4", gold: "#c8a84a",
  orange: "#d4a44a",
};

const todayKey = () => {
  const d = new Date();
  d.setHours(d.getHours() - 3);
  return d.toISOString().slice(0, 10);
};
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
  { id: "moradia", label: "Moradia", color: C.blue, type: "fixa", subs: ["Aluguel", "Luz", "Água", "Outros"] },
  { id: "pessoal", label: "Pessoal Fixo", color: C.gold, type: "fixa", subs: ["Celular", "Internet", "Academia", "Pilates", "Outros"] },
  { id: "educacao", label: "Educação", color: C.accent, type: "fixa", subs: ["Faculdade", "Escola Irmã", "Inglês", "Italiano", "Cursos/Livros", "Outros"] },
  { id: "outras_fixas", label: "Outras Fixas", color: "#a07ab8", type: "fixa", subs: ["Assinaturas", "Donativos", "Terapia", "Terceiros/Empréstimo", "Outros"] },
  { id: "variaveis", label: "Variáveis", color: C.green, type: "variavel", subs: ["Dia a dia", "Mercado", "Feira", "Padaria/Lanche", "Combustível/Uber", "Farmácia", "Consultas", "Beleza", "Roupas/Compras", "Lazer/Passeio", "Pets", "Papelaria", "Presentes", "Extra", "Outros"] },
  { id: "viagem", label: "Viagem", color: C.orange, type: "variavel", subs: ["Passagem", "Hospedagem", "Passeio", "Alimentação", "Outros"] },
];

const INCOME_CATS = ["Salário", "Vale", "PLR", "Freelance", "Resgates", "Outros"];

const toKey = s => s.replace(/[^a-zA-Z0-9]/g, "_");

const buildDefaultTetos = () => {
  const result = {};
  const defaults = {
    moradia: { Aluguel: 2700, Luz: 0, gua: 0, Outros: 0 },
    pessoal: { Celular: 38, Internet: 85, Academia: 0, Pilates: 0, Outros: 0 },
    educacao: { Faculdade: 500, Outros: 70 },
    outras_fixas: { Assinaturas: 170, Donativos: 200, Terapia: 0, Outros: 0 },
    variaveis: { Mercado: 680, Extra: 600, Outros: 0 },
    viagem: {},
  };
  const CATS_STATIC = [
    { id: "moradia", subs: ["Aluguel", "Luz", "Água", "Outros"] },
    { id: "pessoal", subs: ["Celular", "Internet", "Academia", "Pilates", "Outros"] },
    { id: "educacao", subs: ["Faculdade", "Escola Irmã", "Inglês", "Italiano", "Cursos/Livros", "Outros"] },
    { id: "outras_fixas", subs: ["Assinaturas", "Donativos", "Terapia", "Terceiros/Empréstimo", "Outros"] },
    { id: "variaveis", subs: ["Dia a dia", "Mercado", "Feira", "Padaria/Lanche", "Combustível/Uber", "Farmácia", "Consultas", "Beleza", "Roupas/Compras", "Lazer/Passeio", "Pets", "Papelaria", "Presentes", "Extra", "Outros"] },
    { id: "viagem", subs: ["Passagem", "Hospedagem", "Passeio", "Alimentação", "Outros"] },
  ];
  CATS_STATIC.forEach(c => {
    result[c.id] = {};
    c.subs.forEach(s => { result[c.id][toKey(s)] = 0; });
    if (defaults[c.id]) Object.assign(result[c.id], defaults[c.id]);
  });
  return result;
};

const DEFAULT_TETOS = buildDefaultTetos();

const catTotal = (tetos, catId) => Object.values(tetos[catId] || {}).reduce((a, v) => a + (v || 0), 0);
const totalTetos = (tetos) => CATEGORIES.reduce((a, c) => a + catTotal(tetos, c.id), 0);

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
  const [incomes, setIncomes] = useFirestore("incomes_" + mk, []);
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

  const [incomeDesc, setIncomeDesc] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeCat, setIncomeCat] = useState("Salário");
  const [showIncome, setShowIncome] = useState(false);

  const addExpense = () => {
    if (!desc.trim() || !amount) return;
    const catObj = CATEGORIES.find(c => c.id === cat);
    setExpenses([...expenses, { id: Date.now(), desc, amount: parseFloat(amount), cat, sub, date: todayKey(), label: catObj?.label || cat }]);
    setDesc(""); setAmount(""); setShowLog(false);
  };

  const addIncome = () => {
    if (!incomeDesc.trim() || !incomeAmount) return;
    setIncomes([...incomes, { id: Date.now(), desc: incomeDesc, amount: parseFloat(incomeAmount), cat: incomeCat, date: todayKey() }]);
    setIncomeDesc(""); setIncomeAmount(""); setShowIncome(false);
  };

  const addInv = () => {
    if (!invName.trim() || !invVal) return;
    setInvestments([...investments, { id: Date.now(), name: invName, cat: invCat, value: parseFloat(invVal) }]);
    setInvName(""); setInvVal("");
  };

  const spentByCat = expenses.reduce((acc, e) => { acc[e.cat] = (acc[e.cat] || 0) + e.amount; return acc; }, {});
  const totalSpent = Object.values(spentByCat).reduce((a, v) => a + v, 0);
  const totalIncome = incomes.reduce((a, i) => a + i.amount, 0);
  const saldo = totalIncome - totalSpent;
  const totalTeto = totalTetos(tetos);
  const netWorth = investments.reduce((a, i) => a + i.value, 0);
  const overBudget = CATEGORIES.filter(c => spentByCat[c.id] > catTotal(tetos, c.id) && catTotal(tetos, c.id) > 0);
  const filteredExpenses = filterCat ? expenses.filter(e => e.cat === filterCat) : expenses;
  const currentCat = CATEGORIES.find(c => c.id === cat);

  if (!expReady) return <div style={{ color: C.muted, padding: 40, textAlign: "center" }}>Loading...</div>;

  return (
    <div>
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
            <div style={{ width: `${Math.min(100, (totalSpent / totalTeto) * 100)}%`, height: "100%", background: totalSpent > totalTeto ? C.red : C.accent, transition: "width 0.4s" }} />
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
          <div style={{ fontSize: 20, fontWeight: 800, color: C.gold, fontFamily: "Georgia, serif" }}>{fmtShort(netWorth)}</div>
          {overBudget.length > 0 && <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>⚠ {overBudget.length} estourada{overBudget.length > 1 ? "s" : ""}</div>}
        </Card>
      </div>

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

      {showIncome && (
        <Card style={{ marginBottom: 16, marginTop: 16, borderColor: C.green + "44" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <Input value={incomeAmount} onChange={e => setIncomeAmount(e.target.value)} type="number" placeholder="R$ 0,00"
                style={{ width: 110, fontSize: 18, fontWeight: 700 }} autoFocus />
              <Input value={incomeDesc} onChange={e => setIncomeDesc(e.target.value)} placeholder="Descrição"
                onKeyDown={e => e.key === "Enter" && addIncome()} style={{ flex: 1 }} />
            </div>
            <Select value={incomeCat} onChange={e => setIncomeCat(e.target.value)} style={{ width: "100%" }}>
              {INCOME_CATS.map(c => <option key={c}>{c}</option>)}
            </Select>
            <button onClick={addIncome} style={{
              background: C.green, border: "none", color: "#fff", borderRadius: 8,
              padding: "11px 0", fontSize: 14, cursor: "pointer", fontFamily: "inherit", fontWeight: 700
            }}>Salvar receita</button>
          </div>
        </Card>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", marginTop: 16 }}>
        {["overview", "gastos", "receitas", "tetos", "investimentos"].map(v => (
          <Pill key={v} active={view === v} onClick={() => { setView(v); setFilterCat(null); }}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </Pill>
        ))}
      </div>

      {view === "overview" && !filterCat && (
        <div>
          <Label>Teto vs realizado</Label>
          {CATEGORIES.map(c => (
            <BudgetBar key={c.id} label={c.label} spent={spentByCat[c.id] || 0} teto={catTotal(tetos, c.id)}
              color={c.color} onPress={() => setFilterCat(c.id)} />
          ))}
          <div style={{ fontSize: 11, color: C.muted, marginTop: 12, textAlign: "center" }}>Toque numa categoria para detalhar</div>
        </div>
      )}

      {view === "overview" && filterCat && (() => {
        const cat = CATEGORIES.find(c => c.id === filterCat);
        if (!cat) return null;
        const catSubs = tetos[filterCat] || {};
        const spentBySub = expenses.filter(e => e.cat === filterCat).reduce((acc, e) => {
          acc[toKey(e.sub)] = (acc[toKey(e.sub)] || 0) + e.amount;
          return acc;
        }, {});
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <button onClick={() => setFilterCat(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, padding: 0 }}>←</button>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: cat.color }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{cat.label}</span>
              <span style={{ marginLeft: "auto", fontSize: 12, color: cat.color, fontWeight: 700 }}>
                {fmt(spentByCat[filterCat] || 0)} / {fmt(catTotal(tetos, filterCat))}
              </span>
            </div>
            {cat.subs.map(sub => {
              const sk = toKey(sub);
              const subTeto = catSubs[sk] || 0;
              const subSpent = spentBySub[sk] || 0;
              const over = subTeto > 0 && subSpent > subTeto;
              const warn = subTeto > 0 && subSpent / subTeto >= 0.8 && !over;
              const pct = subTeto > 0 ? Math.min(100, (subSpent / subTeto) * 100) : 0;
              const barColor = over ? C.red : warn ? C.orange : cat.color;
              if (subTeto === 0 && subSpent === 0) return null;
              return (
                <div key={sub} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: over ? C.red : C.text, fontWeight: over ? 700 : 400 }}>{sub}{over && " ⚠"}</span>
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
            <button onClick={() => { setView("gastos"); }} style={{
              marginTop: 16, width: "100%", background: "none", border: `1px solid ${C.border}`,
              color: C.muted, borderRadius: 10, padding: "10px 0", fontSize: 13,
              cursor: "pointer", fontFamily: "inherit"
            }}>Ver todos os gastos desta categoria →</button>
          </div>
        );
      })()}

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

      {view === "tetos" && (
        <div>
          {CATEGORIES.map(c => {
            const catTeto = catTotal(tetos, c.id);
            const catSubs = tetos[c.id] || {};
            return (
              <div key={c.id} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C.text }}>{c.label}</span>
                  <span style={{ fontSize: 12, color: c.color, fontWeight: 700 }}>{fmt(catTeto)}</span>
                </div>
                {c.subs.map(sub => {
                  const sk = toKey(sub);
                  const val = catSubs[sk] !== undefined ? catSubs[sk] : (DEFAULT_TETOS[c.id]?.[sk] || 0);
                  return (
                    <div key={sub} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, paddingLeft: 16 }}>
                      <span style={{ flex: 1, fontSize: 12, color: C.muted }}>{sub}</span>
                      <Input type="number" value={val}
                        onChange={e => {
                          const newCat = { ...catSubs, [sk]: parseFloat(e.target.value) || 0 };
                          setTetos({ ...tetos, [c.id]: newCat });
                        }}
                        style={{ width: 100, textAlign: "right", fontSize: 12, padding: "6px 10px" }} />
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
        const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
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
      <Label>Gasto total por mês</Label>
      <Card style={{ marginBottom: 20 }}>
        {!hasData ? (
          <div style={{ color: C.muted, textAlign: "center", fontSize: 13, padding: 16 }}>Nenhum dado ainda.</div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100, marginBottom: 8 }}>
            {monthsData.map((m, i) => {
              const h = m.total > 0 ? Math.max(8, (m.total / maxTotal) * 90) : 4;
              const isLast = i === monthsData.length - 1;
              return (
                <div key={m.mk} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ fontSize: 9, color: isLast ? C.accent : C.muted }}>{m.total > 0 ? fmtShort(m.total) : ""}</div>
                  <div style={{ width: "100%", height: h, borderRadius: "4px 4px 0 0", background: isLast ? C.accent : C.muted + "66" }} />
                </div>
              );
            })}
          </div>
        )}
        <div style={{ display: "flex", gap: 6 }}>
          {monthsData.map((m, i) => (
            <div key={m.mk} style={{ flex: 1, textAlign: "center", fontSize: 9, color: i === monthsData.length - 1 ? C.accent : C.muted }}>{m.label}</div>
          ))}
        </div>
      </Card>

      <Label>Por categoria</Label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        <Pill active={!focusCat} onClick={() => setFocusCat(null)}>Todas</Pill>
        {CATEGORIES.map(c => (
          <Pill key={c.id} active={focusCat === c.id} onClick={() => setFocusCat(focusCat === c.id ? null : c.id)} color={c.color}>{c.label}</Pill>
        ))}
      </div>

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
              const maxV = Math.max(...monthsData.map(x => x.spentByCat[cat.id] || 0), catTotal(m.tetos, cat.id), 1);
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
              <div key={m.mk} style={{ flex: 1, textAlign: "center", fontSize: 8, color: i === monthsData.length - 1 ? C.accent : C.muted }}>{m.label}</div>
            ))}
          </div>
        </div>
      ))}

      <Label>Tabela resumo</Label>
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
                  const over = catTotal(m.tetos, cat.id) > 0 && spent > catTotal(m.tetos, cat.id);
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
function Login({ onLogin, loading }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ fontSize: 10, letterSpacing: 3, color: C.muted, textTransform: "uppercase", marginBottom: 12 }}>Ana's space</div>
      <div style={{ fontSize: 32, fontFamily: "Georgia, serif", color: C.text, marginBottom: 16 }}>Personal OS</div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 48 }}>Acesso restrito</div>
      <button onClick={onLogin} disabled={loading} style={{
        background: loading ? C.surface : C.accent, border: "none", color: loading ? C.muted : "#fff",
        borderRadius: 12, padding: "14px 32px", fontSize: 15,
        cursor: loading ? "default" : "pointer", fontFamily: "inherit", fontWeight: 600,
        display: "flex", alignItems: "center", gap: 10, transition: "all 0.2s"
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        {loading ? "Entrando..." : "Entrar com Google"}
      </button>
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
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [tab, setTab] = useState("today");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        if (ALLOWED_EMAIL && u.email !== ALLOWED_EMAIL) {
          signOut(auth);
          setAccessDenied(true);
          setUser(null);
        } else {
          setUser(u);
          setAccessDenied(false);
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const handleLogin = async () => {
    setLoginLoading(true);
    try { await signInWithPopup(auth, provider); }
    catch { setLoginLoading(false); }
  };

  if (authLoading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: C.muted, fontSize: 13 }}>Carregando...</div>
    </div>
  );

  if (!user) return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } body { background: #0e0c0a; }`}</style>
      {accessDenied && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: C.red + "22", border: `1px solid ${C.red}44`, borderRadius: 10, padding: "10px 20px", color: C.red, fontSize: 13, zIndex: 999 }}>
          Acesso não autorizado.
        </div>
      )}
      <Login onLogin={handleLogin} loading={loginLoading} />
    </>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } input::placeholder { color: #4a3a28; } select option { background: #1e1a14; } body { background: #0e0c0a; }`}</style>
      <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 80 }}>
        <div style={{ padding: "32px 20px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: C.muted, textTransform: "uppercase", marginBottom: 6 }}>Ana's space</div>
            <div style={{ fontSize: 26, fontFamily: "'DM Serif Display', Georgia, serif", color: C.text }}>Personal OS</div>
          </div>
          <button onClick={() => signOut(auth)} style={{ background: "none", border: "none", color: C.muted, fontSize: 11, cursor: "pointer", fontFamily: "inherit", padding: "4px 0" }}>
            Sair
          </button>
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