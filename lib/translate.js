// Free, keyless EN -> zh-TW translation via Google's public translate endpoint
// (the same endpoint the "gtx" web widget uses). Best-effort; on failure returns null
// so callers can decide to skip rather than publish garbage.

async function translateText(text, { tl = "zh-TW", sl = "en", tries = 2 } = {}) {
  if (!text || !text.trim()) return "";
  const q = encodeURIComponent(text);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${q}`;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const segments = (data && data[0]) || [];
      return segments.map((seg) => seg[0]).join("");
    } catch (e) {
      if (attempt === tries - 1) return null;
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  return null;
}

module.exports = { translateText };
