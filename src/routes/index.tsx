import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { MacroBar } from "@/components/MacroBar";
import { useStore, deleteFoodEntry, todayKey, totalsForDate, type FoodEntry } from "@/lib/store";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Flame, MessageSquare, Plus, Trash2, Utensils } from "lucide-react";
import { CoachSheet } from "@/components/CoachSheet";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — Calorie Tracker" },
      { name: "description", content: "AI-powered calorie and macro tracker for fat loss and body transformation." },
    ],
  }),
  component: Dashboard,
});

const MEALS = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snacks" },
] as const;

function Dashboard() {
  const state = useStore((s) => s);
  const today = todayKey();
  const totals = useMemo(() => totalsForDate(state, today), [state, today]);
  const target = state.profile.targetCalories;
  const remaining = Math.max(0, target - totals.calories);
  const pct = Math.min(100, (totals.calories / target) * 100);
  const [coachOpen, setCoachOpen] = useState(false);

  const todayEntries = state.entries.filter((e) => e.date === today);
  const byMeal: Record<string, FoodEntry[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
  todayEntries.forEach((e) => byMeal[e.meal].push(e));

  return (
    <Shell
      subtitle={new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
      title="Today"
      right={
        <button
          onClick={() => setCoachOpen(true)}
          className="flex h-10 w-10 items-center justify-center border border-border bg-surface-2"
          aria-label="Open coach"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
      }
    >
      {/* Hero calorie panel */}
      <section className="px-5 pt-4">
        <div className="panel p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="label-eyebrow">Calories</div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="num-display text-5xl font-bold">{Math.round(totals.calories)}</span>
                <span className="text-sm text-muted-foreground">/ {target}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="label-eyebrow">Remaining</div>
              <div className="num-display mt-1 text-2xl font-bold text-primary">{remaining}</div>
            </div>
          </div>
          <div className="mt-4 h-2 w-full bg-surface-2">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-4">
            <MacroBar label="Protein" value={totals.protein} target={state.profile.targetProtein} color="protein" />
            <MacroBar label="Carbs" value={totals.carbs} target={state.profile.targetCarbs} color="carbs" />
            <MacroBar label="Fat" value={totals.fat} target={state.profile.targetFat} color="fat" />
          </div>
        </div>
      </section>

      {/* Quick stats strip */}
      <section className="mt-3 grid grid-cols-3 gap-px bg-border px-5">
        <Stat label="Logged" value={todayEntries.length.toString()} />
        <Stat label="Fiber" value={`${Math.round(totals.fiber ?? 0)}g`} />
        <Stat label="Weight" value={`${state.profile.weight}kg`} />
      </section>

      {/* Meals */}
      <section className="mt-4 px-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider">Meals</h2>
          <Link to="/add" className="text-xs font-semibold text-primary">+ Add food</Link>
        </div>
        <div className="mt-3 space-y-2">
          {MEALS.map((m) => (
            <MealGroup key={m.key} mealKey={m.key} label={m.label} entries={byMeal[m.key]} />
          ))}
        </div>
      </section>

      {todayEntries.length === 0 && (
        <div className="px-5 mt-6">
          <Link
            to="/add"
            className="flex items-center justify-center gap-2 border border-dashed border-border bg-surface-2 py-6 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" /> Log your first meal with AI
          </Link>
        </div>
      )}

      <CoachSheet open={coachOpen} onClose={() => setCoachOpen(false)} />
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-3 py-3">
      <div className="label-eyebrow">{label}</div>
      <div className="num-display mt-0.5 text-lg font-bold">{value}</div>
    </div>
  );
}

function MealGroup({ mealKey, label, entries }: { mealKey: string; label: string; entries: FoodEntry[] }) {
  const [open, setOpen] = useState(true);
  const cals = entries.reduce((a, e) => a + e.calories, 0);
  return (
    <div className="panel">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <div className="flex items-center gap-3">
          <Utensils className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-sm font-semibold">{label}</div>
            <div className="text-xs text-muted-foreground">
              {entries.length === 0 ? "Empty" : `${entries.length} item${entries.length > 1 ? "s" : ""}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="num-display text-sm font-bold">
            {cals > 0 ? `${Math.round(cals)} kcal` : ""}
          </span>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>
      {open && entries.length > 0 && (
        <div className="border-t border-border">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{e.name}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {e.serving} · P {Math.round(e.protein)} · C {Math.round(e.carbs)} · F {Math.round(e.fat)}
                </div>
              </div>
              <div className="text-right">
                <div className="num-display text-sm font-bold">{Math.round(e.calories)}</div>
                <div className="text-[10px] text-muted-foreground flex items-center justify-end gap-0.5">
                  <Flame className="h-3 w-3" /> kcal
                </div>
              </div>
              <button
                onClick={() => deleteFoodEntry(e.id)}
                className="border border-border p-1.5 text-muted-foreground hover:text-destructive"
                aria-label="Delete entry"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
