// Minimal RSS parser: no external deps, good enough for well-formed news feeds.
const NAMED_ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
  ndash: "–", mdash: "—", hellip: "…",
};

function decodeEntities(s) {
  if (!s) return "";
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
    // run twice: some feeds double-encode (&amp;#39; -> &#39; -> ')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

function stripTags(s) {
  return decodeEntities(s)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function grabTag(block, tag) {
  const re = new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" + tag + ">", "i");
  const m = block.match(re);
  return m ? m[1] : "";
}

function grabAttr(block, tag, attr) {
  const re = new RegExp("<" + tag + "[^>]*\\b" + attr + "=[\"']([^\"']*)[\"'][^>]*/?>", "i");
  const m = block.match(re);
  return m ? m[1] : "";
}

function parseRss(xml) {
  const items = [];
  const blocks = xml.split(/<item[\s>]/i).slice(1);
  for (const raw of blocks) {
    const block = raw.split(/<\/item>/i)[0];
    const title = stripTags(grabTag(block, "title"));
    let link = stripTags(grabTag(block, "link"));
    if (!link) link = grabAttr("<link " + (block.match(/<link[^>]*\/>/i) || [""])[0], "link", "href");
    if (!link) {
      const atomLink = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
      if (atomLink) link = atomLink[1];
    }
    let description = grabTag(block, "description") || grabTag(block, "content:encoded") || grabTag(block, "summary");
    description = stripTags(description);
    const pubDateRaw = stripTags(grabTag(block, "pubDate") || grabTag(block, "dc:date") || grabTag(block, "published"));
    const pubDate = pubDateRaw ? new Date(pubDateRaw) : null;
    const category = stripTags(grabTag(block, "category"));
    if (title && link) items.push({ title, link: link.trim(), description, pubDate, category });
  }
  return items;
}

module.exports = { parseRss, stripTags, decodeEntities };
