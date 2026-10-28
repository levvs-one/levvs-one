// Minimal PNG: an RGBA encoder for the generated images and a decoder for 8-bit
// non-interlaced inputs, enough to vectorise a logo.

import { deflateSync, inflateSync } from "node:zlib";

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function paeth(a, b, c) {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

export function encodePng(rgba, width, height) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  const zero = Buffer.alloc(stride);
  const trial = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const row = rgba.subarray(y * stride, (y + 1) * stride);
    const up = y ? rgba.subarray((y - 1) * stride, y * stride) : zero;
    // Pick the filter with the smallest sum of absolute residuals, the usual heuristic.
    let best = 0, bestScore = Infinity, bestRow = null;
    for (let f = 0; f < 5; f++) {
      let score = 0;
      for (let i = 0; i < stride; i++) {
        const a = i >= 4 ? row[i - 4] : 0, b = up[i], c = i >= 4 ? up[i - 4] : 0;
        const pred = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : paeth(a, b, c);
        const v = (row[i] - pred) & 0xff;
        trial[i] = v;
        score += v < 128 ? v : 256 - v;
      }
      if (score < bestScore) { bestScore = score; best = f; bestRow = Buffer.from(trial); }
    }
    raw[y * (stride + 1)] = best;
    bestRow.copy(raw, y * (stride + 1) + 1);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Returns { width, height, rgba } for 8-bit grey, grey+alpha, RGB or RGBA images.
export function decodePng(file) {
  let pos = 8, width = 0, height = 0, type = 0, palette = null;
  const idat = [];
  while (pos < file.length) {
    const len = file.readUInt32BE(pos);
    const kind = file.toString("ascii", pos + 4, pos + 8);
    const data = file.subarray(pos + 8, pos + 8 + len);
    if (kind === "IHDR") {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[12] !== 0) throw new Error("only 8-bit non-interlaced PNG");
      type = data[9];
    } else if (kind === "PLTE") palette = data;
    else if (kind === "IDAT") idat.push(data);
    pos += 12 + len;
  }
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type];
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    for (let i = 0; i < stride; i++) {
      const x = raw[y * (stride + 1) + 1 + i];
      const a = i >= channels ? px[y * stride + i - channels] : 0;
      const b = y ? px[(y - 1) * stride + i] : 0;
      const c = y && i >= channels ? px[(y - 1) * stride + i - channels] : 0;
      const pred = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : paeth(a, b, c);
      px[y * stride + i] = (x + pred) & 0xff;
    }
  }
  const rgba = Buffer.alloc(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    const s = px.subarray(p * channels, p * channels + channels);
    const [r, g, b, a] =
      type === 0 ? [s[0], s[0], s[0], 255] :
      type === 4 ? [s[0], s[0], s[0], s[1]] :
      type === 2 ? [s[0], s[1], s[2], 255] :
      type === 3 ? [palette[s[0] * 3], palette[s[0] * 3 + 1], palette[s[0] * 3 + 2], 255] :
      [s[0], s[1], s[2], s[3]];
    rgba.set([r, g, b, a], p * 4);
  }
  return { width, height, rgba };
}
