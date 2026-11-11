/* Payday Spire - teacher dashboard: paste result codes, get an anonymous class summary with the topics to discuss first.
   Runs only in this browser: no server, no storage of results (only the language choice is read from the game settings). */
(function () {
  const PS = window.PS;
  const $ = (id) => document.getElementById(id);
  const t = (k, p) => PS.t(k, p);
  const GRADES = ['steady', 'made', 'frozen'];
  const GRADE_IC = { steady: 'shield', made: 'flag', frozen: 'card' };
  const SAMPLE_CLS = 'SAMPLE';
  const RIGHT = { pre: { q1: 'c', q2: 'b' }, post: { q1: 'b', q2: 'a' } }; // same as js/check.js
  // topic -> the discussion card in the game that holds its questions (dc.<card>.q1 / q2), and who it fits.
  // The first seven are the core money lessons; the last four (single decisions) only fill a slot the core ones leave open
  const TOPICS = [
    ['card', 'cardbill', 'card', (v) => v.missed > 0 || v.fees >= 50 || (v.q1 && v.q1 !== 'c')],
    ['ef', 'shock', 'shield', (v) => v.ef < 1],
    ['impulse', 'sale', 'bag', (v) => v.imp >= 2000],
    ['overdue', 'overdue', 'bill', (v) => v.overdue > 0],
    ['bnpl', 'megasale', 'phone', (v) => v.bnpl],
    ['frozen', 'frozen', 'card', (v) => v.grade === 'frozen'],
    ['zakat', 'zakat', 'scale', (v) => v.q2 && v.q2 !== 'b'],
    ['dip', 'dip', 'chart', (v) => v.sold],
    ['friend', 'friend', 'give', (v) => v.adv],
    ['rent', 'landlord', 'key', (v) => v.rent],
    ['give', 'ramadan', 'moon', (v) => v.given < 100],
  ];
  const CORE = 7;
  const state = { results: [], cls: null, shown: false };

  // ---------- language ----------
  function startLang() {
    const q = /[?&]lang=(ar|en)/.exec(location.search);
    if (q) return q[1];
    try { const s = JSON.parse(localStorage.getItem('ps_settings') || 'null'); if (s && s.lang === 'ar') return 'ar'; } catch (e) { /* storage blocked */ }
    return 'en';
  }
  function applyLang() {
    document.documentElement.lang = PS.lang;
    document.documentElement.dir = PS.lang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.innerHTML = t(el.dataset.i18n); });
    const lb = $('tcLang');
    lb.textContent = PS.lang === 'ar' ? 'English' : 'العربية';
    lb.lang = PS.lang === 'ar' ? 'en' : 'ar';
    document.title = PS.plain(t('tc.doc'));
    if (state.shown) render();
    if (PS.tcPlan) PS.tcPlan.render(); // js/teacher_plan.js: lesson steps, year preview, questions
  }

  // ---------- reading the pasted text ----------
  function parse(text) {
    const out = { ok: [], bad: [], dup: 0, skip: 0 };
    const seen = {};
    text.split(/\r?\n/).forEach((line, i) => {
      const clean = line.replace(/[‎‏⁦-⁩؜]/g, '');
      const n = i + 1;
      if (!clean.trim()) return;
      const m = clean.match(/P\s*S\s*\d[A-Za-z0-9\s-]*/i);
      if (!m) { out.skip++; return; }
      if (!/^P\s*S\s*[12]/i.test(m[0])) { out.bad.push({ line: n, err: 'prefix' }); return; }
      const r = PS.cls.readCode(m[0]);
      if (!r.ok) { out.bad.push({ line: n, err: r.err === 'prefix' ? 'length' : r.err }); return; }
      if (seen[r.v.key]) { out.dup++; out.bad.push({ line: n, err: 'dup', m: seen[r.v.key] }); return; }
      seen[r.v.key] = n;
      out.ok.push(Object.assign({ line: n }, r.v));
    });
    return out;
  }

  // ---------- numbers and drawing ----------
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  function median(a) {
    if (!a.length) return 0;
    const s = a.slice().sort((x, y) => x - y), h = Math.floor(s.length / 2);
    return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
  }
  const pct = (n, m) => (m ? Math.round((n / m) * 100) : 0);
  const one = (x) => (Math.round(x * 10) / 10).toFixed(1).replace(/\.0$/, '');
  const aed = (x) => PS.aedOrZero(x), amt = (x) => PS.amtOrNone(x); // a zero is a word (PS.t zero rule), never "AED 0"
  const bar = (p) => '<span class="tc-bar" aria-hidden="true"><i style="inline-size:' + p + '%"></i></span>';
  const kpi = (label, value, sub, cls) => '<div class="tc-kpi' + (cls ? ' ' + cls : '') + '"><dt>' + label + '</dt><dd><b>' + value + '</b>' + (sub ? ' <small>' + sub + '</small>' : '') + '</dd></div>';
  const P = (x) => PS.pct(x); // the % inside the number's isolate (js/i18n_en.js)

  function classPicker(all) {
    const counts = {};
    all.forEach((v) => { counts[v.cls] = (counts[v.cls] || 0) + 1; });
    const codes = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || (a < b ? -1 : 1));
    if (state.cls !== '*' && !counts[state.cls]) state.cls = codes[0];
    if (codes.length < 2) return '';
    const opts = codes.map((c) => '<option value="' + c + '"' + (c === state.cls ? ' selected' : '') + '>' + PS.plain(t('tc.cls.opt', { c, n: counts[c] })) + '</option>').join('') +
      '<option value="*"' + (state.cls === '*' ? ' selected' : '') + '>' + PS.plain(t('tc.cls.all')) + '</option>';
    return '<div class="tc-pick no-print"><label class="tc-lbl" for="tcCls">' + t('tc.cls.lbl') + '</label><select id="tcCls" dir="ltr">' + opts + '</select><p class="tc-note">' + t('tc.mixed') + '</p></div>';
  }

  function gradeTable(list) {
    const n = list.length;
    const rows = GRADES.map((g) => {
      const c = list.filter((v) => v.grade === g).length;
      return '<tr><th scope="row"><span class="tc-g g-' + g + '">' + PS.icon(GRADE_IC[g]) + t('grade.' + g) + '</span></th><td>' + c + '</td><td>' + P(pct(c, n)) + bar(pct(c, n)) + '</td></tr>';
    }).join('');
    return '<table class="tc-tbl"><caption>' + t('tc.gr.t') + '</caption><thead><tr><th scope="col">' + t('tc.th.grade') + '</th><th scope="col">' + t('tc.th.n') +
      '</th><th scope="col">' + t('tc.th.pct') + '</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  // the year's goals (PS2 codes): per goal how many students reached it and what the jar held on average; older PS1 codes
  // and runs without a goal get their own rows, so the share reached is always out of the students who had that goal.
  // Also used by the pilot results page (js/teacher_pilot.js)
  const GOAL_IDS = ['home', 'studio', 'gold'];
  const goalName = (g) => (g === null ? t('tc.gl.old') : g ? t('gl.' + g) : t('tc.gl.none'));
  PS.tcGoalStats = (list) => {
    const withGoal = list.filter((v) => v.goal), reached = withGoal.filter((v) => v.reached).length;
    return { n: withGoal.length, reached };
  };
  function goalTable(list) {
    const n = list.length;
    const groups = GOAL_IDS.concat(['', null]).map((g) => ({ g, rows: list.filter((v) => (g === null ? v.goal == null : v.goal === g)) })).filter((x) => x.rows.length);
    const rows = groups.map(({ g, rows: r }) => {
      const got = r.filter((v) => v.reached).length, has = !!g;
      return '<tr><th scope="row">' + goalName(g) + '</th><td>' + r.length + '</td><td>' + (has ? got : '-') + '</td><td>' + (has ? P(pct(got, r.length)) + bar(pct(got, r.length)) : '-') +
        '</td><td>' + (has ? amt(avg(r.map((v) => v.pot))) : '-') + '</td></tr>';
    }).join('');
    const lvs = [1, 2, 3, 4].map((l) => ({ l, c: list.filter((v) => v.lv === l).length })).filter((x) => x.c);
    const old = list.filter((v) => v.lv == null).length;
    const lvRows = lvs.map((x) => '<tr><th scope="row"><bdi dir="ltr">' + x.l + '</bdi> ' + t('lv.' + x.l) + '</th><td>' + x.c + '</td><td>' + P(pct(x.c, n)) + '</td></tr>').join('') +
      (old ? '<tr><th scope="row">' + t('tc.gl.old') + '</th><td>' + old + '</td><td>' + P(pct(old, n)) + '</td></tr>' : '');
    return '<div class="tc-goals"><div class="tc-scroll" tabindex="0" role="region" aria-label="' + PS.plain(t('tc.gl.t')) + '"><table class="tc-tbl tc-gtbl"><caption>' + t('tc.gl.t') + '</caption><thead><tr><th scope="col">' + t('tc.th.goal') + '</th><th scope="col">' + t('tc.th.n') +
      '</th><th scope="col">' + t('tc.th.reached') + '</th><th scope="col">' + t('tc.th.rate') + '</th><th scope="col">' + t('tc.th.pot') + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<table class="tc-tbl"><caption>' + t('tc.lv.t') + '</caption><thead><tr><th scope="col">' + t('tc.th.lv') + '</th><th scope="col">' + t('tc.th.n') + '</th><th scope="col">' + t('tc.th.pct') +
      '</th></tr></thead><tbody>' + lvRows + '</tbody></table><p class="tc-note">' + t('tc.gl.note') + '</p></div>';
  }
  PS.tcGoalTable = goalTable;

  function guessTable(list, q) {
    const key = 'q' + q, right = RIGHT.pre[key];
    const answered = list.filter((v) => v[key]);
    const miss = answered.filter((v) => v[key] !== right).length;
    const rows = ['a', 'b', 'c', ''].map((a) => {
      const c = list.filter((v) => (v[key] || '') === a).length;
      const label = a ? t('pq.' + q + '.' + a) : t('tc.pq.skip');
      const mark = a === right ? ' <span class="tc-ok">' + t('tc.pq.right') + '</span>' : q === 2 && a === 'a' ? ' <small>(' + t('lc.2a') + ')</small>' : '';
      return '<tr' + (a === right ? ' class="right"' : '') + '><th scope="row">' + label + mark + '</th><td>' + c + '</td><td>' + P(pct(c, list.length)) + bar(pct(c, list.length)) + '</td></tr>';
    }).join('');
    return '<div><p class="tc-q">' + t('pq.' + q) + '</p><table class="tc-tbl"><caption>' + t('tc.pq.cap', { n: q }) + '</caption><thead><tr><th scope="col">' + t('tc.pq.ans') +
      '</th><th scope="col">' + t('tc.th.n') + '</th><th scope="col">' + t('tc.th.pct') + '</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="tc-miss">' + t('tc.pq.miss', { p: P(pct(miss, answered.length)) }) + '</p></div>';
  }

  // before and after: right answers in month 1 and at year end, for students who answered both times
  function beforeAfter(list) {
    const both = list.filter((v) => (v.q1 || v.q2) && (v.r1 || v.r2));
    const right = (v, ph) => ['q1', 'q2'].filter((q, i) => (ph === 'pre' ? v[q] : v['r' + (i + 1)]) === RIGHT[ph][q]).length;
    if (!both.length) return '<p class="tc-ba">' + t('tc.ba.none') + '</p>';
    const a = avg(both.map((v) => right(v, 'pre'))), b = avg(both.map((v) => right(v, 'post')));
    const up = both.filter((v) => right(v, 'post') > right(v, 'pre')).length;
    return '<p class="tc-ba">' + t('tc.ba', { a: one(a), b: one(b), n: both.length, u: up }) + '</p>';
  }

  function discussion(list) {
    const m = list.length;
    const ranked = TOPICS.map(([id, card, ic, test], i) => ({ id, card, ic, i, n: list.filter(test).length, side: i >= CORE }))
      .filter((x) => x.n > 0 && x.n / m >= 0.2).sort((a, b) => a.side - b.side || b.n - a.n || a.i - b.i).slice(0, 3);
    const cardHTML = (x, why) => '<article class="tc-dc"><header><span class="tc-ic">' + PS.icon(x.ic) + '</span><h3>' + t('tc.c.' + x.id) + '</h3></header>' +
      (why ? '<p class="dc-r">' + why + '</p>' : '') + '<ol>' + ['q1', 'q2'].map((q) => '<li>' + t('dc.' + x.card + '.' + q) + '</li>').join('') + '</ol></article>';
    const body = ranked.length ? ranked.map((x) => cardHTML(x, t('tc.why.' + x.id, { n: x.n, m }))).join('')
      : '<p class="tc-note">' + t('tc.dc.none') + '</p>' + cardHTML({ id: 'card', card: 'cardbill', ic: 'card' }, '');
    return '<section class="tc-card" aria-labelledby="dcT"><h2 id="dcT">' + t('tc.dc.t') + '</h2><p class="tc-note">' + t('tc.dc.sub') + '</p><div class="tc-dcs">' + body + '</div></section>';
  }

  function listTable(list) {
    const g = (a, r) => (!a ? t('tc.g.skip') : a === r ? t('tc.g.right') : t('tc.g.wrong'));
    const jar = (v) => (!v.goal ? '-' : amt(v.pot) + ' <small>(' + t(v.reached ? 'tc.g.yes' : 'tc.g.no') + ')</small>');
    const rows = list.map((v) => '<tr><th scope="row">' + v.line + '</th><td>' + t('grade.' + v.grade) + '</td><td>' + (v.goal == null ? '-' : goalName(v.goal)) + '</td><td>' +
      (v.lv == null ? '-' : '<bdi dir="ltr">' + v.lv + '</bdi>') + '</td><td>' + jar(v) + '</td><td class="num">' + PS.num(v.net) + '</td><td class="num">' + PS.num(v.fees) +
      '</td><td class="num">' + one(v.ef) + '</td><td class="num">' + PS.num(v.imp) + '</td><td>' + v.missed + '</td><td>' + v.overdue + '</td><td class="num">' + PS.num(v.given) +
      '</td><td>' + v.endm + '</td><td>' + g(v.q1, 'c') + ' / ' + g(v.q2, 'b') + '</td><td>' + g(v.r1, 'b') + ' / ' + g(v.r2, 'a') + '</td></tr>').join('');
    const heads = ['tc.th.line', 'tc.th.grade', 'tc.th.goal', 'tc.th.lv', 'tc.th.jar', 'tc.th.net', 'tc.th.fees', 'tc.th.ef', 'tc.th.imp', 'tc.th.missed', 'tc.th.overdue', 'tc.th.given', 'tc.th.endm', 'tc.th.pre', 'tc.th.post'];
    return '<section class="tc-card tc-list" aria-labelledby="lsT"><h2 id="lsT">' + t('tc.list.t') + '</h2><div class="tc-scroll" tabindex="0" role="region" aria-labelledby="lsT">' +
      '<table class="tc-tbl wide"><caption>' + t('tc.list.cap') + '</caption><thead><tr>' + heads.map((h) => '<th scope="col">' + t(h) + '</th>').join('') +
      '</tr></thead><tbody>' + rows + '</tbody></table></div></section>';
  }

  function summary(all) {
    const list = state.cls === '*' ? all : all.filter((v) => v.cls === state.cls);
    const n = list.length;
    const nets = list.map((v) => v.net);
    const frozenN = list.filter((v) => v.grade === 'frozen').length, steadyN = list.filter((v) => v.grade === 'steady').length;
    const efN = list.filter((v) => v.ef >= 1).length, debtN = list.filter((v) => v.debt > 0).length, gs = PS.tcGoalStats(list);
    const sampleN = list.filter((v) => v.cls === SAMPLE_CLS).length; // the tag says how many of the shown results are made up
    const head = state.cls === '*' ? t('tc.sum.allc', { n: new Set(all.map((v) => v.cls)).size }) : t('tc.sum.cls', { c: '<bdi dir="ltr" class="code">' + state.cls + '</bdi>' });
    return (sampleN ? '<p class="tc-sample" role="note">' + PS.icon('flag') + '<span>' + t('tc.sampleTag', { n: sampleN }) + '</span></p>' : '') +
      '<section class="tc-card" aria-labelledby="smT"><div class="tc-sum-h"><h2 id="smT">' + t('tc.sum.t') + '</h2><span class="tc-chip">' + head + '</span>' +
      '<button class="btn pri no-print" id="tcPrint" type="button">' + t('tc.print') + '</button></div><dl class="tc-kpis">' +
      kpi(t('tc.k.n'), n) +
      kpi(t('tc.k.steady'), P(pct(steadyN, n)), t('tc.k.of', { a: steadyN, b: n })) +
      kpi(t('tc.k.frozen'), P(pct(frozenN, n)), t('tc.k.of', { a: frozenN, b: n }), frozenN ? 'warn' : '') +
      kpi(t('tc.k.debt'), P(pct(debtN, n)), t('tc.k.of', { a: debtN, b: n }), debtN ? 'warn' : '') +
      kpi(t('tc.k.avg'), aed(avg(nets))) +
      kpi(t('tc.k.med'), aed(median(nets))) +
      kpi(t('tc.k.ef'), P(pct(efN, n)), t('tc.k.of', { a: efN, b: n })) +
      kpi(t('tc.k.goal'), gs.n ? P(pct(gs.reached, gs.n)) : t('tc.g.skip'), gs.n ? t('tc.k.of', { a: gs.reached, b: gs.n }) : t('tc.gl.noneK')) +
      kpi(t('tc.k.fees'), amt(avg(list.map((v) => v.fees)))) +
      kpi(t('tc.k.imp'), amt(avg(list.map((v) => v.imp)))) +
      kpi(t('tc.k.given'), amt(avg(list.map((v) => v.given)))) +
      '</dl>' + gradeTable(list) + goalTable(list) + '</section>' +
      discussion(list) +
      '<section class="tc-card" aria-labelledby="pqT"><h2 id="pqT">' + t('tc.pq.t') + '</h2>' + beforeAfter(list) + '<div class="tc-pqs">' + guessTable(list, 1) + guessTable(list, 2) + '</div></section>' +
      listTable(list);
  }

  // lead: an extra sentence in front of the status (read out by screen readers)
  function render(lead) {
    const p = parse($('tcIn').value);
    state.results = p.ok; state.shown = true;
    const msg = p.ok.length ? [t('tc.st.read', { n: p.ok.length })] : [t('tc.st.none')];
    const bad = p.bad.filter((b) => b.err !== 'dup');
    if (bad.length) msg.push(t('tc.st.bad', { n: bad.length }));
    if (p.dup) msg.push(t('tc.st.dup', { n: p.dup }));
    if (p.skip) msg.push(t('tc.st.skip', { n: p.skip }));
    $('tcStatus').textContent = PS.plain((lead ? lead + ' ' : '') + msg.join(' '));
    $('tcErrs').innerHTML = p.bad.length ? '<div class="tc-errs"><h3>' + t('tc.err.t') + '</h3><ul>' + p.bad.map((b) =>
      '<li class="' + (b.err === 'dup' ? 'dup' : 'bad') + '"><b>' + t('tc.err.line', { n: b.line }) + '</b> ' + t('tc.err.' + b.err, { m: b.m }) + '</li>').join('') + '</ul></div>' : '';
    $('tcOut').innerHTML = p.ok.length ? classPicker(p.ok) + summary(p.ok) : '<p class="tc-empty">' + t('tc.empty') + '</p>';
    if ($('tcCls')) $('tcCls').onchange = (e) => { state.cls = e.target.value; render(); $('tcCls').focus(); };
    if ($('tcPrint')) $('tcPrint').onclick = () => window.print();
    if (PS.tcPilot && p.ok.length) PS.tcPilot.mount(p.ok, state.cls === '*' ? p.ok : p.ok.filter((v) => v.cls === state.cls), state.cls); // js/teacher_pilot.js
  }

  function addOne() {
    const v = $('tcOne').value.trim();
    if (!v) { $('tcOne').focus(); return; }
    const box = $('tcIn');
    box.value = box.value.replace(/\s*$/, '') + (box.value.trim() ? '\n' : '') + v;
    $('tcOne').value = '';
    render();
    $('tcOne').focus();
  }

  PS.lang = startLang();
  $('tcLogo').innerHTML = PS.icon('chart');
  applyLang();
  $('tcLang').onclick = () => { PS.lang = PS.lang === 'ar' ? 'en' : 'ar'; applyLang(); };
  $('tcShow').onclick = () => { render(); if (state.results.length) $('tcOut').focus({ preventScroll: false }); };
  $('tcAdd').onclick = addOne;
  $('tcOne').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); addOne(); } };
  $('tcSample').onclick = () => { $('tcIn').value = (PS.SAMPLE_CODES || []).join('\n'); state.cls = SAMPLE_CLS; render(t('tc.st.sample')); };
  $('tcClear').onclick = () => {
    $('tcIn').value = ''; state.cls = null; state.shown = false;
    $('tcErrs').innerHTML = ''; $('tcOut').innerHTML = ''; if (PS.tcPilot) PS.tcPilot.clear(); $('tcStatus').textContent = PS.plain(t('tc.st.cleared')); $('tcIn').focus();
  };
})();
