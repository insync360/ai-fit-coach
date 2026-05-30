import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { resetAllUserData, setTheme, updateProfile, useStore, type Profile } from "@/lib/store";
import { useEffect, useState } from "react";
import { Check, Loader2, LogOut, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authed/settings")({
  head: () => ({
    meta: [
      { title: "Profile & Goals" },
      { name: "description", content: "Set your weight, height, activity level, and macro targets." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const profile = useStore((s) => s.profile);
  const navigate = useNavigate();

  // Local edit buffer — fields write here, nothing persists until Save.
  const [form, setForm] = useState<Profile>(profile);
  const [saving, setSaving] = useState(false);

  // Re-sync the form from the store when the profile changes externally
  // (initial hydrate, remote update, etc.) but only when the local buffer
  // matches the previous profile — i.e. the user hasn't edited anything yet.
  useEffect(() => {
    setForm((prev) =>
      isSameProfile(prev, profile) ? prev : profile,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const dirty = !isSameProfile(form, profile);

  // Mifflin-St Jeor BMR + activity multiplier — computed from the edit
  // buffer so the recommendation reflects what the user is currently typing.
  const bmr = form.gender === "male"
    ? 10 * form.weight + 6.25 * form.height - 5 * form.age + 5
    : 10 * form.weight + 6.25 * form.height - 5 * form.age - 161;
  const mult = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 }[form.activity];
  const tdee = Math.round(bmr * mult);
  const lossTarget = Math.round(tdee - 500);
  const weeksToGoal = form.weight !== form.targetWeight ? Math.round(Math.abs(form.weight - form.targetWeight) / 0.5) : 0;

  function patch(p: Partial<Profile>) {
    setForm((f) => ({ ...f, ...p }));
  }

  async function handleSave() {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      await updateProfile(form);
      toast.success("Profile saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function handleApplyTargets() {
    patch({
      targetCalories: lossTarget,
      targetProtein: Math.round(form.weight * 2),
      targetCarbs: Math.round((lossTarget * 0.4) / 4),
      targetFat: Math.round((lossTarget * 0.3) / 9),
    });
  }

  function handleThemeToggle() {
    const next: Profile["theme"] = form.theme === "dark" ? "light" : "dark";
    // Theme toggle stays instant: writes through immediately and also
    // updates the edit buffer so it doesn't show as a pending change.
    patch({ theme: next });
    void setTheme(next);
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/login" });
  }

  return (
    <Shell
      subtitle="Profile & goals"
      title={profile.name}
      right={
        <button
          onClick={handleThemeToggle}
          className="flex h-10 w-10 items-center justify-center border border-border bg-surface-2"
          aria-label="Toggle theme"
        >
          {form.theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      }
    >
      <div className="px-5 pt-4 space-y-5 pb-24">
        <Section title="Personal">
          <Field label="Name" value={form.name} onChange={(v) => patch({ name: v })} />
          <Row>
            <NumField label="Weight (kg)" value={form.weight} onChange={(v) => patch({ weight: v })} />
            <NumField label="Height (cm)" value={form.height} onChange={(v) => patch({ height: v })} />
          </Row>
          <Row>
            <NumField label="Age" value={form.age} onChange={(v) => patch({ age: v })} />
            <SelectField label="Gender" value={form.gender} onChange={(v) => patch({ gender: v as Profile["gender"] })} options={[
              { v: "male", l: "Male" }, { v: "female", l: "Female" }, { v: "other", l: "Other" },
            ]} />
          </Row>
          <SelectField label="Activity" value={form.activity} onChange={(v) => patch({ activity: v as Profile["activity"] })} options={[
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
            {weeksToGoal > 0 && <> Reaching <strong>{form.targetWeight}kg</strong> would take about <strong>{weeksToGoal} weeks</strong> at that rate.</>}
          </p>
          <button
            onClick={handleApplyTargets}
            className="mt-3 w-full border border-foreground bg-foreground py-2.5 text-xs font-bold uppercase tracking-wider text-background"
          >
            Apply these targets
          </button>
        </div>

        <Section title="Goals">
          <NumField label="Target weight (kg)" value={form.targetWeight} onChange={(v) => patch({ targetWeight: v })} />
          <NumField label="Calories" value={form.targetCalories} onChange={(v) => patch({ targetCalories: v })} />
          <Row>
            <NumField label="Protein (g)" value={form.targetProtein} onChange={(v) => patch({ targetProtein: v })} />
            <NumField label="Carbs (g)" value={form.targetCarbs} onChange={(v) => patch({ targetCarbs: v })} />
          </Row>
          <NumField label="Fat (g)" value={form.targetFat} onChange={(v) => patch({ targetFat: v })} />
        </Section>

        <Section title="Data">
          <button
            onClick={async () => {
              if (confirm("Clear all your logged data? This cannot be undone.")) {
                await resetAllUserData();
                toast.success("All data cleared");
              }
            }}
            className="w-full border border-destructive bg-surface py-3 text-xs font-bold uppercase tracking-wider text-destructive"
          >
            Reset all data
          </button>
        </Section>

        <Section title="Account">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 border border-border bg-surface py-3 text-xs font-bold uppercase tracking-wider"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </Section>
      </div>

      {/* Sticky Save bar — only appears when there are unsaved edits. */}
      <div
        className={`fixed inset-x-0 bottom-16 z-40 transition-transform duration-200 ${dirty || saving ? "translate-y-0" : "translate-y-full"}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto max-w-md border-t border-border bg-surface px-5 py-3">
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="flex w-full items-center justify-center gap-2 border border-primary bg-primary py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" /> Save changes
              </>
            )}
          </button>
        </div>
      </div>
    </Shell>
  );
}

function isSameProfile(a: Profile, b: Profile): boolean {
  return (
    a.name === b.name &&
    a.weight === b.weight &&
    a.height === b.height &&
    a.age === b.age &&
    a.gender === b.gender &&
    a.activity === b.activity &&
    a.targetWeight === b.targetWeight &&
    a.targetCalories === b.targetCalories &&
    a.targetProtein === b.targetProtein &&
    a.targetCarbs === b.targetCarbs &&
    a.targetFat === b.targetFat &&
    a.theme === b.theme
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
