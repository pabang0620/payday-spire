/* Payday Spire - "Why it went this way": the three sentences on the end screen, built from what really happened.
   Rules (checked for every class code and play style by tools/regress_why.js):
   1. A sentence is made of a head and clauses. A clause with an amount of 0 is left out, so no sentence reads "AED 0 of ...".
   2. Interest and fees come from the ledger (js/ledger.js): each cause carries only the interest its own card money made,
      so every AED of interest and fees is told once, by one sentence, and all fee sentences add up to the year's total.
   3. Order: a frozen card; then what the card cost (interest and fees of AED 50 or more, biggest first: the game's lesson);
      then other money lost (Impulse buys, tired spending, the rent raise...) biggest first; then card use with little or
      no cost; then what went well; card use under AED 100 that cost nothing comes last. */
(function () {
  const PS = (window.PS = window.PS || {});
  const t = (k, p) => PS.t(k, p);
  const EVERYDAY = ['swipe', 'imp', 'burn', 'other']; // bills and buys put on the card: their interest is told by the missed-bill sentence
  const TIER = { frozen: 4, debt: 3, loss: 2, card: 1, good: 0, small: -1 };
  const MINOR = 50; // interest and fees under AED 50 from one cause are told, but after the bigger losses
  const SMALL = 100; // card use under AED 100 that cost nothing is told last, after what went well (it is rarely worth a top-three place)

  // head + clauses [[key, amount, params], ...]; a clause with amount 0 is dropped (amount null = a clause with no number)
  PS.cls.compose = function (head, hp, clauses) {
    const parts = clauses.filter((c) => c[1] == null || c[1] > 0).map((c) => t(c[0], Object.assign({ n: c[1] }, c[2] || {})));
    let h = head ? t(head, hp) : '';
    if (!parts.length) return h;
    const ar = PS.lang === 'ar';
    let body = ar ? parts.map((x, i) => (i ? 'و' + x : x)).join('، ')
      : parts.length === 1 ? parts[0] : parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
    if (!ar && (!h || /\.$/.test(h))) body = body.charAt(0).toUpperCase() + body.slice(1);
    return (h ? h + ' ' : '') + body + '.';
  };

  // why the emergency fund had nothing for a problem (st.fundOut, js/ledger.js): the last payment out of the fund before it
  // (index < fo) left the fund at 0, so that payment is the reason, told with its amount and month (tools/regress_why.js W6);
  // a fund that never paid anything had never been filled
  PS.cls.emptyFund = function (st, fo) {
    const e = (st.fundOut || [])[fo - 1];
    if (!e || e.left !== 0) return ['wc.noBuf2', null];
    return [e.why === 'gap' ? 'wc.noBufGap' : e.why === 'shock' ? 'wc.noBufShock' : 'wc.noBufCard', e.a, { m: e.mi + 1, f: e.f }];
  };

  // every candidate sentence, best first: {k, tier, v (AED for the order), text, fees: [{tag, a}] (the interest and fees it tells)}
  PS.cls.whyAll = function (s) {
    const C = PS.CONST, st = s.st, cost = st.cost || {}, out = [];
    const cf = (tag) => Math.round(cost[tag] || 0);
    // a sentence about interest and fees is a 'debt' sentence when the amount is AED 50 or more, else it waits behind the losses
    const add = (k, tier, v, text, fees) => {
      const tr = tier === 'debt' && v < MINOR ? 'card' : tier;
      const small = tr === 'card' && v < SMALL && !(fees || []).some((f) => f.a > 0);
      out.push({ k, tier: TIER[small ? 'small' : tr], v, text, fees: fees || [] });
    };
    if (s.over === 'limit') add('wy.frozen', 'frozen', 0, t('wy.frozen', { m: st.overMonth + 1, lim: s.limit || C.LIMIT }));
    // breakdowns that went on the card
    st.shocks.filter((x) => x.c > 0).forEach((x) => {
      const k = cf('shock:' + x.f);
      add('wy.shock', k > 0 ? 'debt' : 'card', k > 0 ? k : x.c, PS.cls.compose('wy.shock.h', { m: x.mi + 1, f: x.f, a: x.a },
        [x.b > 0 ? ['wc.bufPaid', x.b] : x.left > 0 ? ['wc.bufSkipped', null] : PS.cls.emptyFund(st, x.fo), ['wc.savPaid', x.v || 0], ['wc.cashPaid', x.m || 0], ['wc.card', x.c],
          k > 0 ? ['wc.cost', k] : ['wc.costNone', null]]),
      [{ tag: 'shock:' + x.f, a: k }]);
    });
    // the late salary
    const g = st.gap;
    if (g && g.adv + g.card > 0) {
      const k = cf('gap');
      add('wy.late', k > 0 ? 'debt' : 'card', k > 0 ? k : g.card, PS.cls.compose('wy.late.h', { m: g.mi + 1 },
        [g.buf > 0 ? ['wc.bufPaid', g.buf] : PS.cls.emptyFund(st, g.fo), ['wc.savPaid', g.sav || 0], g.adv > 0 ? ['wc.adv', g.adv] : ['wc.noAdv', null],
          ['wc.cardLiving', g.card], ['wc.cost', k]]), [{ tag: 'gap', a: k }]);
    }
    // covered without credit: by the fund alone (what went well), or partly by savings (a goal set back)
    if (g && g.adv + g.card === 0 && !g.sav) add('wy.lateBuf', 'good', g.buf, t('wy.lateBuf', { m: g.mi + 1, c: g.buf }));
    if (g && g.adv + g.card === 0 && g.sav > 0) add('wy.late', 'card', g.sav, PS.cls.compose('wy.late.h', { m: g.mi + 1 },
      [g.buf > 0 ? ['wc.bufPaid', g.buf] : PS.cls.emptyFund(st, g.fo), ['wc.savPaid', g.sav], ['wc.noAdv', null]]));
    // card bills not paid in full: the interest and late fees that everyday card spending made
    const ev = EVERYDAY.reduce((a, k) => a + cf(k), 0);
    if (ev > 0) add('wy.missed', 'debt', ev, t('wy.missed', { k: st.missed, n: ev }), EVERYDAY.map((tag) => ({ tag, a: cf(tag) })));
    if (cf('adv') > 0) add('wy.adv', 'debt', cf('adv'), t('wy.adv', { n: cf('adv') }), [{ tag: 'adv', a: cf('adv') }]);
    if (cf('friend') > 0) add('wy.friendCard', 'debt', cf('friend'), t('wy.friendCard', { n: cf('friend'), l: C.LOAN }), [{ tag: 'friend', a: cf('friend') }]);
    if (st.bnplMonth >= 0) {
      const k = cf('bnpl'), part = PS.CARDS.bnploffer.amt / 4;
      add('wy.bnpl', 'loss', k + part, PS.cls.compose('wy.bnpl', { m: st.bnplMonth + 1, a: part }, [['wc.cost', k]]), [{ tag: 'bnpl', a: k }]);
    }
    if (st.overdueN > 0) add('wy.overdue', 'debt', cf('overdue'), t('wy.overdue', { n: st.overdueN, a: cf('overdue') }), [{ tag: 'overdue', a: cf('overdue') }]);
    if (st.burnouts > 0) add('wy.burn', 'loss', st.tiredSpend || 0, PS.cls.compose('wy.burn.h', { n: st.burnouts }, [['wc.tired', st.tiredSpend || 0], ['wc.tiredImp', null]]));
    // tired months without a burnout (mind under LOW_MIND at a month's start): their tired spending
    if (!st.burnouts && st.tiredSpend > 0) add('wy.tired', 'loss', st.tiredSpend, t('wy.tired', { a: st.tiredSpend, l: C.LOW_MIND }));
    // savings broken to pay what the emergency fund could not (the goal set back, no fee): told after the money lost
    const broke = (st.broke || []).reduce((a, x) => a + x.a, 0);
    if (broke > 0) add('wy.save', 'card', broke, t('wy.save', { a: broke }));
    if (st.impulse >= 600) add('wy.impulse', 'loss', st.impulse, t('wy.impulse', { a: st.impulse }));
    if (st.rentRaised > 0) add('wy.rent', 'loss', st.rentRaised, t('wy.rent', { a: st.rentRaised }));
    if (st.spentLeft > 2000) add('wy.spent', 'loss', Math.round(st.spentLeft / 2), t('wy.spent', { a: st.spentLeft }));
    if (ev === 0 && st.swiped > 0 && st.cardImp > 0) add('wy.fullPay', 'card', st.cardImp * PS.CARDS.impulse.amt, t('wy.fullPay', { a: st.swiped, n: st.cardImp }));
    st.shocks.filter((x) => x.c === 0 && x.b > 0).forEach((x) => add('wy.shockBuf', 'good', x.a, t('wy.shockBuf', { m: x.mi + 1, f: x.f, a: x.a })));
    if (st.autosaved > 0) add('wy.auto', 'good', st.autosaved, t('wy.auto', { m: st.autosaveFrom + 1, a: st.autosaved }));
    if (st.sinkUsed > 0) add('wy.sink', 'good', st.sinkUsed, t('wy.sink', { f: st.sinkFoe, a: st.sinkUsed }));
    if (st.lent) add('wy.lent', 'good', C.LOAN, t('wy.lent', { a: C.LOAN }));
    // a careful year that still ended well below steady habits: name the biggest part of the gap
    if (s.over !== 'limit' && s.code && PS.simYear && !out.some((x) => x.tier === TIER.loss && x.v >= 300)) {
      const sd = PS.simYear(s.code, 'steady', PS.runOpt ? PS.runOpt(s) : null), gap = PS.E.netWorth(sd) - PS.E.netWorth(s);
      const parts = [['wy.gapImp', s.st.impulse - sd.st.impulse], ['wy.gapAuto', sd.st.autosaved - st.autosaved], ['wy.gapFun', st.spentLeft - sd.st.spentLeft]]
        .sort((a, b) => b[1] - a[1]);
      if (gap >= 1000 && parts[0][1] >= 300) add(parts[0][0], 'loss', parts[0][1], t(parts[0][0], { d: gap, a: parts[0][1] }));
    }
    return out.sort((a, b) => b.tier - a.tier || b.v - a.v);
  };

  PS.cls.why = function (s) {
    const all = PS.cls.whyAll(s).slice(0, 3);
    if (all.length < 3) all.push({ k: 'wy.steady', tier: TIER.good, v: 0, text: t('wy.steady'), fees: [] });
    return all;
  };
})();
