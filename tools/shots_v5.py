"""v5 screenshots and checks: shots/v5_*.png (desktop 1280x800, phone 390x844, Arabic). Same walk as shots_v4.py, plus the
game's own art (art_b/): every picture on screen must come from art_b/ (the shared art/ set with the jars is never shown),
enemy portraits and card frames are in place, and the end screen's emergency fund months match the result card. Also
- a played year's result code pasted into teacher.html is read back with the same numbers (and the sample class loads),
- Past you shows on a second run of the same code, the partner theme on ?brand=demo-bank,
- phone at A++ text has no sideways scroll, captions sit in their own line, console errors stay 0.
Usage: python3 tools/shots_v5.py   (prints one JSON line)"""
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
    if (kind === 'settle') return (click('[data-act=left][data-id=' + P.left(s) + ']') || click('[data-act=left]')) && kind;
    if (kind === 'reward') {
      const a = PS.SHOP_AFTER.indexOf(s.mi) >= 0 ? P.shop(s) : null;
      if (a) return click(a.type === 'course' ? '[data-act=course]' : '[data-act=remove][data-id=' + a.id + ']') && kind;
      const id = P.reward(s, PS.G.offers); return click(id ? '[data-act=take][data-id=' + id + ']' : '[data-act=take]:not([data-id])') && kind; }
    if (kind === 'intro') return click('[data-act=go]') && kind;
    return click('#panel button') && kind;
  }
  const a = P.turn(s);
  if (a) { if (a.t >= 0) { const f = document.querySelector('#foes [data-i="' + a.t + '"]'); if (f) f.click(); } click('#hand [data-h="' + a.h + '"]'); return 'card'; }
  click('#btnEnd'); return 'end turn';
}"""


# steady habits but no emergency fund (same as tools/regress.js noBuffer)
NOBUF = """() => { const P = window.PS && PS.POLICY; if (!P) return; P.noBuffer = Object.assign({}, P.steady, {
  turn(s) { const a = P.steady.turn(s); return a && s.hand[a.h].id === 'buffer' ? null : a; }, left: () => 'save' }); }"""


# every picture in use (img src and CSS background and border images): paths outside art_b/ are listed
ART = """() => { const seen = new Set();
  document.querySelectorAll('*').forEach((e) => { if (e.tagName === 'IMG') seen.add(e.getAttribute('src'));
    const cs = getComputedStyle(e); [cs.backgroundImage, cs.borderImageSource].forEach((v) => { (v.match(/url\\("?([^")]+)"?\\)/g) || []).forEach((u) => seen.add(u)); }); });
  const all = Array.from(seen).filter(Boolean);
  return { n: all.length, outside: all.filter((u) => u.indexOf('art_b/') < 0), portraits: document.querySelectorAll('.foe-art img').length,
    framed: document.querySelectorAll('.framed #hand .card').length }; }"""


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
            pg.evaluate(NOBUF)
            return ctx, pg

        def shot(pg, name, full=False):
            pg.wait_for_timeout(200)
            pg.screenshot(path=os.path.join(SHOTS, 'v5_' + name + '.png'), full_page=full)

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
        out['art_title'] = pg.evaluate(ART)
        start(pg, 'K7M3QX')
        shot(pg, 'd_intro_m1')
        pg.click('[data-act=go]')
        shot(pg, 'd_battle_m1')
        pg.click('#hand [data-h="0"]')
        shot(pg, 'd_battle_m1_caption')
        out['caption_in_hud'] = pg.evaluate("document.getElementById('capH').classList.contains('on')")
        play(pg, 'steady', at(0, 'check'))
        shot(pg, 'd_check_m1')
        play(pg, 'steady', at(0, 'reward'))
        shot(pg, 'd_reward_m1')
        play(pg, 'steady', at(1, 'battle'))
        shot(pg, 'd_battle_m2_cardbill')
        out['art_m2'] = pg.evaluate(ART)
        out['m2_cardbill'] = pg.evaluate("!!document.querySelector('#foes .k-card')")
        out['m2_coming'] = pg.evaluate("document.querySelectorAll('#foes .foe.coming').length")
        play(pg, 'steady', at(2, 'battle'))
        play(pg, 'steady', lambda q: at(2, 'battle')(q) and q.evaluate('PS.G.s.turn') == 2)
        shot(pg, 'd_battle_m3_t3')
        out['m3_t3_foes'] = pg.evaluate("Array.from(document.querySelectorAll('#foes .foe-name')).map(e => e.textContent)")
        play(pg, 'steady', at(2, 'reward'))
        shot(pg, 'd_reward_shop_m3')
        play(pg, 'steady', at(7, 'intro'))
        shot(pg, 'd_intro_m8_late')
        pg.click('[data-act=go]')
        play(pg, 'steady', at(7, 'battle'))
        shot(pg, 'd_battle_m8_late')
        play(pg, 'steady')
        shot(pg, 'd_end')
        shot(pg, 'd_end_full', True)
        out['art_end'] = pg.evaluate(ART)
        out['end_months_match'] = pg.evaluate("(() => { const k = Array.from(document.querySelectorAll('.kpis b')).map(b => b.textContent)[2]; const r = document.body.innerText; return [k, (r.match(/[0-9.]+ months? of costs/g) || []).join(' / ')]; })()")
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
        play(pg, 'impulse', at(1, 'reward'))
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

        # ---- the same code with no emergency fund: the end screen names the late salary and the breakdown ----
        ctx, pg = page(1280, 800, GAME + '?lang=en')
        start(pg, 'K7M3QX')
        play(pg, 'noBuffer')
        out['nobuf_why'] = pg.evaluate("Array.from(document.querySelectorAll('#end .why li')).map(l => l.textContent)")
        shot(pg, 'd_end_nobuffer_full', True)
        ctx.close()

        # ---- phone English, and A++ text ----
        ctx, pg = page(390, 844, GAME + '?lang=en')
        start(pg, 'CLASS7')
        pg.click('[data-act=go]')
        pg.click('#hand [data-h="0"]')
        shot(pg, 'p_battle_m1')
        out['art_phone_m1'] = pg.evaluate(ART)
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
            play(pg, 'steady', at(7, 'intro'))
            shot(pg, view + '_intro_m8_late')
            pg.click('[data-act=go]')
            play(pg, 'steady', at(7, 'battle'))
            pg.evaluate("PS.audio.play('save')")
            shot(pg, view + '_battle_m8_caption')
            out[view + '_cap_cut'] = pg.evaluate("(() => { const c = document.getElementById('capH'); return c.scrollWidth > c.clientWidth + 1 || c.scrollHeight > c.clientHeight + 1; })()")
            play(pg, 'steady', at(9, 'dialog'))
            shot(pg, view + '_friend_m10')
            play(pg, 'steady')
            shot(pg, view + '_end_full', True)
            out['art_' + view + '_end'] = pg.evaluate(ART)
            # the amount next to each comparison bar stays on one line (number and the currency word together)
            out[view + '_cv_lines'] = pg.evaluate("Array.from(document.querySelectorAll('.cv > b')).map(b => { const r = document.createRange(); r.selectNodeContents(b); return new Set(Array.from(r.getClientRects()).map(x => Math.round(x.top))).size; })")
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
