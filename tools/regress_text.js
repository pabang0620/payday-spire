// Game sentence checks for tools/regress.js, over every line a year writes (month intro, played cards, turn events, the
// month-end window), for 200 class codes x every play style x en/ar:
// P2 every card a month promises (PS.E.promised: the answer to each problem, the planned joy its intro names, a sale's offer)
//    is in that month's first hand, and every card an intro names (trait.<x>.d) is one of the promises of its months
// Z2 no sentence shows a zero amount ("AED 0", "0 درهم") or a zero change ("mind -0"): PS.t uses a key's ".0" sentence
// G1 English: a plural name never takes is/was/has/its and a singular name never are/were/have/their (templates use
//    {f|is|are}, the names' number is data in PS.GRAM.en); Arabic: a verb before a name agrees in gender (PS.GRAM.ar)
// Z2s (tools/regress.js) uses the same patterns on every text the browser drew (tools/screen_text.json from tools/playtest.py)
// (a full stop or comma after the 0 ends the amount: "AED 0." and "AED 0," are zeros, "AED 0.5" is not)
const ZERO = [/AED 0(?!\d|[,.]\d)/, /(^|[^\d,.])0 (درهم|دراهم|درهمًا)/, /[-+]0(?!\d|[,.]\d)/, /(^|[^\d.,])0\.0(?![\d])/];
module.exports = function (PS, styles, ok) {
  const E = PS.E, plain = PS.plain, lang0 = PS.lang;
  const r = PS.rng(20261116), codes = [];
  while (codes.length < 200) codes.push(Array.from({ length: 6 }, () => PS.CODE_CHARS[Math.floor(r() * PS.CODE_CHARS.length)]).join(''));
  const lines = [], miss = [], over = [];
  let hands = 0;
  const firstHand = (s) => {
    hands++;
    const want = E.promised(s), have = s.hand.map((c) => c.id);
    if (want.length > s.handSize) over.push(s.code + ' m' + (s.mi + 1) + ' ' + want.join('+'));
    want.forEach((id) => { if (have.indexOf(id) < 0) miss.push(s.code + ' m' + (s.mi + 1) + ' ' + id); });
  };
  const keep = {};
  ['startMonth', 'nextMonth', 'endTurn', 'closeBills', 'finish'].forEach((n) => { keep[n] = E[n]; });
  E.startMonth = function (s) { const x = keep.startMonth.apply(this, arguments); firstHand(s); return x; };
  E.nextMonth = function (s) { const x = keep.nextMonth.apply(this, arguments); if (x) firstHand(s); return x; };
  E.endTurn = function (s) { const x = keep.endTurn.apply(this, arguments); x.ev.forEach((l) => lines.push(l)); return x; };
  E.closeBills = function (s) {
    s.log.forEach((l) => lines.push(l)); // the month's intro lines and played-card lines
    const x = keep.closeBills.apply(this, arguments);
    x.concat(E.payLines(s)).forEach((l) => lines.push(l));
    return x;
  };
  E.finish = function (s) { const x = keep.finish.apply(this, arguments); x.forEach((l) => lines.push(l)); return x; };
  try { codes.forEach((code) => styles.forEach((pol) => PS.simYear(code, pol))); } finally { Object.assign(E, keep); }
  // a card named in a month's intro text must be promised in every month with that trait
  const named = [];
  PS.BASE_MONTHS.forEach((m, i) => {
    if (!m.trait) return;
    const d = PS.STR.en['trait.' + m.trait + '.d'] || '';
    Object.keys(PS.CARDS).forEach((id) => {
      if (d.indexOf(PS.STR.en['c.' + id]) < 0) return;
      codes.slice(0, 20).forEach((code) => {
        const s = E.newGame(code); s.mi = i;
        if (E.promised(s).indexOf(id) < 0) named.push('m' + (i + 1) + ' ' + id);
      });
    });
  });
  ok('P2 promised cards in the first hand (' + hands + ' month starts, 200 codes x ' + styles.length + ' styles)', !miss.length && !over.length && !named.length,
    miss.concat(over, named).slice(0, 4).join(' | '));
  // Z2: every line rendered in both languages
  const zero = ZERO;
  const bad = [], seenK = {};
  const NAMES = { en: {}, ar: {} };
  ['en', 'ar'].forEach((lang) => {
    PS.lang = lang;
    Object.keys(PS.FOES).forEach((id) => { NAMES[lang][id] = plain(PS.t('foe.' + id)); });
    lines.forEach((l) => {
      const txt = plain(PS.t(l.k, l.p));
      seenK[l.k] = 1;
      if (zero.some((re) => re.test(txt))) bad.push(lang + ' ' + l.k + ': ' + txt.slice(0, 90));
    });
  });
  const badK = bad.map((x) => x.split(':')[0]).filter((x, i, a) => a.indexOf(x) === i);
  ok('Z2 no zero amount in any game line (' + lines.length + ' lines, ' + Object.keys(seenK).length + ' kinds, en/ar)', !bad.length, badK.join(', ') + ' | ' + bad.slice(0, 2).join(' | '));
  // G1: number and gender agreement with the problem's name
  const g = [], pl = PS.GRAM.en, fem = PS.GRAM.ar;
  const P = { a: 120, b: 40, c: 60, d: 20, m: 2, n: 3, fee: 100, i: 5, e: 30, j: 2, k: 2 };
  const AR_OK = ['من', 'إغراء', 'مبلغ', 'معالجة', 'الطوارئ', 'الهدف:', 'دفع', 'جديدة:', 'دفعت', 'مقابل', 'تأخير', 'الآن', 'الأسعار:', 'تفاوضت:', 'جعل']; // nouns and "you paid" before a name
  ['en', 'ar'].forEach((lang) => {
    PS.lang = lang;
    Object.keys(PS.STR[lang]).forEach((k) => {
      const src = PS.STR[lang][k];
      if (typeof src !== 'string' || src.indexOf('{f') < 0) return;
      if (lang === 'en' && (/\{f\} (is|are|was|were|has|have)\b/.test(src) || /\{f\}[^.]*\b(its|their)\b/.test(src.replace(/\{f\|[^}]*\}/g, ''))))
        g.push('en template ' + k + ' needs {f|..|..}');
      if (lang === 'ar') {
        const re = /(\S+) \{f\}/g; let m;
        while ((m = re.exec(src))) if (AR_OK.indexOf(m[1]) < 0 && !/^\{f\|/.test(m[1])) g.push('ar template ' + k + ': "' + m[1] + '" before {f}');
      }
      Object.keys(PS.FOES).forEach((id) => {
        const txt = plain(PS.t(k, Object.assign({}, P, { f: id }))), name = NAMES[lang][id];
        const at = txt.toLowerCase().indexOf(name.toLowerCase());
        if (at < 0) return;
        if (lang === 'en') {
          const after = txt.slice(at + name.length).split(/[.:;]/)[0].split(' ').slice(0, 4).join(' ');
          if (pl[id] ? /\b(is|was|has|its)\b/.test(after) : /\b(are|were|have|their)\b/.test(after)) g.push(k + ' ' + id + ': ' + txt.slice(0, 70));
        } else {
          const before = txt.slice(0, at).trim().split(' ').pop();
          const verb = { 'كلّف': 0, 'كلّفت': 1, 'أدخل': 0, 'أدخلت': 1 }[before];
          if (verb != null && verb !== (fem[id] ? 1 : 0)) g.push(k + ' ' + id + ': ' + txt.slice(0, 70));
        }
      });
    });
  });
  // and the plain pattern over every line the years wrote: a plural noun of a name followed by is/was/has
  PS.lang = 'en';
  const plWords = Object.keys(pl).map((id) => NAMES.en[id].split(' ').pop()).join('|');
  const plRe = new RegExp('\\b(' + plWords + ') (is|was|has)\\b', 'i');
  lines.forEach((l) => { const txt = plain(PS.t(l.k, l.p)); if (plRe.test(txt)) g.push('line ' + l.k + ': ' + txt.slice(0, 70)); });
  PS.lang = lang0;
  ok('G1 names agree with their verbs (en number, ar gender)', !g.length, g.slice(0, 8).join(' | '));

  // T2: one word for one thing, and one way to write a negative amount. The same list is run over every
  // sentence text (both languages, placeholders and tags cut out), every line the years wrote and every text the browser drew
  const BAN = {
    en: [[/\bstatements?\b/i, '"statement" (the word is card bill)'], [/\bbuffers?\b/i, '"buffer" (the word is emergency fund)'], [/\bmind\b/i, '"mind" (the word is mood)'],
      [/\bbreakdowns?\b/i, '"breakdown" (the word is surprise cost)'], [/pay-later parts?\b/i, '"pay-later part" (the word is instalment)'], [/\bpull\b/i, '"pull" (the word is urge)'],
      [/(^|[^\w])x\d/, '"x2" (write ×2)'], [/AED -\d/, '"AED -5,987" (write -AED 5,987)'], [/[−–]/, 'a minus or en dash sign (write a hyphen)']],
    ar: [[/كشف/, '"كشف" (the word is فاتورة البطاقة)'], [/(^|[^ء-ي])(ال|لل|وال)?عطل(?![ء-ي])/, '"عطل" (the word is نفقة طارئة)'],
      [/أعطال/, '"أعطال" (the word is نفقات طارئة)'], [/(^|[^\w])x\d/, '"x2" (write ×2)']],
  };
  const clean = (v) => String(v).replace(/\{[^}]*\}/g, '').replace(/<[^>]*>/g, ' ');
  const t2 = [], seen2 = {};
  const T2 = (lang, where, txt) => BAN[lang].forEach((b) => { if (b[0].test(txt) && !seen2[where + b[1]]) { seen2[where + b[1]] = 1; t2.push(lang + ' ' + where + ': ' + b[1] + ' ' + txt.slice(0, 50)); } });
  ['en', 'ar'].forEach((lang) => Object.keys(PS.STR[lang]).forEach((k) => T2(lang, k, clean(PS.STR[lang][k]))));
  ['en', 'ar'].forEach((lang) => { PS.lang = lang; lines.forEach((l) => T2(lang, 'line ' + l.k, plain(PS.t(l.k, l.p)))); });
  // a card's name inside a sentence is in curly quotes (“Put it on the card”); the game concept "Impulse buy" is not a card name here
  const names = Object.keys(PS.CARDS).filter((id) => id !== 'impulse').map((id) => PS.STR.en['c.' + id]).filter(Boolean);
  Object.keys(PS.STR.en).forEach((k) => {
    const v = clean(PS.STR.en[k]);
    names.forEach((n) => { if (new RegExp('[a-z,] ' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-z])').test(v)) t2.push('en ' + k + ': card name "' + n + '" without quotes'); });
  });
  try {
    const scr = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'screen_text.json'), 'utf8'));
    Object.keys(scr).forEach((r) => scr[r].lines.forEach((x) => T2(/_ar_/.test(r) ? 'ar' : 'en', 'screen ' + r, x)));
  } catch (e) { /* the browser run writes the file; the check on its freshness is Z2s */ }
  PS.lang = lang0;
  ok('T2 one word per thing, one form for a negative amount, card names quoted (' + Object.keys(PS.STR.en).length + ' sentences, ' + lines.length + ' game lines, screen texts)', !t2.length, t2.slice(0, 4).join(' | '));
  return lines; // for G1c (tools/regress_count.js)
};
module.exports.ZERO = ZERO;
