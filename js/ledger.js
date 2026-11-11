/* Payday Spire - where the card debt came from and what it cost. Every AED that goes on the card carries a cause tag
   (a breakdown, the late salary, bills put on the card, Impulse buys, ...). Payments take from every cause in proportion,
   and interest or a late fee on a statement is shared out in proportion to what that statement was made of. So the end
   screen can say "the glasses put AED 60 on the card and AED 2 of interest followed" and never give one cause the
   interest that another one made. st.cost sums to interest + late fees + cash advance fees, exactly. Loaded before engine.js. */
(function () {
  const PS = (window.PS = window.PS || {});
  const sumOf = (o) => Object.keys(o).reduce((a, k) => a + o[k], 0);

  // integer shares of n in proportion to the weights in src (largest remainder, so the shares add up to n)
  function share(n, src) {
    const keys = Object.keys(src).filter((k) => src[k] > 0), tot = keys.reduce((a, k) => a + src[k], 0), out = {};
    if (!n) return out;
    if (!keys.length || tot <= 0) { out.other = n; return out; }
    let given = 0;
    const rest = keys.map((k) => { const x = (n * src[k]) / tot, f = Math.floor(x); out[k] = f; given += f; return [k, x - f]; })
      .sort((a, b) => b[1] - a[1]);
    for (let i = 0; i < n - given; i++) out[rest[i % rest.length][0]] += 1;
    return out;
  }
  const add = (o, k, a) => { if (a) o[k] = (o[k] || 0) + a; };

  PS.L = {
    share,
    init(s) { s.src = {}; s.stmtSrc = {}; s.st.cost = {}; s.st.put = {}; s.st.fundOut = []; },
    // money goes on the card for this cause
    owe(s, amt, tag) { if (amt <= 0) return; s.debt += amt; add(s.src, tag, amt); add(s.st.put, tag, amt); },
    // a fee or interest that belongs to one cause (a cash advance fee, a pay-later late fee); onCard: it is added to the card
    fee(s, amt, tag, onCard) { if (amt <= 0) return; add(s.st.cost, tag, amt); if (onCard) { s.debt += amt; add(s.src, tag, amt); } },
    // a fee that is not card debt (a bill's late fee)
    cost(s, amt, tag) { add(s.st.cost, tag, amt); },
    // interest or a late fee on the statement: shared by what the statement was made of, and it stays on the card under those causes
    onStmt(s, amt) {
      const sh = share(amt, sumOf(s.stmtSrc) > 0 ? s.stmtSrc : s.src);
      Object.keys(sh).forEach((k) => { add(s.st.cost, k, sh[k]); add(s.src, k, sh[k]); });
      s.debt += amt;
    },
    // money paid off the card leaves every cause in proportion
    repay(s, x) {
      if (x <= 0) return;
      const tot = sumOf(s.src);
      s.debt -= x;
      if (tot <= 0) return;
      const keep = Math.max(0, tot - x) / tot;
      Object.keys(s.src).forEach((k) => { s.src[k] *= keep; if (s.src[k] < 0.005) delete s.src[k]; });
    },
    // the statement closes at month end: remember what it is made of
    close(s) { s.stmtSrc = Object.assign({}, s.src); },
    total: (s) => sumOf(s.st.cost),
    // money out of the emergency fund and what it paid (why: gap = the late salary, shock = a breakdown f, card = a card
    // bill), with what was left after it: the end screen can say why the fund was empty when a later problem came
    fundOut(s, amt, why, f) { if (amt > 0) s.st.fundOut.push({ mi: s.mi, a: Math.round(amt), why, f: f || '', left: Math.round(s.buffer) }); },
  };
})();
