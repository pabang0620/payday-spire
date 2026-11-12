/* Payday Spire - the flow of a year: month intro, battle actions, month-end statement, habit card, shop, next month. */
(function () {
  const PS = (window.PS = window.PS || {});
  const $ = (id) => document.getElementById(id);
  const t = (k, p) => PS.t(k, p);
  const C = PS.CONST;
  const E = () => PS.E;
  const ui = () => PS.ui;
  const G = (PS.G = { s: null, phase: 'title', target: 0 });
  const flow = (PS.flow = {});

  const lines = (arr) => '<ul class="lines">' + arr.map((l) => '<li class="' + (l.cls || '') + '">' + t(l.k, l.p) + '</li>').join('') + '</ul>';
  const btn = (act, label, extra) => '<button class="btn ' + ((extra && extra.cls) || '') + '" data-act="' + act + '"' + (extra && extra.id ? ' data-id="' + extra.id + '"' : '') +
    (extra && extra.first ? ' data-first' : '') + (extra && extra.dis ? ' disabled' : '') + '>' + label + '</button>';

  function show(id) {
    ['title', 'battle', 'end'].forEach((x) => { $(x).hidden = x !== id; });
  }

  // opts: the year's goal and level, and whether it is a class code (js/goalui.js opts)
  flow.start = function (code, opts) {
    PS.audio.unlock();
    G.s = E().newGame(code, opts);
    G.s.cls = !!(opts && opts.cls);
    G.past = PS.past ? PS.past.load(PS.runKey(G.s)) : null; // the last run on this code, goal and level in this browser (Past you)
    G.target = 0;
    if (PS.tutor) PS.tutor.begin();
    E().startMonth(G.s);
    flow.intro();
  };

  // ---------- month intro (payday) ----------
  flow.intro = function () {
    const s = G.s, m = s.year[s.mi];
    G.phase = 'intro';
    show('battle');
    ui().hud();
    PS.audio.play('month');
    // a first-time player goes straight to the first battle: month 1 is taught by doing (js/tutor.js)
    if (m.tut && PS.tutor && PS.tutor.on()) return flow.afterIntro();
    const art = PS.art(m.tut ? 'enemy_rent' : m.late ? 'enemy_salary_delay' : null);
    let body = '<h2>' + t('in.t', { n: s.mi + 1 }) + (m.trait ? ' <span class="trait-chip">' + t('trait.' + m.trait) + '</span>' : '') +
      (m.late ? ' <span class="trait-chip late">' + t('trait.late') + '</span>' : '') + '</h2>';
    if (G.note) { body += '<p class="note-line">' + G.note + '</p>'; G.note = ''; }
    if (art) body += '<img class="p-art" src="' + art + '" alt="">';
    // the plain work-stress line is in the status bar already; the problems are on the battle screen
    body += lines(s.log.filter((l) => l.k !== 'pd.mind' && l.k !== 'pd.mindC').map((l) => ({ k: l.k, p: l.p, cls: /^pd\.late/.test(l.k) ? 'warn' : '' })));
    if (m.trait) body += '<p class="trait-d">' + t('trait.' + m.trait + '.d') + '</p>';
    if (s.goal) body += '<p class="goal-line">' + PS.goalui.introLine(s) + '</p>'; // the sinking fund sum for the months left
    body += '<div class="row">' + btn('go', t('btn.startMonth'), { first: true, cls: 'pri' }) + '</div>';
    ui().modal(body, { kind: 'intro', esc: () => flow.afterIntro() });
  };
  flow.afterIntro = function () {
    ui().close();
    const dk = E().dialogFor(G.s);
    if (dk) return flow.dialog(dk);
    flow.battle();
  };

  flow.dialog = function (kind) {
    const s = G.s;
    G.phase = 'dialog';
    const opts = E().DIALOGS[kind].options(s);
    const body = '<h2>' + t('dlg.' + kind + '.t', { l: C.LOAN }) + '</h2>' +
      '<p>' + t('dlg.' + kind + '.b', { a: s.st.dipLoss, f: s.fund, l: C.LOAN }) + '</p><div class="opts">' +
      opts.map((o) => '<button class="opt" data-act="dlg" data-id="' + o.id + '"' + (o.ok ? '' : ' disabled') + '><b>' + t('dlg.' + kind + '.' + o.id) + '</b><span>' +
        t('dlg.' + kind + '.' + o.id + '.n', { l: C.LOAN, fee: C.CASH_ADV_FEE, i: Math.round(C.LOAN * C.CARD_RATE) }) + '</span>' + (o.ok ? '' : '<em>' + t('why.savings') + '</em>') + '</button>').join('') + '</div>';
    ui().modal(body, { kind: 'dialog' });
    G.dlgKind = kind;
  };

  flow.battle = function () {
    G.phase = 'battle';
    show('battle');
    window.scrollTo(0, 0);
    ui().render();
    const h = document.querySelector('#hand .card.glow') || document.querySelector('#hand .card:not(.off)') || $('btnEnd');
    if (h) h.focus({ preventScroll: true });
  };

  // ---------- battle actions ----------
  flow.playCard = function (h) {
    const s = G.s;
    if (G.phase !== 'battle' || !s.hand[h]) return;
    const c = s.hand[h];
    const chk = E().canPlay(s, h);
    if (!chk.ok) { PS.audio.play('no'); ui().note(t('why.' + chk.why), 'warn'); return; }
    const before = { cash: s.cash, debt: s.debt, buffer: s.buffer };
    const r = E().play(s, h, G.target);
    if (!r) return;
    if (PS.tutor) PS.tutor.played(c.id);
    const d = PS.CARDS[c.id];
    PS.audio.play(d.tone === 'debt' ? 'card' : d.tone === 'save' ? 'save' : d.tone === 'joy' ? 'joy' : d.tone === 'calm' ? 'calm' : 'pay');
    // the log line is written by the engine (PS.E.playLog)
    ui().render();
    if (PS.tutor) PS.tutor.show(s, r, before);
    ui().flash('#hud .st-' + (d.tone === 'debt' ? 'debt' : 'cash'), 'pulse');
    ui().say(t(s.log[s.log.length - 1].k, s.log[s.log.length - 1].p));
    if (s.over) return flow.end();
  };

  flow.endTurn = function () {
    const s = G.s;
    if (G.phase !== 'battle') return;
    if (PS.tutor) PS.tutor.done();
    const res = E().endTurn(s);
    res.ev.forEach((e) => s.log.push(e));
    if (res.ev.some((e) => e.k === 'ev.shockCard' || e.k === 'ev.shockBuf')) { PS.audio.play('shock'); ui().flash('#foes', 'shake'); }
    else if (res.ev.some((e) => e.k === 'ev.sale')) PS.audio.play('sale');
    else PS.audio.play('turn');
    if (res.done === 'over') return flow.end();
    if (res.done === 'month') return flow.monthEnd();
    ui().render();
    ui().say(t('a11y.newTurn', { n: s.turn + 1 }) + ' ' + res.ev.map((e) => t(e.k, e.p)).join(' '), true);
    if (document.activeElement === document.body || !document.activeElement) $('btnEnd').focus();
  };

  // ---------- month end: one window for the statement and the leftover cash, then the habit window ----------
  flow.monthEnd = function () {
    const s = G.s;
    G.phase = 'settle';
    G.settleLines = E().closeBills(s);
    if (s.over) return flow.end();
    ui().hud();
    flow.statement();
  };
  // the card statement closes here and is paid during next month (due at the end of turn 2); no payment choice at month end
  // a card statement left short this month is not "every bill handled", even when no other bill is open
  const cardMissed = (s) => s.foes.some((f) => f.kind === 'card' && f.missed);
  flow.statement = function () {
    const s = G.s;
    G.payLines = E().payLines(s);
    let body = '<h2>' + t('st.t', { n: s.mi + 1 }) + '</h2>' + (G.settleLines.length ? lines(G.settleLines) : (cardMissed(s) ? '' : '<p>' + t('st.allPaid') + '</p>')) + lines(G.payLines);
    if (s.cash <= 0) body += '<div class="row">' + btn('left', t(s.mi >= 11 ? 'btn.seeYear' : 'btn.next'), { first: true, cls: 'pri', id: 'save' }) + '</div>';
    else {
      // the options and their sentences come from the rules (js/engine_more.js leftOptions): fill the fund to its goal and
      // save the rest when the cash is more than the fund needs
      const os = E().leftOptions(s);
      const opt = (o) => '<button class="opt' + (o.good ? ' good' : '') + '" data-act="left" data-id="' + o.id + '"' + (o.good ? ' data-first' : '') + '><b>' + t(o.k, o.p) + '</b><span>' + t(o.n, o.np) + '</span></button>';
      body += '<div class="stmt"><h3>' + t('lf.t', { a: s.cash }) + '</h3><div class="opts ' + (os.length > 3 ? 'two' : 'three') + '">' + os.map(opt).join('') + '</div></div>';
    }
    ui().modal(body, { kind: 'settle' });
  };
  flow.finish = function (left) {
    const s = G.s;
    const fin = E().finish(s, left);
    if (s.over) return flow.end();
    ui().hud();
    PS.audio.play(s.debt > 0 ? 'card' : 'save');
    const pl = PS.past ? PS.past.settleLine(s) : null;
    // what the leftover, the fund and the mind did, shown at the top of the next window
    G.closeLines = fin.filter((l) => !/^st\.(toSave|toBuf|spent)$/.test(l.k)).concat(pl ? [pl] : []); // the leftover line repeats the choice just made
    if (s.mi >= 11) { E().nextMonth(s); return flow.end(); }
    // two quick guesses after the first month (skippable), asked again with new numbers at year end
    if (s.mi === 0 && !s.asked && PS.check) { s.asked = true; G.phase = 'check'; return PS.check.ask(s, 'pre', () => flow.reward()); }
    flow.reward();
  };

  // ---------- a habit card; after months 3, 6 and 9 the same window also has the course and the coach (one pick) ----------
  flow.reward = function () {
    const s = G.s;
    G.phase = 'reward';
    const offers = E().rewardOffer(s);
    G.offers = offers;
    const shop = PS.SHOP_AFTER.indexOf(s.mi) >= 0;
    const close = '<div class="close-m"><b>' + t('st.closed', { n: s.mi + 1 }) + '</b>' + ((G.closeLines || []).length ? lines(G.closeLines) : '') +
      '<p class="nw">' + t('st.nw', { a: E().netWorth(s) }) + '</p></div>';
    let body = '<h2>' + t(shop ? 'rw.tShop' : 'rw.t') + '</h2>' + close + '<p>' + t(s.mi === 0 ? 'rw.first' : shop ? 'rw.shop' : 'rw.b') + '</p><div class="cards3">' +
      offers.map((id, k) => '<button class="card tone-' + PS.CARDS[id].tone + '" data-act="take" data-id="' + id + '"' + (k === 0 ? ' data-first' : '') +
        ' aria-label="' + ui().esc(ui().cardLabel(id)) + '">' + ui().cardHTML(id) + '</button>').join('') + '</div>';
    if (shop) {
      const counts = {};
      s.deck.forEach((id) => { counts[id] = (counts[id] || 0) + 1; });
      const can = !s.course && E().spare(s) >= C.COURSE_COST;
      // the same Savings number as the status bar; the fund's part above its goal and the flight money are named apart
      const over = E().fundOver(s), cp = E().coursePayback(s); // how soon the course pays for itself
      const money = t('sh.b', { a: s.savings }) + (over ? ' ' + t('sh.bx', { b: over, g: C.LIVING }) : '') + (s.sink > 0 ? ' ' + t('sh.bs', { a: s.sink }) : '');
      body += '<div class="opts"><button class="opt" data-act="course"' + (can ? '' : ' disabled') + '>' +
        '<b>' + t('sh.course', { a: C.COURSE_COST, r: C.COURSE_RAISE }) + '</b><span>' + t(s.course ? 'sh.owned' : can ? 'sh.course.n' : 'why.savings') + '</span>' +
        (s.course ? '' : '<span class="payback">' + t(cp.key, cp.p) + '</span>') + '<span>' + money + '</span></button></div>' +
        '<h3>' + t('sh.coach') + '</h3><p class="small">' + t('sh.coach.b') + '</p><div class="chips">' +
        Object.keys(counts).filter((id) => id !== 'reminder').map((id) => '<button class="chip" data-act="remove" data-id="' + id + '">' + t('c.' + id) + ' <bdi dir="ltr">×' + counts[id] + '</bdi></button>').join('') + '</div>';
    }
    body += '<div class="row">' + btn('take', t('rw.skip'), { id: '' }) + '</div>';
    ui().modal(body, { kind: 'reward' });
  };
  flow.take = function (id) {
    E().takeReward(G.s, id || null);
    if (id) G.note = t('rw.added', { c: t('c.' + id) });
    flow.next();
  };

  flow.next = function () {
    ui().close();
    if (!E().nextMonth(G.s)) return flow.end();
    G.target = 0;
    flow.intro();
  };

  flow.help = function () {
    const back = G.phase;
    const body = '<h2>' + t('help.t') + '</h2><ol class="tut">' + ['help.1', 'help.2', 'help.3', 'help.4', 'help.5', 'help.6'].map((k) => '<li>' + t(k, { lim: G.s && G.s.limit ? G.s.limit : C.LIMIT }) + '</li>').join('') +
      '</ol><p class="keys">' + t('help.keys') + '</p><div class="row">' + btn('closeHelp', t('btn.close'), { first: true, cls: 'pri' }) + '</div>';
    G.helpBack = back;
    ui().modal(body, { kind: 'help', esc: () => { ui().close(); } });
  };

  flow.end = function () {
    ui().close();
    const s = G.s;
    if (s && !s.reasked && PS.check) { s.reasked = true; G.phase = 'check'; show('battle'); return PS.check.ask(s, 'post', () => flow.end()); }
    G.phase = 'end';
    show('end');
    ui().hud();
    PS.showEnd(G.s);
  };

  // every panel button
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const a = b.dataset.act, id = b.dataset.id;
    if (a === 'go') flow.afterIntro();
    else if (a === 'dlg') {
      E().DIALOGS[G.dlgKind].apply(G.s, id);
      G.s.log.push({ k: 'dlg.' + G.dlgKind + '.' + id + '.n', p: { l: C.LOAN, fee: C.CASH_ADV_FEE, i: Math.round(C.LOAN * C.CARD_RATE) } });
      ui().close();
      if (G.s.over) return flow.end();
      flow.battle();
    } else if (a === 'left') flow.finish(id);
    else if (a === 'take') flow.take(id);
    else if (a === 'course') { E().buyCourse(G.s); G.note = t('sh.bought', { r: C.COURSE_RAISE }); flow.next(); }
    else if (a === 'remove') { E().removeCard(G.s, id); G.note = t('sh.removed', { c: t('c.' + id) }); flow.next(); }
    else if (a === 'closeHelp') ui().close();
  });

  // battle clicks
  document.addEventListener('click', (e) => {
    if (G.phase !== 'battle') return;
    const c = e.target.closest('#hand .card');
    if (c) { flow.playCard(+c.dataset.h); return; }
    const f = e.target.closest('#foes .foe');
    if (f) { G.target = +f.dataset.i; ui().render(); ui().say(t('foe.targetNow', { f: G.s.foes[G.target].id })); }
  });
})();
