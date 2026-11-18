#!/usr/bin/env python3
import zlib
import struct
import math
import os

def generate_shiftpulse_icon(size):
    width = height = size
    center = size / 2.0
    radius = size * 0.44
    inner_radius = size * 0.28
    
    # We will compute each pixel (RGBA)
    pixels = bytearray()
    
    for y in range(height):
        pixels.append(0) # PNG scanline filter byte: 0 (None)
        dy = y - center
        for x in range(width):
            dx = x - center
            dist = math.sqrt(dx * dx + dy * dy)
            angle = math.atan2(dy, dx) # -pi to pi
            
            # Rounded squircle background
            sq_x = abs(dx) / (size * 0.48)
            sq_y = abs(dy) / (size * 0.48)
            corner_power = (sq_x ** 4 + sq_y ** 4) ** 0.25
            
            if corner_power <= 1.0:
                # Background gradient: Indigo to Slate
                norm_y = y / height
                r = int(79 * (1 - norm_y) + 15 * norm_y)
                g = int(70 * (1 - norm_y) + 23 * norm_y)
                b = int(229 * (1 - norm_y) + 42 * norm_y)
                a = 255
                
                # Outer circle track
                if abs(dist - radius * 0.85) < (size * 0.03):
                    if dx < 0:
                        # Sun gold arc
                        r, g, b = 245, 158, 11
                    else:
                        # Moon cyan arc
                        r, g, b = 56, 189, 248
                
                # Center dial
                if dist <= inner_radius:
                    dial_norm = dist / inner_radius
                    r = int(30 + 15 * dial_norm)
                    g = int(27 + 25 * dial_norm)
                    b = int(75 + 60 * dial_norm)
                    
                    # Dial border
                    if abs(dist - inner_radius) < (size * 0.02):
                        r, g, b = 99, 102, 241
                        
                    # Center pin
                    if dist <= (size * 0.04):
                        r, g, b = 251, 191, 36
                    else:
                        # Clock Hands
                        # Hour hand (pointing ~ 7 o'clock, dx < 0, dy > 0)
                        hour_angle = 2.1 # radians (~ 120 deg)
                        diff_h = abs(angle - hour_angle)
                        if diff_h < 0.2 and dist < (inner_radius * 0.7):
                            r, g, b = 255, 255, 255
                            
                        # Minute hand (pointing up, ~ -1.57 rad)
                        min_angle = -1.5708
                        diff_m = abs(angle - min_angle)
                        if diff_m < 0.16 and dist < (inner_radius * 0.9):
                            r, g, b = 56, 189, 248
                            
                pixels.extend([r, g, b, a])
            else:
                # Outside squircle -> Transparent
                pixels.extend([0, 0, 0, 0])
                
    def chunk(chunk_type, data):
        return struct.pack('>I', len(data)) + chunk_type + data + struct.pack('>I', zlib.crc32(chunk_type + data) & 0xffffffff)

    header = b'\x89PNG\r\n\x1a\n'
    # 8-bit depth, color type 6 (RGBA)
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    idat = chunk(b'IDAT', zlib.compress(bytes(pixels), 9))
    iend = chunk(b'IEND', b'')
    return header + ihdr + idat + iend

out_dir = os.path.join(os.path.dirname(__file__), '..', 'public')
for s, filename in [(192, 'pwa-192x192.png'), (512, 'pwa-512x512.png'), (180, 'apple-touch-icon.png')]:
    path = os.path.join(out_dir, filename)
    data = generate_shiftpulse_icon(s)
    with open(path, 'wb') as f:
        f.write(data)
    print(f"Generated {filename} ({len(data)} bytes)")
