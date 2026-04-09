#!/usr/bin/env python3
"""Render the PWA icon and Apple splash PNGs using Pillow + Libre Baskerville TTF.
Re-run whenever the artwork changes."""

import os
import sys
import urllib.request
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
FONTS = ROOT / ".fonts"
PUBLIC.mkdir(exist_ok=True)
FONTS.mkdir(exist_ok=True)

ITALIC_TTF = FONTS / "LibreBaskerville-Italic.ttf"
REGULAR_TTF = FONTS / "LibreBaskerville-Regular.ttf"

ITALIC_URL = "https://fonts.gstatic.com/s/librebaskerville/v24/kmKWZrc3Hgbbcjq75U4uslyuy4kn0qNccR04_RUJeby2OU36SgNK.ttf"
REGULAR_URL = "https://fonts.gstatic.com/s/librebaskerville/v24/kmKUZrc3Hgbbcjq75U4uslyuy4kn0olVQ-LglH6T17uj8Q4SCQ.ttf"


def ensure_font(path: Path, url: str) -> None:
    if not path.exists():
        print(f"  downloading {path.name}")
        urllib.request.urlretrieve(url, path)


ensure_font(ITALIC_TTF, ITALIC_URL)
ensure_font(REGULAR_TTF, REGULAR_URL)


# ---------- helpers ----------

GREEN = (0, 107, 84, 255)        # #006B54
GOLD = (212, 175, 55, 255)       # #d4af37
CREAM = (247, 244, 239, 255)     # #f7f4ef
WHITE = (255, 255, 255, 255)
INK = (26, 46, 26, 255)          # #1a2e1a
MUTED = (122, 111, 94, 255)      # #7a6f5e


def with_alpha(rgba: tuple, alpha: float) -> tuple:
    r, g, b, _ = rgba
    return (r, g, b, int(round(alpha * 255)))


def rounded_rect(size: int, radius: int, fill: tuple) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=fill)
    return img


def load_font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size=size)


def draw_text_centered(draw: ImageDraw.ImageDraw, xy: tuple, text: str,
                        font: ImageFont.FreeTypeFont, fill: tuple,
                        letter_spacing: int = 0) -> None:
    """Center text horizontally on xy[0], baseline-ish on xy[1]."""
    cx, cy = xy
    if letter_spacing:
        # Manually space each character.
        widths = [draw.textbbox((0, 0), ch, font=font)[2] for ch in text]
        total = sum(widths) + letter_spacing * (len(text) - 1)
        x = cx - total / 2
        for ch, w in zip(text, widths):
            bbox = draw.textbbox((0, 0), ch, font=font)
            ch_h = bbox[3] - bbox[1]
            y = cy - ch_h / 2 - bbox[1]
            draw.text((x, y), ch, font=font, fill=fill)
            x += w + letter_spacing
        return
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    draw.text((cx - w / 2 - bbox[0], cy - h / 2 - bbox[1]), text, font=font, fill=fill)


def gradient_line(img: Image.Image, p1: tuple, p2: tuple, color: tuple,
                  width: int = 2, fade_to_left: bool = False) -> None:
    """Draws a horizontal line that fades to transparent at one end."""
    x1, y1 = p1
    x2, y2 = p2
    length = max(1, int(abs(x2 - x1)))
    line = Image.new("RGBA", (length, max(width, 1)), (0, 0, 0, 0))
    pixels = line.load()
    r, g, b, _ = color
    for i in range(length):
        t = i / max(1, length - 1)
        a = (1 - t) if fade_to_left else t
        for w in range(max(width, 1)):
            pixels[i, w] = (r, g, b, int(round(a * 255)))
    img.paste(line, (int(min(x1, x2)), int(y1 - width / 2)), line)


def make_icon(size: int, with_safe_zone: bool = False) -> Image.Image:
    """Render the app icon at the requested square size."""
    s = size
    radius = int(s * 0.1875) if not with_safe_zone else 0
    icon = rounded_rect(s, radius, GREEN)

    # Layout values were tuned at 512px; scale to whatever size we ask for.
    scale = s / 512.0

    # Maskable variant: render artwork inside an 80% safe zone so launchers
    # can crop the corners without losing the title.
    artwork_scale = 0.78 if with_safe_zone else 1.0
    layer = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    title_font = load_font(ITALIC_TTF, int(round(86 * scale * artwork_scale)))
    sub_font = load_font(ITALIC_TTF, int(round(34 * scale * artwork_scale)))
    year_font = load_font(REGULAR_TTF, int(round(20 * scale * artwork_scale)))

    cx = s / 2

    # "Mendoza's"
    draw_text_centered(draw, (cx, 215 * scale), "Mendoza\u2019s", title_font, WHITE)

    # "Masters Pool"
    draw_text_centered(
        draw, (cx, 290 * scale), "Masters Pool",
        sub_font, with_alpha(WHITE, 0.62),
    )

    # Decorative gold lines on either side of the flag pin (centered y=355)
    line_y = 355 * scale
    line_w = max(1, int(round(2 * scale)))
    gradient_line(layer, (115 * scale, line_y), (220 * scale, line_y), GOLD, width=line_w, fade_to_left=True)
    gradient_line(layer, (292 * scale, line_y), (397 * scale, line_y), GOLD, width=line_w, fade_to_left=False)

    # Flag pin centered on cx
    pin_top = 333 * scale
    pin_bot = 378 * scale
    pole_w = max(2, int(round(2 * scale)))
    draw.line([(cx, pin_top), (cx, pin_bot)], fill=GOLD, width=pole_w)
    # tiny base disk
    base_r = max(2, int(round(3 * scale)))
    draw.ellipse((cx - base_r, pin_bot - base_r, cx + base_r, pin_bot + base_r), fill=GOLD)
    # triangle flag
    flag_pts = [
        (cx + pole_w / 2, pin_top + 2 * scale),
        (cx + 32 * scale, pin_top + 11 * scale),
        (cx + pole_w / 2, pin_top + 20 * scale),
    ]
    draw.polygon(flag_pts, fill=GOLD)

    # "2026"
    draw_text_centered(
        draw, (cx, 448 * scale), "2026",
        year_font, with_alpha(WHITE, 0.42),
        letter_spacing=int(round(6 * scale)),
    )

    if with_safe_zone:
        # Composite artwork over a full-bleed green square (no rounding).
        bg = Image.new("RGBA", (s, s), GREEN)
        bg.alpha_composite(layer)
        return bg

    icon.alpha_composite(layer)
    return icon


def make_splash(width: int, height: int) -> Image.Image:
    img = Image.new("RGBA", (width, height), CREAM)
    draw = ImageDraw.Draw(img)

    cx = width / 2
    # Content cluster sits in the upper third, matching the live splash.
    cy = height * 0.36

    # Sizes scale roughly with the smaller dimension so the layout feels
    # consistent across iPhone sizes.
    base = min(width, height)

    title_size = int(round(base * 0.115))   # ~135 on a 1170-wide splash
    sub_size = int(round(base * 0.040))     # ~47
    date_size = int(round(base * 0.028))    # ~33
    tagline_size = int(round(base * 0.030)) # ~35

    title_font = load_font(ITALIC_TTF, title_size)
    sub_font = load_font(ITALIC_TTF, sub_size)
    date_font = load_font(REGULAR_TTF, date_size)
    tagline_font = load_font(ITALIC_TTF, tagline_size)

    line_h = int(round(title_size * 1.18))

    # Decorative divider above the title
    div_y = cy - line_h * 1.45
    half = base * 0.18
    gap = base * 0.025
    line_w = max(2, int(round(base * 0.0028)))
    gradient_line(img, (cx - half, div_y), (cx - gap, div_y), GREEN, width=line_w, fade_to_left=True)
    gradient_line(img, (cx + gap, div_y), (cx + half, div_y), GREEN, width=line_w, fade_to_left=False)
    r = max(6, int(round(base * 0.0095)))
    draw.ellipse((cx - r, div_y - r, cx + r, div_y + r),
                 outline=GREEN, width=max(2, int(round(base * 0.0035))))

    # Title — stacked "Mendoza's" / "Masters Pool"
    draw_text_centered(draw, (cx, cy - line_h * 0.55), "Mendoza\u2019s", title_font, GREEN)
    draw_text_centered(draw, (cx, cy + line_h * 0.45), "Masters Pool", title_font, GREEN)

    # Subtitle
    sub_y = cy + line_h * 1.45
    draw_text_centered(
        draw, (cx, sub_y), "Augusta National Golf Club",
        sub_font, with_alpha(INK, 0.85),
    )

    # Date
    date_y = sub_y + sub_size * 1.3
    draw_text_centered(
        draw, (cx, date_y), "APRIL 2026",
        date_font, MUTED, letter_spacing=int(round(base * 0.011)),
    )

    # Tagline with side lines — "A Tradition Unlike Any Other"
    tag_y = date_y + sub_size * 3.0
    tag_text = "\u201cA Tradition Unlike Any Other\u201d"
    bbox = draw.textbbox((0, 0), tag_text, font=tagline_font)
    tag_w = bbox[2] - bbox[0]
    side_pad = base * 0.025
    side_len = base * 0.075
    tag_line_w = max(1, int(round(base * 0.0018)))
    tag_color = (197, 187, 168, 255)  # #c5bba8 — matches footer divider
    gradient_line(
        img,
        (cx - tag_w / 2 - side_pad - side_len, tag_y),
        (cx - tag_w / 2 - side_pad, tag_y),
        tag_color, width=tag_line_w, fade_to_left=True,
    )
    gradient_line(
        img,
        (cx + tag_w / 2 + side_pad, tag_y),
        (cx + tag_w / 2 + side_pad + side_len, tag_y),
        tag_color, width=tag_line_w, fade_to_left=False,
    )
    draw_text_centered(
        draw, (cx, tag_y), tag_text,
        tagline_font, with_alpha(MUTED, 0.85),
    )

    return img


# ---------- generate ----------

print("→ Icons")
icon_512 = make_icon(512)
icon_512.save(PUBLIC / "icon-512.png", "PNG")
icon_512.resize((192, 192), Image.LANCZOS).save(PUBLIC / "icon-192.png", "PNG")
icon_512.resize((180, 180), Image.LANCZOS).save(PUBLIC / "apple-touch-icon.png", "PNG")
make_icon(512, with_safe_zone=True).save(PUBLIC / "icon-512-maskable.png", "PNG")

print("→ Apple splash screens")
SPLASH_SIZES = [
    (1290, 2796),  # iPhone 14/15/16 Pro Max
    (1170, 2532),  # iPhone 14/15/16 / Pro
    (750, 1334),   # iPhone SE / older
]
for w, h in SPLASH_SIZES:
    out = PUBLIC / f"apple-splash-{w}x{h}.png"
    make_splash(w, h).save(out, "PNG")
    print(f"  {out.name}")

print("✔ done")
