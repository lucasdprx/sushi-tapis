"""Détoure une planche (fond clair uni ou damier) et découpe les éléments.
usage: slice.py planche.png prefixe nb_attendu [taille_sortie]
"""
import sys
from collections import deque
from PIL import Image

src, prefix, want = sys.argv[1], sys.argv[2], int(sys.argv[3])
size = int(sys.argv[4]) if len(sys.argv) > 4 else 128
im = Image.open(src).convert("RGBA")
W, H = im.size
px = im.load()

def is_bg(p):
    r, g, b, a = p
    return a < 10 or (min(r, g, b) > 205 and max(r, g, b) - min(r, g, b) < 18)

# remplissage depuis les bords : fond = clair et peu saturé, relié au bord
bg = bytearray(W * H)
q = deque()
for x in range(W):
    q.append((x, 0)); q.append((x, H - 1))
for y in range(H):
    q.append((0, y)); q.append((W - 1, y))
while q:
    x, y = q.popleft()
    i = y * W + x
    if bg[i] or not is_bg(px[x, y]):
        continue
    bg[i] = 1
    if x > 0: q.append((x - 1, y))
    if x < W - 1: q.append((x + 1, y))
    if y > 0: q.append((x, y - 1))
    if y < H - 1: q.append((x, y + 1))
for y in range(H):
    for x in range(W):
        if bg[y * W + x]:
            px[x, y] = (0, 0, 0, 0)

# composantes connexes (sur une image réduite pour aller vite)
step = 4
w2, h2 = W // step, H // step
solid = [[not bg[(y * step) * W + x * step] for x in range(w2)] for y in range(h2)]
seen = [[False] * w2 for _ in range(h2)]
boxes = []
for y0 in range(h2):
    for x0 in range(w2):
        if solid[y0][x0] and not seen[y0][x0]:
            q = deque([(x0, y0)]); seen[y0][x0] = True
            x1 = x2 = x0; y1 = y2 = y0; n = 0
            while q:
                x, y = q.popleft(); n += 1
                x1, x2, y1, y2 = min(x1, x), max(x2, x), min(y1, y), max(y2, y)
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    a, b = x + dx, y + dy
                    if 0 <= a < w2 and 0 <= b < h2 and solid[b][a] and not seen[b][a]:
                        seen[b][a] = True; q.append((a, b))
            boxes.append((n, x1 * step, y1 * step, (x2 + 1) * step, (y2 + 1) * step))
boxes = sorted(sorted(boxes, reverse=True)[:want], key=lambda b: (b[2] // (H // 3), b[1]))
print(len(boxes), "éléments")
for k, (_, x1, y1, x2, y2) in enumerate(boxes):
    crop = im.crop((x1, y1, x2, y2))
    s = size / max(crop.size)
    crop = crop.resize((max(1, round(crop.width * s)), max(1, round(crop.height * s))), Image.LANCZOS)
    out = Image.new("RGBA", (size, size))
    out.paste(crop, ((size - crop.width) // 2, (size - crop.height) // 2))
    out.save(f"{prefix}{k}.png")
    print(f"{prefix}{k}.png", (x1, y1, x2, y2))
