"""v15 screenshots of the replay and feel work (the year's goal, the levels, the played-card feedback), English and Arabic,
desktop (1280x800) and phone (390x844):
  title   the goal under the class code, the first one marked; levels 1-3 open (as after two finished years) (v15_title_*.png)
  fly     a played card half way to the problem it pays, the problem shaking, the jar chip in the status bar (v15_fly_*.png)
  jar     month 2, every bill paid: the goal's jar card in the hand (v15_jar_*.png)
  settle  a month end with the jar as the steady pick once the fund holds its goal (v15_settle_*.png)
  end     the year's end: the goal's verdict, the achievements, the next level opened (v15_end_*.png)
  lock    level 1 finished on a fresh device: level 2 opens on the end screen (v15_unlock_*.png)
Prints one JSON line with the console errors (should be 0).
Usage: python3 tools/shots_v15.py"""
import os, json
from playwright.sync_api import sync_playwright
from shots_v8 import SHOTS, CHROME, STEP, GAME

VIEWS = [('desktop', 1280, 800), ('phone', 390, 844)]
STATE = '() => ({ mi: PS.G.s ? PS.G.s.mi : -1, turn: PS.G.s ? PS.G.s.turn : -1, modal: !document.getElementById("modal").hidden, ' \
        'kind: document.getElementById("panel").dataset.kind, phase: PS.G.phase, jar: PS.G.s ? PS.G.s.hand.some((c) => PS.CARDS[c.id].jar) : false, ' \
        'left: PS.G.s && PS.G.phase === "settle" ? PS.POLICY.steady.left(PS.G.s) : "" })'
# the next steady card, played by the game itself, then every animation stopped part way so the screenshot shows the motion
FLY = """() => { const s = PS.G.s, a = PS.POLICY.steady.turn(s); if (!a) return false;
  if (a.t >= 0) { PS.G.target = a.t; PS.ui.render(); }
  PS.flow.playCard(a.h);
  (PS.fx.last || []).forEach((x) => { x.pause(); const t = x.effect.getTiming(); x.currentTime = (t.delay || 0) + t.duration * 0.42; });
  return PS.fx.last.length; }"""


def page(b, w, h, lang, q, errors, store=None):
    pg = b.new_page(viewport={'width': w, 'height': h})
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(GAME + '?lang=' + lang + q)
    if store:
        pg.evaluate('(v) => { localStorage.setItem("paydayspire.goals", v); }', store)
        pg.goto(GAME + '?lang=' + lang + q)
    pg.wait_for_timeout(250)
    pg.evaluate('() => { PS.settings.music = false; PS.settings.sound = false; PS.applySettings(); }')
    return pg


def until(pg, done, pol='steady'):
    for _ in range(900):
        st = pg.evaluate(STATE)
        if done(st):
            pg.wait_for_timeout(250)
            return st
        pg.evaluate(STEP, pol)
    raise RuntimeError('state not reached')


def shot(pg, name):
    pg.screenshot(path=os.path.join(SHOTS, 'v15_' + name + '.png'))


def main():
    errors = []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, headless=True)
        for lang in ['en', 'ar']:
            for name, w, h in VIEWS:
                tag = lang + '_' + name
                # title with levels 1-3 open, then a free-play year (random code) at level 2 with the wedding gold goal
                pg = page(b, w, h, lang, '&tut=0', errors, json.dumps({'max': 3, 'lv': 2, 'goal': 'home'}))
                pg.evaluate("() => document.getElementById('goalPick').scrollIntoView({ block: 'center' })")
                pg.wait_for_timeout(100)
                shot(pg, 'title_' + tag)
                pg.click('#goalPick [data-goal=gold]')
                pg.evaluate('() => window.scrollTo(0, 0)')
                pg.click('#btnPlay')
                until(pg, lambda s: s['phase'] == 'battle' and not s['modal'] and s['mi'] == 1)
                pg.wait_for_timeout(1000)  # the copies of the bot's quick plays before this one are gone
                pg.evaluate(FLY)
                pg.wait_for_timeout(30)
                shot(pg, 'fly_' + tag)
                pg.wait_for_timeout(800)
                until(pg, lambda s: s['phase'] == 'battle' and not s['modal'] and s['jar'] and s['mi'] >= 1)
                shot(pg, 'jar_' + tag)
                until(pg, lambda s: s['modal'] and s['kind'] == 'settle' and s['left'] == 'goal')
                pg.evaluate("() => { const o = document.querySelector('#panel .stmt'); if (o) o.scrollIntoView({ block: 'center' }); }")
                pg.wait_for_timeout(150)
                shot(pg, 'settle_' + tag)
                until(pg, lambda s: s['phase'] == 'end')
                pg.wait_for_timeout(300)
                shot(pg, 'end_' + tag)
                pg.evaluate("() => { const o = document.querySelector('#end .goal-end'); if (o) o.scrollIntoView({ block: 'start' }); }")
                pg.wait_for_timeout(150)
                shot(pg, 'endgoal_' + tag)
                pg.close()
                # a fresh device finishes level 1 (first goal): level 2 opens
                pg = page(b, w, h, lang, '&tut=0', errors)
                pg.click('#btnPlay')
                until(pg, lambda s: s['phase'] == 'end')
                pg.evaluate("() => { const o = document.querySelector('#end .badges'); if (o) o.scrollIntoView({ block: 'center' }); }")
                pg.wait_for_timeout(200)
                shot(pg, 'unlock_' + tag)
                pg.close()
        b.close()
    print(json.dumps({'console_errors': errors}))


if __name__ == '__main__':
    main()
