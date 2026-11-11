"""v10 screenshots of the 5th judge fixes (review/judge_B_5.md), English and Arabic, desktop (1280x800) and phone (390x844),
class code K7M3QX (the judge's own code), steady choices:
  eid      month 3, turn 1: Eid gifts (promised by the month's intro) is in the first hand, and so is Emergency fund pays
           while the laptop repair is on screen; the forecast line is its own row under the problem cards (v10_eid_*.png)
  shock    month 4, turn 1: the breakdowns with Emergency fund pays, cash and the card to choose from (v10_shock_*.png)
  settle   month 3 end: the card statement line reads "nothing owed" instead of "AED 0" (v10_settle_*.png)
Prints one JSON line with the console errors (should be 0) and what each shot shows.
Usage: python3 tools/shots_v10.py"""
import os, json
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = os.path.expanduser('~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome')
GAME = 'file://' + os.path.join(ROOT, 'index.html')
SHOTS = os.path.join(ROOT, 'shots')
STEP = open(os.path.join(ROOT, 'tools', 'step.js')).read()
VIEWS = [('desktop', 1280, 800), ('phone', 390, 844)]
STATE = '() => ({ mi: PS.G.s.mi, turn: PS.G.s.turn, modal: !document.getElementById("modal").hidden, kind: document.getElementById("panel").dataset.kind, phase: PS.G.phase })'
SEE = """() => ({ hand: PS.G.s.hand.map((c) => c.id), buffer: PS.G.s.buffer, line: (document.getElementById('foeLine') || {}).hidden === false,
  settle: Array.from(document.querySelectorAll('#panel .lines li')).map((l) => l.textContent).slice(-1)[0] || '' })"""


def go(pg, mi, want):
    for _ in range(500):
        st = pg.evaluate(STATE)
        if st['mi'] == mi and want == 'battle' and st['turn'] == 0 and not st['modal'] and st['phase'] == 'battle':
            break
        if st['mi'] == mi and want == 'settle' and st['modal'] and st['kind'] == 'settle':
            break
        if st['mi'] == mi and st['modal'] and st['kind'] == 'intro':
            pg.click('[data-act=go]')
            continue
        pg.evaluate(STEP, 'steady')
    pg.wait_for_timeout(200)


def main():
    errors, seen = [], {}
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, headless=True)
        for lang in ['en', 'ar']:
            for name, w, h in VIEWS:
                tag = lang + '_' + name
                pg = b.new_page(viewport={'width': w, 'height': h})
                pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
                pg.on('pageerror', lambda e: errors.append(str(e)))
                pg.goto(GAME + '?lang=' + lang + '&code=K7M3QX&tut=0')
                pg.wait_for_timeout(250)
                pg.evaluate('() => { PS.settings.music = false; PS.settings.sound = false; PS.applySettings(); }')
                pg.click('#btnPlay')
                for shot, mi, want in [('eid', 2, 'battle'), ('settle', 2, 'settle'), ('shock', 3, 'battle')]:
                    go(pg, mi, want)
                    pg.screenshot(path=os.path.join(SHOTS, 'v10_' + shot + '_' + tag + '.png'))
                    seen[shot + '_' + tag] = pg.evaluate(SEE)
                pg.close()
        b.close()
    print(json.dumps({'console_errors': errors, 'seen': seen}, ensure_ascii=False))


if __name__ == '__main__':
    main()
