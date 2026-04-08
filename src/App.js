import { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { C } from "./constants";
import Today from "./components/Today";
import Finance from "./components/Finance";
import Box from "./components/Box";
import History from "./components/History";
import Login from "./components/Login";

const ALLOWED_EMAIL = process.env.REACT_APP_ALLOWED_EMAIL;

const TABS = [
  { id: "today",   label: "Today",     icon: "◎" },
  { id: "finance", label: "Finanças",  icon: "◈" },
  { id: "box",     label: "Box",       icon: "◻" },
  { id: "history", label: "Histórico", icon: "◑" },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [tab, setTab] = useState("today");

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
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
  }, []);

  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch {
      setLoginLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: C.muted, fontSize: 13 }}>Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return (
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
  }

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
          {tab === "today"   && <Today />}
          {tab === "finance" && <Finance />}
          {tab === "box"     && <Box />}
          {tab === "history" && <History />}
        </div>
      </div>

      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex" }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, background: "none", border: "none",
              color: tab === t.id ? C.accent : C.muted,
              padding: "14px 0 18px", cursor: "pointer", fontFamily: "inherit",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              borderTop: `2px solid ${tab === t.id ? C.accent : "transparent"}`,
              transition: "all 0.2s",
            }}
          >
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <span style={{ fontSize: 11, fontWeight: tab === t.id ? 700 : 400, letterSpacing: 0.5 }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
