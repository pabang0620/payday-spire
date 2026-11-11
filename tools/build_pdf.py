import sys,subprocess,os,re
import os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pdf_lib'))
import markdown
B=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME=os.path.expanduser('~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome')
CSS='''@page{size:A4;margin:18mm 16mm}
body{font-family:"Noto Sans","DejaVu Sans",Arial,sans-serif;font-size:10pt;line-height:1.5;color:#1b1f24}
h1{font-size:22pt;margin:0 0 4pt;color:#12324f}h2{font-size:15pt;color:#12324f;border-bottom:1.5px solid #c9d6e2;padding-bottom:2pt;margin-top:20pt;break-after:avoid}
h3{font-size:12pt;color:#1d4a73;break-after:avoid}h4{break-after:avoid}
a{color:#0b5cad;word-break:break-word}code{font-family:"DejaVu Sans Mono",monospace;font-size:8.6pt;background:#eef2f6;padding:0 2pt;border-radius:2pt}
pre{background:#eef2f6;padding:6pt;white-space:pre-wrap;font-size:8.4pt;break-inside:avoid}pre code{background:none}
table{border-collapse:collapse;width:100%;margin:8pt 0;font-size:8.8pt}th,td{border:1px solid #b9c5d1;padding:3pt 5pt;vertical-align:top}th{background:#e3ebf3}tr{break-inside:avoid}
blockquote{border-left:3px solid #9db4cb;margin-left:0;padding-left:8pt;color:#39475a}img{max-width:100%}
.cover{height:235mm;display:flex;flex-direction:column;justify-content:center;break-after:page;border-left:6px solid #12324f;padding-left:14mm}
.cover .t{font-size:34pt;font-weight:700;color:#12324f;line-height:1.15}.cover .s{font-size:16pt;color:#1d4a73;margin-top:8pt}
.cover .m{font-size:13pt;margin-top:36pt}.cover .m div{margin:3pt 0}'''
def build(src,title,sub,out):
    t=open(f'{B}/{src}',encoding='utf-8').read()
    t=re.sub(r'^# .*\n','',t,count=1)
    t=re.sub(r'(?m)^([^\n\s>|#*\-\d][^\n]*|\*\*[^\n]*)\n(?=(?:\d+\.|[-*]) )',r'\1\n\n',t)
    h=markdown.markdown(t,extensions=['tables','fenced_code','sane_lists'])
    cover=f'<div class="cover"><div class="t">{title}</div><div class="s">{sub}</div><div class="m"><div><b>Wonho Lee</b></div><div>Zoud GameLab 2026</div><div>"Make FinLit Fun"</div></div></div>'
    html=f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{title}</title><style>{CSS}</style></head><body>{cover}{h}</body></html>'
    hp=f'/tmp/claude-1000/-home-lee-project/3e944845-c187-493e-9866-073d41ae9a46/scratchpad/{src}.html'
    open(hp,'w',encoding='utf-8').write(html)
    subprocess.run([CHROME,'--headless=new','--no-sandbox','--disable-gpu','--no-pdf-header-footer',f'--print-to-pdf={B}/dist/{out}',f'file://{hp}'],check=True,capture_output=True)
build('concept_doc.md','Payday Spire','Concept Document','Payday_Spire_Concept_Document.pdf')
build('budget.md','Payday Spire','Development Budget','Payday_Spire_Budget.pdf')
import fitz
for n in ['Concept_Document','Budget']:
    d=fitz.open(f'{B}/dist/Payday_Spire_{n}.pdf');print(n,len(d),d[0].rect)
    links=sum(len(p.get_links()) for p in d);print('links',links)
    for i in [0,1,len(d)//2,len(d)-1]:
        d[i].get_pixmap(dpi=60).save(f'p_{n}_{i}.png')
