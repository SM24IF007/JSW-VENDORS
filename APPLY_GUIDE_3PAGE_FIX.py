from pathlib import Path
import shutil, sys

HERE = Path(__file__).resolve().parent

def find_project():
    candidates=[HERE,HERE.parent,Path.cwd()]
    for base in list(candidates):
        try:
            for p in base.iterdir():
                if p.is_dir(): candidates.append(p)
        except Exception: pass
    seen=set()
    for c in candidates:
        try:c=c.resolve()
        except Exception:continue
        if c in seen:continue
        seen.add(c)
        if (c/'app.py').exists() and (c/'templates/landing.html').exists(): return c
    return None

ROOT=find_project()
if ROOT is None:
    print('PROJECT NOT FOUND: is folder ko app.py wale main project folder ke andar rakho.')
    input('Enter...');sys.exit(1)

landing=ROOT/'templates/landing.html'
css_dst=ROOT/'static/css/guide-3page-fix.css'
js_dst=ROOT/'static/js/guide-3page-fix.js'
css_dst.parent.mkdir(parents=True,exist_ok=True);js_dst.parent.mkdir(parents=True,exist_ok=True)
backup=ROOT/'_guide_3page_backup'
backup.mkdir(exist_ok=True)
if not (backup/'landing.html').exists(): shutil.copy2(landing,backup/'landing.html')
shutil.copy2(HERE/'static/css/guide-3page-fix.css',css_dst)
shutil.copy2(HERE/'static/js/guide-3page-fix.js',js_dst)

s=landing.read_text(encoding='utf-8',errors='ignore')
css_tag="""<link rel="stylesheet" href="{{ url_for('static', filename='css/guide-3page-fix.css', v='guide1') }}">"""
js_tag="""<script defer src="{{ url_for('static', filename='js/guide-3page-fix.js', v='guide1') }}"></script>"""
if 'guide-3page-fix.css' not in s:
    s=s.replace('</head>',css_tag+'\n</head>',1)
if 'guide-3page-fix.js' not in s:
    s=s.replace('</body>',js_tag+'\n</body>',1)
landing.write_text(s,encoding='utf-8')
print('SUCCESS: Animated workforce guide + 3-page preview fixed.')
print('Billing/Admin/DB/Print/RAMCO files untouched.')
print('Project:',ROOT)
input('Enter...')
