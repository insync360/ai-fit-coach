import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { todayKey, totalsForDate, useStore } from "@/lib/store";
import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_authed/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Trends & Insights" },
      { name: "description", content: "Calorie, macro, and adherence trends across configurable date ranges." },
    ],
  }),
  component: Analytics,
});

type RangePreset = "7d" | "15d" | "30d" | "month" | "custom";

const PRESETS: { v: RangePreset; l: string }[] = [
  { v: "7d", l: "7d" },
  { v: "15d", l: "15d" },
  { v: "30d", l: "30d" },
  { v: "month", l: "Month" },
  { v: "custom", l: "Custom" },
];

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function fmtKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtShortDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Analytics() {
  const state = useStore((s) => s);
  const target = state.profile.targetCalories;

  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const todayStr = fmtKey(today);

  const [preset, setPreset] = useState<RangePreset>("7d");
  const [customFrom, setCustomFrom] = useState<string>(fmtKey(addDays(today, -6)));
  const [customTo, setCustomTo] = useState<string>(todayStr);

  const { from, to, label: rangeLabel } = useMemo(() => {
    if (preset === "7d") return { from: addDays(today, -6), to: today, label: "Last 7 days" };
    if (preset === "15d") return { from: addDays(today, -14), to: today, label: "Last 15 days" };
    if (preset === "30d") return { from: addDays(today, -29), to: today, label: "Last 30 days" };
    if (preset === "month") {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const label = today.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      return { from: monthStart, to: today, label };
    }
    // custom
    let f = startOfLocalDay(new Date(customFrom));
    let t = startOfLocalDay(new Date(customTo));
    if (Number.isNaN(f.getTime())) f = today;
    if (Number.isNaN(t.getTime())) t = today;
    if (f > t) [f, t] = [t, f];
    return { from: f, to: t, label: `${fmtShortDate(f)} — ${fmtShortDate(t)}` };
  }, [preset, customFrom, customTo, today]);

  const series = useMemo(() => {
    const days: { date: string; label: string; calories: number; protein: number; carbs: number; fat: number }[] = [];
    const cur = new Date(from);
    const useWeekday = (to.getTime() - from.getTime()) / 86400000 <= 7;
    while (cur <= to) {
      const k = fmtKey(cur);
      const t = totalsForDate(state, k);
      days.push({
        date: k,
        label: useWeekday
          ? cur.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2)
          : String(cur.getDate()),
        calories: Math.round(t.calories),
        protein: Math.round(t.protein),
        carbs: Math.round(t.carbs),
        fat: Math.round(t.fat),
      });
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }, [from, to, state]);

  const dayCount = series.length || 1;
  const avgCals = Math.round(series.reduce((a, d) => a + d.calories, 0) / dayCount);
  const avgProt = Math.round(series.reduce((a, d) => a + d.protein, 0) / dayCount);
  const onTargetDays = series.filter((d) => d.calories > 0 && Math.abs(d.calories - target) <= target * 0.1).length;
  const adherence = Math.round((onTargetDays / dayCount) * 100);
  const loggedDays = series.filter((d) => d.calories > 0).length;
  // Thin X-axis ticks so labels don't collide on long ranges. With 30+ days
  // we want roughly 7 visible ticks.
  const xInterval = series.length > 10 ? Math.max(0, Math.floor(series.length / 7) - 1) : 0;

  const todayTotals = useMemo(() => totalsForDate(state, todayKey()), [state]);
  const macroPie = [
    { name: "Protein", value: Math.round(todayTotals.protein * 4), color: "var(--color-protein)" },
    { name: "Carbs", value: Math.round(todayTotals.carbs * 4), color: "var(--color-carbs)" },
    { name: "Fat", value: Math.round(todayTotals.fat * 9), color: "var(--color-fat)" },
  ];
  const macroPieHasData = macroPie.some((m) => m.value > 0);

  return (
    <Shell subtitle={rangeLabel} title="Analytics">
      <div className="px-5 pt-4 space-y-5">
        {/* Range selector */}
        <div>
          <div className="grid grid-cols-5 gap-px bg-border">
            {PRESETS.map((p) => (
              <button
                key={p.v}
                onClick={() => setPreset(p.v)}
                className={`px-2 py-2 text-[11px] font-bold uppercase tracking-wider ${
                  preset === p.v
                    ? "bg-foreground text-background"
                    : "bg-surface text-muted-foreground"
                }`}
              >
                {p.l}
              </button>
            ))}
          </div>
          {preset === "custom" && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <DateField
                label="From"
                value={customFrom}
                onChange={setCustomFrom}
                max={customTo || todayStr}
              />
              <DateField
                label="To"
                value={customTo}
                onChange={setCustomTo}
                min={customFrom}
                max={todayStr}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-px bg-border">
          <KPI label="Avg kcal" value={avgCals.toString()} />
          <KPI label="Avg protein" value={`${avgProt}g`} />
          <KPI label="On target" value={`${adherence}%`} />
        </div>

        <div className="panel p-4">
          <div className="label-eyebrow mb-3">Calories — {rangeLabel}</div>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={series} margin={{ left: -20, right: 5, top: 5, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  interval={xInterval}
                />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 0, fontSize: 12 }} />
                <Bar dataKey="calories">
                  {series.map((d, i) => (
                    <Cell key={i} fill={d.calories > target ? "var(--color-destructive)" : "var(--color-primary)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-4">
          <div className="label-eyebrow mb-3">Today's macro split (kcal)</div>
          <div className="flex items-center gap-4">
            <div className="h-32 w-32 shrink-0">
              {macroPieHasData ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={macroPie} dataKey="value" innerRadius={32} outerRadius={56} stroke="var(--color-surface)" strokeWidth={2}>
                      {macroPie.map((m, i) => <Cell key={i} fill={m.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-wider text-muted-foreground">
                  No data
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              {macroPie.map((m) => (
                <div key={m.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3" style={{ background: m.color }} />
                    <span className="font-semibold">{m.name}</span>
                  </div>
                  <span className="num-display text-muted-foreground">{m.value} kcal</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel p-4">
          <div className="label-eyebrow mb-2">Insights</div>
          <ul className="space-y-2 text-sm">
            <li>• You averaged <strong>{avgCals} kcal</strong> against a target of {target}.</li>
            <li>• Protein average: <strong>{avgProt}g</strong> ({Math.round((avgProt / state.profile.targetProtein) * 100)}% of target).</li>
            <li>• Logged {loggedDays}/{dayCount} day{dayCount === 1 ? "" : "s"} in this range.</li>
          </ul>
        </div>
      </div>
    </Shell>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-3 py-3">
      <div className="label-eyebrow">{label}</div>
      <div className="num-display mt-0.5 text-lg font-bold">{value}</div>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
}) {
  return (
    <label className="block border border-border bg-surface p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="num-display mt-1 w-full bg-transparent text-sm font-semibold outline-none"
      />
    </label>
  );
}
