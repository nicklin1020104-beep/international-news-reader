const { COMMON_SET } = require("./common-words");

// Pick words worth studying from a short piece of article text: skip function
// words, skip likely proper nouns (capitalised mid-sentence), rank longer /
// less-common-looking words first.
function candidateWords(sentences, max = 10) {
  // A word only qualifies if it is seen in plain lowercase form somewhere in the
  // text -- this reliably screens out proper nouns (people, places, agencies),
  // including ones that happen to start a sentence.
  const sawLower = new Set();
  const allWords = new Set();
  for (const sentence of sentences) {
    const words = sentence.match(/[A-Za-z][A-Za-z'-]*/g) || [];
    for (const w of words) {
      const lower = w.toLowerCase();
      if (lower.length < 4 || COMMON_SET.has(lower)) continue;
      allWords.add(lower);
      if (w === lower) sawLower.add(lower);
    }
  }
  return [...allWords]
    .filter((w) => sawLower.has(w))
    .sort((a, b) => b.length - a.length)
    .slice(0, max);
}

function findExampleSentence(sentences, word) {
  const re = new RegExp("\\b" + word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
  for (const s of sentences) {
    const m = s.match(re);
    if (m) return s.replace(re, "<b>" + m[0] + "</b>");
  }
  return null;
}

module.exports = { candidateWords, findExampleSentence };
