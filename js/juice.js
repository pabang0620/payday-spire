/* Payday Spire - how a played card feels: the card flies to what it was aimed at (or to the status bar), the problem it hit
   shakes and its amount flashes, a problem paid off gets a "Paid" stamp as it leaves, and a run of cards in one turn shows
   "Combo ×n" in the focus row with a rising chime. All of it is decoration over the real state, which is already drawn
   (the copies take no clicks, are hidden from screen readers and are gone in half a second). Motion off (settings, or the
   system's reduce motion) leaves only the sounds and their captions. No floating box ever holds information. */
(function () {
  const PS = (window.PS = window.PS || {});
  const $ = (id) => document.getElementById(id);
  const G = PS.G, flow = PS.flow;
  let combo = 0;
  const moving = () => PS.settings.motion !== false && typeof Element !== 'undefined' && !!Element.prototype.animate;

  // a copy of an element as it was, fixed where it was, removed when its animation ends
  function ghost(el, r) {
    const g = el.cloneNode(true);
    g.removeAttribute('id'); g.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id'));
    g.classList.add('fx-ghost'); g.setAttribute('aria-hidden', 'true'); g.tabIndex = -1;
    Object.assign(g.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    ($('battle') || document.body).appendChild(g);
    return g;
  }
  const centre = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  PS.fx = { last: [] }; // the animations of the last play (tools/shots_v15.py pauses them half way for the screenshot)

  function fly(cardEl, cr, toR) {
    const g = ghost(cardEl, cr), a = centre(cr), b = centre(toR);
    const an = g.animate([
      { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: 'translate(' + (b.x - a.x) * 0.55 + 'px, ' + ((b.y - a.y) * 0.55 - 30) + 'px) scale(.8) rotate(-4deg)', opacity: 1, offset: 0.55 },
      { transform: 'translate(' + (b.x - a.x) + 'px, ' + (b.y - a.y) + 'px) scale(.35) rotate(0deg)', opacity: 0 },
    ], { duration: 420, easing: 'cubic-bezier(.3,.7,.4,1)' });
    an.onfinish = an.oncancel = () => g.remove();
    PS.fx.last.push(an);
  }
  function stamp(foeEl, fr) {
    const g = ghost(foeEl, fr);
    const s = document.createElement('span'); s.className = 'fx-stamp'; s.textContent = PS.plain(PS.t('fx.paid'));
    g.appendChild(s);
    const an = g.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.06)', opacity: 1, offset: 0.35 }, { transform: 'scale(.9)', opacity: 0 }],
      { duration: 620, easing: 'ease-out' });
    an.onfinish = an.oncancel = () => g.remove();
    PS.fx.last.push(an);
  }
  function hit(i) {
    const el = document.querySelector('#foes .foe[data-i="' + i + '"]');
    if (!el) return;
    PS.fx.last.push(el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }],
      { duration: 300, delay: 260 }));
    const amt = el.querySelector('.amt, .pull');
    if (amt) PS.fx.last.push(amt.animate([{ color: 'inherit', transform: 'scale(1)' }, { color: '#D55E00', transform: 'scale(1.18)' }, { color: 'inherit', transform: 'scale(1)' }], { duration: 420, delay: 260 }));
  }
  function showCombo() {
    const box = $('focusBox');
    if (!box) return;
    box.querySelectorAll('.combo').forEach((x) => x.remove());
    if (combo < 2) return;
    const c = document.createElement('span'); c.className = 'combo'; c.textContent = PS.plain(PS.t('fx.combo', { n: combo }));
    box.appendChild(c);
    if (moving()) PS.fx.last.push(c.animate([{ transform: 'scale(1.5)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 260, easing: 'ease-out' }));
  }

  const play0 = flow.playCard;
  flow.playCard = function (h) {
    const s = G.s;
    if (G.phase !== 'battle' || !s || !s.hand[h]) return play0(h);
    const cardEl = document.querySelector('#hand .card[data-h="' + h + '"]'), cr = cardEl && cardEl.getBoundingClientRect();
    const foes = {};
    document.querySelectorAll('#foes .foe[data-i]').forEach((el) => { foes[el.dataset.i] = { el, r: el.getBoundingClientRect() }; });
    const alive0 = PS.E.alive(s).map((f) => f.i), n0 = s.log.length, id = s.hand[h].id;
    play0(h);
    if (s.log.length === n0 || G.phase !== 'battle') return; // not played, or the year ended
    const line = s.log[n0], fid = line && line.p && line.p.f, foe = fid ? s.foes.find((f) => f.id === fid) : null;
    const gone = alive0.filter((i) => !PS.E.alive(s).some((f) => f.i === i));
    combo += foe ? 1 : 0;
    PS.fx.last = [];
    if (moving() && cardEl && cr && cr.width) {
      const to = foe && foes[foe.i] ? foes[foe.i].r : ($('hudStats').querySelector('.st-' + (PS.CARDS[id].jar ? 'goal' : PS.CARDS[id].tone === 'save' ? 'buffer' : 'cash')) || $('hudStats')).getBoundingClientRect();
      fly(cardEl, cr, to);
      gone.forEach((i) => { if (foes[i]) stamp(foes[i].el, foes[i].r); });
      if (foe && gone.indexOf(foe.i) < 0) hit(foe.i);
    }
    showCombo();
    PS.fx.n = combo;
    if (gone.length) PS.audio.play('clear'); else if (combo >= 2) PS.audio.play('combo');
  };
  const end0 = flow.endTurn;
  flow.endTurn = function () { combo = 0; return end0.apply(this, arguments); };
  const intro0 = flow.intro;
  flow.intro = function () { combo = 0; return intro0.apply(this, arguments); };
  // the combo stays in the focus row after the hand is drawn again (a target picked, a language changed)
  const render0 = PS.ui.render;
  PS.ui.render = function () { render0.apply(this, arguments); if (G.phase === 'battle' && combo >= 2 && !document.querySelector('#focusBox .combo')) showCombo(); };
})();
