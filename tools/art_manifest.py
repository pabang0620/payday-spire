"""Copy <dir>/manifest.json into <dir>/manifest.js so the art also loads when index.html is opened
straight from disk (browsers block fetch() on file://). Entries whose file is missing are dropped.
The game loads art_b/ (Payday Spire's own pictures). A list manifest ([{"file": ...}]) is keyed by file name without extension.
Usage: python3 tools/art_manifest.py [art_b]"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = sys.argv[1] if len(sys.argv) > 1 else 'art_b'
ART = os.path.join(ROOT, DIR)
SRC = os.path.join(ART, 'manifest.json')
OUT = os.path.join(ART, 'manifest.js')


def entry_path(v):
    if isinstance(v, list):
        v = v[0] if v else None
    if isinstance(v, dict):
        v = v.get('file') or v.get('path') or v.get('src') or v.get('url')
    return v if isinstance(v, str) and v else None


def main():
    os.makedirs(ART, exist_ok=True)
    data = None
    if os.path.exists(SRC):
        with open(SRC, encoding='utf-8') as f:
            raw = json.load(f)
        if isinstance(raw, list):
            raw = {os.path.splitext(e['file'])[0]: e['file'] for e in raw if isinstance(e, dict) and e.get('file')}
        box = raw.get('images') or raw.get('files') or raw.get('assets') or raw
        data, missing = {}, []
        for k, v in box.items():
            p = entry_path(v)
            if not p or '://' in p:
                continue
            p = p[2:] if p.startswith('./') else p
            rel = p if p.startswith(DIR + '/') else DIR + '/' + p
            if os.path.exists(os.path.join(ROOT, rel)):
                data[k] = rel
            else:
                missing.append(k)
        print('art entries:', len(data), 'missing files:', missing or 'none')
    else:
        print('no ' + DIR + '/manifest.json: the game uses its built-in SVG art')
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('/* made by tools/art_manifest.py from ' + DIR + '/manifest.json */\n')
        f.write('window.PS_ART_MANIFEST = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')


main()
