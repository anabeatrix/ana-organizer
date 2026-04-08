import { C } from "../constants";

export function Input({ style, ...props }) {
  return (
    <input
      {...props}
      style={{
        background: "#1e1a14",
        border: `1px solid ${C.border}`,
        color: C.text,
        borderRadius: 8,
        padding: "9px 12px",
        fontSize: 14,
        outline: "none",
        fontFamily: "inherit",
        ...style,
      }}
    />
  );
}

export function Select({ style, children, ...props }) {
  return (
    <select
      {...props}
      style={{
        background: "#1e1a14",
        border: `1px solid ${C.border}`,
        color: C.text,
        borderRadius: 8,
        padding: "9px 12px",
        fontSize: 14,
        outline: "none",
        fontFamily: "inherit",
        cursor: "pointer",
        ...style,
      }}
    >
      {children}
    </select>
  );
}

export function Card({ children, style }) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 18,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Label({ children }) {
  return (
    <div
      style={{
        fontSize: 10,
        color: C.muted,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        marginBottom: 10,
        fontWeight: 700,
      }}
    >
      {children}
    </div>
  );
}

export function Pill({ children, active, onClick, color }) {
  const col = color || C.accent;
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? col + "22" : "none",
        border: `1px solid ${active ? col : C.border}`,
        color: active ? col : C.muted,
        borderRadius: 20,
        padding: "5px 14px",
        fontSize: 12,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.2s",
        fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </button>
  );
}

export function BudgetBar({ label, spent, teto, color, onPress }) {
  const pct = teto > 0 ? Math.min(100, (spent / teto) * 100) : 0;
  const over = teto > 0 && spent > teto;
  const warn = !over && pct >= 80;
  const barColor = over ? C.red : warn ? C.orange : color;

  return (
    <button
      onClick={onPress}
      style={{
        width: "100%",
        background: "none",
        border: "none",
        padding: "12px 0",
        borderBottom: `1px solid ${C.border}`,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: over ? C.red : C.text, fontWeight: over ? 700 : 400 }}>
          {label}
        </span>
        <span style={{ fontSize: 12, color: over ? C.red : warn ? C.orange : C.muted }}>
          {spent.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          {teto > 0 && ` / ${teto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}
          {over && " ⚠"}
        </span>
      </div>
      {teto > 0 && (
        <div style={{ background: "#2a2318", borderRadius: 999, height: 4, overflow: "hidden" }}>
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: barColor,
              borderRadius: 999,
              transition: "width 0.4s",
            }}
          />
        </div>
      )}
    </button>
  );
}
