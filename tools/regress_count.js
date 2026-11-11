// G1c counted nouns for tools/regress.js. PS.t (js/i18n_en.js) picks the form of a counted noun by the count:
// English {n#one|other} or {n#zero|one|other}; Arabic {n#zero|one|two|few|many}: 1 is a word ("فاتورة واحدة"), 2 the dual
// ("فاتورتان"), 3-10 the plural ("3 فواتير"), 11-99 the singular accusative ("11 يومًا"), by the last two digits
// (.claude/agents/arabic-native-reviewer.md, grammar rule 3). This file checks:
//  a) the rule itself (which form each count gets, 0 1 2 3 11 100 103 111)
//  b) no text holds a count outside the rule: "({n} in all)", "{n} bills", "عدد المرات: {n}", "...: {n}" after a counted noun
//  c) every counted key, rendered with 0, 1, 2, 3 and 11 in en and ar: no "1 bills" / "2 bill", Arabic 1 and 2 never as
//     digits, 3-10 a plural word, 11+ an accusative or -a word, the right form in the text
//  d) every game line of the simulated years and every text the browser drew, by the same patterns
const NOUN_PL = 'bills|buys|months|days|times|students', NOUN_SG = 'bill|buy|month|day|time|student';
// up to two known words between the number and the noun ("3 extra Impulse buys", "2 card bills")
const FILL = '(?:(?:extra|Impulse|card|more|unpaid) ){0,2}';
const AR_PL = 'فواتير|مشتريات|أيام|أشهر|مرات', AR_SG = 'فاتورة|شراء|شراءً|يوم|يومًا|شهر|شهرًا|مرة';
// numbers with a decimal point (months of costs, 1.5) are not counts: "1.5 months", "تكاليف 1.5 شهر"
const DECIMAL = ['end.months', 'rc.bufv', 'end.share'];
const COUNT = /\{(\w+)#((?:[^{}]|\{\w+\})*)\}/g;
const enBad = (txt) => {
  const out = [];
  if (new RegExp('(^|[^\\d.,])1 ' + FILL + '(' + NOUN_PL + ')\\b').test(txt)) out.push('1 + plural');
  if (/\((\d+) in all\)/.test(txt)) out.push('(n in all)');
  const m = txt.match(new RegExp('(^|[^\\d.,])([02-9]|\\d\\d+) ' + FILL + '(' + NOUN_SG + ')\\b(?!s)'));
  if (m && m[2] !== '0') out.push(m[2] + ' + singular');
  return out;
};
const arBad = (txt) => {
  const out = [];
  if (new RegExp('(^|[^\\d.,])[12] (' + AR_PL + '|' + AR_SG + ')(?![\\u0621-\\u0652])').test(txt)) out.push('1 or 2 as a digit');
  if (new RegExp('(^|[^\\d.,])([3-9]|10) (' + AR_SG + ')(?![\\u0621-\\u0652])').test(txt)) out.push('3-10 + singular');
  if (new RegExp('(^|[^\\d.,])(1[1-9]|[2-9]\\d) (' + AR_PL + ')(?![\\u0621-\\u0652])').test(txt)) out.push('11+ + plural');
  if (/عدد المرات/.test(txt)) out.push('عدد المرات');
  return out;
};
module.exports = function (PS, ok, gameLines, screen) {
  const lang0 = PS.lang, bad = [], plain = PS.plain;
  // a) the rule
  const f = PS.countForm, en2 = ['O', 'X'], en3 = ['Z', 'O', 'X'], ar5 = ['Z', 'O', 'T', 'F', '{n} يومًا'];
  const want = [[en2, 'en', 0, 'X'], [en2, 'en', 1, 'O'], [en2, 'en', 2, 'X'], [en2, 'en', 11, 'X'], [en3, 'en', 0, 'Z'], [en3, 'en', 1, 'O'],
    [ar5, 'ar', 0, 'Z'], [ar5, 'ar', 1, 'O'], [ar5, 'ar', 2, 'T'], [ar5, 'ar', 3, 'F'], [ar5, 'ar', 10, 'F'], [ar5, 'ar', 11, '{n} يومًا'],
    [ar5, 'ar', 99, '{n} يومًا'], [ar5, 'ar', 100, '{n} يوم'], [ar5, 'ar', 103, 'F'], [ar5, 'ar', 111, '{n} يومًا']];
  want.forEach(([forms, lang, n, w]) => { if (f(lang, n, forms) !== w) bad.push('rule ' + lang + ' ' + n + ' -> ' + f(lang, n, forms)); });
  // b) counts outside the rule, and the forms of every counted key
  const keys = Object.keys(PS.STR.en).filter((k) => typeof PS.STR.en[k] === 'string' && /\{\w+#/.test(PS.STR.en[k]));
  ['en', 'ar'].forEach((lang) => Object.keys(PS.STR[lang]).forEach((k) => {
    const src = PS.STR[lang][k];
    if (typeof src !== 'string' || DECIMAL.indexOf(k) >= 0) return;
    const rest = src.replace(COUNT, '');
    if (lang === 'en' && (new RegExp('\\{\\w+\\} ' + FILL + '(' + NOUN_PL + '|' + NOUN_SG + ')\\b').test(rest) || /\(\{\w+\} in all\)/.test(rest))) bad.push('en ' + k + ': count outside the rule');
    if (lang === 'ar' && (/عدد المرات/.test(rest) || new RegExp('\\{(?!f\\})\\w+\\} (' + AR_PL + '|' + AR_SG + ')(?![\\u0621-\\u0652])').test(rest))) bad.push('ar ' + k + ': count outside the rule');
    let m;
    COUNT.lastIndex = 0;
    while ((m = COUNT.exec(src))) {
      const name = m[1], fo = m[2].split('|'), ph = '{' + name + '}';
      if (lang === 'en' && (fo.length < 2 || fo.length > 3 || fo[fo.length - 1].indexOf(ph) < 0)) bad.push('en ' + k + ': forms');
      if (lang === 'ar') {
        if (fo.length !== 5) { bad.push('ar ' + k + ': needs zero|one|two|few|many'); continue; }
        if (fo.slice(0, 3).some((x) => x.indexOf(ph) >= 0)) bad.push('ar ' + k + ': 0, 1 and 2 are words, not digits');
        if (fo.slice(3).some((x) => x.indexOf(ph) < 0)) bad.push('ar ' + k + ': 3-10 and 11+ show the number');
        if (!/\S(ان|ين|تا|تي)(?=[\s.،:)]|$)/.test(fo[2])) bad.push('ar ' + k + ': the two form has no dual: ' + fo[2]);
        const word = (x) => (x.split(ph + ' ')[1] || '').split(/[\s.،:)]/)[0];
        if (word(fo[3]) === word(fo[4])) bad.push('ar ' + k + ': 3-10 and 11+ use the same word');
        if (!/(ة|ً|ًا)$/.test(word(fo[4]))) bad.push('ar ' + k + ': 11+ word is not accusative: ' + word(fo[4]));
      }
    }
    if (lang === 'ar' && keys.indexOf(k) >= 0 && src.indexOf('#') < 0 && !/\{\w+\} من \{\w+\}/.test(src)) // "{n} من {m}" is a fraction, fine for any count
      bad.push('ar ' + k + ': English is counted, Arabic is not');
  }));
  // c) render every counted key with 0, 1, 2, 3, 11
  let renders = 0;
  ['en', 'ar'].forEach((lang) => {
    PS.lang = lang;
    keys.forEach((k) => {
      const names = []; let m;
      COUNT.lastIndex = 0;
      while ((m = COUNT.exec(PS.STR.en[k]))) if (names.indexOf(m[1]) < 0) names.push(m[1]);
      [0, 1, 2, 3, 11].forEach((n) => {
        const p = {};
        (PS.STR.en[k] + (PS.STR.ar[k] || '')).replace(/\{(\w+)/g, (q, x) => { p[x] = 700; });
        names.forEach((x) => { p[x] = n; });
        const txt = plain(PS.t(k, p));
        renders++;
        if (/[{}#|]/.test(txt)) bad.push(lang + ' ' + k + ' n=' + n + ': raw template: ' + txt.slice(0, 60));
        (lang === 'en' ? enBad : arBad)(txt).forEach((e) => bad.push(lang + ' ' + k + ' n=' + n + ': ' + e + ': ' + txt.slice(0, 70)));
      });
    });
  });
  // d) every line the years wrote and every drawn text
  let seen = 0;
  ['en', 'ar'].forEach((lang) => {
    PS.lang = lang;
    gameLines.forEach((l) => { seen++; const txt = plain(PS.t(l.k, l.p)); (lang === 'en' ? enBad : arBad)(txt).forEach((e) => bad.push('line ' + lang + ' ' + l.k + ': ' + e + ': ' + txt.slice(0, 70))); });
  });
  if (screen) Object.keys(screen).forEach((r) => screen[r].lines.forEach((txt) => {
    seen++;
    const ar = /[ء-ي]/.test(txt);
    (ar ? arBad : enBad)(txt).forEach((e) => bad.push('screen ' + r + ': ' + e + ': ' + txt.slice(0, 70)));
  }));
  PS.lang = lang0;
  const uniq = bad.filter((x, i) => bad.indexOf(x) === i);
  ok('G1c counted nouns follow the count rule (' + keys.length + ' keys x 0,1,2,3,11 x en/ar = ' + renders + ' renders, ' + seen + ' game and screen lines)',
    keys.length >= 10 && !uniq.length, uniq.slice(0, 6).join(' | '));
};
