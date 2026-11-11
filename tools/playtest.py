"""Headless playthrough: one whole year driven through the real buttons, choices made by js/policy.js.
Usage: python3 tools/playtest.py <steady|impulse|idle> [CODE] [en|ar] [desktop|phone] [shot_prefix]
Prints a JSON line with the year's numbers, the console errors (should be 0) and an estimated play time for a person
(model in TIME below: each new line read once at 230 words a minute, about the adult average for silent reading of
non-fiction (Brysbaert 2019: 238); 2 s to choose and press a card, 1 s per end turn, 1 s plus 1 s per problem on screen (up to 3) to look at the
start of each turn, 2 s to decide in a window with choices, 1 s for a window with one button, 0.5 s to glance at a line seen before
with new numbers). Screenshots go to shots/.
Every text drawn on the page (document.body.innerText) is collected after each action, on the end screen and in its discussion
cards, and kept in tools/screen_text.json for the zero-amount check Z2s in tools/regress.js (any path that puts a number in a
sentence is caught, not only the lines the engine writes). The status-bar balances (.st-v) are left out: they are readouts,
and a balance of 0 shows 0."""
import sys, os, json, re
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = os.path.expanduser('~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome')  # same as ../zoud/tools/pt_common.py
POL = sys.argv[1] if len(sys.argv) > 1 else 'steady'
CODE = sys.argv[2] if len(sys.argv) > 2 else 'CLASS7'
LANG = sys.argv[3] if len(sys.argv) > 3 else 'en'
VIEW = sys.argv[4] if len(sys.argv) > 4 else 'desktop'
PREFIX = sys.argv[5] if len(sys.argv) > 5 else ''
SIZE = {'desktop': (1280, 800), 'phone': (390, 844)}[VIEW]
TIME = {'wpm': 230, 'card': 2.0, 'end': 1.0, 'look0': 1.0, 'look1': 1.0, 'choose': 2.0, 'press': 1.0, 'target': 1.0, 'glance': 0.5}
CHOICE = ('settle', 'reward', 'dialog', 'check')  # windows where a decision is made (intro and summaries are one press)

STATE = """() => {
  const m = document.getElementById('modal');
  if (!m.hidden) return {modal: document.getElementById('panel').dataset.kind,
    acts: Array.from(document.querySelectorAll('#panel [data-act]')).map(b => b.dataset.act)};
  return {phase: PS.G.phase};
}"""

DECIDE = """(pol) => {
  const P = PS.POLICY[pol], s = PS.G.s;
  const kind = document.getElementById('panel').dataset.kind;
  if (kind === 'dialog') return {sel: '[data-act=dlg][data-id=' + P.dialog(s, PS.G.dlgKind) + ']'};
  if (kind === 'settle') {
    const sel = '[data-act=left][data-id=' + P.left(s) + ']';
    return {sel: document.querySelector(sel) ? sel : '[data-act=left]'};
  }
  if (kind === 'reward') { // after months 3, 6 and 9 the same window has the course and the coach
    const a = PS.SHOP_AFTER.indexOf(s.mi) >= 0 ? P.shop(s) : null;
    if (a && a.type === 'course') return {sel: '[data-act=course]'};
    if (a && a.type === 'remove') return {sel: '[data-act=remove][data-id=' + a.id + ']'};
    const id = P.reward(s, PS.G.offers); return {sel: id ? '[data-act=take][data-id=' + id + ']' : '[data-act=take]:not([data-id])'}; }
  if (kind === 'intro') return {sel: '[data-act=go]'};
  if (kind === 'check') { // steady answers right, impulse picks the first answer, idle skips
    const o = document.querySelector('#panel .opts'); const q = PS.check.Q[o.dataset.n][o.dataset.phase];
    if (pol === 'idle') return {sel: '#qSkip'};
    return {sel: '[data-q=' + (pol === 'steady' ? q.right : 'a') + ']'}; }
  return {sel: '#panel button'};
}"""

SCREEN = """() => {
  const st = document.createElement('style');
  st.textContent = '.st-v{display:none!important}';
  document.head.appendChild(st);
  const txt = document.body.innerText;
  st.remove();
  return txt;
}"""

TURN = """(pol) => { const a = PS.POLICY[pol].turn(PS.G.s); return a ? {h: a.h, t: a.t} : null; }"""


def main():
    errors, shots = [], set()
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, headless=True)
        pg = b.new_page(viewport={'width': SIZE[0], 'height': SIZE[1]}, device_scale_factor=1)
        pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.goto('file://' + os.path.join(ROOT, 'index.html') + '?lang=' + LANG)
        pg.wait_for_timeout(400)

        def shot(name):
            if PREFIX and name not in shots:
                shots.add(name)
                pg.wait_for_timeout(250)
                pg.screenshot(path=os.path.join(ROOT, 'shots', PREFIX + name + '.png'))

        shot('title')
        pg.fill('#code', CODE)
        pg.click('#btnPlay')
        actions = 0
        tm = {'read': 0.0, 'look': 0.0, 'cards': 0, 'ends': 0, 'windows': 0, 'targets': 0, 'turns': 0, 'words': 0, 'per': {}}
        seen, shapes = set(), set()
        drawn = {}  # every line drawn on screen -> how many actions it was seen at

        def collect():
            for x in pg.evaluate(SCREEN).split('\n'):
                x = x.strip()
                if x:
                    drawn[x] = drawn.get(x, 0) + 1
        last_turn = None
        for _ in range(3000):
            collect()
            st = pg.evaluate(STATE)
            if st.get('phase') == 'end':
                break
            if 'modal' in st:
                k = st['modal']
                mi = pg.evaluate('PS.G.s.mi')
                if k == 'intro' and mi in (0, 1, 8):
                    shot('intro_m%d' % (mi + 1))
                if k == 'settle' and 'left' in st['acts'] and mi in (1, 4, 8):
                    shot('statement_m%d' % (mi + 1))
                if k in ('reward', 'shop', 'dialog', 'check'):
                    shot(k)
                # a person reads a line once: lines already seen in an earlier window (same words) are skipped
                # and a line seen before with only new numbers ("AED 2,100 cash is left") is a glance (TIME['glance'])
                lines = [x.strip() for x in pg.evaluate("document.getElementById('panel').innerText").split('\n') if x.strip()]
                shape = lambda x: re.sub(r'[0-9][0-9,.]*', '#', x)
                new = [x for x in lines if x not in seen and shape(x) not in shapes]
                glance = [x for x in lines if x not in seen and shape(x) in shapes]
                words = sum(len(x.split()) for x in new)
                tm['read'] += len(glance) * TIME['glance']
                if os.environ.get('SHOWREAD'):
                    print('##', k, words, '|', ' / '.join(new)[:600], file=sys.stderr)
                seen.update(lines); shapes.update(shape(x) for x in lines)
                tm['per'][k] = tm['per'].get(k, 0) + words
                tm['windows'] += 1; tm['words'] += words
                tm['read'] += words / TIME['wpm'] * 60 + (TIME['choose'] if k in CHOICE and 'left' in st['acts'] or k in ('reward', 'dialog', 'check') else TIME['press'])
                d = pg.evaluate(DECIDE, POL)
                pg.click(d['sel'])
            else:
                mi = pg.evaluate('PS.G.s.mi')
                if mi in (0, 4, 8, 11):
                    shot('battle_m%d' % (mi + 1))
                key = pg.evaluate('[PS.G.s.mi, PS.G.s.turn, PS.E.alive(PS.G.s).length]')
                if key[:2] != last_turn:
                    last_turn = key[:2]; tm['turns'] += 1
                    tm['look'] += TIME['look0'] + TIME['look1'] * min(key[2], 3)
                a = pg.evaluate(TURN, POL)
                if a:
                    if a['t'] is not None and a['t'] >= 0 and pg.query_selector('#foes [data-i="%d"]' % a['t']):
                        if pg.evaluate('PS.G.target') != a['t']:
                            tm['targets'] += 1
                        pg.click('#foes [data-i="%d"]' % a['t'])
                    pg.click('#hand [data-h="%d"]' % a['h'])
                    tm['cards'] += 1
                else:
                    pg.click('#btnEnd')
                    tm['ends'] += 1
            actions += 1
        pg.wait_for_timeout(300)
        end_words = pg.evaluate("document.getElementById('end').innerText.split(/\\s+/).filter(Boolean).length")
        shot('end')
        collect()
        if pg.query_selector('#rcCards'):  # the discussion cards of this run
            pg.click('#rcCards')
            pg.wait_for_timeout(200)
            collect()
        if PREFIX:
            pg.screenshot(path=os.path.join(ROOT, 'shots', PREFIX + 'end_full.png'), full_page=True)
        res = pg.evaluate("""() => { const s = PS.G.s; return {phase: PS.G.phase, over: s.over, month: s.mi + 1, overMonth: s.st.overMonth + 1,
          net: PS.E.netWorth(s), debt: Math.round(s.debt), buffer: s.buffer, savings: s.savings, fund: s.fund, interest: s.st.interest,
          lateFees: s.st.lateFees, advFees: s.st.advFees, impulse: s.st.impulse, burnouts: s.st.burnouts, maxDebt: Math.round(s.st.maxDebt),
          grade: document.querySelector('#end .grade') ? document.querySelector('#end .grade').textContent : null,
          rcode: document.getElementById('rcRcode') ? document.getElementById('rcRcode').textContent : null}; }""")
        b.close()
    est = tm['read'] + tm['look'] + tm['cards'] * TIME['card'] + tm['ends'] * TIME['end'] + tm['targets'] * TIME['target']
    tm['read'] = round(tm['read']); tm['look'] = round(tm['look'])
    res.update({'policy': POL, 'code': CODE, 'lang': LANG, 'view': VIEW, 'clicks': actions, 'time_min': round(est / 60, 1), 'time_parts': tm,
                'end_screen_min': round(end_words / TIME['wpm'], 1),
                'console_errors': errors})
    print(json.dumps(res, ensure_ascii=False))
    # keep the latest result of each run for tools/doc_numbers.js (the play times in README.md and concept_doc.md)
    out = os.path.join(ROOT, 'tools', 'playtest_results.json')
    try:
        allr = json.load(open(out))
    except (OSError, ValueError):
        allr = {}
    allr['_'.join([POL, CODE, LANG, VIEW])] = {k: res[k] for k in ('time_min', 'end_screen_min', 'clicks', 'over', 'month', 'net')}
    with open(out, 'w') as f:
        json.dump(allr, f, indent=1, sort_keys=True)
    tout = os.path.join(ROOT, 'tools', 'screen_text.json')
    try:
        allt = json.load(open(tout))
    except (OSError, ValueError):
        allt = {}
    allt['_'.join([POL, CODE, LANG, VIEW])] = {'actions': actions, 'lines': sorted(drawn)}
    with open(tout, 'w') as f:
        json.dump(allt, f, ensure_ascii=False, indent=0, sort_keys=True)


main()
