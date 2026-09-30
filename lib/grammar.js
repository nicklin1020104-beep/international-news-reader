// Rule-based grammar-point spotting. No AI, no external calls: just pattern
// matching against sentences that are already part of the short article text we
// built (title + RSS summary), so every example is grounded in that same text.

const IRREGULAR_PP = "been|done|said|made|given|taken|seen|known|shown|held|found|told|left|brought|sent|kept|paid|met|led|set|hit|cut|put|read|written|spoken|broken|chosen|driven|risen|fallen|grown|drawn|worn|torn|sworn|flown|thrown";

const RULES = [
  {
    key: "passive",
    test: (s) => new RegExp(`\\b(is|are|was|were|been|being)\\s+(\\w+ed|${IRREGULAR_PP})\\b`, "i").test(s),
    g: "被動語態：be + 過去分詞",
    zh: "由 be 動詞（is/are/was/were/been）加過去分詞組成，強調「動作的承受者」而不是「誰做的」，新聞報導常用來保持客觀語氣。",
  },
  {
    key: "perfect",
    test: (s) => new RegExp(`\\b(has|have|had)\\s+(\\w+ed|${IRREGULAR_PP})\\b`, "i").test(s),
    g: "完成式：have/has/had + 過去分詞",
    zh: "完成式連接過去動作與現在（或另一個過去時間點）的結果，常用來說明「已經發生、而且影響持續到現在」的事。",
  },
  {
    key: "relative",
    test: (s) => /,?\s+(which|who|that|whose)\s+\w+/i.test(s) && s.split(",").length > 1,
    g: "關係子句：which / who / that",
    zh: "關係子句用來補充說明前面提到的人事物，可以把兩個句子的資訊合併成一句，是新聞英文常見的精簡寫法。",
  },
  {
    key: "comparative",
    test: (s) => /\b(more|less|fewer)\s+\w+\s+than\b|\w+er\s+than\b/i.test(s),
    g: "比較句型：more/less ... than",
    zh: "用來比較兩者的差異程度，more/less + 形容詞/副詞 + than，或直接在形容詞字尾加 -er + than。",
  },
  {
    key: "reported",
    test: (s) => /\b(said|says|told|warned|claimed|announced|added|noted)\b.*\bthat\b/i.test(s),
    g: "間接引語：said/warned + that 子句",
    zh: "轉述別人說的話時，常用「動詞 + that + 子句」的形式，语气比直接引用更正式、更適合新聞寫作。",
  },
  {
    key: "modal-future",
    test: (s) => /\b(will|would|is set to|is expected to|plans to)\b/i.test(s),
    g: "未來／預期：will / be expected to / plan to",
    zh: "用來描述尚未發生、但預期或計畫會發生的事，will 較肯定，be expected to／plan to 則帶有「官方說法／計畫」的語氣。",
  },
];

function findGrammarNotes(sentences, max = 3) {
  const found = [];
  const usedKeys = new Set();
  for (const s of sentences) {
    for (const rule of RULES) {
      if (usedKeys.has(rule.key)) continue;
      if (rule.test(s)) {
        found.push({ g: rule.g, zh: rule.zh, ex: `“${s.trim()}”` });
        usedKeys.add(rule.key);
        break;
      }
    }
    if (found.length >= max) break;
  }
  return found;
}

module.exports = { findGrammarNotes };
