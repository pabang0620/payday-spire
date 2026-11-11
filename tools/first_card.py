"""First card check: how long a first-time player takes from pressing Play to their first played card, and that the month 1
lesson is taught by doing (one glowing card, then Put it on the card, then the card bill it makes), and skipped on a second run.
Time model (same as tools/playtest.py): every new line read once at 230 words a minute, 1 s per window with one button,
1 s to look at the battle plus 1 s per problem on screen (up to 3), 2 s to choose and press a card.
A first-time player is a fresh browser (no storage). A second run is the same browser after the first month.
Runs: English desktop, English phone, Arabic phone. Target: 10 s or less on every run (the bill-sorting sister game Jar Rush
takes about 5-9 s by the same model).
Usage: python3 tools/first_card.py   (prints one JSON line; writes tools/first_card.json for tools/regress.js check P1)"""
import os, json
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = os.path.expanduser('~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome')
GAME = 'file://' + os.path.join(ROOT, 'index.html')
TIME = {'wpm': 230, 'card': 2.0, 'press': 1.0, 'look0': 1.0, 'look1': 1.0}
RUNS = [('en_desktop', 1280, 800, 'en'), ('en_phone', 390, 844, 'en'), ('ar_phone', 390, 844, 'ar')]
TARGET = 10.0
SHOTS = os.path.join(ROOT, 'shots')

WORDS = "(sel) => { const el = document.querySelector(sel); return el && el.offsetParent !== null ? el.innerText.split(/\\s+/).filter(Boolean).length : 0; }"
STATE = """() => ({ modal: !document.getElementById('modal').hidden, kind: document.getElementById('panel').dataset.kind || '',
  glow: Array.from(document.querySelectorAll('#hand .card.glow')).map((c) => +c.dataset.h), step: PS.tutor ? PS.tutor.step() : '',
  guide: (document.getElementById('traitLine').hidden ? '' : document.getElementById('traitLine').innerText.trim()),
  ghost: !!document.querySelector('#foes .foe.ghost'), endGlow: document.getElementById('btnEnd').classList.contains('glow'),
  foes: PS.G.s ? PS.E.alive(PS.G.s).length : 0, phase: PS.G.phase, hand: PS.G.s ? PS.G.s.hand.map((c) => c.id) : [] })"""


def first_run(pg, name):
    """Seconds from Play to the first card, and the lesson steps as seen."""
    sec, steps = 0.0, []
    pg.click('#btnPlay')
    pg.wait_for_timeout(250)
    st = pg.evaluate(STATE)
    if st['modal']:  # a window before the battle: read it, press its button
        sec += pg.evaluate(WORDS, '#panel') / TIME['wpm'] * 60 + TIME['press']
        pg.click('[data-act=go]')
        pg.wait_for_timeout(200)
        st = pg.evaluate(STATE)
    sec += TIME['look0'] + TIME['look1'] * min(st['foes'], 3)
    sec += pg.evaluate(WORDS, '#traitLine') / TIME['wpm'] * 60
    steps.append({'step': st['step'], 'glow': st['glow'], 'guide': st['guide']})
    pg.screenshot(path=os.path.join(SHOTS, 'v7_tut1_' + name + '.png'))
    h = st['glow'][0] if len(st['glow']) == 1 else 0
    pg.click('#hand [data-h="%d"]' % h)
    sec += TIME['card']
    pg.wait_for_timeout(350)
    st = pg.evaluate(STATE)
    steps.append({'step': st['step'], 'glow': st['glow'], 'guide': st['guide']})
    pg.screenshot(path=os.path.join(SHOTS, 'v7_tut2_' + name + '.png'))
    if len(st['glow']) == 1:
        pg.click('#hand [data-h="%d"]' % st['glow'][0])
        pg.wait_for_timeout(350)
        st = pg.evaluate(STATE)
        steps.append({'step': st['step'], 'ghost': st['ghost'], 'endGlow': st['endGlow'], 'guide': st['guide']})
        pg.screenshot(path=os.path.join(SHOTS, 'v7_tut3_' + name + '.png'))
    return round(sec, 1), steps


def finish_month(pg):
    for _ in range(60):
        st = pg.evaluate(STATE)
        if st['modal']:
            return st['kind']
        pg.click('#btnEnd')
        pg.wait_for_timeout(120)
    return ''


def main():
    out, errors, fails = {}, [], []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, headless=True)
        for name, w, h, lang in RUNS:
            ctx = b.new_context(viewport={'width': w, 'height': h})
            pg = ctx.new_page()
            pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.goto(GAME + '?lang=' + lang + '&code=CLASS7')
            pg.wait_for_timeout(400)
            pg.evaluate('() => { PS.settings.music = false; PS.settings.sound = false; }')
            sec, steps = first_run(pg, name)
            kind = finish_month(pg)
            # second run on the same device: no lesson
            pg.goto(GAME + '?lang=' + lang + '&code=CLASS7')
            pg.wait_for_timeout(400)
            pg.click('#btnPlay')
            pg.wait_for_timeout(250)
            st = pg.evaluate(STATE)
            if st['modal'] and st['kind'] == 'intro':
                pg.click('[data-act=go]')
                pg.wait_for_timeout(200)
                st = pg.evaluate(STATE)
            again = {'glow': st['glow'], 'step': st['step'], 'guide': st['guide']}
            ctx.close()
            ok_steps = (len(steps) == 3 and len(steps[0]['glow']) == 1 and len(steps[1]['glow']) == 1 and steps[2].get('ghost') and steps[2].get('endGlow')
                        and all(len(s['guide'].split('\n')) == 1 for s in steps))
            out[name] = {'first_card_s': sec, 'steps': steps, 'month1_end_window': kind, 'second_run': again}
            if sec > TARGET:
                fails.append(name + ': first card after %.1f s' % sec)
            if not ok_steps:
                fails.append(name + ': lesson steps not one glowing card at a time with a one-line guide')
            if again['glow'] or again['step']:
                fails.append(name + ': the lesson came back on the second run')
        b.close()
    res = {'target_s': TARGET, 'runs': out, 'max_s': max(r['first_card_s'] for r in out.values()), 'fails': fails, 'console_errors': errors}
    with open(os.path.join(ROOT, 'tools', 'first_card.json'), 'w') as f:
        json.dump(res, f, indent=1, ensure_ascii=False)
    print(json.dumps({'max_s': res['max_s'], 'per_run': {k: v['first_card_s'] for k, v in out.items()}, 'fails': fails, 'console_errors': len(errors)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
