"""v13 screenshots of the final fixes, English and Arabic, desktop (1280x800) and
phone (390x844), steady habits on K7M3QX:
  shop    the shop window after month 6: "Savings now" is the status bar's Savings; the fund's part above its goal and the
          flight money are named apart (v13_shop_*.png)
  settle  a month-end window with leftover cash: the fund option says what it will hold of its goal (v13_settle_*.png)
  hand    month 4, turn 2: no fresh hand holds more than two copies of one card (v13_hand_*.png)
  late    month 10: the trial subscriptions from the mega sale wait for turn 2 (v13_late_*.png)
Prints one JSON line with the console errors (should be 0).
Usage: python3 tools/shots_v13.py"""
import os, json
from playwright.sync_api import sync_playwright
from shots_v8 import page, to_month, SHOTS, CHROME, STEP

VIEWS = [('desktop', 1280, 800), ('phone', 390, 844)]
STATE = '() => ({ mi: PS.G.s.mi, turn: PS.G.s.turn, modal: !document.getElementById("modal").hidden, ' \
        'kind: document.getElementById("panel").dataset.kind, phase: PS.G.phase, cash: PS.G.s.cash })'


def until(pg, done):
    for _ in range(600):
        st = pg.evaluate(STATE)
        if done(st):
            pg.wait_for_timeout(200)
            return st
        pg.evaluate(STEP, 'steady')
    raise RuntimeError('state not reached')


def shot(pg, name):
    pg.screenshot(path=os.path.join(SHOTS, 'v13_' + name + '.png'))


def main():
    errors = []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, headless=True)
        for lang in ['en', 'ar']:
            for name, w, h in VIEWS:
                tag = lang + '_' + name
                pg = page(b, w, h, lang, 1, '&code=K7M3QX&tut=0', errors)
                pg.click('#btnPlay')
                until(pg, lambda s: s['modal'] and s['kind'] == 'settle' and s['cash'] > 0)
                shot(pg, 'settle_' + tag)
                until(pg, lambda s: s['phase'] == 'battle' and not s['modal'] and s['mi'] == 3 and s['turn'] == 1)
                shot(pg, 'hand_' + tag)
                until(pg, lambda s: s['modal'] and s['kind'] == 'reward' and s['mi'] == 5)
                pg.evaluate("() => { const o = document.querySelector('#panel .opts'); if (o) o.scrollIntoView({ block: 'center' }); }")
                pg.wait_for_timeout(150)
                shot(pg, 'shop_' + tag)
                pg.close()
                pg = page(b, w, h, lang, 1, '&code=K7M3QX&tut=0', errors)
                to_month(pg, 9)
                if pg.evaluate("() => !document.getElementById('modal').hidden"):
                    pg.evaluate(STEP, 'steady')  # the friend asks to borrow first
                    pg.wait_for_timeout(200)
                shot(pg, 'late_' + tag)
                pg.close()
        b.close()
    print(json.dumps({'console_errors': errors}))


if __name__ == '__main__':
    main()
