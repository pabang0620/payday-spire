/* Payday Spire - sounds made with WebAudio (no files). Every sound also shows a caption (settings can turn either off). */
(function () {
  const PS = (window.PS = window.PS || {});
  let ctx = null, master = null, capT = 0;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.45; master.connect(ctx.destination);
    return ctx;
  }
  function tone(f, t0, dur, type, vol, slide) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'triangle';
    o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.25, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  const SFX = {
    pay(t) { tone(660, t, 0.12, 'triangle', 0.25); tone(1320, t + 0.05, 0.16, 'sine', 0.12); },
    card(t) { tone(880, t, 0.08, 'square', 0.07); tone(660, t + 0.09, 0.1, 'square', 0.07); },
    save(t) { tone(523, t, 0.15, 'triangle', 0.2); tone(784, t + 0.08, 0.2, 'triangle', 0.18); },
    calm(t) { tone(440, t, 0.4, 'sine', 0.16, 330); },
    joy(t) { [523, 659, 784].forEach((f, i) => tone(f, t + i * 0.07, 0.25, 'triangle', 0.16)); },
    shock(t) { tone(150, t, 0.35, 'sawtooth', 0.12, 60); },
    sale(t) { tone(1175, t, 0.08, 'square', 0.06); tone(1568, t + 0.08, 0.12, 'square', 0.06); },
    turn(t) { tone(392, t, 0.12, 'triangle', 0.14); },
    month(t) { [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.08, 0.3, 'triangle', 0.16)); },
    good(t) { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.11, 0.45, 'triangle', 0.18)); },
    bad(t) { [392, 370, 311, 262].forEach((f, i) => tone(f, t + i * 0.18, 0.5, 'sawtooth', 0.06)); },
    no(t) { tone(160, t, 0.14, 'square', 0.06); },
    // a problem paid off, a run of cards in one turn (each one a step higher), a level opened (js/juice.js, js/goalui.js)
    clear(t) { [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + 0.12 + i * 0.05, 0.22, 'triangle', 0.15)); },
    combo(t) { const n = Math.min(6, (PS.fx && PS.fx.n) || 2); tone(523 * Math.pow(1.122, n), t + 0.1, 0.18, 'sine', 0.16); },
    unlock(t) { [523, 784, 1047, 1568].forEach((f, i) => tone(f, t + i * 0.09, 0.4, 'triangle', 0.16)); tone(2093, t + 0.4, 0.5, 'sine', 0.08); },
  };
  PS.audio = {
    unlocked: false,
    ctx: () => ctx,
    unlock() {
      const c = ensure(); if (c && c.state === 'suspended') c.resume();
      PS.audio.unlocked = !!c;
      if (PS.music) PS.music.sync();
    },
    play(name) {
      const set = PS.settings || {};
      if (set.sound !== false && ensure()) { try { SFX[name](ctx.currentTime + 0.005); } catch (e) { /* sound is optional */ } }
      if (set.captions !== false) PS.audio.caption(PS.t('cap.' + name));
    },
    // captions have their own line in the layout (never a floating box over the game): the open window, the end screen
    // under the grade, or the status bar during a battle
    caption(text) {
      const $ = (id) => document.getElementById(id);
      const end = $('end');
      const el = !$('modal').hidden ? $('capM') : end && !end.hidden ? $('capE') : $('capH');
      document.querySelectorAll('.cap-slot.on').forEach((x) => { if (x !== el) x.classList.remove('on'); });
      if (!el || !text) return;
      el.textContent = '[' + text + ']';
      el.classList.add('on');
      clearTimeout(capT);
      capT = setTimeout(() => el.classList.remove('on'), 1400);
    },
  };
})();
