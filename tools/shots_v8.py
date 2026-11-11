"""v8 screenshots of the four screens fixed after the Arabic native review (review/ar_native_review_final.md part 5), in
English and Arabic, desktop (1280x800) and phone (390x844, and the battle also 360x640 with the largest text):
  title    the title screen preview: three cards side by side, no name covered (shots/v8_title_*.png)
  tut      month 1 after the Agent fee is paid (cash, then the card): the Room deposit is still to come, so the line names its turn (v8_tut_*.png)
  battle   month 4 battle: each forecast in its card kept to its lines, the target's whole forecast in the line under the
           cards (v8_battle_*.png)
  end      no emergency fund year: "None", never "0.0 months" or "AED 0", in the numbers (v8_end_*.png), the comparison
           rows ("no fees", v8_cmp_*.png) and the result card (v8_result_*.png)
Prints one JSON line with the console errors (should be 0).
Usage: python3 tools/shots_v8.py"""
import os, json
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = os.path.expanduser('~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome')
GAME = 'file://' + os.path.join(ROOT, 'index.html')
SHOTS = os.path.join(ROOT, 'shots')
STEP = open(os.path.join(ROOT, 'tools', 'step.js')).read()
POL = open(os.path.join(ROOT, 'tools', 'policies.js')).read()
INSTALL = """(src) => { const module = { exports: {} }; new Function('module', src)(module); module.exports(PS); }"""
VIEWS = [('desktop', 1280, 800, 1), ('phone', 390, 844, 1)]


def page(b, w, h, lang, fs, q, errors):
    pg = b.new_page(viewport={'width': w, 'height': h})
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(GAME + '?lang=' + lang + q)
    pg.wait_for_timeout(250)
    pg.evaluate('(fs) => { PS.settings.size = fs; PS.settings.music = false; PS.settings.sound = false; PS.applySettings(); }', fs)
    return pg


def to_month(pg, mi):
    pg.click('#btnPlay')
    for _ in range(400):
        st = pg.evaluate('() => ({ mi: PS.G.s.mi, turn: PS.G.s.turn, modal: !document.getElementById("modal").hidden, phase: PS.G.phase })')
        if st['mi'] == mi and st['turn'] == 0 and not st['modal'] and st['phase'] == 'battle':
            break
        if st['mi'] == mi and st['modal'] and pg.evaluate('() => document.getElementById("panel").dataset.kind') == 'intro':
            pg.click('[data-act=go]')
            continue
        pg.evaluate(STEP, 'steady')
    pg.wait_for_timeout(150)


def main():
    errors = []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, headless=True)
        for lang in ['en', 'ar']:
            for name, w, h, fs in VIEWS + [('phone_a2', 360, 640, 1.4)]:
                tag = lang + '_' + name
                pg = page(b, w, h, lang, fs, '&code=K7M3QX&tut=1', errors)
                pg.evaluate("() => document.getElementById('titlePeek').scrollIntoView({ block: 'center' })")
                pg.screenshot(path=os.path.join(SHOTS, 'v8_title_' + tag + '.png'))
                pg.evaluate('() => window.scrollTo(0, 0)')
                pg.click('#btnPlay'); pg.wait_for_timeout(250)
                if name != 'phone_a2':  # month 1 lesson: pay the Agent fee with the glowing cards (cash, then the card)
                    for _ in range(2):
                        if pg.locator('#hand .card.glow').count():
                            pg.click('#hand .card.glow'); pg.wait_for_timeout(400)
                    pg.wait_for_timeout(900)
                    pg.screenshot(path=os.path.join(SHOTS, 'v8_tut_' + tag + '.png'))
                pg.close()
                pg = page(b, w, h, lang, fs, '&code=K7M3QX&tut=0', errors)
                to_month(pg, 3)
                pg.screenshot(path=os.path.join(SHOTS, 'v8_battle_' + tag + '.png'))
                pg.close()
            for name, w, h, fs in VIEWS:
                pg = page(b, w, h, lang, fs, '', errors)
                pg.evaluate(INSTALL, POL)
                pg.evaluate("() => { const s = PS.simYear('GULF26', 'noBuffer'); s.reasked = true; PS.G.s = s; PS.flow.end(); }")
                pg.wait_for_timeout(300)
                y = pg.evaluate("() => document.querySelector('#end .kpis').getBoundingClientRect().top + scrollY")
                pg.evaluate('(y) => window.scrollTo(0, y - document.getElementById("hud").offsetHeight - 20)', y)
                pg.wait_for_timeout(150)
                pg.screenshot(path=os.path.join(SHOTS, 'v8_end_' + lang + '_' + name + '.png'))
                for part in ['cmp', 'result']:
                    y = pg.evaluate("(sel) => document.querySelector('#end .' + sel).getBoundingClientRect().top + scrollY", part)
                    pg.evaluate('(y) => window.scrollTo(0, y - document.getElementById("hud").offsetHeight - 60)', y)
                    pg.wait_for_timeout(150)
                    pg.screenshot(path=os.path.join(SHOTS, 'v8_' + part + '_' + lang + '_' + name + '.png'))
                pg.close()
        b.close()
    print(json.dumps({'console_errors': errors}))


if __name__ == '__main__':
    main()
