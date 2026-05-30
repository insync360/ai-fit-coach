import { createFileRoute } from "@tanstack/react-router";

const MODEL = "gpt-4o";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

type FoodItem = {
  name: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
};

type AnalyzeResult = {
  confidence: "high" | "medium" | "low";
  items: FoodItem[];
  totals: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
  followUp: string[]; // clarification questions
  summary: string;
};

export const Route = createFileRoute("/api/analyze-food")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.OPENAI_API_KEY;
        if (!key) return new Response("Missing OPENAI_API_KEY", { status: 500 });

        const body = (await request.json()) as { imageDataUrl?: string; description?: string; clarifications?: string };
        if (!body.imageDataUrl && !body.description) {
          return new Response("Provide image or description", { status: 400 });
        }

        const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
        const promptText = `You are a precision nutrition AI. Analyze the food and return STRICT JSON only (no markdown) with this shape:
{
  "confidence": "high"|"medium"|"low",
  "items": [{"name":"...","serving":"...","calories":N,"protein":N,"carbs":N,"fat":N,"fiber":N}],
  "totals": {"calories":N,"protein":N,"carbs":N,"fat":N,"fiber":N},
  "followUp": ["question1","question2"],
  "summary": "one short sentence"
}
Estimate realistic portion sizes. If portion or preparation is unclear, set confidence to "low" or "medium" and provide 1-3 short follow-up questions (e.g. "How many chapatis?", "Cooked with oil?"). If confidence is high, followUp must be an empty array. All numbers integers in grams/kcal.${body.clarifications ? `\n\nUser clarifications: ${body.clarifications}` : ""}${body.description ? `\n\nUser description: ${body.description}` : ""}`;

        userContent.push({ type: "text", text: promptText });
        if (body.imageDataUrl) {
          userContent.push({ type: "image_url", image_url: { url: body.imageDataUrl } });
        }

        const res = await fetch(OPENAI_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: MODEL,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: "You return only valid JSON. No prose, no code fences." },
              { role: "user", content: userContent },
            ],
          }),
        });

        if (!res.ok) {
          const txt = await res.text();
          if (res.status === 429) return new Response("Rate limit. Try again shortly.", { status: 429 });
          if (res.status === 401) return new Response("Invalid OPENAI_API_KEY.", { status: 500 });
          return new Response(`AI error: ${txt}`, { status: 500 });
        }

        const data = await res.json();
        const raw = data?.choices?.[0]?.message?.content ?? "";
        let parsed: AnalyzeResult;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return new Response(JSON.stringify({ error: "Could not parse AI response", raw }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify(parsed), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
