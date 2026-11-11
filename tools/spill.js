(sels) => {
  // text that spills out of its box: for every box matched by sels, each visible piece of text must lie inside the box.
  // Text a box hides on purpose (a forecast kept to its lines, a scrolled area) is left out: only the part still shown
  // through every clipping element between the text and the box counts. Catches what overflow: visible lets through, like
  // a card's last lines drawn over the card's edge. The Target badge sits on the card's edge on purpose.
  const bad = [];
  const shown = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; } return true; };
  const cut = (a, b) => ({ left: Math.max(a.left, b.left), right: Math.min(a.right, b.right), top: Math.max(a.top, b.top), bottom: Math.min(a.bottom, b.bottom) });
  sels.forEach((sel) => document.querySelectorAll(sel).forEach((box, bi) => {
    if (!box.offsetWidth || !shown(box)) return;
    const br = box.getBoundingClientRect();
    const w = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (!n.textContent.trim() || !shown(n.parentElement) || n.parentElement.closest('.pop, .sr, .tgt')) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const tr of Array.from(rg.getClientRects())) {
        if (tr.width < 1) continue;
        let v = { left: tr.left, right: tr.right, top: tr.top, bottom: tr.bottom };
        for (let e = n.parentElement; e && e !== box; e = e.parentElement) {
          const cs = getComputedStyle(e);
          if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') v = cut(v, e.getBoundingClientRect());
        }
        if (v.right - v.left < 1 || v.bottom - v.top < 1) continue; // hidden on purpose
        if (v.left < br.left - 1 || v.right > br.right + 1 || v.top < br.top - 1 || v.bottom > br.bottom + 1) {
          bad.push(sel + ' ' + (bi + 1) + ' "' + n.textContent.trim().slice(0, 20) + '" spills out of its box'); break;
        }
      }
    }
  }));
  return Array.from(new Set(bad));
}
