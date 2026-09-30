// Free, keyless English dictionary lookups via Wiktionary's REST API.
// Used only to gloss a handful of vocabulary words per article (short, factual
// definitions) — not to reproduce any news article text.

function cleanDef(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

const POS_MAP = { Noun: "noun", Verb: "verb", Adjective: "adjective", Adverb: "adverb", Phrase: "phrase", Interjection: "interjection" };

async function lookup(word) {
  const w = word.toLowerCase().trim();
  if (!w) return null;
  try {
    const res = await fetch("https://en.wiktionary.org/api/rest_v1/page/definition/" + encodeURIComponent(w), {
      headers: { "user-agent": "news-reader-personal-script/1.0 (bilingual study app builder)" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const entries = data.en || data.en_US || Object.values(data)[0];
    if (!entries || !entries.length) return null;
    for (const entry of entries) {
      const def = (entry.definitions || []).find((d) => d.definition && cleanDef(d.definition).length > 8);
      if (def) {
        return {
          pos: POS_MAP[entry.partOfSpeech] || (entry.partOfSpeech || "").toLowerCase() || "word",
          definition: cleanDef(def.definition).replace(/\.$/, ""),
        };
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

const FORM_OF_RE = /^(plural of|plural form of|simple past( tense)? and past participle of|simple past tense of|past participle of|present participle of|third-person singular( simple)? present( indicative)? of|alternative (spelling|form|capitalization) of|comparative form of|superlative form of|gerund of)\s+([a-z-]+)/i;

function formOfLemma(definition) {
  const m = definition.match(FORM_OF_RE);
  return m ? m[m.length - 1] : null;
}

module.exports = { lookup, formOfLemma };
