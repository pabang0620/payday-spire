// Lesson check without a browser: node tools/regress.js [CODE ...]
// Plays five habits through js/engine.js on eight class codes and checks that the lessons hold in the numbers:
// steady habits must end with more net worth than doing nothing, putting every bill on the card (and still paying the
// card bill in full), keeping no emergency fund, and impulse habits, on every code. Exit code 1 if a check fails.
global.window = global;
const path = require('path');
['data.js', 'ledger.js', 'engine.js', 'engine_more.js', 'goals.js', 'policy.js', 'i18n_en.js', 'i18n_ar.js', 'i18n_more.js', 'i18n_goals.js', 'i18n_teacher.js', 'icons.js', 'class.js', 'why.js', 'check.js'].forEach((f) => require(path.join(__dirname, '..', 'js', f)));
const fs = require('fs');
const PS = global.PS, E = PS.E, P = PS.POLICY;
const STYLES = require('./policies.js')(PS);
const argCodes = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const codes = argCodes.length ? argCodes : ['CLASS7', 'K7M3QX', 'ABCDEF', 'MAJLSX', 'DUBA22', 'GULF26', 'SANDY9', 'Z4QPRW'];
const MAX_SHARE = require('./policies.js').MAX_SHARE; // each style at or below this share of steady, on every code

const rows = [], fails = [], sum = {};
STYLES.forEach((p) => { sum[p] = { net: 0, fees: 0, imp: 0, mind: 0, frozen: 0 }; });
codes.forEach((code) => {
  const r = {};
  STYLES.forEach((p) => {
    const s = PS.simYear(code, p);
    r[p] = { s, net: E.netWorth(s), fees: Math.round(s.st.interest + s.st.lateFees + s.st.advFees), imp: s.st.impulse, mind: s.st.minMind };
    const x = sum[p];
    x.net += r[p].net; x.fees += r[p].fees; x.imp += r[p].imp; x.mind += r[p].mind; if (s.over === 'limit') x.frozen++;
    rows.push({ code, style: p, end: s.over === 'limit' ? 'frozen m' + (s.st.overMonth + 1) : 'year done', net: r[p].net,
      pct: Math.round((r[p].net / r.steady.net) * 100), interest: s.st.interest, fees: Math.round(s.st.lateFees + s.st.advFees),
      impulse: r[p].imp, lowMind: r[p].mind, burnouts: s.st.burnouts });
  });
  const st = r.steady.s;
  if (st.over === 'limit' || st.st.interest > 0 || st.debt > 0 || st.st.lateFees > 0) fails.push(code + ': steady paid interest or fees or ended in debt');
  STYLES.slice(1).forEach((p) => {
    if (r[p].net > r.steady.net * MAX_SHARE[p]) fails.push(code + ': ' + p + ' ' + r[p].net + ' is above ' + Math.round(MAX_SHARE[p] * 100) + '% of steady ' + r.steady.net);
  });
  // putting bills on the card lets impulse buys in; no emergency fund means card debt or a worse low point for the mind
  if (r.swipeAll.imp <= r.steady.imp) fails.push(code + ': swipeAll had no extra impulse buys');
  if (r.noBuffer.fees <= r.steady.fees && r.noBuffer.mind >= r.steady.mind) fails.push(code + ': noBuffer had no extra cost or stress');
});
if (process.argv.indexOf('--rows') >= 0 || process.env.ROWS) console.table(rows);
const n = codes.length;
const avg = STYLES.map((p) => ({ style: p, net: Math.round(sum[p].net / n), pctOfSteady: Math.round((sum[p].net / sum.steady.net) * 100),
  interestAndFees: Math.round(sum[p].fees / n), impulse: Math.round(sum[p].imp / n), lowMind: Math.round(sum[p].mind / n), frozen: sum[p].frozen + '/' + n }));
console.log('Average over ' + n + ' class codes (' + codes.join(' ') + ')');
console.table(avg);
const byCode = codes.map((c) => { const o = { code: c }; STYLES.forEach((p) => { const x = rows.find((r) => r.code === c && r.style === p); o[p] = x.net + (x.end !== 'year done' ? ' (' + x.end + ')' : ''); }); return o; });
console.table(byCode);
// ---- design targets and the class tools (v3) ----
const extra = [];
const ok = (name, cond, why) => { extra.push({ check: name, result: cond ? 'pass' : 'FAIL' }); if (!cond) fails.push(name + ': ' + why); };
// D1: impulse habits freeze the card in the second half of the year (months 7 to 11: the payroll delay or the sales tip it over), on every code
const frozenAt = codes.map((c) => PS.simYear(c, 'impulse')).map((s) => (s.over === 'limit' ? s.st.overMonth + 1 : 13));
ok('D1 impulse frozen in months 7-11', frozenAt.every((m) => m >= 7 && m <= 11), 'months ' + frozenAt.join(','));
// D2: Save ahead money only ever pays the flight home, and its cards leave the deck after the flight
const st2 = codes.map((c) => PS.simYear(c, 'steady'));
ok('D2 save ahead pays only the flight', st2.every((s) => s.st.sinkFoe === '' || s.st.sinkFoe === 'flight'), st2.map((s) => s.st.sinkFoe).join(','));
ok('D2b save ahead cards gone after the flight', st2.every((s) => s.deck.indexOf('sink') < 0 && s.sink === 0), 'a sink card or money stayed');
// D3: the two big breakdowns never come in months 4 and 5 together
ok('D3 big breakdowns spread out', codes.concat(['AAAAAA', 'ZZZZZZ', 'QWERTY', 'HJKLMN']).every((c) => {
  const y = PS.buildYear(PS.codeSeed(c)); const big = (m) => m.foes.some((f) => f === 'carac' || f === 'dental');
  return !(big(y[3]) && big(y[4]));
}), 'carac and dental back to back');
// N1: no emergency fund costs money that the end screen names: interest and fees on every code, and the top three reasons
// include what the missing fund led to: the late salary or a breakdown on the card, savings broken into, or the tired months
// and burnout that a fund's calm would have eased
const st8 = codes.map((c) => ({ c, s: PS.simYear(c, 'noBuffer') }));
ok('N1 no emergency fund: fees and a named cause', st8.every(({ s }) => s.st.interest + s.st.advFees + s.st.lateFees + (s.st.tiredSpend || 0) > 0 &&
  PS.cls.why(s).some((x) => /^wy\.(late|shock|save|burn|tired)$/.test(x.k))), st8.map(({ c, s }) => c + ':' + PS.cls.why(s).map((x) => x.k).join('+')).join(' '));
// N2: big causes are never pushed out of the three reasons by smaller ones (burnout, a late salary, a frozen card)
let n2 = true;
codes.forEach((c) => STYLES.forEach((p) => {
  // burnout is named unless all three places went to what the card cost (frozen card, interest and fees of AED 50+)
  const s = PS.simYear(c, p), w = PS.cls.why(s), keys = w.map((x) => x.k), low = Math.min.apply(null, w.map((x) => x.tier));
  if (s.st.burnouts > 0 && keys.indexOf('wy.burn') < 0 && low < 3) { n2 = false; console.log('burnout left out', c, p, keys.join(',')); }
}));
ok('N2 burnout named unless three card costs are bigger', n2, 'see above');
// E1: months 1-4 keep every player busy: steady meets the card bill by month 2, at most 3 of the 12 turns have nothing to face
ok('E1 card bill met in months 2-4 and few empty turns', st2.every((s) => s.st.debtByMonth.slice(0, 3).some((d) => d > 0) && (s.st.empty14 || 0) <= 3),
  st2.map((s) => (s.st.empty14 || 0)).join(','));
// Q1: a month 1 zakat answer that is right only by the silver nisab view is not counted as right, and the end screen says so
const q1 = PS.simYear('CLASS7', 'steady'); q1.predict = { q1: 'c', q2: 'a' }; q1.recheck = { q1: 'b', q2: 'a' };
ok('Q1 silver nisab answer shown and counted apart', PS.check.mark(2, 'pre', q1.predict) === 'part' && PS.check.count(q1.predict, 'pre') === 1 &&
  PS.check.endHTML(q1).indexOf(PS.t('ba.part')) >= 0, 'part answer');
// C1: result code round trip for every code and style (grade, numbers, flags, guesses)
let rt = true;
codes.forEach((c) => STYLES.forEach((p) => {
  const s = PS.simYear(c, p); s.predict = { q1: 'c', q2: 'a' }; s.recheck = { q1: 'b' }; s.rid = 77;
  const v = PS.cls.values(s), r = PS.cls.readCode(PS.cls.packCode(v));
  const same = r.ok && ['cls', 'grade', 'net', 'debt', 'ef', 'fees', 'imp', 'given', 'overdue', 'missed', 'endm', 'bnpl', 'sold', 'lent', 'adv', 'burnout', 'autosave', 'rent', 'q1', 'q2', 'r1', 'r2', 'rid']
    .every((k) => (v[k] || '') === (r.v[k] || '') || (k === 'rid' && v[k] === r.v[k]));
  if (!same) { rt = false; console.log('round trip differs', c, p, JSON.stringify(v), JSON.stringify(r)); }
}));
ok('C1 result code round trip', rt, 'see above');
// C2: one wrong letter, two swapped letters, a wrong prefix and a short code are caught
const good = PS.cls.packCode(PS.cls.values(PS.simYear('CLASS7', 'steady')));
const body = good.replace(/-/g, '');
const flip = (str, i) => str.slice(0, i) + (str[i] === 'A' ? 'B' : 'A') + str.slice(i + 1);
const swap = (str, i) => str.slice(0, i) + str[i + 1] + str[i] + str.slice(i + 2);
let caught = true;
for (let i = 9; i < body.length; i++) if (PS.cls.readCode(flip(body, i)).ok) caught = false;
for (let i = 9; i < body.length - 1; i++) if (body[i] !== body[i + 1] && PS.cls.readCode(swap(body, i)).ok) caught = false;
ok('C2 code check catches typos', caught && !PS.cls.readCode('JR2' + body.slice(3)).ok && !PS.cls.readCode(body.slice(0, 20)).ok && PS.cls.readCode(good).ok, 'a broken code was read');
// C3: PS2 codes carry the year's goal, its level, the jar full or not and what it held; older PS1 codes still read (goal and
// level empty), the shared part reads the same and the same result pasted as both counts once (same key); the dashboard
// accepts both prefixes
let c3 = true;
['CLASS7', 'K7M3QX', 'Z4QPRW'].forEach((c) => [null].concat(PS.GOAL_IDS).forEach((goal) => [1, 2, 3, 4].forEach((lv) => ['steady', 'impulse'].forEach((p) => {
  const s = PS.simYear(c, p, { goal, lv }); s.rid = 9;
  const v = PS.cls.values(s), a = PS.cls.readCode(PS.cls.packCode(v)), b = PS.cls.readCode(PS.cls.packCode(v, 'PS1'));
  const core = ['grade', 'net', 'debt', 'ef', 'fees', 'imp', 'given', 'overdue', 'missed', 'endm', 'rent', 'rid'];
  const good = a.ok && b.ok && a.v.ver === 2 && b.v.ver === 1 && a.v.goal === (goal || '') && a.v.lv === lv && a.v.reached === v.reached && a.v.pot === v.pot &&
    v.reached === (!!goal && PS.E.goalResult(s).reached) && b.v.goal === null && b.v.lv === null && a.v.key === b.v.key && core.every((k) => a.v[k] === b.v[k] && a.v[k] === v[k]);
  if (!good) { c3 = false; console.log('C3', c, goal, lv, p, JSON.stringify(v), JSON.stringify(a), JSON.stringify(b)); }
}))));
ok('C3 PS2 code: goal, level and jar round trip, PS1 codes still read', c3 && /S\\s\*\[12\]/.test(fs.readFileSync(path.join(__dirname, '..', 'js', 'teacher.js'), 'utf8')), 'see above');
// B1: a share keeps its % inside the number's isolate (Arabic would show "%50"): every "{x}%" string in both languages, and
// no hand-made percent in the dashboard files (they use PS.pct)
const pctBad = [];
['en', 'ar'].forEach((lang) => { PS.lang = lang; Object.keys(PS.STR[lang]).filter((k) => /\}%/.test(PS.STR[lang][k])).forEach((k) => {
  const p = {}; (PS.STR[lang][k].match(/\{(\w+)/g) || []).forEach((m) => { p[m.slice(1)] = 50; });
  const out = PS.t(k, p);
  if (/<\/bdi>%/.test(out) || out.indexOf('50%</bdi>') < 0) pctBad.push(lang + ' ' + k);
}); });
PS.lang = 'en';
['teacher.js', 'teacher_pilot.js', 'teacher_plan.js'].forEach((f) => { if (/\u2066[^']*%|'%\u2069/.test(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'))) pctBad.push(f); });
ok('B1 percent sign inside the number isolate (en/ar strings, dashboard)', !pctBad.length, pctBad.join(' '));
// T1: the teacher dashboard sample class is the current rules
const cp = require('child_process');
let t1 = true; try { cp.execFileSync('node', [path.join(__dirname, 'sample_class.js'), '--check'], { stdio: 'pipe' }); } catch (e) { t1 = false; }
ok('T1 sample class up to date', t1, 'run node tools/sample_class.js --write');
const SC = fs.readFileSync(path.join(__dirname, '..', 'js', 'sample_class.js'), 'utf8').match(/PS[12]-[A-Z0-9-]+/g) || [];
ok('T1b sample codes all read', SC.length === 20 && SC.every((c) => PS.cls.readCode(c).ok), SC.length + ' codes');
// I1: every English text key has an Arabic text
const missing = Object.keys(PS.STR.en).filter((k) => !(k in PS.STR.ar) && !/^tc\.g\.skip$/.test(k));
ok('I1 Arabic for every key', !missing.length, missing.join(' '));
// F1: no em dash, no file over 500 lines, no floating caption box in the CSS
const ls = (d) => fs.readdirSync(path.join(__dirname, '..', d)).map((f) => d + '/' + f);
const files = ls('js').concat(ls('css'), ls('tools').filter((f) => /\.(js|py|sh)$/.test(f)), ['index.html', 'teacher.html', 'README.md', 'concept_doc.md', 'budget.md', 'DESIGN.md', 'review/regression_checklist.md']);
const read = (f) => { try { return fs.readFileSync(path.join(__dirname, '..', f), 'utf8'); } catch (e) { return ''; } };
const dash = files.filter((f) => read(f).indexOf('\u2014') >= 0);
ok('F1 no em dash', !dash.length, dash.join(' '));
const long = files.filter((f) => /\.(js|css|html|py)$/.test(f) && read(f).split('\n').length > 500);
ok('F1b files at most 500 lines', !long.length, long.join(' '));
ok('F1c captions are not a floating box', !/\.caption\s*\{[^}]*position:\s*fixed/.test(files.filter((f) => f.startsWith('css/')).map(read).join('')) && read('index.html').indexOf('id="caption"') < 0, 'a fixed caption is back');
ok('F1d new scripts loaded', ['ledger', 'i18n_more', 'class', 'why', 'check', 'past', 'brand', 'music', 'goals', 'i18n_goals', 'goalui', 'juice'].every((n) => read('index.html').indexOf('js/' + n + '.js') >= 0) &&
  ['class', 'sample_class', 'teacher', 'i18n_teacher'].every((n) => read('teacher.html').indexOf('js/' + n + '.js') >= 0), 'a script tag is missing');
require('./regress_why.js')(PS, codes, STYLES, ok);
require('./regress_design.js')(PS, codes.concat(['AAAAAA', 'ZZZZZZ', 'QWERTY', 'HJKLMN']), ok);
require('./regress_screen.js')(PS, codes, STYLES, ok, read);
const gameLines = require('./regress_text.js')(PS, STYLES, ok);
require('./regress_cards.js')(PS, ok);
// S2 one Savings number: the status bar and the shop window both show s.savings; the fund's part above its goal and the
// flight money are named apart in the shop (judge_B_final 1-5: "Savings 400" on top, "Savings now: none" in the shop)
{
  const src = (f) => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
  const hud = /stat\('savings', 'save', ui\.money\(s\.savings\)\)/.test(src('ui.js'));
  const shop = /t\('sh\.b', \{ a: s\.savings \}\)/.test(src('flow.js')) && /sh\.bs/.test(src('flow.js')) && /E\(\)\.spare\(s\)/.test(src('flow.js'));
  ok('S2 the status bar and the shop show the same Savings, other money named apart', hud && shop, 'hud ' + hud + ', shop ' + shop);
}

require('./regress_lesson.js')(PS, ok); // R4: steady first against every style and shortcut, 240 codes
require('./regress_goals.js')(PS, ok, STYLES); // GL1-GL9: the year's goal and the levels keep the lesson (js/goals.js)
// L1, Z1: the browser checks (python) leave a result file; it must be clean and newer than every game file
const mtime = (f) => { try { return fs.statSync(path.join(__dirname, '..', f)).mtimeMs; } catch (e) { return 0; } };
const newest = Math.max.apply(null, ['index.html', 'teacher.html'].concat(ls('js'), ls('css'), ls('art_b')).map(mtime));
const result = (f) => { try { return JSON.parse(read(f)); } catch (e) { return null; } };
const lay = result('tools/layout_check.json');
ok('L1 screen space: 6 sizes x 3 text sizes x en/ar, hand and End turn on screen, every problem card in view', !!lay && !lay.fails.length && !lay.console_errors.length && lay.combos >= 36 && mtime('tools/layout_check.json') >= newest,
  !lay ? 'run python3 tools/layout_check.py' : mtime('tools/layout_check.json') < newest ? 'older than the game files: run python3 tools/layout_check.py' : lay.fails.slice(0, 3).join(' | '));
// P1: a first-time player plays a first card within 10 s of pressing Play, month 1 is taught one glowing card at a time with a
// one-line guide, and a second run on the same device skips it (tools/first_card.py)
const rtrip = result('tools/shots_v16.json');
ok('RT1 dashboard round trip: a class year with a goal, its PS2 code with old PS1 codes pasted together, goal columns, both CSV files, Arabic percents', !!rtrip && !rtrip.fails.length && !rtrip.console_errors.length && mtime('tools/shots_v16.json') >= newest,
  !rtrip ? 'run python3 tools/shots_v16.py' : mtime('tools/shots_v16.json') < newest ? 'older than the game files: run python3 tools/shots_v16.py' : rtrip.fails.concat(rtrip.console_errors).slice(0, 3).join(' | '));
const fc = result('tools/first_card.json');
ok('P1 first card within 10 s, lesson by doing, skipped on a second run', !!fc && !fc.fails.length && !fc.console_errors.length && fc.max_s <= 10 && mtime('tools/first_card.json') >= newest,
  !fc ? 'run python3 tools/first_card.py' : mtime('tools/first_card.json') < newest ? 'older than the game files: run python3 tools/first_card.py' : fc.fails.concat(fc.console_errors).slice(0, 3).join(' | '));
const zipc = result('tools/build_zip.json');
ok('Z1 submission zip: only the game files, opens from file://', !!zipc && zipc.ok && mtime('tools/build_zip.json') >= newest,
  !zipc ? 'run python3 tools/build_zip.py' : !zipc.ok ? zipc.problems.join(' | ') : 'older than the game files: run python3 tools/build_zip.py');
// Z2s: no zero amount in any text drawn on screen, whatever code path wrote it: tools/playtest.py keeps every line of
// document.body.innerText after each action of its whole years (5 runs in tools/run_all.sh, en/ar, desktop/phone)
const scr = result('tools/screen_text.json'), ZRE = require('./regress_text.js').ZERO;
const scrRuns = scr ? Object.keys(scr) : [], scrBad = [];
scrRuns.forEach((r) => scr[r].lines.forEach((x) => { if (ZRE.some((re) => re.test(x))) scrBad.push(r + ': ' + x.slice(0, 90)); }));
require('./regress_count.js')(PS, ok, gameLines, scr);
const scrN = scrRuns.reduce((a, r) => a + scr[r].lines.length, 0);
ok('Z2s no zero amount in any text drawn on screen (' + scrRuns.length + ' played years, ' + scrN + ' distinct lines)', !!scr && scrRuns.length >= 5 && !scrBad.length && mtime('tools/screen_text.json') >= newest,
  !scr ? 'run python3 tools/playtest.py' : mtime('tools/screen_text.json') < newest ? 'older than the game files: run tools/run_all.sh' : scrBad.slice(0, 3).join(' | '));
// D1: every number in README.md and concept_doc.md between <!--n:..--> markers is the measured value (tools/doc_numbers.js)
const total = extra.length + 2; // with D1 and D1b
if (process.argv.indexOf('--no-docs') < 0) {
  const dn = require('./doc_numbers.js'), diff = dn.compare(dn.values(total)).filter((x) => x.now !== x.want);
  ok('D1 document numbers = measured (README, concept_doc)', !diff.length, diff.slice(0, 4).map((x) => x.doc + ' ' + x.name + ' ' + x.now + ' -> ' + x.want).join(', ') + ' (node tools/doc_numbers.js --write)');
}
// D1b: the play time on the title screen sits inside the measured range
const pt = result('tools/playtest_results.json') || {}, times = ['steady_K7M3QX_en_desktop', 'steady_CLASS7_en_desktop'].map((k) => pt[k] && pt[k].time_min).filter(Boolean);
const said = (PS.STR.en['title.teacher'].match(/About (\d+) minutes/) || [])[1], saidAr = (PS.STR.ar['title.teacher'].match(/(\d+) (دقائق|دقيقةً|دقيقة)/) || [])[1] // 3-10 دقائق, 11-99 دقيقةً;
ok('D1b title play time in the measured range', times.length === 2 && said === saidAr && +said >= Math.floor(Math.min.apply(null, times)) && +said <= Math.ceil(Math.max.apply(null, times)),
  'title says ' + said + '/' + saidAr + ', measured ' + times.join(' and '));
fs.writeFileSync(path.join(__dirname, 'regress_summary.json'), JSON.stringify({ checks: total, limits: MAX_SHARE }) + '\n');
console.table(extra);
if (fails.length) { console.log('FAIL\n' + fails.join('\n')); process.exit(1); }
console.log('PASS: steady ends highest on all ' + n + ' codes (limits: ' + JSON.stringify(MAX_SHARE) + '), and ' + extra.length + ' design and class-tool checks pass');
