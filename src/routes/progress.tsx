import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { addPhoto, deletePhoto, logWeight, useStore } from "@/lib/store";
import { useMemo, useRef, useState } from "react";
import { Camera, ImagePlus, Trash2, TrendingDown } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progress — Weight & Photos" },
      { name: "description", content: "Track weight, photos, and body transformation over time." },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const state = useStore((s) => s);
  const [tab, setTab] = useState<"weight" | "photos">("weight");

  return (
    <Shell subtitle="Body transformation" title="Progress">
      <div className="px-5 pt-3">
        <div className="grid grid-cols-2 gap-px bg-border">
          {(["weight", "photos"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`bg-surface px-3 py-3 text-xs font-bold uppercase tracking-wider ${tab === t ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
            >
              {t === "weight" ? "Weight" : "Photos"}
            </button>
          ))}
        </div>
      </div>

      {tab === "weight" ? <WeightTab state={state} /> : <PhotosTab />}
    </Shell>
  );
}

function WeightTab({ state }: { state: ReturnType<typeof getFullState> }) {
  const [w, setW] = useState("");

  const weights = state.weights;
  const current = weights[weights.length - 1]?.weight ?? state.profile.weight;
  const start = weights[0]?.weight ?? current;
  const diff = current - start;
  const target = state.profile.targetWeight;
  const toGo = current - target;

  const chartData = useMemo(() => {
    return weights.map((wt) => ({ date: wt.date.slice(5), weight: wt.weight }));
  }, [weights]);

  // simple linear projection
  const projection = useMemo(() => {
    if (weights.length < 2) return null;
    const first = weights[0];
    const last = weights[weights.length - 1];
    const days = Math.max(1, (new Date(last.date).getTime() - new Date(first.date).getTime()) / 86400000);
    const ratePerDay = (last.weight - first.weight) / days;
    const in30 = +(last.weight + ratePerDay * 30).toFixed(1);
    const in90 = +(last.weight + ratePerDay * 90).toFixed(1);
    let etaDays: number | null = null;
    if (Math.abs(ratePerDay) > 0.005) {
      const d = (target - last.weight) / ratePerDay;
      if (d > 0) etaDays = Math.round(d);
    }
    return { in30, in90, ratePerWeek: +(ratePerDay * 7).toFixed(2), etaDays };
  }, [weights, target]);

  const submit = () => {
    const v = parseFloat(w);
    if (!v || v < 20 || v > 400) return toast.error("Enter a valid weight (kg)");
    logWeight(v);
    setW("");
    toast.success("Weight logged");
  };

  return (
    <div className="px-5 pt-5 space-y-5">
      <div className="grid grid-cols-3 gap-px bg-border">
        <StatBlock label="Current" value={`${current}kg`} />
        <StatBlock label="Change" value={`${diff > 0 ? "+" : ""}${diff.toFixed(1)}kg`} tone={diff < 0 ? "good" : diff > 0 ? "bad" : undefined} />
        <StatBlock label="To target" value={`${Math.abs(toGo).toFixed(1)}kg`} />
      </div>

      <div className="panel p-4">
        <div className="label-eyebrow mb-2">Log weight</div>
        <div className="flex gap-2">
          <input
            value={w}
            onChange={(e) => setW(e.target.value)}
            inputMode="decimal"
            placeholder="kg"
            className="flex-1 border border-border bg-surface px-3 py-3 text-sm outline-none focus:border-primary"
          />
          <button onClick={submit} className="border border-foreground bg-foreground px-5 text-xs font-bold uppercase tracking-wider text-background">
            Save
          </button>
        </div>
      </div>

      <div className="panel p-4">
        <div className="label-eyebrow mb-3">Trend</div>
        <div className="h-44">
          {chartData.length > 1 ? (
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ left: -20, right: 10, top: 5, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={{ stroke: "var(--color-border)" }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} domain={["dataMin - 1", "dataMax + 1"]} axisLine={{ stroke: "var(--color-border)" }} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 0, fontSize: 12 }} />
                <Line type="monotone" dataKey="weight" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3, fill: "var(--color-primary)" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Log at least 2 weights to see trend</div>
          )}
        </div>
      </div>

      {projection && (
        <div className="panel p-4">
          <div className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-primary" /><div className="label-eyebrow">AI Projection</div></div>
          <div className="mt-3 grid grid-cols-3 gap-px bg-border">
            <StatBlock label="Per week" value={`${projection.ratePerWeek > 0 ? "+" : ""}${projection.ratePerWeek}kg`} />
            <StatBlock label="In 30d" value={`${projection.in30}kg`} />
            <StatBlock label="In 90d" value={`${projection.in90}kg`} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {projection.etaDays
              ? `At your current rate, you'll reach ${target}kg in about ${projection.etaDays} day${projection.etaDays !== 1 ? "s" : ""}.`
              : "Trend isn't moving toward your target yet — adjust calories or activity."}
          </p>
        </div>
      )}
    </div>
  );
}

function getFullState() {
  return useStore((s) => s);
}

function StatBlock({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-primary" : tone === "bad" ? "text-destructive" : "";
  return (
    <div className="bg-surface px-3 py-3">
      <div className="label-eyebrow">{label}</div>
      <div className={`num-display mt-0.5 text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

function PhotosTab() {
  const photos = useStore((s) => s.photos);
  const fileRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<"front" | "side" | "back">("front");

  const handle = (file?: File) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      addPhoto({ date: new Date().toISOString().slice(0, 10), view, imageUrl: r.result as string });
      toast.success("Photo added");
    };
    r.readAsDataURL(file);
  };

  const grouped: Record<string, typeof photos> = { front: [], side: [], back: [] };
  photos.forEach((p) => grouped[p.view].push(p));

  return (
    <div className="px-5 pt-5 space-y-5">
      <div className="grid grid-cols-3 gap-px bg-border">
        {(["front", "side", "back"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`bg-surface px-2 py-2.5 text-[11px] font-bold uppercase tracking-wider ${view === v ? "bg-foreground text-background" : "text-muted-foreground"}`}
          >
            {v}
          </button>
        ))}
      </div>

      <button
        onClick={() => fileRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 border border-dashed border-border bg-surface-2 py-6 text-sm font-semibold"
      >
        <ImagePlus className="h-5 w-5" /> Add {view} photo
      </button>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => handle(e.target.files?.[0])} />

      {(["front", "side", "back"] as const).map((v) => (
        grouped[v].length > 0 && (
          <div key={v}>
            <div className="label-eyebrow mb-2">{v} view</div>
            <div className="grid grid-cols-2 gap-2">
              {grouped[v].map((p) => (
                <div key={p.id} className="panel">
                  <img src={p.imageUrl} alt={v} className="aspect-square w-full object-cover" />
                  <div className="flex items-center justify-between border-t border-border px-2 py-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider">{p.date.slice(5)}</span>
                    <button onClick={() => deletePhoto(p.id)} className="p-1 text-muted-foreground">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      ))}

      {photos.length === 0 && (
        <div className="border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
          <Camera className="mx-auto mb-2 h-6 w-6" />
          Take consistent weekly photos in the same lighting to track real body changes.
        </div>
      )}
    </div>
  );
}
