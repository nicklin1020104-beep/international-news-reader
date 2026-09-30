function slugify(title, fallback) {
  const base = (title || fallback || "story")
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .slice(0, 5)
    .join("-");
  return base || fallback || "story";
}

function splitSentences(text) {
  if (!text) return [];
  return text
    .replace(/([.!?])\s+(?=[A-Z0-9"'])/g, "$1|")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

function wordCount(text) {
  return (text.match(/[A-Za-z0-9']+/g) || []).length;
}

function readTimeLabel(totalWords) {
  const mins = Math.max(1, Math.round(totalWords / 200));
  return `約 ${mins} 分鐘`;
}

const CATEGORY_RULES = [
  { zh: "中東", en: "Middle East", kw: /\b(israel|gaza|palestin|iran|iraq|syria|lebanon|yemen|hamas|hezbollah|saudi|qatar|hormuz)\b/i },
  { zh: "歐洲", en: "Europe", kw: /\b(europe|eu\b|britain|uk\b|france|germany|spain|italy|poland|ukraine|russia|nato|brexit)\b/i },
  { zh: "亞洲", en: "Asia", kw: /\b(china|japan|korea|india|pakistan|taiwan|myanmar|nepal|vietnam|thailand|philippines|indonesia|asean)\b/i },
  { zh: "非洲", en: "Africa", kw: /\b(africa|nigeria|kenya|ethiopia|sudan|congo|gambia|morocco|egypt|somalia)\b/i },
  { zh: "美洲", en: "Americas", kw: /\b(brazil|mexico|canada|argentina|venezuela|colombia|latin america)\b/i },
  { zh: "美國政治", en: "US Politics", kw: /\b(trump|biden|congress|senate|white house|supreme court|washington)\b/i },
  { zh: "氣候", en: "Climate", kw: /\b(climate|weather|heat|drought|flood|hurricane|wildfire|noaa|el nino)\b/i },
  { zh: "經濟", en: "Economy", kw: /\b(economy|economic|inflation|market|oil price|trade|tariff|stocks)\b/i },
  { zh: "環境", en: "Environment", kw: /\b(species|wildlife|environment|conservation|endangered)\b/i },
];

function guessCategory(text) {
  for (const rule of CATEGORY_RULES) {
    if (rule.kw.test(text)) return `${rule.zh} · ${rule.en}`;
  }
  return "國際 · World";
}

module.exports = { slugify, splitSentences, wordCount, readTimeLabel, guessCategory };
