// Numbers in README.md and concept_doc.md come from the tools, not from memory. Each one is written between markers:
//   <!--n:net_steady-->21,180<!--/n-->
// node tools/doc_numbers.js           : lists every marker with the measured value (* = differs)
// node tools/doc_numbers.js --write   : writes the measured values into the two documents
// tools/regress.js check D1 fails when a marker differs (so a changed rule cannot leave an old number in the documents).
// Sources: the lesson styles through js/engine.js (same as tools/regress.js), card and enemy tables in js/data.js, the check
// count of the last regress run (tools/regress_summary.json), tools/a11y_audit.json and tools/playtest_results.json.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const DOCS = ['README.md', 'concept_doc.md', 'DESIGN.md', 'docs/lesson_plan.md', 'docs/pilot_onepager.md'];
const CODES = ['CLASS7', 'K7M3QX', 'ABCDEF', 'MAJLSX', 'DUBA22', 'GULF26', 'SANDY9', 'Z4QPRW'];
const MARK = /<!--n:([\w]+)-->([^<]*)<!--\/n-->/g;
const fmt = (n) => (n < 0 ? '-' : '') + Math.abs(Math.round(n)).toLocaleString('en-US');
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8')); } catch (e) { return null; } };

function load() {
  if (global.PS && global.PS.simYear && global.PS.POLICY.swipeAll) return global.PS;
  global.window = global;
  ['data.js', 'ledger.js', 'engine.js', 'engine_more.js', 'goals.js', 'policy.js', 'class.js'].forEach((f) => require(path.join(ROOT, 'js', f)));
  require('./policies.js')(global.PS);
  return global.PS;
}

// checks: the number of checks in tools/regress.js (it passes its own count; otherwise the last run's summary)
function values(checks) {
  const PS = load(), E = PS.E, v = { codes: String(CODES.length) };
  const styles = ['steady', 'swipeAll', 'noBuffer', 'nothing', 'impulse'];
  const res = {};
  styles.forEach((p) => { res[p] = CODES.map((c) => PS.simYear(c, p)); });
  const net = (p) => res[p].map((s) => E.netWorth(s));
  const steady = net('steady'), sAvg = steady.reduce((a, b) => a + b, 0) / CODES.length;
  styles.forEach((p) => {
    const n = net(p), avg = n.reduce((a, b) => a + b, 0) / CODES.length;
    const pcts = n.map((x, i) => Math.round((x / steady[i]) * 100));
    v['net_' + p] = fmt(avg);
    v['pct_' + p] = String(Math.round((avg / sAvg) * 100));
    v['lo_' + p] = String(Math.min.apply(null, pcts));
    v['hi_' + p] = String(Math.max.apply(null, pcts));
    v['fees_' + p] = fmt(res[p].reduce((a, s) => a + s.st.interest + s.st.lateFees + s.st.advFees, 0) / CODES.length);
    v['imp_' + p] = fmt(res[p].reduce((a, s) => a + s.st.impulse, 0) / CODES.length);
    v['frozen_' + p] = String(res[p].filter((s) => s.over === 'limit').length);
    const months = res[p].filter((s) => s.over === 'limit').map((s) => s.st.overMonth + 1);
    if (months.length) {
      const lo = Math.min.apply(null, months), hi = Math.max.apply(null, months);
      v['frozenAt_' + p] = lo === hi ? 'month ' + lo : 'months ' + lo + ' to ' + hi;
    }
  });
  v.limit_swipeAll = String(Math.round(require('./policies.js').MAX_SHARE.swipeAll * 100));
  // R4 (tools/regress_lesson.js, written by the last regress run): every style on many codes, as a share of steady
  const les = readJson('regress_lesson.json');
  if (les) {
    v.lesson_codes = String(les.codes); v.lesson_styles = String(les.rows.length); v.lesson_luck = String(Math.round(les.luck * 100));
    les.rows.forEach((r) => { v['lesson_' + r.style] = String(r.pct); });
  }
  v.cards = String(Object.keys(PS.CARDS).length);
  const man = fs.readFileSync(path.join(ROOT, 'art_b', 'manifest.js'), 'utf8').match(/"art_b\/[^"]+"/g) || [];
  v.pics = String(man.length);
  v.portraits = String(man.filter((x) => /enemy_/.test(x)).length);
  v.foes = String(Object.keys(PS.FOES).length);
  const sum = readJson('regress_summary.json');
  v.checks = String(checks != null ? checks : sum ? sum.checks : '?');
  const a = readJson('a11y_audit.json');
  v.a11y = a ? fmt(a.checked) : '?';
  v.a11yFail = a ? String(a.failures) : '?';
  v.a11yScreens = a ? String(a.screens) : '?';
  const pt = readJson('playtest_results.json') || {};
  const k7 = pt.steady_K7M3QX_en_desktop, c7 = pt.steady_CLASS7_en_desktop, im = pt.impulse_CLASS7_ar_desktop;
  v.playK7 = k7 ? k7.time_min.toFixed(1) : '?';
  v.playC7 = c7 ? c7.time_min.toFixed(1) : '?';
  v.playImp = im ? im.time_min.toFixed(1) : '?';
  v.pressK7 = k7 ? String(k7.clicks) : '?';
  v.playLo = k7 && c7 ? String(Math.floor(Math.min(k7.time_min, c7.time_min))) : '?';
  v.playHi = k7 && c7 ? String(Math.ceil(Math.max(k7.time_min, c7.time_min))) : '?';
  v.endMin = k7 ? String(Math.round(k7.end_screen_min)) : '?';
  // the dashboard sample class (js/sample_class.js, PS2 codes): how many had each goal and reached it
  const sc = (fs.readFileSync(path.join(ROOT, 'js', 'sample_class.js'), 'utf8').match(/PS[12]-[A-Z0-9-]+/g) || []).map((c) => PS.cls.readCode(c)).filter((r) => r.ok).map((r) => r.v);
  const sg = sc.filter((x) => x.goal), sr = sg.filter((x) => x.reached).length;
  v.sample_n = String(sc.length); v.sample_goalN = String(sg.length); v.sample_goalR = String(sr);
  v.sample_goalPct = String(sg.length ? Math.round((sr / sg.length) * 100) : 0);
  PS.GOAL_IDS.forEach((g) => { const a = sg.filter((x) => x.goal === g); v['sample_' + g] = a.filter((x) => x.reached).length + ' of ' + a.length; });
  v.code_ver = PS.cls.VER;
  const fc = readJson('first_card.json');
  v.firstCard = fc ? String(Math.round(fc.max_s)) : '?';
  return v;
}

// [{doc, name, now, want}] for every marker
function compare(v) {
  const out = [];
  DOCS.forEach((d) => {
    const txt = fs.readFileSync(path.join(ROOT, d), 'utf8');
    let m;
    MARK.lastIndex = 0;
    while ((m = MARK.exec(txt))) out.push({ doc: d, name: m[1], now: m[2], want: v[m[1]] == null ? '(unknown name)' : v[m[1]] });
  });
  return out;
}

function write(v) {
  DOCS.forEach((d) => {
    const f = path.join(ROOT, d);
    const txt = fs.readFileSync(f, 'utf8').replace(MARK, (all, name) => (v[name] == null ? all : '<!--n:' + name + '-->' + v[name] + '<!--/n-->'));
    fs.writeFileSync(f, txt);
  });
}

module.exports = { values, compare };

if (require.main === module) {
  const v = values();
  if (process.argv.indexOf('--write') >= 0) write(v);
  const c = compare(v);
  c.forEach((x) => console.log((x.now === x.want ? '  ' : '* ') + x.doc + ' ' + x.name + ': ' + x.now + (x.now === x.want ? '' : ' -> ' + x.want)));
  console.log(c.length + ' numbers, ' + c.filter((x) => x.now !== x.want).length + ' differ');
}
