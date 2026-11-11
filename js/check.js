/* Payday Spire - before and after: two quick guesses after month 1 come back at year end with new numbers
   (same idea, different amounts), so the end screen can show what changed. No score, always skippable. */
(function () {
  const PS = (window.PS = window.PS || {});
  const t = (k, p) => PS.t(k, p);

  // right = the answer by the rule the question names; part = right by another accepted view (silver nisab)
  const Q = {
    1: { icon: 'card', pre: { right: 'c' }, post: { right: 'b' } },
    2: { icon: 'scale', pre: { right: 'b', part: 'a' }, post: { right: 'a' } },
  };

  // 'right' | 'part' | 'wrong' | null (skipped)
  function mark(n, phase, ans) {
    if (!ans || !ans['q' + n]) return null;
    const a = ans['q' + n], q = Q[n][phase];
    return a === q.right ? 'right' : a === q.part ? 'part' : 'wrong';
  }
  const count = (ans, phase) => (ans ? [1, 2].filter((n) => mark(n, phase, ans) === 'right').length : null);

  // phase 'pre' (after month 1, keys pq.*) or 'post' (year end, keys rq.*)
  function ask(s, phase, onDone) {
    const pre = phase === 'pre', k = pre ? 'pq' : 'rq';
    const ans = {};
    const finish = (keep) => { s[pre ? 'predict' : 'recheck'] = keep && Object.keys(ans).length ? ans : null; PS.ui.close(); onDone(); };
    const step = (n) => {
      const body = '<h2>' + PS.icon(Q[n].icon) + ' ' + t(k + '.t', { n }) + '</h2><p>' + t(k + '.' + n, { n: PS.CONST.NISAB }) + '</p>' +
        '<div class="opts" data-n="' + n + '" data-phase="' + phase + '">' + ['a', 'b', 'c'].map((x, i) => '<button class="opt" data-q="' + x + '"' + (i ? '' : ' data-first') + '><b>' + t(k + '.' + n + '.' + x) + '</b></button>').join('') + '</div>' +
        '<p class="keys">' + t(k + '.sub') + '</p><div class="row"><button class="btn" id="qSkip">' + t('pq.skip') + '</button></div>';
      PS.ui.modal(body, { kind: 'check', esc: () => finish(true) });
      document.querySelectorAll('#panel [data-q]').forEach((b) => {
        b.onclick = () => { ans['q' + n] = b.dataset.q; if (n === 1) step(2); else finish(true); };
      });
      document.getElementById('qSkip').onclick = () => finish(true);
    };
    step(1);
  }

  const LABEL = { right: 'lc.right', part: 'lc.2a', wrong: 'lc.wrong' };
  function rowHTML(s, n) {
    const side = (phase, ans, base) => {
      const m = mark(n, phase, ans);
      const txt = m ? t(base + '.' + n + '.' + ans['q' + n]) + ' <em class="ba-m ' + m + '">' + t(LABEL[m]) + '</em>' : '<em class="ba-m skip">' + t('ba.skip') + '</em>';
      return '<span class="ba-side"><small>' + t(phase === 'pre' ? 'ba.pre' : 'ba.post') + '</small><span>' + txt + '</span></span>';
    };
    return '<div class="ba-row">' + side('pre', s.predict, 'pq') + '<span class="ba-arrow" aria-hidden="true">' + t('ba.arrow') + '</span>' + side('post', s.recheck, 'rq') + '</div>';
  }

  // end screen block: summary line, both questions, the worked answers tied to this year
  function endHTML(s) {
    const a = count(s.predict, 'pre'), b = count(s.recheck, 'post');
    let sum;
    if (a == null && b == null) sum = t('ba.none');
    else sum = '<b>' + t('ba.sum', { a: a == null ? '-' : a, b: b == null ? '-' : b }) + '</b>' +
      // a month 1 answer that is right only by the silver nisab view is counted on its own, not as a right answer to the gold nisab question
      (mark(2, 'pre', s.predict) === 'part' ? ' ' + t('ba.part') : '') +
      (a != null && b != null ? ' ' + t(b > a ? 'ba.up' : b === a ? 'ba.same' : 'ba.down') : '');
    // what the card cost: interest, card late fees and cash advances (the ledger), without the late fees on ordinary bills
    const st = s.st, card = Math.round(PS.L.total(s) - ((st.cost || {}).overdue || 0));
    return '<h2>' + t('lc.t') + '</h2><div class="ba"><p class="ba-sum">' + sum + '</p>' + rowHTML(s, 1) + rowHTML(s, 2) +
      '<p class="small">' + t('lc.1') + ' ' + (st.missed ? t('lc.1y', { n: st.missed, x: card }) : card > 0 ? t('lc.1a', { x: card }) : t('lc.1n')) + '</p>' +
      '<p class="small">' + t('lc.2', { n: PS.CONST.NISAB }) + '</p></div>';
  }

  PS.check = { ask, mark, count, endHTML, Q };
})();
