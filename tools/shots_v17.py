"""v17: the end screen's goal lines (final judge 3, ideas 1 and 2), English and Arabic, phone (390x844) and desktop (1280x800):
  a year with steady habits on ?code=DUNE47&goal=studio (the studio goal is missed with money to spare on this code) and one
  with impulse habits on the same year, to the end screen:
  goal    the missed-goal savings line (.ge-spare) is there exactly when PS.goalui.spare says so (v17_end_goal_*.png)
  cmp     "The same year, other habits" has the goal line for you and steady habits, matching both verdicts (v17_end_cmp_*.png)
  page    no sideways scroll on the phone, every Arabic number and sign the right way round (tools/rtl.js)
Writes tools/shots_v17.json and prints one JSON line (fails and console errors should both be empty).
Usage: python3 tools/shots_v17.py"""
import os, json
from playwright.sync_api import sync_playwright
from shots_v8 import SHOTS, CHROME, STEP, GAME

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RTL = open(os.path.join(ROOT, 'tools', 'rtl.js')).read()
RUNS = [('steady', 'en', 'phone', 390, 844), ('steady', 'ar', 'phone', 390, 844), ('impulse', 'en', 'desktop', 1280, 800), ('impulse', 'ar', 'phone', 390, 844)]
CHECK = """() => { const s = PS.G.s, bad = [], sd = PS.simYear(s.code, 'steady', PS.runOpt(s)), c = PS.goalui.cmpGoal(s, sd), sp = PS.goalui.spare(s);
  const line = document.querySelector('#end .cmp .cmp-goal'), spare = document.querySelector('#end .goal-end .ge-spare');
  if (!c || !line) bad.push('no comparison goal line');
  else if (line.textContent.trim() !== PS.plain(PS.icon(PS.GOALS[s.goal.id].icon) + PS.t(c.k, c.p))) bad.push('comparison line text ' + line.textContent.slice(0, 60));
  if (!!sp !== !!spare) bad.push('savings line shown ' + !!spare + ', should ' + !!sp);
  if (document.documentElement.scrollWidth > window.innerWidth + 1) bad.push('sideways scroll ' + document.documentElement.scrollWidth);
  return { bad, cmp: c && c.k, spare: sp && sp.k }; }"""


def to(pg, sel):
    pg.evaluate('(s) => { const o = document.querySelector(s); if (o) o.scrollIntoView({ block: "center" }); }', sel)
    pg.wait_for_timeout(150)


def main():
    errors, fails, seen = [], [], []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, headless=True)
        for pol, lang, name, w, h in RUNS:
            tag = pol + '_' + lang + '_' + name
            pg = b.new_page(viewport={'width': w, 'height': h})
            pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.goto(GAME + '?lang=' + lang + '&code=DUNE47&goal=studio&tut=0')
            pg.wait_for_timeout(250)
            pg.evaluate('() => { PS.settings.music = false; PS.settings.sound = false; PS.applySettings(); }')
            pg.click('#btnPlay')
            for _ in range(900):
                if pg.evaluate('() => PS.G.phase') == 'end':
                    break
                pg.evaluate(STEP, pol)
            pg.wait_for_timeout(300)
            r = pg.evaluate(CHECK)
            fails += [tag + ': ' + x for x in r['bad']]
            seen.append(tag + ' ' + str(r['cmp']) + ' ' + str(r['spare']))
            if lang == 'ar':
                fails += [tag + ' arabic: ' + x for x in pg.evaluate(RTL, '#end')]
            to(pg, '#end .goal-end')
            pg.screenshot(path=os.path.join(SHOTS, 'v17_end_goal_' + tag + '.png'))
            to(pg, '#end .cmp')
            pg.screenshot(path=os.path.join(SHOTS, 'v17_end_cmp_' + tag + '.png'))
            pg.close()
        b.close()
    res = {'fails': fails, 'console_errors': errors, 'runs': seen}
    with open(os.path.join(ROOT, 'tools', 'shots_v17.json'), 'w') as f:
        json.dump(res, f, indent=1)
    print(json.dumps(res))


if __name__ == '__main__':
    main()
