/* Payday Spire - teacher dashboard, before and after the summary: the 45-minute lesson steps, a preview of the year a class
   code gives (the same twelve months for every student who types it), and the five questions most worth class time with
   the points of a good answer (the other discussion card questions fold away). Text in js/i18n_teacher.js. */
(function () {
  const PS = window.PS;
  const $ = (id) => document.getElementById(id);
  const t = (k, p) => PS.t(k, p);
  // the five core questions: [discussion card, question] (the question text is the card's own, js/i18n_more.js)
  const CORE = [['cardbill', 'q1'], ['shock', 'q1'], ['sale', 'q1'], ['flight', 'q1'], ['megasale', 'q1']];
  const MORE = ['agent', 'cardbill', 'overdue', 'shock', 'late', 'flight', 'ramadan', 'landlord', 'megasale', 'dip', 'friend', 'sale', 'zakat', 'frozen'];
  const ICONS = { agent: 'key', cardbill: 'card', overdue: 'bill', shock: 'bolt', late: 'coin', flight: 'plane', ramadan: 'moon', landlord: 'key',
    megasale: 'phone', dip: 'chart', friend: 'give', sale: 'bag', zakat: 'scale', frozen: 'card' };
  let yearCode = '';
  // Arabic: a signed amount reads +250 (sign on the left), as in the game (js/ui.js ltrSigns)
  const signs = (h) => (PS.lang === 'ar' ? h.replace(/([+\-\u2212])<bdi dir="ltr">([^<]*)<\/bdi>/g, '<bdi dir="ltr">$1$2</bdi>') : h);

  function steps() {
    $('tcSteps').innerHTML = [1, 2, 3, 4, 5].map((n) => '<li>' + t('tc.ls.' + n) + '</li>').join('');
  }

  // one row per month: its money problems (name and amount) and what else the month brings (its tag, payroll delay, shop)
  function year() {
    const out = $('tcYear');
    if (!yearCode) { out.innerHTML = ''; return; }
    if (yearCode.length !== 6) { out.innerHTML = '<p class="tc-errs" role="alert">' + t('tc.yr.bad') + '</p>'; return; }
    const months = PS.buildYear(PS.codeSeed(yearCode));
    const foe = (id) => { const d = PS.FOES[id] || {}; return t('foe.' + id) + (d.amt ? ' <span class="tc-amt">(' + t(d.kind === 'deal' ? 'foe.perMonth' : 'aed', { a: d.amt }) + ')</span>' : ''); };
    const rows = months.map((m, i) => {
      const extra = [m.trait ? t('trait.' + m.trait) : '', m.late ? t('trait.late') : '', PS.SHOP_AFTER.indexOf(i) >= 0 ? t('tc.yr.shop') : ''].filter(Boolean);
      return '<tr><th scope="row">' + (i + 1) + '</th><td>' + m.foes.map(foe).join('<br>') + '</td><td>' + extra.join('<br>') + '</td></tr>';
    }).join('');
    out.innerHTML = signs('<div class="tc-scroll"><table class="tc-tbl tc-year"><caption>' + t('tc.yr.cap', { c: '<bdi dir="ltr" class="code">' + yearCode + '</bdi>' }) + '</caption>' +
      '<thead><tr><th scope="col">' + t('tc.yr.th.m') + '</th><th scope="col">' + t('tc.yr.th.p') + '</th><th scope="col">' + t('tc.yr.th.e') + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>');
  }

  function questions() {
    $('tcCore').innerHTML = CORE.map(([c, q]) => '<li><p class="tc-q">' + t('dc.' + c + '.' + q) + '</p><p class="tc-ans"><b>' + t('tc.qs.ans') + '</b> ' + t('tc.ans.' + c) + '</p></li>').join('');
    const core = CORE.map((x) => x.join('.'));
    $('tcMore').innerHTML = MORE.map((c) => {
      const qs = ['q1', 'q2'].filter((q) => core.indexOf(c + '.' + q) < 0);
      return '<article class="tc-dc"><header><span class="tc-ic">' + PS.icon(ICONS[c]) + '</span><h3>' + t('dc.' + c + '.t') + '</h3></header><ol>' +
        qs.map((q) => '<li>' + t('dc.' + c + '.' + q) + '</li>').join('') + '</ol></article>';
    }).join('');
  }

  PS.tcPlan = { render() { steps(); year(); questions(); } };
  const show = () => {
    const raw = String($('tcYrCode').value || '').trim().toUpperCase();
    yearCode = raw && PS.cleanCode(raw) === raw ? raw : raw ? '?' : ''; // a wrong letter is an error, never a different year
    year();
  };
  $('tcYrShow').onclick = show;
  $('tcYrCode').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); show(); } };
  PS.tcPlan.render();
})();
