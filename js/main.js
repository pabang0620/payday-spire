/* Payday Spire - start-up: settings, art, title screen. */
(function () {
  const PS = window.PS;
  PS.applySettings();
  PS.loadArt(() => {
    const bg = PS.art('battle_bg');
    if (bg) document.getElementById('battle').style.backgroundImage = 'linear-gradient(rgba(20,18,46,.78), rgba(20,18,46,.94)), url("' + bg + '")';
    if (PS.G.phase === 'title') PS.showTitle();
  });
  PS.showTitle();
  // sound and music may start only after the first tap or key (browser rule)
  const first = () => { PS.audio.unlock(); window.removeEventListener('pointerdown', first); window.removeEventListener('keydown', first); };
  window.addEventListener('pointerdown', first); window.addEventListener('keydown', first);
  document.getElementById('btnPlay').focus({ preventScroll: true });
})();
