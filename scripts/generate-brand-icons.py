"""Rebuild store/splash icons from the green emblem so they match the four-colour brand."""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
EMBLEM = Image.open(ASSETS / "brand" / "emblem.png").convert("RGBA")

INK = (0x1A, 0x23, 0x1C, 255)


def paste_centered(canvas: Image.Image, sprite: Image.Image, scale: float) -> None:
    size = max(1, int(canvas.width * scale))
    resized = sprite.resize((size, size), Image.Resampling.LANCZOS)
    x = (canvas.width - size) // 2
    y = (canvas.height - size) // 2
    canvas.alpha_composite(resized, (x, y))


def solid(size: int, color: tuple[int, int, int, int]) -> Image.Image:
    return Image.new("RGBA", (size, size), color)


def as_white(sprite: Image.Image) -> Image.Image:
    white = Image.new("RGBA", sprite.size, (255, 255, 255, 255))
    white.putalpha(sprite.getchannel("A"))
    return white


def save_rgb(image: Image.Image, path: Path) -> None:
    image.convert("RGB").save(path, "PNG")


# iOS / default app icon: full-bleed ink square, no rounded corners.
icon = solid(1024, INK)
paste_centered(icon, EMBLEM, 0.72)
save_rgb(icon, ASSETS / "icon.png")

# Web favicon
favicon = solid(196, INK)
paste_centered(favicon, EMBLEM, 0.72)
favicon.save(ASSETS / "favicon.png", "PNG")

# Splash image: green emblem on a transparent background (splash colour is ink).
EMBLEM.resize((1024, 1024), Image.Resampling.LANCZOS).save(ASSETS / "splash-icon.png", "PNG")

# Android adaptive layers. Foreground stays inside the 66% safe zone.
foreground = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
paste_centered(foreground, EMBLEM, 0.58)
foreground.save(ASSETS / "android-icon-foreground.png", "PNG")
save_rgb(solid(1024, INK), ASSETS / "android-icon-background.png")

monochrome = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
paste_centered(monochrome, as_white(EMBLEM), 0.58)
monochrome.save(ASSETS / "android-icon-monochrome.png", "PNG")

print("Wrote brand-matched icon, splash, favicon and Android adaptive layers.")
