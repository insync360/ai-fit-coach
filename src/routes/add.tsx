import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { useRef, useState } from "react";
import { Camera, Image as ImageIcon, Loader2, Save, Search, Sparkles, Type, Zap } from "lucide-react";
import { addFoodEntry, deleteSavedMeal, saveMeal, useStore, type Macros } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/add")({
  head: () => ({
    meta: [
      { title: "Add Food — AI Recognition" },
      { name: "description", content: "Snap a photo and let AI estimate calories, protein, carbs, and fat." },
    ],
  }),
  component: AddFood,
});

type Mode = "ai" | "saved";
type Meal = "breakfast" | "lunch" | "dinner" | "snack";

type AnalyzeItem = { name: string; serving: string; calories: number; protein: number; carbs: number; fat: number; fiber?: number };
type AnalyzeResult = {
  confidence: "high" | "medium" | "low";
  items: AnalyzeItem[];
  totals: Macros;
  followUp: string[];
  summary: string;
};

function defaultMeal(): Meal {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

function AddFood() {
  const [mode, setMode] = useState<Mode>("ai");
  const [meal, setMeal] = useState<Meal>(defaultMeal());

  return (
    <Shell subtitle="Log a meal" title="Add Food">
      <div className="px-5 pt-3">
        <div className="grid grid-cols-2 gap-px bg-border">
          {(["ai", "saved"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`bg-surface px-3 py-3 text-xs font-bold uppercase tracking-wider ${mode === m ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
            >
              {m === "ai" ? "AI Scan" : "Saved Meals"}
            </button>
          ))}
        </div>

        {/* meal selector */}
        <div className="mt-4">
          <div className="label-eyebrow mb-2">Meal</div>
          <div className="grid grid-cols-4 gap-px bg-border">
            {(["breakfast", "lunch", "dinner", "snack"] as Meal[]).map((m) => (
              <button
                key={m}
                onClick={() => setMeal(m)}
                className={`bg-surface px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider ${meal === m ? "bg-foreground text-background" : "text-muted-foreground"}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {mode === "ai" ? <AIScan meal={meal} /> : <SavedMeals meal={meal} />}
    </Shell>
  );
}

function AIScan({ meal }: { meal: Meal }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [clarification, setClarification] = useState("");

  const handleFile = async (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const analyze = async (extraClarification?: string) => {
    if (!imageUrl && !description.trim()) {
      toast.error("Add a photo or describe your meal");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/analyze-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: imageUrl,
          description: description.trim() || undefined,
          clarifications: extraClarification,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as AnalyzeResult;
      setResult(data);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const logIt = () => {
    if (!result) return;
    result.items.forEach((it) => {
      addFoodEntry({
        name: it.name,
        meal,
        serving: it.serving,
        calories: it.calories,
        protein: it.protein,
        carbs: it.carbs,
        fat: it.fat,
        fiber: it.fiber,
        imageUrl: imageUrl ?? undefined,
      });
    });
    toast.success(`Logged ${result.items.length} item${result.items.length > 1 ? "s" : ""}`);
    setImageUrl(null);
    setDescription("");
    setResult(null);
  };

  const saveAsMeal = () => {
    if (!result) return;
    saveMeal({
      name: result.items.map((i) => i.name).join(" + "),
      serving: result.items[0]?.serving ?? "1 serving",
      calories: result.totals.calories,
      protein: result.totals.protein,
      carbs: result.totals.carbs,
      fat: result.totals.fat,
      fiber: result.totals.fiber,
      imageUrl: imageUrl ?? undefined,
    });
    toast.success("Saved to library");
  };

  return (
    <div className="px-5 pt-5">
      {!imageUrl && (
        <div className="grid grid-cols-2 gap-px bg-border">
          <button
            onClick={() => camRef.current?.click()}
            className="flex flex-col items-center gap-2 bg-surface py-8"
          >
            <Camera className="h-7 w-7" />
            <span className="text-xs font-bold uppercase tracking-wider">Camera</span>
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center gap-2 bg-surface py-8"
          >
            <ImageIcon className="h-7 w-7" />
            <span className="text-xs font-bold uppercase tracking-wider">Gallery</span>
          </button>
        </div>
      )}
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0])} />

      {imageUrl && (
        <div className="panel">
          <img src={imageUrl} alt="Food" className="aspect-square w-full object-cover" />
          <button onClick={() => { setImageUrl(null); setResult(null); }} className="w-full border-t border-border py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Change photo
          </button>
        </div>
      )}

      <div className="mt-4">
        <div className="label-eyebrow mb-1.5 flex items-center gap-1.5"><Type className="h-3 w-3" /> Optional description</div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="e.g. 2 chapatis, 1 cup dal, side salad"
          className="w-full border border-border bg-surface p-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <button
        onClick={() => analyze()}
        disabled={loading || (!imageUrl && !description.trim())}
        className="mt-4 flex w-full items-center justify-center gap-2 border border-primary bg-primary py-4 text-sm font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-40"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? "Analyzing…" : "Analyze with AI"}
      </button>

      {result && (
        <div className="mt-5 space-y-4">
          <div className="panel p-4">
            <div className="flex items-baseline justify-between">
              <div className="label-eyebrow">AI Estimate</div>
              <ConfBadge confidence={result.confidence} />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="num-display text-4xl font-bold">{Math.round(result.totals.calories)}</span>
              <span className="text-sm text-muted-foreground">kcal</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <Pill color="protein" label="P" v={result.totals.protein} />
              <Pill color="carbs" label="C" v={result.totals.carbs} />
              <Pill color="fat" label="F" v={result.totals.fat} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{result.summary}</p>
            <div className="mt-3 space-y-1.5 border-t border-border pt-3">
              {result.items.map((it, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="font-semibold">{it.name}</span>
                  <span className="text-muted-foreground">{it.serving} · {Math.round(it.calories)} kcal</span>
                </div>
              ))}
            </div>
          </div>

          {result.followUp.length > 0 && (
            <div className="panel border-l-2 border-l-primary p-4">
              <div className="label-eyebrow text-primary">Clarify for accuracy</div>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {result.followUp.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
              <textarea
                value={clarification}
                onChange={(e) => setClarification(e.target.value)}
                rows={2}
                placeholder="Your answers…"
                className="mt-3 w-full border border-border bg-surface p-2 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={() => analyze(clarification)}
                disabled={loading || !clarification.trim()}
                className="mt-2 flex w-full items-center justify-center gap-2 border border-border bg-surface-2 py-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-40"
              >
                <Sparkles className="h-3.5 w-3.5" /> Recalculate
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-px bg-border">
            <button onClick={saveAsMeal} className="flex items-center justify-center gap-2 bg-surface py-3.5 text-xs font-bold uppercase tracking-wider">
              <Save className="h-4 w-4" /> Save
            </button>
            <button onClick={logIt} className="flex items-center justify-center gap-2 bg-foreground py-3.5 text-xs font-bold uppercase tracking-wider text-background">
              <Zap className="h-4 w-4" /> Log it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfBadge({ confidence }: { confidence: "high" | "medium" | "low" }) {
  const map = {
    high: "bg-primary text-primary-foreground",
    medium: "bg-carbs text-background",
    low: "bg-destructive text-destructive-foreground",
  } as const;
  return <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${map[confidence]}`}>{confidence}</span>;
}

function Pill({ color, label, v }: { color: "protein" | "carbs" | "fat"; label: string; v: number }) {
  return (
    <div className="border border-border bg-surface-2 px-2 py-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: `var(--color-${color})` }}>{label}</span>
        <span className="num-display text-sm font-bold">{Math.round(v)}g</span>
      </div>
    </div>
  );
}

function SavedMeals({ meal }: { meal: Meal }) {
  const saved = useStore((s) => s.savedMeals);
  const recent = useStore((s) => s.entries.slice(-10).reverse());
  const [q, setQ] = useState("");

  const filtered = saved.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="px-5 pt-5">
      <div className="flex items-center gap-2 border border-border bg-surface px-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search saved foods…"
          className="w-full bg-transparent py-3 text-sm outline-none"
        />
      </div>

      <div className="mt-5">
        <div className="label-eyebrow mb-2">Saved library</div>
        <div className="space-y-px bg-border">
          {filtered.map((m) => (
            <div key={m.id} className="flex items-center justify-between bg-surface px-3 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{m.name}</div>
                <div className="text-[11px] text-muted-foreground">{m.serving} · P{Math.round(m.protein)} C{Math.round(m.carbs)} F{Math.round(m.fat)}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="num-display text-sm font-bold">{Math.round(m.calories)}</div>
                <button
                  onClick={() => {
                    addFoodEntry({ ...m, meal, imageUrl: m.imageUrl });
                    toast.success(`Added ${m.name}`);
                  }}
                  className="border border-foreground bg-foreground px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-background"
                >
                  + Log
                </button>
                <button onClick={() => deleteSavedMeal(m.id)} className="border border-border bg-surface-2 px-2 py-1.5 text-[10px] uppercase">×</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="bg-surface p-6 text-center text-sm text-muted-foreground">No saved meals yet.</div>
          )}
        </div>
      </div>

      {recent.length > 0 && (
        <div className="mt-6">
          <div className="label-eyebrow mb-2">Recently logged</div>
          <div className="space-y-px bg-border">
            {recent.map((m) => (
              <div key={m.id} className="flex items-center justify-between bg-surface px-3 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{m.name}</div>
                  <div className="text-[11px] text-muted-foreground">{m.serving}</div>
                </div>
                <button
                  onClick={() => {
                    addFoodEntry({ name: m.name, meal, serving: m.serving, calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat, fiber: m.fiber, imageUrl: m.imageUrl });
                    toast.success(`Added ${m.name}`);
                  }}
                  className="border border-border bg-surface-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                >
                  Quick add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
