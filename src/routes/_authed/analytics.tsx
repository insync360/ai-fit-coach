import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { totalsForDate, useStore } from "@/lib/store";
import { useMemo } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_authed/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Trends & Insights" },
      { name: "description", content: "Weekly calorie, macro, and weight trends." },
    ],
  }),
  component: Analytics,
});

function Analytics() {
  const state = useStore((s) => s);
  const target = state.profile.targetCalories;

  const last7 = useMemo(() => {
    const days: { date: string; label: string; calories: number; protein: number; carbs: number; fat: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      const t = totalsForDate(state, k);
      days.push({
        date: k,
        label: d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2),
        calories: Math.round(t.calories),
        protein: Math.round(t.protein),
        carbs: Math.round(t.carbs),
        fat: Math.round(t.fat),
      });
    }
    return days;
  }, [state]);

  const avgCals = Math.round(last7.reduce((a, d) => a + d.calories, 0) / 7);
  const avgProt = Math.round(last7.reduce((a, d) => a + d.protein, 0) / 7);
  const adherence = Math.round(
    (last7.filter((d) => d.calories > 0 && Math.abs(d.calories - target) <= target * 0.1).length / 7) * 100,
  );

  const today = last7[6];
  const macroPie = [
    { name: "Protein", value: today.protein * 4, color: "var(--color-protein)" },
    { name: "Carbs", value: today.carbs * 4, color: "var(--color-carbs)" },
    { name: "Fat", value: today.fat * 9, color: "var(--color-fat)" },
  ];

  return (
    <Shell subtitle="Last 7 days" title="Analytics">
      <div className="px-5 pt-4 space-y-5">
        <div className="grid grid-cols-3 gap-px bg-border">
          <KPI label="Avg kcal" value={avgCals.toString()} />
          <KPI label="Avg protein" value={`${avgProt}g`} />
          <KPI label="On target" value={`${adherence}%`} />
        </div>

        <div className="panel p-4">
          <div className="label-eyebrow mb-3">Calories — 7 day</div>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={last7} margin={{ left: -20, right: 5, top: 5, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 0, fontSize: 12 }} />
                <Bar dataKey="calories">
                  {last7.map((d, i) => (
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
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={macroPie} dataKey="value" innerRadius={32} outerRadius={56} stroke="var(--color-surface)" strokeWidth={2}>
                    {macroPie.map((m, i) => <Cell key={i} fill={m.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {macroPie.map((m) => (
                <div key={m.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3" style={{ background: m.color }} />
                    <span className="font-semibold">{m.name}</span>
                  </div>
                  <span className="num-display text-muted-foreground">{Math.round(m.value)} kcal</span>
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
            <li>• Logged {last7.filter((d) => d.calories > 0).length}/7 days this week.</li>
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
