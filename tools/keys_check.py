"""Keyboard-only check: start a year and play month 1 with keys only (Tab/Enter/1-9/E), then open Settings with Tab.
Usage: python3 tools/keys_check.py"""
import os, json
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = os.path.expanduser('~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome')
errors = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME)
    pg = b.new_page(viewport={'width': 1280, 'height': 800})
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto('file://' + os.path.join(ROOT, 'index.html'))
    pg.wait_for_timeout(300)
    first = pg.evaluate('document.activeElement.id')
    pg.keyboard.press('Enter')          # Start my year (focused on load)
    pg.wait_for_timeout(200)
    if pg.evaluate("!document.getElementById('modal').hidden"):
        pg.keyboard.press('Enter')      # Start the month (a second run; a first-time player goes straight to the battle)
    for k in ['1', '1', 'E', '1', 'E', 'E']:
        pg.keyboard.press(k); pg.wait_for_timeout(80)
    kind = pg.evaluate("document.getElementById('panel').dataset.kind")
    pg.keyboard.press('Enter')          # first option on the statement / leftover / summary
    pg.wait_for_timeout(100)
    tabs_stay = pg.evaluate("""() => { const p = document.getElementById('modal'); return !p.hidden && p.contains(document.activeElement); }""")
    out = {'focused_on_load': first, 'after_month1_panel': kind, 'focus_trapped_in_dialog': tabs_stay,
           'month1_late_fees': pg.evaluate('PS.G.s.st.lateFees'), 'errors': errors}
    b.close()
print(json.dumps(out))
