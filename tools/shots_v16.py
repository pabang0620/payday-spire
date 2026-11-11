"""v16: the year's goal and level in the result code, the dashboard round trip and percents in Arabic, English and Arabic,
desktop (1280x800) and phone (390x844):
  end     a class year from the link (?code=CLASS7&goal=studio, level 1) to the end screen: the result code is PS2 and reads
          back with the goal and level, the zakat line and the result card (v16_zakat_*.png, v16_result_*.png)
  teacher that student's new code, the same result as an old PS1 code (counted once), five sample codes and one more sample
          result as an old PS1 code pasted together: goal and level columns, the "Older code" row, both CSV files, the
          pilot results page (v16_rt_*.png, v16_rtsheet_*.png)
  Arabic  every percent reads 50% (the sign on the right of its number) on the end screen and the whole dashboard (tools/rtl.js)
Writes tools/shots_v16.json and prints one JSON line (fails and console errors should both be empty).
Usage: python3 tools/shots_v16.py"""
import os, json
from playwright.sync_api import sync_playwright
from shots_v8 import SHOTS, CHROME, STEP, GAME

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEACHER = GAME.replace('index.html', 'teacher.html')
RTL = open(os.path.join(ROOT, 'tools', 'rtl.js')).read()
VIEWS = [('desktop', 1280, 800), ('phone', 390, 844)]
STATE = '() => ({ phase: PS.G.phase, modal: !document.getElementById("modal").hidden })'

PASTE = """(mine) => { const c = PS.SAMPLE_CODES, r = PS.cls.readCode(mine);
  const old = (x) => PS.cls.packCode(PS.cls.readCode(x).v, 'PS1');
  const lines = ['Payday Spire result', mine, old(mine)].concat(c.slice(0, 5), [old(c[5])]);
  document.getElementById('tcIn').value = lines.join('\\n');
  return r.ok ? r.v : null; }"""
CHECK = """(mine) => { const bad = [], out = document.getElementById('tcOut'), st = document.getElementById('tcStatus').textContent;
  const heads = Array.from(out.querySelectorAll('.tc-list thead th')).map((h) => h.textContent);
  ['tc.th.goal', 'tc.th.lv', 'tc.th.jar'].forEach((k) => { if (heads.indexOf(PS.plain(PS.t(k))) < 0) bad.push('no column ' + k); });
  const rows = out.querySelectorAll('.tc-list tbody tr');
  if (rows.length !== 7) bad.push('rows ' + rows.length + ' (want 7: the same result pasted twice counts once)');
  if (!out.querySelector('.tc-goals') || out.querySelector('.tc-goals').textContent.indexOf(PS.plain(PS.t('tc.gl.old'))) < 0) bad.push('no older code row');
  if (out.querySelector('.tc-goals').textContent.indexOf(PS.plain(PS.t('gl.studio'))) < 0) bad.push('no studio row');
  const csv = PS.tcPilot.rowsCsv().split('\\r\\n'), head = csv[0].split(',');
  ['goal', 'level', 'goal_reached', 'goal_jar_aed'].forEach((k) => { if (head.indexOf(k) < 0) bad.push('csv column ' + k); });
  const g = head.indexOf('goal'), l = head.indexOf('level');
  const body = csv.slice(1).filter((x) => x).map((x) => x.split(','));
  if (!body.some((x) => x[g] === 'studio' && x[l] === '1')) bad.push('csv: no studio level 1 row');
  if (!body.some((x) => x[g] === '' && x[l] === '')) bad.push('csv: no older code row (empty goal and level)');
  const sum = PS.tcPilot.summaryCsv();
  ['goal_reached', 'goal_studio_reached', 'level_1', 'older_code_no_goal_or_level'].forEach((k) => { if (sum.indexOf('\\n' + k + ',') < 0) bad.push('summary csv ' + k); });
  if (!/7/.test(st)) bad.push('status: ' + st);
  return bad; }"""


def shot(pg, name):
    pg.screenshot(path=os.path.join(SHOTS, 'v16_' + name + '.png'))


def to(pg, sel, block='start'):
    pg.evaluate('([s, b]) => { const o = document.querySelector(s); if (o) o.scrollIntoView({ block: b }); }', [sel, block])
    pg.wait_for_timeout(150)


def main():
    errors, fails = [], []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, headless=True)
        for lang in ['en', 'ar']:
            for name, w, h in VIEWS:
                tag = lang + '_' + name
                pg = b.new_page(viewport={'width': w, 'height': h})
                pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
                pg.on('pageerror', lambda e: errors.append(str(e)))
                pg.goto(GAME + '?lang=' + lang + '&code=CLASS7&goal=studio&tut=0')
                pg.wait_for_timeout(250)
                pg.evaluate('() => { PS.settings.music = false; PS.settings.sound = false; PS.applySettings(); }')
                pg.click('#btnPlay')
                for _ in range(900):
                    if pg.evaluate(STATE)['phase'] == 'end':
                        break
                    pg.evaluate(STEP, 'steady')
                pg.wait_for_timeout(300)
                mine = pg.evaluate("() => (document.getElementById('rcRcode') || {}).textContent || ''")
                rd = pg.evaluate('(c) => PS.cls.readCode(c)', mine)
                if not mine.startswith('PS2-') or not rd['ok'] or rd['v']['goal'] != 'studio' or rd['v']['lv'] != 1:
                    fails.append(tag + ' end: result code ' + mine + ' ' + json.dumps(rd)[:120])
                if lang == 'ar':
                    fails += [tag + ' end arabic: ' + x for x in pg.evaluate(RTL, '#end')]
                to(pg, '#end .zakat', 'center')
                shot(pg, 'zakat_' + tag)
                to(pg, '#end .result')
                shot(pg, 'result_' + tag)
                pg.goto(TEACHER + '?lang=' + lang)
                pg.wait_for_timeout(200)
                pg.evaluate(PASTE, mine)
                pg.click('#tcShow')
                pg.wait_for_timeout(120)
                pg.select_option('#tcCls', '*')  # two class codes: show them all together
                pg.wait_for_timeout(80)
                fails += [tag + ' teacher: ' + x for x in pg.evaluate(CHECK, mine)]
                to(pg, '#tcOut .tc-goals')
                shot(pg, 'rt_' + tag)
                to(pg, '.tc-list')
                shot(pg, 'rtlist_' + tag)
                pg.click('#tcPiSheet')
                pg.wait_for_timeout(120)
                if lang == 'ar':
                    fails += [tag + ' dashboard arabic: ' + x for x in pg.evaluate(RTL, 'body')]
                to(pg, '#tcPilotSheet .ps-kpis')
                shot(pg, 'rtsheet_' + tag)
                pg.close()
        b.close()
    res = {'fails': fails, 'console_errors': errors}
    with open(os.path.join(ROOT, 'tools', 'shots_v16.json'), 'w') as f:
        json.dump(res, f, indent=1)
    print(json.dumps(res))


if __name__ == '__main__':
    main()
