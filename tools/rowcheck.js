(sels) => {
  // boxes set side by side (status bar chips, result card numbers, end screen and dashboard numbers): for each row in sels,
  // no two boxes overlap, no box goes past the screen sideways, and every piece of text a reader sees lies inside its box and
  // inside every box between it and the chip that hides what spills out (so overflow into the next box and text cut off by
  // overflow: hidden or an ellipsis both count). Text kept for screen readers only (1 px clip) and hidden text are skipped.
  const vw = innerWidth, bad = [];
  const shown = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) {
    const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (cs.position === 'absolute' && e.getBoundingClientRect().width <= 1) return false; } return true; };
  const inside = (a, b) => a.left >= b.left - 1 && a.right <= b.right + 1 && a.top >= b.top - 1 && a.bottom <= b.bottom + 1;
  const name = (el) => (el.className && typeof el.className === 'string' ? el.className.split(' ')[0] : el.tagName.toLowerCase());
  sels.forEach((sel) => document.querySelectorAll(sel).forEach((row) => {
    if (!shown(row)) return;
    const cells = Array.from(row.children).filter((c) => shown(c) && c.getBoundingClientRect().width > 1);
    const rs = cells.map((c) => c.getBoundingClientRect());
    rs.forEach((r, i) => {
      if (r.left < -1 || r.right > vw + 1) bad.push(sel + ' box ' + (i + 1) + ' off screen sideways');
      for (let j = i + 1; j < rs.length; j++) { const q = rs[j];
        if (r.left < q.right - 1 && q.left < r.right - 1 && r.top < q.bottom - 1 && q.top < r.bottom - 1) bad.push(sel + ' boxes ' + (i + 1) + ' and ' + (j + 1) + ' overlap'); }
    });
    cells.forEach((c, i) => {
      const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        if (!n.textContent.trim() || !shown(n.parentElement)) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        Array.from(rg.getClientRects()).forEach((tr) => {
          if (tr.width < 1) return;
          for (let e = n.parentElement; e; e = e.parentElement) {
            const cs = getComputedStyle(e);
            if (e === c || cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
              if (!inside(tr, e.getBoundingClientRect())) { bad.push(sel + ' box ' + (i + 1) + ' "' + n.textContent.trim().slice(0, 18) + '" ' + (e === c ? 'spills out of its box' : 'cut in ' + name(e))); return; }
            }
            if (e === c) break;
          }
        });
      }
    });
  }));
  return Array.from(new Set(bad));
}
