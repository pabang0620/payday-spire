/* Payday Spire - the year's goal (a named sinking fund) and the levels. Pure rules, no DOM, loaded after engine_more.js.
   A run without opts (PS.E.newGame(code)) has no goal and level 1, the core game every lesson check measures; the title
   screen always starts with a goal (js/goalui.js). Numbers: ../조사/zoud_UAE실데이터_2026-11-10.md.
   tools/regress_goals.js checks every goal x level: steady still ends first against every shortcut, and the goal verdict. */
(function () {
  const PS = (window.PS = window.PS || {});
  const C = PS.CONST, E = PS.E;
  const R10 = (n) => Math.round(n / 10) * 10;

  // wedding gold: an 18 g set of 22K gold (24K AED 497.25 a gram on 10 Nov 2026, the same rate as the nisab; 22K is 22/24 of
  // it), a making charge of 12% (shops ask 5-15%, it can be negotiated) and 5% VAT on gold jewellery with the making charge
  const GOLD_G = 18, GOLD_22 = (497.25 * 22) / 24, MAKE = 0.12, MAKE_ASKED = 0.07, VAT = 0.05;
  const gold = (mk) => R10(GOLD_G * GOLD_22 * (1 + mk) * (1 + VAT));
  PS.GOLD = { g: GOLD_G, make: MAKE, asked: MAKE_ASKED, full: gold(MAKE), cut: gold(MAKE) - gold(MAKE_ASKED) };

  // target: what the jar must hold at the end of month 12. ev: one problem of the goal's own in a set month (existing kinds,
  // so the answer cards and the rules are the ones the player knows). cards: the goal's own cards (jar from month 2, the
  // rest in the event month)
  PS.GOALS = {
    // send money home: 95% of residents send money abroad at least once a year (Visa survey, Khaleej Times 2025-09-10).
    // AED 6,000 for a brother's school year is an example value. In month 5 the family needs help with a hospital bill: the
    // emergency fund can pay it, without one the jar pays it
    home: { target: 6000, jar: 'jarhome', ev: { mi: 4, foe: 'famhelp' }, icon: 'give' },
    // a studio of your own: Deira studio AED 28,000 a year on 4 cheques: first cheque 7,000, deposit 5% 1,400, agent 5% 1,400,
    // Ejari about 120, DEWA deposit and connection about 2,130 = about AED 12,050 to move in (research notes 6). In month 9
    // a flatmate moves out and your share of the room goes up unless you find someone (Negotiate)
    studio: { target: 12050, jar: 'jarstudio', ev: { mi: 8, foe: 'flatmate' }, icon: 'home' },
    // wedding gold (see above). In month 11 the gold souk offers the set now on instalments; Ask the making charge cuts the price
    gold: { target: PS.GOLD.full, jar: 'jargold', ev: { mi: 10, foe: 'souk' }, cards: ['making'], icon: 'star' },
  };
  PS.GOAL_IDS = ['home', 'studio', 'gold'];
  PS.GOAL_DEFAULT = 'home';

  // levels: each one adds a real money pressure. Card limit (first-job limits are often 2-3 salaries, the game uses less so one
  // year can show the spiral), surprise costs (repair prices vary a lot in Dubai) and a rent rise at the renewal in month 4
  // (+200 or +300 on a AED 1,800 shared room, 11-17%). pay: a lower salary (kept at 0: tried at AED 300-500 less, a Dubai first
  // job is about AED 7,000, but then even steady habits burned out, so the level taught luck, not habits; tools/regress_goals.js)
  PS.LEVELS = [
    { limit: 10000, shock: 1, rent: 0, pay: 0 },
    { limit: 8000, shock: 1.25, rent: 0, pay: 0 },
    { limit: 7000, shock: 1.25, rent: 200, pay: 0 },
    { limit: 6000, shock: 1.5, rent: 300, pay: 0 },
  ];
  PS.LEVEL_RENT_MONTH = 3; // the rent rise comes with the renewal in month 4

  Object.assign(PS.CARDS, {
    jarhome: { cost: 1, amt: 500, jar: true, temp: true, icon: 'give', tone: 'save' },
    jarstudio: { cost: 1, amt: 500, jar: true, temp: true, icon: 'home', tone: 'save' },
    jargold: { cost: 1, amt: 500, jar: true, temp: true, icon: 'star', tone: 'save' },
    making: { cost: 1, cut: PS.GOLD.cut, temp: true, icon: 'search', tone: 'cash' },
  });
  Object.assign(PS.FOES, {
    famhelp: { kind: 'shock', amt: 1000, hit: 2, icon: 'give', set: true }, // example value; set: not a repair price, the level does not raise it
    flatmate: { kind: 'deal', amt: 250, art: 'enemy_rent', icon: 'key' }, // your share of the room, +250 a month (example value)
    souk: { kind: 'sale', pull: 2, adds: 1, art: 'enemy_sale', icon: 'star' }, // a pull on the wallet, not a weight on the mood (month 11 has the White Friday sale too)
  });

  const newGame0 = E.newGame;
  // opts: { goal: 'home' | 'studio' | 'gold' | null, lv: 1-4 }
  function newGame(code, opts) {
    const s = newGame0(code), o = opts || {};
    s.lv = Math.max(1, Math.min(PS.LEVELS.length, Math.round(+o.lv || 1)));
    const L = PS.LEVELS[s.lv - 1];
    s.limit = L.limit; s.payCut = L.pay;
    s.st.jarOut = 0; s.st.jarIn = 0;
    const g = PS.GOALS[o.goal];
    if (g) {
      s.goal = { id: o.goal, target: g.target, cut: 0 }; s.gpot = 0;
      const m = s.year[g.ev.mi];
      m.foes = m.foes.concat([g.ev.foe]);
      if (g.cards) m.cards = (m.cards || []).concat(g.cards);
    }
    return s;
  }
  const goalOpen = (s) => !!s.goal && s.gpot < s.goal.target;
  const goalLeft = (s) => (s.goal ? Math.max(0, s.goal.target - s.gpot) : 0);
  // the sinking fund sum: what is still missing, shared over the months left (this one included), rounded up to AED 10
  const perMonth = (s) => { const m = Math.max(1, 12 - Math.min(s.mi, 11)); return Math.ceil(goalLeft(s) / m / 10) * 10; };

  // start of a month (engine.js startMonth, after the log is cleared): the rent rise of the level comes with the renewal in month 4
  function preMonth(s) {
    const L = PS.LEVELS[(s.lv || 1) - 1];
    if (L.rent && s.mi === PS.LEVEL_RENT_MONTH) { s.rentRaise += L.rent; s.st.lvRent = L.rent; s.log.push({ k: 'pd.lvRent', p: { a: L.rent } }); }
  }
  // this month's problems are on screen: the level's surprise costs are bigger
  function foesHook(s) {
    const x = PS.LEVELS[(s.lv || 1) - 1].shock;
    if (x !== 1) s.foes.forEach((f) => { if (f.kind === 'shock' && !f.lv && !PS.FOES[f.id].set) { f.amt = f.max = R10(f.amt * x); f.lv = true; } });
  }
  // the jar card is in the hand (it takes no draw and never joins the deck) on a turn when this month's bills, card bill and
  // surprise costs are all dealt with and there is cash: bills first, then the cushion, then the goal (a sinking fund).
  // One transfer a turn (a standing amount, not every dirham the moment it comes in)
  function jarCard(s) {
    const id = s.goal ? PS.GOALS[s.goal.id].jar : null, now = s.mi * 10 + s.turn;
    const want = !!id && s.mi > 0 && goalOpen(s) && s.cash > 0 && s.jarAt !== now && !E.alive(s).some((f) => f.kind !== 'sale' && f.kind !== 'deal') && !E.coming(s).length;
    const k = s.hand.findIndex((c) => PS.CARDS[c.id].jar);
    if (want && k < 0) s.hand.unshift(E.mk(id, true));
    if (!want && k >= 0) s.used.push(s.hand.splice(k, 1)[0]);
  }
  const fundCard0 = E.fundCard;
  E.fundCard = function (s) { fundCard0(s); jarCard(s); };
  // the goal cards: can they be played now?
  function canMore(s, c) {
    const d = PS.CARDS[c.id];
    if (d.jar && s.cash <= 0) return { ok: false, why: 'cash' };
    if (d.jar && !goalOpen(s)) return { ok: false, why: 'goal' };
    if (c.id === 'making' && (!s.goal || s.goal.id !== 'gold' || s.goal.cut)) return { ok: false, why: 'goal' };
    return null;
  }
  function playMore(s, c, d, r) {
    if (d.jar) { const x = Math.min(d.amt, s.cash, goalLeft(s)); s.cash -= x; s.jarAt = s.mi * 10 + s.turn; s.gpot += x; s.st.jarIn += x; r.a = x; r.b = s.gpot; r.g = s.goal.target; }
    if (c.id === 'making') {
      s.goal.cut = d.cut; s.goal.target -= d.cut; r.a = d.cut; r.g = s.goal.target;
      const back = Math.max(0, s.gpot - s.goal.target); // a jar already full: what the lower price leaves over goes back to savings
      if (back) { s.gpot -= back; s.savings += back; s.st.jarBack = (s.st.jarBack || 0) + back; }
    }
  }
  // the leftover cash into the jar at month end (engine.js finish)
  function toJar(s, a, lines) {
    const x = Math.min(a, goalLeft(s));
    s.gpot += x; s.cash -= x; s.st.jarIn += x;
    lines.push({ k: 'st.toJar', p: { a: x, b: s.gpot, g: s.goal.target } });
    if (s.cash > 0) { lines.push({ k: 'st.toSave', p: { a: s.cash } }); s.savings += s.cash; }
  }
  // when savings are not enough (Break into savings, the late salary), the jar is next: it is your money too
  function fromJar(s, amt) {
    const x = Math.max(0, Math.min(s.gpot || 0, Math.round(amt)));
    if (x) { s.gpot -= x; s.st.jarOut += x; }
    return x;
  }

  // the year's verdict for the goal: reached when the jar holds the target at the end of month 12
  function goalResult(s) {
    if (!s.goal) return null;
    const reached = s.gpot >= s.goal.target;
    return { id: s.goal.id, reached, pot: s.gpot, target: s.goal.target, short: reached ? 0 : s.goal.target - s.gpot, out: s.st.jarOut || 0, cut: s.goal.cut };
  }

  // what a run plays with, for the comparison years on the end screen ("the same year with steady habits")
  PS.runOpt = (s) => ({ goal: s && s.goal ? s.goal.id : null, lv: (s && s.lv) || 1 });
  PS.runKey = (s) => s.code + (s.goal ? '.' + s.goal.id : '') + ((s.lv || 1) > 1 ? '.L' + s.lv : '');

  Object.assign(E, { newGame, preMonth, foesHook, canMore, playMore, toJar, fromJar, goalOpen, goalLeft, perMonth, goalResult });
})();
