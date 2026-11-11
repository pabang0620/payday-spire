/* Payday Spire - month 1 taught by doing, for a first-time player on this device: one glowing card at a time and a one-line
   guide (pay the Agent fee, put the rest on the card, see the card bill it makes next month, end the turn). A second run on
   the same device skips it (?tut=1 forces it, ?tut=0 turns it off). Also: drag a card onto a problem to play it, a short
   "-AED 600" on what a card changed, and the title screen's battle preview. Checked by tools/first_card.py. */
(function () {
  const PS = (window.PS = window.PS || {});
  const $ = (id) => document.getElementById(id);
  const t = (k, p) => PS.t(k, p);
  const KEY = 'paydayspire.tut';
  const T = (PS.tutor = {});
  let on = false, played = false, swiped = false;

  const add = (lang, o) => { PS.STR[lang] = Object.assign(PS.STR[lang] || {}, o); };
  add('en', {
    'tg.pay': 'Tap or drag the glowing card onto the Agent fee.',
    'tg.swipe': 'Keep cash for the Room deposit: put the rest on the card (0 focus).',
    'tg.bill': 'It comes back next month as a card bill. Pay it all by the due date: no fee, no interest.',
    'tg.end': 'End the turn: the Room deposit arrives next.',
    'tg.next': 'Next month', 'tg.ghost': 'Card bill AED {a}, arrives next month',
  });
  add('ar', {
    'tg.pay': 'اضغط على البطاقة المضيئة أو اسحبها إلى عمولة الوسيط.',
    'tg.swipe': 'احتفظ بالنقد لتأمين الغرفة، وادفع الباقي بـ«على البطاقة» (بلا تركيز).',
    'tg.bill': 'يعود هذا المبلغ الشهر القادم في فاتورة البطاقة. سدّدها كاملة فلا رسوم ولا فائدة.',
    'tg.end': 'أنهِ الجولة، فتأمين الغرفة يصل في الجولة التالية.',
    'tg.next': 'الشهر القادم', 'tg.ghost': 'فاتورة البطاقة {a} درهم، تصل الشهر القادم',
  });

  function seen() {
    const q = /[?&]tut=([01])/.exec(location.search);
    if (q) return q[1] === '0';
    try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  }
  function remember() { try { localStorage.setItem(KEY, '1'); } catch (e) { /* storage blocked: the lesson shows again next time */ } }

  T.begin = function () { on = !seen(); played = false; swiped = false; };
  T.on = () => on;
  const playable = (s, id) => s.hand.findIndex((c, h) => c.id === id && PS.E.canPlay(s, h).ok);
  // the step comes from the game state, so any order of play still leads somewhere sensible
  T.step = function () {
    const s = PS.G.s;
    if (!on || !s || s.mi !== 0 || s.turn !== 0 || PS.G.phase !== 'battle') return '';
    if (!played) return 'pay';
    if (!swiped && playable(s, 'swipe') >= 0) return 'swipe';
    return s.debt > 0 ? 'bill' : 'end';
  };
  T.line = () => { const k = T.step(); return k ? t('tg.' + k) : ''; };
  T.played = function (id) { if (!on) return; played = true; if (id === 'swipe') swiped = true; };
  T.done = function () { if (on) remember(); on = false; };

  // after the battle screen is drawn: the one card to play glows, the card bill to come shows in place, End turn glows last
  T.decorate = function () {
    const s = PS.G.s, k = T.step();
    document.body.classList.toggle('tutor', !!k);
    $('btnEnd').classList.toggle('glow', k === 'bill' || k === 'end');
    if (!k) return;
    const h = k === 'pay' ? (playable(s, 'pay') >= 0 ? playable(s, 'pay') : s.hand.findIndex((c, i) => PS.E.canPlay(s, i).ok)) : k === 'swipe' ? playable(s, 'swipe') : -1;
    const el = h >= 0 ? document.querySelector('#hand [data-h="' + h + '"]') : null;
    if (el) el.classList.add('glow');
    if (k === 'bill') {
      const art = PS.art('enemy_card_bill'), a = Math.round(s.debt);
      $('foes').insertAdjacentHTML('beforeend', '<div class="foe ghost k-card" role="note" aria-label="' + PS.ui.esc(PS.plain(t('tg.ghost', { a }))) + '">' +
        '<span class="kind">' + PS.icon('card') + t('kind.card') + '</span>' + (art ? '<span class="foe-art"><img src="' + art + '" alt=""></span>' : '') +
        '<span class="foe-name">' + t('foe.cardbill') + '</span><span class="amt">' + t('aed', { a }) + '</span>' +
        '<span class="intent">' + PS.icon('flag') + '<span>' + t('tg.next') + '</span></span></div>');
    }
  };

  // a short "-AED 600" on what a card changed, gone in 0.8 s. It never covers what the player reads: it tries a few spots
  // near what changed (the portrait or beside the amount on a problem; the free end of a status box or under it) and
  // takes the first one that lies over no amount, name or forecast and stays on the screen; with none free it is left out
  // (the number itself has changed). T.popCovers is what tools/layout_check.py measures at every screen size.
  const KEYS = '#hud .st-v, #hudMonth, #foes .foe-name, #foes .amt, #foes .pull, #foes .minl, #foes .intent, #foeLine, #traitLine > span, #hand .c-name, #hand .c-text, #btnEnd';
  const textRects = (el) => { const r = document.createRange(); r.selectNodeContents(el); return Array.from(r.getClientRects()).filter((q) => q.width > 1 && q.height > 1); };
  T.popCovers = function (p) {
    const r = p.getBoundingClientRect(), hit = [];
    if (r.left < 0 || r.right > innerWidth || r.top < 0 || r.bottom > innerHeight) hit.push('off screen');
    document.querySelectorAll(KEYS).forEach((el) => {
      if (!el.offsetWidth || p.contains(el)) return;
      if (textRects(el).some((q) => r.left < q.right - 1 && q.left < r.right - 1 && r.top < q.bottom - 1 && q.top < r.bottom - 1)) hit.push((el.id || el.className.split(' ')[0]));
    });
    return hit;
  };
  const SPOTS = { hud: ['p-end', 'p-mid', 'p-below'], foe: ['p-art', 'p-amt', 'p-top', 'p-low'] };
  function pop(el, text, cls) {
    if (!el) return null;
    const p = document.createElement('span');
    p.setAttribute('aria-hidden', 'true');
    if (el.closest('#hud')) p.dir = 'ltr'; // a signed number in the status bar reads +500, also in Arabic
    p.innerHTML = text;
    p.style.animation = 'none'; // measured where it stands, then animated
    el.appendChild(p);
    const spots = SPOTS[el.closest('#hud') ? 'hud' : 'foe'];
    const spot = spots.find((sp) => { p.className = 'pop ' + (cls || '') + ' ' + sp; return !T.popCovers(p).length; });
    if (!spot) { p.remove(); return null; }
    p.style.animation = '';
    setTimeout(() => p.remove(), 800);
    return p;
  }
  T.pop = pop;
  T.show = function (s, r, before) {
    if (!r) return;
    const f = r.foe != null ? s.foes.find((x) => x.id === r.foe && !x.gone) : null;
    if (f && r.a) pop(document.querySelector('#foes .foe[data-i="' + f.i + '"]'), '-' + t('aed', { a: r.a }), 'down');
    const dc = Math.round(s.cash - before.cash), dd = Math.round(s.debt - before.debt), db = Math.round(s.buffer - before.buffer);
    if (dc) pop(document.querySelector('#hud .st-cash'), (dc > 0 ? '+' : '-') + PS.num(Math.abs(dc)), dc > 0 ? 'up' : 'down');
    if (dd) pop(document.querySelector('#hud .st-debt'), (dd > 0 ? '+' : '-') + PS.num(Math.abs(dd)), dd > 0 ? 'bad' : 'up');
    if (db) pop(document.querySelector('#hud .st-buffer'), (db > 0 ? '+' : '-') + PS.num(Math.abs(db)), db > 0 ? 'up' : 'down');
  };

  // drag a card up onto a problem (or anywhere above the hand) to play it; a short move is still a tap
  let drag = null, eatClick = false;
  document.addEventListener('pointerdown', (e) => {
    const c = e.target.closest && e.target.closest('#hand .card');
    if (!c || PS.G.phase !== 'battle' || e.button > 0) return;
    drag = { c, x: e.clientX, y: e.clientY, on: false, id: e.pointerId };
  });
  document.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.on && dy < -8 && Math.hypot(dx, dy) > 12) { drag.on = true; drag.c.classList.add('dragging'); }
    if (drag.on) drag.c.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  });
  const drop = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if (!d.on) return;
    eatClick = true; setTimeout(() => { eatClick = false; }, 0);
    d.c.style.transform = ''; d.c.classList.remove('dragging');
    const handTop = $('hand').getBoundingClientRect().top;
    if (e.type === 'pointercancel' || e.clientY > handTop - 30) return;
    d.c.style.visibility = 'hidden';
    const f = document.elementsFromPoint(e.clientX, e.clientY).find((x) => x.matches && x.matches('#foes .foe[data-i]'));
    if (f) PS.G.target = +f.dataset.i;
    PS.flow.playCard(+d.c.dataset.h);
    if (d.c.isConnected) d.c.style.visibility = '';
  };
  document.addEventListener('pointerup', drop);
  document.addEventListener('pointercancel', drop);
  document.addEventListener('click', (e) => { if (eatClick) { eatClick = false; e.stopPropagation(); e.preventDefault(); } }, true);

  // title screen: one money problem and three cards of the first hand, part of the title panel (not over it)
  T.peek = function () {
    const el = $('titlePeek');
    if (!el || !PS.ui) return;
    const art = PS.art('enemy_card_bill');
    el.innerHTML = '<div class="foe k-card">' + '<span class="kind">' + PS.icon('card') + t('kind.card') + '</span>' +
      '<span class="foe-art">' + (art ? '<img src="' + art + '" alt="">' : PS.icon('card')) + '</span>' +
      '<span class="foe-name">' + t('foe.cardbill') + '</span><span class="amt">' + t('aed', { a: 900 }) + '</span></div>' +
      '<div class="peek-hand">' + ['pay', 'swipe', 'wait'].map((id) => '<div class="card tone-' + PS.CARDS[id].tone + '">' + PS.ui.cardHTML(id) + '</div>').join('') + '</div>';
    T.fitPeek();
  };
  // the preview's space budget (css/tutor.css): step through the fit levels until nothing is cut or covered
  const FITS = ['', 'fit1', 'fit1 fit2', 'fit1 fit2 fit3'];
  T.peekProblems = function () {
    const el = $('titlePeek'), bad = [];
    if (!el || !el.offsetWidth) return bad;
    if (el.scrollWidth > el.clientWidth + 1) bad.push('preview wider than its box');
    const boxes = Array.from(el.querySelectorAll('.foe, .card'));
    boxes.forEach((b, i) => {
      const n = b.querySelector('.c-name, .foe-name');
      if (n && (n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1)) bad.push('name ' + i + ' cut');
      if (b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1) bad.push('box ' + i + ' cut');
      const r = b.getBoundingClientRect(), pr = el.getBoundingClientRect();
      if (r.left < pr.left - 1 || r.right > pr.right + 1) bad.push('box ' + i + ' outside the preview');
      boxes.slice(i + 1).forEach((o, j) => { const q = o.getBoundingClientRect(); if (r.left < q.right - 4 && q.left < r.right - 4 && r.top < q.bottom - 4 && q.top < r.bottom - 4) bad.push('box ' + i + ' overlaps box ' + (i + j + 1)); });
    });
    return bad;
  };
  T.fitPeek = function () {
    const el = $('titlePeek');
    if (!el || !el.firstChild || !el.offsetWidth) return;
    for (const f of FITS) {
      el.className = 'peek ' + f;
      if (!T.peekProblems().length) return;
    }
  };
  addEventListener('resize', () => T.fitPeek());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => T.fitPeek());
})();
