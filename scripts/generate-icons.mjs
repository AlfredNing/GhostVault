/**
 * Generates extension icons (public/icons/icon{16,32,48,128}.png).
 *
 * Zero npm dependencies: the ghost-lock mark is rasterized by a tiny
 * software renderer and encoded to PNG with node:zlib. Node has no canvas,
 * so we intentionally avoid OffscreenCanvas/createImageBitmap here.
 *
 * Usage: node scripts/generate-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "icons");
const SIZES = [16, 32, 48, 128];

// Brand palette (matches GhostLogo.tsx / icon background).
const BG = [14, 14, 18]; // #0e0e12
const GHOST_TOP = [165, 180, 252]; // #a5b4fc
const GHOST_BOTTOM = [129, 140, 248]; // #818cf8

// All geometry is defined in a 48x48 design space.
const cx = 24;
const headR = 15;
const headCy = 21;
const bodyLeft = cx - headR;
const bodyRight = cx + headR;
const bodyBottom = 38.5;

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function roundedRectSdf(x, y, size, radius) {
  const half = size / 2;
  const qx = Math.abs(x - half) - (half - radius);
  const qy = Math.abs(y - half) - (half - radius);
  return (
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
    Math.min(Math.max(qx, qy), 0) -
    radius
  );
}

/** Returns 1 inside the ghost silhouette, 0 outside. */
function insideGhost(x, y) {
  // Head (top dome).
  if (y <= headCy && dist(x, y, cx, headCy) <= headR) return true;
  // Body column.
  if (x >= bodyLeft && x <= bodyRight && y >= headCy && y <= bodyBottom) {
    // Wavy bottom: three bumps hanging below bodyBottom.
    const bumpR = 2.6;
    for (const bumpCx of [13.9, 24, 34.1]) {
      if (dist(x, y, bumpCx, bodyBottom - 0.4) <= bumpR + 1.4) return true;
    }
    // Scalloped notches between bumps.
    for (const notchCx of [18.95, 29.05]) {
      if (dist(x, y, notchCx, bodyBottom + 1.1) <= 2.2) return false;
    }
    return true;
  }
  return false;
}

/** Returns 1 inside the keyhole (cut-out), 0 outside. */
function insideKeyhole(x, y) {
  if (dist(x, y, 24, 22) <= 4) return true;
  // Stem: widening trapezoid from y=24.5 down to y=32.4.
  if (y >= 24.5 && y <= 32.4) {
    const t = (y - 24.5) / (32.4 - 24.5);
    const halfW = 1.6 + t * 1.5;
    if (x >= 24 - halfW && x <= 24 + halfW) return true;
  }
  return false;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function renderIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const cornerRadius = size * 0.23;
  const scale = 48 / size;
  const SS = 4; // 4x4 supersampling

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          // Map pixel space (0..size) into the 48x48 design space.
          const x = (px + (sx + 0.5) / SS) * scale;
          const y = (py + (sy + 0.5) / SS) * scale;
          // Outside rounded square → fully transparent.
          if (roundedRectSdf(x, y, 48, cornerRadius * scale) > 0) {
            continue;
          }
          a += 1;
          if (insideGhost(x, y) && !insideKeyhole(x, y)) {
            const t = Math.min(Math.max((y - 6) / 36, 0), 1);
            r += lerp(GHOST_TOP[0], GHOST_BOTTOM[0], t);
            g += lerp(GHOST_TOP[1], GHOST_BOTTOM[1], t);
            b += lerp(GHOST_TOP[2], GHOST_BOTTOM[2], t);
          } else {
            r += BG[0];
            g += BG[1];
            b += BG[2];
          }
        }
      }

      const samples = SS * SS;
      const idx = (py * size + px) * 4;
      if (a === 0) continue;
      pixels[idx] = Math.round(r / a);
      pixels[idx + 1] = Math.round(g / a);
      pixels[idx + 2] = Math.round(b / a);
      pixels[idx + 3] = Math.round((a / samples) * 255);
    }
  }
  return pixels;
}

// ---------------------------------------------------------------------------
// Minimal PNG encoder
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Filter type 0 per scanline.
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const size of SIZES) {
    const png = encodePng(size, size, renderIcon(size));
    const file = path.join(OUT_DIR, `icon${size}.png`);
    writeFileSync(file, png);
    console.log(`✔ ${path.relative(ROOT, file)} (${png.length} bytes)`);
  }
}

main();
