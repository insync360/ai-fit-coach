import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/coach")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const body = (await request.json()) as {
          messages: { role: "user" | "assistant"; content: string }[];
          context?: string;
        };

        const system = `You are an expert nutrition and fat-loss coach inside a calorie tracker app. Be direct, evidence-based, motivating but realistic. Use short paragraphs and bullets. Never give medical advice. Use the user's current data when relevant.

USER CONTEXT:
${body.context ?? "No context provided."}`;

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "system", content: system }, ...body.messages],
          }),
        });

        if (!res.ok) {
          const txt = await res.text();
          if (res.status === 429) return new Response("Rate limit. Try again shortly.", { status: 429 });
          if (res.status === 402) return new Response("AI credits exhausted.", { status: 402 });
          return new Response(`AI error: ${txt}`, { status: 500 });
        }

        const data = await res.json();
        const reply = data?.choices?.[0]?.message?.content ?? "I couldn't generate a response.";
        return new Response(JSON.stringify({ reply }), { headers: { "Content-Type": "application/json" } });
      },
    },
  },
});
