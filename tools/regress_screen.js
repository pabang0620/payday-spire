// Screen sentence checks for tools/regress.js: what a screen line says must match the game state it describes.
// S1 the problems area says "all problems handled" only when every problem of the month is gone (none left, none still to
//    arrive), and when nothing is left now but one is still to arrive it names that turn. Checked after every card and
//    at every turn start of every year (codes x play styles), through the same PS.E.clearLine the battle screen uses.
// S1b the battle screen takes that line from PS.E.clearLine only (no other place picks a "handled" key).
module.exports = function (PS, codes, styles, ok, read) {
  const E = PS.E, bad = [];
  let seen = 0, next = 0;
  const look = (s, where) => {
    const line = E.clearLine(s), left = s.foes.filter((f) => !f.gone), now = left.filter((f) => !(f.at > s.turn));
    if (!line) { if (!now.length) bad.push(s.code + ' m' + (s.mi + 1) + ' t' + (s.turn + 1) + ' ' + where + ': no line with nothing to face'); return; }
    seen++;
    const handled = line.k === 'foe.clear' || line.k === 'foe.clearLate';
    if (now.length) bad.push(s.code + ' m' + (s.mi + 1) + ' ' + where + ': a line while ' + now.length + ' problems are on screen');
    if (handled && left.length) bad.push(s.code + ' m' + (s.mi + 1) + ' t' + (s.turn + 1) + ' ' + where + ': "' + line.k + '" while ' + left.map((f) => f.id).join('+') + ' still to come');
    if (line.k === 'foe.clearNext') {
      next++;
      const first = Math.min.apply(null, left.map((f) => f.at)) + 1;
      if (line.p.n !== first || first <= s.turn + 1) bad.push(s.code + ' m' + (s.mi + 1) + ' ' + where + ': says turn ' + line.p.n + ', first arrives ' + first);
    }
  };
  const play0 = E.play, start0 = E.startTurn;
  E.play = function (s) { const r = play0.apply(this, arguments); look(s, 'after a card'); return r; };
  E.startTurn = function (s) { const r = start0.apply(this, arguments); look(s, 'turn start'); return r; };
  try { codes.forEach((code) => styles.forEach((pol) => PS.simYear(code, pol))); } finally { E.play = play0; E.startTurn = start0; }
  ok('S1 "all handled" only when nothing is left or still to come (' + seen + ' empty moments, ' + next + ' with one to come)', !bad.length && next > 0, bad.slice(0, 3).join(' | ') || 'no moment with one still to come was met');
  // G4 the line under "You made it" names this year's reasons, all of them and only them (judge_B_final2 5-1: a year with
  //    a card bill not paid in full read "with some debt or a thin emergency fund"); PS.grade and the line share PS.gradeMiss
  const lang0 = PS.lang, g4 = [], ALL = ['debt', 'overdue', 'missed', 'fund', 'burnout'];
  const checkLine = (s, tag) => {
    const g = PS.grade(s), miss = PS.gradeMiss(s), keys = miss.map((x) => x[0]);
    const want = [s.debt > 0, s.overdue.length > 0, s.st.missed > 0, s.buffer < PS.CONST.LIVING, s.st.burnouts > 0];
    if (want.some((w, i) => w !== keys.includes(ALL[i]))) g4.push(tag + ': reasons ' + keys.join('+'));
    if (g !== 'frozen' && (g === 'steady') !== !miss.length) g4.push(tag + ': grade ' + g + ' with ' + keys.length + ' reasons');
    ['en', 'ar'].forEach((lang) => {
      PS.lang = lang;
      const line = PS.plain(PS.gradeLine(s));
      if (/[{}#|]/.test(line)) g4.push(tag + ' ' + lang + ': raw template');
      if (g !== 'made') return;
      ALL.forEach((k) => {
        const x = miss.find((y) => y[0] === k), phrase = PS.plain(PS.t('gm.' + k, { n: x ? x[1] || 1 : 1 }));
        if (!!x !== (line.indexOf(phrase) >= 0)) g4.push(tag + ' ' + lang + ': ' + k + (x ? ' missing' : ' named but not in this year') + ': ' + line.slice(0, 80));
      });
    });
    PS.lang = lang0;
  };
  codes.forEach((code) => styles.forEach((pol) => checkLine(PS.simYear(code, pol), code + ' ' + pol)));
  const one = PS.simYear(codes[0], 'steady'); one.st.missed = 1; checkLine(one, 'steady with one card bill missed');
  ok('G4 "You made it" names every reason of the year and no other (' + codes.length * styles.length + ' years + a missed card bill, en/ar)',
    !g4.length && PS.grade(one) === 'made', g4.slice(0, 3).join(' | '));
  // LF1 leftover cash at month end: the fund option says under, at or over its goal in the right words, and when the cash
  //     is more than the fund needs one option fills it to its goal and saves the rest (judge_B_final2 5-3)
  const lf = [], G = PS.CONST.LIVING;
  [0, 1000, G - 1, G, G + 500].forEach((b) => [100, 2000, 6140].forEach((c) => {
    const s = E.newGame(codes[0]); E.startMonth(s); s.buffer = b; s.cash = c; s.savings = 0;
    const os = E.leftOptions(s), split = os.find((o) => o.id === 'split'), buf = os.find((o) => o.id === 'buffer'), tag = 'fund ' + b + ' cash ' + c;
    if (!!split !== (b < G && b + c > G)) lf.push(tag + ': split option ' + !!split);
    if (buf.n !== (b + c < G ? 'lf.buf.n' : b + c === G ? 'lf.buf.full' : 'lf.buf.over')) lf.push(tag + ': ' + buf.n);
    if (os.filter((o) => o.good).length !== 1 || os.find((o) => o.good).id !== PS.POLICY.steady.left(s)) lf.push(tag + ': the marked option is not the steady pick');
    ['en', 'ar'].forEach((lang) => { PS.lang = lang; os.forEach((o) => { const x = PS.plain(PS.t(o.k, o.p) + ' ' + PS.t(o.n, o.np)); if (/[{}#|]/.test(x) || /(AED 0\b|-AED| 0 درهم)/.test(x)) lf.push(tag + ' ' + lang + ': ' + x.slice(0, 70)); }); });
    PS.lang = lang0;
    if (split) { E.finish(s, 'split'); if (s.buffer !== G || s.savings !== b + c - G || s.cash !== 0) lf.push(tag + ': split left fund ' + s.buffer + ' savings ' + s.savings); }
  }));
  ok('LF1 leftover cash: fund under, at or over its goal said right, fill-to-goal-and-save-the-rest option, the marked one is the steady pick (15 cases, en/ar)', !lf.length, lf.slice(0, 3).join(' | '));
  // CP1 the course window says how soon the course pays for itself and what the raise brings back this year; the steady
  //     style buys it by the same rule (judge_B_final2 5-2: a student who only looks at net worth learns "the course loses")
  const cp = [], C = PS.CONST;
  PS.SHOP_AFTER.forEach((mi) => {
    const r = E.coursePayback({ mi }), back = (11 - mi) * C.COURSE_RAISE;
    if (r.p.k !== Math.ceil(C.COURSE_COST / C.COURSE_RAISE) || r.p.a !== back || r.back !== back > C.COURSE_COST) cp.push('month ' + (mi + 1) + ': ' + JSON.stringify(r));
    ['en', 'ar'].forEach((lang) => { PS.lang = lang; const x = PS.plain(PS.t(r.key, r.p)); if (/[{}#|]/.test(x) || x.indexOf(PS.plain(PS.num(back))) < 0) cp.push(lang + ' month ' + (mi + 1) + ': ' + x.slice(0, 70)); });
    PS.lang = lang0;
  });
  const fl = read('js/flow.js'), po = read('js/policy.js');
  ok('CP1 the course says when it pays for itself, and steady buys it by the same rule', !cp.length && /t\(cp\.key, cp\.p\)/.test(fl) && /coursePayback\(s\)\.back/.test(po), cp.slice(0, 3).join(' | ') || 'flow.js or policy.js does not use E().coursePayback');
  const ui = read('js/ui.js'), tut = read('js/tutor.js');
  ok('S1b the battle screen takes the line from PS.E.clearLine', ui.indexOf('E.clearLine(s)') >= 0 && !/'foe\.clear(Late)?'/.test(ui + tut), 'a "handled" key is picked outside PS.E.clearLine');
};
