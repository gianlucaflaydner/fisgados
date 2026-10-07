import sys, os, io, json
sys.path.insert(0, os.path.dirname(__file__))
import importlib, engine, params, topview
import cairosvg
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), 'out')
os.makedirs(OUT + '/svg', exist_ok=True)
os.makedirs(OUT + '/png', exist_ok=True)

ids = sys.argv[1].split(',') if len(sys.argv) > 1 and sys.argv[1] != 'all' else list(params.SPECIES)
sheet_name = sys.argv[2] if len(sys.argv) > 2 else 'sheet'
tiles = []
for sid in ids:
    spec = dict(params.SPECIES[sid]); spec['id'] = sid
    svg = topview.render(spec) if spec.get('plan') == 'top' else engine.render(spec)
    open(f'{OUT}/svg/{sid}.svg', 'w').write(svg)
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=1024, output_height=640)
    open(f'{OUT}/png/{sid}.png', 'wb').write(png)
    tiles.append((sid, Image.open(io.BytesIO(png)).convert('RGBA')))

cols = 4
tw, th = 384, 260
rows = (len(tiles) + cols - 1) // cols
sh = Image.new('RGB', (cols * tw, rows * th), '#0E2226')
d = ImageDraw.Draw(sh)
for i, (sid, im) in enumerate(tiles):
    x, y = (i % cols) * tw, (i // cols) * th
    bg = Image.new('RGBA', (tw - 8, th - 28), '#13292E')
    t = im.resize((tw - 8, int((tw - 8) * 0.625)))
    bg.alpha_composite(t, (0, 0))
    sh.paste(bg.convert('RGB'), (x + 4, y + 4))
    d.text((x + 8, y + th - 20), sid, fill='#EEF2EA')
sh.save(f'{OUT}/{sheet_name}.jpg', quality=88)
print('ok', len(tiles))
