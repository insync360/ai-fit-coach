import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { setTheme, updateProfile, useStore, type Profile } from "@/lib/store";
import { Moon, Sun } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Profile & Goals" },
      { name: "description", content: "Set your weight, height, activity level, and macro targets." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const p = useStore((s) => s.profile);

  // AI suggestion: Mifflin-St Jeor BMR + activity multiplier
  const bmr = p.gender === "male"
    ? 10 * p.weight + 6.25 * p.height - 5 * p.age + 5
    : 10 * p.weight + 6.25 * p.height - 5 * p.age - 161;
  const mult = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 }[p.activity];
  const tdee = Math.round(bmr * mult);
  const lossTarget = Math.round(tdee - 500);
  const weeksToGoal = p.weight !== p.targetWeight ? Math.round((Math.abs(p.weight - p.targetWeight) / 0.5)) : 0;

  return (
    <Shell
      subtitle="Profile & goals"
      title={p.name}
      right={
        <button
          onClick={() => setTheme(p.theme === "dark" ? "light" : "dark")}
          className="flex h-10 w-10 items-center justify-center border border-border bg-surface-2"
          aria-label="Toggle theme"
        >
          {p.theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      }
    >
      <div className="px-5 pt-4 space-y-5">
        <Section title="Personal">
          <Field label="Name" value={p.name} onChange={(v) => updateProfile({ name: v })} />
          <Row>
            <NumField label="Weight (kg)" value={p.weight} onChange={(v) => updateProfile({ weight: v })} />
            <NumField label="Height (cm)" value={p.height} onChange={(v) => updateProfile({ height: v })} />
          </Row>
          <Row>
            <NumField label="Age" value={p.age} onChange={(v) => updateProfile({ age: v })} />
            <SelectField label="Gender" value={p.gender} onChange={(v) => updateProfile({ gender: v as Profile["gender"] })} options={[
              { v: "male", l: "Male" }, { v: "female", l: "Female" }, { v: "other", l: "Other" },
            ]} />
          </Row>
          <SelectField label="Activity" value={p.activity} onChange={(v) => updateProfile({ activity: v as Profile["activity"] })} options={[
            { v: "sedentary", l: "Sedentary (desk job)" },
            { v: "light", l: "Light (1-3 days/wk)" },
            { v: "moderate", l: "Moderate (3-5 days/wk)" },
            { v: "active", l: "Active (6-7 days/wk)" },
            { v: "very_active", l: "Very active (2x/day)" },
          ]} />
        </Section>

        <div className="panel border-l-2 border-l-primary p-4">
          <div className="label-eyebrow text-primary">AI recommendation</div>
          <p className="mt-2 text-sm">
            Your TDEE is <strong>{tdee} kcal</strong>. For fat loss, target <strong>{lossTarget} kcal</strong> (≈0.5kg/wk).
            {weeksToGoal > 0 && <> Reaching <strong>{p.targetWeight}kg</strong> would take about <strong>{weeksToGoal} weeks</strong> at that rate.</>}
          </p>
          <button
            onClick={() => {
              updateProfile({
                targetCalories: lossTarget,
                targetProtein: Math.round(p.weight * 2),
                targetCarbs: Math.round((lossTarget * 0.4) / 4),
                targetFat: Math.round((lossTarget * 0.3) / 9),
              });
              toast.success("Targets updated");
            }}
            className="mt-3 w-full border border-foreground bg-foreground py-2.5 text-xs font-bold uppercase tracking-wider text-background"
          >
            Apply these targets
          </button>
        </div>

        <Section title="Goals">
          <NumField label="Target weight (kg)" value={p.targetWeight} onChange={(v) => updateProfile({ targetWeight: v })} />
          <NumField label="Calories" value={p.targetCalories} onChange={(v) => updateProfile({ targetCalories: v })} />
          <Row>
            <NumField label="Protein (g)" value={p.targetProtein} onChange={(v) => updateProfile({ targetProtein: v })} />
            <NumField label="Carbs (g)" value={p.targetCarbs} onChange={(v) => updateProfile({ targetCarbs: v })} />
          </Row>
          <NumField label="Fat (g)" value={p.targetFat} onChange={(v) => updateProfile({ targetFat: v })} />
        </Section>

        <Section title="Data">
          <button
            onClick={() => {
              if (confirm("Clear all logged data? This cannot be undone.")) {
                localStorage.removeItem("ctrack-v1");
                location.reload();
              }
            }}
            className="w-full border border-destructive bg-surface py-3 text-xs font-bold uppercase tracking-wider text-destructive"
          >
            Reset all data
          </button>
        </Section>
      </div>
    </Shell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label-eyebrow mb-2">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block border border-border bg-surface p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full bg-transparent text-base font-semibold outline-none" />
    </label>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block border border-border bg-surface p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="num-display mt-1 w-full bg-transparent text-base font-semibold outline-none"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <label className="block border border-border bg-surface p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full bg-transparent text-base font-semibold outline-none">
        {options.map((o) => <option key={o.v} value={o.v} className="bg-surface text-foreground">{o.l}</option>)}
      </select>
    </label>
  );
}
