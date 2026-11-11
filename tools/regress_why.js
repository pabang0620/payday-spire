// End-screen sentence checks for tools/regress.js: the rules in js/why.js hold for every class code, play style and language.
// W1 no "AED 0" in a reason or a discussion card, W2 the ledger adds up and each AED of interest and fees is told once,
// W3 the fee in a sentence is the fee its own cause made (no cause gets another one's interest), W4 order rules,
// W6 an empty emergency fund in a reason names the payment that emptied it (fund ledger).
module.exports = function (PS, codes, styles, ok) {
  const extraCodes = ['AAAAAA', 'ZZZZZZ', 'QWERTY', 'HJKLMN', 'P2X9KD', 'MOON88', 'RAMADN', 'EID777', 'SAVE42', 'CARD99', 'DXB500', 'AUH321'];
  const all = codes.concat(extraCodes);
  const plain = PS.plain;
  const zeroEn = /AED 0(?![\d,.])/, zeroAr = /(^|[^\d,])0 (درهم|دراهم|درهمًا)/;
  const bad = { w1: [], w2: [], w3: [], w4: [], w5: [], w6: [] };
  const lang0 = PS.lang;
  all.forEach((code) => styles.forEach((pol) => {
    const s = PS.simYear(code, pol), st = s.st;
    const total = Math.round(st.interest + st.lateFees + st.advFees);
    // W2: the ledger adds up to the year's fees, and the sentences tell each cause's fees exactly once
    if (PS.L.total(s) !== total) bad.w2.push(code + ' ' + pol + ' ledger ' + PS.L.total(s) + ' vs ' + total);
    ['en', 'ar'].forEach((lang) => {
      PS.lang = lang;
      const w = PS.cls.whyAll(s), top = PS.cls.why(s);
      const seen = {};
      let told = 0;
      w.forEach((x) => x.fees.forEach((f) => {
        if (seen[f.tag]) bad.w2.push(code + ' ' + pol + ' ' + f.tag + ' told twice');
        seen[f.tag] = 1; told += f.a;
        if (f.a !== Math.round((st.cost || {})[f.tag] || 0)) bad.w3.push(code + ' ' + pol + ' ' + x.k + ' ' + f.tag + ' says ' + f.a);
      }));
      if (told !== total) bad.w2.push(code + ' ' + pol + ' ' + lang + ' sentences tell ' + told + ' of ' + total);
      // W3: a sentence that names a fee shows exactly its own causes' sum, and a breakdown sentence only its own breakdown
      w.forEach((x) => {
        const sum = x.fees.reduce((a, f) => a + f.a, 0), txt = plain(x.text);
        if (sum > 0 && txt.indexOf(sum.toLocaleString('en-US')) < 0) bad.w3.push(code + ' ' + pol + ' ' + x.k + ' does not show ' + sum);
        if (x.k === 'wy.shock' && !x.fees.every((f) => /^shock:/.test(f.tag))) bad.w3.push(code + ' ' + pol + ' shock with other fees');
      });
      // W1: no zero amounts in the reasons (all candidates) and in the discussion cards (the zakat line may show 0 wealth)
      const texts = w.map((x) => x.text).concat(top.map((x) => x.text), PS.cls.cardsFor(s).filter((c) => c.id !== 'zakat').map((c) => c.r));
      texts.map(plain).forEach((txt) => { if ((lang === 'en' ? zeroEn : zeroAr).test(txt)) bad.w1.push(code + ' ' + pol + ' ' + lang + ': ' + txt); });
      // W4: frozen first, then tiers and amounts never go up; a missed-bill sentence of AED 50+ is in the top three
      for (let i = 1; i < w.length; i++) {
        if (w[i].tier > w[i - 1].tier || (w[i].tier === w[i - 1].tier && w[i].v > w[i - 1].v)) bad.w4.push(code + ' ' + pol + ' order at ' + i);
      }
      if (s.over === 'limit' && top[0].k !== 'wy.frozen') bad.w4.push(code + ' ' + pol + ' frozen not first');
      const missed = w.find((x) => x.k === 'wy.missed');
      if (missed && missed.v >= 50 && !top.some((x) => x.k === 'wy.missed') && top.filter((x) => x.tier >= missed.tier).length < 3) bad.w4.push(code + ' ' + pol + ' missed left out');
    });
  }));
  // W5: the end screen's numbers, its comparison rows and the result card never show a zero amount or 0.0 months
  const zeroAny = [zeroEn, zeroAr, /(^|[^\d.,])0\.0(?![\d])/, /(^|[^\d.,])0 (months|شهر)/];
  all.forEach((code) => styles.forEach((pol) => {
    const s = PS.simYear(code, pol), steady = PS.simYear(code, 'steady');
    ['en', 'ar'].forEach((lang) => {
      PS.lang = lang;
      const en = PS.cls.endNums(s, steady);
      en.kpis.map((k) => k[1]).concat([en.you.fees, en.steady.fees, PS.cls.resultHTML(s)]).map(plain).forEach((txt) => {
        if (zeroAny.some((re) => re.test(txt))) bad.w5.push(code + ' ' + pol + ' ' + lang + ': ' + txt.slice(0, 80));
      });
    });
  }));
  // W6: when the emergency fund had nothing for a breakdown or the late salary, the reason says what emptied it, from the fund
  // ledger (st.fundOut): the last payment out before that problem left the fund at 0 (else a payment out is not in the
  // ledger), it came no later than the problem, and the sentence shows its amount and month
  let w6n = 0;
  all.forEach((code) => styles.forEach((pol) => {
    const s = PS.simYear(code, pol), st = s.st, cases = [];
    st.shocks.forEach((x) => { if (x.b === 0 && x.left === 0 && x.c > 0) cases.push({ k: 'wy.shock', mi: x.mi, fo: x.fo, f: x.f }); });
    if (st.gap && st.gap.buf === 0 && st.gap.adv + st.gap.card > 0) cases.push({ k: 'wy.late', mi: st.gap.mi, fo: st.gap.fo });
    cases.forEach((c) => {
      const e = st.fundOut[c.fo - 1];
      if (!e) return;
      w6n++;
      if (e.left !== 0) bad.w6.push(code + ' ' + pol + ' ' + c.k + ' m' + (c.mi + 1) + ': fund empty but the last payment out left ' + e.left);
      if (e.mi > c.mi || !(e.a > 0)) bad.w6.push(code + ' ' + pol + ' ' + c.k + ': cause after the problem or zero');
      PS.lang = 'en';
      const x = PS.cls.whyAll(s).find((y) => y.k === c.k && (!c.f || y.text.toLowerCase().indexOf(PS.t('foe.' + c.f).toLowerCase()) >= 0)), txt = x ? plain(x.text) : '';
      if (!x || txt.indexOf('AED ' + e.a.toLocaleString('en-US')) < 0 || txt.indexOf('month ' + (e.mi + 1) + ')') < 0) bad.w6.push(code + ' ' + pol + ' ' + c.k + ': ' + txt.slice(0, 90));
    });
  }));
  PS.lang = lang0;
  ok('W6 an empty emergency fund is explained by what emptied it (' + w6n + ' cases)', w6n > 0 && !bad.w6.length, bad.w6.slice(0, 3).join(' | '));
  // the share-out itself: integer parts that add up, in proportion
  const sh = PS.L.share(161, { a: 60, b: 4400 });
  const shareOk = sh.a + sh.b === 161 && Math.abs(sh.a - (161 * 60) / 4460) < 1;
  const n = all.length * styles.length;
  ok('W1 no AED 0 in reasons and cards (' + n + ' years x en/ar)', !bad.w1.length, bad.w1.slice(0, 3).join(' | '));
  ok('W5 no zero amount or 0.0 months in end numbers, comparison rows, result card', !bad.w5.length, bad.w5.slice(0, 3).join(' | '));
  ok('W2 ledger = year fees, each fee told once', !bad.w2.length && shareOk, bad.w2.slice(0, 3).join(' | ') + (shareOk ? '' : ' share'));
  ok('W3 each sentence shows its own cause\'s fees', !bad.w3.length, bad.w3.slice(0, 3).join(' | '));
  ok('W4 reason order: frozen, card costs, losses, good', !bad.w4.length, bad.w4.slice(0, 3).join(' | '));
};
