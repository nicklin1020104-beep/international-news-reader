const fs = require("fs");
const path = require("path");

const { parseRss } = require("./lib/rss");
const { translateText } = require("./lib/translate");
const { lookup, formOfLemma } = require("./lib/dict");
const { findGrammarNotes } = require("./lib/grammar");
const { candidateWords, findExampleSentence } = require("./lib/vocab");
const { slugify, splitSentences, wordCount, readTimeLabel, guessCategory } = require("./lib/util");
const { writeArticle } = require("./lib/ai");

const TEMPLATE_PATH = path.join(__dirname, "template.html");
const OUT_PATH = path.join(__dirname, "index.html");

const TARGET_COUNT = 6;
const MIN_COUNT = 4;
const MAX_AGE_HOURS = 36;

const FEEDS = [
  { url: "https://www.aljazeera.com/xml/rss/all.xml", source: "Al Jazeera" },
  { url: "http://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC News" },
  { url: "https://www.theguardian.com/world/rss", source: "The Guardian" },
  { url: "https://feeds.npr.org/1004/rss.xml", source: "NPR" },
];

function fmtDateDot(d) {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
function fmtDateZh(d) {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

async function fetchFeed(feed) {
  try {
    const res = await fetch(feed.url, { headers: { "user-agent": "Mozilla/5.0 (news-reader personal script)" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const xml = await res.text();
    return parseRss(xml).map((it) => ({ ...it, source: feed.source }));
  } catch (e) {
    console.error("[feed failed]", feed.source, e.message);
    return [];
  }
}

function isLiveBlogOrAggregate(item) {
  return /\blive\b[: ]|\bliveblog\b/i.test(item.title) || /\/live\//i.test(item.link);
}

function isFresh(item) {
  if (!item.pubDate || isNaN(item.pubDate.getTime())) return true; // keep undated items, just deprioritised
  const ageHours = (Date.now() - item.pubDate.getTime()) / 36e5;
  return ageHours >= -6 && ageHours <= MAX_AGE_HOURS;
}

function titleKey(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 6)
    .sort()
    .join(" ");
}

function pickCandidates(itemsBySource) {
  // round-robin across sources for topical variety, freshest first within each source
  const queues = itemsBySource.map((list) =>
    list
      .filter(isFresh)
      .sort((a, b) => (b.pubDate || 0) - (a.pubDate || 0))
  );
  const picked = [];
  const seenKeys = new Set();
  let round = 0;
  while (picked.length < 18 && queues.some((q) => q.length > round)) {
    for (const q of queues) {
      const item = q[round];
      if (!item) continue;
      if (isLiveBlogOrAggregate(item)) continue;
      const key = titleKey(item.title);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      picked.push(item);
    }
    round++;
  }
  return picked;
}

async function buildVocabAndGrammar(sentences) {
  const words = candidateWords(sentences, 14);
  const vocab = [];
  const usedTerms = new Set();
  for (const w of words) {
    if (vocab.length >= 6) break;
    let def = await lookup(w);
    let term = w;
    if (def) {
      const lemma = formOfLemma(def.definition);
      if (lemma && lemma !== w) {
        const lemmaDef = await lookup(lemma);
        if (lemmaDef) { def = lemmaDef; term = lemma; }
        else def = null; // a bare "form of X" with no real definition isn't useful vocab
      }
    }
    if (!def || usedTerms.has(term)) continue;
    const zh = await translateText(def.definition);
    if (!zh) continue;
    usedTerms.add(term);
    const ex = findExampleSentence(sentences, w) || findExampleSentence(sentences, term);
    vocab.push({ t: term, p: def.pos, en: def.definition, zh, ex: ex ? `“${ex}”` : `“${def.definition}”` });
  }
  const grammar = findGrammarNotes(sentences, 3);
  return { vocab, grammar };
}

async function buildArticleWithAi(titleEn, desc, item) {
  const ai = await writeArticle({ titleEn, desc, source: item.source, link: item.link });
  if (!ai || !ai.en || !ai.en.length || !ai.zh || ai.en.length !== ai.zh.length) return null;
  return { titleZh: ai.titleZh, enParas: ai.en, zhParas: ai.zh, vocab: ai.vocab || [], grammar: ai.grammar || [] };
}

async function buildArticleFallback(titleEn, desc) {
  const sentences = splitSentences(desc).slice(0, 4);
  if (!sentences.length) return null;

  const titleZh = await translateText(titleEn);
  if (!titleZh) return null;

  const enParas = [];
  const zhParas = [];
  // group sentences into 1-2 short paragraphs
  const mid = Math.ceil(sentences.length / 2);
  const groups = sentences.length > 2 ? [sentences.slice(0, mid).join(" "), sentences.slice(mid).join(" ")] : [sentences.join(" ")];
  for (const g of groups) {
    if (!g) continue;
    const zh = await translateText(g);
    if (!zh) continue;
    enParas.push(g);
    zhParas.push(zh);
  }
  if (!enParas.length) return null;

  const { vocab, grammar } = await buildVocabAndGrammar([titleEn, ...sentences]);
  return { titleZh, enParas, zhParas, vocab, grammar };
}

async function buildArticle(item, usedIds, now) {
  const titleEn = item.title.trim();
  const descRaw = item.description.trim();
  // Drop boilerplate/teaser cruft some feeds append (e.g. "Continue reading...")
  const desc = descRaw.replace(/\s*(Continue reading.*|Read more.*|\[…\]|\.\.\.$)/i, "").trim();
  if (!desc || desc.length < 25) return null;

  let built = null;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      built = await buildArticleWithAi(titleEn, desc, item);
    } catch (e) {
      console.error("  [ai] failed for", titleEn, "-", e.message);
    }
  }
  if (!built) built = await buildArticleFallback(titleEn, desc);
  if (!built) return null;
  const { titleZh, enParas, zhParas, vocab, grammar } = built;

  let id = slugify(titleEn);
  let n = 2;
  while (usedIds.has(id)) id = slugify(titleEn) + "-" + n++;
  usedIds.add(id);

  const totalWords = wordCount(titleEn) + enParas.reduce((a, p) => a + wordCount(p), 0);

  return {
    id,
    cat: guessCategory(titleEn + " " + desc),
    source: item.source,
    date: fmtDateZh(now),
    read: readTimeLabel(totalWords),
    titleEn,
    titleZh,
    en: enParas,
    zh: zhParas,
    vocab,
    grammar,
    link: item.link,
  };
}

async function main() {
  const now = new Date();
  console.log("Building news reader for", fmtDateZh(now));

  const perFeed = await Promise.all(FEEDS.map(fetchFeed));
  perFeed.forEach((list, i) => console.log(" feed", FEEDS[i].source, "->", list.length, "items"));

  const candidates = pickCandidates(perFeed);
  console.log("candidates after dedupe/round-robin:", candidates.length);

  const usedIds = new Set();
  const articles = [];
  for (const c of candidates) {
    if (articles.length >= TARGET_COUNT) break;
    try {
      const art = await buildArticle(c, usedIds, now);
      if (art) {
        articles.push(art);
        console.log("  + kept:", art.titleEn);
      }
    } catch (e) {
      console.error("  - skip (error):", c.title, e.message);
    }
  }

  if (articles.length < MIN_COUNT) {
    console.error(`Only got ${articles.length} article(s), need at least ${MIN_COUNT}. Aborting without publishing.`);
    process.exit(1);
  }

  const template = fs.readFileSync(TEMPLATE_PATH, "utf8");
  const html = template
    .replace("/*__STORIES_JSON__*/", () =>
      "{\n" + articles.map((a) => `  ${JSON.stringify(a.id)}: ${JSON.stringify(a)}`).join(",\n") + "\n}"
    )
    .replace("/*__ORDER_JSON__*/", () => JSON.stringify(articles.map((a) => a.id)))
    .replace("{{DATE_DOT}}", fmtDateDot(now))
    .replace(/\{\{DATE_ZH\}\}/g, fmtDateZh(now))
    .replace("{{COUNT}}", String(articles.length));

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, html, "utf8");
  console.log(`Wrote ${articles.length} articles to ${OUT_PATH} (${html.length} bytes).`);
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
