"""v11 screenshots of the 6th round of fixes, English and Arabic, desktop (1280x800) and phone (390x844):
  why     a year with one card bill not paid in full and a breakdown that found the emergency fund empty (HZES4U, steady
          habits): the reasons say "One card bill ... the whole bill" and why the fund was empty, the lesson box says
          "one card bill" (count rule in PS.t), shots/v11_why_*.png and v11_lesson_*.png
  foes    month 4 battle with three problems (two now, one later this month): on a phone the later one is a strip and all
          three are whole; the Pay from cash card names a bill, breakdown or card bill (v11_foes_*.png)
  sale    month 3 of GULF26: a sale that adds one Impulse buy ("an Impulse buy" / "شراءً اندفاعيًا واحدًا"), v11_sale_*.png
Prints one JSON line with the console errors (should be 0).
Usage: python3 tools/shots_v11.py"""
import os, json
from playwright.sync_api import sync_playwright
from shots_v8 import page, to_month, SHOTS, CHROME, POL, INSTALL

VIEWS = [('desktop', 1280, 800), ('phone', 390, 844)]
END = "() => { const s = PS.simYear('HZES4U', 'steady'); s.reasked = true; PS.G.s = s; PS.flow.end(); }"
SCROLL = '(sel) => { const y = document.querySelector(sel).getBoundingClientRect().top + scrollY; window.scrollTo(0, y - document.getElementById("hud").offsetHeight - 50); }'


def main():
    errors = []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, headless=True)
        for lang in ['en', 'ar']:
            for name, w, h in VIEWS:
                tag = lang + '_' + name
                pg = page(b, w, h, lang, 1, '', errors)
                pg.evaluate(INSTALL, POL)
                pg.evaluate(END)
                pg.wait_for_timeout(300)
                for part, sel in [('why', '#end ol.why'), ('lesson', '#end .ba')]:
                    pg.evaluate(SCROLL, sel)
                    pg.wait_for_timeout(150)
                    pg.screenshot(path=os.path.join(SHOTS, 'v11_%s_%s.png' % (part, tag)))
                pg.close()
                pg = page(b, w, h, lang, 1, '&code=K7M3QX&tut=0', errors)
                to_month(pg, 3)
                pg.screenshot(path=os.path.join(SHOTS, 'v11_foes_' + tag + '.png'))
                pg.close()
                pg = page(b, w, h, lang, 1, '&code=GULF26&tut=0', errors)
                to_month(pg, 2)
                pg.screenshot(path=os.path.join(SHOTS, 'v11_sale_' + tag + '.png'))
                pg.close()
        b.close()
    print(json.dumps({'console_errors': errors}))


if __name__ == '__main__':
    main()
