/* Payday Spire - the rules. Pure logic, no DOM: the live game, the bots and the "same year, other habits"
   comparison all run through these functions. */
(function () {
  const PS = (window.PS = window.PS || {});
  const C = PS.CONST;
  const R10 = (n) => Math.round(n / 10) * 10;

  let uid = 1;
  const mk = (id, temp) => ({ id, uid: uid++, temp: !!temp });
  const ANSWER = { shock: 'compare', sale: 'wait', deal: 'negotiate' };

  function newGame(code) {
    const seed = PS.codeSeed(code);
    const s = {
      code, seed, year: PS.buildYear(seed),
      mi: 0, turn: 0, phase: 'battle', over: null,
      cash: 0, buffer: 0, savings: 0, fund: 0, debt: 0, sink: 0, mind: C.MIND_MAX, deposit: 0, payLater: 0,
      stmt: 0, // last month's card statement, due at the end of turn 2 of this month
      overdue: [], // bills not paid by month end: {id, amt, n} (they come back with a late fee)
      deck: PS.TUTORIAL_DECK.slice(), draw: [], hand: [], discard: [], used: [],
      focus: 0, foes: [], handSize: C.HAND,
      autosave: false, autopay: false, raise: 0, rentRaise: 0, course: false,
      bnpl: [], // {month, amt, n}
      loan: null, // {month, amt}
      burnoutNext: false, peek: false,
      log: [], // this month's lines: {k, p}
      st: {
        interest: 0, lateFees: 0, advFees: 0, impulse: 0, given: 0, maxDebt: 0,
        autosaved: 0, autosaveFrom: -1, burnouts: 0, bnplMonth: -1, sold: false, held: false, dipLoss: 0,
        shocks: [], sinkUsed: 0, sinkFoe: '', rentRaised: 0, lent: false, advFriend: false, overMonth: -1,
        netByMonth: [], debtByMonth: [], swiped: 0, spentLeft: 0,
        minMind: C.MIND_MAX, missed: 0, cardLate: 0, stmtFull: 0, cardImp: 0, overdueN: 0, overdueFees: 0,
        feesByMonth: [], gap: null, // the payroll delay: {mi, buf, adv, fee, i}
      },
    };
    PS.L.init(s);
    return s;
  }

  const say = (s, k, p) => s.log.push({ k, p: p || {} });

  function rng(s, salt) { return PS.rng((s.seed ^ Math.imul(s.mi + 1, 0x9e3779b1) ^ salt) >>> 0); }

  function drawCards(s, n) {
    for (let i = 0; i < n; i++) {
      if (!s.draw.length) {
        if (!s.discard.length) return;
        s.draw = PS.shuffle(s.discard, rng(s, s.turn * 31 + s.hand.filter((c) => c.id !== 'fundpay').length));
        s.discard = [];
      }
      s.hand.push(s.draw.shift());
    }
  }

  function netWorth(s) {
    const parts = s.bnpl.reduce((a, b) => a + b.amt, 0);
    const owed = s.overdue.reduce((a, b) => a + b.amt, 0) + s.foes.filter((f) => !f.gone && f.overdue).reduce((a, f) => a + f.amt, 0);
    return Math.round(s.savings + s.buffer + s.fund + s.sink + s.deposit + (s.gpot || 0) + (s.loan ? s.loan.amt : 0) - s.debt - parts - owed);
  }

  function limitCheck(s) {
    s.st.maxDebt = Math.max(s.st.maxDebt, s.debt);
    if (s.debt > (s.limit || C.LIMIT) && !s.over) { s.over = 'limit'; s.st.overMonth = s.mi; }
  }

  // money that must leave now: cash first, then the card
  function spend(s, amt, tag) {
    const c = Math.min(s.cash, amt);
    s.cash -= c;
    if (amt > c) PS.L.owe(s, amt - c, tag || 'other');
    limitCheck(s);
    return amt - c;
  }

  function startMonth(s) {
    const m = s.year[s.mi];
    s.log = [];
    s.turn = 0; s.gigs = 0; if (PS.E.preMonth) PS.E.preMonth(s); // the goal's jar card, the level's rent rise (js/goals.js)
    // payday: salary in, living costs out (the first salary pays only the days worked)
    const pay = C.SALARY - (s.payCut || 0), income = s.mi === 0 ? Math.round((pay * C.FIRST_DAYS) / 30) : pay + s.raise;
    const fixed = C.LIVING + s.rentRaise;
    if (m.late) { // payroll delay: living costs are due now, the salary comes at the start of turn 2
      // rent needs cash or a transfer, so what the fund cannot pay of it is a cash advance; food and transport go on the card
      // the emergency fund first, then savings (your own money, moved over: the goal it was for is set back), then credit
      const fo = s.st.fundOut.length, b = Math.min(s.buffer, fixed); s.buffer -= b; PS.L.fundOut(s, b, 'gap');
      const v = PS.E.breakSavings(s, fixed - b, 'gap');
      const short = fixed - b - v, rent = C.RENT + s.rentRaise;
      const adv = Math.min(short, Math.max(0, rent - b - v)), card = short - adv;
      s.cash = 0; s.payLater = income;
      const g = { mi: s.mi, buf: b, sav: v, adv, card, fee: 0, i: 0, m: 0, fo };
      if (adv > 0) { g.fee = advFee(adv); g.i = Math.round(adv * C.CARD_RATE); s.st.advFees += g.fee; s.st.interest += g.i; }
      PS.L.owe(s, short, 'gap'); PS.L.fee(s, g.fee + g.i, 'gap', true);
      if (short > 0) { g.m = C.SHOCK_WORRY; s.mind = Math.max(0, s.mind - g.m); }
      limitCheck(s);
      s.st.gap = g;
      // one sentence per way the costs were met, so no part reads AED 0 (tools/regress_text.js Z2)
      const k = !short ? (b ? 'pd.lateBuf' : 'pd.lateSavAll') : !b ? (adv ? 'pd.lateNoFund' : 'pd.lateNoFundNoAdv') : adv ? 'pd.lateAdv' : 'pd.lateNoAdv';
      say(s, k, { a: income, b: fixed, c: g.buf, d: adv, e: card, fee: g.fee, i: g.i, m: g.m, v, w: C.SAVE_WORRY });
      if (v && k !== 'pd.lateSavAll') say(s, 'pd.lateSav', { v, w: C.SAVE_WORRY });
    } else {
      s.cash = income - fixed;
      say(s, s.mi === 0 ? 'pd.first' : 'pd.pay', { a: income, b: fixed, c: s.cash, n: C.FIRST_DAYS });
      if (s.autosave) say(s, 'pd.auto', { a: autosave(s) });
    }
    s.bnpl.filter((b) => b.month === s.mi).forEach((b) => {
      const short = Math.max(0, b.amt - s.cash);
      s.cash -= b.amt - short;
      if (short) { PS.L.owe(s, short, 'bnpl'); say(s, 'pd.bnplLate', { a: short }); }
      say(s, 'pd.bnpl', { a: b.amt, n: b.n });
    });
    s.bnpl = s.bnpl.filter((b) => b.month > s.mi);
    if (s.loan && s.loan.month === s.mi) { s.savings += s.loan.amt; say(s, 'pd.loan', { a: s.loan.amt }); s.loan = null; }
    if (s.mi > 0) {
      const owed = s.debt + s.overdue.reduce((a, o) => a + o.amt, 0); // card debt and bills left unpaid
      const worry = Math.min(C.DEBT_WORRY_MAX, Math.floor(owed / 1000) * C.DEBT_WORRY);
      // a month of costs in the emergency fund is peace of mind (cash on hand predicts wellbeing: Ruberton et al. 2016)
      // a card balance carried past its due date (last bill not paid in full) is owed out of that cushion, so it counts against it
      const calm = s.buffer - (s.noGrace ? s.debt : 0) >= C.LIVING ? C.FUND_CALM : 0;
      const stress = C.MIND_STRESS - calm;
      s.mind = Math.max(0, s.mind - stress - worry);
      say(s, worry ? 'pd.mindW' : calm ? 'pd.mindC' : 'pd.mind', { a: stress, w: worry });
    }
    // the deck for this month
    if (s.mi === 1) { s.deck.push('wait', 'treat'); say(s, 'pd.newcards'); say(s, 'pd.cardRule'); }
    if (s.mi === PS.FLIGHT_MONTH + 1) { // the flight is paid: put-aside money left over goes to savings, Save ahead cards leave the deck
      if (s.sink > 0) { s.savings += s.sink; say(s, 'pd.sinkBack', { a: s.sink }); s.sink = 0; }
      if (s.deck.indexOf('sink') >= 0) { s.deck = s.deck.filter((id) => id !== 'sink'); say(s, 'pd.sinkGone'); }
    }
    s.deck = s.deck.filter((id) => id !== 'reminder');
    if (s.bnpl.length) s.deck.push('reminder');
    const pile = s.deck.map((id) => mk(id)).concat((m.cards || []).map((id) => mk(id, true)));
    // each kind of problem this month comes with one way to answer it (a repair quote to compare, a 24-hour wait, a talk with
    // the landlord) when the deck has none, so every month has a decision (checked by tools/regress_design.js)
    m.foes.forEach((id) => { const a = ANSWER[PS.FOES[id].kind]; if (a && !pile.some((c) => c.id === a)) pile.push(mk(a, true)); });
    // a tired month: delivery apps and late-night shopping tempt you (one more Impulse buy in the draw pile)
    if (s.mi > 0 && s.mind < C.LOW_MIND && !s.burnoutNext) {
      pile.push(mk('impulse', true)); spend(s, C.TIRED_SPEND, 'burn');
      s.st.lowMind = (s.st.lowMind || 0) + 1; s.st.tiredSpend = (s.st.tiredSpend || 0) + C.TIRED_SPEND;
      say(s, 'pd.lowMind', { l: C.LOW_MIND, a: C.TIRED_SPEND });
    }
    s.handSize = C.HAND - (s.burnoutNext ? 1 : 0);
    if (s.burnoutNext) say(s, 'pd.burnt'); // still tired after the burnout: one card fewer in each hand
    s.burnoutNext = false;
    s.draw = PS.shuffle(pile, rng(s, 7));
    // ...and every card this month promises (that answer, and the planned joy its intro names) is in the first hand
    // (PS.E.promised; tools/regress_text.js P2 checks every month of 200 codes x every play style)
    const front = [];
    PS.E.promised(s).forEach((id) => { const k = s.draw.findIndex((c) => c.id === id); if (k >= 0) front.push(s.draw.splice(k, 1)[0]); });
    s.draw = front.concat(s.draw);
    // month 1 (practice) opens with Pay from cash first and Put it on the card second, the two cards the first turn teaches (js/tutor.js)
    if (m.tut) ['swipe', 'pay'].forEach((id) => { const k = s.draw.findIndex((c) => c.id === id); if (k > 0) s.draw.unshift(s.draw.splice(k, 1)[0]); });
    s.discard = []; s.hand = []; s.used = [];
    // money problems: last month's card statement first, then bills left unpaid last month, then this month's problems
    const before = [];
    if (s.stmt > 0) {
      before.push({ id: 'cardbill', kind: 'card', amt: s.stmt, max: s.stmt, min: minPay(s.stmt), pull: 0, gone: false });
      say(s, 'pd.stmt', { a: s.stmt, m: minPay(s.stmt) });
    }
    s.overdue.forEach((o) => {
      before.push({ id: o.id, kind: 'bill', amt: o.amt, max: o.amt, pull: 0, gone: false, overdue: o.n });
      say(s, 'pd.overdue', { f: o.id, a: o.amt });
    });
    s.overdue = [];
    s.foes = before.concat(m.foes.map((id) => {
      const d = PS.FOES[id];
      const f = { id, kind: d.kind, amt: d.amt, max: d.amt, pull: d.pull || 0, gone: false, at: (m.at && m.at[id]) || d.at || 0 };
      // money put aside with Save ahead is for the flight home only (a sinking fund with a name and a date)
      if (s.sink > 0 && d.early) {
        const use = Math.min(s.sink, d.amt);
        f.amt -= use; s.sink -= use; s.st.sinkUsed += use; s.st.sinkFoe = id;
        say(s, 'pd.sink', { a: use, f: id });
      }
      return f;
    }));
    if (PS.E.foesHook) PS.E.foesHook(s); // the level's bigger surprise costs (js/goals.js)
    s.foes.forEach((f, i) => { f.i = i; if (f.amt <= 0 && !f.gone) hitFoe(s, f, 0); }); // fully paid by Save ahead money: done
    // the mega sale opens with its pay-later offer already in your hand
    s.foes.forEach((f) => { const o = PS.FOES[f.id].offer; if (o) s.draw.unshift(mk(o, true)); });
    if (m.dip && s.fund > 0) {
      const loss = Math.round(s.fund * m.dip);
      s.fund -= loss; s.st.dipLoss = loss;
      say(s, 'pd.dip', { a: loss });
    }
    startTurn(s);
  }

  // hand rule: from month 2, no more than HAND_SAME copies of one card in a fresh hand while another kind waits in the draw
  // or discard pile; an extra copy swaps places with the next card of another kind (burdens are never skipped, they stay
  // where they are). So a hand is not four Pay from cash and nothing else (tools/regress_design.js H1)
  function varyHand(s) {
    if (s.year[s.mi].tut) return;
    const free = (c) => !card(c).curse && !card(c).temp;
    for (let guard = 0; guard < s.hand.length; guard++) {
      const n = {};
      s.hand.forEach((c) => { if (free(c)) n[c.id] = (n[c.id] || 0) + 1; });
      const h = s.hand.findIndex((c) => free(c) && n[c.id] > C.HAND_SAME);
      if (h < 0) return;
      const ok = (c) => free(c) && (n[c.id] || 0) < C.HAND_SAME;
      const pile = [s.draw, s.discard].find((p) => p.some(ok));
      if (!pile) return;
      const k = pile.findIndex(ok), x = s.hand[h];
      s.hand[h] = pile[k]; pile[k] = x;
    }
  }

  function startTurn(s) {
    s.focus = C.FOCUS;
    drawCards(s, s.handSize);
    varyHand(s);
    PS.E.payCard(s);
    PS.E.fundCard(s);
    if (s.mi < 4 && !alive(s).length) s.st.empty14 = (s.st.empty14 || 0) + 1; // a turn in months 1-4 with nothing to face
  }

  const alive = (s) => s.foes.filter((f) => !f.gone && !(f.at > s.turn));
  const coming = (s) => s.foes.filter((f) => !f.gone && f.at > s.turn); // bills that arrive later this month
  const advFee = (a) => Math.max(C.CASH_ADV_FEE, Math.round(a * C.CASH_ADV_PCT));
  function autosave(s) {
    if (!s.autosave) return null;
    const x = Math.min(PS.CARDS.autosave.amt, s.cash); s.cash -= x; s.savings += x; s.st.autosaved += x;
    return x;
  }
  const card = (c) => PS.CARDS[c.id];

  // which foes a card can be aimed at
  function aims(s, c) {
    const a = card(c).aim;
    if (!a) return [];
    return alive(s).filter((f) => {
      // a breakdown cannot be paid before it happens (only its price can be cut), and a card bill can only be paid with money
      // a breakdown is paid before it is due from cash, the card or (Emergency fund pays) the fund; its price can be cut
      if (a === 'bill') {
        // a set price (deposit, fine, fee, tariff, fare) or a bill already late has no quote to compare (tools/regress_cards.js K1b)
        if (c.id === 'compare' && f.kind === 'bill' && (f.overdue || PS.FOES[f.id].fixed)) return false;
        if (f.kind === 'bill') return true;
        if (f.kind === 'shock') return (c.id === 'compare' && !f.overdue) || c.id === 'pay' || c.id === 'swipe';
        if (c.id === 'compare' && (f.overdue || PS.FOES[f.id].fixed)) return false;
        return f.kind === 'card' && c.id === 'pay';
      }
      // the fund (or savings) pays a breakdown, or the part of the card bill that cash cannot cover
      if (a === 'shock') return f.kind === 'shock' || (f.kind === 'card' && s.cash < f.amt);
      // a set price (deposit, fine, fee, utility tariff) or a bill already late cannot be talked down
      if (f.overdue || PS.FOES[f.id].fixed) return false;
      if (a === 'deal') return f.kind === 'bill' || f.kind === 'shock' || f.kind === 'deal';
      if (a === 'sale') return f.kind === 'sale';
      return false;
    }).map((f) => f.i);
  }

  // can this hand card be played now? {ok, why}
  function canPlay(s, h) {
    const c = s.hand[h];
    if (!c) return { ok: false, why: 'none' };
    const d = card(c);
    if (d.cost === null) return { ok: false, why: 'curse' };
    if (d.cost > s.focus) return { ok: false, why: 'focus' };
    const id = c.id;
    const needAim = d.aim && !(id === 'wait' && s.hand.some((x) => x.id === 'impulse'));
    if (needAim && !aims(s, c).length) return { ok: false, why: d.aim === 'sale' ? 'nosale' : 'nobill' };
    if ((id === 'pay' || id === 'buffer' || id === 'sink') && s.cash <= 0) return { ok: false, why: 'cash' };
    if (id === 'sink' && (s.mi >= PS.FLIGHT_MONTH || s.sink >= PS.FOES.flight.amt)) return { ok: false, why: 'flight' };
    if (id === 'fundpay' && s.buffer <= 0) return { ok: false, why: 'nofund' };
    if (id === 'savepay' && s.savings + (s.gpot || 0) <= 0) return { ok: false, why: 'savings' };
    if (id === 'paycard' && s.cash + s.buffer <= 0) return { ok: false, why: 'cash' };
    if (id === 'paycard' && s.debt <= 0) return { ok: false, why: 'nodebt' };
    if (id === 'snowball' && s.debt <= 0 && !s.bnpl.length) return { ok: false, why: 'nodebt' };
    if (id === 'snowball' && s.cash <= 0) return { ok: false, why: 'cash' };
    if ((id === 'treat' || id === 'sadaqah' || id === 'iftar' || id === 'eidiya') && s.cash < d.amt) return { ok: false, why: 'cash' };
    if (id === 'invest' && s.savings < d.amt) return { ok: false, why: 'savings' };
    if (id === 'sidegig' && (s.gigs || 0) >= C.GIGS_PER_MONTH) return { ok: false, why: 'gig' };
    const more = PS.E.canMore && PS.E.canMore(s, c, d); // the goal's own cards (js/goals.js)
    return more || { ok: true };
  }

  function hitFoe(s, f, amt) {
    f.amt = Math.max(0, f.amt - amt);
    if (f.amt <= 0) {
      f.gone = true; f.paid = true;
      if (PS.FOES[f.id].refund) s.deposit = PS.FOES[f.id].amt;
      const j = PS.FOES[f.id].joy;
      if (j) s.mind = Math.min(C.MIND_MAX, s.mind + j);
      if (f.kind === 'card') s.st.stmtFull++;
      if (f.kind === 'shock') PS.E.shockDone(s, f);
    }
  }
  // money paid off the card also counts against this month's card bill
  function cardPaid(s, x) {
    const cb = alive(s).find((f) => f.kind === 'card');
    if (cb && x > 0) hitFoe(s, cb, Math.min(x, cb.amt));
  }
  function minPay(d) { return d > 0 ? Math.min(d, Math.max(Math.round(d * C.MIN_PAY_RATE), C.MIN_PAY_FLOOR)) : 0; }

  function play(s, h, fi) {
    const chk = canPlay(s, h);
    if (!chk.ok) return false;
    const c = s.hand[h];
    const d = card(c);
    const opts = aims(s, c);
    let f = null;
    if (d.aim && opts.length) f = s.foes[opts.indexOf(fi) >= 0 ? fi : opts[0]];
    s.focus -= d.cost;
    s.hand.splice(h, 1);
    let gone = !!(d.exhaust || d.temp || d.power);
    const r = { id: c.id, foe: f ? f.id : null };
    switch (c.id) {
      case 'pay': {
        const x = Math.min(f.kind === 'card' ? f.amt : d.amt, s.cash, f.amt); s.cash -= x; // a card bill is one transfer
        if (f.kind === 'card') PS.L.repay(s, x);
        if (f.kind === 'shock') f.byCash = (f.byCash || 0) + x;
        hitFoe(s, f, x); r.a = x; break;
      }
      case 'swipe': {
        const x = Math.min(d.amt, f.amt), sh = f.kind === 'shock';
        PS.L.owe(s, x, sh ? 'shock:' + f.id : 'swipe');
        if (sh) f.byCard = (f.byCard || 0) + x; else s.st.swiped += x;
        hitFoe(s, f, x); r.a = x;
        if (s.mi > 0) { s.draw.unshift(mk('impulse', true)); s.st.cardImp++; r.imp = true; }
        break;
      }
      case 'fundpay': {
        const x = Math.min(s.buffer, f.kind === 'card' ? f.amt - s.cash : f.amt); s.buffer -= x; r.a = x; PS.L.fundOut(s, x, f.kind === 'card' ? 'card' : 'shock', f.id);
        if (f.kind === 'card') PS.L.repay(s, x); else f.byFund = (f.byFund || 0) + x;
        hitFoe(s, f, x); break;
      }
      case 'savepay': {
        const x = PS.E.breakSavings(s, f.kind === 'card' ? f.amt - s.cash : f.amt, f.id); r.a = x; r.m = C.SAVE_WORRY;
        if (f.kind === 'card') PS.L.repay(s, x); else f.bySav = (f.bySav || 0) + x;
        hitFoe(s, f, x); break;
      }
      case 'impulse': // walked away from it: it takes willpower (focus and a little mind)
        r.a = d.amt; r.m = d.mind; s.st.walked = (s.st.walked || 0) + d.amt; s.mind = Math.max(0, s.mind + d.mind); gone = true; break;
      case 'buffer': { const x = Math.min(d.amt, s.cash); s.cash -= x; s.buffer += x; r.a = x; break; }
      case 'wait': {
        if (f) { f.pull -= 1; if (f.pull <= 0) { f.gone = true; r.left = true; } }
        const k = s.hand.findIndex((x) => x.id === 'impulse');
        if (k >= 0) { s.used.push(s.hand.splice(k, 1)[0]); r.drop = true; }
        break;
      }
      case 'treat': case 'sadaqah': case 'iftar': case 'eidiya':
        s.cash -= d.amt; s.mind = Math.min(C.MIND_MAX, s.mind + d.mind);
        if (c.id === 'sadaqah') s.st.given += d.amt;
        r.a = d.amt; break;
      case 'autosave': s.autosave = true; s.st.autosaveFrom = s.mi + 1; break;
      case 'autopay': s.autopay = true; break;
      case 'compare': { const x = R10(f.amt * d.pct); f.amt -= x; r.a = x; break; }
      case 'negotiate':
        if (f.kind === 'deal') { f.gone = true; r.deal = true; } else { const x = R10(f.amt * d.pct); f.amt -= x; r.a = x; }
        break;
      case 'refuse': {
        f.pull -= d.pull; if (f.pull <= 0) { f.gone = true; r.left = true; }
        s.mind = Math.max(0, s.mind + d.mind);
        s.hand = s.hand.filter((x) => { if (x.id === 'bnploffer') { s.used.push(x); return false; } return true; });
        break;
      }
      case 'paycard': { const x = readyMoney(s, Math.min(d.amt, s.debt)); PS.L.repay(s, x); cardPaid(s, x); r.a = x; break; }
      case 'snowball': {
        // the debt that charges interest (the card) first; a 0% pay-later instalment only when the card is clear
        const part = s.bnpl.length ? s.bnpl.reduce((a, b) => (b.month < a.month ? b : a)) : null;
        if (part && s.debt <= 0 && s.cash >= part.amt) {
          s.cash -= part.amt; s.bnpl = s.bnpl.filter((b) => b !== part); r.part = part.amt;
        } else { const x = Math.min(s.debt, s.cash); s.cash -= x; PS.L.repay(s, x); cardPaid(s, x); r.a = x; }
        drawCards(s, d.draw); break;
      }
      case 'budget': drawCards(s, d.draw); s.peek = true; break;
      case 'sink': { const x = Math.min(d.amt, s.cash, PS.FOES.flight.amt - s.sink); s.cash -= x; s.sink += x; r.a = x; break; }
      case 'lunch': case 'metro': case 'sidegig':
        if (c.id === 'sidegig') { s.gigs = (s.gigs || 0) + 1; s.st.gigs = (s.st.gigs || 0) + 1; }
        s.cash += d.amt; if (d.mind) s.mind = Math.max(0, s.mind + d.mind); r.a = d.amt; break;
      case 'invest': s.savings -= d.amt; s.fund += d.amt; r.a = d.amt; break;
      case 'cashadv': {
        const i = Math.round(d.amt * C.CARD_RATE), fee = advFee(d.amt);
        s.cash += d.amt; PS.L.owe(s, d.amt, 'adv'); PS.L.fee(s, fee + i, 'adv', true);
        s.st.advFees += fee; s.st.interest += i; r.a = d.amt; r.fee = fee + i; break;
      }
      case 'bnploffer': {
        const part = d.amt / 4;
        spend(s, part, 'bnpl');
        for (let k = 1; k <= 3; k++) s.bnpl.push({ month: s.mi + k, amt: part, n: k + 1 });
        s.mind = Math.min(C.MIND_MAX, s.mind + d.mind); s.st.bnplMonth = s.mi;
        r.a = part; break;
      }
      default: if (PS.E.playMore) PS.E.playMore(s, c, d, r); break;
    }
    if (d.power) s.deck.splice(s.deck.indexOf(c.id), 1);
    (gone ? s.used : s.discard).push(c);
    limitCheck(s);
    PS.E.playLog(s, c.id, r);
    PS.E.fundCard(s);
    return r;
  }

  // end of a turn: impulse buys still in hand are spent, then each problem acts
  function endTurn(s) {
    const ev = [];
    s.hand.forEach((c) => {
      if (c.id === 'impulse') { const d = PS.CARDS.impulse.amt; spend(s, d, 'imp'); s.st.impulse += d; ev.push({ k: 'ev.impulse', p: { a: d } }); }
    });
    alive(s).forEach((f) => {
      const d = PS.FOES[f.id];
      if (f.kind === 'bill' && d.grow && !f.overdue) { f.amt += d.grow; f.max += d.grow; ev.push({ k: 'ev.grow', p: { f: f.id, a: d.grow } }); }
      if (f.kind === 'shock' && d.hit === s.turn) {
        // it is due now. What the player did not pay before (Emergency fund pays, cash, the card) goes on the card: the
        // emergency fund sits in its own account and pays only when you move the money
        const rest = f.amt;
        PS.L.owe(s, rest, 'shock:' + f.id); f.byCard = (f.byCard || 0) + rest; f.amt = 0;
        const x = PS.E.shockDone(s, f); f.hit = true;
        ev.push({ k: 'ev.shock.' + (x.b ? 'f' : '') + (x.m ? 'm' : '') + 'c', p: { f: f.id, a: x.a, b: x.b, d: x.m, c: x.c, m: x.w } });
      }
      if (f.kind === 'sale' && s.turn < C.TURNS - 1) {
        for (let k = 0; k < d.adds; k++) s.draw.unshift(mk('impulse', true));
        if (d.mind) s.mind = Math.max(0, s.mind - d.mind);
        ev.push({ k: 'ev.sale', p: { f: f.id, n: d.adds, m: d.mind || 0 } });
      }
    });
    if (s.turn === C.CARD_DUE_TURN) PS.E.cardDue(s, ev);
    s.discard = s.discard.concat(s.hand.filter((c) => c.id !== 'fundpay' && !card(c).jar)); // the fund and jar cards are not deck cards
    s.hand = [];
    limitCheck(s);
    s.turn += 1;
    if (s.over) return { ev, done: 'over' };
    if (s.turn >= C.TURNS) return { ev, done: 'month' };
    if (s.payLater && s.turn === C.LATE_TURN) { // the late salary arrives
      s.cash += s.payLater; ev.push({ k: 'ev.salary', p: { a: s.payLater } });
      s.payLater = 0;
      const x = autosave(s); if (x) ev.push({ k: 'pd.auto', p: { a: x } });
    }
    s.foes.forEach((f) => { if (!f.gone && f.at === s.turn) ev.push({ k: 'ev.arrive', p: { f: f.id, a: f.amt } }); });
    startTurn(s);
    return { ev, done: 'turn' };
  }

  // the card statement that closes at month end (paid during next month, due at the end of turn 2)
  function statement(s) {
    const d = Math.round(s.debt);
    return { debt: d, min: minPay(d), i: Math.round(d * C.CARD_RATE) };
  }

  // ready money for the card bill: cash first, then the emergency fund (savings are set aside for goals)
  function readyMoney(s, amt) {
    const c = Math.min(s.cash, amt); s.cash -= c;
    const v = Math.min(s.buffer, amt - c); s.buffer -= v; PS.L.fundOut(s, v, 'card');
    return c + v;
  }

  // month end, step 3: what happens to the cash left over, then the fund and the mind
  function finish(s, left) {
    const lines = [];
    if (s.cash > 0 && left === 'spend') {
      const j = Math.min(C.SPEND_JOY_MAX, Math.round(s.cash / C.SPEND_JOY_PER));
      s.mind = Math.min(C.MIND_MAX, s.mind + j); s.st.spentLeft += s.cash;
      lines.push({ k: j ? 'st.spent' : 'st.spent0', p: { a: s.cash, j } });
      s.cash = 0;
    }
    s.st.minMind = Math.min(s.st.minMind, s.mind);
    // burnout: the tired spending comes now, out of the cash left (then the card), so a burnout in the last month costs too
    if (s.mind <= 0) {
      spend(s, C.BURNOUT_SPEND, 'burn'); s.st.tiredSpend = (s.st.tiredSpend || 0) + C.BURNOUT_SPEND;
      s.burnoutNext = true; s.mind = C.BURNOUT_MIND; s.st.burnouts++;
      s.deck.push('impulse');
      lines.push({ k: 'st.burnout', p: { a: C.BURNOUT_SPEND } });
    }
    if (s.cash > 0 && left === 'split') { // the fund up to its goal, the rest to savings
      const a = Math.min(s.cash, Math.max(0, C.LIVING - s.buffer));
      if (a) { lines.push({ k: 'st.toBuf', p: { a } }); s.buffer += a; s.cash -= a; }
      left = PS.E.goalOpen && PS.E.goalOpen(s) ? 'goal' : 'save'; // the rest to the goal's jar while it is open
    }
    if (s.cash > 0) {
      if (left === 'goal' && s.goal) PS.E.toJar(s, s.cash, lines); // the goal's jar, the rest to savings (js/goals.js)
      else if (left === 'buffer') { lines.push({ k: 'st.toBuf', p: { a: s.cash } }); s.buffer += s.cash; }
      else { lines.push({ k: 'st.toSave', p: { a: s.cash } }); s.savings += s.cash; }
      s.cash = 0;
    }
    const ret = s.year[s.mi].ret || 0;
    if (s.fund > 0 && ret > 0) { const p = Math.round(s.fund * ret); s.fund += p; lines.push({ k: 'st.profit', p: { a: p, r: (ret * 100).toFixed(1) } }); }
    // month cards and used cards go back; temporary ones leave
    s.hand = []; s.draw = []; s.discard = []; s.used = [];
    s.stmt = Math.max(0, Math.round(s.debt));
    PS.L.close(s);
    s.st.minMind = Math.min(s.st.minMind, s.mind);
    s.st.netByMonth.push(netWorth(s));
    s.st.feesByMonth.push(Math.round(s.st.interest + s.st.lateFees + s.st.advFees));
    s.st.debtByMonth.push(Math.round(s.debt));
    limitCheck(s);
    return lines;
  }

  function nextMonth(s) {
    s.mi += 1;
    s.peek = false;
    if (s.mi >= 12) { s.over = s.over || 'done'; return false; }
    startMonth(s);
    return true;
  }

  PS.E = { newGame, startMonth, startTurn, canPlay, aims, play, endTurn, statement, finish, nextMonth, minPay, coming, advFee,
    netWorth, alive, rng, limitCheck, mk, ANSWER, hitFoe };
})();
