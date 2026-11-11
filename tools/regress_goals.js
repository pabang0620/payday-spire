// The year's goal and the levels (js/goals.js, js/goalui.js) for tools/regress.js. A goal or a harder level must not turn the
// lesson around: on every goal x level steady habits still end first, and the goal's verdict is told right.
//   GL1 every goal x level (N codes): steady's average net worth above every play style (fundCard, the same habit with the
//       fund card first, may tie: at most 1% above), and below level 4 no shortcut (tools/policies.js SHORTCUTS) above steady
//       by more than LUCK on any code (the R4b rule of tools/regress_lesson.js). Level 4 is a hard year where the mood is
//       the limit and a fixed bot can burn out on a bad draw: there only the averages count (the codes above are printed)
//   GL2 steady never freezes the card on any goal x level and never burns out below level 4; at level 1 its interest and fees
//       stay near zero
//   GL3 the levels are real pressure: card limit, bigger surprise costs and the rent rise at renewal are applied, and steady's
//       average net worth falls level by level for every goal
//   GL4 the goal's verdict: reached exactly when the jar holds the target, the jar never above it, money in minus money out =
//       the jar, the end screen sentence (en/ar) names the jar, the target and what is short; steady reaches the first goal
//       at level 1 on nearly every code and reaches each goal at least as often as any shortcut
//   GL5 the month-end window with a goal: the marked option is the steady pick, the fund-to-its-goal-rest-to-the-jar option adds
//       up, no zero amount or open placeholder in its sentences (en/ar)
//   GL6 a class code plays level 1 and the class goal from the link; with storage blocked the game still starts (level 1)
//   GL8 the end screen's comparison names the goal for you and for steady habits on the same year: the line's case (reached or
//       short, each side) is the two runs' verdicts, the short amounts are theirs, no line without a goal (en/ar)
//   GL9 the missed-goal savings line shows exactly when savings plus the emergency fund cover what is short (no frozen card,
//       no card debt left); the "spare" sentence when savings and the fund above its goal cover it, otherwise the cost of
//       breaking the fund (what it keeps, less than a month of costs); never on a reached goal or a run without one (en/ar)
// Writes tools/regress_goals.json (the table) for DESIGN.md.
const fs = require('fs'), path = require('path');
const N = 30, LUCK = 0.05;
module.exports = function (PS, ok, STYLES) {
  const E = PS.E, pol = require('./policies.js'), lang0 = PS.lang;
  // js/goalui.js reads the page and storage only when called: a stand-in page is enough to load it
  const keep = { document: global.document, location: global.location, localStorage: global.localStorage };
  if (!PS.goalui) { global.document = { addEventListener() {} }; require(path.join(__dirname, '..', 'js', 'goalui.js')); Object.assign(global, keep); }
  const styles = STYLES.slice(1).concat(pol.SHORTCUTS);
  const r = PS.rng(4242), codes = [];
  while (codes.length < N) codes.push(Array.from({ length: 6 }, () => PS.CODE_CHARS[Math.floor(r() * PS.CODE_CHARS.length)]).join(''));
  const avgBad = [], luck = [], hard = [], st2 = [], verdict = [], fall = [], reachBad = [], table = [];
  PS.GOAL_IDS.forEach((g) => {
    let prev = Infinity;
    PS.LEVELS.forEach((L, i) => {
      const lv = i + 1, opt = { goal: g, lv }, sum = { steady: 0 }, reach = { steady: 0 }, fees = { steady: 0 };
      styles.forEach((p) => { sum[p] = 0; reach[p] = 0; fees[p] = 0; });
      codes.forEach((code) => {
        const sd = PS.simYear(code, 'steady', opt), n0 = E.netWorth(sd);
        // level 4 (a hard year) may wear even steady habits out; a frozen card never
        if (sd.over === 'limit' || (sd.st.burnouts && lv < PS.LEVELS.length)) st2.push(g + ' L' + lv + ' ' + code + (sd.over === 'limit' ? ' frozen' : ' burnout'));
        [['steady', sd]].concat(styles.map((p) => [p, PS.simYear(code, p, opt)])).forEach(([p, s]) => {
          const n = E.netWorth(s), res = E.goalResult(s);
          sum[p] += n; fees[p] += s.st.interest + s.st.lateFees + s.st.advFees; if (res.reached) reach[p]++;
          if (pol.SHORTCUTS.indexOf(p) >= 0 && n - n0 > LUCK * Math.abs(n0)) (lv < PS.LEVELS.length ? luck : hard).push(g + ' L' + lv + ' ' + code + ' ' + p + ' +' + (n - n0));
          // GL4: the verdict and the jar's books
          if (res.reached !== (s.gpot >= s.goal.target) || s.gpot > s.goal.target || s.gpot < 0 || (!res.reached && res.short !== s.goal.target - s.gpot) ||
            s.st.jarIn - s.st.jarOut - (s.st.jarBack || 0) !== s.gpot || (res.reached && res.short !== 0)) verdict.push(g + ' L' + lv + ' ' + code + ' ' + p + ' ' + JSON.stringify(res));
        });
      });
      const avg = (p) => sum[p] / N;
      styles.forEach((p) => { if (avg(p) > avg('steady') * (p === 'fundCard' ? 1.01 : 1)) avgBad.push(g + ' L' + lv + ' ' + p + ' ' + Math.round(avg(p)) + ' > steady ' + Math.round(avg('steady'))); });
      if (lv === 1 && fees.steady / N > 50) st2.push(g + ' L1 steady fees ' + Math.round(fees.steady / N) + ' a year');
      if (!(avg('steady') < prev)) fall.push(g + ' L' + lv + ' ' + Math.round(avg('steady')) + ' not below L' + (lv - 1));
      prev = avg('steady');
      pol.SHORTCUTS.forEach((p) => { if (p !== 'fundCard' && reach[p] > reach.steady) reachBad.push(g + ' L' + lv + ' ' + p + ' reached ' + reach[p] + ' > steady ' + reach.steady); });
      if (g === PS.GOAL_DEFAULT && lv === 1 && reach.steady < N * 0.9) reachBad.push(g + ' L1 steady reached only ' + reach.steady + '/' + N);
      table.push(Object.assign({ goal: g, level: lv, steadyReach: reach.steady + '/' + N, steadyFees: Math.round(fees.steady / N) },
        ...['steady'].concat(styles).map((p) => ({ [p]: Math.round(avg(p)) }))));
    });
  });
  console.log('Goals x levels over ' + N + ' codes (average net worth, steady first)');
  console.table(table.map((x) => ({ goal: x.goal, L: x.level, steady: x.steady, reach: x.steadyReach, fees: x.steadyFees, noBuffer: x.noBuffer, swipeAll: x.swipeAll, minPay: x.minPay, skipJoy: x.skipJoy, gigMax: x.gigMax, maxer: x.maxer })));
  if (hard.length) console.log('Level ' + PS.LEVELS.length + ' codes where a shortcut ended above steady (a bad draw for the fixed bot): ' + hard.length + ', e.g. ' + hard.slice(0, 3).join(', '));
  ok('GL1 steady first on average on every goal x level (3 goals x ' + PS.LEVELS.length + ' levels x ' + N + ' codes x ' + (styles.length + 1) + ' styles), below level ' + PS.LEVELS.length + ' no shortcut above it by ' + Math.round(LUCK * 100) + '% on a code',
    !avgBad.length && !luck.length, avgBad.concat(luck).slice(0, 4).join(' | '));
  ok('GL2 steady never frozen on a goal or level, no burnout below level ' + PS.LEVELS.length + ', near no fees at level 1', !st2.length, st2.slice(0, 4).join(' | '));

  // GL3: the level's rules are applied
  const l3 = [];
  PS.LEVELS.forEach((L, i) => {
    const s = E.newGame('CLASS7', { goal: 'home', lv: i + 1 });
    if (s.limit !== L.limit) l3.push('L' + (i + 1) + ' limit ' + s.limit);
    E.startMonth(s);
    for (let m = 0; m < 4; m++) { s.foes.forEach((f) => { if (f.kind === 'shock' && f.max !== Math.round((PS.FOES[f.id].amt * (PS.FOES[f.id].set ? 1 : L.shock)) / 10) * 10) l3.push('L' + (i + 1) + ' m' + (m + 1) + ' ' + f.id + ' ' + f.max); }); if (m < 3) { s.mi++; E.startMonth(s); } }
    if (s.rentRaise !== L.rent || (L.rent && !s.log.some((l) => l.k === 'pd.lvRent'))) l3.push('L' + (i + 1) + ' rent ' + s.rentRaise);
    s.debt = L.limit + 1; E.limitCheck(s); if (s.over !== 'limit') l3.push('L' + (i + 1) + ' card not frozen over its limit');
  });
  ok('GL3 levels: limit, surprise costs, rent rise applied, and steady falls level by level for every goal', !l3.length && !fall.length, l3.concat(fall).slice(0, 4).join(' | '));

  // GL4 the end screen's sentence for the verdict, en and ar, on reached, missed and empty jars
  const say = [];
  ['en', 'ar'].forEach((lang) => {
    PS.lang = lang;
    PS.GOAL_IDS.forEach((g) => [0, 1234, PS.GOALS[g].target].forEach((pot) => {
      const s = E.newGame('CLASS7', { goal: g }); s.gpot = pot; s.st.jarIn = pot;
      const res = E.goalResult(s), txt = PS.plain(PS.goalui ? PS.goalui.goalHTML(s) : PS.t('end.goal.' + g + (res.reached ? '.y' : '.n'), { a: pot, g: res.target, d: res.short }));
      const has = (n) => txt.indexOf(PS.plain(PS.num(n))) >= 0;
      if (!has(res.target) && !(res.reached && has(pot))) say.push(lang + ' ' + g + ' ' + pot + ': no target');
      if (!res.reached && pot && (!has(pot) || !has(res.short))) say.push(lang + ' ' + g + ' ' + pot + ': no jar or short amount');
      if (/[{}#|]/.test(txt) || require('./regress_text.js').ZERO.some((re) => re.test(txt))) say.push(lang + ' ' + g + ' ' + pot + ': ' + txt.slice(0, 60));
    }));
  });
  PS.lang = lang0;
  ok('GL4 goal verdict: reached exactly when the jar holds the target, its books add up, the end sentence names jar, target and shortfall (en/ar); steady reaches it most',
    !verdict.length && !say.length && !reachBad.length, verdict.concat(say, reachBad).slice(0, 4).join(' | '));

  // GL5 the month-end window with a goal
  const lf = [], G = PS.CONST.LIVING;
  PS.GOAL_IDS.forEach((g) => [0, 2000, G, G + 900].forEach((b) => [300, 3000, 9000].forEach((c) => [0, PS.GOALS[g].target - 200].forEach((pot) => {
    const s = E.newGame('CLASS7', { goal: g }); E.startMonth(s); s.buffer = b; s.cash = c; s.savings = 0; s.gpot = pot; s.st.jarIn = pot;
    const os = E.leftOptions(s), tag = g + ' fund ' + b + ' cash ' + c + ' jar ' + pot, good = os.filter((o) => o.good);
    if (good.length !== 1 || good[0].id !== PS.POLICY.steady.left(s)) lf.push(tag + ': marked ' + good.map((o) => o.id) + ', steady ' + PS.POLICY.steady.left(s));
    ['en', 'ar'].forEach((lang) => { PS.lang = lang; os.forEach((o) => { const x = PS.plain(PS.t(o.k, o.p) + ' ' + PS.t(o.n, o.np)); if (/[{}#|]/.test(x) || /(AED 0\b|-AED| 0 درهم)/.test(x)) lf.push(tag + ' ' + lang + ': ' + x.slice(0, 70)); }); });
    PS.lang = lang0;
    const before = s.buffer + s.cash + s.savings + s.gpot, pick = PS.POLICY.steady.left(s);
    E.finish(s, pick);
    if (s.buffer + s.cash + s.savings + s.gpot !== before + 0 && !(s.fund > 0)) lf.push(tag + ': ' + pick + ' lost money');
    if (s.gpot > s.goal.target || s.st.jarIn - s.st.jarOut !== s.gpot) lf.push(tag + ': jar ' + s.gpot);
  }))));
  ok('GL5 month-end window with a goal: the marked option is the steady pick, sums add up, sentences clean (en/ar)', !lf.length, lf.slice(0, 3).join(' | '));

  // GL6 class mode and blocked storage (js/goalui.js with a stand-in page)
  const g6 = [];
  try {
    global.document = { addEventListener() {}, getElementById() { return null; }, querySelector() { return null; } };
    let store = {};
    global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
    global.location = { search: '' };
    PS.G = PS.G || {}; PS.G.lastRandom = 'RANDOM';
    store['paydayspire.goals'] = JSON.stringify({ max: 3, lv: 3, goal: 'gold' });
    const free = PS.goalui.opts(PS.goalui.isClass('RANDOM')), cls = PS.goalui.opts(PS.goalui.isClass('K7M3QX'));
    if (free.lv !== 3 || free.goal !== 'gold' || free.cls) g6.push('free play ' + JSON.stringify(free));
    if (cls.lv !== 1 || !cls.cls) g6.push('typed class code ' + JSON.stringify(cls));
    global.location = { search: '?code=K7M3QX&goal=studio' };
    const link = PS.goalui.opts(PS.goalui.isClass('K7M3QX'));
    if (link.lv !== 1 || link.goal !== 'studio') g6.push('class link ' + JSON.stringify(link));
    global.location = { search: '' };
    global.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
    const blocked = PS.goalui.opts(false);
    if (blocked.lv !== 1 || blocked.goal !== PS.GOAL_DEFAULT) g6.push('storage blocked ' + JSON.stringify(blocked));
    const s = E.newGame('CLASS7', blocked); if (!s.goal || s.lv !== 1) g6.push('blocked storage game ' + s.lv);
  } catch (e) { g6.push('error ' + e.message); } finally { Object.assign(global, keep); }
  ok('GL6 a class code plays level 1 and the link goal; blocked storage still starts a game', !g6.length, g6.join(' | '));
  // GL8 and GL9: the end screen's goal lines, on real years (steady and play styles) and on set money at year end
  const g8 = [], g9 = [], seen = { yy: 0, yn: 0, ny: 0, nn: 0, spare: 0, spareFund: 0 }, bad8 = (x) => /[{}#|]/.test(x) || require('./regress_text.js').ZERO.some((re) => re.test(x));
  const cases = [];
  PS.GOAL_IDS.forEach((g) => [1, 3].forEach((lv) => codes.slice(0, 10).forEach((code) => {
    const sd = PS.simYear(code, 'steady', { goal: g, lv });
    ['steady', 'noBuffer', 'impulse', 'idle', 'swipeAll'].forEach((p) => { if (PS.POLICY[p] || pol.SHORTCUTS.indexOf(p) >= 0) cases.push([g + ' L' + lv + ' ' + code + ' ' + p, PS.simYear(code, p, { goal: g, lv }), sd]); });
  })));
  PS.GOAL_IDS.forEach((g) => [[0, 0, 0], [3000, 0, 3000], [2999, 0, 3000], [1000, G + 2000, 3000], [1000, G + 1999, 3000], [500, 2500, 3000], [500, 1000, 2000], [0, 0, 1], [0, G, 0]].forEach(([sav, buf, short]) => {
    const s = E.newGame('CLASS7', { goal: g }); s.savings = sav; s.buffer = buf; s.gpot = s.goal.target - short; s.st.jarIn = s.gpot;
    cases.push([g + ' set sav ' + sav + ' fund ' + buf + ' short ' + short, s, PS.simYear('CLASS7', 'steady', { goal: g })]);
    if (short) { const f = E.newGame('CLASS7', { goal: g }); Object.assign(f, { savings: 9000, buffer: 9000, gpot: 0, over: 'limit' }); cases.push([g + ' frozen', f, null]); const d = E.newGame('CLASS7', { goal: g }); Object.assign(d, { savings: 9000, buffer: 9000, gpot: 0, debt: 400 }); cases.push([g + ' card debt', d, null]); }
  }));
  cases.push(['no goal', PS.simYear('CLASS7', 'steady'), PS.simYear('CLASS7', 'steady')]);
  cases.forEach(([tag, s, sd]) => {
    const r = E.goalResult(s), q = sd && E.goalResult(sd);
    // GL8
    if (sd) {
      const c = PS.goalui.cmpGoal(s, sd);
      if (!r) { if (c || PS.goalui.cmpGoalHTML(s, sd)) g8.push(tag + ': a line without a goal'); }
      else {
        const want = 'end.cmp.g.' + (r.reached ? 'y' : 'n') + (q.reached ? 'y' : 'n');
        if (!c || c.k !== want || c.p.d !== r.short || c.p.e !== q.short) g8.push(tag + ': ' + JSON.stringify(c) + ' want ' + want);
        else seen[want.slice(-2)]++;
        ['en', 'ar'].forEach((lang) => { PS.lang = lang; const x = PS.plain(PS.goalui.cmpGoalHTML(s, sd)); if (bad8(x) || (!r.reached && x.indexOf(PS.plain(PS.num(r.short))) < 0) || (!q.reached && x.indexOf(PS.plain(PS.num(q.short))) < 0)) g8.push(tag + ' ' + lang + ': ' + x.slice(0, 70)); });
        PS.lang = lang0;
      }
    }
    // GL9
    const sp = PS.goalui.spare(s), sav = Math.max(0, s.savings), buf = Math.max(0, s.buffer);
    const show = !!r && !r.reached && s.over !== 'limit' && !(s.debt > 0) && sav + buf >= r.short;
    if (!!sp !== show) { g9.push(tag + ': shown ' + !!sp + ', should ' + show); return; }
    if (!sp) return;
    const free = sav + Math.max(0, buf - G), kind = free >= r.short ? 'spare' : 'spareFund';
    if (sp.k !== 'end.goal.' + kind || sp.p.d !== r.short || (kind === 'spare' ? sp.p.v !== free : sp.p.b !== sav + buf - r.short || sp.p.b >= G)) g9.push(tag + ': ' + JSON.stringify(sp) + ' want ' + kind);
    seen[kind]++;
    ['en', 'ar'].forEach((lang) => { PS.lang = lang; const x = PS.plain(PS.goalui.goalHTML(s)); if (bad8(x) || x.indexOf(PS.plain(PS.num(r.short))) < 0 || PS.plain(PS.t(sp.k, sp.p)).length < 40 || x.indexOf(PS.plain(PS.t(sp.k, sp.p))) < 0) g9.push(tag + ' ' + lang + ': ' + x.slice(-80)); });
    PS.lang = lang0;
  });
  if (!seen.yy || !seen.ny || !seen.nn || !seen.spare || !seen.spareFund) g8.push('cases not met: ' + JSON.stringify(seen));
  ok('GL8 end-screen comparison names the goal for you and for steady habits (' + cases.length + ' runs, cases ' + JSON.stringify(seen) + '), short amounts theirs, en/ar', !g8.length, g8.slice(0, 3).join(' | '));
  ok('GL9 missed-goal savings line only when savings and the emergency fund cover the shortfall (not frozen, no card debt), spare or the cost of breaking the fund, en/ar', !g9.length, g9.slice(0, 3).join(' | '));
  fs.writeFileSync(path.join(__dirname, 'regress_goals.json'), JSON.stringify({ codes: N, luck: LUCK, table }) + '\n');
};
