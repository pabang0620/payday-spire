"""Submission zip: dist/PaydaySpire.zip with only what the game needs to run:
index.html, teacher.html, css/, js/, and the art_b/ pictures listed in art_b/manifest.js (plus manifest.js itself).
Left out: art/ (an older shared set), contact sheets, review/, video/, tools/, shots/, the documents.
Then the zip is checked: the file list, every script, style sheet and picture the pages ask for is inside, nothing points
at art/, and the unzipped copy opens from file:// (title, one played card, the teacher sample class) with no console errors.
Usage: python3 tools/build_zip.py   (prints one JSON line; writes tools/build_zip.json for tools/regress.js check Z1)"""
import os, re, json, zipfile, tempfile
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = os.path.expanduser('~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome')
OUT = os.path.join(ROOT, 'dist', 'PaydaySpire.zip')
PAGES = ['index.html', 'teacher.html']


def wanted():
    files = list(PAGES)
    for d in ('css', 'js'):
        files += [d + '/' + f for f in sorted(os.listdir(os.path.join(ROOT, d))) if f.endswith('.css' if d == 'css' else '.js')]
    man = open(os.path.join(ROOT, 'art_b', 'manifest.js')).read()
    files += ['art_b/manifest.js'] + sorted(set(re.findall(r'"(art_b/[^"]+)"', man)))
    return files


def check_files(names):
    problems = []
    for bad in ('art/', 'review/', 'video/', 'tools/', 'shots/', 'dist/'):
        if any(n.startswith(bad) for n in names):
            problems.append('zip has ' + bad)
    if any('contact_sheet' in n or n.endswith('.md') for n in names):
        problems.append('zip has a contact sheet or a document')
    for page in PAGES:
        html = open(os.path.join(ROOT, page)).read()
        for ref in re.findall(r'(?:src|href)="([^"#?]+)"', html):
            if not re.match(r'^[a-z]+:', ref) and ref.endswith(('.js', '.css')) and ref not in names:
                problems.append(page + ' needs ' + ref)
    code = ''.join(open(os.path.join(ROOT, n), encoding='utf8').read() for n in names if n.endswith(('.js', '.css', '.html')))
    if re.search(r'[\'"(/]art/', code):
        problems.append('code points at art/')
    return problems


def open_check(folder):
    errors, notes = [], {}
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, headless=True)
        pg = b.new_page(viewport={'width': 1280, 'height': 800})
        pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.on('requestfailed', lambda r: errors.append('missing ' + r.url))
        pg.goto('file://' + os.path.join(folder, 'index.html') + '?code=K7M3QX')
        pg.wait_for_timeout(500)
        notes['title'] = pg.evaluate('() => document.querySelector("#title h1").textContent')
        notes['art'] = pg.evaluate('() => Object.keys(PS.ART).length')
        pg.click('#btnPlay'); pg.wait_for_timeout(300)
        if pg.evaluate("!document.getElementById('modal').hidden"):
            pg.click('[data-act=go]'); pg.wait_for_timeout(300)
        pg.click('#hand [data-h="0"]'); pg.wait_for_timeout(300)
        notes['played'] = pg.evaluate('() => PS.G.s.focus < PS.CONST.FOCUS')
        pg.goto('file://' + os.path.join(folder, 'teacher.html'))
        pg.wait_for_timeout(300)
        pg.click('#tcSample'); pg.wait_for_timeout(300)
        notes['teacher'] = pg.evaluate('() => document.body.innerText.length > 500')
        b.close()
    return errors, notes


def main():
    names = wanted()
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
        for n in names:
            z.write(os.path.join(ROOT, n), 'PaydaySpire/' + n)
    with zipfile.ZipFile(OUT) as z:
        inside = [n[len('PaydaySpire/'):] for n in z.namelist()]
        problems = check_files(inside)
        with tempfile.TemporaryDirectory() as tmp:
            z.extractall(tmp)
            errors, notes = open_check(os.path.join(tmp, 'PaydaySpire'))
    if errors:
        problems.append('console: ' + ' | '.join(errors[:3]))
    if not (notes.get('played') and notes.get('teacher') and notes.get('art')):
        problems.append('did not open: ' + json.dumps(notes))
    res = {'ok': not problems, 'zip': os.path.relpath(OUT, ROOT), 'files': len(inside), 'bytes': os.path.getsize(OUT), 'problems': problems, 'notes': notes}
    with open(os.path.join(ROOT, 'tools', 'build_zip.json'), 'w') as f:
        json.dump(res, f, indent=1)
    print(json.dumps(res))


if __name__ == '__main__':
    main()
