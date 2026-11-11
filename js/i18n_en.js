/* Payday Spire - English text (the source) and the text helpers. Arabic is in i18n_ar.js.
   Numbers are put in by PS.t: money and counts get thousands separators and a left-to-right isolate, so they read right in Arabic too. */
(function () {
  const PS = (window.PS = window.PS || {});
  PS.STR = PS.STR || {};
  PS.lang = 'en';

  PS.num = (n) => '<bdi dir="ltr">' + Math.round(n).toLocaleString('en-US') + '</bdi>';
  // a share: the % sign goes inside the same left-to-right isolate as its number. An isolate is a neutral to the text around
  // it, so a % left outside it joins the Arabic run and shows as "%50" (tools/rtl.js checks every Arabic screen). Every
  // percent the game and the teacher dashboard draw comes from here or from "{x}%" in a string (PS.t below)
  PS.pct = (x) => '<bdi dir="ltr">' + (typeof x === 'number' ? Math.round(x).toLocaleString('en-US') : x) + '%</bdi>';
  PS.dirham = (n) => { const a = Math.abs(Math.round(n)), r = a % 100; return r >= 3 && r <= 10 ? 'دراهم' : r >= 11 ? 'درهمًا' : 'درهم'; };
  // amounts and months for the end screen and the result card: a zero is a word ("None"), never "AED 0" or "0.0 months"
  // (tools/regress_why.js W5 checks every end-screen number and comparison line)
  PS.amtOrNone = (a) => (Math.round(a) ? PS.t('aed', { a: Math.round(a) }) : PS.t('end.none'));
  // a net worth (own minus owe) of zero is the word "Zero", not "AED 0"
  PS.aedOrZero = (a) => (Math.round(a) ? PS.t('aed', { a: Math.round(a) }) : PS.t('aed.zero'));
  PS.months = (m) => (m >= 0.1 ? PS.t('end.months', { a: m.toFixed(1) }) : PS.t('end.none'));
  PS.feesShort = (a) => (Math.round(a) ? PS.t('end.feesShort', { a: Math.round(a) }) : PS.t('end.feesNone'));
  PS.plain = (html) => String(html).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  // zero rule for every sentence: when amounts ("AED {x}") or signed changes ("-{m}", "+{j}") in the English source are 0,
  // the sentence written for exactly those zeros is used: key + ".0" + their names (ev.dueLate.0b, ev.dueLate.0bi), or
  // key + ".0" when one sentence fits every zero (st.stmtLine.0). tools/regress_text.js Z2 renders every line the game
  // writes in a year (log, events, month-end window) for 200 codes x every play style x en/ar and fails on a zero amount
  const ZERO = /(AED |[-+])\{(\w+)\}/g;
  const zeroKey = (k, p) => {
    const src = PS.STR.en[k] || '', z = [];
    let m;
    ZERO.lastIndex = 0;
    while ((m = ZERO.exec(src))) if (typeof p[m[2]] === 'number' && Math.round(p[m[2]]) === 0 && z.indexOf(m[2]) < 0) z.push(m[2]);
    if (!z.length) return null;
    return [k + '.0' + z.join(''), k + '.0'].find((x) => PS.STR.en[x] != null) || null;
  };
  // grammar from the noun: {f|A|B} is A or B by the problem named in {f}. English: singular | plural (PS.GRAM.en lists the
  // plural names); Arabic: masculine | feminine verb (PS.GRAM.ar lists feminine and non-human plural names). tools/regress_text.js G1
  PS.GRAM = PS.GRAM || {};
  const agree = (s, p) => s.replace(/\{f\|([^|}]*)\|([^}]*)\}/g, (m, a, b) => ((PS.GRAM[PS.lang] || {})[p.f] ? b : a));
  // count rule: {n#one|other} in English ({n#zero|one|other} with a zero form), {n#one|two|few|many} in Arabic
  // ({n#zero|one|two|few|many}): Arabic 1 and 2 are words and the dual, 3-10 the plural, 11-99 the singular accusative,
  // 100-102 the singular genitive (by the last two digits). The form is picked by the language the string is written in.
  // tools/regress_count.js renders every counted key with 0, 1, 2, 3 and 11 in both languages
  const COUNT = /\{(\w+)#((?:[^{}]|\{\w+\})*)\}/g;
  PS.countForm = function (lang, n, f) {
    const hasZero = f.length === (lang === 'ar' ? 5 : 3), g = hasZero ? f.slice(1) : f, r = n % 100;
    if (n === 0 && hasZero) return f[0];
    if (lang !== 'ar') return n === 1 ? g[0] : g[1];
    if (n === 1) return g[0];
    if (n === 2) return g[1];
    if (r >= 3 && r <= 10) return g[2];
    return r >= 11 ? g[3] : g[3].replace(/(\{\w+\} \S+?)ًا/, '$1');
  };
  const counted = (s, p, lang) => s.replace(COUNT, (m, name, body) => (typeof p[name] === 'number' ? PS.countForm(lang, Math.round(p[name]), body.split('|')) : m));
  PS.t = function (k, p) {
    const d = PS.STR[PS.lang] || PS.STR.en;
    const zk = p && zeroKey(k, p);
    if (zk) return PS.t(zk, p);
    let s = d[k] != null ? d[k] : PS.STR.en[k] != null ? PS.STR.en[k] : k;
    // a share written in the Arabic text itself ("2.5%"): after an Arabic word its digits count as Arabic numbers, so the % would
    // be drawn on their left ("%2.5"). It gets the same isolate as a "{x}%" share (PS.pct)
    if (PS.lang === 'ar') s = s.replace(/(^|[^\d.,{])(\d[\d.,]*\d%|\d%)/g, (m, a, b) => a + '<bdi dir="ltr">' + b + '</bdi>');
    if (p) s = counted(s, p, d[k] != null ? PS.lang : 'en');
    if (p && p.f != null) s = agree(s, p);
    if (p) {
      // Arabic counted noun: 3-10 دراهم, 11-99 درهمًا, otherwise درهم (by the last two digits, as in "105 دراهم", "913 درهمًا")
      if (PS.lang === 'ar') s = s.replace(/\{(\w+)\} درهم(?![\u0621-\u0652])/g, (m, name) => (typeof p[name] === 'number' ? '{' + name + '} ' + PS.dirham(p[name]) : m));
      // {n~}: a rounded figure (nearest 100) for "about" amounts, so the gold nisab is not shown to the dirham
      s = s.replace(/\{(\w+)~\}/g, (m, name) => (typeof p[name] === 'number' ? PS.num(Math.round(p[name] / 100) * 100) : m));
      // a negative amount is always written "-AED 5,987", never "AED -5,987" (Arabic keeps "-5,987 درهم" with the sign inside the isolate)
      if (PS.lang !== 'ar') s = s.replace(/AED \{(\w+)\}/g, (m, name) => (typeof p[name] === 'number' && p[name] < 0 ? '-AED ' + PS.num(-p[name]) : m));
      s = s.replace(/\{(\w+)\}(%?)/g, (m, name, per, at) => {
        let v = p[name];
        if (v == null) return m;
        if (per) return typeof v === 'number' ? PS.pct(v) : v + per; // "{p}%": the sign stays with its number (PS.pct)
        if (name === 'f' && PS.FOES && PS.FOES[v]) {
          const n = PS.t('foe.' + v);
          // a problem's name inside a sentence ("the card bill", "of the agent fee") is lower case; after a colon or at the start it keeps its capital
          return PS.lang !== 'ar' && at > 1 && /[a-z0-9] $/.test(s.slice(at - 2, at)) && !/^(Salik|November)/.test(n) ? n.charAt(0).toLowerCase() + n.slice(1) : n;
        }
        if (typeof v === 'number') return PS.num(v);
        return v;
      });
    }
    return s;
  };

  PS.GRAM.en = { subs: 1, trials: 1, glasses: 1, whitefri: 1 }; // plural English names ("App subscriptions are handled")
  PS.STR.en = {
    title: 'Payday Spire',
    tag: 'Your first year in Dubai as a card battle. 12 months, 12 battles. Bills, surprise costs and sales are the enemies; your habits are the deck.',
    'code.l': 'Class code (optional)', 'code.n': 'Same code = same year for the whole class. Leave empty for a new year.',
    'btn.play': 'Start my year', 'btn.random': 'New code', 'btn.how': 'How to play', 'btn.settings': 'Settings', lang: 'العربية',
    'title.teacher': 'About 11 minutes a year. Keyboard, screen reader, text size, captions and reduced motion are in Settings.',
    'btn.help': 'Help',
    aed: 'AED {a}', 'aed.zero': 'Zero',
    // status bar
    'hud.month': 'Month {n} of 12', 'hud.turn': 'Turn {n} of 3', 'hud.cash': 'Cash', 'hud.buffer': 'Emergency fund', 'hud.bufferS': 'Emergency', 'hud.savings': 'Savings',
    'hud.debt': 'Card debt', 'hud.mind': 'Mood', 'hud.k': '{a}k', 'hud.limitOf': 'Card debt AED {a} of the AED {b} limit', 'hud.limitOf.0': 'No card debt (limit AED {b})', 'hud.focus': 'Focus',
    'hud.piles': 'Cards to draw {a} | Discard {b}',
    // month traits (good or neutral; never enemies)
    'trait.ramadan': 'Ramadan', 'trait.ramadan.d': 'Fasting, family iftars (the evening meal that ends the fast) and giving. “Iftar groceries” and “Give sadaqah” are planned joy cards this month.',
    'trait.eid': 'Eid al-Fitr', 'trait.eid.d': 'Time to celebrate. The “Eid gifts” card is a planned joy card: plan the money for it and it lifts your mood.',
    'trait.summer': 'Summer', 'trait.summer.d': 'The air conditioning runs all day, so power bills climb.',
    'trait.dip': 'Market dip', 'trait.dip.d': 'The profit-sharing fund fell this month. Profit-sharing means sharing the losses too.',
    'trait.sale': 'Mega sale', 'trait.sale.d': 'Sales everywhere. A pay-later offer is already in your hand.',
    'trait.friend': 'A friend in need', 'trait.friend.d': 'A friend asked to borrow money this month.',
    'trait.friday': 'Sale season', 'trait.friday.d': 'Flash deals on every screen.',
    'trait.yearend': 'Year end', 'trait.yearend.d': 'Last month. Then the year is checked: savings, debt and zakat.',
    // intents
    'in.grow': 'Grows +AED {a} at each turn end', 'in.due': 'Unpaid at month end: AED {fee} late fee is added and it comes back next month',
    'in.hit': 'Due at the end of turn {n}: AED {a}. Unpaid by then: on the card', 'in.hitNow': 'Due at the end of this turn: AED {a}. Unpaid by then: on the card',
    'in.deal': 'Month end: your rent goes up AED {a} a month', 'in.sale': 'Adds {n#no Impulse buys|an Impulse buy|{n} Impulse buys} to your next hand', 'in.mind': 'Mood -{m}',
    'in.saleLast': 'Last turn: no more Impulse buys',
    'kind.bill': 'Bill', 'kind.shock': 'Surprise cost', 'kind.deal': 'Rent raise', 'kind.sale': 'Sale',
    'foe.pull': 'Urge', 'foe.perMonth': '+AED {a} a month', 'foe.targeted': 'Your cards aim here', 'foe.pick': 'Press to aim your cards here',
    'foe.target': 'Target', 'foe.clear': 'All problems handled this month. Play saving cards or end the turn.', 'foe.targetNow': 'Target: {f}',
    'foe.agent': 'Agent fee', 'foe.phone': 'Roaming and data bill', 'foe.subs': 'App subscriptions', 'foe.fine': 'Traffic fine', 'foe.reg': 'Car registration', 'foe.salik': 'Salik toll top-up', 'foe.trials': 'Trial subscriptions', 'foe.laptop': 'Laptop repair', 'foe.tyre': 'Flat tyre',
    'foe.landlord': 'Rent raise at renewal', 'foe.carac': 'Car AC repair', 'foe.dewa': 'Summer DEWA bill', 'foe.gym': 'Gym renewal', 'foe.flight': 'Flight home', 'foe.baggage': 'Extra baggage',
    'foe.glasses': 'Broken glasses', 'foe.power': 'Extra power bill', 'foe.screen': 'Cracked phone screen', 'foe.dental': 'Toothache',
    'foe.flash': 'Online flash sale', 'foe.gadget': 'New phone launch', 'foe.megasale': 'Mega sale', 'foe.whitefri': 'November deals', 'foe.dsf': 'Year-end sale rush',
    // cards: name + result sentence
    'c.pay': 'Pay from cash', 'c.pay.d': 'Bill or surprise cost -AED {amt}, or the whole card bill, from cash',
    'c.swipe': 'Put it on the card', 'c.swipe.d': 'Bill or surprise cost -AED {amt} now, card bill +AED {amt} next month. Adds an Impulse buy',
    'c.buffer': 'Top up emergency fund', 'c.buffer.d': 'Move AED {amt} from cash to your emergency fund',
    'c.wait': 'Wait 24 hours', 'c.wait.d': 'A sale\'s urge -1, and an Impulse buy in your hand is dropped',
    'c.treat': 'Small treat', 'c.treat.d': 'Cash -AED {amt}, mood +{mind}',
    'c.autosave': 'Standing order to savings', 'c.autosave.d': 'Every payday from now: AED {amt} goes to savings first',
    'c.autopay': 'Bills on autopay', 'c.autopay.d': 'From now: the card bill is paid in full from cash when due, and any bill left at month end too',
    'c.compare': 'Compare prices', 'c.compare.d': 'A bill or surprise cost -{pct}%',
    'c.negotiate': 'Negotiate', 'c.negotiate.d': 'A bill or surprise cost -{pct}%, or the landlord drops the rent raise',
    'c.refuse': 'Say no to pay later', 'c.refuse.d': 'A sale\'s urge -{pull}, pay-later offers dropped, mood {mind}',
    'c.paycard': 'Pay down the card', 'c.paycard.d': 'Card debt -AED {amt}, from cash, then the emergency fund',
    'c.snowball': 'Costliest debt first', 'c.snowball.d': 'Pay card debt from cash first (it charges interest; a 0% pay-later instalment only once the card is clear), draw {draw}',
    'c.budget': 'Budget check', 'c.budget.d': "Draw {draw}, see next month's problems",
    'c.sink': 'Save ahead',
    'c.lunch': 'Pack lunch', 'c.lunch.d': 'Cash +AED {amt} this month',
    'c.metro': 'Take the metro', 'c.metro.d': 'Cash +AED {amt}, mood {mind}',
    'c.sidegig': 'Weekend side gig', 'c.sidegig.d': 'Cash +AED {amt}, mood {mind}',
    'c.invest': 'Profit-sharing fund', 'c.invest.d': 'AED {amt} from savings into an example fund: profit and loss shared, nothing promised',
    'c.sadaqah': 'Give sadaqah', 'c.sadaqah.d': 'Give AED {amt} in charity (sadaqah), mood +{mind}',
    'c.fundpay': 'Emergency fund pays', 'c.fundpay.d': 'Pays a surprise cost, or the card bill when cash is short, up to AED {b}',
    'c.cashadv': 'Cash advance', 'c.cashadv.d': 'Cash +AED {amt}. Card debt +AED {amt}, plus AED {fee} fee and AED {i} interest now',
    'c.iftar': 'Iftar groceries', 'c.iftar.d': 'Planned: cash -AED {amt} for shared iftars, mood +{mind}',
    'c.eidiya': 'Eid gifts', 'c.eidiya.d': 'Planned: cash -AED {amt} for eidiya (Eid money gifts) and presents, mood +{mind}',
    'c.bnploffer': 'Buy now, pay later', 'c.bnploffer.d': 'Mood +{mind}. AED {q} today, then AED {q} from each of your next 3 salaries',
    'c.impulse': 'Impulse buy', 'c.impulse.d': 'Walk away: 1 focus, mood {mind}. In hand at turn end: -AED {amt}. “Wait 24 hours” drops it too',
    'c.reminder': 'Pay-later reminder', 'c.reminder.d': 'Cannot be played. Takes a hand slot while pay-later instalments are left',
    // why a card cannot be played
    'why.none': 'No card', 'why.curse': 'Cannot be played', 'why.focus': 'Not enough focus', 'why.nosale': 'No sale to aim at',
    'why.nobill': 'No bill to aim at', 'why.nofund': 'Your emergency fund is empty', 'why.cash': 'Not enough cash', 'why.nodebt': 'No debt to pay', 'why.savings': 'Not enough savings',
    'a11y.key': 'Key {k}', 'a11y.noplay': 'cannot be played', 'a11y.cost': 'costs {n} focus', 'a11y.focus': 'Focus {n} of {m}',
    'a11y.choose': 'Please choose an option to continue.', 'a11y.newTurn': 'Turn {n}.',
    'btn.end': 'End turn', 'btn.endMonth': 'End the month', 'btn.tutGo': 'Try it', 'btn.startMonth': 'Start the month', 'btn.next': 'Next',
    'btn.seeYear': 'See my year', 'btn.close': 'Close',
    // tutorial month
    'tut.1': 'First payday: you started on the 7th, so you are paid for {n#no days|one day|{n} days}. After rent, food and transport you have <b>AED {c} cash</b>.',
    'tut.2': 'Moving in costs more: the <b>Agent fee</b> (AED 1,100) and the <b>Room deposit</b> (AED 1,800, due on turn 2 when you get the keys, returned when you move out). Pay what you can from cash.',
    'tut.3': 'Cards cost <b>focus</b> (3 a turn). “Put it on the card” costs 0 focus and puts the rest of the bill on the card. That card bill comes next month: pay it all by the due date and it costs nothing.',
    'tut.coach': '1. The bill at the top is the problem. 2. Press a card below (or key 1-5). 3. End the turn when your focus runs out.',
    'tr.flight': 'Flight home {n#this month|next month|in {n} months}: AED {a}. Put aside so far: AED {b}.',
    'tr.peek': 'Next month: {list}.', 'tr.shock': 'A surprise cost is due at the end of turn {n}: pay it before then from the emergency fund, cash or the card.',
    // payday lines
    'pd.pay': 'Payday: AED {a} in, living costs AED {b} out, cash AED {c}.',
    'pd.auto': 'Standing order: AED {a} went to savings first.',
    'pd.bnpl': 'Pay-later instalment {n} of 4: AED {a} taken from your salary.', 'pd.bnplLate': 'Not enough cash for the instalment: AED {a} was charged to your card on file.',
    'pd.loan': 'Your friend paid back AED {a} (the same amount, no extra).',
    'pd.mind': 'A new month of work: mood -{a}.', 'pd.mindW': 'A new month of work: mood -{a}, and debt worry: mood -{w}.',
    'pd.newcards': 'New cards in your deck: “Wait 24 hours” and “Small treat”.', 'pd.burnt': 'Still tired after the burnout: one card fewer in each hand this month.',
    'pd.sink': 'Money you put aside paid AED {a} of the {f}.', 'pd.dip': 'Your profit-sharing fund fell AED {a} this month.',
    'in.t': 'Month {n}', 'in.foes': 'This month: {list}.',
    // decisions
    'dlg.friend.t': 'A friend needs AED {l}', 'dlg.friend.b': 'A close friend asks to borrow AED 1,500, to pay back in two months.',
    'dlg.friend.lend': 'Lend from savings (qard hasan)', 'dlg.friend.lend.n': 'Savings -AED {l}. The same AED {l} comes back in two months, no interest.',
    'dlg.friend.card': 'Take a cash advance for them', 'dlg.friend.card.n': 'Card debt +AED {l}, plus a fee of AED {fee} and AED {i} interest right away. Only AED {l} comes back.',
    'dlg.friend.no': 'Say no kindly', 'dlg.friend.no.n': 'No money moves. Mood -4.',
    'dlg.dip.t': 'The profit-sharing fund fell', 'dlg.dip.b': 'Your profit-sharing fund lost AED {a} this month. It now holds AED {f}.',
    'dlg.dip.hold': 'Hold and wait', 'dlg.dip.hold.n': 'Keep the fund. Markets often recover after a dip, but nothing is promised.',
    'dlg.dip.sell': 'Sell everything now', 'dlg.dip.sell.n': 'The loss becomes final, and early exit costs 2%.',
    // what a played card did
    'pl.pay': 'Paid AED {a} of the {f} from cash.', 'pl.swipe': 'Put AED {a} of the {f} on the card.', 'pl.buffer': 'AED {a} into your emergency fund.',
    'pl.wait': 'You waited 24 hours.', 'pl.wait.left': 'You waited 24 hours. The {f} {f|tempts|tempt} you less.', 'pl.treat': 'A small treat (AED {a}). Mood up.',
    'pl.autosave': 'Standing order set: savings come first from next payday.', 'pl.autopay': 'Autopay on: the card bill is paid from your cash on its due date.',
    'pl.compare': 'Compared prices: the {f} {f|is|are} AED {a} cheaper.', 'pl.negotiate': 'Negotiated: the {f} {f|is|are} AED {a} cheaper.',
    'pl.negotiate.deal': 'Negotiated: the landlord kept the rent the same.', 'pl.refuse': 'You said no to pay later.',
    'pl.refuse.left': 'You said no. The {f} {f|tempts|tempt} you less.', 'pl.paycard': 'Paid AED {a} off the card.',
    'pl.snowball': 'Paid AED {a} of card debt.', 'pl.snowball.part': 'Paid a pay-later instalment early (AED {part}).',
    'pl.budget': 'Budget checked: next month is shown at the top.', 'pl.sink': 'AED {a} put aside for a big bill.',
    'pl.lunch': 'Packed lunch: +AED {a}.', 'pl.metro': 'Took the metro: +AED {a}.', 'pl.sidegig': 'Side gig: +AED {a}. You are tired.',
    'pl.invest': 'AED {a} moved into the profit-sharing fund.', 'pl.sadaqah': 'Gave AED {a} in sadaqah.', 'pl.cashadv': 'Cash advance: +AED {a} cash, AED {fee} in fee and interest at once.',
    'pl.iftar': 'Shared iftars (AED {a}). A good month.', 'pl.eidiya': 'Eid gifts given (AED {a}). Everyone smiled.',
    'pl.bnploffer': 'Bought on pay later: AED {a} today, the rest from the next 3 salaries.', 'pl.cleared': 'The {f} {f|is|are} handled.', 'pl.fundpay': 'Your emergency fund paid AED {a} of the {f}.',
    // problems acting
    'ev.impulse': 'An Impulse buy went through: AED {a}.', 'ev.grow': 'The {f} grew by AED {a}.',
    // a surprise cost that comes due: one sentence per way it was paid, so no part reads AED 0 (the worry part has its own .0 form)
    'ev.shock.c': 'The {f} came due: AED {c} went on the card. Worry: mood -{m}.', 'ev.shock.c.0': 'The {f} came due: AED {c} went on the card. Your emergency fund can pay that card bill in full.',
    'ev.shock.fc': 'The {f} came due: emergency fund AED {b}, card AED {c}. Worry: mood -{m}.', 'ev.shock.fc.0': 'The {f} came due: emergency fund AED {b}, card AED {c}.',
    'ev.shock.mc': 'The {f} came due: cash AED {d}, card AED {c}. Worry: mood -{m}.', 'ev.shock.mc.0': 'The {f} came due: cash AED {d}, card AED {c}.',
    'ev.shock.fmc': 'The {f} came due: emergency fund AED {b}, cash AED {d}, card AED {c}. Worry: mood -{m}.', 'ev.shock.fmc.0': 'The {f} came due: emergency fund AED {b}, cash AED {d}, card AED {c}.',
    'ev.sale': 'The {f} slipped an Impulse buy into your deck.',
    // month end
    'st.t': 'End of month {n}', 'st.allPaid': 'Every bill was handled.',
    'st.autopay': 'Autopay paid AED {a} of the {f}.', 'st.unpaid': '{f} not paid: AED {a} still owed, plus a late fee of AED {fee}. It comes back next month (AED {b}).',
    'st.rent': 'You did not negotiate: rent is AED {a} higher every month from now.',
    'st.toSave': 'Leftover cash went to savings: AED {a}.', 'st.spent': 'Leftover cash spent on fun: AED {a} (mood +{j}).',
    'st.profit': 'Profit-sharing fund: AED {a} profit share ({r}%, example value).', 'st.burnout': 'Burnout: mood hit 0. Tired spending (delivery, taxis, a missed shift) took AED {a}. Next month: one card fewer, and an Impulse buy joins your deck.',
    'st.nw': 'Net worth now: AED {a}', 'st.nw.0': 'Net worth now: zero (what you own equals what you owe)',
    'lf.t': 'AED {a} cash is left', 'lf.save': 'Save it', 'lf.save.n': 'Into your goals: course, profit-sharing fund, lending.', 'lf.spend': 'Spend it on fun', 'lf.spend.n': 'Mood +{j}. Nothing saved.',
    // habit cards
    'rw.t': 'Pick a habit', 'rw.first': 'Habits are cards. Add one to your deck, or skip.', 'rw.b': 'Add one card, or skip.',
    'rw.skip': 'Skip', 'rw.added': 'Added: {c}',
    'sh.t': 'Shop and coach', 'sh.b': 'Savings now: AED {a}.', 'sh.b.0': 'Savings now: none.',
    'sh.bx': 'Emergency fund above its AED {g} goal: AED {b}, also free for the course.', 'sh.bs': 'Put aside for the flight: AED {a}, kept apart from savings.',
    'sh.course': 'Skills course: AED {a}', 'sh.course.n': 'Salary +AED 300 a month from next month (example).',
    'sh.owned': 'Already done', 'sh.coach': 'Coach: drop a card', 'sh.coach.b': 'Remove one card for good.',
    'sh.leave': 'Leave', 'sh.bought': 'Course done: salary +AED {r} a month.', 'sh.removed': 'Removed: {c}',
    // help
    'help.t': 'How to play',
    'help.1': 'A year = 12 months. A month = one battle of 3 turns. Payday pays rent and food first; the cash left is yours to fight with.',
    'help.2': 'Money problems are the enemies: bills (pay them by month end, or they come back with a late fee), surprise costs (they hit on a set turn) and sales (they slip Impulse buys into your hand).',
    'help.3': 'Each turn you get 5 cards and 3 focus. The card text says exactly what happens.',
    'help.4': '<b>Emergency fund</b>: fill it with leftover cash at month end. It pays surprise costs and, if your salary is late, rent and living costs. <br><b>Surprise cost</b>: it shows the turn it is due. Pay before then with “Emergency fund pays”, from cash, or on the card. Unpaid on the due day, it goes on the card.',
    'help.5': "<b>Card bill</b>: what you put on the card this month is due in the middle of next month. Pay it all by then and it costs nothing, as long as last month's bill was paid in full too: after a bill that was not, the next one has no interest-free period. Less, and interest is charged on the whole bill; under the minimum, a late fee too. Over AED {lim} the card is frozen.",
    'help.6': '<b>Mood</b> drops with work and worry. At 0 you burn out. Small treats and planned joy keep it up.',
    'help.keys': 'Keys: 1-5 play a card, T or arrows change target, E ends the turn, H opens this help, Esc closes a window.',
    // settings
    'set.t': 'Settings', 'set.lang': 'Language', 'set.size': 'Text size', 'set.motion': 'Motion', 'set.captions': 'Sound captions',
    'set.sound': 'Sound', 'set.on': 'On', 'set.off': 'Off', 'set.note': 'Colours are colour-blind safe, and every colour also has an icon and a word.',
    // end
    'end.t': 'Your first year', 'grade.steady': 'Steady year', 'grade.made': 'You made it', 'grade.frozen': 'Card frozen',
    'grade.steady.d': 'No card debt, no overdue bills, a month of costs in your emergency fund (a first goal: aim for 3 to 6) and no burnout.', 'grade.made.d': 'You finished the year, but not a steady one: {r}.',
    'grade.frozen.d': 'In month {m} your card debt passed the AED {lim} limit. The bank froze the card and the year ended.',
    'end.nw': 'Net worth', 'end.fees': 'Interest and fees paid', 'end.buf': 'Emergency fund', 'end.months': '{a} months of costs', 'end.debt': 'Card debt left',
    'end.why': 'Why it went this way', 'end.cmp': 'The same year, other habits', 'end.you': 'You', 'end.steady': 'Steady habits',
    'end.feesShort': 'fees AED {a}', 'end.cmp.n': 'Same class code, same months. Steady habits = pay bills from cash, fill the emergency fund, wait out sales, pay the card bill in full by its due date.',
    'end.zakat': 'Zakat check', 'end.zpct': '{p}% of the nisab',
    'end.z.below': 'Your savings, profit-sharing fund and emergency fund, less debts due now: AED {w}. That is {p}% of the gold nisab (85 g, about AED {n~}), so zakat is not due. If your wealth reaches the nisab, a lunar year (hawl) counts from that day. What you gave this year (AED {g}) was sadaqah.',
    'end.z.above': 'Your savings, profit-sharing fund and emergency fund, less debts due now: AED {w}, above the gold nisab (about AED {n~}). Zakat (2.5%) is due once the wealth has been held a full lunar year (hawl). What you gave this year (AED {g}) was sadaqah.',
    'end.z.note': 'Some scholars use the silver nisab (595 g), which is much lower. For your own money, ask a scholar or use the UAE Zakat Fund calculator.',
    'end.share.t': 'Share with your class', 'end.code': 'Class code: <b>{c}</b>. Anyone who enters it plays the same year.',
    'end.share': 'Payday Spire | class code {c} | {g} | net worth AED {nw} | interest and fees AED {i} | emergency fund {m} months | result {r}',
    'end.same': 'Play the same year again', 'end.copy': 'Copy result', 'end.new': 'New year', 'end.copied': 'Result copied',
    'end.simple': 'Simplified for a short game. <br>Limit: a real card limit is often 2-3 months of salary. <br>Interest: shown as one month at 3% on the whole bill when it is not paid in full (real cards count each day from the purchase). <br>Late fees on bills and fund returns are example values, not a real product.',
    // why sentences
    'wy.frozen': 'In month {m} your card debt passed AED {lim} and the card was frozen.',

    'wy.bnpl': 'The pay-later buy in month {m} took AED {a} from each of the next three salaries.',
    'wy.shockBuf': 'In month {m} your emergency fund took the {f} (AED {a}) and nothing went on the card.',
    'wy.auto': 'From month {m}, a standing order moved money to savings before you could spend it: AED {a} in all.',
    'wy.sink': 'Money put aside early made the {f} AED {a} smaller.',
    'wy.spent': 'You spent AED {a} of leftover cash on fun instead of saving it.',
    'wy.gapImp': 'The same year with steady habits ended with AED {d} more net worth. The biggest part: AED {a} more in Impulse buys in your year.',
    'wy.gapAuto': 'The same year with steady habits ended with AED {d} more net worth. The biggest part: a standing order moved AED {a} more to savings there.',
    'wy.gapFun': 'The same year with steady habits ended with AED {d} more net worth. The biggest part: AED {a} more of leftover cash went on fun in your year.',
    'wy.impulse': 'Impulse buys you did not wait out cost AED {a}.',
    'wy.rent': 'Not negotiating the rent raise cost AED {a} over the year.',
    'wy.fullPay': 'You put AED {a} on the card and paid each card bill in full by its due date, so no interest. But card spending let {n#no extra Impulse buys|an extra Impulse buy|{n} extra Impulse buys} into your deck.',
    'wy.lent': 'You lent a friend AED {a} as qard hasan and got the same amount back.',
    'wy.steady': 'You paid bills from cash and kept your plan most months.',
    // captions
    'cap.pay': 'coins', 'cap.card': 'card beep', 'cap.save': 'savings chime', 'cap.calm': 'calm tone', 'cap.joy': 'happy chime', 'cap.shock': 'crash',
    'cap.sale': 'sale ping', 'cap.turn': 'turn ends', 'cap.month': 'payday chime', 'cap.good': 'year done, cheerful tune', 'cap.bad': 'year over, low tune', 'cap.no': 'blocked',
    // v2 rules: card bill due date, overdue bills, emergency fund at month end
    'in.card': 'Due at the end of turn 2. Pay in full: no interest. Pay less: interest on the whole bill (about AED {i}). Below the minimum: AED {fee} late fee too',
    'in.cardNow': 'Due at the end of this turn. Pay in full: no interest. Pay less: interest on the whole bill (about AED {i}). Below the minimum: AED {fee} late fee too',
    'kind.card': 'Card bill',
    'foe.cardbill': 'Card bill',
    'foe.overdueTag': 'Overdue',
    'foe.min': 'Minimum AED {a}',
    'c.swipe.d0': 'A bill or surprise cost -AED {amt} now. The card bill comes next month',
    'pd.stmt': 'Card bill from last month: AED {a}, due at the end of turn 2 (minimum AED {m}).',
    'pd.overdue': 'Overdue: the {f} {f|is|are} back, now AED {a} with the late fee.',
    'pd.cardRule': 'New rule: each “Put it on the card” slips an Impulse buy into your deck (paying by card makes spending feel easier).',
    'ev.dueAuto': 'Autopay paid AED {a} of the card bill on its due date.',
    'ev.dueShort': 'Card bill due: AED {b} of {a} paid. Not paid in full, so interest is charged on all of it: AED {i}. Card debt now AED {d}.',
    'ev.dueLate.0b': 'Card bill due: nothing of AED {a} paid, under the minimum. Interest AED {i} + late fee AED {fee}. Card debt now AED {d}.',
    'ev.dueLate.0i': 'Card bill due: only AED {b} of {a} paid, under the minimum. Late fee AED {fee} (the interest rounds to nothing). Card debt now AED {d}.',
    'ev.dueLate.0bi': 'Card bill due: nothing of AED {a} paid, under the minimum. Late fee AED {fee} (the interest rounds to nothing). Card debt now AED {d}.',
    'ev.dueLate': 'Card bill due: only AED {b} of {a} paid, under the minimum. Interest AED {i} + late fee AED {fee}. Card debt now AED {d}.',
    'pl.swipe.imp': 'Put AED {a} of the {f} on the card. An Impulse buy joined your deck.',
    'st.unpaid2': '{f} still not paid: another AED {fee} late fee. It comes back again (AED {b}).',
    'st.stmtLine': 'Card bill: AED {a}, due at the end of turn 2 next month. Pay in full: no interest. Pay less: about AED {i} interest.',
    'st.stmtLine.0': 'Nothing is owed on the card, so there is no card bill next month.',
    'lf.buf': 'Emergency fund (surprise costs, late salary)',
    'lf.buf.n': 'It will hold AED {b} of its AED {g} goal.',
    'st.toBuf': 'Leftover cash went to the emergency fund: AED {a}.',
    'wy.overdue': '{n#No bill was left unpaid at month end|A bill was left unpaid at month end once|A bill was left unpaid at month end {n} times}, and the late fees cost AED {a}.',
  };
})();
