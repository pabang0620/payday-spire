/* Payday Spire - "Past you": the last run on the same class code, kept in this browser only, raced month by month
   (net worth after each month). Storage may be blocked (private window, file:// rules): then the feature quietly stays off. */
(function () {
  const PS = (window.PS = window.PS || {});
  const t = (k, p) => PS.t(k, p);
  const KEY = 'paydayspire.past';
  const KEEP = 20; // codes kept; the oldest is dropped first

  function readAll() {
    try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; }
  }
  // a stored run is usable if it has at least one month of net worth (a frozen year stops early)
  const valid = (r) => r && Array.isArray(r.net) && r.net.length >= 1 && r.net.length <= 12 && r.net.every((n) => typeof n === 'number' && isFinite(n));

  function load(code) {
    if (!code) return null;
    const r = readAll()[code];
    return valid(r) ? Object.assign({ code }, r) : null;
  }

  function save(s) {
    if (!s || !s.code || !s.st.netByMonth.length || s.pastSaved) return;
    s.pastSaved = true;
    try {
      const all = readAll();
      all[PS.runKey ? PS.runKey(s) : s.code] = { net: s.st.netByMonth.slice(0, 12), grade: PS.grade(s), at: Date.now() };
      Object.keys(all).sort((a, b) => (all[b].at || 0) - (all[a].at || 0)).slice(KEEP).forEach((c) => { delete all[c]; });
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch (e) { /* storage blocked or full: nothing to race next time */ }
  }

  const forRun = (s) => { const p = PS.G.past; return p && s && p.code === (PS.runKey ? PS.runKey(s) : s.code) ? p : null; };
  // difference after a finished month: positive = this run is ahead (null when either run has no such month)
  function diffAt(s, past, mi) {
    const a = s.st.netByMonth[mi], b = past.net[mi];
    return a == null || b == null ? null : a - b;
  }
  const diffText = (d) => (Math.abs(d) < 1 ? t('past.even') : t(d > 0 ? 'past.ahead' : 'past.behind', { x: Math.abs(d) }));

  // status bar chip: the last month both runs have finished
  function hudHTML(s) {
    const past = forRun(s);
    if (!past) return '';
    const mi = s.st.netByMonth.length - 1;
    const d = mi >= 0 ? diffAt(s, past, mi) : null;
    const val = d == null ? t('past.go') : diffText(d);
    // a lead or a gap is a money amount: it shortens like the other chips (js/ui.js fitStats); the arrow says ahead or behind
    const shown = d == null || Math.abs(d) < 1 ? val : PS.ui.money(Math.abs(d), val);
    return '<div class="st st-past' + (d != null && d >= 1 ? ' ahead' : d != null && d <= -1 ? ' behind' : '') + '" aria-label="' + PS.plain(t('past.lbl') + ': ' + val) + '">' +
      '<span class="st-i">' + PS.icon('hourglass') + '</span><span class="st-l">' + t('past.lbl') + '</span><span class="st-v">' + shown + '</span></div>';
  }

  // one line in the month-end summary
  function settleLine(s) {
    const past = forRun(s), mi = s.st.netByMonth.length - 1;
    if (!past || mi < 0) return null;
    const d = diffAt(s, past, mi);
    if (d == null) return null;
    return { k: 'past.row', p: { n: mi + 1, y: past.net[mi], d: diffText(d) }, cls: d >= 1 ? 'good' : d <= -1 ? 'warn' : '' };
  }

  // end screen: a bar beside "You" and one sentence
  function endBar(s, bar) {
    const past = forRun(s);
    if (!past) return '';
    const p = past.net[past.net.length - 1];
    return '<div class="crow"><span class="cl">' + t('past.bar') + '</span>' + bar(p, 'cpast') + '<span class="cv"><b>' + PS.aedOrZero(p) + '</b></span></div>';
  }
  function endLine(s) {
    const past = forRun(s);
    if (!past) return '';
    const now = PS.E.netWorth(s), p = past.net[past.net.length - 1], d = now - p;
    const verdict = Math.abs(d) < 1 ? t('past.tie') : t(d > 0 ? 'past.better' : 'past.worse', { x: Math.abs(d) });
    return '<p class="past-end">' + PS.icon('hourglass') + '<span>' + t('past.end', { g: t('grade.' + past.grade), p, y: now }) + ' <b>' + verdict + '</b> <small>' + t('past.note') + '</small></span></p>';
  }

  PS.past = { load, save, hudHTML, settleLine, endBar, endLine, forRun };
})();
