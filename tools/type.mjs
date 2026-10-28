// Type as outlines. GitHub shows SVGs in a README as images that cannot load fonts, so
// every word in the graphics is set here and written out as a path.

import { readFileSync } from "node:fs";
import opentype from "opentype.js";

function load(name) {
  const b = readFileSync(new URL(`./fonts/${name}.ttf`, import.meta.url));
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}

export const FONTS = {
  serif: load("instrument-serif-400-normal"),
  serifItalic: load("instrument-serif-400-italic"),
  sans: load("instrument-sans-400-normal"),
  sansMedium: load("instrument-sans-500-normal"),
  sansSemibold: load("instrument-sans-600-normal"),
  mono: load("jetbrains-mono-400-normal"),
  monoMedium: load("jetbrains-mono-500-normal"),
};

// Glyphs with their pen positions; tracking is in ems.
function run(font, text, size, tracking = 0) {
  const glyphs = font.stringToGlyphs(text);
  const missing = [...text].filter((ch, i) => ch !== " " && glyphs[i]?.index === 0);
  if (missing.length) throw new Error(`${font.names.fullName?.en}: no glyph for "${missing.join("")}" in "${text}"`);
  const scale = size / font.unitsPerEm;
  const placed = [];
  let x = 0;
  for (let i = 0; i < glyphs.length; i++) {
    placed.push({ glyph: glyphs[i], x });
    x += glyphs[i].advanceWidth * scale + tracking * size;
    if (i + 1 < glyphs.length) x += font.getKerningValue(glyphs[i], glyphs[i + 1]) * scale;
  }
  return { placed, width: glyphs.length ? x - tracking * size : 0 };
}

export function measure(font, text, size, tracking = 0) {
  return run(font, text, size, tracking).width;
}

function origin(font, text, x, size, { tracking = 0, anchor = "start" }) {
  const r = run(font, text, size, tracking);
  const shift = anchor === "end" ? r.width : anchor === "middle" ? r.width / 2 : 0;
  return { ...r, x0: x - shift };
}

// SVG path data for one line of text with its baseline at y.
export function textPath(font, text, x, y, size, opts = {}) {
  const { placed, x0 } = origin(font, text, x, size, opts);
  return placed.map(({ glyph, x: gx }) => glyph.getPath(x0 + gx, y, size).toPathData(1)).join("");
}

// Outline commands for the rasteriser.
export function textCommands(font, text, x, y, size, opts = {}) {
  const { placed, x0 } = origin(font, text, x, size, opts);
  return placed.flatMap(({ glyph, x: gx }) => glyph.getPath(x0 + gx, y, size).commands);
}

export function wrap(font, text, size, maxWidth) {
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(font, next, size) > maxWidth) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

// Coverage of the outlines on a W×H grid: exact along each scanline, 8 scanlines a pixel.
export function rasterize(commands, W, H) {
  const edges = [];
  let sx = 0, sy = 0, px = 0, py = 0;
  const line = (x, y) => { if (y !== py) edges.push([px, py, x, y]); px = x; py = y; };
  for (const c of commands) {
    if (c.type === "M") { sx = px = c.x; sy = py = c.y; }
    else if (c.type === "L") line(c.x, c.y);
    else if (c.type === "Q") {
      const [x0, y0] = [px, py];
      for (let i = 1; i <= 12; i++) {
        const t = i / 12, u = 1 - t;
        line(u * u * x0 + 2 * u * t * c.x1 + t * t * c.x, u * u * y0 + 2 * u * t * c.y1 + t * t * c.y);
      }
    } else if (c.type === "C") {
      const [x0, y0] = [px, py];
      for (let i = 1; i <= 16; i++) {
        const t = i / 16, u = 1 - t;
        line(
          u * u * u * x0 + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x,
          u * u * u * y0 + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y,
        );
      }
    } else if (c.type === "Z") line(sx, sy);
  }

  const cover = new Float32Array(W * H);
  const S = 8;
  let top = H, bottom = 0;
  for (const [, y0, , y1] of edges) {
    top = Math.min(top, Math.floor(Math.min(y0, y1)));
    bottom = Math.max(bottom, Math.ceil(Math.max(y0, y1)));
  }
  for (let y = Math.max(0, top); y < Math.min(H, bottom); y++) {
    for (let k = 0; k < S; k++) {
      const ys = y + (k + 0.5) / S;
      const hits = [];
      for (const [x0, y0, x1, y1] of edges) {
        if ((ys >= y0 && ys < y1) || (ys >= y1 && ys < y0)) {
          hits.push([x0 + ((ys - y0) * (x1 - x0)) / (y1 - y0), y1 > y0 ? 1 : -1]);
        }
      }
      hits.sort((a, b) => a[0] - b[0]);
      let winding = 0;
      for (let i = 0; i < hits.length - 1; i++) {
        winding += hits[i][1];
        if (winding === 0) continue;
        const a = Math.max(0, hits[i][0]), b = Math.min(W, hits[i + 1][0]);
        for (let x = Math.floor(a); x < b; x++) {
          const span = Math.min(b, x + 1) - Math.max(a, x);
          if (span > 0) cover[y * W + x] += span / S;
        }
      }
    }
  }
  return cover;
}
