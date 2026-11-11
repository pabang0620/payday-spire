/* Payday Spire - the year's goal and the levels on screen: the picker on the title screen (under the class code), the goal
   chip in the status bar, the sinking fund line of each month intro, and on the end screen the goal's verdict, the
   achievements and the next level. Storage (the levels opened, the last goal, the achievements seen) is kept in this
   browser only and may be blocked: then everything still works, level 1 only. Rules are in js/goals.js. */
(function () {
  const PS = (window.PS = window.PS || {});
  const $ = (id) => document.getElementById(id);
  const t = (k, p) => PS.t(k, p);
  const C = PS.CONST;
  const KEY = 'paydayspire.goals';
  const U = (PS.goalui = {});

  function read() {
    try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; }
  }
  function write(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* storage blocked: level 1 next time */ } }
  const maxLevel = () => { const n = Math.round(+read().max || 1); return Math.max(1, Math.min(PS.LEVELS.length, n)); };
  // a class can be given one goal in the link (?goal=studio); a code given in the link or typed in plays level 1
  const urlGoal = () => { const m = /[?&]goal=(home|studio|gold)/.exec(location.search); return m ? m[1] : null; };
  const urlCode = () => /[?&]code=[A-Za-z0-9]{6}/.test(location.search);
  U.isClass = (code) => urlCode() || (code && code.length === 6 && code !== PS.G.lastRandom);
  const pick = { goal: null, lv: null };
  const goalNow = () => urlGoal() || pick.goal || (PS.GOALS[read().goal] ? read().goal : PS.GOAL_DEFAULT);
  const lvNow = () => Math.min(maxLevel(), pick.lv || +read().lv || maxLevel());
  // what the next run plays with (js/screens.js Play)
  U.opts = (cls) => ({ goal: goalNow(), lv: cls ? 1 : lvNow(), cls: !!cls });

  const lvP = (n) => { const L = PS.LEVELS[n - 1]; return { lim: L.limit, p: Math.round((L.shock - 1) * 100), r: L.rent, pay: C.SALARY - L.pay }; };
  U.lvLine = (n) => t('lv.' + n + '.d', lvP(n));

  // ---------- title: the goal under the class code (the first one is marked, so a first-time player just presses Play) ----------
  U.title = function () {
    const el = $('goalPick');
    if (!el) return;
    const forced = urlGoal(), g = goalNow(), code = PS.cleanCode(($('code') || {}).value || ''), cls = U.isClass(code), max = maxLevel();
    const opt = (id) => '<button class="gopt' + (id === g ? ' on' : '') + '" aria-pressed="' + (id === g) + '" data-goal="' + id + '"' + (forced && id !== forced ? ' disabled' : '') + '>' +
      PS.icon(PS.GOALS[id].icon) + '<b>' + t('gl.' + id) + '</b><span>' + t('aed', { a: PS.GOALS[id].target }) + '</span></button>';
    let h = '<p class="gp-t" id="gpT">' + t('gl.pick') + '</p><div class="gp-opts" role="group" aria-labelledby="gpT">' + PS.GOAL_IDS.map(opt).join('') + '</div>' +
      '<p class="small gp-d">' + t('gl.' + g + '.d', { g: PS.GOALS[g].target }) + (forced ? ' ' + t('gl.class') : '') + '</p>';
    if (max > 1) {
      if (cls) h += '<p class="small gp-lv">' + t('gl.classLv') + '</p>';
      else {
        const lv = lvNow();
        h += '<div class="seg gp-lvs" role="group" aria-label="' + PS.plain(t('gl.lv')) + '"><span>' + t('gl.lv') + '</span>' + PS.LEVELS.map((L, i) => {
          const n = i + 1, open = n <= max;
          return '<button class="chip' + (n === lv ? ' on' : '') + '" aria-pressed="' + (n === lv) + '" data-lv="' + n + '"' + (open ? '' : ' disabled title="' + PS.plain(t('gl.lock')) + '"') + '>' +
            (open ? '' : PS.icon('close')) + '<bdi dir="ltr">' + n + '</bdi> ' + t('lv.' + n) + '</button>';
        }).join('') + '</div><p class="small gp-lvd">' + U.lvLine(lv) + '</p>';
      }
    }
    el.innerHTML = h;
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('#goalPick [data-goal], #goalPick [data-lv]');
    if (!b || b.disabled) return;
    const v = read();
    if (b.dataset.goal) { pick.goal = v.goal = b.dataset.goal; } else { pick.lv = v.lv = +b.dataset.lv; }
    write(v); U.title();
    const again = document.querySelector('#goalPick [data-goal="' + (b.dataset.goal || '') + '"], #goalPick [data-lv="' + (b.dataset.lv || '') + '"]');
    if (again) again.focus();
  });

  // ---------- status bar chip: what the jar holds against the goal ----------
  const kShort = (a) => (a < 1000 ? String(Math.round(a)) : (Math.round(a / 100) / 10).toFixed(1).replace(/\.0$/, '') + 'k');
  U.hudHTML = function (s) {
    if (!s || !s.goal) return '';
    const name = t('gl.' + s.goal.id), lbl = PS.plain(t('hud.goalOf', { name, a: s.gpot, b: s.goal.target }));
    const v = '<span class="v-f"><bdi dir="ltr">' + PS.plain(PS.num(s.gpot)) + '/' + PS.plain(PS.num(s.goal.target)) + '</bdi></span><span class="v-n" aria-hidden="true"><bdi dir="ltr">' +
      kShort(s.gpot) + '/' + kShort(s.goal.target) + '</bdi></span><span class="v-k" aria-hidden="true"><bdi dir="ltr">' + kShort(s.gpot) + '/' + kShort(s.goal.target) + '</bdi></span>';
    const pct = Math.min(100, Math.round((s.gpot / s.goal.target) * 100));
    return PS.ui.stat('goal', PS.GOALS[s.goal.id].icon, v, '<span class="bar" role="img" aria-label="' + PS.ui.esc(lbl) + '"><i style="width:' + pct + '%"></i></span>');
  };

  // ---------- month intro: the sinking fund sum for the months left ----------
  U.introLine = function (s) {
    const name = t('c.' + PS.GOALS[s.goal.id].jar); // the jar's name ("Family jar")
    if (!PS.E.goalOpen(s)) return t('in.goalDone', { name, a: s.gpot });
    return t('in.goal', { name, a: s.gpot, g: s.goal.target, m: PS.E.perMonth(s) });
  };

  // ---------- end screen ----------
  U.goalHTML = function (s) {
    const r = PS.E.goalResult(s);
    if (!r) return '';
    const p = { a: r.pot, g: r.target, d: r.short };
    let h = '<div class="goal-end ' + (r.reached ? 'yes' : 'no') + '"><h2>' + PS.icon(PS.GOALS[r.id].icon) + t('end.goalH', { name: t('gl.' + r.id) }) + '</h2>' +
      '<p class="ge-v">' + PS.icon(r.reached ? 'shield' : 'flag') + t('end.goal.' + r.id + (r.reached ? '.y' : '.n'), p) + '</p>';
    if (r.cut) h += '<p>' + t('end.goal.cut', { a: r.cut }) + '</p>';
    if (r.out) h += '<p>' + t('end.goal.out', { a: r.out }) + '</p>';
    const sp = U.spare(s);
    if (sp) h += '<p class="ge-spare">' + t(sp.k, sp.p) + '</p>';
    return h + '<p class="small">' + t('end.goal.why') + '</p></div>';
  };
  // a missed goal while the money was there: savings plus the emergency fund cover what is short (not on a frozen card or with
  // card debt left: then the card comes first). "spare": savings and the fund above its goal (one month of costs) cover it, so
  // the jar could have had it with the fund still whole; "fund": only by breaking into the fund, which then holds less than a
  // month of costs (what it would keep is said). null when it does not apply (tools/regress_goals.js GL8)
  U.spare = function (s) {
    const r = PS.E.goalResult(s);
    if (!r || r.reached || s.over === 'limit' || s.debt > 0) return null;
    const sav = Math.max(0, s.savings), buf = Math.max(0, s.buffer), free = sav + Math.max(0, buf - C.LIVING);
    if (free >= r.short) return { k: 'end.goal.spare', p: { v: free, d: r.short } };
    if (sav + buf >= r.short) return { k: 'end.goal.spareFund', p: { d: r.short, b: sav + buf - r.short } };
    return null;
  };
  // the comparison rows (js/screens.js "The same year, other habits"): your goal and steady habits' goal on the same year
  U.cmpGoal = function (s, steady) {
    const r = PS.E.goalResult(s), q = steady && PS.E.goalResult(steady);
    if (!r || !q) return null;
    return { k: 'end.cmp.g.' + (r.reached ? 'y' : 'n') + (q.reached ? 'y' : 'n'), p: { name: t('gl.' + r.id), d: r.short, e: q.short } };
  };
  U.cmpGoalHTML = function (s, steady) { const c = U.cmpGoal(s, steady); return c ? '<p class="cmp-goal">' + PS.icon(PS.GOALS[s.goal.id].icon) + t(c.k, c.p) + '</p>' : ''; };
  // achievements of this run (earned ones bright, the rest show what to try next time); "new" the first time on this device
  U.badges = function (s) {
    const st = s.st, fees = st.interest + st.lateFees + st.advFees, done = s.over !== 'limit', r = PS.E.goalResult(s);
    return [
      { id: 'lv', on: done, p: { n: s.lv || 1 } },
      { id: 'nofees', on: done && fees === 0 },
      { id: 'fund', on: done && s.buffer >= C.LIVING },
      { id: 'calm', on: done && !st.impulse },
    ].concat(r ? [{ id: 'goal', on: r.reached }] : []);
  };
  U.badgesHTML = function (s) {
    const v = read(), seen = v.badges || {}, list = U.badges(s);
    const key = (b) => b.id + (b.id === 'lv' ? b.p.n : b.id === 'goal' ? s.goal.id : '');
    if (!s.badgesNew) s.badgesNew = list.filter((b) => b.on && !seen[key(b)]).map(key);
    return '<div class="badges" role="list" aria-label="' + PS.plain(t('bd.h')) + '">' + list.map((b) => {
      const nw = s.badgesNew.indexOf(key(b)) >= 0;
      return '<span role="listitem" class="badge' + (b.on ? ' on' : '') + (nw ? ' new' : '') + '">' + PS.icon(b.on ? 'star' : 'hourglass') + t('bd.' + b.id, b.p) +
        (nw ? ' <em>' + t('bd.new') + '</em>' : '') + (b.on ? '' : '<span class="sr"> (' + t('bd.no') + ')</span>') + '</span>';
    }).join('') + '</div>' + U.levelHTML(s);
  };
  // the next level: opened by finishing a year at the highest level open so far (not in class mode: level 1 stays)
  U.levelHTML = function (s) {
    if (s.cls) return '';
    const lv = s.lv || 1, n = lv + 1, max = maxLevel();
    if (lv >= PS.LEVELS.length) return s.over === 'limit' ? '' : '<p class="lv-next">' + t('end.lv.top') + '</p>';
    const p = { n, name: t('lv.' + n), d: U.lvLine(n) };
    if (s.over === 'limit' && n > max) return '<p class="lv-next">' + t('end.lv.next', p) + '</p>';
    return '<div class="lv-next open"><p>' + PS.icon('flag') + t('end.lv.open', p) + '</p><button class="btn pri" id="btnLv">' + t('end.lv.btn', { n }) + '</button></div>';
  };
  // after the end screen is drawn: remember the achievements and the level opened, sound the opening once
  U.bindEnd = function (s) {
    const v = read(), seen = v.badges || {};
    U.badges(s).forEach((b) => { if (b.on) seen[b.id + (b.id === 'lv' ? b.p.n : b.id === 'goal' ? s.goal.id : '')] = 1; });
    v.badges = seen;
    const lv = s.lv || 1;
    if (!s.cls && s.over !== 'limit' && lv >= maxLevel() && lv < PS.LEVELS.length && !s.lvSaid) { v.max = lv + 1; s.lvSaid = true; setTimeout(() => PS.audio.play('unlock'), 900); }
    write(v);
    const b = $('btnLv');
    if (b) b.onclick = () => { pick.lv = lv + 1; const w = read(); w.lv = lv + 1; write(w); const code = PS.G.lastRandom = PS.randomCode(); $('code').value = code; PS.flow.start(code, { goal: PS.runOpt(s).goal, lv: lv + 1 }); };
  };
})();
