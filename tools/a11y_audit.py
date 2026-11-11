"""Contrast audit (WCAG 2.2 AA, 1.4.3): every visible text element on the main screens, text colour against the
background behind it (semi-transparent layers are blended; text over a picture or a gradient is listed as "manual").
Normal text needs 4.5:1, large text (24px, or 18.66px bold) 3:1.
Same check as Jar Rush (../zoud/tools/a11y_audit.py), on the Payday Spire screens and the teacher dashboard.
Usage: python3 tools/a11y_audit.py   (prints failures per screen and a summary)"""
import os, json
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(ROOT, 'index.html')
CHROME = os.path.expanduser('~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome')

AUDIT = r"""(root) => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const over = (top, bot) => { const a = top.a + bot.a * (1 - top.a); return { r: (top.r * top.a + bot.r * bot.a * (1 - top.a)) / a, g: (top.g * top.a + bot.g * bot.a * (1 - top.a)) / a, b: (top.b * top.a + bot.b * bot.a * (1 - top.a)) / a, a }; };
  function bgOf(el) {
    const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null; // picture or gradient: check by eye
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
      if (e === document.body && (!c || c.a < 1)) layers.push(parse(getComputedStyle(document.documentElement).backgroundColor) || { r: 20, g: 18, b: 46, a: 1 });
    }
    let out = layers.pop();
    while (layers.length) out = over(layers.pop(), out);
    return out;
  }
  const out = [];
  const seen = new Set();
  (root || document.body).querySelectorAll('*').forEach((el) => {
    if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return;
    const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity === 0 || el.closest('[aria-hidden="true"]')) return;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
    let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity;
    const fg = parse(cs.color); if (!fg) return;
    fg.a *= op;
    const bg = bgOf(el);
    const txt = el.textContent.trim().slice(0, 40);
    const key = el.className + '|' + txt; if (seen.has(key)) return; seen.add(key);
    const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    if (!bg) { out.push({ txt, cls: String(el.className).slice(0, 30), manual: true }); return; }
    const f = over(fg, bg);
    const L1 = lum(f), L2 = lum(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const need = large ? 3 : 4.5;
    out.push({ txt, cls: String(el.className).slice(0, 30), ratio: +ratio.toFixed(2), need, ok: ratio >= need });
  });
  return out;
}"""


def audit(page, name, res, root=None):
    rows = page.evaluate(AUDIT, None) if root is None else page.evaluate('(sel) => (' + AUDIT + ')(document.querySelector(sel))', root)
    fails = [r for r in rows if not r.get('manual') and not r['ok']]
    res[name] = {'checked': len([r for r in rows if not r.get('manual')]), 'manual': len([r for r in rows if r.get('manual')]), 'fail': fails}


def main():
    res = {}
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, headless=True)
        for lang in ['en', 'ar']:
            ctx = b.new_context(viewport={'width': 1280, 'height': 800})
            page = ctx.new_page()
            page.goto(URL + '?lang=' + lang); page.wait_for_selector('#btnPlay'); page.wait_for_timeout(200)
            audit(page, 'title_' + lang, res, '#title')
            page.click('#btnSet'); page.wait_for_timeout(300); audit(page, 'settings_' + lang, res, '#panel'); page.click('[data-act=closeSet]')
            page.fill('#code', 'K7M3QX'); page.click('#btnPlay'); page.wait_for_timeout(300)
            if page.evaluate("!document.getElementById('modal').hidden"):  # a second run has the month window; a first-time player goes straight to the battle
                audit(page, 'intro_' + lang, res, '#panel'); page.click('[data-act=go]'); page.wait_for_timeout(300)
            audit(page, 'battle_' + lang, res, '#battle'); audit(page, 'hud_' + lang, res, '#hud')
            page.evaluate("() => { PS.flow.endTurn(); PS.flow.endTurn(); PS.flow.endTurn(); }"); page.wait_for_timeout(300)
            audit(page, 'settle_' + lang, res, '#panel')
            page.evaluate("() => { PS.check.ask(PS.G.s, 'pre', () => {}); }"); page.wait_for_timeout(300); audit(page, 'check_' + lang, res, '#panel')
            page.evaluate("() => { PS.ui.close(); const s = PS.simYear('K7M3QX', 'impulse'); s.predict = { q1: 'a', q2: 'b' }; s.recheck = { q1: 'b', q2: 'c' }; s.reasked = true; PS.G.s = s; PS.flow.end(); }")
            page.wait_for_timeout(400); audit(page, 'end_' + lang, res, '#end')
            page.click('#rcCards'); page.wait_for_timeout(300); audit(page, 'cards_' + lang, res, '#panel')
            page.goto(URL + '?brand=demo-bank&lang=' + lang); page.wait_for_selector('#brandBar'); audit(page, 'brand_title_' + lang, res, '#title')
            page.goto(URL.replace('index.html', 'teacher.html') + '?lang=' + lang); page.click('#tcSample'); page.wait_for_timeout(300)
            audit(page, 'teacher_' + lang, res)
            ctx.close()
        b.close()
    total = sum(r['checked'] for r in res.values())
    fails = sum(len(r['fail']) for r in res.values())
    for k, r in res.items():
        print(k, 'checked', r['checked'], 'manual', r['manual'], 'fail', len(r['fail']))
        for f in r['fail']:
            print('   ', f['ratio'], '<', f['need'], repr(f['txt']), f['cls'])
    print('TOTAL checked', total, 'failures', fails)
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'a11y_audit.json'), 'w') as f:  # read by tools/doc_numbers.js
        json.dump({'checked': total, 'failures': fails, 'screens': len(res)}, f)


main()
