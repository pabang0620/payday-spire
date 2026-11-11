"""v3 screenshots and checks for the class tools: shots/v3_*.png (desktop 1280x800, phone 390x844, Arabic), plus
- a played year's result code pasted into teacher.html is read back with the same numbers (and the sample class loads),
- Past you shows on a second run of the same code, the partner theme on ?brand=demo-bank,
- phone at A++ text has no sideways scroll, captions sit in their own line, console errors stay 0.
Usage: python3 tools/shots_v3.py   (prints one JSON line)"""
import os, json
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = os.path.expanduser('~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome')
GAME = 'file://' + os.path.join(ROOT, 'index.html')
TEACHER = 'file://' + os.path.join(ROOT, 'teacher.html')
SHOTS = os.path.join(ROOT, 'shots')

# one step of a year through the real buttons, choices from js/policy.js (same as tools/playtest.py)
STEP = """(pol) => {
  const P = PS.POLICY[pol], s = PS.G.s, m = document.getElementById('modal');
  const click = (sel) => { const b = document.querySelector(sel); if (b) b.click(); return !!b; };
  if (PS.G.phase === 'end') return 'end';
  if (!m.hidden) {
    const kind = document.getElementById('panel').dataset.kind;
    if (kind === 'check') { const o = document.querySelector('#panel .opts'); const q = PS.check.Q[o.dataset.n][o.dataset.phase];
      return click(pol === 'idle' ? '#qSkip' : '[data-q=' + (pol === 'steady' ? q.right : 'a') + ']') && kind; }
    if (kind === 'dialog') return click('[data-act=dlg][data-id=' + P.dialog(s, PS.G.dlgKind) + ']') && kind;
    if (kind === 'settle') return (click('[data-act=left][data-id=' + P.left(s) + ']') || click('[data-act=next]')) && kind;
    if (kind === 'reward') { const id = P.reward(s, PS.G.offers); return click(id ? '[data-act=take][data-id=' + id + ']' : '[data-act=take]:not([data-id])') && kind; }
    if (kind === 'shop') { const a = P.shop(s); return click(!a ? '[data-act=leave]' : a.type === 'course' ? '[data-act=course]' : '[data-act=remove][data-id=' + a.id + ']') && kind; }
    if (kind === 'intro') return click('[data-act=go]') && kind;
    return click('#panel button') && kind;
  }
  const a = P.turn(s);
  if (a) { if (a.t >= 0) { const f = document.querySelector('#foes [data-i="' + a.t + '"]'); if (f) f.click(); } click('#hand [data-h="' + a.h + '"]'); return 'card'; }
  click('#btnEnd'); return 'end turn';
}"""


def main():
    out, errors = {}, []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, headless=True)

        def page(w, h, url):
            ctx = b.new_context(viewport={'width': w, 'height': h})
            pg = ctx.new_page()
            pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.goto(url)
            pg.wait_for_timeout(300)
            return ctx, pg

        def shot(pg, name, full=False):
            pg.wait_for_timeout(200)
            pg.screenshot(path=os.path.join(SHOTS, 'v3_' + name + '.png'), full_page=full)

        def play(pg, pol, stop=None):
            for _ in range(3000):
                if stop and stop(pg):
                    return
                if pg.evaluate(STEP, pol) == 'end':
                    return

        def start(pg, code):
            pg.fill('#code', code)
            pg.click('#btnPlay')
            pg.wait_for_timeout(200)

        at = lambda mi, kind=None: (lambda pg: pg.evaluate('PS.G.s.mi') == mi and (kind is None or pg.evaluate(
            "document.getElementById('modal').hidden ? PS.G.phase : document.getElementById('panel').dataset.kind") == kind))

        # ---- desktop English: title, month 1, quick guess, end, cards; then the same code again for Past you ----
        ctx, pg = page(1280, 800, GAME + '?lang=en')
        shot(pg, 'd_title')
        start(pg, 'K7M3QX')
        shot(pg, 'd_intro_m1')
        pg.click('[data-act=go]')
        pg.click('#hand [data-h="0"]')
        shot(pg, 'd_battle_m1_caption')
        out['caption_in_hud'] = pg.evaluate("document.getElementById('capH').classList.contains('on')")
        play(pg, 'steady', at(0, 'check'))
        shot(pg, 'd_check_m1')
        play(pg, 'steady')
        shot(pg, 'd_end')
        shot(pg, 'd_end_full', True)
        code1 = pg.inner_text('#rcRcode')
        copied = pg.evaluate('PS.cls.text(PS.G.s)')
        out['end_net'] = pg.evaluate('PS.E.netWorth(PS.G.s)')
        pg.click('#rcCards')
        shot(pg, 'd_cards')
        pg.click('#dcClose')
        pg.click('#btnSame')
        play(pg, 'impulse', at(1, 'battle'))
        out['past_chip'] = pg.inner_text('.st-past') if pg.query_selector('.st-past') else None
        shot(pg, 'd_past_hud_m2')
        play(pg, 'impulse', at(1, 'settle'))
        play(pg, 'impulse', lambda q: q.query_selector('#panel [data-act=next]') is not None)
        out['past_line'] = pg.evaluate("Array.from(document.querySelectorAll('#panel .lines li')).map(l => l.textContent).filter(x => x.indexOf('Past you') >= 0)[0] || null")
        shot(pg, 'd_past_settle_m2')
        play(pg, 'impulse')
        out['past_end'] = pg.inner_text('.past-end') if pg.query_selector('.past-end') else None
        shot(pg, 'd_past_end_full', True)
        code2 = pg.inner_text('#rcRcode')
        ctx.close()

        # ---- teacher dashboard: a played result (the whole copied text) and the sample class ----
        ctx, pg = page(1280, 800, TEACHER + '?lang=en')
        pg.fill('#tcIn', copied + '\n' + code2 + '\nhello\n' + code1)
        pg.click('#tcShow')
        pg.wait_for_timeout(200)
        out['teacher_status'] = pg.inner_text('#tcStatus')
        out['teacher_row_net'] = pg.evaluate("Array.from(document.querySelectorAll('.tc-list tbody tr')).map(r => r.children[2].textContent)")
        shot(pg, 'd_teacher_real', True)
        pg.click('#tcSample')
        pg.wait_for_timeout(200)
        out['sample_status'] = pg.inner_text('#tcStatus')
        out['sample_topics'] = pg.evaluate("Array.from(document.querySelectorAll('.tc-dc h3')).map(h => h.textContent)")
        shot(pg, 'd_teacher_sample')
        shot(pg, 'd_teacher_sample_full', True)
        ctx.close()

        # ---- partner theme ----
        ctx, pg = page(1280, 800, GAME + '?brand=demo-bank&lang=en')
        shot(pg, 'd_brand_title')
        start(pg, 'CLASS7')
        pg.click('[data-act=go]')
        shot(pg, 'd_brand_battle')
        ctx.close()

        # ---- phone English, and A++ text ----
        ctx, pg = page(390, 844, GAME + '?lang=en')
        start(pg, 'CLASS7')
        pg.click('[data-act=go]')
        pg.click('#hand [data-h="0"]')
        shot(pg, 'p_battle_m1')
        pg.evaluate("() => { PS.settings.size = 1.4; PS.applySettings(); }")
        out['phone_xl_overflow'] = pg.evaluate('document.documentElement.scrollWidth - window.innerWidth')
        shot(pg, 'p_battle_m1_xl')
        pg.evaluate("() => { PS.settings.size = 1; PS.applySettings(); }")
        play(pg, 'steady', at(0, 'check'))
        shot(pg, 'p_check_m1')
        play(pg, 'impulse')
        shot(pg, 'p_end')
        ctx.close()

        # ---- Arabic desktop and phone ----
        for view, (w, h) in (('ar', (1280, 800)), ('arp', (390, 844))):
            ctx, pg = page(w, h, GAME + '?lang=ar')
            start(pg, 'CLASS7')
            pg.click('[data-act=go]')
            pg.click('#hand [data-h="0"]')
            shot(pg, view + '_battle_m1')
            play(pg, 'steady', at(0, 'check'))
            shot(pg, view + '_check_m1')
            play(pg, 'steady', at(6, 'battle'))
            shot(pg, view + '_battle_m7')
            play(pg, 'steady', at(9, 'dialog'))
            shot(pg, view + '_friend_m10')
            play(pg, 'steady')
            shot(pg, view + '_end_full', True)
            pg.click('#rcCards')
            shot(pg, view + '_cards')
            out[view + '_overflow'] = pg.evaluate('document.documentElement.scrollWidth - window.innerWidth')
            ctx.close()
        ctx, pg = page(390, 844, TEACHER + '?lang=ar')
        pg.click('#tcSample')
        shot(pg, 'arp_teacher_sample_full', True)
        out['arp_teacher_overflow'] = pg.evaluate('document.documentElement.scrollWidth - window.innerWidth')
        ctx.close()
        b.close()
    out['console_errors'] = errors
    print(json.dumps(out, ensure_ascii=False))


main()
