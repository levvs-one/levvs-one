// Sunlight through rippled water, counted where it lands on the pool floor.
//
// Every ray starts on a regular grid over the surface, refracts by Snell's law once per
// colour channel, loses its Fresnel reflection and its absorption along the path, and is
// added to the floor pixel it reaches. Bright lines are where the ripples focus the light.
// The waves repeat over the floor window, so rays that leave one edge land on the other.

export const DEPTH = 1.2;           // water depth, metres
const SS = 5;                       // rays per pixel along each axis
const LX = 2.4;                     // floor window width, metres
const SEED = 0x1e55;

// Water at 610, 550 and 465 nm. Indices are the ones Undine uses; absorption (1/m) is
// pure water after Pope and Fry (1997), rounded.
export const CHANNELS = [
  { nm: 610, n: 1.3327, absorb: 0.26 },
  { nm: 550, n: 1.3347, absorb: 0.057 },
  { nm: 465, n: 1.3387, absorb: 0.010 },
];

// Sun a little off vertical, from the upper left of the frame.
const SUN = normalize([0.18, -0.1, -1]);

function normalize([x, y, z]) {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
}

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Ripples: wavelengths 6 to 45 cm, mostly travelling with a light wind, each snapped to
// the floor window's lattice so the surface tiles exactly.
function makeWaves(count, steepness, ly) {
  const rand = mulberry32(SEED);
  const waves = [];
  const seen = new Set();
  const wind = 0.35;
  while (waves.length < count) {
    const lambda = 0.06 * Math.pow(0.45 / 0.06, rand());
    const theta = wind + (rand() + rand() + rand() - 1.5) * 1.6;
    const k = (2 * Math.PI) / lambda;
    const m = Math.round((k * Math.cos(theta) * LX) / (2 * Math.PI));
    const n = Math.round((k * Math.sin(theta) * ly) / (2 * Math.PI));
    if ((m === 0 && n === 0) || seen.has(`${m},${n}`)) continue;
    seen.add(`${m},${n}`);
    const kx = (2 * Math.PI * m) / LX;
    const ky = (2 * Math.PI * n) / ly;
    const amp = (steepness * (0.5 + rand())) / Math.hypot(kx, ky);
    waves.push({ kx, ky, amp, phase: rand() * 2 * Math.PI });
  }
  return waves;
}

// Irradiance on the floor per channel, W×H, where 1 is what a flat surface over clear
// water would give.
export function traceCaustics(W, H, { waves: count = 40, steepness = 0.018 } = {}) {
  const LY = (LX * H) / W;
  const waves = makeWaves(count, steepness, LY);
  const NX = W * SS, NY = H * SS;
  const dx = LX / NX, dy = LY / NY;
  const nw = waves.length;

  // cos/sin of each wave's phase along x and along y; their products give the full phase.
  const cx = new Float64Array(nw * NX), sx = new Float64Array(nw * NX);
  const cy = new Float64Array(nw * NY), sy = new Float64Array(nw * NY);
  for (let w = 0; w < nw; w++) {
    const { kx, ky, phase } = waves[w];
    for (let i = 0; i < NX; i++) {
      const a = kx * (i + 0.5) * dx;
      cx[w * NX + i] = Math.cos(a); sx[w * NX + i] = Math.sin(a);
    }
    for (let j = 0; j < NY; j++) {
      const b = ky * (j + 0.5) * dy + phase;
      cy[w * NY + j] = Math.cos(b); sy[w * NY + j] = Math.sin(b);
    }
  }
  const ak = waves.map(({ amp, kx, ky }) => [amp, amp * kx, amp * ky]);

  const floor = CHANNELS.map(() => new Float64Array(W * H));
  const [dX, dY, dZ] = SUN;
  const splat = (buf, px, py, v) => {
    const x0 = Math.floor(px), y0 = Math.floor(py);
    const fx = px - x0, fy = py - y0;
    const xa = ((x0 % W) + W) % W, xb = (xa + 1) % W;
    const ya = ((y0 % H) + H) % H, yb = (ya + 1) % H;
    buf[ya * W + xa] += v * (1 - fx) * (1 - fy);
    buf[ya * W + xb] += v * fx * (1 - fy);
    buf[yb * W + xa] += v * (1 - fx) * fy;
    buf[yb * W + xb] += v * fx * fy;
  };

  for (let j = 0; j < NY; j++) {
    const y = (j + 0.5) * dy;
    for (let i = 0; i < NX; i++) {
      const x = (i + 0.5) * dx;
      let h = 0, hx = 0, hy = 0;
      for (let w = 0; w < nw; w++) {
        const ca = cx[w * NX + i], sa = sx[w * NX + i];
        const cb = cy[w * NY + j], sb = sy[w * NY + j];
        const c = ca * cb - sa * sb;
        const s = sa * cb + ca * sb;
        const [a, akx, aky] = ak[w];
        h += a * s; hx += akx * c; hy += aky * c;
      }
      // Surface normal, pointing up into the air.
      const inv = 1 / Math.sqrt(hx * hx + hy * hy + 1);
      const nX = -hx * inv, nY = -hy * inv, nZ = inv;
      const cosI = -(dX * nX + dY * nY + dZ * nZ);

      for (let c = 0; c < CHANNELS.length; c++) {
        const { n, absorb } = CHANNELS[c];
        const eta = 1 / n;
        const cosT = Math.sqrt(1 - eta * eta * (1 - cosI * cosI));
        const f = eta * cosI - cosT;
        const tX = eta * dX + f * nX, tY = eta * dY + f * nY, tZ = eta * dZ + f * nZ;
        const path = (DEPTH + h) / -tZ;

        const rs = (cosI - n * cosT) / (cosI + n * cosT);
        const rp = (n * cosI - cosT) / (n * cosI + cosT);
        const weight = (1 - 0.5 * (rs * rs + rp * rp)) * Math.exp(-absorb * path);

        splat(floor[c], ((x + path * tX) / LX) * W - 0.5, ((y + path * tY) / LY) * H - 0.5, weight);
      }
    }
  }

  for (const buf of floor) for (let p = 0; p < buf.length; p++) buf[p] /= SS * SS;
  return floor;
}
