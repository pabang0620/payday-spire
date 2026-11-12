// R4 lesson check for tools/regress.js: steady habits come first against every play style a player could try, on many class
// codes, so no shortcut can turn the lesson around.
// Styles: the five of tools/regress.js and the shortcuts of tools/policies.js SHORTCUTS (only the card minimum, side gigs
// with no planned joy, the card bill from the emergency fund, no planned joy, small bills left late, all of them at once).
//   R4  on average over all codes every style ends below steady (each under its limit, AVG below);
//   R4b on every code no style ends above steady by more than LUCK of steady (the same habits draw their cards in a different
//       order, so two near-identical years can differ by a few hundred AED; the count of codes above steady is printed);
//   R4c the costs are real and seen: the minimum-only style pays card interest on every code, steady never burns out, and a
//       year with a burnout is never graded "Steady year";
//   R4d the emergency fund pays the card bill only for what cash cannot cover (it is not a free way to pay);
//   R4e paying only the card minimum never ends more than MIN_NOISE above steady on any code (it was +426
//       on 6 codes). Root causes fixed: Compare worked on set prices, the flight fare could be haggled, a fund kept full by not
//       paying the card counted as a full cushion, a few dirhams on the card cost the full worry, and money over the fund's goal
//       could not pay for the course. What is left is the two years drawing cards in a different order (a side gig, an Impulse buy).
// Also writes tools/regress_lesson.json for tools/doc_numbers.js.
const fs = require('fs'), path = require('path');
const N = 240; // class codes (fixed, made from one seed)
const LUCK = 0.05;
const MIN_NOISE = 100; // AED: less than one side gig or one Impulse buy
// average net worth limit, as a share of steady (the five regress styles keep their tools/policies.js MAX_SHARE)
// fundCard is steady with the fund card played first: since the fund pays only what cash cannot cover (R4d) it is the same
// habit, so it may tie steady (noise of the card order), never more
const AVG = { minPay: 0.95, gigMax: 0.92, fundCard: 1.01, skipJoy: 0.92, billDodge: 0.92, maxer: 0.85 };

module.exports = function (PS, ok) {
  const E = PS.E, pol = require('./policies.js');
  const styles = ['steady', 'nothing', 'swipeAll', 'noBuffer', 'impulse'].concat(pol.SHORTCUTS);
  const limit = Object.assign({}, pol.MAX_SHARE, AVG);
  const r = PS.rng(12345), codes = [];
  for (let i = 0; i < N; i++) { let c = ''; for (let k = 0; k < 6; k++) c += PS.CODE_CHARS[Math.floor(r() * PS.CODE_CHARS.length)]; codes.push(c); }
  const sum = {}, above = {}, worst = {}, bad = { c: [] };
  styles.forEach((p) => { sum[p] = { net: 0, fees: 0, burn: 0, tired: 0 }; above[p] = 0; worst[p] = { d: -Infinity, c: '' }; });
  codes.forEach((code) => {
    let st = null;
    styles.forEach((p) => {
      const s = PS.simYear(code, p), n = E.netWorth(s), x = sum[p];
      x.net += n; x.fees += s.st.interest + s.st.lateFees + s.st.advFees; x.burn += s.st.burnouts; x.tired += s.st.tiredSpend || 0;
      if (s.st.burnouts && PS.grade(s) === 'steady') bad.c.push(code + ' ' + p + ' burned out but graded steady');
      if (p === 'steady') { st = { n, s }; if (s.st.burnouts) bad.c.push(code + ' steady burned out'); return; }
      if (n > st.n) above[p]++;
      const d = (n - st.n) / Math.abs(st.n);
      if (d > worst[p].d) worst[p] = { d, c: code, a: n - st.n };
      if (p === 'minPay' && s.st.interest <= st.s.st.interest) bad.c.push(code + ' minPay paid no more interest than steady');
    });
  });
  const avg = (p, k) => sum[p][k] / N;
  const rows = styles.map((p) => ({ style: p, net: Math.round(avg(p, 'net')), pct: Math.round((avg(p, 'net') / avg('steady', 'net')) * 100),
    fees: Math.round(avg(p, 'fees')), burnouts: +avg(p, 'burn').toFixed(2), tired: Math.round(avg(p, 'tired')),
    aboveSteady: p === 'steady' ? '-' : above[p] + '/' + N, worst: p === 'steady' ? '-' : (worst[p].a > 0 ? '+' : '') + worst[p].a + ' ' + worst[p].c }));
  console.log('R4 lesson check over ' + N + ' class codes, ' + styles.length + ' play styles');
  console.table(rows);
  const overAvg = styles.slice(1).filter((p) => avg(p, 'net') > avg('steady', 'net') * limit[p]);
  ok('R4 steady first on average against ' + (styles.length - 1) + ' styles (' + N + ' codes)', !overAvg.length,
    overAvg.map((p) => p + ' ' + Math.round((avg(p, 'net') / avg('steady', 'net')) * 100) + '% (limit ' + Math.round(limit[p] * 100) + '%)').join(', '));
  const lucky = styles.slice(1).filter((p) => worst[p].d > LUCK);
  ok('R4b no style above steady by more than ' + Math.round(LUCK * 100) + '% on any code', !lucky.length,
    lucky.map((p) => p + ' +' + worst[p].a + ' on ' + worst[p].c).join(', '));
  ok('R4c minimum-only pays interest, steady never burns out, a burnout is never a Steady year', !bad.c.length, bad.c.slice(0, 4).join(' | '));
  // R4d: one card bill of 1,000 and 600 in cash: the fund pays at most the 400 cash cannot cover; with 1,200 cash it cannot aim at it
  const s = E.newGame('CLASS7');
  s.foes = [{ id: 'cardbill', kind: 'card', amt: 1000, max: 1000, min: 100, pull: 0, gone: false, at: 0, i: 0 }];
  s.turn = 0; s.buffer = 3000; s.debt = 1000; s.hand = [E.mk('fundpay', true)]; s.focus = 3;
  s.cash = 1200; const blocked = !E.aims(s, s.hand[0]).length;
  s.cash = 600; E.play(s, 0, 0);
  ok('R4d the emergency fund pays only what cash cannot cover of the card bill', blocked && s.buffer === 2600 && s.foes[0].amt === 600,
    'blocked ' + blocked + ', fund ' + s.buffer + ', bill left ' + s.foes[0].amt);
  ok('R4e minimum-only never more than AED ' + MIN_NOISE + ' above steady on any code (' + above.minPay + '/' + N + ' codes above, at most ' + worst.minPay.a + ')',
    worst.minPay.a <= MIN_NOISE, 'minPay +' + worst.minPay.a + ' on ' + worst.minPay.c);
  const out = { codes: N, luck: LUCK, rows };
  fs.writeFileSync(path.join(__dirname, 'regress_lesson.json'), JSON.stringify(out) + '\n');
  return out;
};
