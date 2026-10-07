"""Raias e cação-anjo: vista de cima, cabeça à esquerda, mesmo traço do engine."""
import math, random
from engine import item, INK, OUT_W, BL, render as _render, blob, point_in

S = BL


def P(lst):
    return [(x * S, y * S) for x, y in lst]


def mirror(half):
    """half: pontos da metade de cima (y<=0) do focinho para a cauda; devolve contorno fechado."""
    low = [(x, -y) for x, y in reversed(half)]
    return half + low


def render(spec):
    rng = random.Random(len(spec['id']) * 31 + 7)
    form = spec['form']
    C = spec['colors']
    fin = C.get('fin', C['flank'])
    items = []
    tipc = set()
    if form == 'round':      # raia-emplastro (Sympterygia)
        half = P([(0.0, 0.0), (0.05, -0.08), (0.14, -0.2), (0.3, -0.36), (0.46, -0.42), (0.6, -0.36), (0.7, -0.22), (0.74, -0.1), (0.76, -0.045)])
        body = mirror(half)
        pel = P([(0.66, -0.06), (0.74, -0.2), (0.86, -0.17), (0.84, -0.06)])
        items.append(item(pts=pel, fill=fin, stroke=INK, sw=OUT_W * 0.8, layer='back'))
        items.append(item(pts=[(x, -y) for x, y in pel], fill=fin, stroke=INK, sw=OUT_W * 0.8, layer='back'))
        tail = P([(0.72, -0.045), (1.0, -0.035), (1.32, -0.02), (1.42, 0.0), (1.32, 0.02), (1.0, 0.035), (0.72, 0.045)])
        items.append(item(pts=tail, corners={3}, fill=C['back'], stroke=INK, sw=OUT_W * 0.8, layer='back'))
        for x0 in (1.08, 1.22):
            items.append(item(pts=P([(x0, 0), (x0 + 0.03, -0.02), (x0 + 0.08, 0), (x0 + 0.03, 0.02)]), fill=fin, stroke=INK, sw=1.6, layer='front'))
        eyes = [(0.2, -0.05), (0.2, 0.05)]
        er = 0.018
    elif form == 'eagle':    # raia-manteiga (Myliobatis)
        half = P([(0.0, 0.0), (0.02, -0.05), (0.08, -0.075), (0.13, -0.1), (0.2, -0.38), (0.3, -0.62), (0.44, -0.8), (0.5, -0.74), (0.56, -0.5), (0.63, -0.25), (0.68, -0.1), (0.7, -0.035)])
        body = mirror(half)
        tipc = {6, 17}
        tail = P([(0.64, -0.03), (1.0, -0.012), (1.6, -0.004), (1.75, 0.0), (1.6, 0.004), (1.0, 0.012), (0.64, 0.03)])
        items.append(item(pts=tail, corners={3}, fill=C['back'], stroke=INK, sw=OUT_W * 0.7, layer='back'))
        items.append(item(pts=P([(0.68, 0), (0.71, -0.02), (0.78, 0), (0.71, 0.02)]), fill=fin, stroke=INK, sw=1.6, layer='front'))
        pel = P([(0.6, -0.04), (0.66, -0.11), (0.72, -0.08), (0.7, -0.03)])
        items.append(item(pts=pel, fill=fin, stroke=INK, sw=OUT_W * 0.8, layer='back'))
        items.append(item(pts=[(x, -y) for x, y in pel], fill=fin, stroke=INK, sw=OUT_W * 0.8, layer='back'))
        eyes = [(0.1, -0.075), (0.1, 0.075)]
        er = 0.016
    elif form == 'guitar':   # raia-viola (Pseudobatos)
        half = P([(0.0, 0.0), (0.06, -0.06), (0.2, -0.16), (0.34, -0.25), (0.44, -0.26), (0.5, -0.2), (0.52, -0.1), (0.6, -0.085), (0.9, -0.06), (1.2, -0.035), (1.32, -0.03)])
        body = mirror(half)
        cau = P([(1.28, -0.03), (1.38, -0.08), (1.5, -0.07), (1.47, 0.0), (1.42, 0.05), (1.32, 0.03)])
        items.append(item(pts=cau, corners={2}, fill=fin, stroke=INK, sw=OUT_W * 0.8, layer='back'))
        pel = P([(0.5, -0.1), (0.56, -0.17), (0.66, -0.12), (0.64, -0.08)])
        items.append(item(pts=pel, fill=fin, stroke=INK, sw=OUT_W * 0.8, layer='back'))
        items.append(item(pts=[(x, -y) for x, y in pel], fill=fin, stroke=INK, sw=OUT_W * 0.8, layer='back'))
        for x0, L in ((0.86, 0.11), (1.08, 0.1)):
            items.append(item(pts=P([(x0, 0), (x0 + L * 0.3, -0.022), (x0 + L, 0), (x0 + L * 0.3, 0.022)]), corners={2}, fill=fin, stroke=INK, sw=1.8, layer='front'))
        eyes = [(0.3, -0.045), (0.3, 0.045)]
        er = 0.016
        # rostro translúcido
        items.append(item(pts=P([(0.02, 0), (0.24, -0.04), (0.24, 0.04)]), fill='#FFFFFF', op=0.18, layer='marks', clip='body'))
    elif form == 'angel':    # cação-anjo (Squatina)
        half = P([(0.0, 0.0), (0.01, -0.08), (0.05, -0.13), (0.12, -0.15), (0.16, -0.145), (0.2, -0.2), (0.3, -0.32), (0.4, -0.37), (0.46, -0.33), (0.48, -0.2), (0.52, -0.15),
                  (0.6, -0.21), (0.68, -0.24), (0.72, -0.18), (0.74, -0.1), (0.85, -0.07), (1.1, -0.05), (1.3, -0.04)])
        body = mirror(half)
        cau = P([(1.26, -0.04), (1.36, -0.12), (1.45, -0.09), (1.47, 0.0), (1.45, 0.11), (1.36, 0.16), (1.26, 0.04)])
        items.append(item(pts=cau, corners={1, 5}, fill=fin, stroke=INK, sw=OUT_W * 0.8, layer='back'))
        for x0, L in ((0.98, 0.09), (1.14, 0.08)):
            items.append(item(pts=P([(x0, 0), (x0 + L * 0.35, -0.02), (x0 + L, 0), (x0 + L * 0.35, 0.02)]), corners={2}, fill=fin, stroke=INK, sw=1.8, layer='front'))
        eyes = [(0.09, -0.07), (0.09, 0.07)]
        er = 0.016
    body_it = item(pts=body, corners=tipc, fill='url(#gBody)', layer='body', id='body')
    items.append(body_it)
    items.append(item(pts=body, corners=tipc, stroke=INK, sw=OUT_W, layer='line'))
    # padrões
    xs = [p[0] for p in body]; ys = [p[1] for p in body]
    for m in spec.get('marks', []):
        n = m.get('n', 30)
        r0, r1 = m.get('r', (0.008, 0.016))
        k = 0
        placed = []
        while k < n * 40 and len(placed) < n:
            k += 1
            x = min(xs) + (max(xs) - min(xs)) * rng.random()
            y = min(ys) + (max(ys) - min(ys)) * rng.random()
            if not point_in(body, (x, y)):
                continue
            r = (r0 + (r1 - r0) * rng.random()) * S
            if any((x - a) ** 2 + (y - b) ** 2 < (r + c + 3) ** 2 for a, b, c in placed):
                continue
            placed.append((x, y, r))
            if m['type'] == 'spots':
                items.append(item(kind='circle', c=(x, y), r=r, fill=m['color'], op=m.get('op', 0.8), layer='marks', clip='body'))
            else:
                items.append(item(pts=blob(x, y, r, rng, irr=0.35, sx=1.2), fill=m['color'], op=m.get('op', 0.6), layer='marks', clip='body'))
        if m['type'] == 'ocelli':
            for (x, y, r) in m['at']:
                X, Y, R = x * S, y * S, r * S
                for yy in (Y, -Y):
                    items.append(item(kind='circle', c=(X, yy), r=R, fill=m['ring'], stroke=INK, sw=1.4, layer='marks', clip='body'))
                    items.append(item(kind='circle', c=(X, yy), r=R * 0.5, fill=m['color'], layer='marks', clip='body'))
    # dorso: linha central e brilho
    items.append(item(pts=P([(0.2, 0), (0.6, 0), (1.0, 0)]), closed=False, stroke='#FFFFFF', sw=5, op=0.16, layer='marks', clip='body', cap='round'))
    for ex, ey in eyes:
        c = (ex * S, ey * S)
        items.append(item(kind='circle', c=c, r=er * S, fill=spec.get('iris', '#C9A24A'), stroke=INK, sw=2.0, layer='eye'))
        items.append(item(kind='circle', c=c, r=er * S * 0.55, fill=INK, layer='eye'))
        items.append(item(kind='circle', c=(c[0] - er * S * 0.25, c[1] - er * S * 0.3), r=er * S * 0.2, fill='#FFFFFF', layer='eye'))
        # espiráculo
        items.append(item(kind='circle', c=(c[0] + er * S * 2.2, c[1] * 1.15), r=er * S * 0.5, fill=INK, op=0.55, layer='eye'))
    cfg = {'colors': C, 'id': spec['id'], 'name': spec.get('name', spec['id']), 'bend': None}
    return _render(None, (cfg, items))
