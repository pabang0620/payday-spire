/* Payday Spire - the rules between battles: habit cards, the shop and coach, decisions at the start of some months, zakat.
   Pure logic, no DOM, loaded after engine.js. */
(function () {
  const PS = (window.PS = window.PS || {});
  const C = PS.CONST;
  const E = PS.E;
  const rng = E.rng;

  // three habit cards to pick from after a month (the same code offers the same cards)
  function rewardOffer(s) {
    const r = rng(s, 101);
    // autopay is offered from month 3 on: first the card bill is met and paid by hand
    const pool = PS.REWARD_POOL.filter((id) => !(id === 'autosave' && s.autosave) && !(id === 'autopay' && (s.autopay || s.mi < 2)) &&
      !(id === 'sink' && s.mi >= PS.FLIGHT_MONTH - 1) &&
      !(PS.CARDS[id].power && s.deck.indexOf(id) >= 0));
    return PS.shuffle(pool, r).filter((id, i, a) => a.indexOf(id) === i).slice(0, 3);
  }
  function takeReward(s, id) { if (id) s.deck.push(id); }

  // shop and coach after months 3, 6 and 9
  // money free for a goal: savings, and the part of the emergency fund above its goal (one month of costs) less a card balance
  // carried past its due date (that money is owed). Money put aside with Save ahead is for the flight only. The shop window
  // shows the same parts (js/flow.js); the status bar's Savings is s.savings
  const fundOver = (s) => Math.max(0, s.buffer - C.LIVING - (s.noGrace ? Math.round(s.debt) : 0));
  const spare = (s) => s.savings + fundOver(s);
  function buyCourse(s) {
    if (s.course || spare(s) < C.COURSE_COST) return false;
    const a = Math.min(s.savings, C.COURSE_COST); // savings first, then the fund's part above its goal
    s.savings -= a; s.buffer -= C.COURSE_COST - a; s.raise += C.COURSE_RAISE; s.course = true; return true;
  }
  // what to do with the cash left at month end. The fund option says what the fund will hold against its goal (one month of
  // costs) in the words for under, at or over it; when the cash is more than the fund needs, one option fills the fund to
  // its goal and saves the rest. tools/regress_screen.js LF1 checks the sums and the sentences
  // how soon the course pays for itself, and what the raise brings back this year if it is bought now (raise from next month)
  function coursePayback(s) {
    const k = Math.ceil(C.COURSE_COST / C.COURSE_RAISE), m = Math.max(0, 11 - s.mi), a = m * C.COURSE_RAISE, g = a - C.COURSE_COST;
    return { key: g > 0 ? 'sh.back.yes' : g === 0 ? 'sh.back.even' : 'sh.back.no', p: { k, m, a, g, d: -g }, back: g > 0 };
  }
  function leftOptions(s) {
    const g = C.LIVING, b = s.buffer, c = s.cash, after = b + c;
    const split = b < g && after > g, jar = E.goalOpen && E.goalOpen(s);
    const j = Math.min(C.SPEND_JOY_MAX, Math.round(c / C.SPEND_JOY_PER));
    const os = [];
    // the marked option is what the steady style picks (js/policy.js left): the whole cash into the fund until it holds its
    // goal (more is the 3-6 months advice), then savings
    // with a goal still open (js/goals.js) the rest goes to its jar
    os.push({ id: 'buffer', good: b < g, k: 'lf.buf', n: after < g ? 'lf.buf.n' : after === g ? 'lf.buf.full' : 'lf.buf.over', np: { b: after, g, x: after - g } });
    const jl = jar ? E.goalLeft(s) : 0, sjn = after - g > jl ? 'lf.splitJar.over' : 'lf.splitJar.n';
    if (split) os.push({ id: 'split', good: false, k: jar ? 'lf.splitJar' : 'lf.split', n: jar ? sjn : 'lf.split.n', np: { a: g - b, g, b: jar ? Math.min(after - g, jl) : after - g, x: after - g - jl } });
    // with a goal still open, the goal's jar is the steady pick once the fund holds its goal (js/goals.js)
    if (jar) os.push({ id: 'goal', good: b >= g, k: 'lf.goal.' + s.goal.id, p: { a: Math.min(c, E.goalLeft(s)) }, n: c > E.goalLeft(s) ? 'lf.goal.over' : 'lf.goal.n', np: { b: s.gpot + Math.min(c, E.goalLeft(s)), g: s.goal.target, x: c - E.goalLeft(s) } });
    os.push({ id: 'save', good: b >= g && !jar, k: 'lf.save', p: { a: c }, n: 'lf.save.n' });
    os.push({ id: 'spend', good: false, k: 'lf.spend', p: { a: c }, n: 'lf.spend.n', np: { j } });
    return os;
  }
  function removeCard(s, id) { const k = s.deck.indexOf(id); if (k < 0) return false; s.deck.splice(k, 1); return true; }

  // decisions at the start of some months
  const DIALOGS = {
    friend: {
      options: (s) => [
        { id: 'lend', ok: s.savings >= C.LOAN },
        { id: 'card', ok: true },
        { id: 'no', ok: true },
      ],
      apply(s, id) {
        s.st.friend = id;
        if (id === 'lend') { s.savings -= C.LOAN; s.loan = { month: s.mi + 2, amt: C.LOAN }; s.st.lent = true; }
        if (id === 'card') {
          const i = Math.round(C.LOAN * C.CARD_RATE), fee = E.advFee(C.LOAN);
          PS.L.owe(s, C.LOAN, 'friend'); PS.L.fee(s, fee + i, 'friend', true); s.st.advFees += fee; s.st.interest += i;
          s.loan = { month: s.mi + 2, amt: C.LOAN }; s.st.advFriend = true; E.limitCheck(s);
        }
        if (id === 'no') s.mind = Math.max(0, s.mind - 4);
      },
    },
    dip: {
      options: (s) => [{ id: 'hold', ok: true }, { id: 'sell', ok: true }],
      apply(s, id) {
        if (id === 'hold') s.st.held = true;
        if (id === 'sell') { const fee = Math.round(s.fund * C.EXIT_FEE); s.savings += s.fund - fee; s.st.exitFee = fee; s.fund = 0; s.st.sold = true; }
      },
    },
  };
  function dialogFor(s) {
    const t = s.year[s.mi].trait;
    if (t === 'friend') return 'friend';
    if (t === 'dip' && s.fund > 0) return 'dip';
    return null;
  }

  // zakatable wealth: savings, the funds and money put aside, less debts due now (card debt, pay-later instalments, late
  // bills), as most schools and the UAE Zakat Fund calculator deduct them
  function zakat(s) {
    const owed = s.debt + s.bnpl.reduce((a, b) => a + b.amt, 0) + s.overdue.reduce((a, b) => a + b.amt, 0);
    const wealth = Math.max(0, Math.round(s.savings + s.buffer + s.fund + s.sink + (s.gpot || 0) - owed));
    return { wealth, nisab: C.NISAB, pct: Math.min(100, Math.round((wealth / C.NISAB) * 100)), above: wealth >= C.NISAB };
  }

  // the line in the problems area when nothing is left to face right now, from the state itself: "all handled" only when no
  // problem is left this month, also none still to arrive (checked for every turn of every year by tools/regress.js S1)
  function clearLine(s) {
    if (E.alive(s).length) return null;
    const later = E.coming(s);
    if (later.length) return { k: 'foe.clearNext', p: { n: Math.min.apply(null, later.map((f) => f.at)) + 1 } };
    return { k: s.payLater ? 'foe.clearLate' : 'foe.clear', p: {} };
  }

  // the cards this month promises: the answer to each kind of problem (a quote to compare, a 24-hour wait, a talk with the
  // landlord) and the planned joy its intro names (trait.<x>.d). They come in the first hand (engine.js startMonth); a sale's
  // pay-later offer is put on top of the draw pile as well. tools/regress_text.js P2 checks both the hands and that every card
  // an intro or month line names is listed here.
  function promised(s) {
    const m = s.year[s.mi];
    const ids = m.foes.map((id) => E.ANSWER[PS.FOES[id].kind]).concat(m.cards || [], m.foes.map((id) => PS.FOES[id].offer));
    return ids.filter((id, i) => id && ids.indexOf(id) === i);
  }

  // Emergency fund pays: while a breakdown is on screen, or last month's card bill that cash cannot cover, and the fund has
  // money, this card is in the hand (it takes no draw and never joins the deck). Paying from the fund is the player's choice,
  // like paying from cash or putting it on the card; for the card bill it is a transfer from your own account before the due
  // date. With the fund empty and savings left, Break into savings takes its place (the goal is set back: mind -SAVE_WORRY)
  function fundCard(s) {
    const due = E.alive(s).some((f) => f.kind === 'shock' || (f.kind === 'card' && s.cash < f.amt));
    const want = !due ? '' : s.buffer > 0 ? 'fundpay' : s.savings + (s.gpot || 0) > 0 ? 'savepay' : '';
    ['fundpay', 'savepay'].forEach((id) => {
      const k = s.hand.findIndex((c) => c.id === id);
      if (id === want && k < 0) s.hand.unshift(E.mk(id, true));
      if (id !== want && k >= 0) s.used.push(s.hand.splice(k, 1)[0]);
    });
  }
  // money moved out of savings to pay something (why: gap = the late salary, or the problem's id): the goal is set back
  // when savings are not enough, the goal's jar is next (js/goals.js fromJar): your own money too, the goal set back
  function breakSavings(s, amt, why) {
    const v = Math.max(0, Math.min(s.savings, Math.round(amt)));
    const j = E.fromJar ? E.fromJar(s, Math.round(amt) - v) : 0, x = v + j;
    if (!x) return 0;
    s.savings -= v; s.mind = Math.max(0, s.mind - C.SAVE_WORRY);
    s.st.broke = (s.st.broke || []).concat([{ mi: s.mi, a: x, why, jar: j }]);
    return x;
  }
  // with cash in hand, a bill can always be paid: on the last turn (bills still open) and on the card bill's due turn, a
  // Pay from cash comes into the hand if none is there (from the draw or discard pile, else a one-off card). The card it
  // takes the place of goes back on top of the draw pile. Paying a bill is never down to the luck of the draw
  function payCard(s) {
    const last = s.turn === C.TURNS - 1 && E.alive(s).some((f) => f.kind === 'bill');
    const due = s.turn === C.CARD_DUE_TURN && E.alive(s).some((f) => f.kind === 'card');
    if (s.cash <= 0 || !(last || due) || s.hand.some((c) => c.id === 'pay')) return;
    let c = null;
    [s.draw, s.discard].some((pile) => { const k = pile.findIndex((x) => x.id === 'pay'); if (k >= 0) c = pile.splice(k, 1)[0]; return !!c; });
    if (!c) c = E.mk('pay', true);
    const keep = ['impulse', 'reminder', 'fundpay', 'savepay'];
    let out = -1;
    s.hand.forEach((x, h) => { if (keep.indexOf(x.id) < 0 && (out < 0 || !E.canPlay(s, h).ok)) out = h; });
    if (out >= 0 && s.hand.length >= s.handSize) s.draw.unshift(s.hand.splice(out, 1, c)[0]); else s.hand.push(c);
    s.st.payGiven = (s.st.payGiven || 0) + 1;
  }
  // a breakdown is settled (paid in full before it was due, or due now): how it was paid, and the worry when the card took
  // money the emergency fund could not cover (cash on hand predicts wellbeing: Ruberton, Gladstone and Lyubomirsky 2016).
  // Putting it on the card while the fund still holds that much is no worry: the fund can pay the card bill in full
  function shockDone(s, f) {
    const b = f.byFund || 0, m = f.byCash || 0, c = f.byCard || 0, v = f.bySav || 0;
    const w = c > s.buffer ? Math.min(C.SHOCK_WORRY, Math.ceil((c - s.buffer) / C.SHOCK_WORRY_PER)) : 0;
    if (w) s.mind = Math.max(0, s.mind - w);
    const x = { mi: s.mi, f: f.id, a: b + m + c + v, b, m, c, v, w, left: s.buffer, fo: s.st.fundOut.length };
    s.st.shocks.push(x);
    f.gone = true;
    return x;
  }

  // the log line a played card leaves (the battle log, the screen reader and tools/regress_text.js read the same line)
  function playLog(s, id, r) {
    s.log.push({ k: 'pl.' + id + (r.left ? '.left' : r.deal ? '.deal' : r.part ? '.part' : r.imp ? '.imp' : ''), p: Object.assign({ f: r.foe }, r) });
    if (r.foe && !E.alive(s).some((f) => f.id === r.foe)) s.log.push({ k: 'pl.cleared', p: { f: r.foe } });
  }
  // the card statement line of the month-end window (a zero statement reads as its own sentence, st.stmtLine.0). After a card
  // bill not paid in full the next one has no interest-free period, so the line says the interest comes even if it is paid in full
  function payLines(s) {
    const sm = E.statement(s);
    return [{ k: s.noGrace && sm.i > 0 ? 'st.stmtLine.ng' : 'st.stmtLine', p: { a: sm.debt, i: sm.i }, cls: sm.debt > 0 ? 'warn' : '' }];
  }
  // the card bill's due date (the middle of the month = the end of turn 2)
  function cardDue(s, ev) {
    const hitFoe = E.hitFoe;
    const cb = s.foes.find((f) => f.kind === 'card');
    if (!cb) { s.noGrace = false; return; } // nothing owed from last month: the free period is back
    if (cb.gone) return noGraceInterest(s, cb, ev);
    if (s.autopay) { // a direct debit for the full statement from your current account (cash), not from the emergency fund
      const x = Math.min(s.cash, cb.amt, s.debt); s.cash -= x;
      if (x) { PS.L.repay(s, x); hitFoe(s, cb, x); ev.push({ k: 'ev.dueAuto', p: { a: x } }); }
      if (cb.gone) return noGraceInterest(s, cb, ev);
    }
    const paid = cb.max - cb.amt;
    const i = Math.round(cb.max * C.CARD_RATE); // the whole statement loses its interest-free period
    PS.L.onStmt(s, i); s.st.interest += i; s.st.missed++;
    let fee = 0;
    if (paid < cb.min) { fee = C.CARD_LATE; PS.L.onStmt(s, fee); s.st.lateFees += fee; s.st.cardLate++; }
    cb.gone = true; cb.missed = true; s.noGrace = true;
    ev.push({ k: fee ? 'ev.dueLate' : 'ev.dueShort', p: { a: cb.max, b: paid, i, fee, d: Math.round(s.debt) } });
  }
  // the interest-free period applies only if the previous statement was paid in full (Emirates NBD and FAB key facts): a bill paid
  // in full right after a missed one still pays interest from each purchase date. Paying it in full brings the free period back
  function noGraceInterest(s, cb, ev) {
    if (!s.noGrace) return;
    s.noGrace = false;
    const i = Math.round(cb.max * C.CARD_RATE);
    PS.L.onStmt(s, i); s.st.interest += i; s.st.noGrace = (s.st.noGrace || 0) + i;
    ev.push({ k: 'ev.noGrace', p: { a: cb.max, i } });
  }

  // month end, step 1: what was left unpaid
  function closeBills(s) {
    const lines = [], alive = E.alive;
    alive(s).forEach((f) => {
      if (f.kind === 'bill' || f.kind === 'shock') {
        let left = f.amt;
        if (s.autopay) { const x = Math.min(s.cash, left); s.cash -= x; left -= x; if (x) lines.push({ k: 'st.autopay', p: { f: f.id, a: x } }); }
        if (left > 0) {
          s.overdue.push({ id: f.id, amt: left + C.BILL_LATE, n: (f.overdue || 0) + 1 });
          s.st.lateFees += C.BILL_LATE; PS.L.cost(s, C.BILL_LATE, 'overdue'); s.st.overdueN++; s.st.overdueFees += C.BILL_LATE;
          lines.push({ k: f.overdue ? 'st.unpaid2' : 'st.unpaid', p: { f: f.id, a: left, fee: C.BILL_LATE, b: left + C.BILL_LATE } });
        }
      } else if (f.kind === 'deal') {
        s.rentRaise += f.amt; s.st.rentRaised += f.amt * (11 - s.mi);
        lines.push({ k: 'st.rent', p: { a: f.amt } });
      }
      f.gone = true;
    });
    E.limitCheck(s);
    return lines;
  }


  Object.assign(PS.E, { rewardOffer, takeReward, spare, fundOver, buyCourse, leftOptions, coursePayback, removeCard, DIALOGS, dialogFor, zakat, clearLine, promised, fundCard, shockDone, playLog, payLines,
    breakSavings, payCard, cardDue, closeBills });
})();
