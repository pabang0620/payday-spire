// Balance check without a browser: node tools/sim.js [CODE ...]
// Runs the steady, impulse and idle styles through js/engine.js for each class code and prints the year.
global.window = global;
const path = require('path');
['data.js', 'ledger.js', 'engine.js', 'engine_more.js', 'policy.js'].forEach((f) => require(path.join(__dirname, '..', 'js', f)));
const PS = global.PS;
const codes = process.argv.slice(2).length ? process.argv.slice(2) : ['CLASS7', 'ABCDEF', 'MAJLSX', 'DUBA22', 'K9XRTP', 'GULF26'];
const rows = [];
codes.forEach((code) => {
  ['steady', 'impulse', 'idle'].forEach((p) => {
    const s = PS.simYear(code, p);
    rows.push({ code, p, end: s.over === 'limit' ? 'FROZEN m' + (s.st.overMonth + 1) : 'm' + Math.min(12, s.mi + 1),
      net: PS.E.netWorth(s), debt: Math.round(s.debt), buf: s.buffer, sav: s.savings, fund: s.fund,
      int: s.st.interest, late: s.st.lateFees, imp: s.st.impulse, burn: s.st.burnouts, mind: s.mind });
  });
});
console.table(rows);
