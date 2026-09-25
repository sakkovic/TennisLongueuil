// Builds the SaKKa.Tennis icon set from the emblem in assets/sakkatennis_logo.png.
// Run with: node scripts/generate-brand-assets.mjs
// The emblem is extracted as a mask (aqua = 1, background = 0), then re-rendered
// crisply at each size: supersampled bilinear mask + smoothstep edge.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';

const ASSETS = fileURLToPath(new URL('../assets/', import.meta.url));
// The source logo is an aqua emblem on black: those two colours are read only
// to extract the shape as a mask.
const BG = [4, 8, 11]; // #04080B background of sakkatennis_logo.png
const AQUA = [30, 207, 203]; // #1ECFCB emblem in sakkatennis_logo.png

// Brand palette the icons are painted with (see src/constants/theme.ts).
const INK = [26, 35, 28]; // #1A231C
const GREEN = [124, 179, 66]; // #7CB342
const LIME = [215, 242, 63]; // #D7F23F

// ---------------------------------------------------------------- PNG I/O
function decode(path) {
  const buf = readFileSync(path);
  let pos = 8,
    width,
    height,
    colorType;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const ch = { 2: 3, 6: 4 }[colorType];
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * ch;
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y += 1) {
    const f = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x += 1) {
      const a = x >= ch ? out[y * stride + x - ch] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= ch && y > 0 ? out[(y - 1) * stride + x - ch] : 0;
      let v = raw[y * (stride + 1) + 1 + x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c,
          pa = Math.abs(p - a),
          pb = Math.abs(p - b),
          pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * stride + x] = v & 255;
    }
  }
  return {
    width,
    height,
    get: (x, y) => [
      out[(y * width + x) * ch],
      out[(y * width + x) * ch + 1],
      out[(y * width + x) * ch + 2],
    ],
  };
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (b) => {
  let c = 0xffffffff;
  for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (t, d) => {
  const l = Buffer.alloc(4);
  l.writeUInt32BE(d.length);
  const body = Buffer.concat([Buffer.from(t), d]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc32(body));
  return Buffer.concat([l, body, c]);
};
function encode(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1)
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- emblem mask
const src = decode(ASSETS + 'sakkatennis_logo.png');
const axis = AQUA.map((v, i) => v - BG[i]);
const axisLen2 = axis.reduce((s, v) => s + v * v, 0);
const mask = new Float32Array(src.width * src.height);
let minX = src.width,
  minY = src.height,
  maxX = 0,
  maxY = 0;
for (let y = 0; y < src.height; y += 1) {
  for (let x = 0; x < src.width; x += 1) {
    const p = src.get(x, y);
    const t = Math.min(
      1,
      Math.max(0, p.reduce((s, v, i) => s + (v - BG[i]) * axis[i], 0) / axisLen2),
    );
    mask[y * src.width + x] = t;
    if (t > 0.5) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
}
const cx = (minX + maxX + 1) / 2,
  cy = (minY + maxY + 1) / 2;
const radius = Math.max(maxX - minX + 1, maxY - minY + 1) / 2;
console.log(
  `emblem: centre (${cx.toFixed(1)}, ${cy.toFixed(1)}), diameter ${(radius * 2).toFixed(1)} px`,
);

function maskAt(x, y) {
  // bilinear, x/y in source pixels
  const x0 = Math.floor(x - 0.5),
    y0 = Math.floor(y - 0.5),
    fx = x - 0.5 - x0,
    fy = y - 0.5 - y0;
  const m = (xx, yy) =>
    xx < 0 || yy < 0 || xx >= src.width || yy >= src.height ? 0 : mask[yy * src.width + xx];
  return (
    (m(x0, y0) * (1 - fx) + m(x0 + 1, y0) * fx) * (1 - fy) +
    (m(x0, y0 + 1) * (1 - fx) + m(x0 + 1, y0 + 1) * fx) * fy
  );
}
const smooth = (t) => {
  const u = Math.min(1, Math.max(0, (t - 0.38) / 0.24));
  return u * u * (3 - 2 * u);
};

/** Emblem coverage (0..1) at output pixel (px,py) for an emblem of `diameter` centred in `size`. */
function coverage(px, py, size, diameter, ss = 3) {
  let acc = 0;
  const scale = (radius * 2) / diameter;
  for (let sy = 0; sy < ss; sy += 1)
    for (let sx = 0; sx < ss; sx += 1) {
      const ox = px + (sx + 0.5) / ss - size / 2,
        oy = py + (sy + 0.5) / ss - size / 2;
      acc += smooth(maskAt(cx + ox * scale, cy + oy * scale));
    }
  return acc / (ss * ss);
}

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
/** Soft diagonal green gradient, brighter towards the bottom-right. */
const greenGradient = (x, y, size) =>
  mix(GREEN, LIME, Math.min(1, Math.max(0, ((x + y) / (2 * size)) * 0.85 - 0.05)));

function render(size, pixel) {
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = pixel(x, y);
      const o = (y * size + x) * 4;
      rgba[o] = Math.round(r);
      rgba[o + 1] = Math.round(g);
      rgba[o + 2] = Math.round(b);
      rgba[o + 3] = Math.round(a);
    }
  return encode(size, rgba);
}

// ---------------------------------------------------------------- outputs
const outputs = {
  // iOS / store icon: ink emblem on full-bleed green (the OS rounds the corners).
  'icon.png': render(1024, (x, y) => [
    ...mix(greenGradient(x, y, 1024), INK, coverage(x, y, 1024, 640)),
    255,
  ]),
  // Android adaptive icon: green background layer + ink emblem inside the safe zone.
  'android-icon-background.png': render(1024, (x, y) => [...greenGradient(x, y, 1024), 255]),
  'android-icon-foreground.png': render(1024, (x, y) => [...INK, 255 * coverage(x, y, 1024, 560)]),
  'android-icon-monochrome.png': render(1024, (x, y) => [
    255,
    255,
    255,
    255 * coverage(x, y, 1024, 560),
  ]),
  // Splash: green emblem on transparent; app.json sets the light background.
  'splash-icon.png': render(1024, (x, y) => [
    ...mix(GREEN, LIME, (y / 1024) * 0.5),
    255 * coverage(x, y, 1024, 1000),
  ]),
  'favicon.png': render(48, (x, y) => [
    ...mix(greenGradient(x, y, 48), INK, coverage(x, y, 48, 34, 6)),
    255,
  ]),
  // In-app emblem (hero, login, badges): green on transparent.
  'brand/emblem.png': render(512, (x, y) => [
    ...mix(GREEN, LIME, (y / 512) * 0.5),
    255 * coverage(x, y, 512, 500, 4),
  ]),
};

mkdirSync(ASSETS + 'brand', { recursive: true });
for (const [name, data] of Object.entries(outputs)) {
  writeFileSync(ASSETS + name, data);
  console.log(`${name}: ${Math.round(data.length / 1024)} KB`);
}
