/* Payday Spire - for classes: the grade, the result card (key numbers, copy as text), the result code a student sends to the
   teacher dashboard (teacher.html), and printable discussion cards from this run. Pure functions plus a few DOM helpers;
   nothing leaves the device (no server, no names, no storage). Loads in node too (tools/sample_class.js). */
(function () {
  const PS = (window.PS = window.PS || {});
  const t = (k, p) => PS.t(k, p);
  const C = () => PS.CONST;
  const $ = (id) => document.getElementById(id);
  PS.cls = {};

  // steady: no card debt, no overdue bills, a month of costs in the emergency fund and no burnout (money made by wearing
  // yourself out is not a steady year); frozen: the card passed its limit
  // what kept a finished year from being steady, in the words of the grade line (one list for the grade and its sentence,
  // so the sentence never names a reason the year did not have: tools/regress_screen.js G4)
  // a card statement left short at any point in the year also rules out a steady year
  PS.gradeMiss = function (s) {
    const out = [];
    if (s.debt > 0) out.push(['debt']);
    if (s.overdue.length) out.push(['overdue', s.overdue.length]);
    if (s.st.missed) out.push(['missed', s.st.missed]);
    if (s.buffer < C().LIVING) out.push(['fund']);
    if (s.st.burnouts) out.push(['burnout', s.st.burnouts]);
    return out;
  };
  PS.grade = function (s) {
    if (s.over === 'limit') return 'frozen';
    return PS.gradeMiss(s).length ? 'made' : 'steady';
  };
  // the sentence under the grade: for "You made it" it names each reason this year had
  PS.gradeLine = function (s) {
    const g = PS.grade(s);
    if (g !== 'made') return t('grade.' + g + '.d', { m: s.st.overMonth + 1, lim: C().LIMIT });
    const parts = PS.gradeMiss(s).map((x) => t('gm.' + x[0], { n: x[1] || 1 }));
    const and = t('gm.and'), list = parts.length === 1 ? parts[0] : parts.slice(0, -1).join(t('gm.comma')) + and + parts[parts.length - 1];
    return t('grade.made.d', { r: list });
  };

  // ---------- result code ----------
  // PS2-<class code>-<30 chars in 6 groups>: 28 chars of packed numbers + 2 check chars. No names, no device data.
  // PS2 adds the year's goal, its level, whether the goal jar was full and what it held. PS1 codes (no goal, no level:
  // 23 chars + 2) from older copies of the game still read, with goal and level left empty (tools/regress.js C3).
  // Same letters as class codes (no I, O, 0, 1). The check catches any one wrong letter and two swapped letters.
  const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const GRADES = ['steady', 'made', 'frozen'];
  const ANS = ['', 'a', 'b', 'c']; // quick guesses: '' = skipped
  const GOALS = ['', 'home', 'studio', 'gold']; // '' = a run without a goal
  // [name, bits, offset]: values are clamped into range (overdue counts each month a bill stays unpaid, up to 63)
  const LAYOUT1 = [['grade', 2], ['q1', 2], ['q2', 2], ['r1', 2], ['r2', 2], ['net', 17, 65536], ['debt', 14], ['buf10', 7],
    ['fees', 14], ['imp', 13], ['given', 11], ['overdue', 6], ['missed', 4], ['endm', 4], ['flags', 7], ['rid', 8]]; // 115 bits = 23 chars
  const VERS = {
    PS1: { layout: LAYOUT1, chars: 23 },
    PS2: { layout: LAYOUT1.concat([['goal', 2], ['lv', 2], ['reached', 1], ['pot', 14], ['spare', 6]]), chars: 28 }, // 140 bits
  };
  const VER = 'PS2'; // the version new codes are written in
  const FLAGS = ['bnpl', 'sold', 'lent', 'adv', 'burnout', 'autosave', 'rent'];
  const check = (chars) => {
    let h = 0;
    for (let i = 0; i < chars.length; i++) h = (h * 33 + ABC.indexOf(chars[i]) + 1) % 1021;
    return ABC[h >> 5] + ABC[h & 31];
  };
  PS.cls.VER = VER;

  // the numbers of one finished run (also used by tools/sample_class.js)
  PS.cls.values = function (s) {
    const st = s.st, pr = s.predict || {}, re = s.recheck || {};
    if (s.rid == null) s.rid = Math.floor(Math.random() * 256); // tells a line pasted twice from two students with the same year
    const g = s.goal || null;
    return {
      cls: s.code, grade: PS.grade(s), q1: pr.q1, q2: pr.q2, r1: re.q1, r2: re.q2, net: PS.E.netWorth(s), debt: Math.round(s.debt),
      ef: Math.floor((s.buffer / C().LIVING) * 10) / 10, fees: Math.round(st.interest + st.lateFees + st.advFees), imp: st.impulse,
      given: st.given, overdue: Math.min(63, st.overdueN), missed: st.missed, endm: s.over === 'limit' ? st.overMonth + 1 : 12,
      bnpl: st.bnplMonth >= 0, sold: !!st.sold, lent: !!st.lent, adv: !!st.advFriend, burnout: st.burnouts > 0,
      autosave: !!s.autosave, rent: st.rentRaised > 0, rid: s.rid,
      goal: g ? g.id : '', lv: s.lv || 1, reached: !!g && s.gpot >= g.target, pot: g ? Math.round(s.gpot || 0) : 0,
    };
  };

  // ver: 'PS2' (default) or 'PS1' (an old code, for the compatibility check)
  PS.cls.packCode = function (v, ver) {
    const V = VERS[ver] ? ver : VER;
    const n = Object.assign({}, v, {
      grade: Math.max(0, GRADES.indexOf(v.grade)), q1: Math.max(0, ANS.indexOf(v.q1 || '')), q2: Math.max(0, ANS.indexOf(v.q2 || '')),
      r1: Math.max(0, ANS.indexOf(v.r1 || '')), r2: Math.max(0, ANS.indexOf(v.r2 || '')), buf10: v.ef * 10, rid: (v.rid || 0) % 256,
      flags: FLAGS.reduce((a, f, i) => a | (v[f] ? 1 << i : 0), 0),
      goal: Math.max(0, GOALS.indexOf(v.goal || '')), lv: Math.max(0, Math.min(3, (v.lv || 1) - 1)), reached: v.reached ? 1 : 0, spare: 0,
    });
    let bits = '';
    VERS[V].layout.forEach(([k, b, off]) => {
      const x = Math.max(0, Math.min(2 ** b - 1, Math.round((n[k] || 0) + (off || 0))));
      bits += x.toString(2).padStart(b, '0');
    });
    let body = '';
    for (let i = 0; i < bits.length; i += 5) body += ABC[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
    body += check(V + v.cls + body);
    return V + '-' + v.cls + '-' + body.match(/.{5}/g).join('-');
  };
  PS.cls.resultCode = (s) => PS.cls.packCode(PS.cls.values(s));

  // read one code: { ok: true, v } or { ok: false, err } with err = 'prefix' | 'length' | 'chars' | 'check'.
  // v.ver is 1 or 2; a PS1 code has goal null and lv null (the code does not say), a PS2 code without a goal has goal ''
  PS.cls.readCode = function (str) {
    const raw = String(str || '').toUpperCase().replace(/[\s\u200e\u200f\u2066-\u2069\u061c-]/g, '');
    const V = raw.slice(0, 3), spec = VERS[V];
    if (!spec) return { ok: false, err: 'prefix' };
    const rest = raw.slice(3);
    if (rest.length !== 6 + spec.chars + 2) return { ok: false, err: 'length' };
    if (!rest.split('').every((ch) => ABC.indexOf(ch) >= 0)) return { ok: false, err: 'chars' };
    const cls = rest.slice(0, 6), body = rest.slice(6, 6 + spec.chars);
    if (check(V + cls + body) !== rest.slice(6 + spec.chars)) return { ok: false, err: 'check' };
    const bits = body.split('').map((ch) => ABC.indexOf(ch).toString(2).padStart(5, '0')).join('');
    const v = { cls, ver: +V[2] }; let at = 0;
    spec.layout.forEach(([k, b, off]) => { v[k] = parseInt(bits.slice(at, at + b), 2) - (off || 0); at += b; });
    if (v.grade > 2 || v.endm < 1 || v.endm > 12) return { ok: false, err: 'check' };
    FLAGS.forEach((f, i) => { v[f] = !!(v.flags & (1 << i)); });
    v.grade = GRADES[v.grade]; ['q1', 'q2', 'r1', 'r2'].forEach((q) => { v[q] = ANS[v[q]]; }); v.ef = v.buf10 / 10;
    if (v.ver === 1) { v.goal = null; v.lv = null; v.reached = false; v.pot = 0; } else { v.goal = GOALS[v.goal]; v.lv += 1; v.reached = !!v.reached; }
    delete v.spare;
    v.key = cls + body.slice(0, 23); // the PS1 part: the same result pasted as an old and a new code counts once
    return { ok: true, v };
  };

  // ---------- result card ----------
  const iso = (c) => (PS.lang === 'ar' ? '⁦' + c + '⁩' : c); // codes stay left to right inside Arabic text
  function numbers(s) {
    const v = PS.cls.values(s);
    const bills = s.st.debtByMonth.filter((d) => d > 0).length; // statements that were due
    return [
      ['rc.net', PS.aedOrZero(v.net)],
      ['rc.fees', PS.amtOrNone(v.fees)],
      ['rc.buf', PS.months(v.ef)],
      ['rc.imp', PS.amtOrNone(v.imp)],
      ['rc.missed', t('rc.nv', { n: v.missed, m: bills })],
      ['rc.overdue', String(v.overdue)],
    ];
  }

  // the end screen's four numbers and its comparison rows (you, steady habits), worded by the same helpers as the result card
  PS.cls.endNums = function (s, steady) {
    const v = PS.cls.values(s), sv = PS.cls.values(steady);
    return {
      kpis: [['end.nw', PS.aedOrZero(v.net)], ['end.fees', PS.amtOrNone(v.fees)], ['end.buf', PS.months(v.ef)], ['end.debt', PS.amtOrNone(v.debt)]],
      you: { nw: v.net, fees: PS.feesShort(v.fees) }, steady: { nw: sv.net, fees: PS.feesShort(sv.fees) },
    };
  };

  PS.cls.resultHTML = function (s) {
    const g = PS.grade(s);
    return '<section class="result" aria-labelledby="rcT"><div class="rc-head"><h2 id="rcT">' + PS.icon('flag') + t('rc.t') + '</h2>' +
      '<span class="rc-code">' + t('rc.code') + ' <bdi dir="ltr" class="code">' + s.code + '</bdi></span></div>' +
      '<p class="rc-grade g-' + g + '">' + t('grade.' + g) + '</p>' +
      '<dl class="rc-nums">' + numbers(s).map((n) => '<div><dt>' + t(n[0]) + '</dt><dd>' + n[1] + '</dd></div>').join('') + '</dl>' +
      '<p class="small">' + t('rc.note') + '</p>' +
      '<p class="rc-rcode"><span>' + t('rc.rcode') + '</span> <bdi dir="ltr" class="code" id="rcRcode">' + PS.cls.resultCode(s) + '</bdi></p>' +
      '<div class="row"><button class="btn" id="rcCopy">' + t('rc.copy') + '</button><button class="btn" id="rcCards">' + t('rc.cards') + '</button><p class="note-slot" id="endNote"></p></div></section>';
  };

  // plain text for the clipboard: a student pastes it into the class chat or the dashboard
  PS.cls.text = function (s) {
    return [t('rc.txt.t', { code: iso(s.code) }), t('rc.txt.g', { g: t('grade.' + PS.grade(s)) })]
      .concat(numbers(s).map((n) => PS.plain(t(n[0]) + ': ' + n[1])), [t('rc.txt.end'), t('rc.txt.rcode', { c: iso(PS.cls.resultCode(s)) })])
      .map(PS.plain).join('\n');
  };

  function copy(text) {
    const ok = () => PS.ui.note(t('rc.copied'));
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let done = false;
      try { done = document.execCommand('copy'); } catch (e) { /* blocked */ }
      ta.remove();
      if (done) ok(); else PS.ui.note(t('rc.nocopy'), 'warn');
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, fallback);
    else fallback();
  }

  // the three sentences on why the year went this way are built in js/why.js (PS.cls.why)

  // ---------- discussion cards: the problems and decisions this player actually met ----------
  PS.cls.cardsFor = function (s) {
    const st = s.st, out = [], C0 = C();
    const last = s.over === 'limit' ? st.overMonth : 11;
    const met = (id) => s.year.slice(0, last + 1).findIndex((m) => m.foes.indexOf(id) >= 0);
    out.push({ id: 'agent', icon: 'key', mi: 0, r: st.debtByMonth[0] > 0 ? t('dc.agent.r1', { a: st.debtByMonth[0] }) : t('dc.agent.r0') });
    if (last >= 1) out.push({ id: 'ramadan', icon: 'moon', mi: 1, r: st.given > 0 ? t('dc.ramadan.r1', { g: st.given }) : t('dc.ramadan.r0') });
    const cardFees = Math.round(st.lateFees - st.overdueFees + st.advFees); // card late, pay-later late and cash advance fees (bill late fees have their own card)
    if (st.debtByMonth.some((d) => d > 0)) out.push({ id: 'cardbill', icon: 'card', r: st.interest + cardFees > 0
      ? PS.cls.compose(st.missed ? 'dc.cardbill.h' : 'dc.cardbill.h0', { n: st.missed }, [['wc.int', st.interest], ['wc.fees', cardFees]]) : t('dc.cardbill.r0') });
    if (st.overdueN) out.push({ id: 'overdue', icon: 'bill', r: t('dc.overdue.r', { n: st.overdueN, a: st.overdueFees }) });
    if (st.shocks.length) {
      const x = st.shocks.slice().sort((a, b) => b.c - a.c || b.a - a.a)[0];
      out.push({ id: 'shock', icon: 'bolt', mi: x.mi, r: t(x.c > 0 ? 'dc.shock.r1' : x.b > 0 ? 'dc.shock.r0' : 'dc.shock.r2', { m: x.mi + 1, f: x.f, a: x.a, c: x.c }) });
    }
    const g = st.gap;
    if (g) out.push({ id: 'late', icon: 'coin', mi: g.mi, r: g.adv + g.card + (g.sav || 0) > 0 ? PS.cls.compose('', null, [g.buf > 0 ? ['wc.bufPaid', g.buf] : PS.cls.emptyFund(st, g.fo),
      ['wc.savPaid', g.sav || 0], ['wc.adv', g.adv], ['wc.cardLiving', g.card]]) : t('dc.late.r0', { c: g.buf }) });
    const ml = met('landlord');
    if (ml >= 0) out.push({ id: 'landlord', icon: 'key', mi: ml, r: st.rentRaised > 0 ? t('dc.landlord.r1', { a: st.rentRaised }) : t('dc.landlord.r0') });
    if (last >= PS.FLIGHT_MONTH) out.push({ id: 'flight', icon: 'plane', mi: PS.FLIGHT_MONTH, r: st.sinkUsed > 0 ? t('dc.flight.r1', { a: st.sinkUsed }) : t('dc.flight.r0', { a: PS.FOES.flight.amt }) });
    if (last >= 7) out.push({ id: 'dip', icon: 'chart', mi: 7, r: t(st.sold ? 'dc.dip.r1' : st.held ? 'dc.dip.r2' : 'dc.dip.r0') });
    if (last >= 8) out.push({ id: 'megasale', icon: 'phone', mi: 8, r: st.bnplMonth >= 0 ? t('dc.megasale.r1', { a: PS.CARDS.bnploffer.amt / 4 }) : t('dc.megasale.r0') });
    if (st.friend) out.push({ id: 'friend', icon: 'give', mi: 9, r: t('dc.friend.r.' + st.friend, { l: C0.LOAN, fee: C0.CASH_ADV_FEE }) });
    if (st.impulse > 0) out.push({ id: 'sale', icon: 'bag', r: t('dc.sale.r', { a: st.impulse }) });
    if (s.over === 'limit') out.push({ id: 'frozen', icon: 'card', mi: st.overMonth, r: t('dc.frozen.r', { m: st.overMonth + 1, lim: C0.LIMIT }) });
    const z = PS.E.zakat(s);
    out.push({ id: 'zakat', icon: 'scale', r: t('dc.zakat.r', { w: z.wealth, p: z.pct }) });
    return out;
  };

  PS.cls.showCards = function (s) {
    const cards = PS.cls.cardsFor(s).map((c) => '<article class="dcard"><header>' + PS.icon(c.icon) + '<b>' + t('dc.' + c.id + '.t') + '</b>' +
      (c.mi != null ? '<small>' + t('dc.month', { n: c.mi + 1 }) + '</small>' : '') + '</header><p class="dc-r">' + c.r + '</p>' +
      '<ol>' + ['q1', 'q2'].map((q) => '<li>' + t('dc.' + c.id + '.' + q) + '</li>').join('') + '</ol></article>').join('');
    PS.ui.modal('<h2>' + t('dc.t') + '</h2><p>' + t('dc.sub', { code: '<bdi dir="ltr" class="code">' + s.code + '</bdi>' }) + '</p>' +
      '<div class="row no-print"><button class="btn pri" id="dcPrint" data-first>' + t('dc.print') + '</button><button class="btn" id="dcClose">' + t('btn.close') + '</button></div>' +
      '<div class="dcards">' + cards + '</div>', { kind: 'cards', esc: closeCards });
    $('dcPrint').onclick = () => window.print();
    $('dcClose').onclick = closeCards;
  };
  function closeCards() { PS.ui.close(); const b = $('rcCards'); if (b) b.focus(); }

  PS.cls.bind = function (s) {
    $('rcCopy').onclick = () => copy(PS.cls.text(s));
    $('rcCards').onclick = () => PS.cls.showCards(s);
  };
})();
