/* Payday Spire - three play styles. Used by the end screen ("the same year with steady habits") and by the
   headless playtests (tools/playtest.py), which press the same buttons a player would.
   steady: pays bills from cash, keeps an emergency fund, waits out sales, pays the card in full.
   impulse: saves focus by putting bills on the card, takes pay-later and cash advances, pays only the card minimum.
   idle: ends every turn without playing a card. */
(function () {
  const PS = (window.PS = window.PS || {});
  const C = PS.CONST;
  const E = () => PS.E;

  const find = (s, id) => s.hand.findIndex((c, h) => c.id === id && E().canPlay(s, h).ok);
  const bills = (s) => E().alive(s).filter((f) => f.kind === 'bill' || f.kind === 'card');
  const shocks = (s) => E().alive(s).filter((f) => f.kind === 'shock');
  const cardBill = (s) => E().alive(s).find((f) => f.kind === 'card');
  const sales = (s) => E().alive(s).filter((f) => f.kind === 'sale');

  // the bill to pay first: a shock about to hit, a growing bill, then the biggest
  function firstBill(s) {
    const b = bills(s);
    if (!b.length) return null;
    const score = (f) => {
      const d = PS.FOES[f.id];
      if (f.kind === 'card') return 4000;
      if (f.kind === 'shock') return 3000 - (d.hit - s.turn) * 1000 + f.amt / 10;
      if (d.grow) return 2500;
      return f.amt;
    };
    return b.slice().sort((x, y) => score(y) - score(x))[0];
  }

  const steady = {
    turn(s) {
      const tryp = (id, t) => { const h = find(s, id); return h >= 0 ? { h, t: t == null ? -1 : t } : null; };
      let a;
      if ((a = tryp('autosave')) || (a = tryp('autopay'))) return a;
      // last month's card bill before its due date comes first: from cash, then the emergency fund
      const cb = cardBill(s);
      if (cb && ((s.cash >= cb.amt && (a = tryp('pay', cb.i))) || (a = tryp('paycard')) || (s.cash > 0 && (a = tryp('pay', cb.i))))) return a;
      const sale = sales(s)[0];
      if (s.hand.some((c) => c.id === 'impulse') || sale) {
        if ((a = tryp('wait', sale ? sale.i : -1))) return a;
        if (sale && (a = tryp('refuse', sale.i))) return a;
      }
      const reserve = bills(s).concat(E().coming(s)).reduce((x, f) => x + f.amt, 0); // with the bills still to come this month
      const dueNow = s.turn === C.CARD_DUE_TURN && cardBill(s); // the card bill comes first on its due turn
      for (const id of dueNow ? [] : ['iftar', 'eidiya']) {
        const h = find(s, id);
        if (h >= 0 && s.cash >= PS.CARDS[id].amt + Math.min(reserve, 600)) return { h, t: -1 };
      }
      // a breakdown is coming: cut its price, then make sure the emergency fund can take it
      const sh = shocks(s)[0];
      if (sh && (a = tryp('compare', sh.i))) return a;
      if (sh && s.buffer < sh.amt && (a = tryp('buffer'))) return a;
      const deal = E().alive(s).find((f) => f.kind === 'deal');
      if (deal && (a = tryp('negotiate', deal.i))) return a;
      const b = firstBill(s);
      if (b) {
        if (b.kind !== 'card' && b.amt >= 600 && ((a = tryp('negotiate', b.i)) || (a = tryp('compare', b.i)))) return a;
        // the move-in month: on turn 1, as the guide says, pay from cash and put the rest on the card to keep cash for the
        // deposit; after that the card goes first while cash cannot cover the month's bills (with the moving van still to
        // come), so the van can be paid whatever the draw, and the card bill is paid in full in month 2
        if (s.mi === 0 && b.kind === 'bill') {
          const sw = PS.CARDS.swipe.amt, more = E().coming(s).length > 0;
          const short = bills(s).concat(E().coming(s)).reduce((x, f) => x + f.amt, 0) - s.cash; // what cash cannot cover this month
          if ((s.turn === 0 ? b.amt <= sw && b.amt < b.max && more : short > 0) && (a = tryp('swipe', b.i))) return a;
        }
        if (s.cash > 0 && (a = tryp('pay', b.i))) return a;
        if (s.cash < b.amt && (a = tryp('lunch'))) return a;
        // no cash left on the last turn (or in the move-in month): the card is fine if the statement is paid in full
        if ((s.turn === C.TURNS - 1 || (s.mi === 0 && s.cash <= 0)) && b.kind !== 'card' && (a = tryp('swipe', b.i))) return a;
      }
      // a breakdown due at the end of this turn: the emergency fund pays it, then cash, then savings (before money is put aside)
      const due = shocks(s).find((f) => PS.FOES[f.id].hit === s.turn);
      if (due && ((a = tryp('fundpay', due.i)) || (s.cash > 0 && (a = tryp('pay', due.i))) || (a = tryp('savepay', due.i)))) return a;
      // an Impulse buy with no Wait 24 hours to drop it: walk away from it (1 focus)
      if (s.mind >= steady.walkMind && (a = tryp('impulse'))) return a;
      // (card money spent this month is not paid early: it is due next month, interest free when paid in full)
      if (s.mi < PS.FLIGHT_MONTH && s.sink < 2200 && (a = tryp('sink'))) return a;
      if ((a = tryp('making'))) return a; // the wedding gold goal (js/goals.js): ask for a lower making charge
      // the emergency fund is filled from leftover cash at month end; small treats keep the mind away from burnout
      if (s.mind < 30 && (a = tryp('treat'))) return a;
      if (s.mind < 30 && (a = tryp('sadaqah'))) return a;
      // the goal's jar (js/goals.js), once this month's bills are paid, the emergency fund holds its goal and the mood is not low:
      // a sinking fund comes after the bills, the cushion and a rested mind, never before them
      if (s.goal && s.buffer >= C.LIVING && s.mind >= 24 && (a = tryp(PS.GOALS[s.goal.id].jar))) return a;
      if ((a = tryp('budget'))) return a;
      if (s.savings >= 5000 && (a = tryp('invest'))) return a;
      if ((a = tryp('lunch'))) return a;
      // a side gig now and then, when rested (a steady habit, not a way of life)
      if (s.mind >= steady.gigMind && (a = tryp('sidegig'))) return a;
      if (s.mind > 24 && (a = tryp('metro'))) return a;
      if (s.bnpl.length && (a = tryp('snowball'))) return a;
      // the card bill still open on its due turn (not enough cash): the emergency fund pays the rest, then savings
      if (cb && s.turn === C.CARD_DUE_TURN && ((a = tryp('fundpay', cb.i)) || (a = tryp('savepay', cb.i)))) return a;
      return null;
    },
    gigMind: 34,
    walkMind: 30,
    // the emergency fund first (all of it while the fund is under its goal: a cushion above one month keeps the mood calm
    // after a surprise cost), then the year's goal while its jar is open (js/goals.js), then savings
    left: (s) => (s.buffer < C.LIVING ? 'buffer' : E().goalOpen && E().goalOpen(s) ? 'goal' : 'save'),
    pref: ['autosave', 'autopay', 'sink', 'sidegig', 'negotiate', 'compare', 'wait', 'buffer', 'pay', 'lunch', 'budget', 'invest', 'sadaqah', 'treat', 'paycard', 'refuse', 'snowball', 'metro'],
    reward(s, offers) {
      const pick = steady.pref.find((id) => offers.indexOf(id) >= 0 && !(id === 'sink' && s.mi >= PS.FLIGHT_MONTH - 1));
      return pick || null;
    },
    shop(s) {
      // keep a month of costs set aside (emergency fund plus savings) after paying for the course, and buy it only while the
      // raise still pays it back this year (after month 9 it would not: 3 x 300 is less than 1,200)
      const back = E().coursePayback(s).back; // the same rule as the shop's payback line
      if (!s.course && back && E().spare(s) >= C.COURSE_COST && s.savings + s.buffer >= C.COURSE_COST + C.LIVING) return { type: 'course' };
      if (s.deck.indexOf('impulse') >= 0) return { type: 'remove', id: 'impulse' };
      return null; // keeps one Put it on the card for a short month
    },
    dialog(s, kind) { return kind === 'friend' ? (s.savings >= C.LOAN && s.savings + s.buffer >= C.LOAN + C.LIVING ? 'lend' : 'no') : 'hold'; },
  };

  const impulse = {
    turn(s) {
      const tryp = (id, t) => { const h = find(s, id); return h >= 0 ? { h, t: t == null ? -1 : t } : null; };
      let a;
      if ((a = tryp('bnploffer'))) return a;
      if (s.cash < 600 && (a = tryp('cashadv'))) return a;
      // only the minimum on the card bill, just before it is due
      const cb = cardBill(s);
      if (cb && s.turn === C.CARD_DUE_TURN && cb.max - cb.amt < cb.min && (a = tryp('pay', cb.i))) return a;
      for (const id of ['iftar', 'eidiya']) if ((a = tryp(id))) return a;
      const b = firstBill(s);
      if (b && (a = tryp('swipe', b.i))) return a;
      if ((a = tryp('treat')) || (a = tryp('sidegig'))) return a;
      if (b && s.turn === C.TURNS - 1 && (a = tryp('pay', b.i))) return a;
      return null;
    },
    left: () => 'spend',
    reward(s, offers) {
      const pref = ['cashadv', 'treat', 'swipe', 'sidegig'];
      return pref.find((id) => offers.indexOf(id) >= 0) || offers[0];
    },
    shop: () => null,
    dialog: (s, kind) => (kind === 'friend' ? 'card' : 'sell'),
  };

  const idle = {
    turn: () => null,
    left: () => 'save',
    reward: () => null,
    shop: () => null,
    dialog: (s, kind) => (kind === 'friend' ? 'no' : 'hold'),
  };

  PS.POLICY = { steady, impulse, idle };

  // a whole year without the screen (end screen comparison and tools/sim.js)
  // opts: the run's goal and level (js/goals.js; none = the core game every lesson check measures)
  PS.simYear = function (code, name, opts) {
    const P = PS.POLICY[name];
    const s = E().newGame(code, opts);
    E().startMonth(s);
    for (;;) {
      const dk = E().dialogFor(s);
      if (dk) E().DIALOGS[dk].apply(s, P.dialog(s, dk));
      let res = { done: 'turn' };
      while (res.done === 'turn') {
        let guard = 0, a;
        while ((a = P.turn(s)) && guard++ < 30 && !s.over) E().play(s, a.h, a.t);
        if (s.over) break;
        res = E().endTurn(s);
      }
      if (s.over) break;
      E().closeBills(s);
      if (s.over) break;
      E().finish(s, P.left(s));
      if (s.over) break;
      if (s.mi < 11) {
        // after months 3, 6 and 9 the same window also offers the course and the coach: one pick in all
        const sh = PS.SHOP_AFTER.indexOf(s.mi) >= 0 ? P.shop(s) : null;
        if (sh && sh.type === 'course') E().buyCourse(s);
        else if (sh && sh.type === 'remove') E().removeCard(s, sh.id);
        else E().takeReward(s, P.reward(s, E().rewardOffer(s)));
      }
      if (!E().nextMonth(s)) break;
    }
    return s;
  };
})();
