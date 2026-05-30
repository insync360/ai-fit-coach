import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { useStore, pushCoach, totalsForDate, todayKey, type CoachMessage } from "@/lib/store";

export function CoachSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useStore((s) => s);
  const messages = state.coach;
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  if (!open) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    pushCoach({ role: "user", content: text });
    setLoading(true);
    try {
      const totals = totalsForDate(state, todayKey());
      const context = `Profile: ${state.profile.weight}kg, target ${state.profile.targetWeight}kg, daily target ${state.profile.targetCalories} kcal, ${state.profile.targetProtein}g protein.
Today so far: ${Math.round(totals.calories)} kcal, P${Math.round(totals.protein)} C${Math.round(totals.carbs)} F${Math.round(totals.fat)}.
Recent weights: ${state.weights.slice(-5).map((w) => `${w.date}:${w.weight}`).join(", ") || "none"}.`;

      const history: { role: "user" | "assistant"; content: string }[] = [
        ...messages.map((m: CoachMessage) => ({ role: m.role, content: m.content })),
        { role: "user", content: text },
      ];
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, context }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { reply } = await res.json();
      pushCoach({ role: "assistant", content: reply });
    } catch (e) {
      pushCoach({ role: "assistant", content: `Error: ${(e as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <div className="label-eyebrow">AI Nutrition Coach</div>
          <div className="text-lg font-bold">Ask anything</div>
        </div>
        <button onClick={onClose} className="border border-border p-2"><X className="h-4 w-4" /></button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Try asking:</p>
            {[
              "How can I increase my protein intake?",
              "Why is my weight not changing?",
              "Is my meal plan today good for fat loss?",
              "What should I eat tonight to hit my macros?",
            ].map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="block w-full border border-border bg-surface px-3 py-2 text-left text-sm"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
            {m.role === "user" ? (
              <div className="max-w-[85%] border border-primary bg-primary px-3 py-2 text-sm text-primary-foreground">
                {m.content}
              </div>
            ) : (
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</div>
            )}
          </div>
        ))}
        {loading && <div className="text-sm text-muted-foreground">Thinking…</div>}
      </div>

      <div className="border-t border-border bg-surface p-3" style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + 0.75rem)` }}>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask your coach…"
            className="flex-1 border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="flex h-12 w-12 items-center justify-center border border-foreground bg-foreground text-background disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
