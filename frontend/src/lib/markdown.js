/*
  Small markdown → HTML for pasted guides and notes: headings, **bold**, *italic*, `code`,
  [links](url), - / 1. lists, > quotes, --- rules, and line breaks inside a paragraph.
  The output still goes through RichView's DOMPurify pass.
*/
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const inline = s => esc(s)
  .replace(/`([^`]+)`/g, "<code>$1</code>")
  .replace(/\*\*(.+?)\*\*|__(.+?)__/g, (_, a, b) => `<strong>${a ?? b}</strong>`)
  .replace(/(^|[^*\w])\*(?!\s)(.+?)\*(?!\w)|(^|[^_\w])_(?!\s)(.+?)_(?!\w)/g, (_, p1, a, p2, b) => `${p1 ?? p2}<em>${a ?? b}</em>`)
  .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');

const LI = /^\s*([-*+]|\d+[.)])\s+(.*)$/;

export function mdToHtml(src) {
  const lines = String(src || "").replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let para = [], list = null, quote = [];
  const flushPara = () => { if (para.length) out.push(`<p>${para.map(inline).join("<br>")}</p>`); para = []; };
  const flushList = () => { if (list) out.push(`<${list.tag}>${list.items.map(i => `<li>${inline(i)}</li>`).join("")}</${list.tag}>`); list = null; };
  const flushQuote = () => { if (quote.length) out.push(`<blockquote><p>${quote.map(inline).join("<br>")}</p></blockquote>`); quote = []; };
  const flush = () => { flushPara(); flushList(); flushQuote(); };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    let m;
    if (!line.trim()) { flush(); continue; }
    if ((m = /^(#{1,6})\s+(.*)$/.exec(line))) { flush(); out.push(`<h${m[1].length <= 2 ? 3 : 4}>${inline(m[2])}</h${m[1].length <= 2 ? 3 : 4}>`); continue; }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { flush(); out.push("<hr>"); continue; }
    if ((m = /^\s*>\s?(.*)$/.exec(line))) { flushPara(); flushList(); quote.push(m[1]); continue; }
    if ((m = LI.exec(line))) {
      flushPara(); flushQuote();
      const tag = /\d/.test(m[1]) ? "ol" : "ul";
      if (list && list.tag !== tag) flushList();
      (list = list || { tag, items: [] }).items.push(m[2]);
      continue;
    }
    // an indented line right after a list item continues that item
    if (list && /^\s{2,}/.test(raw)) { list.items[list.items.length - 1] += " " + line.trim(); continue; }
    flushList(); flushQuote();
    para.push(line.trim());
  }
  flush();
  return out.join("");
}

/* First heading or bold line, for naming a pasted / dropped note */
export function mdTitle(src) {
  const first = String(src || "").split("\n").map(l => l.trim()).find(Boolean) || "";
  return first.replace(/^#{1,6}\s+/, "").replace(/^\*\*(.+)\*\*$/, "$1").replace(/[*_`]/g, "").slice(0, 120);
}
