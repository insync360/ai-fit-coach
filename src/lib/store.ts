import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type Macros = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
};

export type FoodEntry = {
  id: string;
  name: string;
  meal: "breakfast" | "lunch" | "dinner" | "snack";
  serving: string;
  imagePath?: string;
  date: string; // YYYY-MM-DD
  loggedAt: number;
} & Macros;

export type SavedMeal = {
  id: string;
  name: string;
  serving: string;
  imagePath?: string;
} & Macros;

export type WeightEntry = { id: string; date: string; weight: number };

export type ProgressPhoto = {
  id: string;
  date: string;
  view: "front" | "side" | "back";
  imagePath: string;
  weight?: number;
};

export type Profile = {
  name: string;
  weight: number;
  height: number;
  age: number;
  gender: "male" | "female" | "other";
  activity: "sedentary" | "light" | "moderate" | "active" | "very_active";
  targetWeight: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  theme: "light" | "dark";
};

export type CoachMessage = { id: string; role: "user" | "assistant"; content: string; ts: number };

export type AppState = {
  hydrated: boolean;
  userId: string | null;
  profile: Profile;
  entries: FoodEntry[];
  savedMeals: SavedMeal[];
  weights: WeightEntry[];
  photos: ProgressPhoto[];
  coach: CoachMessage[];
};

const defaultProfile: Profile = {
  name: "You",
  weight: 75,
  height: 175,
  age: 28,
  gender: "male",
  activity: "moderate",
  targetWeight: 70,
  targetCalories: 2000,
  targetProtein: 150,
  targetCarbs: 220,
  targetFat: 65,
  theme: "dark",
};

const defaultState: AppState = {
  hydrated: false,
  userId: null,
  profile: defaultProfile,
  entries: [],
  savedMeals: [],
  weights: [],
  photos: [],
  coach: [],
};

let state: AppState = defaultState;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function applyTheme(theme: "light" | "dark") {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function setState(updater: (s: AppState) => AppState) {
  state = updater(state);
  emit();
}

export function getState(): AppState {
  return state;
}

export function useStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => selector(state),
    () => selector(defaultState),
  );
}

export function useHydrated(): boolean {
  return useStore((s) => s.hydrated);
}

export function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// --- Row → app type mappers ---

type ProfileRow = {
  user_id: string;
  name: string;
  weight: number;
  height: number;
  age: number;
  gender: string;
  activity: string;
  target_weight: number;
  target_calories: number;
  target_carbs: number;
  target_protein: number;
  target_fat: number;
  theme: string;
};

function mapProfile(r: ProfileRow): Profile {
  return {
    name: r.name,
    weight: Number(r.weight),
    height: Number(r.height),
    age: r.age,
    gender: r.gender as Profile["gender"],
    activity: r.activity as Profile["activity"],
    targetWeight: Number(r.target_weight),
    targetCalories: r.target_calories,
    targetProtein: r.target_protein,
    targetCarbs: r.target_carbs,
    targetFat: r.target_fat,
    theme: r.theme as Profile["theme"],
  };
}

function profilePatchToDb(patch: Partial<Profile>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (patch.name !== undefined) m.name = patch.name;
  if (patch.weight !== undefined) m.weight = patch.weight;
  if (patch.height !== undefined) m.height = patch.height;
  if (patch.age !== undefined) m.age = patch.age;
  if (patch.gender !== undefined) m.gender = patch.gender;
  if (patch.activity !== undefined) m.activity = patch.activity;
  if (patch.targetWeight !== undefined) m.target_weight = patch.targetWeight;
  if (patch.targetCalories !== undefined) m.target_calories = patch.targetCalories;
  if (patch.targetProtein !== undefined) m.target_protein = patch.targetProtein;
  if (patch.targetCarbs !== undefined) m.target_carbs = patch.targetCarbs;
  if (patch.targetFat !== undefined) m.target_fat = patch.targetFat;
  if (patch.theme !== undefined) m.theme = patch.theme;
  return m;
}

type FoodRow = {
  id: string; name: string; meal: string; serving: string | null;
  image_path: string | null; date: string; logged_at: string;
  calories: number; protein: number; carbs: number; fat: number; fiber: number | null;
};
function mapFoodEntry(r: FoodRow): FoodEntry {
  return {
    id: r.id,
    name: r.name,
    meal: r.meal as FoodEntry["meal"],
    serving: r.serving ?? "",
    imagePath: r.image_path ?? undefined,
    date: r.date,
    loggedAt: new Date(r.logged_at).getTime(),
    calories: Number(r.calories),
    protein: Number(r.protein),
    carbs: Number(r.carbs),
    fat: Number(r.fat),
    fiber: r.fiber == null ? undefined : Number(r.fiber),
  };
}

type SavedMealRow = {
  id: string; name: string; serving: string | null; image_path: string | null;
  calories: number; protein: number; carbs: number; fat: number; fiber: number | null;
};
function mapSavedMeal(r: SavedMealRow): SavedMeal {
  return {
    id: r.id,
    name: r.name,
    serving: r.serving ?? "",
    imagePath: r.image_path ?? undefined,
    calories: Number(r.calories),
    protein: Number(r.protein),
    carbs: Number(r.carbs),
    fat: Number(r.fat),
    fiber: r.fiber == null ? undefined : Number(r.fiber),
  };
}

type WeightRow = { id: string; date: string; weight: number };
function mapWeight(r: WeightRow): WeightEntry {
  return { id: r.id, date: r.date, weight: Number(r.weight) };
}

type PhotoRow = { id: string; date: string; view: string; image_path: string; weight: number | null };
function mapPhoto(r: PhotoRow): ProgressPhoto {
  return {
    id: r.id,
    date: r.date,
    view: r.view as ProgressPhoto["view"],
    imagePath: r.image_path,
    weight: r.weight == null ? undefined : Number(r.weight),
  };
}

type CoachRow = { id: string; role: string; content: string; created_at: string };
function mapCoach(r: CoachRow): CoachMessage {
  return {
    id: r.id,
    role: r.role as CoachMessage["role"],
    content: r.content,
    ts: new Date(r.created_at).getTime(),
  };
}

// --- Hydration / clear ---

export async function hydrate(userId: string): Promise<void> {
  // One-time discard of pre-migration localStorage data.
  try {
    if (typeof window !== "undefined") localStorage.removeItem("ctrack-v1");
  } catch {
    /* ignore */
  }

  const [profileRes, entriesRes, savedMealsRes, weightsRes, photosRes, coachRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("food_entries").select("*").order("logged_at", { ascending: true }),
    supabase.from("saved_meals").select("*").order("created_at", { ascending: false }),
    supabase.from("weights").select("*").order("date", { ascending: true }),
    supabase.from("progress_photos").select("*").order("created_at", { ascending: false }),
    supabase.from("coach_messages").select("*").order("created_at", { ascending: true }),
  ]);

  const profile = profileRes.data ? mapProfile(profileRes.data as ProfileRow) : defaultProfile;

  state = {
    hydrated: true,
    userId,
    profile,
    entries: ((entriesRes.data ?? []) as FoodRow[]).map(mapFoodEntry),
    savedMeals: ((savedMealsRes.data ?? []) as SavedMealRow[]).map(mapSavedMeal),
    weights: ((weightsRes.data ?? []) as WeightRow[]).map(mapWeight),
    photos: ((photosRes.data ?? []) as PhotoRow[]).map(mapPhoto),
    coach: ((coachRes.data ?? []) as CoachRow[]).map(mapCoach),
  };
  applyTheme(profile.theme);
  emit();
}

export function clearStore() {
  state = { ...defaultState };
  emit();
}

// --- Mutations (optimistic; rollback + toast on error) ---

export function setTheme(theme: "light" | "dark") {
  updateProfile({ theme });
}

export function updateProfile(patch: Partial<Profile>) {
  const prev = state.profile;
  setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  if (patch.theme) applyTheme(patch.theme);
  const userId = state.userId;
  if (!userId) return;

  void supabase
    .from("profiles")
    .update(profilePatchToDb(patch))
    .eq("user_id", userId)
    .then(({ error }) => {
      if (error) {
        toast.error(`Save failed: ${error.message}`);
        setState((s) => ({ ...s, profile: prev }));
        if (patch.theme) applyTheme(prev.theme);
      }
    });
}

export function addFoodEntry(input: Omit<FoodEntry, "id" | "date" | "loggedAt"> & { date?: string }) {
  const id = uid();
  const date = input.date ?? todayKey();
  const loggedAt = Date.now();
  const entry: FoodEntry = { ...input, id, date, loggedAt };
  setState((s) => ({ ...s, entries: [...s.entries, entry] }));

  void supabase
    .from("food_entries")
    .insert({
      id,
      name: entry.name,
      meal: entry.meal,
      serving: entry.serving || null,
      image_path: entry.imagePath ?? null,
      date,
      calories: entry.calories,
      protein: entry.protein,
      carbs: entry.carbs,
      fat: entry.fat,
      fiber: entry.fiber ?? null,
    })
    .then(({ error }) => {
      if (error) {
        toast.error(`Log failed: ${error.message}`);
        setState((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) }));
      }
    });
}

export function deleteFoodEntry(id: string) {
  const prev = state.entries.find((e) => e.id === id);
  if (!prev) return;
  setState((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) }));

  void supabase
    .from("food_entries")
    .delete()
    .eq("id", id)
    .then(({ error }) => {
      if (error) {
        toast.error(`Delete failed: ${error.message}`);
        setState((s) => ({ ...s, entries: [...s.entries, prev] }));
      }
    });
}

export function saveMeal(m: Omit<SavedMeal, "id">) {
  const id = uid();
  const meal: SavedMeal = { ...m, id };
  setState((s) => ({ ...s, savedMeals: [meal, ...s.savedMeals] }));

  void supabase
    .from("saved_meals")
    .insert({
      id,
      name: meal.name,
      serving: meal.serving || null,
      image_path: meal.imagePath ?? null,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      fiber: meal.fiber ?? null,
    })
    .then(({ error }) => {
      if (error) {
        toast.error(`Save failed: ${error.message}`);
        setState((s) => ({ ...s, savedMeals: s.savedMeals.filter((x) => x.id !== id) }));
      }
    });
}

export function deleteSavedMeal(id: string) {
  const prev = state.savedMeals.find((m) => m.id === id);
  if (!prev) return;
  setState((s) => ({ ...s, savedMeals: s.savedMeals.filter((m) => m.id !== id) }));

  void supabase
    .from("saved_meals")
    .delete()
    .eq("id", id)
    .then(({ error }) => {
      if (error) {
        toast.error(`Delete failed: ${error.message}`);
        setState((s) => ({ ...s, savedMeals: [prev, ...s.savedMeals] }));
      }
    });
}

export function logWeight(weight: number) {
  const date = todayKey();
  const existing = state.weights.find((w) => w.date === date);
  const id = existing?.id ?? uid();
  const next: WeightEntry = { id, date, weight };

  setState((s) => {
    const others = s.weights.filter((w) => w.date !== date);
    return {
      ...s,
      weights: [...others, next].sort((a, b) => a.date.localeCompare(b.date)),
      profile: { ...s.profile, weight },
    };
  });

  const op = existing
    ? supabase.from("weights").update({ weight }).eq("id", existing.id)
    : supabase.from("weights").insert({ id, date, weight });

  void op.then(({ error }) => {
    if (error) toast.error(`Weight save failed: ${error.message}`);
  });

  if (state.userId) {
    void supabase.from("profiles").update({ weight }).eq("user_id", state.userId);
  }
}

export function addPhoto(p: Omit<ProgressPhoto, "id">) {
  const id = uid();
  const photo: ProgressPhoto = { ...p, id };
  setState((s) => ({ ...s, photos: [photo, ...s.photos] }));

  void supabase
    .from("progress_photos")
    .insert({
      id,
      date: photo.date,
      view: photo.view,
      image_path: photo.imagePath,
      weight: photo.weight ?? null,
    })
    .then(({ error }) => {
      if (error) {
        toast.error(`Photo save failed: ${error.message}`);
        setState((s) => ({ ...s, photos: s.photos.filter((x) => x.id !== id) }));
      }
    });
}

export function deletePhoto(id: string) {
  const prev = state.photos.find((p) => p.id === id);
  if (!prev) return;
  setState((s) => ({ ...s, photos: s.photos.filter((p) => p.id !== id) }));

  // Best-effort storage delete; DB row removal is what hides it from the UI.
  void supabase.storage
    .from("user-uploads")
    .remove([prev.imagePath])
    .catch(() => undefined);

  void supabase
    .from("progress_photos")
    .delete()
    .eq("id", id)
    .then(({ error }) => {
      if (error) {
        toast.error(`Delete failed: ${error.message}`);
        setState((s) => ({ ...s, photos: [prev, ...s.photos] }));
      }
    });
}

export function pushCoach(msg: Omit<CoachMessage, "id" | "ts">) {
  const id = uid();
  const ts = Date.now();
  const m: CoachMessage = { ...msg, id, ts };
  setState((s) => ({ ...s, coach: [...s.coach, m] }));

  void supabase
    .from("coach_messages")
    .insert({ id, role: m.role, content: m.content })
    .then(({ error }) => {
      if (error) console.error("Coach message save failed:", error.message);
    });
}

export function clearCoach() {
  const prev = state.coach;
  setState((s) => ({ ...s, coach: [] }));
  const userId = state.userId;
  if (!userId) return;
  void supabase
    .from("coach_messages")
    .delete()
    .eq("user_id", userId)
    .then(({ error }) => {
      if (error) {
        toast.error(`Clear failed: ${error.message}`);
        setState((s) => ({ ...s, coach: prev }));
      }
    });
}

export async function resetAllUserData(): Promise<void> {
  const userId = state.userId;
  if (!userId) return;
  const tables = ["food_entries", "saved_meals", "weights", "progress_photos", "coach_messages"] as const;
  const results = await Promise.all(
    tables.map((t) => supabase.from(t).delete().eq("user_id", userId)),
  );
  const err = results.find((r) => r.error)?.error;
  if (err) {
    toast.error(`Reset failed: ${err.message}`);
    return;
  }
  await hydrate(userId);
}

// --- Aggregations ---

export function totalsForDate(s: AppState, date: string): Macros {
  return s.entries
    .filter((e) => e.date === date)
    .reduce(
      (acc, e) => ({
        calories: acc.calories + e.calories,
        protein: acc.protein + e.protein,
        carbs: acc.carbs + e.carbs,
        fat: acc.fat + e.fat,
        fiber: (acc.fiber ?? 0) + (e.fiber ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    );
}
