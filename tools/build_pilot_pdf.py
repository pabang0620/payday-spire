"""Builds dist/Payday_Spire_School_Pilot.pdf from docs/pilot_onepager.md: one A4 page, same markdown and Chrome print
route as tools/build_pdf.py (tools/pdf_lib), then checks it has 1 page and saves a preview picture next to the scratch HTML."""
import sys, os, re, subprocess
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pdf_lib'))
import markdown
B = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = os.path.expanduser('~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome')
TMP = os.environ.get('PDF_TMP', '/tmp/claude-1000/-home-lee-project/3e944845-c187-493e-9866-073d41ae9a46/scratchpad')
OUT = os.path.join(B, 'dist', 'Payday_Spire_School_Pilot.pdf')
CSS = '''@page{size:A4;margin:10mm 12mm}
body{font-family:"Noto Sans","DejaVu Sans",Arial,sans-serif;font-size:7.9pt;line-height:1.28;color:#1b1f24;margin:0}
h1{font-size:15pt;margin:0 0 2pt;color:#12324f;border-left:5px solid #12324f;padding-left:6pt}
h1+p{margin:0 0 4pt;color:#39475a}
h2{font-size:9.6pt;color:#12324f;border-bottom:1.2px solid #c9d6e2;padding-bottom:1pt;margin:5pt 0 2pt;break-after:avoid}
p{margin:2pt 0}ul{margin:2pt 0;padding-left:12pt}li{margin:1pt 0}
code{font-family:"DejaVu Sans Mono",monospace;font-size:7.2pt;background:#eef2f6;padding:0 2pt;border-radius:2pt}
table{border-collapse:collapse;width:100%;margin:3pt 0;font-size:7.5pt}th,td{border:1px solid #b9c5d1;padding:1.6pt 4pt;vertical-align:top}
th{background:#e3ebf3;text-align:left}thead tr th:empty{display:none}td:first-child{font-weight:700;white-space:nowrap}
.src{font-size:6.6pt;color:#556}'''
def build():
    t = open(os.path.join(B, 'docs', 'pilot_onepager.md'), encoding='utf-8').read()
    t = re.sub(r'(?m)^([^\n\s>|#*\-\d][^\n]*|\*\*[^\n]*)\n(?=(?:\d+\.|[-*]) )', r'\1\n\n', t)
    h = markdown.markdown(t, extensions=['tables', 'fenced_code', 'sane_lists'])
    h = h.replace('<p>Sources:', '<p class="src">Sources:')
    html = f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Payday Spire - School pilot</title><style>{CSS}</style></head><body>{h}</body></html>'
    hp = os.path.join(TMP, 'pilot_onepager.html')
    open(hp, 'w', encoding='utf-8').write(html)
    subprocess.run([CHROME, '--headless=new', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer', f'--print-to-pdf={OUT}', f'file://{hp}'], check=True, capture_output=True)
    import fitz
    d = fitz.open(OUT)
    d[0].get_pixmap(dpi=110).save(os.path.join(TMP, 'pilot_onepager_p1.png'))
    print('pages', len(d), OUT)
    if len(d) != 1:
        sys.exit('the pilot one-pager must fit one page')
build()
