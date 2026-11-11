// The extra play styles the lesson checks use (tools/regress.js, tools/regress_why.js, tools/regress_design.js,
// tools/regress_lesson.js). Load after js/policy.js: require('./policies.js')(PS)
// each style must end at or below this share of steady's net worth, on every code (tools/regress.js; README via tools/doc_numbers.js)
// (swipeAll 0.95 since 2026-11-11: an Impulse buy a swipe lets in can now be walked away from, for focus and mind)
const MAX_SHARE = { nothing: 0.5, swipeAll: 0.95, noBuffer: 0.9, impulse: 0 };
// the shortcut styles a player who plays for the score would try (tools/regress_lesson.js): none may end above steady on any code
const SHORTCUTS = ['minPay', 'gigMax', 'fundCard', 'skipJoy', 'billDodge', 'maxer'];
module.exports = function (PS) {
  const P = PS.POLICY, E = PS.E, C = PS.CONST;
  const find = (s, id) => s.hand.findIndex((c, h) => c.id === id && E.canPlay(s, h).ok);
  const tryp = (s, id, t) => { const h = find(s, id); return h >= 0 ? { h, t: t == null ? -1 : t } : null; };
  const cardBill = (s) => E.alive(s).find((f) => f.kind === 'card');
  const JOY = ['iftar', 'eidiya', 'sadaqah', 'treat'];
  // a style's move with some cards held back: refuse(s, card id, target) says no to a move, and the next one is asked for
  function without(base, refuse) {
    return function (s) {
      const orig = s.hand, keep = orig.map((c, h) => h);
      for (let k = 0; k < orig.length; k++) {
        s.hand = keep.map((h) => orig[h]);
        const a = base(s);
        s.hand = orig;
        if (!a) return null;
        const h = keep[a.h];
        if (!refuse(s, orig[h].id, a.t)) return { h, t: a.t };
        keep.splice(a.h, 1);
      }
      return null;
    };
  }
  // every bill and breakdown on the card (0 focus), then steady habits, so the card bill is still paid in full by its due date. The same
  // planned joy as steady (iftar, Eid gifts) when the cash is there, so the two years differ only in how bills are paid
  P.swipeAll = Object.assign({}, P.steady, {
    turn(s) {
      for (const id of ['iftar', 'eidiya']) { const h = find(s, id); if (h >= 0) return { h, t: -1 }; }
      const b = E.alive(s).find((f) => f.kind === 'bill' || f.kind === 'shock'); // breakdowns too, now that they can go on the card
      const c = find(s, 'compare'); // the same price cut as steady first: the two years differ only in how bills are paid
      if (b && b.kind === 'shock' && c >= 0) return { h: c, t: b.i };
      const h = find(s, 'swipe');
      if (b && h >= 0) return { h, t: b.i };
      return P.steady.turn(s);
    },
  });
  // steady, but never builds an emergency fund: no top-up cards, leftover cash always to savings
  P.noBuffer = Object.assign({}, P.steady, {
    turn(s) { const a = P.steady.turn(s); return a && s.hand[a.h].id === 'buffer' ? null : a; },
    left: () => 'save',
  });
  P.nothing = P.idle; // plays no card all year, saves the leftover

  // ---- shortcut styles (tools/regress_lesson.js) ----
  // only the minimum on the card bill, the focus saved goes to the rest of steady's moves
  const minRefuse = (s, id, t) => {
    const cb = cardBill(s);
    if (id === 'paycard' || id === 'snowball') return true;
    if (cb && t === cb.i && (id === 'pay' || id === 'fundpay' || id === 'savepay')) return cb.max - cb.amt >= cb.min;
    return false;
  };
  // the minimum itself is paid as a bank transfer of just that amount (Pay from cash pays the whole bill, so the style plays it
  // with only the minimum in the account), before the due date; nothing more goes to the card
  const minTurn = without(P.steady.turn, minRefuse);
  P.minPay = Object.assign({}, P.steady, {
    turn(s) {
      const cb = cardBill(s), h = find(s, 'pay');
      if (cb && h >= 0 && E.aims(s, s.hand[h]).indexOf(cb.i) >= 0 && cb.max - cb.amt < cb.min) {
        const keep = s.cash - Math.min(s.cash, cb.min - (cb.max - cb.amt));
        s.cash -= keep; E.play(s, h, cb.i); s.cash += keep;
      }
      return minTurn(s);
    },
  });
  // side gigs whenever the mind allows, no planned joy, small treats only near burnout, the course at once
  const gigTurn = (s) => {
    let a;
    if (s.mind >= 10 && (a = tryp(s, 'sidegig'))) return a;
    if (s.mind < 8 && (a = tryp(s, 'treat'))) return a;
    return without(P.steady.turn, (x, id) => JOY.indexOf(id) >= 0)(s);
  };
  const gigReward = (s, offers) => (offers.indexOf('sidegig') >= 0 ? 'sidegig' : P.steady.reward(s, offers));
  const shopNow = (s) => (!s.course && E.spare(s) >= C.COURSE_COST ? { type: 'course' } : P.steady.shop(s));
  P.gigMax = Object.assign({}, P.steady, { turn: gigTurn, reward: gigReward, shop: shopNow });
  // the card bill from the emergency fund first (no focus), and the fund filled again from leftover cash at month end
  const fundFirst = (base) => (s) => { const cb = cardBill(s); let a; if (cb && (a = tryp(s, 'fundpay', cb.i))) return a; return base(s); };
  P.fundCard = Object.assign({}, P.steady, { turn: fundFirst(P.steady.turn) });
  // steady without the planned joy (iftar, Eid gifts, sadaqah, small treats)
  P.skipJoy = Object.assign({}, P.steady, { turn: without(P.steady.turn, (x, id) => JOY.indexOf(id) >= 0) });
  // small bills left to run late on purpose, the focus goes to earning
  const dodge = (s, id, t) => { const f = s.foes[t]; return !!f && f.kind === 'bill' && !f.overdue && f.amt < 500 && (id === 'pay' || id === 'swipe'); };
  P.billDodge = Object.assign({}, P.steady, {
    turn: (s) => { let a; if (s.mind >= 14 && (a = tryp(s, 'sidegig'))) return a; return without(P.steady.turn, dodge)(s); },
    reward: gigReward,
  });
  // all of the above at once (the score player of review/audit_ux.md #1)
  P.maxer = Object.assign({}, P.gigMax, {
    turn: fundFirst((s) => { const m = P.minPay.turn; let a; if (s.mind >= 10 && (a = tryp(s, 'sidegig'))) return a; return without((x) => (m(x) && gigTurn(x)), minRefuse)(s); }),
  });
  return ['steady', 'nothing', 'swipeAll', 'noBuffer', 'impulse'];
};
module.exports.MAX_SHARE = MAX_SHARE;
module.exports.SHORTCUTS = SHORTCUTS;
