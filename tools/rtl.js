(root) => {
  // Arabic screens: a signed number reads with its sign on the left of its first digit (-600, +500) and a label like A++
  // keeps its letter first, as in English, and a share reads 50% with the % on the right of its number (a % outside the
  // number's isolate shows as "%50": js/i18n_en.js PS.pct). Visible text in document order, so a sign and a number in two nodes (the
  // number in a <bdi>) count too. Screen-reader-only text (1 px clip) is skipped.
  const bad = [], chars = [];
  const vis = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || (cs.position === 'absolute' && e.getBoundingClientRect().width <= 1)) return false; } return true; };
  const w = document.createTreeWalker(document.querySelector(root || 'body'), NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (!n.textContent.trim() || !vis(n.parentElement)) continue;
    for (let i = 0; i < n.textContent.length; i++) chars.push([n, i, n.textContent[i]]);
  }
  const box = (c) => { if (!c[0]) return null; const r = document.createRange(); r.setStart(c[0], c[1]); r.setEnd(c[0], c[1] + 1); const q = r.getClientRects()[0]; return q && q.width > 0 ? q : null; };
  const near = (a, b) => a && b && Math.abs((a.top + a.bottom) / 2 - (b.top + b.bottom) / 2) < a.height / 2;
  const say = (i, j) => chars.slice(Math.max(0, i - 10), j + 6).map((c) => c[2]).join('').replace(/\n/g, ' ').trim();
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i][2], prev = i ? chars[i - 1][2] : ' ';
    if (/[+\-−]/.test(ch) && chars[i][0].textContent.trim() === ch) continue; // a dash alone in a table cell means "none", not a sign
    if (/[+\-−]/.test(ch) && !/[0-9A-Za-z؀-ۿ%]/.test(prev) && i + 1 < chars.length && /[0-9]/.test(chars[i + 1][2])) {
      const a = box(chars[i]), b = box(chars[i + 1]);
      if (near(a, b) && a.left > b.left + 1) bad.push('sign right of its number: "' + say(i, i + 1) + '"');
    }
    if (ch === '%' && /[0-9]/.test(prev)) {
      const a = box(chars[i - 1]), b = box(chars[i]);
      if (near(a, b) && b.left < a.left - 1) bad.push('percent sign left of its number: "' + say(i - 1, i) + '"');
    }
    if (ch === '%' && !/[0-9]/.test(prev) && i + 1 < chars.length && /[0-9]/.test(chars[i + 1][2])) bad.push('percent sign written before its number: "' + say(i, i + 1) + '"');
    if (ch === '+' && /[A-Za-z]/.test(prev)) {
      const a = box(chars[i - 1]), b = box(chars[i]);
      if (near(a, b) && a.left > b.left + 1) bad.push('reads backwards: "' + say(i - 1, i) + '"');
    }
  }
  return Array.from(new Set(bad));
}
