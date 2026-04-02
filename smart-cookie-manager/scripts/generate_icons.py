from math import sqrt
from pathlib import Path
import struct
import zlib


OUT_DIR = Path(__file__).resolve().parent.parent / "icons"
SIZES = (16, 48, 128)
SUPERSAMPLE_BY_SIZE = {
    16: 8,
    48: 6,
    128: 4,
}


def clamp(value, low=0.0, high=1.0):
    return low if value < low else high if value > high else value


def mix(a, b, t):
    return tuple(a[i] * (1 - t) + b[i] * t for i in range(4))


def alpha_over(dst, src):
    src_a = src[3]
    dst_a = dst[3]
    out_a = src_a + dst_a * (1 - src_a)
    if out_a <= 1e-6:
        return (0.0, 0.0, 0.0, 0.0)
    return (
        (src[0] * src_a + dst[0] * dst_a * (1 - src_a)) / out_a,
        (src[1] * src_a + dst[1] * dst_a * (1 - src_a)) / out_a,
        (src[2] * src_a + dst[2] * dst_a * (1 - src_a)) / out_a,
        out_a,
    )


def point_in_polygon(x, y, points):
    inside = False
    last_index = len(points) - 1
    for index, (x1, y1) in enumerate(points):
        x2, y2 = points[last_index]
        crosses = ((y1 > y) != (y2 > y)) and (
            x < (x2 - x1) * (y - y1) / ((y2 - y1) or 1e-9) + x1
        )
        if crosses:
            inside = not inside
        last_index = index
    return inside


def distance_to_segment(px, py, ax, ay, bx, by):
    abx = bx - ax
    aby = by - ay
    apx = px - ax
    apy = py - ay
    length_sq = abx * abx + aby * aby
    if length_sq == 0:
      return sqrt((px - ax) ** 2 + (py - ay) ** 2)
    t = clamp((apx * abx + apy * aby) / length_sq)
    cx = ax + abx * t
    cy = ay + aby * t
    return sqrt((px - cx) ** 2 + (py - cy) ** 2)


def polygon_alpha(x, y, points):
    edge_distance = min(
        distance_to_segment(x, y, *points[index], *points[(index + 1) % len(points)])
        for index in range(len(points))
    )
    if point_in_polygon(x, y, points):
        return clamp(0.5 + edge_distance)
    return clamp(0.5 - edge_distance)


def circle_alpha(x, y, cx, cy, radius):
    return clamp(radius + 0.5 - sqrt((x - cx) ** 2 + (y - cy) ** 2))


def ring_alpha(x, y, cx, cy, outer_radius, inner_radius):
    return clamp(
        circle_alpha(x, y, cx, cy, outer_radius)
        - circle_alpha(x, y, cx, cy, inner_radius)
    )


def write_png(path, width, height, pixels):
    def chunk(tag, data):
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack("!I", len(data)) + tag + data + struct.pack("!I", crc)

    raw = bytearray()
    stride = width * 4
    for y in range(height):
        raw.append(0)
        raw.extend(pixels[y * stride:(y + 1) * stride])

    png = bytearray(b"\x89PNG\r\n\x1a\n")
    png.extend(chunk(b"IHDR", struct.pack("!2I5B", width, height, 8, 6, 0, 0, 0)))
    png.extend(chunk(b"IDAT", zlib.compress(bytes(raw), 9)))
    png.extend(chunk(b"IEND", b""))
    path.write_bytes(png)


def render_icon(size):
    supersample = SUPERSAMPLE_BY_SIZE.get(size, 4)
    width = height = size * supersample
    scale_x = width / 256.0
    scale_y = height / 256.0
    pixels = [(1.0, 1.0, 1.0, 0.0)] * (width * height)

    shield = [
        (128, 20), (200, 49), (200, 112), (192, 150), (174, 186),
        (128, 226), (82, 186), (64, 150), (56, 112), (56, 49),
    ]
    inner_shield = [
        (128, 34), (186, 58), (186, 112), (179, 144), (164, 174),
        (128, 205), (92, 174), (77, 144), (70, 112), (70, 58),
    ]
    chips = [
        (110, 111, 6.8, (0.24, 0.56, 0.96)),
        (146, 104, 5.8, (0.50, 0.74, 1.0)),
        (157, 129, 6.2, (0.11, 0.41, 0.87)),
        (141, 151, 5.2, (0.40, 0.69, 1.0)),
        (111, 148, 5.8, (0.55, 0.80, 1.0)),
        (99, 126, 4.8, (0.29, 0.62, 1.0)),
    ]

    def paint(px, py, color):
        index = py * width + px
        pixels[index] = alpha_over(pixels[index], color)

    for y in range(height):
        ny = (y + 0.5) / height
        for x in range(width):
            nx = (x + 0.5) / width
            background = mix(
                (0.96, 0.985, 1.0, 1.0),
                (0.89, 0.94, 1.0, 1.0),
                clamp(nx * 0.4 + ny * 0.9),
            )
            paint(x, y, background)

    for y in range(height):
        py = (y + 0.5) / scale_y
        for x in range(width):
            px = (x + 0.5) / scale_x

            shadow = polygon_alpha(px, py, [(sx, sy + 10) for sx, sy in shield]) * 0.20
            if shadow > 0:
                paint(x, y, (0.11, 0.36, 0.78, shadow))

            shield_alpha = polygon_alpha(px, py, shield)
            if shield_alpha > 0:
                gradient = clamp((px * 0.55 + py * 0.95) / 256.0)
                shield_color = mix(
                    (0.61, 0.82, 1.0, 1.0),
                    (0.11, 0.40, 0.87, 1.0),
                    gradient,
                )
                paint(x, y, (*shield_color[:3], shield_alpha))

            inner_glow = polygon_alpha(px, py, inner_shield) * 0.12
            if inner_glow > 0:
                paint(x, y, (1.0, 1.0, 1.0, inner_glow))

            top_glow = circle_alpha(px, py, 102, 84, 34) * 0.18
            if top_glow > 0:
                paint(x, y, (1.0, 1.0, 1.0, top_glow))

            cookie_outer = circle_alpha(px, py, 128, 128, 45)
            if cookie_outer > 0:
                cookie_gradient = clamp(((px - 90) * 0.7 + (py - 90)) / 120.0)
                cookie_color = mix(
                    (1.0, 1.0, 1.0, 1.0),
                    (0.88, 0.94, 1.0, 1.0),
                    cookie_gradient,
                )
                paint(x, y, (*cookie_color[:3], cookie_outer))

            cookie_inner = circle_alpha(px, py, 128, 128, 33)
            if cookie_inner > 0:
                paint(x, y, (0.97, 0.985, 1.0, cookie_inner * 0.96))

            cookie_ring = ring_alpha(px, py, 128, 128, 45, 41)
            if cookie_ring > 0:
                paint(x, y, (1.0, 1.0, 1.0, cookie_ring * 0.28))

            for cx, cy, radius, rgb in chips:
                chip_alpha = circle_alpha(px, py, cx, cy, radius)
                if chip_alpha > 0:
                    paint(x, y, (*rgb, chip_alpha))

            shine_distance = distance_to_segment(px, py, 170, 77, 157, 94)
            shine = clamp(3.2 - shine_distance) * 0.35
            if shine > 0:
                paint(x, y, (1.0, 1.0, 1.0, shine))

    output = bytearray()
    for out_y in range(size):
        for out_x in range(size):
            total = [0.0, 0.0, 0.0, 0.0]
            for sy in range(supersample):
                for sx in range(supersample):
                    r, g, b, a = pixels[(out_y * supersample + sy) * width + (out_x * supersample + sx)]
                    total[0] += r
                    total[1] += g
                    total[2] += b
                    total[3] += a
            samples = supersample * supersample
            output.extend(int(clamp(value / samples) * 255 + 0.5) for value in total)

    return output


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        pixels = render_icon(size)
        write_png(OUT_DIR / f"icon{size}.png", size, size, pixels)
        print(f"Generated icon{size}.png")


if __name__ == "__main__":
    main()
