import os
from PIL import Image, ImageDraw, ImageFont

icons_dir = "frontend/public/icons"
os.makedirs(icons_dir, exist_ok=True)

def generate_pwa_icon(size, filename):
    img = Image.new("RGBA", (size, size), (11, 17, 32, 255)) # #0B1120 deep navy
    draw = ImageDraw.Draw(img)

    margin = int(size * 0.1)
    
    # Outer circle gradient or glow
    draw.ellipse(
        [margin, margin, size - margin, size - margin],
        fill=(13, 148, 136, 255), # Teal
        outline=(45, 212, 191, 255), # Teal-400
        width=max(2, int(size * 0.02))
    )

    # Inner circle
    inner_margin = int(size * 0.18)
    draw.ellipse(
        [inner_margin, inner_margin, size - inner_margin, size - inner_margin],
        fill=(15, 23, 42, 255), # Slate-900
        outline=(56, 189, 248, 255), # Sky-400
        width=max(2, int(size * 0.015))
    )

    # Math Delta / Triangle
    cx, cy = size // 2, size // 2
    r = int(size * 0.22)
    # Equilateral triangle points (Greek Delta / Mathematics)
    p1 = (cx, cy - r)
    p2 = (cx - int(r * 0.866), cy + int(r * 0.5))
    p3 = (cx + int(r * 0.866), cy + int(r * 0.5))
    
    draw.polygon([p1, p2, p3], fill=(245, 158, 11, 230), outline=(251, 191, 36, 255))

    # Inner symbol or circle in the center of delta
    core_r = int(size * 0.06)
    draw.ellipse([cx - core_r, cy + int(r*0.05) - core_r, cx + core_r, cy + int(r*0.05) + core_r], fill=(255, 255, 255, 255))

    path = os.path.join(icons_dir, filename)
    img.save(path, "PNG")
    print(f"Generated: {path} ({size}x{size})")

generate_pwa_icon(192, "icon-192.png")
generate_pwa_icon(512, "icon-512.png")
generate_pwa_icon(192, "icon-192-maskable.png")
generate_pwa_icon(512, "icon-512-maskable.png")
