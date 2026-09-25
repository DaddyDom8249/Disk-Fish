import { createServerFn } from "@tanstack/react-start";

type Facts = {
  throw_type: string;
  throw_label: string;
  primary_finding: {
    id: string;
    title: string;
    confidence: string;
    likelihood: string;
    what_we_saw: string;
    why_it_matters: string;
    what_to_try: string[];
    watch_for: string;
    recheck: string;
    audit: unknown;
  } | null;
  secondary_finding: { id: string; title: string } | null;
  instruction: string;
};

export const explainCoaching = createServerFn({ method: "POST" })
  .validator((input: { facts: Facts }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Coach language is unavailable right now." };
    if (!data.facts.primary_finding) {
      return { ok: false as const, error: "No primary finding to explain." };
    }

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 420,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You are a disc-golf throwing coach writing short, calm, precise prose. You may only restate the JSON facts. Never invent numbers, distances, spin, or extra diagnoses. Never say the athlete is wrong or should copy a professional. Never give medical advice. Output four short labeled paragraphs: What we saw. Why it matters. What to try. Recheck.",
          },
          { role: "user", content: JSON.stringify(data.facts) },
        ],
      }),
    });
    if (!res.ok) return { ok: false as const, error: `Coach language failed (${res.status}).` };
    const body = (await res.json()) as { choices: { message: { content: string } }[] };
    return { ok: true as const, text: body.choices[0]?.message.content ?? "" };
  });
