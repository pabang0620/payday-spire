/* Payday Spire - the battle screen: status bar, money problems, hand of cards, dialogs, keys. */
(function () {
  const PS = (window.PS = window.PS || {});
  const $ = (id) => document.getElementById(id);
  const t = (k, p) => PS.t(k, p);
  const C = PS.CONST;
  const ui = (PS.ui = {});

  ui.esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- status bar ----------
  // space budget (css/battle.css): each money chip carries its amount three ways, "AED 2,900", "2,900" and "2.9k"; fitStats
  // picks the first step at which every chip fits its box: 1 short labels, 2 icon and amount only, 3 amount without the
  // currency, 4 short amount, 5 no icon, 6 smaller figures. The full label and amount stay for screen readers at every step.
  const kNum = (a) => { const v = Math.abs(a) < 1000 ? String(Math.round(a)) : Math.abs(a) < 9950 ? (a / 1000).toFixed(1).replace(/\.0$/, '') : String(Math.round(a / 1000));
    return Math.abs(a) < 1000 ? PS.num(a) : t('hud.k', { a: '<bdi dir="ltr">' + v + '</bdi>' }); };
  ui.money = (a, full) => '<span class="v-f">' + (full || t('aed', { a })) + '</span><span class="v-n" aria-hidden="true">' + PS.num(a) +
    '</span><span class="v-k" aria-hidden="true">' + kNum(a) + '</span>';
  function stat(key, icon, val, extra) {
    // a short label for narrow screens where there is one (CSS shows one of the two)
    const sk = 'hud.' + key + 'S', short = PS.STR.en[sk] ? '<span class="st-ls" aria-hidden="true">' + t(sk) + '</span>' : '';
    return '<div class="st st-' + key + '"><span class="st-i">' + PS.icon(icon) + '</span><span class="st-l">' + (short ? '<span class="st-lf">' + t('hud.' + key) + '</span>' + short : t('hud.' + key)) +
      '</span><span class="st-v">' + val + '</span>' + (extra || '') + '</div>';
  }
  ui.stat = stat; // the goal chip (js/goalui.js) is drawn the same way
  const FIT_STEPS = 6;
  ui.fitStats = function () {
    const row = $('hudStats');
    if (!row || $('hud').hidden) return;
    const chips = Array.from(row.querySelectorAll('.st'));
    const over = (el) => el && el.offsetWidth > 1 && (el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight + 1);
    const fits = () => chips.every((c) => !over(c.querySelector('.st-v')) && !over(c.querySelector('.st-l')) && c.scrollWidth <= c.clientWidth);
    for (let i = 1; i <= FIT_STEPS; i++) row.classList.remove('f' + i);
    for (let i = 1; i <= FIT_STEPS && !fits(); i++) row.classList.add('f' + i);
  };
  ui.hud = function () {
    const s = PS.G.s;
    if (!s) { $('hud').hidden = true; return; }
    $('hud').hidden = false;
    const mi = Math.min(s.mi, 11), m = s.year[mi];
    const lim = s.limit || C.LIMIT, debtPct = Math.min(100, Math.round((s.debt / lim) * 100));
    $('hudMonth').innerHTML = '<b>' + t('hud.month', { n: mi + 1 }) + '</b>' + (m.trait ? ' <span class="trait-chip">' + t('trait.' + m.trait) + '</span>' : '') +
      (m.late && s.payLater ? ' <span class="trait-chip late">' + t('trait.late') + '</span>' : '') +
      (PS.G.phase === 'battle' ? ' <span class="turn-chip">' + t('hud.turn', { n: s.turn + 1 }) + '</span>' : '') + (PS.brand ? PS.brand.hudHTML() : '');
    // the month line is one row whatever the month brings: month tags shorten, then step aside (m1), then the line's text
    // gets smaller (m2), so the turn and the buttons never move to another row (css/class.css, tools/layout_check.py)
    const ml = $('hudMonth');
    ml.classList.remove('m1', 'm2');
    if (ml.scrollWidth > ml.clientWidth + 1) ml.classList.add('m1');
    if (ml.scrollWidth > ml.clientWidth + 1) ml.classList.add('m2');
    const pastChip = PS.past ? PS.past.hudHTML(s) : '';
    const goalChip = PS.goalui ? PS.goalui.hudHTML(s) : '', nChips = 5 + !!pastChip + !!goalChip;
    $('hudStats').classList.toggle('six', nChips === 6); $('hudStats').classList.toggle('seven', nChips === 7);
    $('hudStats').innerHTML =
      stat('cash', 'coin', ui.money(s.cash)) +
      stat('buffer', 'shield', ui.money(s.buffer)) +
      stat('savings', 'save', ui.money(s.savings)) + // the same Savings as the shop window; flight money shows in the flight tip
      stat('debt', 'card', ui.money(Math.round(s.debt)), '<span class="bar" role="img" aria-label="' + PS.plain(t('hud.limitOf', { a: Math.round(s.debt), b: lim })) +
        '"><i style="width:' + debtPct + '%"></i></span>') +
      stat('mind', 'heart', '<bdi dir="ltr">' + s.mind + '/' + C.MIND_MAX + '</bdi>') + goalChip + pastChip;
    ui.fitStats();
  };

  // ---------- money problems ----------
  function intent(s, f) {
    const d = PS.FOES[f.id];
    if (f.kind === 'bill') return d.grow ? ['bolt', t('in.grow', { a: d.grow })] : ['flag', t('in.due', { fee: C.BILL_LATE })];
    if (f.kind === 'shock') return ['bolt', t(d.hit === s.turn ? 'in.hitNow' : 'in.hit', { n: d.hit + 1, a: f.amt })];
    if (f.kind === 'deal') return ['key', t('in.deal', { a: f.amt })];
    // after a card bill not paid in full there is no interest-free period: the forecast says the interest comes either way
    if (f.kind === 'card') { const i = Math.round(f.max * C.CARD_RATE); return ['flag', t((s.turn === C.CARD_DUE_TURN ? 'in.cardNow' : 'in.card') + (s.noGrace && i > 0 ? '.ng' : ''), { a: f.max, i, m: f.min, fee: C.CARD_LATE })]; }
    const last = s.turn >= C.TURNS - 1;
    return ['bag', last ? t('in.saleLast') : t('in.sale', { n: d.adds }) + (d.mind ? '. ' + t('in.mind', { m: d.mind }) : '')];
  }
  function foeHTML(s, f) {
    const d = PS.FOES[f.id];
    const art = PS.art(f.overdue && !d.art ? 'enemy_late_fee' : d.art); // an overdue bill with no portrait shows the late-fee stamp
    const sel = PS.G.target === f.i;
    const pic = art ? '<img src="' + art + '" alt="">' : '<span class="foe-ic">' + PS.icon(d.icon) + '</span>';
    let amt;
    if (f.kind === 'sale') {
      amt = '<span class="pull">' + t('foe.pull') + ' <b><bdi dir="ltr">' + f.pull + '</bdi></b></span><span class="pips">' +
        Array.from({ length: d.pull }, (_, k) => '<i class="' + (k < f.pull ? 'on' : '') + '"></i>').join('') + '</span>';
    } else if (f.kind === 'card') {
      amt = '<span class="amt">' + t('aed', { a: f.amt }) + '</span><span class="minl">' + t('foe.min', { a: f.min }) + '</span><span class="bar"><i style="width:' + Math.round((f.amt / Math.max(1, f.max)) * 100) + '%"></i></span>';
    } else if (f.kind === 'deal') {
      amt = '<span class="amt">' + t('foe.perMonth', { a: f.amt }) + '</span>';
    } else {
      amt = '<span class="amt">' + t('aed', { a: f.amt }) + '</span>' + (d.refund ? '<span class="minl">' + t('in.refund') + '</span>' : '') +
        '<span class="bar"><i style="width:' + Math.round((f.amt / Math.max(1, f.max)) * 100) + '%"></i></span>';
    }
    const it = intent(s, f);
    const label = PS.plain([t('foe.' + f.id), t('kind.' + f.kind), f.overdue ? t('foe.overdueTag') : '', amt, it[1], sel ? t('foe.targeted') : t('foe.pick')].filter(Boolean).join('. '));
    return '<button class="foe k-' + f.kind + (sel ? ' sel' : '') + (d.boss ? ' boss' : '') + '" data-i="' + f.i + '" aria-pressed="' + sel + '" aria-label="' + ui.esc(label) + '">' +
      '<span class="kind">' + PS.icon(f.kind === 'sale' ? 'bag' : f.kind === 'shock' ? 'bolt' : f.kind === 'deal' ? 'key' : f.kind === 'card' ? 'card' : 'bill') + t('kind.' + f.kind) +
      (f.overdue ? ' | ' + t('foe.overdueTag') : '') + '</span>' +
      '<span class="foe-art">' + pic + '</span>' +
      '<span class="foe-name">' + t('foe.' + f.id) + '</span>' + amt +
      '<span class="intent">' + PS.icon(it[0]) + '<span>' + it[1] + '</span></span>' +
      (sel ? '<span class="tgt">' + t('foe.target') + '</span>' : '') + '</button>';
  }
  // a bill that arrives later this month: shown in its place, greyed, with the turn it comes (it cannot be aimed at yet)
  // (.later: two or more turns away, the first thing to step aside on a small, large-text screen: fz6)
  function comingHTML(f) {
    const d = PS.FOES[f.id];
    return '<div class="foe coming k-' + f.kind + (f.at > PS.G.s.turn + 1 ? ' later' : '') + '" role="note" aria-label="' + ui.esc(PS.plain(t('foe.coming', { f: f.id, n: f.at + 1, a: f.amt }))) + '">' +
      '<span class="kind">' + PS.icon('bill') + t('kind.' + f.kind) + '</span><span class="foe-name">' + t('foe.' + f.id) + '</span>' +
      '<span class="amt">' + t('aed', { a: f.amt }) + '</span><span class="intent">' + PS.icon('flag') + '<span class="in-l">' + t('in.coming', { n: f.at + 1 }) + '</span><span class="in-s">' + t('in.comingS', { n: f.at + 1 }) + '</span></span>' +
      (d.refund ? '<span class="minl">' + t('in.refund') + '</span>' : '') + '</div>';
  }
  ui.foes = function () {
    const s = PS.G.s;
    const list = PS.E.alive(s), later = PS.E.coming(s);
    if (list.length && !list.some((f) => f.i === PS.G.target)) PS.G.target = list[0].i;
    const cl = PS.E.clearLine(s);
    // a card keeps its forecast to two or three lines (css/battle.css); the target's whole forecast is always in the line
    // under the cards, which stays in view while the cards scroll (tools/layout_check.py checks both)
    const tf = list.find((f) => f.i === PS.G.target), it = tf ? intent(s, tf) : null; // with its name and amount
    $('foes').innerHTML = (cl ? '<p class="clear">' + t(cl.k, cl.p) + '</p>' : list.map((f) => foeHTML(s, f)).join('')) + later.map(comingHTML).join('');
    // the line is its own row under the problems area (not over it), so it never covers a problem card (layout_check.py)
    const line = $('foeLine');
    line.innerHTML = it ? PS.icon(it[0]) + '<span><b>' + t('foe.' + tf.id) + (tf.kind === 'sale' ? '' : ' ' + t(tf.kind === 'deal' ? 'foe.perMonth' : 'aed', { a: tf.amt })) + ':</b> <span class="fl-t">' + it[1] + '</span></span>' : '';
    line.hidden = !it;
  };

  // ---------- hand ----------
  ui.cardP = (id) => Object.assign({ b: PS.G && PS.G.s ? PS.G.s.buffer : 0, fee: C.CASH_ADV_FEE, i: Math.round((PS.CARDS[id].amt || 0) * C.CARD_RATE), q: (PS.CARDS[id].amt || 0) / 4, pct: Math.round((PS.CARDS[id].pct || 0) * 100) }, PS.CARDS[id], { pct: Math.round((PS.CARDS[id].pct || 0) * 100) });
  // month 1 is practice: putting a bill on the card does not add an Impulse buy yet
  ui.cardKey = (id) => 'c.' + id + '.d' + (id === 'swipe' && PS.G.s && PS.G.s.mi === 0 ? '0' : '');
  ui.cardHTML = function (id, opts) {
    const d = PS.CARDS[id];
    const o = opts || {};
    const cost = d.cost === null ? '-' : d.cost;
    return '<span class="c-top"><span class="cost" aria-hidden="true">' + PS.icon('focus') + '<bdi dir="ltr">' + cost + '</bdi></span>' +
      (o.key ? '<kbd>' + o.key + '</kbd>' : '') + '</span>' +
      '<span class="c-ic">' + PS.icon(d.icon) + '</span>' +
      '<span class="c-name">' + t('c.' + id) + '</span>' +
      '<span class="c-text">' + t(ui.cardKey(id), ui.cardP(id)) + '</span>' +
      (o.why ? '<span class="c-why">' + t('why.' + o.why) + '</span>' : '');
  };
  ui.cardLabel = function (id, key, why) {
    const d = PS.CARDS[id];
    return PS.plain([key ? t('a11y.key', { k: key }) : '', t('c.' + id), d.cost === null ? t('a11y.noplay') : t('a11y.cost', { n: d.cost }), t(ui.cardKey(id), ui.cardP(id)), why ? t('why.' + why) : ''].filter(Boolean).join('. '));
  };
  ui.hand = function () {
    const s = PS.G.s;
    $('hand').innerHTML = s.hand.map((c, h) => {
      const chk = PS.E.canPlay(s, h);
      const why = chk.ok ? '' : chk.why;
      const k = h < 9 ? String(h + 1) : '';
      return '<button class="card tone-' + PS.CARDS[c.id].tone + (chk.ok ? '' : ' off') + (PS.CARDS[c.id].curse ? ' curse' : '') + '" data-h="' + h + '"' +
        (chk.ok ? '' : ' aria-disabled="true"') + ' aria-label="' + ui.esc(ui.cardLabel(c.id, k, why)) + '">' + ui.cardHTML(c.id, { key: k, why }) + '</button>';
    }).join('');
    $('focusBox').innerHTML = '<span class="f-l">' + t('hud.focus') + '</span><span class="pipsF" role="img" aria-label="' + ui.esc(PS.plain(t('a11y.focus', { n: s.focus, m: C.FOCUS }))) + '">' +
      Array.from({ length: C.FOCUS }, (_, k) => '<i class="' + (k < s.focus ? 'on' : '') + '">' + PS.icon('focus') + '</i>').join('') + '</span>' +
      '<span class="piles">' + t('hud.piles', { a: s.draw.length, b: s.discard.length }) + '</span>';
    $('btnEnd').innerHTML = t(s.turn >= C.TURNS - 1 ? 'btn.endMonth' : 'btn.end') + ' <kbd>E</kbd>';
  };

  ui.log = function () {
    const s = PS.G.s;
    $('log').innerHTML = s.log.slice(-4).map((l) => '<li>' + t(l.k, l.p) + '</li>').join('');
    $('log').scrollTop = $('log').scrollHeight; // on a small screen the log shows its newest lines
  };

  ui.trait = function () {
    const s = PS.G.s;
    const m = s.year[s.mi];
    const el = $('traitLine');
    const tips = [];
    const guide = PS.tutor ? PS.tutor.line() : '';
    if (guide) tips.push(guide);
    if (s.payLater) tips.push(t('tr.late', { n: C.LATE_TURN + 1, a: s.payLater }));
    const sh = PS.E.alive(s).find((f) => f.kind === 'shock');
    if (sh) tips.push(t('tr.shock', { n: PS.FOES[sh.id].hit + 1 }));
    if (m.trait) tips.push(['tr-d', t('trait.' + m.trait + '.d')]);
    if ((s.mi >= 3 || s.sink > 0) && s.mi < PS.FLIGHT_MONTH) { const n = PS.FLIGHT_MONTH - s.mi; tips.push(t('tr.flight', { n, a: PS.FOES.flight.amt, b: s.sink })); }
    if (s.peek && s.mi < 11) tips.push(t('tr.peek', { list: s.year[s.mi + 1].foes.map((f) => t('foe.' + f)).join(', ') }));
    el.innerHTML = tips.map((x) => (Array.isArray(x) ? '<span class="' + x[0] + '">' + x[1] : '<span>' + x) + '</span>').join('');
    el.hidden = !tips.length;
  };

  ui.render = function () {
    const s = PS.G.s;
    ui.hud();
    if (!s || PS.G.phase !== 'battle') return;
    const keep = document.activeElement && document.activeElement.closest && document.activeElement.closest('#battle') ? document.activeElement : null;
    const keepSel = keep ? (keep.dataset.h != null ? '[data-h="' + Math.min(+keep.dataset.h, Math.max(0, s.hand.length - 1)) + '"]' : keep.dataset.i != null ? '[data-i="' + keep.dataset.i + '"]' : keep.id ? '#' + keep.id : null) : null;
    ui.trait(); ui.foes(); ui.hand(); ui.log();
    if (PS.tutor) PS.tutor.decorate();
    ui.ltrSigns($('battle'));
    ui.fitBattle();
    if (keepSel) { const el = document.querySelector('#battle ' + keepSel) || $('btnEnd'); if (el) el.focus({ preventScroll: true }); }
  };

  // ---------- Arabic: a signed number reads -600, +500, -20% (sign on the left), the same as the status bar notes ----------
  // The text keeps its words; only a sign right before a number joins the number's left-to-right <bdi>, and a sign with
  // literal digits gets one. Ranges like 1-2 and words like "-up" are left alone. Checked by tools/rtl.js (layout_check.py).
  const SIGNED = /(^|[^0-9A-Za-z\u0600-\u06FF%])([+\-\u2212]\d[\d,.]*%?)/;
  ui.ltrSigns = function (root) {
    if (PS.lang !== 'ar' || !root) return;
    root.querySelectorAll('bdi[dir="ltr"]').forEach((b) => {
      const prev = b.previousSibling, next = b.nextSibling;
      const m = prev && prev.nodeType === 3 && /(^|[^0-9A-Za-z\u0600-\u06FF%])([+\-\u2212])$/.exec(prev.data);
      if (!m || !/^\d/.test(b.textContent)) return;
      prev.data = prev.data.slice(0, -1);
      b.textContent = m[2] + b.textContent;
      if (next && next.nodeType === 3 && next.data[0] === '%') { next.data = next.data.slice(1); b.textContent += '%'; }
    });
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), found = [];
    for (let n = w.nextNode(); n; n = w.nextNode()) if (SIGNED.test(n.data) && !n.parentElement.closest('bdi, script, style, textarea')) found.push(n);
    found.forEach((n) => {
      let m;
      while ((m = SIGNED.exec(n.data))) {
        const at = m.index + m[1].length, rest = n.splitText(at), after = rest.splitText(m[2].length);
        const b = document.createElement('bdi'); b.dir = 'ltr'; b.textContent = m[2];
        rest.replaceWith(b); n = after;
      }
    });
  };

  // ---------- toasts and live regions ----------
  let sayT = 0;
  ui.say = function (text, loud) {
    const el = $(loud ? 'srA' : 'srP');
    clearTimeout(sayT);
    el.textContent = '';
    sayT = setTimeout(() => { el.textContent = PS.plain(text); }, 50);
  };
  // short notes ("Not enough focus", "Result copied") go in a line of their own in the layout, never over the game:
  // the open window, the battle controls or the end screen
  let noteT = 0;
  ui.note = function (html, kind) {
    const top = document.activeElement && document.activeElement.id === 'btnCopyTop'; // the copy button at the top of the end screen
    const el = ui.isOpen() ? $('noteM') : !$('battle').hidden ? $('note') : top ? $('endNoteTop') : $('endNote');
    if (el) {
      el.innerHTML = html;
      el.className = 'note-slot on ' + (kind || '');
      clearTimeout(noteT);
      noteT = setTimeout(() => { el.className = 'note-slot'; }, 3000);
    }
    ui.say(html, kind === 'warn');
  };
  ui.flash = function (sel, cls) {
    if (PS.settings.motion === false) return;
    const el = document.querySelector(sel);
    if (!el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  };

  // ---------- dialogs: named by their heading, Tab stays inside, focus goes back on close ----------
  let back = null, onEsc = null;
  ui.modal = function (html, opt) {
    const m = $('modal');
    if (m.hidden && document.activeElement && !m.contains(document.activeElement)) back = document.activeElement;
    $('panel').innerHTML = html + '<p class="note-slot" id="noteM"></p><p class="cap-slot" id="capM" aria-hidden="true"></p>';
    $('panel').dataset.kind = (opt && opt.kind) || '';
    ui.ltrSigns($('panel'));
    m.hidden = false;
    onEsc = (opt && opt.esc) || null;
    const h = $('panel').querySelector('h2');
    if ($('note')) $('note').className = 'note-slot';
    if (h) { h.id = 'panelT'; m.setAttribute('aria-labelledby', 'panelT'); } else m.removeAttribute('aria-labelledby');
    const dsc = $('panel').querySelector('h2 + p, h2 + ul, h2 + ol');
    if (dsc) { dsc.id = dsc.id || 'panelD'; m.setAttribute('aria-describedby', dsc.id); } else m.removeAttribute('aria-describedby');
    const f = $('panel').querySelector('[data-first]:not([disabled])') || $('panel').querySelector('button:not([disabled])');
    $('panel').scrollTop = 0;
    if (f) f.focus({ preventScroll: true });
    ui.say(PS.plain(html).slice(0, 400));
  };
  ui.close = function () {
    $('modal').hidden = true;
    $('panel').innerHTML = '';
    onEsc = null;
    const el = back; back = null;
    if (el && el.isConnected && el.offsetParent !== null) el.focus({ preventScroll: true });
  };
  ui.isOpen = () => !$('modal').hidden;

  document.addEventListener('keydown', (e) => {
    if (ui.isOpen()) {
      if (e.key === 'Tab') {
        const f = Array.from($('panel').querySelectorAll('button:not([disabled]), input, select, textarea, a[href]')).filter((x) => x.offsetParent !== null);
        if (!f.length) return;
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { f[f.length - 1].focus(); e.preventDefault(); }
        else if (!e.shiftKey && (i < 0 || i === f.length - 1)) { f[0].focus(); e.preventDefault(); }
      } else if (e.key === 'Escape') {
        if (onEsc) onEsc(); else ui.say(t('a11y.choose'), true);
      }
      return;
    }
    if (!PS.G.s || PS.G.phase !== 'battle' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (/^[1-9]$/.test(k)) { e.preventDefault(); PS.flow.playCard(+k - 1); }
    else if (k === 'e') { e.preventDefault(); PS.flow.endTurn(); }
    else if (k === 't' || k === 'arrowright' || k === 'arrowleft') {
      const list = PS.E.alive(PS.G.s);
      if (!list.length) return;
      e.preventDefault();
      const dir = (k === 'arrowleft') !== (PS.lang === 'ar') ? -1 : 1;
      const i = list.findIndex((f) => f.i === PS.G.target);
      PS.G.target = list[(i + dir + list.length) % list.length].i;
      ui.render();
      ui.say(t('foe.targetNow', { f: PS.G.target != null ? list.find((f) => f.i === PS.G.target).id : '' }));
    } else if (k === 'h' || k === '?') { e.preventDefault(); PS.flow.help(); }
  });
  // space budget of the battle screen (css/battle.css): the hand row may use at most a share of the battle's height. When
  // its cards come out taller (large text, Arabic, a short screen), they get wider step by step (fewer side by side, the row
  // scrolls sideways), then their text gets smaller, until the row fits. Checked by tools/layout_check.py
  const WIDER = [1, 1.25, 1.55, 1.9];
  ui.fitHand = function (share) {
    const b = $('battle'), h = $('hand');
    if (!b || b.hidden || !h.firstElementChild) return;
    h.style.removeProperty('--cw'); h.classList.remove('small1', 'small2');
    const base = h.firstElementChild.getBoundingClientRect().width, room = b.clientHeight * (share || 0.42), maxW = h.clientWidth * 0.86;
    if (h.offsetHeight <= room) return;
    for (const f of WIDER.slice(1)) {
      h.style.setProperty('--cw', Math.min(maxW, base * f) + 'px');
      if (h.offsetHeight <= room || base * f >= maxW) break;
    }
    if (h.offsetHeight > room) h.classList.add('small1');
    if (h.offsetHeight > room) h.classList.add('small2');
  };
  // what a reader must see of each money problem without scrolling: the whole card (its name, its amount or pull, its
  // forecast lines) inside the problems area, nothing cut. Returns what is cut or outside the area (empty when all of it is
  // in view). Also used by tools/layout_check.py at every screen x text size x language.
  ui.foeProblems = function () {
    const area = $('foes'), bad = [];
    if (!area || !area.offsetHeight) return bad;
    const ar = area.getBoundingClientRect();
    area.querySelectorAll('.foe').forEach((f, i) => {
      if (area.classList.contains('fz6') && f.classList.contains('later')) return; // stepped aside until the turn before it arrives
      const r = f.getBoundingClientRect();
      if (f.scrollHeight > f.clientHeight + 2) bad.push('problem ' + (i + 1) + ' text spills out of its card');
      if (r.top < ar.top - 1 || r.bottom > ar.bottom + 1) bad.push('problem ' + (i + 1) + ' outside the problems area (' + Math.round(r.bottom - ar.bottom) + ' px)');
      f.querySelectorAll('.foe-name, .amt, .pull, .minl').forEach((el) => {
        if (el.offsetHeight && (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2)) bad.push('problem ' + (i + 1) + ' ' + el.className.split(' ')[0] + ' cut');
      });
    });
    return bad;
  };
  // the problems area's own budget: when the cards are not all whole in view, first give the hand less height (its cards
  // get wider and the row scrolls sideways), then step through fz1 (portrait in the card's corner), fz2 (one strip per
  // problem: name and amount on one row, then the forecast), fz3 (smaller strips), fz4 (forecasts only in the line under
  // the cards), fz5 (the tips line steps aside, not the month 1 guide). Whatever still does not fit scrolls, with a fade
  // at the bottom of the area as the cue (.more), fz6 (a bill two or more turns away steps aside; it is shown
  // from the turn before it arrives: month 1 on a 360x640 phone with large text).
  const FOE_FITS = ['', 'fz1', 'fz1 fz2', 'fz1 fz2 fz3', 'fz1 fz2 fz3 fz4', 'fz1 fz2 fz3 fz4 fz5', 'fz1 fz2 fz3 fz4 fz5 fz6'], HAND_SHARES = [0.42, 0.36, 0.3];
  ui.fitBattle = function () {
    const b = $('battle'), area = $('foes');
    if (!b || b.hidden || !area) return;
    area.scrollTop = 0;
    fit: for (let i = 0; i < FOE_FITS.length; i++) {
      area.className = 'foes ' + FOE_FITS[i];
      for (const share of i < 4 ? HAND_SHARES : HAND_SHARES.slice(-1)) {
        ui.fitHand(share);
        if (!ui.foeProblems().length) break fit;
      }
    }
    area.classList.toggle('more', area.scrollHeight > area.clientHeight + 2);
  };
  // the budget needs the status bar's height
  if (typeof ResizeObserver !== 'undefined') {
    const hud = $('hud'), set = () => { document.documentElement.style.setProperty('--hud-h', hud.offsetHeight + 'px'); ui.fitBattle(); };
    new ResizeObserver(set).observe(hud); set();
    new ResizeObserver(() => ui.fitBattle()).observe($('battle'));
    addEventListener('resize', () => { ui.fitStats(); ui.fitBattle(); });
  }
})();
