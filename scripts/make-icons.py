"""Generates the app icons (Android, iOS, web) and the iOS launch image from plan/img.png.

Run from the repo root: python3 scripts/make-icons.py  (needs Pillow)
"""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent.parent
src = Image.open(root / 'plan/img.png').convert('RGBA')
BG = src.getpixel((8, 8))
# Paint over the small sparkle mark in the bottom-right corner of the artwork.
w = src.size[0]
ImageDraw.Draw(src).rectangle([round(w * 0.91), round(w * 0.91), w, w], fill=BG)
SS = 4  # supersampling for smooth mask edges


def squircle_mask(size, n=5.0):
    """iOS-like superellipse mask |x|^n + |y|^n <= 1."""
    big = size * SS
    m = Image.new('L', (big, big), 0)
    draw = ImageDraw.Draw(m)
    r = big / 2
    for y in range(big):
        dy = abs((y + 0.5 - r) / r) ** n
        if dy <= 1:
            half = (1 - dy) ** (1 / n) * r
            draw.line([(r - half, y), (r + half, y)], fill=255)
    return m.resize((size, size), Image.LANCZOS)


def art(size):
    return src.resize((size, size), Image.LANCZOS)


def rounded(size, inset=0.0):
    """The artwork in an iOS-style rounded square, transparent outside."""
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    inner = round(size * (1 - 2 * inset))
    a = art(inner)
    a.putalpha(squircle_mask(inner))
    off = (size - inner) // 2
    out.alpha_composite(a, (off, off))
    return out


def foreground(size):
    """Android adaptive icon foreground: artwork inside the 72/108 safe zone on its own background."""
    out = Image.new('RGBA', (size, size), BG)
    inner = round(size * 76 / 108)
    off = (size - inner) // 2
    out.alpha_composite(art(inner), (off, off))
    return out


res = root / 'android/app/src/main/res'
for d, s in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    icon = rounded(s, inset=1 / 24)  # legacy launcher icons keep a small margin
    icon.save(res / f'mipmap-{d}/ic_launcher.png')
    icon.save(res / f'mipmap-{d}/ic_launcher_round.png')
    foreground(s * 108 // 48).save(res / f'mipmap-{d}/ic_launcher_foreground.png')
(res / 'values/ic_launcher_background.xml').write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
    f'    <color name="ic_launcher_background">#{BG[0]:02X}{BG[1]:02X}{BG[2]:02X}</color>\n</resources>'
)

# iOS masks the icon itself and rejects transparency: a full-bleed opaque square.
assets = root / 'ios/App/App/Assets.xcassets'
art(1024).convert('RGB').save(assets / 'AppIcon.appiconset/AppIcon-512@2x.png')
splash = Image.new('RGBA', (2732, 2732), (255, 255, 255, 255))
splash.alpha_composite(rounded(448), ((2732 - 448) // 2, (2732 - 448) // 2))
for name in ('splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'):
    splash.convert('RGB').save(assets / 'Splash.imageset' / name)

rounded(192).save(root / 'public/icon.png')
art(180).convert('RGB').save(root / 'public/apple-touch-icon.png')
rounded(512).save(root / 'public/logo.png')
