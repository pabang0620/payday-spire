/* Payday Spire - partner theme preview (white label). A link like ?brand=demo-bank swaps the colours, the partner name
   and a logo slot. The brands here are fictional placeholders, never real companies. The default look is unchanged.
   The game, the numbers and the text stay the same: a partner only changes the frame. */
(function () {
  const PS = (window.PS = window.PS || {});
  const $ = (id) => document.getElementById(id);
  const t = (k, p) => PS.t(k, p);
  const BRANDS = { 'demo-bank': { name: 'brand.bank', mono: 'EB' }, 'demo-school': { name: 'brand.school', mono: 'ES' } };
  const DEMO = 'demo-bank';
  const q = /[?&]brand=([a-z-]+)/.exec(location.search);
  const id = q && Object.prototype.hasOwnProperty.call(BRANDS, q[1]) ? q[1] : null;

  // the same page with or without ?brand, keeping any other parameter (class code, language)
  function link(brand) {
    const p = new URLSearchParams(location.search);
    if (brand) p.set('brand', brand); else p.delete('brand');
    const s = p.toString();
    return location.pathname.split('/').pop() + (s ? '?' + s : '');
  }
  const name = () => (id ? t(BRANDS[id].name) : '');
  const logo = (sm) => '<span class="brand-logo' + (sm ? ' sm' : '') + '"' + (sm ? ' aria-hidden="true"' : ' role="img" aria-label="' + PS.plain(t('brand.logo')) + '"') + '>' + BRANDS[id].mono + '</span>';

  // title: the partner bar and the switch link; status bar: the partner name next to the month
  function render() {
    const bl = $('brandLink');
    if (bl) { bl.href = link(id ? null : DEMO); bl.textContent = PS.plain(t(id ? 'brand.off' : 'brand.link')); }
    if (!id) return;
    document.body.dataset.brand = id;
    let bar = $('brandBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'brandBar'; bar.className = 'brand-bar';
      const card = document.querySelector('.title-in');
      if (card) card.insertBefore(bar, card.firstChild);
    }
    bar.innerHTML = logo() + '<span class="brand-txt"><b>' + t('brand.with', { b: name() }) + '</b><small>' + t('brand.demo') + '</small></span>';
    document.title = PS.plain(t('title')) + ' - ' + name();
  }
  const hudHTML = () => (id ? ' <span class="brand-hud">' + logo(true) + name() + '</span>' : '');
  const endHTML = () => (id ? '<p class="brand-end">' + logo() + '<span>' + t('brand.end', { b: name() }) + '</span></p>' : '');

  PS.brand = { id, render, hudHTML, endHTML, link };
})();
