import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import {
  addMasterFood,
  deleteMasterFood,
  updateMasterFood,
  useStore,
  type MasterFood,
} from "@/lib/store";
import { useMemo, useState } from "react";
import { Check, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authed/food-library")({
  head: () => ({
    meta: [
      { title: "Food Library — Verified Macros" },
      { name: "description", content: "Your master list of foods with known macros. The AI uses these for deterministic estimates." },
    ],
  }),
  component: FoodLibrary,
});

type FormState = Omit<MasterFood, "id">;

const blankForm: FormState = {
  name: "",
  serving: "",
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: undefined,
};

function FoodLibrary() {
  const foods = useStore((s) => s.masterFoods);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(blankForm);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return foods;
    return foods.filter((f) => f.name.toLowerCase().includes(q));
  }, [foods, query]);

  function startAdd() {
    setEditing("new");
    setForm(blankForm);
  }

  function startEdit(f: MasterFood) {
    setEditing(f.id);
    setForm({
      name: f.name,
      serving: f.serving,
      calories: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
      fiber: f.fiber,
    });
  }

  function cancelEdit() {
    setEditing(null);
    setForm(blankForm);
  }

  async function save() {
    if (saving) return;
    const name = form.name.trim();
    const serving = form.serving.trim();
    if (!name) return toast.error("Name is required");
    if (!serving) return toast.error("Serving label is required (e.g. \"100g\" or \"1 medium\")");
    setSaving(true);
    try {
      if (editing === "new") {
        await addMasterFood({ ...form, name, serving });
        toast.success(`Added ${name}`);
      } else if (editing) {
        await updateMasterFood(editing, { ...form, name, serving });
        toast.success(`Updated ${name}`);
      }
      cancelEdit();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete "${name}" from your library?`)) return;
    try {
      await deleteMasterFood(id);
      toast.success(`Deleted ${name}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Shell
      subtitle="Master macros"
      title="Food Library"
      right={
        !editing && (
          <button
            onClick={startAdd}
            className="flex h-10 w-10 items-center justify-center border border-foreground bg-foreground text-background"
            aria-label="Add food"
          >
            <Plus className="h-4 w-4" />
          </button>
        )
      }
    >
      <div className="px-5 pt-4 space-y-4 pb-24">
        {editing ? (
          <FoodForm
            mode={editing === "new" ? "new" : "edit"}
            form={form}
            setForm={setForm}
            onSave={save}
            onCancel={cancelEdit}
            saving={saving}
          />
        ) : (
          <>
            <div className="flex items-center gap-2 border border-border bg-surface px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search foods…"
                className="w-full bg-transparent py-3 text-sm outline-none"
              />
            </div>

            {foods.length === 0 ? (
              <div className="border border-dashed border-border bg-surface-2 p-6 text-center text-sm text-muted-foreground">
                Your library is empty. Add foods you eat often with their verified macros so the AI can use them instead of guessing.
                <button
                  onClick={startAdd}
                  className="mt-4 inline-flex items-center gap-2 border border-foreground bg-foreground px-4 py-2 text-xs font-bold uppercase tracking-wider text-background"
                >
                  <Plus className="h-4 w-4" /> Add your first food
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-surface p-6 text-center text-sm text-muted-foreground">
                No foods match &ldquo;{query}&rdquo;.
              </div>
            ) : (
              <div className="space-y-px bg-border">
                {filtered.map((f) => (
                  <div key={f.id} className="bg-surface px-3 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{f.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {f.serving} · {Math.round(f.calories)} kcal · P{Math.round(f.protein)} C{Math.round(f.carbs)} F{Math.round(f.fat)}
                          {f.fiber != null && f.fiber > 0 && <> · Fib{Math.round(f.fiber)}</>}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => startEdit(f)}
                          className="border border-border bg-surface-2 p-1.5 text-muted-foreground"
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => remove(f.id, f.name)}
                          className="border border-border bg-surface-2 p-1.5 text-muted-foreground hover:text-destructive"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
              The AI references this library when analyzing food photos. Foods matched here use their exact macros (scaled to portion). Unknown foods are estimated and flagged.
            </p>
          </>
        )}
      </div>
    </Shell>
  );
}

function FoodForm({
  mode,
  form,
  setForm,
  onSave,
  onCancel,
  saving,
}: {
  mode: "new" | "edit";
  form: FormState;
  setForm: (f: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  function patch(p: Partial<FormState>) {
    setForm({ ...form, ...p });
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider">{mode === "new" ? "Add food" : "Edit food"}</h2>
        <button onClick={onCancel} className="border border-border bg-surface p-2" aria-label="Cancel">
          <X className="h-4 w-4" />
        </button>
      </div>

      <Field label="Name" value={form.name} onChange={(v) => patch({ name: v })} placeholder="e.g. Chicken breast (cooked)" />
      <Field label="Serving" value={form.serving} onChange={(v) => patch({ serving: v })} placeholder='e.g. "100g" or "1 medium chapati"' />

      <div className="label-eyebrow pt-1">Macros (for this serving)</div>
      <div className="grid grid-cols-2 gap-2">
        <NumField label="Calories" value={form.calories} onChange={(v) => patch({ calories: v })} />
        <NumField label="Protein (g)" value={form.protein} onChange={(v) => patch({ protein: v })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumField label="Carbs (g)" value={form.carbs} onChange={(v) => patch({ carbs: v })} />
        <NumField label="Fat (g)" value={form.fat} onChange={(v) => patch({ fat: v })} />
      </div>
      <NumField label="Fiber (g, optional)" value={form.fiber ?? 0} onChange={(v) => patch({ fiber: v || undefined })} />

      <button
        onClick={onSave}
        disabled={saving}
        className="mt-3 flex w-full items-center justify-center gap-2 border border-primary bg-primary py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-50"
      >
        {saving ? (<><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>) : (<><Check className="h-4 w-4" /> Save food</>)}
      </button>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <label className="block border border-border bg-surface p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full bg-transparent text-base font-semibold outline-none"
      />
    </label>
  );
}

function NumField({
  label, value, onChange,
}: {
  label: string; value: number; onChange: (v: number) => void;
}) {
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
