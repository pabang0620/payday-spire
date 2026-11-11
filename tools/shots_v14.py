"""v14 screenshots of the final-2 judge fixes (review/judge_B_final2.md part 5), English and Arabic, desktop (1280x800) and
phone (390x844), K7M3QX:
  tut     month 1, turn 1 with the guide: the Moving van shows as a bill still to come (v14_tut_*.png)
  van     month 1, turn 3: the Moving van to pay (v14_van_*.png)
  settle  month 5 end: fill the fund to its goal and save the rest, and the fund option over its goal (v14_settle_*.png)
  shop    the shop after month 3: how soon the course pays for itself (v14_shop_*.png)
  car     month 10, turn 3: the Car service (v14_car_*.png)
  end     steady habits with month 2's card bill left unpaid: the reasons under "You made it" (v14_end_*.png)
Prints one JSON line with the console errors (should be 0).
Usage: python3 tools/shots_v14.py"""
import os, json
from playwright.sync_api import sync_playwright
from shots_v8 import page, SHOTS, CHROME, STEP

VIEWS = [('desktop', 1280, 800), ('phone', 390, 844)]
STATE = '() => ({ mi: PS.G.s ? PS.G.s.mi : -1, turn: PS.G.s ? PS.G.s.turn : -1, modal: !document.getElementById("modal").hidden, ' \
        'kind: document.getElementById("panel").dataset.kind, phase: PS.G.phase })'


def until(pg, done, pol='steady'):
    for _ in range(900):
        st = pg.evaluate(STATE)
        if done(st):
            pg.wait_for_timeout(250)
            return st
        pg.evaluate(STEP, pol)
    raise RuntimeError('state not reached')


def shot(pg, name):
    pg.screenshot(path=os.path.join(SHOTS, 'v14_' + name + '.png'))


def center(pg, sel):
    pg.evaluate("(q) => { const o = document.querySelector(q); if (o) o.scrollIntoView({ block: 'center' }); }", sel)
    pg.wait_for_timeout(150)


def battle(mi, turn):
    return lambda s: s['phase'] == 'battle' and not s['modal'] and s['mi'] == mi and s['turn'] == turn


def main():
    errors = []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, headless=True)
        for lang in ['en', 'ar']:
            for name, w, h in VIEWS:
                tag = lang + '_' + name
                pg = page(b, w, h, lang, 1, '&code=K7M3QX&tut=1', errors)
                pg.click('#btnPlay')
                pg.wait_for_timeout(400)
                shot(pg, 'tut_' + tag)
                until(pg, battle(0, 2))
                shot(pg, 'van_' + tag)
                until(pg, lambda s: s['modal'] and s['kind'] == 'reward' and s['mi'] == 2)
                center(pg, '#panel .opts')
                shot(pg, 'shop_' + tag)
                until(pg, lambda s: s['modal'] and s['kind'] == 'settle' and s['mi'] == 4)
                center(pg, '#panel .stmt')
                shot(pg, 'settle_' + tag)
                until(pg, battle(9, 2))
                shot(pg, 'car_' + tag)
                pg.close()
                pg = page(b, w, h, lang, 1, '&code=K7M3QX&tut=0', errors)
                pg.click('#btnPlay')
                # steady habits, except month 2 played idle: its card bill is left unpaid, the judge's "You made it" case
                until(pg, battle(1, 0))
                until(pg, lambda s: s['mi'] == 2, 'idle')
                until(pg, lambda s: s['phase'] == 'end')
                shot(pg, 'end_' + tag)
                pg.close()
        b.close()
    print(json.dumps({'console_errors': errors}))


if __name__ == '__main__':
    main()
