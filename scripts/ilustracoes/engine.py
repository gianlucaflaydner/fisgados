"""Fisgados — gerador de ilustrações de peixes em SVG, estilo único.

Tudo é gerado como listas de pontos no "espaço do corpo" (focinho em x=0,
pedúnculo em x=BL, linha média em y=0), depois deformado (enguias), depois
ajustado ao quadro 512x320. Assim a espessura de traço é igual em todos.
"""
import math, random, copy

W, H, PAD = 512, 320, 22
BL = 400.0
INK = '#0B1A1E'
OUT_W = 3.0


def deep(a, b):
    r = copy.deepcopy(a)
    for k, v in (b or {}).items():
        if isinstance(v, dict) and isinstance(r.get(k), dict):
            r[k] = deep(r[k], v)
        else:
            r[k] = copy.deepcopy(v)
    return r


DEFAULT = {
    'hu': 0.15, 'hd': 0.13, 'xm': 0.36, 's0': 0.28, 'p': 2.2, 'pb': 2.0,
    'pe': 0.30, 'r': 1.2, 'sy': 0.0, 'snout': 0.55,
    'tail': {'type': 'forked', 'len': 0.28, 'sp': 0.55, 'dep': 0.45},
    'dorsal': [{'x0': 0.36, 'x1': 0.62, 'h': 0.11, 'shape': 'tri', 'lean': 0.4}],
    'anal': [{'x0': 0.66, 'x1': 0.80, 'h': 0.07, 'shape': 'tri', 'lean': 0.4}],
    'adipose': None,
    'pelvic': {'x': 0.42, 'len': 0.09, 'w': 0.035, 'ang': 62},
    'pectoral': {'x': 0.235, 'y': 0.62, 'len': 0.12, 'w': 0.045, 'ang': 28},
    'eye': {'x': 0.085, 'y': 0.36, 'r': 0.027, 'iris': '#D8B24A'},
    'operc': 0.205, 'mouth': {'len': 0.055, 'pos': 'terminal', 'drop': 0.0},
    'colors': {'back': '#5E7766', 'flank': '#A9B9A4', 'belly': '#E9ECDF', 'fin': '#8FA08C'},
    'fincol': {}, 'scales': 0.22, 'lateral': True, 'gloss': True,
    'marks': [], 'barbels': [], 'bend': None, 'gills': 0, 'scutes': None,
    'finspots': None, 'seed': 1,
}


# ---------- geometria básica ----------

def env(cfg, t, bottom=False):
    xm, s0, pe, r = cfg['xm'], cfg['s0'], cfg['pe'], cfg['r']
    p = cfg['pb'] if bottom else cfg['p']
    t = min(max(t, 0.0), 1.0)
    if t <= xm:
        u = t / xm
        return s0 + (1 - s0) * (1 - (1 - u) ** p)
    u = (t - xm) / (1 - xm)
    return pe + (1 - pe) * max(0.0, 1 - u * u) ** r


def mid(cfg, t):
    hm = (cfg['hu'] + cfg['hd']) * BL / 2
    if t >= cfg['xm']:
        return 0.0
    u = t / cfg['xm']
    return cfg['sy'] * hm * (1 - u) ** 2


def top_y(cfg, x):
    t = x / BL
    return mid(cfg, t) - cfg['hu'] * BL * env(cfg, t)


def bot_y(cfg, x):
    t = x / BL
    return mid(cfg, t) + cfg['hd'] * BL * env(cfg, t, True)


def body_pts(cfg):
    n = 70
    ts = [(1 - math.cos(math.pi * i / n)) / 2 for i in range(n + 1)]
    top = [(t * BL, top_y(cfg, t * BL)) for t in ts]
    bot = [(t * BL, bot_y(cfg, t * BL)) for t in ts]
    y0t, y0b = top[0][1], bot[0][1]
    cap_r = (y0b - y0t) / 2 * cfg['snout']
    my = (y0t + y0b) / 2
    cap = [(-cap_r * 0.75, y0t + (y0b - y0t) * 0.2), (-cap_r, my), (-cap_r * 0.75, y0b - (y0b - y0t) * 0.2)]
    outline = list(reversed(bot)) + cap[::-1][::-1][::-1]  # bottom tail->snout then cap bottom->top
    outline = list(reversed(bot)) + [cap[2], cap[1], cap[0]] + top
    return outline, (-cap_r, my)


def catmull(pts, closed, corners=None, tension=0.5):
    """pts: list of (x,y). corners: set of indices with zero tangent."""
    corners = corners or set()
    n = len(pts)
    if n < 2:
        return ''
    def P(i):
        if closed:
            return pts[i % n]
        return pts[min(max(i, 0), n - 1)]
    d = 'M%.2f %.2f' % pts[0]
    segs = n if closed else n - 1
    for i in range(segs):
        p0, p1, p2, p3 = P(i - 1), P(i), P(i + 1), P(i + 2)
        k = tension / 3 * 2
        if (i % n) in corners:
            c1 = p1
        else:
            c1 = (p1[0] + (p2[0] - p0[0]) * k / 2, p1[1] + (p2[1] - p0[1]) * k / 2)
        if ((i + 1) % n) in corners:
            c2 = p2
        else:
            c2 = (p2[0] - (p3[0] - p1[0]) * k / 2, p2[1] - (p3[1] - p1[1]) * k / 2)
        d += ' C%.2f %.2f %.2f %.2f %.2f %.2f' % (c1[0], c1[1], c2[0], c2[1], p2[0], p2[1])
    if closed:
        d += ' Z'
    return d


def rot(pts, ang, ox, oy):
    a = math.radians(ang)
    ca, sa = math.cos(a), math.sin(a)
    return [(ox + x * ca - y * sa, oy + x * sa + y * ca) for x, y in pts]


# ---------- itens de cena ----------
# item: dict(kind='path', pts, closed, corners, fill, stroke, sw, op, layer, clip)
#       dict(kind='circle', c, r, fill, stroke, sw, op, layer, clip)

def item(**k):
    k.setdefault('kind', 'path')
    k.setdefault('closed', True)
    k.setdefault('corners', set())
    k.setdefault('fill', 'none')
    k.setdefault('stroke', 'none')
    k.setdefault('sw', 0)
    k.setdefault('op', 1)
    k.setdefault('clip', None)
    return k


FIN_SHAPES = {
    'tri':     ([(0, 0), (0.14, 1.0), (0.55, 0.55), (1, 0.28), (1.02, 0)], {1}),
    'round':   ([(0, 0), (0.15, 0.75), (0.45, 1.0), (0.8, 0.85), (1, 0.35), (1.01, 0)], set()),
    'long':    ([(0, 0), (0.06, 0.85), (0.3, 0.8), (0.7, 0.72), (0.95, 0.6), (1.0, 0)], set()),
    'sail':    ([(0, 0), (0.04, 1.0), (0.4, 0.98), (0.85, 0.8), (1, 0.45), (1.0, 0)], {1}),
    'falcate': ([(0, 0), (0.08, 1.0), (0.28, 0.42), (0.6, 0.25), (1, 0.18), (1.0, 0)], {1}),
    'shark':   ([(0, 0), (0.25, 0.55), (0.55, 1.0), (0.62, 0.62), (0.78, 0.12), (0.92, 0.0)], {2, 4}),
    'low':     ([(0, 0), (0.25, 0.8), (0.6, 1.0), (0.95, 0.7), (1.05, 0.0)], set()),
    'flag':    ([(0, 0), (0.05, 1.0), (0.5, 0.85), (1, 0.5), (1.0, 0)], {1}),
}


def spiny_shape(n=9, soft=None):
    """espinhos + (opcional) parte mole."""
    pts, cor = [(0, 0)], set()
    span = 1.0 if not soft else 0.55
    for i in range(n):
        t = span * (i + 0.5) / n
        h = 1.0 - 0.35 * (i / n) ** 1.4 if i > 0 else 0.85
        if soft and i > n * 0.6:
            h *= 0.7 + 0.3 * (n - i) / n
        pts.append((t, h)); cor.add(len(pts) - 1)
        pts.append((span * (i + 1) / n, h * 0.68))
    if soft:
        pts[-1] = (span, 0.34)
        pts += [(span + 0.08, 0.82), (span + 0.25, 0.9), (0.9, 0.7), (1.0, 0.25), (1.0, 0)]
    else:
        pts.append((1.0, 0))
    return pts, cor


def fin_item(cfg, fin, side, color):
    x0, x1, h = fin['x0'] * BL, fin['x1'] * BL, fin['h'] * BL
    shape = fin.get('shape', 'tri')
    if shape == 'spiny':
        prof, cor = spiny_shape(fin.get('n', 9))
    elif shape == 'notch':
        prof, cor = spiny_shape(fin.get('n', 8), soft=True)
    else:
        prof, cor = FIN_SHAPES[shape]
    lean = fin.get('lean', 0.4)
    sgn = -1 if side == 'top' else 1
    edge = top_y if side == 'top' else bot_y

    def ey(x):
        xc = min(max(x, 0), BL)
        return edge(cfg, xc)
    pts = []
    for t, f in prof:
        xb = x0 + t * (x1 - x0)
        pts.append((xb + lean * f * h, ey(xb) + sgn * f * h))
    # base afundada no corpo
    base = []
    for i in range(6, -1, -1):
        xb = x0 + (x1 - x0) * i / 6
        base.append((xb, ey(xb) - sgn * 8))
    allp = pts + base
    cor2 = set(cor)
    rays = []
    nr = max(3, int((x1 - x0) / 9))
    for i in range(1, nr):
        t = i / nr
        # acha f interpolando no perfil
        f = interp_prof(prof, t)
        xb = x0 + t * (x1 - x0)
        rays.append([(xb, ey(xb) + sgn * 2), (xb + lean * f * h * 0.95, ey(xb) + sgn * f * h * 0.9)])
    return allp, cor2, rays


def interp_prof(prof, t):
    for (a, fa), (b, fb) in zip(prof, prof[1:]):
        if a <= t <= b and b > a:
            return fa + (fb - fa) * (t - a) / (b - a)
    return 0.0


def tail_pts(cfg):
    tl = cfg['tail']
    typ = tl['type']
    X = BL
    pt = -top_y(cfg, X) if True else 0
    pb = bot_y(cfg, X)
    pt = top_y(cfg, X)  # negativo
    L = tl.get('len', 0.28) * BL
    sp = tl.get('sp', 0.55) * L
    a0 = (X - 14, pt)
    b0 = (X - 14, pb)
    my = (pt + pb) / 2
    if typ == 'forked':
        dep = tl.get('dep', 0.45)
        U = (X + L, pt - sp)
        N = (X + L * dep, my)
        D = (X + L, pb + sp)
        pts = [a0, (X + L * 0.45, pt - sp * 0.42), U, (X + L * (dep + (1 - dep) * 0.55), my - sp * 0.25 - (pb - pt) * 0.1), N,
               (X + L * (dep + (1 - dep) * 0.55), my + sp * 0.25 + (pb - pt) * 0.1), D, (X + L * 0.45, pb + sp * 0.42), b0]
        cor = {2, 4, 6}
    elif typ == 'emarg':
        U = (X + L, pt - sp)
        D = (X + L, pb + sp)
        pts = [a0, (X + L * 0.5, pt - sp * 0.55), U, (X + L * 0.88, my), D, (X + L * 0.5, pb + sp * 0.55), b0]
        cor = {2, 4}
    elif typ == 'trunc':
        pts = [a0, (X + L * 0.5, pt - sp * 0.5), (X + L, pt - sp), (X + L * 1.02, my), (X + L, pb + sp), (X + L * 0.5, pb + sp * 0.5), b0]
        cor = {2, 4}
    elif typ == 'round':
        pts = [a0, (X + L * 0.35, pt - sp * 0.55), (X + L * 0.8, pt - sp * 0.55), (X + L * 1.02, my), (X + L * 0.8, pb + sp * 0.55), (X + L * 0.35, pb + sp * 0.55), b0]
        cor = set()
    elif typ == 'point':
        pts = [a0, (X + L * 0.45, pt - sp * 0.5), (X + L, my), (X + L * 0.45, pb + sp * 0.5), b0]
        cor = {2}
    elif typ == 'hetero':
        low = tl.get('low', 0.45)
        up = tl.get('up', 0.55)
        tip = (X + L, pt - L * up)
        pts = [a0, (X + L * 0.55, pt - L * up * 0.55), tip, (X + L * 0.93, pt - L * up * 0.62 + L * 0.12),
               (X + L * 0.78, my - L * 0.02), (X + L * 0.55, my + L * 0.05), (X + L * 0.42, pb + L * low), (X + L * 0.15, pb + L * low * 0.25), b0]
        cor = {2, 3, 6}
    elif typ == 'none':
        return None, None
    else:
        raise ValueError(typ)
    return pts, cor


# ---------- marcas (padrões no corpo) ----------

def frac_y(cfg, x, f):
    return top_y(cfg, x) + f * (bot_y(cfg, x) - top_y(cfg, x))


def blob(cx, cy, r, rng, k=9, irr=0.28, sx=1.0):
    pts = []
    ph = rng.random() * 6.28
    for i in range(k):
        a = 2 * math.pi * i / k + ph
        rr = r * (1 + irr * (rng.random() * 2 - 1))
        pts.append((cx + math.cos(a) * rr * sx, cy + math.sin(a) * rr))
    return pts


def build_marks(cfg, rng):
    items = []
    for m in cfg['marks']:
        t = m['type']
        col = m.get('color', '#000')
        op = m.get('op', 0.85)
        if t in ('spots', 'blotch'):
            x0, x1 = m.get('x', (0.05, 1.0))
            y0, y1 = m.get('y', (0.0, 1.0))
            r0, r1 = m.get('r', (0.008, 0.016))
            n = m.get('n', 40)
            tries = 0
            placed = []
            while len(placed) < n and tries < n * 30:
                tries += 1
                x = (x0 + (x1 - x0) * rng.random()) * BL
                fy = y0 + (y1 - y0) * rng.random()
                y = frac_y(cfg, x, fy)
                r = (r0 + (r1 - r0) * rng.random()) * BL
                if any((x - a) ** 2 + (y - b) ** 2 < (r + c + m.get('gap', 2.5)) ** 2 for a, b, c in placed):
                    continue
                placed.append((x, y, r))
            for x, y, r in placed:
                if t == 'spots':
                    items.append(item(kind='circle', c=(x, y), r=r, fill=col, op=op, clip='body'))
                else:
                    items.append(item(pts=blob(x, y, r, rng, irr=m.get('irr', 0.35), sx=m.get('sx', 1.3)), fill=col, op=op, clip='body'))
        elif t == 'bars':
            n = m['n']
            x0, x1 = m.get('x', (0.2, 0.9))
            w = m.get('w', 0.03) * BL
            y0, y1 = m.get('y', (0.0, 0.85))
            sl = m.get('slant', 0.0) * BL
            wob = m.get('wob', 0.0)
            for i in range(n):
                xc = (x0 + (x1 - x0) * (i + 0.5) / n) * BL
                ww = w * (1 + wob * (rng.random() - 0.5))
                left, right = [], []
                for j in range(9):
                    f = y0 + (y1 - y0) * j / 8
                    dx = sl * (f - 0.5) + wob * 6 * math.sin(j * 1.7 + i)
                    yl = frac_y(cfg, xc + dx, f)
                    left.append((xc + dx - ww / 2, yl))
                    right.append((xc + dx + ww / 2, yl))
                items.append(item(pts=left + right[::-1], fill=col, op=op, clip='body'))
        elif t == 'stripe':
            x0, x1 = m.get('x', (0.12, 1.05))
            f0, f1 = m['f']
            pts_a, pts_b = [], []
            for j in range(25):
                x = (x0 + (x1 - x0) * j / 24) * BL
                pts_a.append((x, frac_y(cfg, x, f0)))
                pts_b.append((x, frac_y(cfg, x, f1)))
            items.append(item(pts=pts_a + pts_b[::-1], fill=col, op=op, clip='body'))
        elif t == 'lines':
            for f in m['f']:
                x0, x1 = m.get('x', (0.2, 1.0))
                pts = []
                sl = m.get('slant', 0.0)
                for j in range(20):
                    tt = j / 19
                    x = (x0 + (x1 - x0) * tt) * BL
                    pts.append((x, frac_y(cfg, x, f + sl * (tt - 0.5))))
                items.append(item(pts=pts, closed=False, stroke=col, sw=m.get('w', 2.2), op=op, clip='body'))
        elif t == 'spotline':
            for (x, f, r) in m['at']:
                X = x * BL
                items.append(item(pts=blob(X, frac_y(cfg, X, f), r * BL, rng, irr=0.12, sx=m.get('sx', 1.0)), fill=col, op=op, clip='body'))
        elif t == 'patch':
            for (x, f, r, sx) in m['at']:
                X = x * BL
                items.append(item(pts=blob(X, frac_y(cfg, X, f), r * BL, rng, k=11, irr=0.3, sx=sx), fill=col, op=op, clip='body'))
        elif t == 'mirror':
            for (x, f, r) in m['at']:
                X = x * BL
                c = (X, frac_y(cfg, X, f))
                items.append(item(pts=blob(c[0], c[1], r * BL, rng, k=8, irr=0.08, sx=1.1), fill=m.get('fill', '#C79A4E'), stroke=col, sw=1.6, op=0.9, clip='body'))
        elif t == 'dotrows':
            x0, x1 = m.get('x', (0.22, 0.98))
            step = m.get('step', 0.025)
            r = m.get('r', 0.005) * BL
            for k, f in enumerate(m['f']):
                x = x0 + (step / 2 if k % 2 else 0)
                while x <= x1:
                    X = x * BL
                    items.append(item(kind='circle', c=(X, frac_y(cfg, X, f)), r=r, fill=col, op=op, clip='body'))
                    x += step
        elif t == 'ocelli':
            for (x, f, r) in m['at']:
                X = x * BL
                c = (X, frac_y(cfg, X, f))
                items.append(item(kind='circle', c=c, r=r * BL, fill=m.get('ring', '#E8D9B0'), op=0.9, clip='body'))
                items.append(item(kind='circle', c=c, r=r * BL * 0.6, fill=col, op=op, clip='body'))
        elif t == 'grad_patch':  # região colorida (ex.: barriga laranja)
            x0, x1 = m['x']
            f0, f1 = m['f']
            pts_a, pts_b = [], []
            for j in range(25):
                x = (x0 + (x1 - x0) * j / 24) * BL
                pts_a.append((x, frac_y(cfg, x, f0)))
                pts_b.append((x, frac_y(cfg, x, f1)))
            items.append(item(pts=pts_a + pts_b[::-1], fill=col, op=op, clip='body', blur=m.get('blur', 0)))
    return items


# ---------- montagem ----------

def build(spec):
    cfg = deep(DEFAULT, spec)
    rng = random.Random(cfg['seed'] * 7919 + len(cfg.get('id', '')))
    C = cfg['colors']
    fin_c = C.get('fin', C['flank'])
    items = []

    # nadadeiras de trás
    def add_fin(fin, side, name):
        col = cfg['fincol'].get(name, fin_c)
        pts, cor, rays = fin_item(cfg, fin, side, col)
        items.append(item(pts=pts, corners=cor, fill=col, stroke=INK, sw=OUT_W * 0.8, layer='back', fin=name))
        for r in rays:
            items.append(item(pts=r, closed=False, stroke=INK, sw=1.0, op=0.28, layer='back'))
        if fin.get('edge'):
            items[-1 - len(rays)]['edgecol'] = fin['edge']

    tp, tc = tail_pts(cfg)
    if tp:
        col = cfg['fincol'].get('caudal', fin_c)
        items.append(item(pts=tp, corners=tc, fill=col, stroke=INK, sw=OUT_W * 0.8, layer='back', fin='caudal'))
        ox, oy = BL - 10, (top_y(cfg, BL) + bot_y(cfg, BL)) / 2
        if cfg.get('tailstripe'):
            ts = cfg['tailstripe']
            far = max(p[0] for p in tp)
            items.append(item(pts=[(ox, oy - 3), (far - 6, oy - ts.get('w', 6) / 2), (far - 6, oy + ts.get('w', 6) / 2), (ox, oy + 3)],
                              fill=ts['color'], op=ts.get('op', 0.9), layer='back', corners={0, 1, 2, 3}))
        for p in tp[1:-1]:
            items.append(item(pts=[(ox, oy), (ox + (p[0] - ox) * 0.9, oy + (p[1] - oy) * 0.9)], closed=False, stroke=INK, sw=1.0, op=0.25, layer='back'))
    for f in cfg['dorsal'] or []:
        add_fin(f, 'top', f.get('name', 'dorsal'))
    if cfg['adipose']:
        a = dict(shape='low', lean=0.3)
        a.update(cfg['adipose'])
        add_fin(a, 'top', 'adipose')
    for f in cfg['anal'] or []:
        add_fin(f, 'bot', f.get('name', 'anal'))
    pv = cfg['pelvic']
    if pv:
        x = pv['x'] * BL
        L, w = pv['len'] * BL, pv['w'] * BL
        local = [(0, -w / 2), (L * 0.55, -w * 0.6), (L, 0), (L * 0.5, w * 0.55), (0, w / 2)]
        pts = rot(local, pv['ang'], x, bot_y(cfg, x) - 6)
        items.append(item(pts=pts, corners={2} if pv.get('sharp', True) else set(), fill=cfg['fincol'].get('pelvic', fin_c), stroke=INK, sw=OUT_W * 0.8, layer='back'))

    # corpo
    outline, cap = body_pts(cfg)
    items.append(item(pts=outline, closed=True, fill='url(#gBody)', layer='body', id='body'))

    # padrões
    items += [dict(i, layer='marks') for i in build_marks(cfg, rng)]

    # escamas (retângulo com pattern, só depois do opérculo)
    if cfg['scales']:
        x0 = cfg['operc'] * BL + 6
        pts = [(x0, -BL), (BL + 20, -BL), (BL + 20, BL), (x0, BL)]
        items.append(item(pts=pts, fill='url(#pScale)', op=cfg['scales'], layer='marks', clip='body', warpdense=True))

    # brilho dorsal
    if cfg['gloss']:
        pts = []
        for j in range(16):
            x = (0.1 + 0.62 * j / 15) * BL
            pts.append((x, top_y(cfg, x) + 0.16 * cfg['hu'] * BL + 2))
        items.append(item(pts=pts, closed=False, stroke='#FFFFFF', sw=5, op=0.22, layer='marks', clip='body', cap='round'))
    # sombra ventral
    pts = []
    for j in range(16):
        x = (0.08 + 0.8 * j / 15) * BL
        pts.append((x, bot_y(cfg, x) - 3))
    items.append(item(pts=pts, closed=False, stroke=INK, sw=7, op=0.10, layer='marks', clip='body', cap='round'))

    # contorno do corpo (aberto no pedúnculo)
    n_out = len(outline)
    items.append(item(pts=outline[1:-1], closed=False, stroke=INK, sw=OUT_W, layer='line', cap='round'))

    # linha lateral
    if cfg['lateral']:
        pts = []
        for j in range(20):
            x = (cfg['operc'] + 0.03 + (0.97 - cfg['operc']) * j / 19) * BL
            pts.append((x, frac_y(cfg, x, cfg['lateral'] if isinstance(cfg['lateral'], float) else 0.36)))
        items.append(item(pts=pts, closed=False, stroke=INK, sw=1.4, op=0.30, layer='line', cap='round'))
    # opérculo
    if cfg['operc'] and not cfg['gills']:
        xo = cfg['operc'] * BL
        ty, by = top_y(cfg, xo), bot_y(cfg, xo)
        hh = by - ty
        pts = [(xo - 0.035 * BL, ty + hh * 0.1), (xo + 0.004 * BL, ty + hh * 0.42), (xo - 0.01 * BL, ty + hh * 0.72), (xo - 0.05 * BL, ty + hh * 0.95)]
        items.append(item(pts=pts, closed=False, stroke=INK, sw=2.0, op=0.55, layer='line', cap='round'))
    if cfg['gills']:
        for i in range(cfg['gills']):
            xo = (cfg['operc'] + i * 0.022) * BL
            ty, by = top_y(cfg, xo), bot_y(cfg, xo)
            hh = by - ty
            pts = [(xo, ty + hh * 0.32), (xo + 3, ty + hh * 0.5), (xo + 1, ty + hh * 0.68)]
            items.append(item(pts=pts, closed=False, stroke=INK, sw=1.8, op=0.6, layer='line', cap='round'))
    if cfg['scutes']:
        sc = cfg['scutes']
        for k in range(sc.get('n', 12)):
            sx0, sx1 = sc.get('x', (0.22, 0.9))
            x = (sx0 + (sx1 - sx0) * k / (sc.get('n', 12) - 1)) * BL
            for f in sc.get('rows', [0.08, 0.45]):
                y = frac_y(cfg, x, f)
                s = sc.get('s', 0.016) * BL * (1 - 0.35 * k / sc.get('n', 12))
                items.append(item(pts=[(x - s, y), (x, y - s * 0.8), (x + s, y), (x, y + s * 0.8)], corners={0, 1, 2, 3}, fill=sc.get('color', '#F2EEDF'), stroke=INK, sw=1.4, layer='line'))

    # boca
    mo = cfg['mouth']
    if mo and mo.get('len', 0) > 0:
        y0t, y0b = top_y(cfg, 0), bot_y(cfg, 0)
        hh = y0b - y0t
        pos = mo.get('pos', 'terminal')
        fy = {'terminal': 0.5, 'superior': 0.25, 'inferior': 0.85, 'under': 1.05}[pos]
        sx = cap[0] * (0.9 if pos != 'under' else 0.2) + (0 if pos != 'under' else 0.03 * BL)
        sy = y0t + hh * fy
        ex = mo['len'] * BL
        ey = frac_y(cfg, ex, min(fy + mo.get('drop', 0.0), 1.0))
        pts = [(sx, sy), ((sx + ex) / 2, (sy + ey) / 2 + mo.get('curve', 2)), (ex, ey)]
        items.append(item(pts=pts, closed=False, stroke=INK, sw=2.4, layer='line', cap='round'))
        if mo.get('sucker'):
            items.append(item(kind='circle', c=(0.05 * BL, bot_y(cfg, 0.05 * BL) - 2), r=0.03 * BL, fill=C['belly'], stroke=INK, sw=2.0, layer='line'))

    # nadadeira peitoral (frente)
    pc = cfg['pectoral']
    if pc:
        x = pc['x'] * BL
        y = frac_y(cfg, x, pc.get('y', 0.62))
        L, w = pc['len'] * BL, pc['w'] * BL
        local = [(-4, -w / 2), (L * 0.5, -w * 0.62), (L, 0), (L * 0.55, w * 0.45), (-4, w / 2)]
        pts = rot(local, pc['ang'], x, y)
        col = cfg['fincol'].get('pectoral', fin_c)
        items.append(item(pts=pts, corners={2} if pc.get('sharp', True) else set(), fill=col, stroke=INK, sw=OUT_W * 0.8, layer='front', fin='pectoral'))
        for k in range(1, 4):
            tip = rot([(L * 0.92, (k - 2) * w * 0.28)], pc['ang'], x, y)[0]
            items.append(item(pts=[(x, y), tip], closed=False, stroke=INK, sw=1.0, op=0.3, layer='front'))

    # barbilhões
    for b in cfg['barbels']:
        ox = b.get('x', 0.02) * BL
        oy = frac_y(cfg, max(ox, 0), b.get('f', 0.6))
        L = b['len'] * BL
        a = math.radians(b['ang'])
        cv = b.get('curve', 0.25)
        pts = []
        for j in range(8):
            t = j / 7
            px = ox + math.cos(a) * L * t
            py = oy + math.sin(a) * L * t + cv * L * t * t
            pts.append((px, py))
        items.append(item(pts=pts, closed=False, stroke=INK, sw=b.get('w', 2.2), layer='front', cap='round'))

    # olho
    e = cfg['eye']
    if e:
        ex = e['x'] * BL
        ey = frac_y(cfg, ex, e['y'])
        r = e['r'] * BL
        items.append(item(kind='circle', c=(ex, ey), r=r, fill=e.get('iris', '#D8B24A'), stroke=INK, sw=2.2, layer='eye'))
        items.append(item(kind='circle', c=(ex, ey), r=r * e.get('pupil', 0.6), fill=INK, layer='eye'))
        items.append(item(kind='circle', c=(ex - r * 0.25, ey - r * 0.28), r=max(r * 0.2, 1.2), fill='#FFFFFF', op=0.95, layer='eye', fixr=True))
        if e.get('two'):
            ex2 = ex + e['two'][0] * BL
            ey2 = ey + e['two'][1] * BL
            items.append(item(kind='circle', c=(ex2, ey2), r=r, fill=e.get('iris'), stroke=INK, sw=2.2, layer='eye'))
            items.append(item(kind='circle', c=(ex2, ey2), r=r * 0.6, fill=INK, layer='eye'))
            items.append(item(kind='circle', c=(ex2 - r * 0.25, ey2 - r * 0.28), r=max(r * 0.2, 1.2), fill='#FFFFFF', layer='eye'))

    # pintas nas nadadeiras
    if cfg['finspots']:
        fs = cfg['finspots']
        fins = [i for i in items if i.get('fin') in fs.get('fins', ['caudal', 'dorsal'])]
        for fi in fins:
            xs = [p[0] for p in fi['pts']]; ys = [p[1] for p in fi['pts']]
            for _ in range(fs.get('n', 10)):
                x = min(xs) + (max(xs) - min(xs)) * rng.random()
                y = min(ys) + (max(ys) - min(ys)) * rng.random()
                if point_in(fi['pts'], (x, y)):
                    items.append(item(kind='circle', c=(x, y), r=fs.get('r', 0.008) * BL * (0.7 + 0.6 * rng.random()), fill=fs.get('color', INK), op=0.8, layer='back'))
    return cfg, items


def point_in(poly, p):
    x, y = p
    ins = False
    n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-9) + x1:
            ins = not ins
    return ins


# ---------- deformação, enquadramento, SVG ----------

def warp_fn(cfg):
    b = cfg.get('bend')
    if not b:
        return lambda x, y: (x, y)
    A = b.get('amp', 0.05) * BL
    fq = b.get('freq', 1.0)
    ph = b.get('phase', 0.0)
    rotd = b.get('rot', 0.0)
    def f(x, y):
        dy = A * math.sin(2 * math.pi * fq * x / BL + ph)
        return (x, y + dy)
    return f


def densify(pts, closed, step=10.0):
    out = []
    n = len(pts)
    rng_ = range(n if closed else n - 1)
    for i in rng_:
        a, b = pts[i], pts[(i + 1) % n]
        d = math.hypot(b[0] - a[0], b[1] - a[1])
        k = max(1, int(d / step))
        for j in range(k):
            out.append((a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k))
    if not closed:
        out.append(pts[-1])
    return out


def render(spec, cfg_items=None):
    cfg, items = cfg_items or build(spec)
    wf = warp_fn(cfg)
    bent = bool(cfg.get('bend'))
    # aplica deformação
    for it in items:
        if it['kind'] == 'path':
            pts = it['pts']
            if bent and (it.get('id') == 'body' or it.get('warpdense') or (it.get('layer') in ('marks', 'line') and not it['corners'])):
                pts = densify(pts, it['closed'], 6)
            it['pts'] = [wf(x, y) for x, y in pts]
        else:
            it['c'] = wf(*it['c'])
    # enquadramento
    xs, ys = [], []
    for it in items:
        if it.get('warpdense'):
            continue
        if it['kind'] == 'path':
            for x, y in it['pts']:
                xs.append(x); ys.append(y)
        else:
            xs += [it['c'][0] - it['r'], it['c'][0] + it['r']]
            ys += [it['c'][1] - it['r'], it['c'][1] + it['r']]
    if cfg.get('rotate'):
        pass
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    s = min((W - 2 * PAD) / (x1 - x0), (H - 2 * PAD) / (y1 - y0))
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    T = lambda p: ((p[0] - cx) * s + W / 2, (p[1] - cy) * s + H / 2)
    C = cfg['colors']
    sid = cfg.get('id', 'f')
    out = []
    out.append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d">' % (W, H, W, H))
    out.append('<title>%s</title>' % cfg.get('name', sid))
    out.append('<defs>')
    out.append('<linearGradient id="gBody" x1="0" y1="0" x2="0" y2="1">'
               '<stop offset="0" stop-color="%s"/><stop offset="0.42" stop-color="%s"/>'
               '<stop offset="0.78" stop-color="%s"/><stop offset="1" stop-color="%s"/></linearGradient>'
               % (C['back'], C['flank'], C['belly'], C.get('belly2', C['belly'])))
    sc = 13 if not cfg.get('scale_size') else cfg['scale_size']
    cs = sc * 0.62
    r = sc / 2
    arcs = ''.join('M%.1f %.1f A%.1f %.1f 0 0 1 %.1f %.1f ' % (x, y - r, r * 0.62, r, x, y + r)
                   for x, y in [(cs * 0.5, 0), (cs * 0.5, sc), (cs * 1.5, sc / 2)])
    out.append('<pattern id="pScale" width="%.1f" height="%.1f" patternUnits="userSpaceOnUse">'
               '<path d="%s" fill="none" stroke="%s" stroke-width="1.1"/></pattern>' % (cs * 2, sc, arcs, INK))
    body = [i for i in items if i.get('id') == 'body'][0]
    out.append('<clipPath id="cBody"><path d="%s"/></clipPath>' % catmull([T(p) for p in body['pts']], True))
    out.append('</defs>')

    def emit(it):
        st = []
        if it['fill'] != 'none':
            st.append('fill="%s"' % it['fill'])
        else:
            st.append('fill="none"')
        if it['stroke'] != 'none':
            st.append('stroke="%s" stroke-width="%.2f" stroke-linejoin="round"' % (it['stroke'], it['sw']))
            if it.get('cap'):
                st.append('stroke-linecap="%s"' % it['cap'])
        if it['op'] != 1:
            st.append('opacity="%.2f"' % it['op'])
        if it['kind'] == 'circle':
            c = T(it['c'])
            r = it['r'] * s
            return '<circle cx="%.2f" cy="%.2f" r="%.2f" %s/>' % (c[0], c[1], r, ' '.join(st))
        pts = [T(p) for p in it['pts']]
        d = catmull(pts, it['closed'], it['corners'])
        return '<path d="%s" %s/>' % (d, ' '.join(st))

    for layer in ['back', 'body', 'marks', 'line', 'front', 'eye']:
        group = [i for i in items if i.get('layer') == layer]
        if layer == 'marks':
            out.append('<g clip-path="url(#cBody)">')
            out += [emit(i) for i in group]
            out.append('</g>')
        else:
            out += [emit(i) for i in group]
    out.append('</svg>')
    return '\n'.join(out)
