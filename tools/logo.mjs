// The Sora mark exists in its repository only as a PNG. This traces it into a path:
// marching squares on the ink coverage, then Douglas-Peucker to drop redundant points.

import { readFileSync } from "node:fs";
import { decodePng } from "./png.mjs";

export function traceMark(file) {
  const { width: w, height: h, rgba } = decodePng(readFileSync(file));
  // Ink is dark and opaque. Pad by one pixel so every contour closes.
  const W = w + 2, H = h + 2;
  const f = new Float32Array(W * H);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4;
      const lum = (rgba[p] + rgba[p + 1] + rgba[p + 2]) / 765;
      f[(y + 1) * W + x + 1] = (rgba[p + 3] / 255) * (1 - lum);
    }
  }
  const at = (x, y) => f[y * W + x];
  const T = 0.5;

  const points = new Map();
  const point = (key, x0, y0, x1, y1) => {
    if (!points.has(key)) {
      const a = at(x0, y0), b = at(x1, y1);
      const t = (T - a) / (b - a);
      points.set(key, [x0 + t * (x1 - x0) - 1, y0 + t * (y1 - y0) - 1]);
    }
    return key;
  };

  const links = new Map();
  const link = (a, b) => {
    (links.get(a) ?? links.set(a, []).get(a)).push(b);
    (links.get(b) ?? links.set(b, []).get(b)).push(a);
  };

  for (let j = 0; j < H - 1; j++) {
    for (let i = 0; i < W - 1; i++) {
      const tl = at(i, j) > T, tr = at(i + 1, j) > T, br = at(i + 1, j + 1) > T, bl = at(i, j + 1) > T;
      const kind = (tl << 3) | (tr << 2) | (br << 1) | bl;
      if (kind === 0 || kind === 15) continue;
      const top = () => point(`h${i},${j}`, i, j, i + 1, j);
      const bottom = () => point(`h${i},${j + 1}`, i, j + 1, i + 1, j + 1);
      const left = () => point(`v${i},${j}`, i, j, i, j + 1);
      const right = () => point(`v${i + 1},${j}`, i + 1, j, i + 1, j + 1);
      const centre = (at(i, j) + at(i + 1, j) + at(i + 1, j + 1) + at(i, j + 1)) / 4 > T;
      switch (kind) {
        case 1: case 14: link(left(), bottom()); break;
        case 2: case 13: link(bottom(), right()); break;
        case 3: case 12: link(left(), right()); break;
        case 4: case 11: link(top(), right()); break;
        case 6: case 9: link(top(), bottom()); break;
        case 7: case 8: link(top(), left()); break;
        case 5:
          if (centre) { link(top(), left()); link(bottom(), right()); }
          else { link(top(), right()); link(left(), bottom()); }
          break;
        case 10:
          if (centre) { link(top(), right()); link(left(), bottom()); }
          else { link(top(), left()); link(bottom(), right()); }
          break;
      }
    }
  }

  const loops = [];
  const seen = new Set();
  for (const start of links.keys()) {
    if (seen.has(start)) continue;
    const loop = [];
    let prev = null, cur = start;
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      loop.push(points.get(cur));
      const next = links.get(cur).find((k) => k !== prev && !seen.has(k));
      prev = cur; cur = next;
    }
    if (loop.length > 8) loops.push(simplifyLoop(loop, 0.35));
  }
  return { width: w, height: h, loops };
}

function simplifyLoop(loop, eps) {
  // Split the loop at its two most distant points and simplify each half.
  let far = 0, best = 0;
  for (let i = 1; i < loop.length; i++) {
    const d = Math.hypot(loop[i][0] - loop[0][0], loop[i][1] - loop[0][1]);
    if (d > best) { best = d; far = i; }
  }
  const a = simplify(loop.slice(0, far + 1), eps);
  const b = simplify([...loop.slice(far), loop[0]], eps);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

function simplify(pts, eps) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  const len = Math.hypot(bx - ax, by - ay) || 1;
  let idx = 0, max = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / len;
    if (d > max) { max = d; idx = i; }
  }
  if (max <= eps) return [pts[0], pts[pts.length - 1]];
  return [...simplify(pts.slice(0, idx + 1), eps).slice(0, -1), ...simplify(pts.slice(idx), eps)];
}

// Path data for the mark fitted into a size×size box at (x, y).
export function markPath({ width, height, loops }, x, y, size) {
  const s = size / Math.max(width, height);
  return loops
    .map((loop) => "M" + loop.map(([px, py]) => `${(x + px * s).toFixed(2)} ${(y + py * s).toFixed(2)}`).join("L") + "Z")
    .join("");
}
