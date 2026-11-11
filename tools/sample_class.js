// node tools/sample_class.js          : prints the teacher dashboard's sample class (20 result codes) and a summary
// node tools/sample_class.js --write  : also writes them to js/sample_class.js (the file teacher.html loads)
// node tools/sample_class.js --check  : exit 1 when js/sample_class.js differs from a fresh run (used by tools/regress.js)
// Each made-up student plays the real year of class code SAMPLE through js/engine.js with habits drawn from three
// styles, each a mix of the steady and impulse policies decided turn by turn: careful (88-100% steady), mixed (45-80%)
// and impulsive (0-30%). Each student picks one of the three year goals on the title screen (js/goals.js); a class code
// plays level 1, so the codes are PS2 codes with goal and level 1.
global.window = global;
const fs = require('fs'), path = require('path');
['data.js', 'ledger.js', 'engine.js', 'engine_more.js', 'goals.js', 'policy.js', 'class.js'].forEach((f) => require(path.join(__dirname, '..', 'js', f)));
const PS = global.PS;
const CLS = 'SAMPLE';
const OUT = path.join(__dirname, '..', 'js', 'sample_class.js');

let seed = 20261116;
const r = () => { seed = (seed + 0x6d2b79f5) >>> 0; let x = seed; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const pick = (a) => a[Math.floor(r() * a.length)];

// a mixed student: at each decision follows the steady habits with probability p, otherwise the impulse ones
function mixed(p) {
  const S = PS.POLICY.steady, I = PS.POLICY.impulse;
  const by = (k) => function () { return (r() < p ? S : I)[k].apply(null, arguments); };
  let turnPol = S, lastTurn = -1, lastMi = -1;
  return {
    turn(s) { if (s.turn !== lastTurn || s.mi !== lastMi) { turnPol = r() < p ? S : I; lastTurn = s.turn; lastMi = s.mi; } return turnPol.turn(s); },
    left: by('left'), reward: by('reward'), shop: by('shop'), dialog: by('dialog'),
  };
}
// quick guesses: right answers are pre q1 c, q2 b; year end q1 b, q2 a
function guess(type, phase) {
  const right = phase === 'pre' ? { q1: 'c', q2: 'b' } : { q1: 'b', q2: 'a' };
  const pr = { careful: phase === 'pre' ? 0.6 : 0.9, mixed: phase === 'pre' ? 0.35 : 0.65, impulsive: phase === 'pre' ? 0.2 : 0.4 }[type];
  const out = {};
  ['q1', 'q2'].forEach((q) => {
    if (r() < 0.1) return; // skipped
    out[q] = r() < pr ? right[q] : pick(['a', 'b', 'c'].filter((x) => x !== right[q]));
  });
  return Object.keys(out).length ? out : null;
}

const TYPES = ['careful', 'careful', 'careful', 'careful', 'careful', 'careful', 'mixed', 'mixed', 'mixed', 'mixed', 'mixed', 'mixed', 'mixed', 'mixed',
  'impulsive', 'impulsive', 'impulsive', 'impulsive', 'impulsive', 'impulsive'];
const codes = [], rows = [];
TYPES.forEach((type, i) => {
  const name = 'sample' + i;
  const [lo, hi] = { careful: [0.88, 1], mixed: [0.45, 0.8], impulsive: [0, 0.3] }[type];
  PS.POLICY[name] = mixed(lo + r() * (hi - lo));
  const goal = PS.GOAL_IDS[Math.floor(r() * PS.GOAL_IDS.length)];
  const s = PS.simYear(CLS, name, { goal, lv: 1 });
  s.predict = guess(type, 'pre'); s.recheck = guess(type, 'post'); s.rid = Math.floor(r() * 256);
  const v = PS.cls.values(s);
  codes.push(PS.cls.packCode(v));
  rows.push({ type, goal, reached: v.reached, pot: v.pot, grade: v.grade, net: v.net, fees: v.fees, ef: v.ef, imp: v.imp, endm: v.endm });
});
const file = '/* Payday Spire - the teacher dashboard sample class: 20 made-up students who played the real year of class code SAMPLE\n' +
  '   on the game rules (careful, mixed and impulsive habits), each with one of the three year goals, level 1. Made by tools/sample_class.js; regenerate with\n' +
  '   node tools/sample_class.js --write after any rule change. */\n(function () {\n  const PS = (window.PS = window.PS || {});\n  PS.SAMPLE_CODES = [\n' +
  codes.map((c) => "    '" + c + "',").join('\n') + '\n  ];\n})();\n';
if (process.argv.includes('--check')) {
  const same = fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') === file;
  console.log(same ? 'sample class: up to date' : 'sample class: OUT OF DATE (run node tools/sample_class.js --write)');
  process.exit(same ? 0 : 1);
}
console.table(rows);
if (process.argv.includes('--write')) { fs.writeFileSync(OUT, file); console.log('wrote ' + OUT); }
