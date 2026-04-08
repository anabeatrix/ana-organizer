import { useState } from "react";
import { C } from "../constants";
import { todayKey } from "../utils";
import { useFirestore } from "../hooks/useFirestore";
import { Card, Input, Label } from "./ui";

function computeStreak(history, key) {
  const today = todayKey();
  let streak = 0;
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

const HABITS = [
  { key: "english", label: "English",   sub: "Voice conversation", color: C.blue,  emoji: "🗣️" },
  { key: "gym",     label: "Gym / Run", sub: "Move your body",     color: C.green, emoji: "🏃‍♀️" },
];

export default function Today() {
  const today = todayKey();
  const [history, setHistory, histReady] = useFirestore("checkin_history", {});
  const [priority, setPriority] = useFirestore("priority_" + today, "");

  const todayData = history[today] || { english: false, gym: false };

  const toggle = key =>
    setHistory({ ...history, [today]: { ...todayData, [key]: !todayData[key] } });

  const engStreak = computeStreak(history, "english");
  const gymStreak = computeStreak(history, "gym");

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning, Ana.";
    if (h < 18) return "Good afternoon, Ana.";
    return "Good evening, Ana.";
  };

  const allDone = todayData.english && todayData.gym && priority?.trim();

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return {
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en", { weekday: "short" }).slice(0, 1),
    };
  });

  if (!histReady) {
    return <div style={{ color: C.muted, padding: 40, textAlign: "center" }}>Loading...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontFamily: "Georgia, serif", color: C.text, marginBottom: 4 }}>
          {greeting()}
        </div>
        <div style={{ fontSize: 13, color: C.muted }}>
          {new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}
        </div>
      </div>

      {/* Habit cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        {HABITS.map(h => {
          const done = todayData[h.key];
          const streak = h.key === "english" ? engStreak : gymStreak;
          return (
            <button
              key={h.key}
              onClick={() => toggle(h.key)}
              style={{
                background: done ? h.color + "18" : C.surface,
                border: `2px solid ${done ? h.color : C.border}`,
                borderRadius: 14,
                padding: 16,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.25s",
                outline: "none",
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>{h.emoji}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: done ? h.color : C.text, marginBottom: 2 }}>
                {h.label}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>{h.sub}</div>
              <StreakFlame n={streak} color={done ? h.color : C.muted} />
            </button>
          );
        })}
      </div>

      {/* Priority */}
      <Card style={{ marginBottom: 20 }}>
        <Label>Today's one priority</Label>
        <Input
          value={priority || ""}
          onChange={e => setPriority(e.target.value)}
          placeholder="What's the one thing that matters today?"
          style={{ width: "100%", boxSizing: "border-box" }}
        />
      </Card>

      {/* Week overview */}
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
                <div style={{ fontSize: 10, color: isToday ? C.accent : C.muted, marginBottom: 6, fontWeight: isToday ? 700 : 400 }}>
                  {label}
                </div>
                <div
                  style={{
                    width: 28, height: 28, borderRadius: "50%", margin: "0 auto",
                    background: both ? C.green + "33" : one ? C.accent + "33" : C.border,
                    border: `2px solid ${both ? C.green : one ? C.accent : "transparent"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, color: C.text,
                  }}
                >
                  {both ? "✓" : one ? "·" : ""}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Completion banner */}
      {allDone && (
        <div
          style={{
            background: C.green + "18",
            border: `1px solid ${C.green}44`,
            borderRadius: 12,
            padding: 14,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 20, marginBottom: 4 }}>🎯</div>
          <div style={{ color: C.green, fontSize: 14, fontWeight: 600 }}>Day complete. Well done.</div>
        </div>
      )}
    </div>
  );
}
