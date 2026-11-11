// K1 for tools/regress.js: every card that is aimed at a problem says in its text exactly the kinds of problem it can really
// be played on (PS.E.aims): with one problem of every kind on screen, the kinds a card can aim at = the kinds its text
// names, in English and Arabic. (The 6th judge: "Pay from cash" said only "Bill" but also pays a breakdown or the card bill.)
// The words: bill, breakdown, card bill, sale, landlord / rent raise. An effect on the card bill ("card bill +600 next
// month", "فاتورة البطاقة +600") is not a target and is left out before reading.
const WORDS = {
  en: { strip: /card bill \+AED \{amt\}|the card bill comes/gi, card: /card bill/i, bill: /\bbills?\b/i, shock: /surprise cost/i, sale: /\bsale/i, deal: /landlord|rent raise/i },
  ar: { strip: /فاتورة البطاقة \+\{amt\}|فاتورة البطاقة تصل/g, card: /فاتورة البطاقة/, bill: /فاتورة|الفاتورة/, shock: /نفقة طارئة/, sale: /التخفيضات/, deal: /المالك|زيادة الإيجار/ },
};
module.exports = function (PS, ok) {
  const E = PS.E, bad = [];
  const kinds = ['bill', 'shock', 'card', 'sale', 'deal'];
  const ids = { bill: 'phone', shock: 'tyre', card: 'cardbill', sale: 'flash', deal: 'landlord' };
  const s = E.newGame('CLASS7');
  s.foes = kinds.map((k, i) => ({ id: ids[k], kind: k, amt: 300, max: 300, pull: 2, gone: false, at: 0, i }));
  s.turn = 0;
  let n = 0;
  Object.keys(PS.CARDS).forEach((id) => {
    if (!PS.CARDS[id].aim) return;
    n++;
    const can = E.aims(s, { id }).map((i) => s.foes[i].kind).sort().join(',');
    ['en', 'ar'].forEach((lang) => {
      ['c.' + id + '.d', 'c.' + id + '.d0'].forEach((key) => {
        const src = PS.STR[lang][key];
        if (src == null) return;
        const w = WORDS[lang];
        let txt = src.replace(w.strip, '');
        const said = [];
        if (w.card.test(txt)) { said.push('card'); txt = txt.replace(new RegExp(w.card.source, 'g'), ''); }
        ['bill', 'shock', 'sale', 'deal'].forEach((k) => { if (w[k].test(txt)) said.push(k); });
        if (said.sort().join(',') !== can) bad.push(lang + ' ' + key + ' says ' + said.join('+') + ', plays on ' + can.replace(/,/g, '+'));
      });
    });
  });
  ok('K1 card texts name the problems each card can really be played on (' + n + ' aimed cards, en/ar)', n >= 6 && !bad.length, bad.slice(0, 4).join(' | '));
  // K1b a set price (data.js fixed: deposit, fine, fees, tariffs, the flight fare) and a bill already late take no Compare prices
  // and no Negotiate (it was possible to compare quotes for the room deposit before 2026-11-11)
  const t = E.newGame('CLASS7'), set = Object.keys(PS.FOES).filter((id) => PS.FOES[id].fixed);
  t.foes = set.map((id, i) => ({ id, kind: PS.FOES[id].kind, amt: 300, max: 300, pull: 0, gone: false, at: 0, i }))
    .concat([{ id: 'phone', kind: 'bill', amt: 450, max: 450, pull: 0, gone: false, at: 0, overdue: 1, i: set.length }]);
  t.turn = 0;
  const cut = ['compare', 'negotiate'].map((id) => E.aims(t, { id }).map((i) => id + ' ' + t.foes[i].id)).reduce((a, b) => a.concat(b), []);
  ok('K1b no price cut on a set price or a late bill (' + set.length + ' set prices)', set.length >= 7 && !cut.length, cut.join(', '));
};
