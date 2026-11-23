"""Fabrique les images de déco de la boutique en recolorant les images du jeu.
usage: python tools/deco.py   (depuis le dossier du jeu)"""
import colorsys
from PIL import Image


def recolor(src, dst, keep, change):
    im = Image.open(src).convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if keep(h * 360, s, v):
                h2, s2, v2 = change(h * 360, s, v)
                r2, g2, b2 = colorsys.hsv_to_rgb((h2 % 360) / 360, min(1, s2), min(1, v2))
                px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    im.save(dst)
    print(dst)


red = lambda h, s, v: (h < 18 or h > 340) and s > 0.45 and v > 0.25
# lanternes rouges -> dorées
recolor("assets/bg.png", "assets/bg_gold.png", red, lambda h, s, v: (44, s * 0.95, min(1, v * 1.15)))
# bandeau et col bleus du chef -> rouges
recolor("assets/chef0.png", "assets/chef_red.png", lambda h, s, v: 190 < h < 260 and s > 0.3, lambda h, s, v: (356, s, v * 1.05))
# rebord rouge du tapis -> bois
recolor("assets/belt3.png", "assets/belt_wood.png", red, lambda h, s, v: (28, s * 0.75, v * 0.85))
# plateaux en bois -> laque rouge
recolor("assets/column.png", "assets/column_red.png", lambda h, s, v: 10 < h < 50 and s > 0.25, lambda h, s, v: (356, min(1, s * 1.25), v * 0.95))
