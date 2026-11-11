/* Payday Spire - teacher dashboard, pilot measurement: the results shown in the class summary as CSV files (one row per
   result, and a summary) and a one-page pilot results sheet to print for a school or a sponsor. Same data as the summary:
   the numbers inside the result codes, no names, nothing sent or saved (the CSV is a download made in this browser).
   Text in js/i18n_teacher.js. */
(function () {
  const PS = window.PS;
  const $ = (id) => document.getElementById(id);
  const t = (k, p) => PS.t(k, p);
  const RIGHT = { pre: { q1: 'c', q2: 'b' }, post: { r1: 'b', r2: 'a' } }; // same as js/check.js and js/teacher.js
  const P = (x) => PS.pct(x); // the % inside the number's isolate (js/i18n_en.js)
  const pct = (n, m) => (m ? Math.round((n / m) * 100) : 0);
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const one = (x) => (Math.round(x * 10) / 10).toFixed(1).replace(/\.0$/, '');
  const code = (c) => '<bdi dir="ltr" class="code">' + c + '</bdi>';
  let ctx = { all: [], list: [], cls: null };
  const GOAL_IDS = ['home', 'studio', 'gold'];

  const rightPre = (v) => (v.q1 === RIGHT.pre.q1 ? 1 : 0) + (v.q2 === RIGHT.pre.q2 ? 1 : 0);
  const rightPost = (v) => (v.r1 === RIGHT.post.r1 ? 1 : 0) + (v.r2 === RIGHT.post.r2 ? 1 : 0);
  const both = (v) => (v.q1 || v.q2) && (v.r1 || v.r2);

  // the pilot numbers of one group of results
  function measure(list) {
    const n = list.length, c = (f) => list.filter(f).length;
    const b = list.filter(both);
    const ans = (k) => list.filter((v) => v[k]);
    const qRight = (k, r) => { const a = ans(k); return { n: a.length, right: a.filter((v) => v[k] === r).length }; };
    return {
      n, steady: c((v) => v.grade === 'steady'), made: c((v) => v.grade === 'made'), frozen: c((v) => v.grade === 'frozen'),
      done: c((v) => v.endm === 12 && v.grade !== 'frozen'), missed: c((v) => v.missed > 0), efGoal: c((v) => v.ef >= 1),
      noFee: c((v) => !v.fees), overdue: c((v) => v.overdue > 0), bnpl: c((v) => v.bnpl), debt: c((v) => v.debt > 0),
      fees: avg(list.map((v) => v.fees)), imp: avg(list.map((v) => v.imp)), net: avg(list.map((v) => v.net)),
      both: b.length, pre: avg(b.map(rightPre)), post: avg(b.map(rightPost)),
      up: b.filter((v) => rightPost(v) > rightPre(v)).length, same: b.filter((v) => rightPost(v) === rightPre(v)).length,
      down: b.filter((v) => rightPost(v) < rightPre(v)).length,
      card: { pre: qRight('q1', RIGHT.pre.q1), post: qRight('r1', RIGHT.post.r1) },
      zakat: { pre: qRight('q2', RIGHT.pre.q2), post: qRight('r2', RIGHT.post.r2) },
      goalN: c((v) => !!v.goal), goalR: c((v) => !!v.goal && v.reached), // the share reached is out of the students who had a goal
      goals: GOAL_IDS.map((g) => ({ g, n: c((v) => v.goal === g), r: c((v) => v.goal === g && v.reached) })),
      lv: [1, 2, 3, 4].map((l) => c((v) => v.lv === l)), old: c((v) => v.lv == null),
    };
  }

  // ---------- CSV ----------
  const today = () => { const d = new Date(), z = (x) => String(x).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); };
  const cell = (x) => { const s = String(x == null ? '' : x); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const csvText = (rows) => '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n'; // BOM: Excel reads UTF-8 (Arabic labels)
  const ansWord = (a, r) => (!a ? 'skipped' : a === r ? 'right' : 'not_quite');
  const COLS = ['row', 'class_code', 'grade', 'last_month', 'net_worth_aed', 'card_debt_aed', 'emergency_fund_months', 'emergency_fund_goal_reached',
    'interest_and_fees_aed', 'impulse_buys_aed', 'sadaqah_aed', 'card_bills_not_paid_in_full', 'bills_left_unpaid', 'used_pay_later',
    'sold_in_market_dip', 'cash_advance_for_friend', 'rent_raise_kept', 'guess1_card_bill_month1', 'guess2_zakat_month1',
    'check1_card_bill_year_end', 'check2_zakat_year_end', 'right_month1_of_2', 'right_year_end_of_2',
    // from PS2 codes (empty for an older PS1 code): the year's goal (none = played without one), level 1-4, jar full, what the jar held
    'goal', 'level', 'goal_reached', 'goal_jar_aed'];
  function rowsCsv(list) {
    return [COLS].concat(list.map((v) => [v.line, v.cls, v.grade, v.endm, v.net, v.debt, one(v.ef), v.ef >= 1 ? 1 : 0, v.fees, v.imp, v.given,
      v.missed, v.overdue, v.bnpl ? 1 : 0, v.sold ? 1 : 0, v.adv ? 1 : 0, v.rent ? 1 : 0,
      ansWord(v.q1, RIGHT.pre.q1), ansWord(v.q2, RIGHT.pre.q2), ansWord(v.r1, RIGHT.post.r1), ansWord(v.r2, RIGHT.post.r2),
      both(v) ? rightPre(v) : '', both(v) ? rightPost(v) : '',
      v.goal == null ? '' : v.goal || 'none', v.lv == null ? '' : v.lv, !v.goal ? '' : v.reached ? 1 : 0, !v.goal ? '' : v.pot]));
  }
  // metric id (stable, English), label (page language), count, of, share or average
  function summaryCsv(list) {
    const m = measure(list), L = (k) => PS.plain(t(k));
    const share = (id, k, a) => [id, L(k), a, m.n, pct(a, m.n) + '%'];
    return [['metric', 'label', 'count', 'of', 'value'],
      ['class_code', L('tc.cls.lbl'), '', '', ctx.cls === '*' ? 'all' : ctx.cls], ['date', L('tc.ps.f.made'), '', '', today()],
      share('students', 'tc.k.n', m.n), share('finished_12_months', 'tc.ps.k.done', m.done),
      share('grade_steady', 'grade.steady', m.steady), share('grade_made_it', 'grade.made', m.made), share('grade_card_frozen', 'grade.frozen', m.frozen),
      share('card_bill_not_paid_in_full', 'tc.ps.k.miss', m.missed), share('emergency_fund_goal_reached', 'tc.ps.k.ef', m.efGoal),
      share('no_interest_or_fees', 'tc.ps.k.nofee', m.noFee), share('bill_left_unpaid', 'tc.ps.k.over', m.overdue),
      share('used_pay_later', 'tc.ps.k.bnpl', m.bnpl), share('ended_with_card_debt', 'tc.k.debt', m.debt),
      ['avg_interest_and_fees_aed', L('tc.k.fees'), '', m.n, Math.round(m.fees)], ['avg_impulse_buys_aed', L('tc.k.imp'), '', m.n, Math.round(m.imp)],
      ['avg_net_worth_aed', L('tc.k.avg'), '', m.n, Math.round(m.net)],
      ['answered_both_times', L('tc.ps.ba.nk'), m.both, m.n, pct(m.both, m.n) + '%'],
      ['avg_right_month1_of_2', L('tc.ps.ba.pre'), '', m.both, one(m.pre)], ['avg_right_year_end_of_2', L('tc.ps.ba.post'), '', m.both, one(m.post)],
      ['did_better_at_year_end', L('tc.ps.ba.upk'), m.up, m.both, pct(m.up, m.both) + '%'],
      ['card_bill_guess_right_month1', L('tc.c.card'), m.card.pre.right, m.card.pre.n, pct(m.card.pre.right, m.card.pre.n) + '%'],
      ['card_bill_check_right_year_end', L('tc.c.card'), m.card.post.right, m.card.post.n, pct(m.card.post.right, m.card.post.n) + '%'],
      ['zakat_guess_right_month1', L('tc.c.zakat'), m.zakat.pre.right, m.zakat.pre.n, pct(m.zakat.pre.right, m.zakat.pre.n) + '%'],
      ['zakat_check_right_year_end', L('tc.c.zakat'), m.zakat.post.right, m.zakat.post.n, pct(m.zakat.post.right, m.zakat.post.n) + '%'],
      ['goal_reached', L('tc.k.goal'), m.goalR, m.goalN, pct(m.goalR, m.goalN) + '%']]
      .concat(m.goals.map((x) => ['goal_' + x.g + '_reached', L('gl.' + x.g), x.r, x.n, pct(x.r, x.n) + '%']))
      .concat(m.lv.map((c, i) => share('level_' + (i + 1), 'lv.' + (i + 1), c)), [share('older_code_no_goal_or_level', 'tc.gl.old', m.old),
        ['sample_data', L('tc.ps.sampleK'), list.filter((v) => v.cls === 'SAMPLE').length, m.n, '']]);
  }
  function download(name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('tcPiStatus').textContent = PS.plain(t('tc.pi.saved', { file: name }));
  }
  const fileName = (kind) => 'payday_spire_' + (ctx.cls === '*' ? 'all' : ctx.cls) + '_' + kind + '_' + today() + '.csv';
  PS.tcPilot = { measure, rowsCsv: () => csvText(rowsCsv(ctx.list)), summaryCsv: () => csvText(summaryCsv(ctx.list)) };

  // ---------- the one-page results sheet ----------
  const of = (a, b) => P(pct(a, b)) + ' <small>' + t('tc.k.of', { a, b }) + '</small>';
  const tile = (k, html, warn) => '<div class="tc-kpi' + (warn ? ' warn' : '') + '"><dt>' + t(k) + '</dt><dd><b>' + html + '</b></dd></div>';
  const qa = (x) => (x.n ? of(x.right, x.n) : t('tc.g.skip'));
  function sheet() {
    const list = ctx.list, m = measure(list), sampleN = list.filter((v) => v.cls === 'SAMPLE').length;
    const head = ctx.cls === '*' ? t('tc.sum.allc', { n: new Set(ctx.all.map((v) => v.cls)).size }) : t('tc.sum.cls', { c: code(ctx.cls) });
    const fields = ['school', 'group', 'sponsor', 'date', 'week'].map((f) => '<div class="ps-f"><span>' + t('tc.ps.f.' + f) + '</span><i></i></div>').join('');
    const ba = !m.both ? '<p class="tc-ba">' + t('tc.ba.none') + '</p>' :
      '<table class="tc-tbl"><caption>' + t('tc.ps.ba.n', { n: m.both }) + '</caption><thead><tr><th scope="col">' + t('tc.ps.ba.q') + '</th><th scope="col">' +
      t('tc.ps.ba.pre') + '</th><th scope="col">' + t('tc.ps.ba.post') + '</th></tr></thead><tbody>' +
      '<tr><th scope="row">' + t('tc.c.card') + '</th><td>' + qa(m.card.pre) + '</td><td>' + qa(m.card.post) + '</td></tr>' +
      '<tr><th scope="row">' + t('tc.c.zakat') + '</th><td>' + qa(m.zakat.pre) + '</td><td>' + qa(m.zakat.post) + '</td></tr>' +
      '<tr><th scope="row">' + t('tc.ps.ba.avg') + '</th><td>' + one(m.pre) + '</td><td>' + one(m.post) + '</td></tr></tbody></table>' +
      '<p class="tc-ba">' + t('tc.ps.ba.up', { a: m.up, b: m.both, s: m.same, w: m.down }) + '</p>';
    const grades = '<table class="tc-tbl" aria-label="' + PS.plain(t('tc.gr.t')) + '"><thead><tr><th scope="col">' + t('tc.th.grade') + '</th><th scope="col">' + t('tc.th.n') +
      '</th><th scope="col">' + t('tc.th.pct') + '</th></tr></thead><tbody>' + ['steady', 'made', 'frozen'].map((g) => '<tr><th scope="row"><span class="tc-g g-' + g + '">' +
      t('grade.' + g) + '</span></th><td>' + m[g] + '</td><td>' + P(pct(m[g], m.n)) + '</td></tr>').join('') + '</tbody></table>';
    const codes = Array.from(new Set(ctx.all.map((v) => v.cls)));
    const cmp = codes.length < 2 ? '' : '<h3 class="tc-h3">' + t('tc.ps.cmp.t') + '</h3><p class="tc-note">' + t('tc.ps.cmp.note') + '</p><div class="tc-scroll" tabindex="0" role="region" aria-label="' +
      PS.plain(t('tc.ps.cmp.t')) + '"><table class="tc-tbl"><thead><tr>' + ['tc.cls.lbl', 'tc.k.n', 'tc.k.steady', 'tc.ps.k.miss', 'tc.ps.k.ef', 'tc.k.goal', 'tc.ps.cmp.ba'].map((k) => '<th scope="col">' + t(k) + '</th>').join('') +
      '</tr></thead><tbody>' + codes.map((c) => { const x = measure(ctx.all.filter((v) => v.cls === c)); return '<tr><th scope="row">' + code(c) + '</th><td>' + x.n + '</td><td>' + P(pct(x.steady, x.n)) +
      '</td><td>' + P(pct(x.missed, x.n)) + '</td><td>' + P(pct(x.efGoal, x.n)) + '</td><td>' + (x.goalN ? P(pct(x.goalR, x.goalN)) : '-') + '</td><td>' + (x.both ? t('tc.ps.cmp.v', { a: one(x.pre), b: one(x.post) }) : t('tc.g.skip')) + '</td></tr>'; }).join('') +
      '</tbody></table></div>';
    return '<div class="ps-top"><h2 id="psT" tabindex="-1">' + t('tc.ps.t') + '</h2><span class="tc-chip">' + head + '</span></div>' +
      '<p class="tc-note">' + t('tc.ps.sub', { d: '<bdi dir="ltr">' + today() + '</bdi>' }) + '</p>' +
      (sampleN ? '<p class="tc-sample" role="note">' + PS.icon('flag') + '<span>' + t('tc.ps.sample') + '</span></p>' : '') +
      '<div class="ps-fields">' + fields + '</div>' +
      '<dl class="tc-kpis ps-kpis">' + tile('tc.k.n', String(m.n)) + tile('tc.ps.k.done', of(m.done, m.n)) + tile('tc.k.steady', of(m.steady, m.n)) +
      tile('tc.ps.k.miss', of(m.missed, m.n), m.missed) + tile('tc.ps.k.ef', of(m.efGoal, m.n)) + tile('tc.ps.k.nofee', of(m.noFee, m.n)) +
      tile('tc.ps.k.over', of(m.overdue, m.n), m.overdue) + tile('tc.ps.k.bnpl', of(m.bnpl, m.n)) +
      tile('tc.k.goal', m.goalN ? of(m.goalR, m.goalN) : t('tc.gl.noneK')) + '</dl>' +
      '<div class="ps-two"><div><h3 class="tc-h3">' + t('tc.ps.ba.t') + '</h3>' + ba + '</div><div><h3 class="tc-h3">' + t('tc.ps.gr') + '</h3>' + grades + '</div></div>' +
      '<h3 class="tc-h3">' + t('tc.ps.gl') + '</h3>' + PS.tcGoalTable(list) + cmp +
      '<div class="ps-f ps-notes"><span>' + t('tc.ps.f.notes') + '</span><i></i><i></i></div>' +
      '<h3 class="tc-h3">' + t('tc.ps.how.t') + '</h3><p class="ps-small">' + t('tc.ps.how') + '</p><p class="ps-small"><b>' + t('tc.ps.priv') + '</b></p>' +
      '<p class="ps-small">' + t('tc.ps.foot') + '</p>' +
      '<div class="tc-btns no-print"><button class="btn pri" id="psPrint" type="button">' + t('tc.ps.print') + '</button><button class="btn" id="psClose" type="button">' + t('tc.ps.close') + '</button></div>';
  }
  function openSheet() {
    const box = $('tcPilotSheet');
    box.innerHTML = sheet(); box.hidden = false;
    $('psPrint').onclick = printSheet;
    $('psClose').onclick = closeSheet;
    $('psT').focus();
  }
  function closeSheet() { const box = $('tcPilotSheet'); box.hidden = true; box.innerHTML = ''; document.body.classList.remove('pv'); if ($('tcPiSheet')) $('tcPiSheet').focus(); }
  // printing the sheet prints only the sheet (css/teacher.css body.pv); the summary's own Print button keeps the full summary
  function printSheet() { document.body.classList.add('pv'); window.print(); }
  window.addEventListener('afterprint', () => document.body.classList.remove('pv'));

  // called by js/teacher.js after each summary: all = every result read, list = the results of the chosen class code
  PS.tcPilot.mount = function (all, list, cls) {
    ctx = { all, list, cls };
    const card = '<section class="tc-card tc-pilot no-print" aria-labelledby="piT"><h2 id="piT">' + t('tc.pi.t') + '</h2><p class="tc-note">' + t('tc.pi.sub') + '</p>' +
      '<div class="tc-btns"><button class="btn pri" id="tcPiSheet" type="button">' + t('tc.pi.sheet') + '</button><button class="btn" id="tcPiCsv" type="button">' + t('tc.pi.csv') +
      '</button><button class="btn" id="tcPiSum" type="button">' + t('tc.pi.csvSum') + '</button></div><p class="tc-status" id="tcPiStatus" role="status" aria-live="polite"></p></section>';
    const sum = $('smT') && $('smT').closest('section');
    if (sum) sum.insertAdjacentHTML('afterend', card); else $('tcOut').insertAdjacentHTML('beforeend', card);
    $('tcPiSheet').onclick = openSheet;
    $('tcPiCsv').onclick = () => download(fileName('results'), PS.tcPilot.rowsCsv());
    $('tcPiSum').onclick = () => download(fileName('summary'), PS.tcPilot.summaryCsv());
    if (!$('tcPilotSheet').hidden) { $('tcPilotSheet').innerHTML = sheet(); $('psPrint').onclick = printSheet; $('psClose').onclick = closeSheet; }
  };
  PS.tcPilot.clear = function () { ctx = { all: [], list: [], cls: null }; const box = $('tcPilotSheet'); box.hidden = true; box.innerHTML = ''; };
})();
