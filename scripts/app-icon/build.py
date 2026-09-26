"""Regenerate the PWA launcher icons from the official Dilchap logo.

Source: logo-icon-source.png (the brand's red "di" + bell tile). The white
glyph is extracted and re-laid on a full-bleed square of the brand red,
inside the maskable safe zone (the OS applies its own rounded/circle mask,
so the icon itself must be opaque and edge-to-edge).

    python scripts/app-icon/build.py   (from the Frontend folder, needs Pillow)
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

HERE = Path(__file__).parent
PUBLIC = HERE.parent.parent / 'public'

src = Image.open(HERE / 'logo-icon-source.png').convert('RGBA')
r, g, b, a = src.split()
# Brand red, sampled inside the tile away from the glyph.
red = src.getpixel((src.width // 8, src.height // 8))[:3]
# White glyph = high green AND blue on opaque pixels (the red tile has neither).
mask = ImageChops.multiply(ImageChops.multiply(g, b), a.point(lambda v: 255 if v else 0))
mask = mask.point(lambda v: max(0, min(255, int((v - 10) * 1.05))))
mask = mask.crop(mask.point(lambda v: 255 if v > 128 else 0).getbbox())

N = 1024
gh = int(N * 0.56)                       # glyph height: stays inside the 80% safe circle
gw = round(mask.width * gh / mask.height)
master = Image.new('RGB', (N, N), red)
master.paste(Image.new('RGB', (gw, gh), (255, 255, 255)), ((N - gw) // 2 - 12, (N - gh) // 2 - 10), mask.resize((gw, gh), Image.LANCZOS))
master.save(HERE / 'icon-1024.png', optimize=True)

for size, name in ((512, 'icon-512.png'), (192, 'icon-192.png'), (180, 'apple-touch-icon.png')):
    master.resize((size, size), Image.LANCZOS).save(PUBLIC / name, optimize=True)

# Browser tab favicon: tabs don't mask, so round it ourselves.
fav = master.resize((256, 256), Image.LANCZOS).convert('RGBA')
corner = Image.new('L', (256, 256), 0)
ImageDraw.Draw(corner).rounded_rectangle((0, 0, 255, 255), radius=56, fill=255)
fav.putalpha(corner)
fav.resize((48, 48), Image.LANCZOS).save(PUBLIC / 'favicon.png', optimize=True)
print('icons written to', PUBLIC)
