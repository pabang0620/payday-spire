/* Payday Spire - background music made with WebAudio (no files): a loop in maqam Hijaz on D (D, Eb, F#, G, A, Bb, C),
   an oud-like pluck over a soft drone, and a frame-drum pattern a little faster than Jar Rush's Bayati loop (a card battle).
   Quiet by default. Off when Sound or Music is off. Reduce motion keeps the tune but drops the drum.
   Starts only after the first tap or key (browsers block sound before that). */
(function () {
  const PS = (window.PS = window.PS || {});
  const VOL = 0.07; // music bus level (sound effects peak around 0.15)
  const STEP = 60 / 96 / 2; // eighth notes at 96 bpm
  const AHEAD = 0.35; // seconds scheduled ahead

  // Hijaz on D, in semitones from D4: D, Eb, F#, G, A, Bb, C, D, Eb
  const SCALE = [0, 1, 4, 5, 7, 8, 10, 12, 13];
  const D4 = 293.66;
  const hz = (deg) => D4 * Math.pow(2, SCALE[deg] / 12);
  // 8 bars of 8 eighths; numbers are scale degrees, null is a rest
  const _ = null;
  const TUNE = [
    0, _, 1, 2, 3, _, 2, _,
    4, _, 3, 2, 1, _, 0, _,
    4, 5, 4, _, 3, 2, 3, _,
    2, 1, 0, _, _, _, _, _,
    7, _, 6, 5, 4, _, 5, _,
    4, 3, 2, _, 3, _, 4, _,
    2, _, 1, _, 2, 3, 2, 1,
    0, _, _, _, 4, _, 0, _,
  ];
  // frame drum per bar: D = low "dum", T = high "tak"
  const DRUM = ['D', _, 'T', _, 'D', 'D', 'T', _];

  let bus = null, drone = [], timer = 0, on = false, step = 0, nextT = 0;

  function ctx() { return PS.audio && PS.audio.ctx ? PS.audio.ctx() : null; }

  function pluck(c, t0, f, v) {
    // two slightly detuned strings (an oud has double courses), a bright attack that darkens fast
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2600, t0);
    lp.frequency.exponentialRampToValueAtTime(600, t0 + 0.3);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
    lp.connect(g); g.connect(bus);
    [1, 1.004].forEach((d) => {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f * d, t0);
      o.connect(lp);
      o.start(t0); o.stop(t0 + 0.95);
    });
  }

  function drum(c, t0, kind) {
    if (kind === 'D') {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(120, t0);
      o.frequency.exponentialRampToValueAtTime(55, t0 + 0.18);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
      o.connect(g); g.connect(bus);
      o.start(t0); o.stop(t0 + 0.32);
      return;
    }
    const len = Math.floor(c.sampleRate * 0.06);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = c.createBufferSource();
    src.buffer = buf;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 1.2;
    const g = c.createGain(); g.gain.value = 0.35;
    src.connect(bp); bp.connect(g); g.connect(bus);
    src.start(t0);
  }

  function startDrone(c) {
    // D and A, low and soft, under the whole loop
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 420;
    const g = c.createGain(); g.gain.value = 0.22;
    lp.connect(g); g.connect(bus);
    drone = [73.42, 110].map((f) => {
      const o = c.createOscillator();
      o.type = 'triangle'; o.frequency.value = f;
      o.connect(lp); o.start();
      return o;
    });
  }

  function schedule() {
    const c = ctx();
    if (!c || !on) return;
    const calm = !!(PS.settings && PS.settings.motion === false);
    // quieter while a window is open (month panels, the end screen)
    const target = VOL * (PS.ui && PS.ui.isOpen && PS.ui.isOpen() ? 0.5 : 1);
    if (Math.abs(bus.gain.value - target) > 0.002) bus.gain.setTargetAtTime(target, c.currentTime, 0.3);
    while (nextT < c.currentTime + AHEAD) {
      const i = step % TUNE.length;
      const deg = TUNE[i];
      if (deg != null) pluck(c, nextT, hz(deg), 0.32);
      // the second time round, a soft lower octave doubles the first beat of each bar
      if (i % 8 === 0 && Math.floor(step / TUNE.length) % 2 === 1 && deg != null) pluck(c, nextT, hz(deg) / 2, 0.18);
      if (!calm && DRUM[i % 8]) drum(c, nextT, DRUM[i % 8]);
      step++;
      nextT += STEP;
    }
  }

  function start() {
    const c = ctx();
    if (!c || on) return;
    on = true;
    bus = c.createGain();
    bus.gain.setValueAtTime(0.0001, c.currentTime);
    bus.gain.setTargetAtTime(VOL, c.currentTime, 0.8); // fade in
    bus.connect(c.destination);
    startDrone(c);
    step = 0; nextT = c.currentTime + 0.1;
    schedule();
    timer = setInterval(schedule, 120);
  }

  function stop() {
    if (!on) return;
    on = false;
    clearInterval(timer);
    const c = ctx(), b = bus, dr = drone;
    drone = []; bus = null;
    if (!c || !b) return;
    b.gain.setTargetAtTime(0.0001, c.currentTime, 0.15); // short fade out
    setTimeout(() => { dr.forEach((o) => { try { o.stop(); } catch (e) { /* already stopped */ } }); try { b.disconnect(); } catch (e) { /* gone */ } }, 700);
  }

  function sync() {
    const st = PS.settings || {};
    const want = !!(PS.audio && PS.audio.unlocked) && st.sound !== false && st.music !== false && !document.hidden;
    if (want) start(); else stop();
  }

  document.addEventListener('visibilitychange', sync);
  PS.music = { sync, playing: () => on };
})();
