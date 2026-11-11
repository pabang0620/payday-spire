/* Payday Spire - title, settings and the end of the year (why it went this way, the same year with other habits, zakat). */
(function () {
  const PS = (window.PS = window.PS || {});
  const $ = (id) => document.getElementById(id);
  const t = (k, p) => PS.t(k, p);
  const C = PS.CONST;

  // ---------- settings (kept in this browser only; the game works without storage) ----------
  const DEF = { lang: 'en', size: 1, motion: true, captions: true, sound: true, music: true };
  PS.settings = Object.assign({}, DEF);
  try { Object.assign(PS.settings, JSON.parse(localStorage.getItem('ps_settings') || '{}')); } catch (e) { /* private mode */ }
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches && !('motionSet' in PS.settings)) PS.settings.motion = false;
  const urlLang = /[?&]lang=(ar|en)/.exec(location.search);
  if (urlLang) PS.settings.lang = urlLang[1];
  function save() { try { localStorage.setItem('ps_settings', JSON.stringify(PS.settings)); } catch (e) { /* ignore */ } }

  PS.applySettings = function () {
    const st = PS.settings;
    PS.lang = st.lang;
    document.documentElement.lang = st.lang;
    document.documentElement.dir = st.lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.style.setProperty('--fs', st.size);
    document.documentElement.dataset.fs = String(st.size); // larger text: the phone status bar drops its labels (css/battle.css)
    document.body.classList.toggle('still', st.motion === false);
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.innerHTML = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-label]').forEach((el) => { el.setAttribute('aria-label', PS.plain(t(el.dataset.i18nLabel))); });
    document.title = PS.plain(t('title'));
    const lb = $('btnLang');
    if (lb) { lb.lang = st.lang === 'ar' ? 'en' : 'ar'; lb.dir = st.lang === 'ar' ? 'ltr' : 'rtl'; }
    if (PS.brand) PS.brand.render();
    if (PS.music) PS.music.sync();
    if (PS.ui && PS.ui.fitBattle) PS.ui.fitBattle();
    if (PS.tutor && PS.G && PS.G.phase === 'title') PS.tutor.peek();
    if (PS.goalui && PS.G && PS.G.phase === 'title') PS.goalui.title();
    if (PS.G && PS.G.s) { PS.ui.hud(); if (PS.G.phase === 'battle') PS.ui.render(); if (PS.G.phase === 'end') PS.showEnd(PS.G.s); }
  };

  const seg = (key, vals, labels) => '<div class="seg" role="group" aria-label="' + PS.plain(t('set.' + key)) + '"><span>' + t('set.' + key) + '</span>' +
    vals.map((v, i) => '<button class="chip' + (PS.settings[key] === v ? ' on' : '') + '" aria-pressed="' + (PS.settings[key] === v) + '" data-set="' + key + '" data-v=\'' + JSON.stringify(v) + '\'' +
      (key === 'lang' ? ' lang="' + v + '"' : '') + '>' + labels[i] + '</button>').join('') + '</div>';

  PS.showSettings = function () {
    const body = '<h2>' + t('set.t') + '</h2>' +
      seg('lang', ['en', 'ar'], ['English', 'العربية']) +
      seg('size', [1, 1.2, 1.4], ['A', 'A+', 'A++'].map((x) => '<bdi dir="ltr">' + x + '</bdi>')) +
      seg('motion', [true, false], [t('set.on'), t('set.off')]) +
      seg('captions', [true, false], [t('set.on'), t('set.off')]) +
      seg('sound', [true, false], [t('set.on'), t('set.off')]) +
      seg('music', [true, false], [t('set.on'), t('set.off')]) +
      '<p class="small">' + t('set.note') + '</p><div class="row"><button class="btn pri" data-act="closeSet" data-first>' + t('btn.close') + '</button></div>';
    PS.ui.modal(body, { kind: 'settings', esc: closeSet });
  };
  function closeSet() {
    PS.ui.close();
    if (PS.G.phase === 'intro') PS.flow.intro();
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-set]');
    if (b) {
      PS.settings[b.dataset.set] = JSON.parse(b.dataset.v);
      if (b.dataset.set === 'motion') PS.settings.motionSet = true;
      save(); PS.applySettings();
      const key = b.dataset.set;
      PS.showSettings();
      const again = document.querySelector('[data-set="' + key + '"].on');
      if (again) again.focus();
      return;
    }
    if (e.target.closest('[data-act="closeSet"]')) closeSet();
  });

  // ---------- title ----------
  PS.showTitle = function () {
    PS.G.phase = 'title';
    PS.G.s = null;
    ['battle', 'end'].forEach((x) => { $(x).hidden = true; });
    $('title').hidden = false;
    $('hud').hidden = true;
    const bg = PS.art('title_bg');
    $('title').style.backgroundImage = bg ? 'linear-gradient(rgba(20,18,46,.55), rgba(20,18,46,.92)), url("' + bg + '")' : '';
    const m = /[?&]code=([A-Za-z0-9]+)/.exec(location.search);
    if (m && !$('code').value) $('code').value = PS.cleanCode(m[1]);
    if (PS.tutor) PS.tutor.peek();
    PS.goalui.title();
  };
  $('code').addEventListener('input', () => { const v = PS.cleanCode($('code').value); if (v !== $('code').value) $('code').value = v; PS.goalui.title(); });
  // a code typed in or given in the link is a class code: level 1, and the class goal if the link names one (js/goalui.js)
  $('btnPlay').addEventListener('click', () => {
    let code = PS.cleanCode($('code').value);
    const cls = PS.goalui.isClass(code);
    if (code.length < 6) code = PS.G.lastRandom = PS.randomCode();
    $('code').value = code;
    PS.flow.start(code, PS.goalui.opts(cls));
  });
  $('btnRandom').addEventListener('click', () => { $('code').value = PS.G.lastRandom = PS.randomCode(); PS.goalui.title(); $('code').focus(); });
  $('btnHow').addEventListener('click', () => PS.flow.help());
  ['btnSet', 'btnSet2'].forEach((id) => $(id).addEventListener('click', PS.showSettings));
  $('btnHelp').addEventListener('click', () => PS.flow.help());
  $('btnLang').addEventListener('click', () => { PS.settings.lang = PS.settings.lang === 'ar' ? 'en' : 'ar'; save(); PS.applySettings(); });
  $('btnEnd').addEventListener('click', () => PS.flow.endTurn());

  // ---------- end of the year ----------
  PS.showEnd = function (s) {
    const g = PS.grade(s);
    const steady = PS.simYear(s.code, 'steady', PS.runOpt(s));
    const en = PS.cls.endNums(s, steady), nw = en.you.nw, snw = en.steady.nw;
    const z = PS.E.zakat(s);
    const art = PS.art(g === 'frozen' ? 'end_bad' : 'end_good');
    const past = PS.past.forRun(s);
    const pnw = past ? past.net[past.net.length - 1] : 0;
    const max = Math.max(1, Math.abs(nw), Math.abs(snw), Math.abs(pnw));
    const bar = (v, cls) => '<span class="cbar ' + cls + (v < 0 ? ' neg' : '') + '"><i style="width:' + Math.round((Math.abs(v) / max) * 100) + '%"></i></span>';
    $('end').innerHTML =
      '<div class="end-in"><h1 id="endT" tabindex="-1">' + t('end.t') + '</h1>' +
      '<p class="grade g-' + g + '">' + PS.icon(g === 'frozen' ? 'card' : g === 'steady' ? 'shield' : 'flag') + t('grade.' + g) + '</p>' +
      '<p class="grade-d">' + PS.gradeLine(s) + '</p>' +
      '<p class="cap-slot" id="capE" aria-hidden="true"></p>' +
      '<div class="kpis">' +
      en.kpis.map((k) => '<div><span>' + t(k[0]) + '</span><b>' + k[1] + '</b></div>').join('') + '</div>' +
      // what to press is on the first screen: copy the result for the teacher, or play the same year again (beat Past you)
      '<div class="row end-acts"><button class="btn pri" id="btnCopyTop">' + t('end.copy') + '</button><button class="btn" id="btnSameTop">' + t('end.same') + '</button>' +
      '<p class="note-slot" id="endNoteTop"></p></div>' +
      PS.goalui.goalHTML(s) + PS.goalui.badgesHTML(s) + (art ? '<img class="end-art ' + (g === 'frozen' ? 'bad' : 'good') + '" src="' + art + '" alt="">' : '') +
      '<h2>' + t('end.why') + '</h2><ol class="why">' + PS.cls.why(s).map((x) => '<li>' + x.text + '</li>').join('') + '</ol>' +
      PS.check.endHTML(s) +
      '<h2>' + t('end.cmp') + '</h2><div class="cmp">' +
      '<div class="crow"><span class="cl">' + t('end.you') + '</span>' + bar(nw, 'cyou') + '<span class="cv"><b>' + PS.aedOrZero(nw) + '</b><small>' + en.you.fees + '</small></span></div>' +
      PS.past.endBar(s, bar) +
      '<div class="crow"><span class="cl">' + t('end.steady') + '</span>' + bar(snw, 'cst') + '<span class="cv"><b>' + PS.aedOrZero(snw) + '</b><small>' + en.steady.fees + '</small></span></div>' +
      PS.goalui.cmpGoalHTML(s, steady) + '<p class="small">' + t('end.cmp.n') + '</p>' + PS.past.endLine(s) + '</div>' +
      '<h2>' + t('end.zakat') + '</h2><div class="zakat"><span class="zbar" role="img" aria-label="' + PS.plain(t('end.zpct', { p: z.pct })) + '"><i style="width:' + z.pct + '%"></i></span>' +
      '<p>' + t((z.above ? 'end.z.above' : 'end.z.below') + (s.st.given > 0 ? '' : '0'), { w: z.wealth, n: z.nisab, p: z.pct, g: s.st.given }) + '</p><p class="small">' + t('end.z.note') + '</p></div>' +
      PS.cls.resultHTML(s) + PS.brand.endHTML() +
      '<p>' + t('end.code', { c: s.code }) + '</p>' +
      '<div class="row"><button class="btn pri" id="btnSame">' + t('end.same') + '</button>' +
      '<button class="btn" id="btnNew">' + t('end.new') + '</button></div>' +
      '<p class="small">' + t('end.simple', { lim: s.limit || C.LIMIT }) + '</p></div>';
    PS.ui.ltrSigns($('end'));
    PS.audio.play(g === 'frozen' ? 'bad' : 'good');
    $('btnSame').onclick = $('btnSameTop').onclick = () => PS.flow.start(s.code, Object.assign(PS.runOpt(s), { cls: s.cls }));
    PS.goalui.bindEnd(s);
    $('btnCopyTop').onclick = () => $('rcCopy').click();
    $('btnNew').onclick = () => { $('code').value = ''; PS.showTitle(); $('btnPlay').focus(); };
    PS.cls.bind(s);
    PS.past.save(s);
    $('end').scrollTop = 0;
    window.scrollTo(0, 0);
    $('endT').focus({ preventScroll: true });
    PS.ui.say(t('end.t') + '. ' + t('grade.' + g), true);
  };
})();
