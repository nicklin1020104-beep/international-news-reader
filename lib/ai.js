// Uses the Anthropic Messages API (needs ANTHROPIC_API_KEY) to turn a short,
// factual news snippet into an ORIGINAL short English article for learners,
// plus its Traditional Chinese translation, vocabulary and grammar notes.
// The model is instructed to rewrite in its own words, not copy the input
// phrasing, and never to invent facts beyond what it's given.

const MODEL = "claude-haiku-4-5-20251001";
const API_URL = "https://api.anthropic.com/v1/messages";

function stripFences(text) {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

async function writeArticle({ titleEn, desc, source, link }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const prompt = `Here are the bare facts of one real news story, taken from a publisher's own short RSS summary (not to be copied):

Headline: ${titleEn}
Summary facts: ${desc}
Source: ${source}

Write study material for an intermediate (CEFR B1-B2) English learner, based ONLY on the facts above. Do not invent details the facts don't support. Do NOT reuse the summary's exact wording -- write it freshly, in your own words, as 2-3 short paragraphs (about 130-200 words total).

Reply with ONLY a JSON object (no markdown fences, no commentary), matching this exact shape:
{
  "titleZh": "Traditional Chinese (Taiwan usage) translation of the headline",
  "en": ["English paragraph 1", "English paragraph 2", "..."],
  "zh": ["Traditional Chinese translation of paragraph 1, matching en 1:1", "..."],
  "vocab": [
    {"t":"term or phrase from your English text","p":"noun/verb/adjective/adverb/phrase/phrasal verb","en":"short English definition","zh":"Traditional Chinese meaning","ex":"a sentence from YOUR en paragraphs with the term wrapped in <b></b>"}
  ],
  "grammar": [
    {"g":"name of a grammar point actually used in your en paragraphs","zh":"Traditional Chinese explanation of that grammar point","ex":"a quoted sentence from your en paragraphs illustrating it"}
  ]
}
Include 6-8 vocab items and 2-3 grammar notes. Every "ex" must be a sentence that literally appears in your own "en" array.`;

  const body = {
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  };

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error("  [ai] API error", res.status, await res.text().catch(() => ""));
    return null;
  }
  const data = await res.json();
  const raw = data?.content?.[0]?.text;
  if (!raw) return null;

  let parsed;
  try {
    parsed = JSON.parse(stripFences(raw));
  } catch (e) {
    console.error("  [ai] JSON parse failed:", e.message);
    return null;
  }
  if (!parsed.en || !parsed.en.length || !parsed.zh || parsed.en.length !== parsed.zh.length) {
    console.error("  [ai] malformed response shape");
    return null;
  }
  return parsed;
}

module.exports = { writeArticle };
