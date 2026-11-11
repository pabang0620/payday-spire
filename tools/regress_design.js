// Month design checks for tools/regress.js: every month gives the player something to decide.
// A year is played like PS.simYear, and at the start of each turn the hand is looked at:
//   choice turn: at least two different moves on the problems (cards aimed at a problem on screen, a top-up when a
//                breakdown is coming, planned joy), or a move on a problem that competes for focus with earning or saving
//                (the turn cannot do it all);
//   top-up only: the only useful move is an emergency fund top-up (the turn the 4th judge counted as empty);
//   empty: nothing on screen to face.
// M1 every month of every code has a choice turn (steady habits), M2 months 1-4 have at most 2 empty or top-up-only turns,
// M3 months 6-12 have nothing to face on at most 15% of turns (the second half was quiet: review/audit_ux.md #4, #5),
// H1 from month 2 no fresh hand holds more than C.HAND_SAME copies of one card while another kind waits in the piles
// (judge_B_final 1-2: four Pay from cash and nothing else; js/engine.js varyHand).
module.exports = function (PS, codes, ok) {
  const E = PS.E, C = PS.CONST;
  const AIMED = ['pay', 'swipe', 'compare', 'negotiate', 'wait', 'refuse', 'paycard', 'snowball', 'fundpay'];
  const JOY = ['iftar', 'eidiya', 'bnploffer'];
  const FILL = ['buffer', 'lunch', 'metro', 'sink', 'invest', 'sidegig', 'treat', 'sadaqah'];
  function look(s) {
    const foes = E.alive(s);
    if (!foes.length) return 'empty';
    const shock = foes.find((f) => f.kind === 'shock');
    const moves = [];
    s.hand.forEach((c, h) => {
      if (!E.canPlay(s, h).ok) return;
      const id = c.id;
      if (AIMED.indexOf(id) >= 0 && (E.aims(s, c).length || id === 'paycard' || id === 'snowball')) moves.push(id);
      else if (JOY.indexOf(id) >= 0) moves.push(id);
      else if (id === 'buffer' && shock && s.buffer < shock.amt) moves.push(id);
    });
    const ids = moves.filter((x, i) => moves.indexOf(x) === i);
    // other good uses of the same focus (earn, save, top up): a move on a problem that competes with them is a choice too
    const other = s.hand.filter((c, h) => FILL.indexOf(c.id) >= 0 && moves.indexOf(c.id) < 0 && E.canPlay(s, h).ok);
    const cost = moves.concat(other.map((c) => c.id)).reduce((a, id) => a + PS.CARDS[id].cost, 0);
    if (ids.length >= 2 || (ids.length && !(ids.length === 1 && ids[0] === 'buffer') && cost > s.focus)) return 'choice';
    if (ids.length === 1 && ids[0] === 'buffer') return 'topup';
    return ids.length ? 'one' : 'none';
  }
  const same = [];
  function handRule(s, code) {
    if (s.year[s.mi].tut) return;
    const free = (c) => !PS.CARDS[c.id].curse && !PS.CARDS[c.id].temp, n = {};
    s.hand.forEach((c) => { if (free(c)) n[c.id] = (n[c.id] || 0) + 1; });
    const over = Object.keys(n).find((id) => n[id] > C.HAND_SAME);
    if (over && s.draw.concat(s.discard).some((c) => free(c) && (n[c.id] || 0) < C.HAND_SAME)) same.push(code + ' m' + (s.mi + 1) + ' t' + (s.turn + 1) + ' ' + over + ' x' + n[over]);
  }
  function playYear(code, name) {
    const P = PS.POLICY[name], s = E.newGame(code), months = [];
    E.startMonth(s);
    for (;;) {
      const dk = E.dialogFor(s);
      const m = dk ? ['dialog'] : []; months.push(m); // a decision window (lend to a friend, hold the fund in the dip) is a choice
      if (dk) E.DIALOGS[dk].apply(s, P.dialog(s, dk));
      let res = { done: 'turn' };
      while (res.done === 'turn') {
        m.push(look(s)); handRule(s, code);
        let guard = 0, a;
        while ((a = P.turn(s)) && guard++ < 30 && !s.over) E.play(s, a.h, a.t);
        if (s.over) break;
        res = E.endTurn(s);
      }
      if (s.over) break;
      E.closeBills(s); E.finish(s, P.left(s));
      if (s.mi < 11) {
        const sh = PS.SHOP_AFTER.indexOf(s.mi) >= 0 ? P.shop(s) : null;
        if (sh && sh.type === 'course') E.buyCourse(s); else if (sh && sh.type === 'remove') E.removeCard(s, sh.id);
        else E.takeReward(s, P.reward(s, E.rewardOffer(s)));
      }
      if (!E.nextMonth(s)) break;
    }
    return months;
  }
  const noChoice = [], quiet = [];
  let late = 0, lateEmpty = 0;
  codes.forEach((code) => {
    const months = playYear(code, 'steady');
    months.forEach((m, i) => { if (m.indexOf('choice') < 0 && m.indexOf('dialog') < 0) noChoice.push(code + ' m' + (i + 1) + ' ' + m.join('/')); });
    const q = months.slice(0, 4).reduce((a, m) => a + m.filter((x) => x === 'empty' || x === 'topup').length, 0);
    if (q > 2) quiet.push(code + ' ' + q + ' (' + months.slice(0, 4).map((m) => m.join('/')).join(' | ') + ')');
    months.slice(5).forEach((m) => m.forEach((x) => { if (x !== 'dialog') { late++; if (x === 'empty') lateEmpty++; } }));
  });
  // M4 the last turn of a month: months 1 and 10 always have something on it (judge_B_final2 5-4: the moving van, the car
  // service), and no more than 3 months leave it empty on more than half of the codes
  const lastEmpty = Array(12).fill(0), m4 = [];
  codes.forEach((code) => playYear(code, 'steady').forEach((m, i) => {
    const t = m.filter((x) => x !== 'dialog');
    if (t[t.length - 1] === 'empty') { lastEmpty[i]++; if (i === 0 || i === 9) m4.push(code + ' m' + (i + 1)); }
  }));
  const wideEmpty = lastEmpty.filter((n) => n > codes.length / 2).length;
  ok('M4 last turn: months 1 and 10 never empty, ' + wideEmpty + ' months empty on most codes (at most 3)', !m4.length && wideEmpty <= 3, m4.slice(0, 4).join(', ') + ' per month ' + lastEmpty.join(' '));
  const share = late ? lateEmpty / late : 0;
  ok('M1 every month has a choice turn (' + codes.length + ' codes x 12)', !noChoice.length, noChoice.slice(0, 6).join(', '));
  ok('M2 months 1-4: at most 2 empty or top-up-only turns', !quiet.length, quiet.slice(0, 4).join(', '));
  ok('M3 months 6-12: nothing to face on ' + Math.round(share * 100) + '% of turns (at most 15%)', share <= 0.15, lateEmpty + ' of ' + late + ' turns');
  ok('H1 no fresh hand with more than ' + C.HAND_SAME + ' of one card while another kind waits (' + codes.length + ' codes)', !same.length, same.slice(0, 4).join(', '));
  return { playYear, look, C };
};
