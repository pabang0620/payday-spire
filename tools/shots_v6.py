"""v6 screenshots of the screens the v6 changes touched (shots/v6_*.png; the battle screens come from tools/layout_check.py --shots):
end screens with the new reason sentences (every bill on the card K7M3QX in English, no emergency fund GULF26 in Arabic on a
phone, steady CLASS7), the discussion cards of the card year, and the title screen. Prints one JSON line with the reason
sentences as shown and the console errors (should be 0).
Usage: python3 tools/shots_v6.py"""
import os, json
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = os.path.expanduser('~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome')
GAME = 'file://' + os.path.join(ROOT, 'index.html')
SHOTS = os.path.join(ROOT, 'shots')
POL = open(os.path.join(ROOT, 'tools', 'policies.js')).read()
INSTALL = """(src) => { const module = { exports: {} }; new Function('module', src)(module); module.exports(PS); }"""
END = """([code, pol]) => { const s = PS.simYear(code, pol); s.reasked = true; PS.G.s = s; PS.flow.end();
  return Array.from(document.querySelectorAll('#end .why li')).map((li) => li.textContent); }"""
RUNS = [('end_card_en', 1280, 800, 'en', 'K7M3QX', 'swipeAll'), ('end_nofund_ar_phone', 390, 844, 'ar', 'GULF26', 'noBuffer'),
        ('end_steady_en', 1280, 800, 'en', 'CLASS7', 'steady'), ('end_impulse_en_phone', 390, 844, 'en', 'CLASS7', 'impulse')]


def main():
    out, errors = {}, []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, headless=True)
        for name, w, h, lang, code, pol in RUNS:
            pg = b.new_page(viewport={'width': w, 'height': h})
            pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.goto(GAME + '?lang=' + lang)
            pg.wait_for_timeout(300)
            pg.screenshot(path=os.path.join(SHOTS, 'v6_title_%s_%d.png' % (lang, w)))
            pg.evaluate(INSTALL, POL)
            out[name] = pg.evaluate(END, [code, pol])
            pg.wait_for_timeout(300)
            pg.screenshot(path=os.path.join(SHOTS, 'v6_' + name + '.png'))
            top = pg.evaluate("() => document.querySelector('#end .why').getBoundingClientRect().top + scrollY")
            pg.evaluate('(y) => window.scrollTo(0, y - document.getElementById("hud").offsetHeight - 50)', top)
            pg.wait_for_timeout(150)
            pg.screenshot(path=os.path.join(SHOTS, 'v6_' + name + '_why.png'))
            if name == 'end_card_en':
                pg.click('#rcCards'); pg.wait_for_timeout(300)
                pg.screenshot(path=os.path.join(SHOTS, 'v6_cards_card_en.png'))
            pg.close()
        b.close()
    print(json.dumps({'why': out, 'console_errors': errors}, ensure_ascii=False))


if __name__ == '__main__':
    main()
