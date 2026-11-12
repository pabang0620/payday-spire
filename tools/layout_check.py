"""Screen space check: every viewport x text size x language, the battle of month 1 (move-in, practice) and month 4 (three
problems, one arriving later: on a phone at the normal text size all three are whole in the problems area). The battle screen has a space budget (css/battle.css): status bar, controls and the hand are
always on the screen; the problems area takes what is left and scrolls inside itself; a hand wider than the screen scrolls
sideways inside its own row. What is checked at each stop:
  - no sideways page scroll (title screen too),
  - every hand card is fully on the screen from top to bottom, and a card off to the side sits in the hand row that scrolls,
  - the End turn button and each visible card are on the screen and not covered by anything,
  - no card cuts its own text,
  - money problems: no problem card cuts its name, amount or labels (scrollHeight/scrollWidth); a forecast in a card may be
    shortened to its line budget, but then the target's whole forecast is in the line under the cards (#foeLine), that line
    is in view, not cut, not covered, says the same as the target card, and lies over no problem card (its own row),
  - title screen preview (js/tutor.js fitPeek): no card or name wider than its box, no box covers another's name,
  - boxes side by side (tools/rowcheck.js): the status bar chips at both battles and again with the widest amounts a year
    can show (five digits in every money chip, a Past you chip with a five-digit lead), the end screen's four numbers and the
    result card's numbers after a year, and the teacher dashboard's numbers: no box overlaps another, none goes past the
    screen, no text spills out of its box or is cut (css/battle.css status bar space budget, js/ui.js fitStats).
Added after the screen review (problem cards cut at the largest text on every screen size, Arabic
card text drawn past the card, month tags pushing the status bar to three rows, "-600" over the amounts, "A++" read "++A"):
  - key information (js/ui.js foeProblems): every money problem's name, amount and first forecast line in view in the
    problems area without scrolling, at every screen x text size x language (the area's own budget, js/ui.js fitBattle),
  - no text spills out of its box (tools/spill.js): problem cards, hand cards, window choices, discussion cards,
  - the "-600" notes (js/tutor.js pop): played for real in month 1 and forced on every status box and problem at each
    stop; none lies over an amount, name, forecast or card text, or goes off the screen,
  - the status bar's top row: month, turn and buttons stay one row, with the month tags of month 8 and the longest tags
    forced, the turn chip whole,
  - the month 1 guide line is whole and not covered,
  - Arabic: signed numbers and A+ / A++ read left to right (tools/rtl.js) on battles, settings, windows, end, dashboard,
  - windows policy play does not open (the friend and market dip choices, settings, help) opened directly and checked
    the same way, and the dashboard printed at A4 width: its tables stay inside their cards.
Viewports 1920x1080, 1280x720, 1280x800, 390x844, 390x560, 360x640; text A, A+, A++; English and Arabic (36 combinations).
Usage: python3 tools/layout_check.py [--shots]   (prints one JSON line; writes tools/layout_check.json; --shots saves
shots/v6_*.png, v9_*.png and v12_*.png)"""
import os, sys, json
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = os.path.expanduser('~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome')
GAME = 'file://' + os.path.join(ROOT, 'index.html')
SHOTS = os.path.join(ROOT, 'shots')
VIEWS = [(1920, 1080), (1280, 720), (1280, 800), (390, 844), (390, 560), (360, 640)]
SIZES = [(1, 'a'), (1.2, 'a1'), (1.4, 'a2')]
LANGS = ['en', 'ar']
STOP_MONTHS = [0, 3, 7]  # month 1 (lesson), month 4 (three problems), month 8 (card bill, sale, two month tags)

TITLE = """() => {
  const el = document.getElementById('titlePeek'), bad = PS.tutor.peekProblems();
  el.querySelectorAll('.c-name, .foe-name').forEach((n, i) => {
    const r = n.getBoundingClientRect(), box = n.closest('.card, .foe'), y = r.top + r.height / 2;
    [r.left + 2, r.left + r.width / 2, r.right - 2].forEach((x) => { const e = document.elementFromPoint(x, y); if (!e || !box.contains(e)) bad.push('name ' + i + ' covered'); });
  });
  return { bad: Array.from(new Set(bad)), fit: el.className };
}"""

# one step of a year through the real buttons with steady choices (same as tools/shots_v5.py)
STEP = open(os.path.join(ROOT, 'tools', 'step.js')).read()
ROWS = open(os.path.join(ROOT, 'tools', 'rowcheck.js')).read()
SPILL = open(os.path.join(ROOT, 'tools', 'spill.js')).read()
RTL = open(os.path.join(ROOT, 'tools', 'rtl.js')).read()
BOXES = ['#foes .foe', '#hand .card', '#panel .opt', '#panel .card', '#panel .dcard']
POL = open(os.path.join(ROOT, 'tools', 'policies.js')).read()
INSTALL = """(src) => { if (!PS.POLICY || !PS.POLICY.swipeAll) { const module = { exports: {} }; new Function('module', src)(module); module.exports(PS); } }"""
# the widest status bar a year can show: five digits in every money chip and a Past you chip five digits ahead; put back after
WIDE = """() => {
  const s = PS.G.s, keep = { cash: s.cash, buffer: s.buffer, savings: s.savings, sink: s.sink, debt: s.debt, net: s.st.netByMonth, past: PS.G.past };
  Object.assign(s, { cash: 88888, buffer: 88888, savings: 88888, sink: 0, debt: 88888 }); s.st.netByMonth = [88888];
  PS.G.past = { code: PS.runKey ? PS.runKey(s) : s.code, net: [0] }; // Past you is kept per code, goal and level (js/past.js)
  keep.gpot = s.gpot; if (s.goal) s.gpot = s.goal.target - 50; // the goal chip (js/goalui.js) nearly full: its widest figures
  PS.ui.hud(); const bad = Array.from(document.querySelectorAll('#hudStats .st')).length === (s.goal ? 7 : 6) ? [] : ['no Past you chip in the wide test'];
  return { keep, bad };
}"""
UNWIDE = """(k) => { const s = PS.G.s; Object.assign(s, { cash: k.cash, buffer: k.buffer, savings: k.savings, sink: k.sink, debt: k.debt }); if (s.goal) s.gpot = k.gpot; s.st.netByMonth = k.net; PS.G.past = k.past; PS.ui.hud(); }"""
END = """() => { PS.ui.close && PS.ui.close(); const s = PS.simYear('K7M3QX', 'swipeAll'); s.reasked = true; PS.G.s = s; PS.flow.end(); }"""
TEACHER = GAME.replace('index.html', 'teacher.html')
# the status bar's top row stays one row: buttons beside the month line, turn chip whole, nothing pushed down
HUDROW = """() => {
  const bad = [], m = document.getElementById('hudMonth'), b = document.getElementById('btnHelp'), mr = m.getBoundingClientRect(), r = b.getBoundingClientRect();
  if (Math.abs((mr.top + mr.bottom) / 2 - (r.top + r.bottom) / 2) > r.height / 2) bad.push('buttons not beside the month line');
  if (mr.height > r.height + 6) bad.push('month line on more than one row (' + Math.round(mr.height) + ' px)');
  m.querySelectorAll('b, .turn-chip').forEach((x) => { const q = x.getBoundingClientRect(); if (q.left < mr.left - 1 || q.right > mr.right + 1) bad.push(x.className || 'month' + ' cut'); });
  return bad;
}"""
TAGS = """() => { const s = PS.G.s, m = s.year[s.mi], keep = { trait: m.trait, late: m.late, pl: s.payLater };
  m.trait = 'friend'; m.late = true; s.payLater = 7800; PS.ui.hud(); return keep; }"""
UNTAGS = """(k) => { const s = PS.G.s, m = s.year[s.mi]; m.trait = k.trait; m.late = k.late; s.payLater = k.pl; PS.ui.hud(); }"""
# the month 1 guide line: whole, inside its line, not covered
GUIDE = """() => {
  const bad = [], line = document.getElementById('traitLine'), g = line && line.firstElementChild;
  if (!g || line.hidden) return ['no guide line in the month 1 lesson'];
  const r = g.getBoundingClientRect(), lr = line.getBoundingClientRect();
  if (r.top < lr.top - 1 || r.bottom > lr.bottom + 1 || line.scrollHeight > line.clientHeight + 2) bad.push('guide line cut');
  [[r.left + 4, r.top + 4], [r.left + r.width / 2, r.bottom - 4], [r.right - 4, r.bottom - 4]].forEach(([x, y]) => {
    const e = document.elementFromPoint(x, y); if (!e || !line.contains(e)) bad.push('guide line covered'); });
  return Array.from(new Set(bad));
}"""
# a "-600" note on every status box and every problem: where it stands it covers nothing a player reads, or it is left out
POPS = """() => { const bad = [];
  document.querySelectorAll('#hud .st, #foes .foe[data-i]').forEach((el) => {
    const p = PS.tutor.pop(el, '-' + PS.t('aed', { a: 1100 }), 'down');
    if (p) { PS.tutor.popCovers(p).forEach((x) => bad.push('note on ' + el.className.split(' ').slice(0, 2).join(' ') + ' covers ' + x)); p.remove(); }
  }); return bad; }"""
LIVEPOPS = """() => Array.from(document.querySelectorAll('.pop')).flatMap((p) => PS.tutor.popCovers(p).map((x) => 'note after the first card covers ' + x))"""
# windows policy play does not open: shown directly at this stop, then closed (the state is not changed)
PANELS = """(which) => {
  const s = PS.G.s, keep = { phase: PS.G.phase, dip: s.st.dipLoss, fund: s.fund };
  if (which === 'dip') { s.st.dipLoss = s.st.dipLoss || 180; s.fund = s.fund || 2900; }
  if (which === 'settings') PS.showSettings(); else if (which === 'help') PS.flow.help(); else PS.flow.dialog(which);
  return keep;
}"""
PANELBAD = """() => { const bad = [], p = document.getElementById('panel'), r = p.getBoundingClientRect();
  if (r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1) bad.push('window off screen');
  if (p.scrollWidth > p.clientWidth + 1) bad.push('window scrolls sideways');
  return bad; }"""
UNPANEL = """(k) => { PS.ui.close(); const s = PS.G.s; s.st.dipLoss = k.dip; s.fund = k.fund; PS.G.phase = k.phase; PS.ui.render(); }"""

MEASURE = """() => {
  const vw = innerWidth, vh = innerHeight, bad = [];
  const doc = document.documentElement;
  if (doc.scrollWidth > vw + 1) bad.push('page scrolls sideways ' + doc.scrollWidth);
  const hand = document.getElementById('hand'), hr = hand.getBoundingClientRect();
  if (hr.left < -1 || hr.right > vw + 1) bad.push('hand row off screen');
  const free = (el, x, y) => { const e = document.elementFromPoint(x, y); return e && (e === el || el.contains(e)); };
  const cards = Array.from(hand.querySelectorAll('.card'));
  cards.forEach((c, i) => {
    const r = c.getBoundingClientRect();
    if (r.top < -1 || r.bottom > vh + 1) bad.push('card ' + (i + 1) + ' off screen vertically (' + Math.round(r.top) + '-' + Math.round(r.bottom) + ')');
    const side = r.right > vw + 1 || r.left < -1;
    if (side && hand.scrollWidth <= hand.clientWidth + 1) bad.push('card ' + (i + 1) + ' off to the side with no scroll');
    if (!side && r.bottom <= vh && !free(c, r.left + r.width / 2, r.top + r.height / 2)) bad.push('card ' + (i + 1) + ' covered');
    if (c.scrollHeight > c.clientHeight + 2) bad.push('card ' + (i + 1) + ' text cut');
  });
  const foes = document.getElementById('foes'), fr = foes.getBoundingClientRect();
  const cut = (el) => el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2;
  const nFoes = foes.querySelectorAll('.foe').length;
  Array.from(foes.querySelectorAll('.foe')).forEach((f, i) => {
    if (cut(f)) bad.push('problem ' + (i + 1) + ' text cut');
    // on a laptop screen (1280x800) with the normal text size every problem card of the first row is whole in the problems
    // area: no scrolling to read a card (smaller screens and larger text scroll inside the area, by the space budget)
    const r = f.getBoundingClientRect(), normal = +(document.documentElement.dataset.fs || 1) === 1;
    if (vw >= 1000 && vh >= 780 && normal && r.top < fr.top + 40 && r.bottom > fr.bottom + 1) bad.push('problem ' + (i + 1) + ' cut by the problems area (' + Math.round(r.bottom - fr.bottom) + ' px)');
    // three or more problems (two now and one later this month) on a phone with the normal text size: the later one is a
    // strip and every problem is whole in the area, nothing to scroll to (the 6th judge saw the third card half cut)
    if (vw < 600 && vh >= 800 && normal && (r.top < fr.top - 1 || r.bottom > fr.bottom + 1)) bad.push('problem ' + (i + 1) + ' of ' + nFoes + ' cut by the problems area on a phone (' + Math.round(r.bottom - fr.bottom) + ' px)');
    f.querySelectorAll('.foe-name, .amt, .minl, .kind, .pull').forEach((el) => { if (cut(el)) bad.push('problem ' + (i + 1) + ' ' + el.className + ' cut'); });
  });
  const tg = foes.querySelector('.foe.sel'), line = document.getElementById('foeLine');
  if (tg) {
    const it = tg.querySelector('.intent > span');
    if (!line) bad.push('no forecast line for the target');
    else {
      const lr = line.getBoundingClientRect();
      if (line.querySelector('.fl-t').textContent !== it.textContent) bad.push('forecast line differs from the target');
      if (cut(line)) bad.push('forecast line cut');
      if (lr.top < -1 || lr.bottom > vh + 1) bad.push('forecast line out of view');
      else if (!free(line, lr.left + lr.width / 2, lr.top + lr.height / 2)) bad.push('forecast line covered');
      // the line must not lie over any problem card (the 5th judge saw it cover the bottom of a card at 1280x800)
      if (foes.contains(line)) bad.push('forecast line inside the problems area');
      Array.from(foes.querySelectorAll('.foe')).forEach((f, i) => {
        const r = f.getBoundingClientRect(), top = Math.max(r.top, fr.top), bot = Math.min(r.bottom, fr.bottom);
        if (bot > top && lr.top < bot - 1 && lr.bottom > top + 1 && lr.left < r.right && lr.right > r.left) bad.push('forecast line over problem ' + (i + 1));
      });
    }
  }
  // every problem in view on screens 600 px tall or more; below that (390x560) the area may scroll, but the first problem
  // is whole and the area shows its fade cue (css/battle.css .more)
  const kp = PS.ui.foeProblems();
  if (vh >= 600) kp.forEach((x) => bad.push('key information: ' + x));
  else { kp.filter((x) => /^problem 1 /.test(x)).forEach((x) => bad.push('key information: ' + x));
    if (kp.length && !foes.classList.contains('more')) bad.push('problems scroll with no fade cue'); }
  const b = document.getElementById('btnEnd'), br = b.getBoundingClientRect();
  if (br.top < 0 || br.bottom > vh + 1 || br.left < -1 || br.right > vw + 1) bad.push('End turn off screen');
  else if (!free(b, br.left + br.width / 2, br.top + br.height / 2)) bad.push('End turn covered');
  return { bad, cards: cards.length, foes: nFoes, foesH: Math.round(foes.getBoundingClientRect().height), handH: Math.round(hr.height),
    scrollY: Math.round(scrollY), pageH: doc.scrollHeight };
}"""


def main():
    shots = '--shots' in sys.argv
    only = [a.split('=')[1] for a in sys.argv if a.startswith('--only=')]  # e.g. --only=360x640 while fixing one size
    views = [v for v in VIEWS if not only or '%dx%d' % v in only[0].split(',')]
    out, errors, fails = [], [], []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, headless=True)
        for (w, h) in views:
            for (fs, fsn) in SIZES:
                for lang in LANGS:
                    ctx = b.new_context(viewport={'width': w, 'height': h})
                    pg = ctx.new_page()
                    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
                    pg.on('pageerror', lambda e: errors.append(str(e)))
                    pg.goto(GAME + '?lang=' + lang + '&code=K7M3QX')
                    pg.wait_for_timeout(250)
                    pg.evaluate('(fs) => { PS.settings.size = fs; PS.settings.music = false; PS.settings.sound = false; PS.applySettings(); }', fs)
                    tag = '%dx%d_%s_%s' % (w, h, fsn, lang)
                    if pg.evaluate('() => document.documentElement.scrollWidth > innerWidth + 1'):
                        fails.append(tag + ' title: page scrolls sideways')
                    pg.evaluate("() => document.getElementById('titlePeek').scrollIntoView({ block: 'center' })")
                    tm = pg.evaluate(TITLE)
                    out.append({'view': tag, 'title_fit': tm['fit']})
                    for x in tm['bad']:
                        fails.append(tag + ' title preview: ' + x)
                    pg.evaluate('() => window.scrollTo(0, 0)')
                    pg.click('#btnPlay')
                    for mi in STOP_MONTHS:
                        for _ in range(400):  # play steady until this month's battle is on screen at turn 1
                            st = pg.evaluate('() => ({ mi: PS.G.s.mi, turn: PS.G.s.turn, modal: !document.getElementById("modal").hidden, phase: PS.G.phase })')
                            if st['mi'] == mi and st['turn'] == 0 and not st['modal'] and st['phase'] == 'battle':
                                break
                            if st['mi'] == mi and st['modal'] and pg.evaluate('() => document.getElementById("panel").dataset.kind') == 'intro':
                                pg.click('[data-act=go]')
                                continue
                            pg.evaluate(STEP, 'steady')
                        pg.evaluate('() => window.scrollTo(0, 0)')
                        pg.wait_for_timeout(120)
                        m = pg.evaluate(MEASURE)
                        m['bad'] += ['status bar: ' + x for x in pg.evaluate(ROWS, ['#hudStats'])]
                        m['bad'] += ['spill: ' + x for x in pg.evaluate(SPILL, BOXES)]
                        m['bad'] += ['status bar top: ' + x for x in pg.evaluate(HUDROW)]
                        if lang == 'ar':
                            m['bad'] += ['arabic: ' + x for x in pg.evaluate(RTL, 'body')]
                        m['bad'] += pg.evaluate(POPS)
                        v12 = shots and (fsn == 'a2' or (w, h) == (390, 844))
                        if v12:
                            pg.screenshot(path=os.path.join(SHOTS, 'v12_m%d_%s.png' % (mi + 1, tag)))
                        if mi == 0:  # the lesson: its guide line, then the first glowing card played for real and its notes
                            m['bad'] += pg.evaluate(GUIDE)
                            if pg.locator('#hand .card.glow').count():
                                pg.click('#hand .card.glow')
                                pg.wait_for_timeout(90)
                                if v12:
                                    pg.screenshot(path=os.path.join(SHOTS, 'v12_note_%s.png' % tag))
                                m['bad'] += pg.evaluate(LIVEPOPS)
                                pg.wait_for_timeout(800)
                        if mi == STOP_MONTHS[-1]:  # the longest month tags, then the windows policy play does not open
                            keep = pg.evaluate(TAGS)
                            pg.wait_for_timeout(60)
                            m['bad'] += ['status bar top, longest tags: ' + x for x in pg.evaluate(HUDROW)]
                            if v12 and fsn == 'a':
                                pg.screenshot(path=os.path.join(SHOTS, 'v12_tags_%s.png' % tag), clip={'x': 0, 'y': 0, 'width': w, 'height': min(h, 240)})
                            pg.evaluate(UNTAGS, keep)
                            for which in ['friend', 'dip', 'settings', 'help']:
                                keep = pg.evaluate(PANELS, which)
                                pg.wait_for_timeout(80)
                                pb = pg.evaluate(PANELBAD) + pg.evaluate(SPILL, BOXES[2:]) + pg.evaluate(ROWS, ['#panel .seg'])
                                if lang == 'ar':
                                    pb += pg.evaluate(RTL, '#panel')
                                m['bad'] += [which + ' window: ' + x for x in pb]
                                if v12 and which in ('friend', 'settings'):
                                    pg.screenshot(path=os.path.join(SHOTS, 'v12_%s_%s.png' % (which, tag)))
                                pg.evaluate(UNPANEL, keep)
                                pg.wait_for_timeout(40)
                        if mi == STOP_MONTHS[-1]:
                            wide = pg.evaluate(WIDE)
                            pg.wait_for_timeout(60)
                            m['bad'] += wide['bad'] + ['wide status bar: ' + x for x in pg.evaluate(ROWS, ['#hudStats'])]
                            if shots and (fsn == 'a2' or (w, h) == (390, 844)):
                                pg.screenshot(path=os.path.join(SHOTS, 'v9_hud_wide_%s.png' % tag), clip={'x': 0, 'y': 0, 'width': w, 'height': min(h, 220)})
                            pg.evaluate(UNWIDE, wide['keep'])
                            pg.wait_for_timeout(60)
                        if mi == 3 and m['foes'] < 3:  # month 4 is the 3+ problems stop (two now, one later)
                            m['bad'].append('month 4 has %d problems, the 3+ problems case is not tested' % m['foes'])
                        m.update({'view': tag, 'month': mi + 1})
                        out.append(m)
                        for x in m['bad']:
                            fails.append(tag + ' m' + str(mi + 1) + ': ' + x)
                        if shots and (fsn != 'a1' or (w, h) == (390, 844)):
                            pg.screenshot(path=os.path.join(SHOTS, 'v6_m%d_%s.png' % (mi + 1, tag)))
                    # the end screen and the result card after a year
                    pg.evaluate(INSTALL, POL)
                    pg.evaluate(END)
                    pg.wait_for_timeout(200)
                    for sel in ['#end .kpis', '#end .rc-nums']:
                        pg.evaluate('(s) => document.querySelector(s).scrollIntoView({ block: "center" })', sel)
                        pg.wait_for_timeout(60)
                        for x in pg.evaluate(ROWS, [sel]):
                            fails.append(tag + ' end: ' + x)
                        if shots and fsn == 'a2' and (w, h) == (360, 640):
                            pg.screenshot(path=os.path.join(SHOTS, 'v9_%s_%s.png' % ('kpis' if 'kpis' in sel else 'rcnums', tag)))
                    # what to press is near the top: copy the result and play again right under the four numbers; Arabic
                    # comparison bars fill from the right like the zakat bar
                    pg.evaluate('() => window.scrollTo(0, 0)')
                    pg.wait_for_timeout(60)
                    eb = pg.evaluate("""(lim) => { const b = document.getElementById('btnCopyTop'), k = document.querySelector('#end .kpis'), bad = [];
                      if (!b || b.closest('.row').previousElementSibling !== k) return ['no copy and play again row under the four numbers'];
                      if (b.getBoundingClientRect().bottom > innerHeight * lim) bad.push('copy result not near the top (' + Math.round(b.getBoundingClientRect().bottom) + ' px)');
                      if (document.documentElement.dir === 'rtl') document.querySelectorAll('#end .cbar i, #end .zbar i').forEach((i) => {
                        const r = i.getBoundingClientRect(), o = i.parentElement.getBoundingClientRect(); if (r.width > 2 && Math.abs(r.right - o.right) > 2) bad.push('a bar fills from the left in Arabic'); });
                      return Array.from(new Set(bad)); }""", 1 if w >= 1000 else 1.8)
                    if lang == 'ar':
                        eb += ['arabic: ' + x for x in pg.evaluate(RTL, '#end')]
                    for x in eb:
                        fails.append(tag + ' end: ' + x)
                    if shots and fsn != 'a1' and (w, h) in ((1280, 800), (390, 844), (360, 640)):
                        pg.screenshot(path=os.path.join(SHOTS, 'v12_end_%s.png' % tag))
                    # the teacher dashboard (it has no text size setting of its own: the size is set the same way to test it)
                    pg.goto(TEACHER + '?lang=' + lang)
                    pg.evaluate('(fs) => document.documentElement.style.setProperty("--fs", fs)', fs)
                    pg.click('#tcSample')
                    pg.wait_for_timeout(200)
                    pg.evaluate('() => document.querySelector(".tc-kpis").scrollIntoView({ block: "center" })')
                    for x in pg.evaluate(ROWS, ['.tc-kpis']):
                        fails.append(tag + ' teacher: ' + x)
                    if shots and fsn == 'a2' and (w, h) == (360, 640):
                        pg.screenshot(path=os.path.join(SHOTS, 'v9_teacher_%s.png' % tag))
                    # the sample tag, the year preview, the five questions: nothing spills, Arabic reads the right way
                    pg.fill('#tcYrCode', 'K7M3QX')
                    pg.click('#tcYrShow')
                    pg.wait_for_timeout(80)
                    tb = pg.evaluate(SPILL, ['.tc-sample', '.tc-kpi', '.tc-dc', '.tc-core li', '.tc-year td', '.tc-year th'])
                    tb += pg.evaluate("() => { const t = document.querySelector('.tc-year'); return !t ? ['no year preview'] : t.querySelectorAll('tbody tr').length !== 12 ? ['year preview is not 12 months'] : []; }")
                    tb += pg.evaluate("() => document.querySelectorAll('.tc-core > li').length === 5 && document.querySelector('.tc-core .tc-ans') ? [] : ['not five questions with answers']")
                    if lang == 'ar':
                        tb += ['arabic: ' + x for x in pg.evaluate(RTL, '#tcMain')]
                    # the whole dashboard: new PS2 and older PS1 codes mixed with a broken line and a second class code (error
                    # list, class picker, goal and level tables, every row), then the pilot results page; percents read 50%
                    pg.evaluate('''() => { const c = PS.SAMPLE_CODES, old = PS.cls.packCode(PS.cls.readCode(c[1]).v, 'PS1');
                      const other = PS.cls.packCode(Object.assign({}, PS.cls.readCode(c[2]).v, { cls: 'K7M3QX' }));
                      document.getElementById('tcIn').value = c.slice(2).concat([old, 'PS2-SAMPLE-AAAAA', other]).join('\\n'); }''')
                    pg.click('#tcShow')
                    pg.wait_for_timeout(80)
                    pg.select_option('#tcCls', '*')
                    pg.wait_for_timeout(60)
                    pg.click('#tcPiSheet')
                    pg.wait_for_timeout(80)
                    tb += pg.evaluate(SPILL, ['.tc-goals th', '.tc-goals td', '.tc-errs li', '.tc-kpi', '.ps-kpis .tc-kpi'])
                    tb += pg.evaluate('''() => { const b = []; if (!document.querySelector('#tcOut .tc-goals')) b.push('no goal table');
                      if (!document.querySelector('#tcPilotSheet .tc-goals')) b.push('no goal table on the pilot page');
                      const heads = Array.from(document.querySelectorAll('.tc-list thead th')).map((h) => h.textContent);
                      if (heads.indexOf(PS.plain(PS.t('tc.th.goal'))) < 0 || heads.indexOf(PS.plain(PS.t('tc.th.lv'))) < 0) b.push('no goal or level column');
                      if (!/PS1/.test(document.getElementById('tcOut').textContent) && !document.body.textContent.includes(PS.plain(PS.t('tc.gl.old')))) b.push('older code not shown');
                      return b; }''')
                    if lang == 'ar':
                        tb += ['arabic (whole dashboard): ' + x for x in pg.evaluate(RTL, 'body')]
                    if shots and (w, h, fsn) in ((390, 844, 'a'), (1280, 800, 'a')):
                        pg.evaluate('() => document.querySelector("#tcOut .tc-goals").scrollIntoView({ block: "start" })')
                        pg.screenshot(path=os.path.join(SHOTS, 'v16_goals_%s.png' % tag))
                        pg.evaluate('() => document.querySelector("#tcPilotSheet .ps-kpis").scrollIntoView({ block: "start" })')
                        pg.screenshot(path=os.path.join(SHOTS, 'v16_sheet_%s.png' % tag))
                        pg.evaluate('() => document.querySelector(".tc-list").scrollIntoView({ block: "start" })')
                        pg.screenshot(path=os.path.join(SHOTS, 'v16_list_%s.png' % tag))
                    pg.click('#psClose')
                    if shots and (w, h) in ((1280, 800), (390, 844)) and fsn == 'a':
                        pg.evaluate('() => document.querySelector(".tc-sample").scrollIntoView({ block: "start" })')
                        pg.screenshot(path=os.path.join(SHOTS, 'v12_teacher_%s.png' % tag))
                        pg.evaluate('() => document.querySelector(".tc-plan").scrollIntoView({ block: "start" })')
                        pg.screenshot(path=os.path.join(SHOTS, 'v12_year_%s.png' % tag))
                        pg.evaluate('() => document.querySelector(".tc-qs").scrollIntoView({ block: "start" })')
                        pg.screenshot(path=os.path.join(SHOTS, 'v12_questions_%s.png' % tag))
                    if (w, h, fsn) == (1280, 800, 'a'):  # printed on A4: every table inside its card
                        pg.emulate_media(media='print')
                        pg.set_viewport_size({'width': 718, 'height': 1040})  # A4 less 12 mm margins, at 96 dpi
                        pg.wait_for_timeout(120)
                        tb += ['print: ' + x for x in pg.evaluate("""() => { const bad = [];
                          document.querySelectorAll('.tc-card').forEach((c) => { const cr = c.getBoundingClientRect(); c.querySelectorAll('table').forEach((tb) => {
                            const r = tb.getBoundingClientRect(); if (r.right > cr.right + 1 || r.left < cr.left - 1) bad.push((c.querySelector('h2') || {}).textContent + ': table wider than its card'); }); });
                          if (document.documentElement.scrollWidth > innerWidth + 1) bad.push('page wider than the paper'); return bad; }""")]
                        if shots:
                            pg.evaluate('() => document.querySelector(".tc-list").scrollIntoView({ block: "start" })')
                            pg.screenshot(path=os.path.join(SHOTS, 'v12_print_%s.png' % lang))
                        pg.emulate_media(media='screen')
                    for x in tb:
                        fails.append(tag + ' teacher: ' + x)
                    ctx.close()
        b.close()
    res = {'combos': len(views) * len(SIZES) * len(LANGS), 'stops': len(out), 'fails': fails, 'console_errors': errors}
    with open(os.path.join(ROOT, 'tools', 'layout_check.json'), 'w') as f:
        json.dump(res, f, indent=1)
    print(json.dumps({'combos': res['combos'], 'stops': res['stops'], 'fails': len(fails), 'first': fails[:8], 'console_errors': len(errors)}))


if __name__ == '__main__':
    main()
