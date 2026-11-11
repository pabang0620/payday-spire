(pol) => {
  const P = PS.POLICY[pol], s = PS.G.s, m = document.getElementById('modal');
  const click = (sel) => { const b = document.querySelector(sel); if (b) b.click(); return !!b; };
  if (PS.G.phase === 'end') return 'end';
  if (!m.hidden) {
    const kind = document.getElementById('panel').dataset.kind;
    if (kind === 'check') { const o = document.querySelector('#panel .opts'); const q = PS.check.Q[o.dataset.n][o.dataset.phase];
      return click(pol === 'idle' ? '#qSkip' : '[data-q=' + (pol === 'steady' ? q.right : 'a') + ']') && kind; }
    if (kind === 'dialog') return click('[data-act=dlg][data-id=' + P.dialog(s, PS.G.dlgKind) + ']') && kind;
    if (kind === 'settle') return (click('[data-act=left][data-id=' + P.left(s) + ']') || click('[data-act=left]')) && kind;
    if (kind === 'reward') {
      const a = PS.SHOP_AFTER.indexOf(s.mi) >= 0 ? P.shop(s) : null;
      if (a) return click(a.type === 'course' ? '[data-act=course]' : '[data-act=remove][data-id=' + a.id + ']') && kind;
      const id = P.reward(s, PS.G.offers); return click(id ? '[data-act=take][data-id=' + id + ']' : '[data-act=take]:not([data-id])') && kind; }
    if (kind === 'intro') return click('[data-act=go]') && kind;
    return click('#panel button') && kind;
  }
  const a = P.turn(s);
  if (a) { if (a.t >= 0) { const f = document.querySelector('#foes [data-i="' + a.t + '"]'); if (f) f.click(); } click('#hand [data-h="' + a.h + '"]'); return 'card'; }
  click('#btnEnd'); return 'end turn';
}
