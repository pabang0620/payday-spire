/* Payday Spire - optional painted art (art_b/, made for this game). Reads art_b/manifest.js (made by tools/art_manifest.py,
   so it works from file://), preloads each picture and keeps only the ones that loaded. Missing art falls back to icons and CSS. */
(function () {
  const PS = (window.PS = window.PS || {});
  PS.ART = {};
  PS.art = (key) => (key && PS.ART[key]) || null;
  // card frames by tone: cash, emergency fund (save), card debt, habits (calm and joy)
  const FRAMES = { card_frame_cash: ['cash'], card_frame_shield: ['save'], card_frame_credit: ['debt'], card_frame_habit: ['calm', 'joy'] };
  function frame(k, src) {
    if (!FRAMES[k]) return;
    const root = document.documentElement;
    // a full address: a relative url() in a CSS variable would be read from css/, not from the page
    const abs = new URL(src, location.href).href;
    FRAMES[k].forEach((tone) => root.style.setProperty('--fr-' + tone, 'url("' + abs + '")'));
    root.classList.add('framed');
  }
  PS.loadArt = function (done) {
    const m = window.PS_ART_MANIFEST || {};
    const keys = Object.keys(m).filter((k) => typeof m[k] === 'string' && !/^[a-z]+:|^\/\//i.test(m[k]));
    let left = keys.length;
    if (!left) { if (done) done(); return; }
    const fin = () => { if (--left === 0 && done) done(); };
    keys.forEach((k) => {
      const img = new Image();
      img.onload = () => { if (img.naturalWidth) { PS.ART[k] = m[k]; frame(k, m[k]); } fin(); };
      img.onerror = fin;
      img.src = m[k];
    });
  };
})();
