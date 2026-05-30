import { useSyncExternalStore } from "react";

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
  imageUrl?: string;
  date: string; // YYYY-MM-DD
  loggedAt: number;
} & Macros;

export type SavedMeal = {
  id: string;
  name: string;
  serving: string;
  imageUrl?: string;
} & Macros;

export type WeightEntry = { id: string; date: string; weight: number };

export type ProgressPhoto = {
  id: string;
  date: string;
  view: "front" | "side" | "back";
  imageUrl: string;
  weight?: number;
};

export type Profile = {
  name: string;
  weight: number; // kg
  height: number; // cm
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
  profile: defaultProfile,
  entries: [],
  savedMeals: [
    {
      id: "s1",
      name: "Chicken Rice Bowl",
      serving: "1 bowl (450g)",
      calories: 620,
      protein: 48,
      carbs: 72,
      fat: 14,
      fiber: 4,
    },
    {
      id: "s2",
      name: "Protein Shake",
      serving: "1 scoop + milk",
      calories: 240,
      protein: 32,
      carbs: 12,
      fat: 6,
    },
    {
      id: "s3",
      name: "Greek Yogurt + Berries",
      serving: "200g",
      calories: 180,
      protein: 18,
      carbs: 22,
      fat: 3,
      fiber: 3,
    },
    {
      id: "s4",
      name: "Avocado Toast",
      serving: "2 slices",
      calories: 380,
      protein: 12,
      carbs: 38,
      fat: 22,
      fiber: 8,
    },
  ],
  weights: [],
  photos: [],
  coach: [],
};

const STORAGE_KEY = "ctrack-v1";

function load(): AppState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed, profile: { ...defaultProfile, ...parsed.profile } };
  } catch {
    return defaultState;
  }
}

let state: AppState = defaultState;
let initialized = false;
const listeners = new Set<() => void>();

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  state = load();
  initialized = true;
  applyTheme(state.profile.theme);
}

function applyTheme(theme: "light" | "dark") {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function persist() {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function emit() {
  for (const l of listeners) l();
}

export function setState(updater: (s: AppState) => AppState) {
  ensureInit();
  state = updater(state);
  persist();
  emit();
}

export function getState(): AppState {
  ensureInit();
  return state;
}

export function useStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => selector(getState()),
    () => selector(defaultState),
  );
}

// Helpers
export function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function setTheme(theme: "light" | "dark") {
  setState((s) => ({ ...s, profile: { ...s.profile, theme } }));
  applyTheme(theme);
}

export function addFoodEntry(input: Omit<FoodEntry, "id" | "date" | "loggedAt"> & { date?: string }) {
  setState((s) => ({
    ...s,
    entries: [
      ...s.entries,
      { ...input, id: uid(), date: input.date ?? todayKey(), loggedAt: Date.now() },
    ],
  }));
}

export function deleteFoodEntry(id: string) {
  setState((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) }));
}

export function saveMeal(m: Omit<SavedMeal, "id">) {
  setState((s) => ({ ...s, savedMeals: [{ ...m, id: uid() }, ...s.savedMeals] }));
}

export function deleteSavedMeal(id: string) {
  setState((s) => ({ ...s, savedMeals: s.savedMeals.filter((m) => m.id !== id) }));
}

export function logWeight(weight: number) {
  setState((s) => ({
    ...s,
    weights: [...s.weights, { id: uid(), date: todayKey(), weight }],
    profile: { ...s.profile, weight },
  }));
}

export function addPhoto(p: Omit<ProgressPhoto, "id">) {
  setState((s) => ({ ...s, photos: [{ ...p, id: uid() }, ...s.photos] }));
}

export function deletePhoto(id: string) {
  setState((s) => ({ ...s, photos: s.photos.filter((p) => p.id !== id) }));
}

export function updateProfile(patch: Partial<Profile>) {
  setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  if (patch.theme) applyTheme(patch.theme);
}

export function pushCoach(msg: Omit<CoachMessage, "id" | "ts">) {
  setState((s) => ({ ...s, coach: [...s.coach, { ...msg, id: uid(), ts: Date.now() }] }));
}

export function clearCoach() {
  setState((s) => ({ ...s, coach: [] }));
}

// Aggregations
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
