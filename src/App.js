import { useState, useEffect, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

// ─── FIREBASE ──────────────────────────────────────────────────────────────
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

// ─── PASSWORD ──────────────────────────────────────────────────────────────
const APP_PASSWORD = process.env.REACT_APP_PASSWORD;

// ─── CONSTANTS ─────────────────────────────────────────────────────────────
const EXPENSE_CATS = ["Food", "Transport", "Housing", "Health", "Learning", "Leisure", "Other"];
const BUDGET_DEFAULTS = { Food: 800, Transport: 200, Housing: 1500, Health: 200, Learning: 150, Leisure: 300, Other: 200 };
const INV_CATS = ["Stocks", "FII", "Renda Fixa", "Crypto", "International", "Cash"];

const C = {
  bg: "#0e0c0a", surface: "#161310", border: "#2a2318",
  text: "#f0e6d4", muted: "#6a5a48", accent: "#d4874a",
  green: "#6db87a", red: "#d46a6a", blue: "#6a9bd4",
  gold: "#c8a84a",
};

const todayKey = () => new Date().toISOString().slice(0, 10);
const monthKey = () => new Date().toISOString().slice(0, 7);
const fmt = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtShort = v => {
  if (v >= 1000000) return `R$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$${(v / 1000).toFixed(1)}k`;
  return fmt(v);
};

// ─── FIREBASE HOOK ─────────────────────────────────────────────────────────
function useFirestore(docPath, fallback) {
  const [data, setData] = useState(fallback);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ref = doc(db, "ana", docPath);
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) setData(snap.data().value ?? fallback);
      else setData(fallback);
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

// ─── COMPONENTS ────────────────────────────────────────────────────────────
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

// ─── STREAK ────────────────────────────────────────────────────────────────
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
        <div style={{ fontSize: 13, color: C.muted }}>
          {new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        {habits.map(h => {
          const done = todayData[h.key];
          const streak = h.key === "english" ? engStreak : gymStreak;
          return (
            <button key={h.key} onClick={() => toggle(h.key)} style={{
              background: done ? h.color + "18" : C.surface,
              border: `2px solid ${done ? h.color : C.border}`,
              borderRadius: 14, padding: 16, cursor: "pointer", textAlign: "left",
              transition: "all 0.25s", outline: "none"
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
        <Input
          value={priority || ""}
          onChange={e => setPriority(e.target.value)}
          placeholder="What's the one thing that matters today?"
          style={{ width: "100%", boxSizing: "border-box" }}
        />
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
                }}>
                  {both ? "✓" : one ? "·" : ""}
                </div>
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
  const [budget, setBudget] = useFirestore("budget", BUDGET_DEFAULTS);
  const [investments, setInvestments] = useFirestore("investments", [
    { id: 1, name: "Tesouro Selic", cat: "Renda Fixa", value: 5000 },
    { id: 2, name: "BOVA11", cat: "Stocks", value: 3200 },
  ]);
  const [view, setView] = useState("overview");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState("Food");
  const [invName, setInvName] = useState("");
  const [invVal, setInvVal] = useState("");
  const [invCat, setInvCat] = useState("Renda Fixa");

  const addExpense = () => {
    if (!desc.trim() || !amount) return;
    setExpenses([...expenses, { id: Date.now(), desc, amount: parseFloat(amount), cat, date: todayKey() }]);
    setDesc(""); setAmount("");
  };

  const addInv = () => {
    if (!invName.trim() || !invVal) return;
    setInvestments([...investments, { id: Date.now(), name: invName, cat: invCat, value: parseFloat(invVal) }]);
    setInvName(""); setInvVal("");
  };

  const spentByCat = expenses.reduce((acc, e) => { acc[e.cat] = (acc[e.cat] || 0) + e.amount; return acc; }, {});
  const totalSpent = Object.values(spentByCat).reduce((a, v) => a + v, 0);
  const totalBudget = Object.values(budget).reduce((a, v) => a + v, 0);
  const netWorth = investments.reduce((a, i) => a + i.value, 0);
  const invByCat = investments.reduce((acc, i) => { acc[i.cat] = (acc[i.cat] || 0) + i.value; return acc; }, {});

  if (!expReady) return <div style={{ color: C.muted, padding: 40, textAlign: "center" }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <Card>
          <Label>Spent this month</Label>
          <div style={{ fontSize: 22, fontWeight: 800, color: totalSpent > totalBudget ? C.red : C.text, fontFamily: "Georgia, serif" }}>{fmtShort(totalSpent)}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>of {fmtShort(totalBudget)} budget</div>
          <div style={{ background: C.border, borderRadius: 999, height: 4, marginTop: 10, overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, (totalSpent / totalBudget) * 100)}%`, height: "100%", background: totalSpent > totalBudget ? C.red : C.accent, transition: "width 0.4s" }} />
          </div>
        </Card>
        <Card>
          <Label>Net worth</Label>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.gold, fontFamily: "Georgia, serif" }}>{fmtShort(netWorth)}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{investments.length} positions</div>
        </Card>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {["overview", "expenses", "budget", "investments"].map(v => (
          <Pill key={v} active={view === v} onClick={() => setView(v)}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </Pill>
        ))}
      </div>

      {view === "overview" && (
        <div>
          <Label>Budget vs actual</Label>
          {EXPENSE_CATS.map(c => {
            const spent = spentByCat[c] || 0;
            const bud = budget[c] || 0;
            const over = spent > bud;
            const pct = bud ? Math.min(100, (spent / bud) * 100) : 0;
            return (
              <div key={c} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                  <span style={{ color: C.text }}>{c}</span>
                  <span style={{ color: over ? C.red : C.muted }}>{fmt(spent)} / {fmt(bud)}</span>
                </div>
                <div style={{ background: C.border, borderRadius: 999, height: 5, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: over ? C.red : C.green, borderRadius: 999, transition: "width 0.4s" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "expenses" && (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <Label>Add expense</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description" style={{ width: "100%", boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <Input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="Amount" style={{ flex: 1 }} />
                <Select value={cat} onChange={e => setCat(e.target.value)}>
                  {EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}
                </Select>
              </div>
              <button onClick={addExpense} style={{
                background: C.accent, border: "none", color: "#fff", borderRadius: 8,
                padding: "10px 0", fontSize: 14, cursor: "pointer", fontFamily: "inherit", fontWeight: 600
              }}>+ Log expense</button>
            </div>
          </Card>
          {expenses.slice().reverse().map(e => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: C.text }}>{e.desc}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{e.cat} · {e.date}</div>
              </div>
              <span style={{ color: C.red, fontWeight: 700, fontSize: 14 }}>-{fmt(e.amount)}</span>
              <button onClick={() => setExpenses(expenses.filter(x => x.id !== e.id))}
                style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, padding: 0 }}>×</button>
            </div>
          ))}
          {expenses.length === 0 && <div style={{ color: C.muted, textAlign: "center", padding: 32, fontSize: 13 }}>No expenses logged yet.</div>}
        </div>
      )}

      {view === "budget" && (
        <div>
          <Label>Monthly budget by category</Label>
          {EXPENSE_CATS.map(c => (
            <div key={c} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ flex: 1, fontSize: 13, color: C.text }}>{c}</span>
              <Input type="number" value={budget[c] || 0}
                onChange={e => setBudget({ ...budget, [c]: parseFloat(e.target.value) || 0 })}
                style={{ width: 100 }} />
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 4, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: C.muted, fontSize: 13 }}>Total budget</span>
            <span style={{ color: C.accent, fontWeight: 700 }}>{fmt(totalBudget)}</span>
          </div>
        </div>
      )}

      {view === "investments" && (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <Label>Add position</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Input value={invName} onChange={e => setInvName(e.target.value)} placeholder="Asset name (e.g. BOVA11)" style={{ width: "100%", boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <Input value={invVal} onChange={e => setInvVal(e.target.value)} type="number" placeholder="Current value" style={{ flex: 1 }} />
                <Select value={invCat} onChange={e => setInvCat(e.target.value)}>
                  {INV_CATS.map(c => <option key={c}>{c}</option>)}
                </Select>
              </div>
              <button onClick={addInv} style={{
                background: C.gold + "cc", border: "none", color: "#1a1410", borderRadius: 8,
                padding: "10px 0", fontSize: 14, cursor: "pointer", fontFamily: "inherit", fontWeight: 700
              }}>+ Add position</button>
            </div>
          </Card>
          {Object.entries(invByCat).sort((a, b) => b[1] - a[1]).map(([c, val]) => (
            <div key={c} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                <span style={{ color: C.text }}>{c}</span>
                <span style={{ color: C.gold }}>{fmt(val)} · {((val / netWorth) * 100).toFixed(1)}%</span>
              </div>
              <div style={{ background: C.border, borderRadius: 999, height: 5, overflow: "hidden" }}>
                <div style={{ width: `${(val / netWorth) * 100}%`, height: "100%", background: C.gold, borderRadius: 999 }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 20 }}>
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
          </div>
        </div>
      )}
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
        <input
          type="password"
          value={pwd}
          onChange={e => setPwd(e.target.value)}
          onKeyDown={e => e.key === "Enter" && attempt()}
          placeholder="Password"
          autoFocus
          style={{
            width: "100%", boxSizing: "border-box",
            background: error ? "#d46a6a18" : "#1e1a14",
            border: `1px solid ${error ? C.red : C.border}`,
            color: C.text, borderRadius: 10, padding: "12px 16px",
            fontSize: 16, outline: "none", fontFamily: "inherit",
            textAlign: "center", letterSpacing: 4, marginBottom: 12,
            transition: "border 0.2s"
          }}
        />
        <button onClick={attempt} style={{
          width: "100%", background: C.accent, border: "none", color: "#fff",
          borderRadius: 10, padding: "12px 0", fontSize: 15,
          cursor: "pointer", fontFamily: "inherit", fontWeight: 600
        }}>Enter</button>
        {error && <div style={{ color: C.red, textAlign: "center", marginTop: 12, fontSize: 13 }}>Wrong password.</div>}
      </div>
    </div>
  );
}

// ─── APP ───────────────────────────────────────────────────────────────────
const TABS = [
  { id: "today", label: "Today", icon: "◎" },
  { id: "finance", label: "Finance", icon: "◈" },
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
        </div>
      </div>

      <div style={{
        position: "fixed", bottom: 0,
        left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480,
        background: C.surface, borderTop: `1px solid ${C.border}`,
        display: "flex",
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, background: "none", border: "none",
            color: tab === t.id ? C.accent : C.muted,
            padding: "14px 0 18px", cursor: "pointer", fontFamily: "inherit",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            borderTop: `2px solid ${tab === t.id ? C.accent : "transparent"}`,
            transition: "all 0.2s"
          }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <span style={{ fontSize: 11, fontWeight: tab === t.id ? 700 : 400, letterSpacing: 0.5 }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
