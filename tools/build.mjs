// Builds every image in assets/: the header, the Sora card, the project cards and the
// section labels, each in a light and a dark version. Run: npm run build

import { mkdirSync, writeFileSync } from "node:fs";
import { traceCaustics } from "./caustics.mjs";
import { decodePng, encodePng } from "./png.mjs";
import { markPath, traceMark } from "./logo.mjs";
import { FONTS, measure, rasterize, textCommands, textPath, wrap } from "./type.mjs";

const OUT = new URL("../assets/", import.meta.url);
mkdirSync(OUT, { recursive: true });
const write = (name, data) => {
  writeFileSync(new URL(name, OUT), data);
  console.log(`assets/${name}  ${(Buffer.byteLength(data) / 1024).toFixed(0)} KiB`);
};

const THEMES = {
  dark: {
    card: "#0e161c", node: "#111c23", stroke: "#22323c", rule: "#1b2830",
    title: "#eef3f6", body: "#a7b5bf", muted: "#6b7f8b", accent: "#7fd6e8",
    rays: ["#f0857a", "#8fd49b", "#79b4ff"],
  },
  light: {
    card: "#f6f9fa", node: "#ffffff", stroke: "#d3e0e5", rule: "#e0e9ec",
    title: "#0d1b22", body: "#3a4b55", muted: "#677a85", accent: "#0a7388",
    rays: ["#d4503f", "#2f9a4a", "#2f6fd6"],
  },
};

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const svg = (w, h, label, body, style = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">` +
  `<title>${esc(label)}</title>${style ? `<style>${style}</style>` : ""}${body}</svg>\n`;
const text = (font, s, x, y, size, fill, opts) => `<path fill="${fill}" d="${textPath(font, s, x, y, size, opts)}"/>`;
const arrow = (x, y, t) => `<path d="M${x - 7} ${y - 11}L${x} ${y}L${x + 7} ${y - 11}" fill="none" stroke="${t.muted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;

// ---------------------------------------------------------------- header

function header() {
  const W = 1600, H = 540, R = 28;
  const floor = traceCaustics(W, H);
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const srgb = (l) => 255 * (l <= 0.0031308 ? 12.92 * l : 1.055 * Math.max(0, l) ** (1 / 2.4) - 0.055);
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

  const looks = {
    // Night: a dark pool lit only by the focused light.
    dark: {
      shade: (e, c) => { const x = lin([7, 20, 28][c]) + 0.035 * e ** 2.4; return x / (1 + 0.6 * x); },
      plain: hex("#08131a"), title: hex("#eef3f6"), body: hex("#a7b5bf"), note: hex("#8fa6b3"),
    },
    // Day: a pale floor under the same light.
    light: {
      shade: (e, c) => 1 - Math.exp(-1.6 * lin([176, 224, 232][c]) * (0.8 + 0.4 * e ** 1.5)),
      plain: hex("#e8f2f4"), title: hex("#0d1b22"), body: hex("#3a4b55"), note: hex("#2f5560"),
    },
  };

  const X = 92;
  const lines = wrap(FONTS.sans, "I build Sora, an open VPN client for Windows and Linux, and optics and liquids for .NET and the GPU.", 36, 640);
  const layers = {
    title: rasterize(textCommands(FONTS.serif, "levvs", X - 8, 300, 260), W, H),
    body: rasterize(lines.flatMap((l, i) => textCommands(FONTS.sans, l, X, 376 + i * 48, 36)), W, H),
    note: rasterize(textCommands(FONTS.mono, "1.2 m of water at 610, 550 and 465 nm, traced by tools/caustics.mjs", W - 52, H - 40, 17, { anchor: "end" }), W, H),
  };

  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (const [name, look] of Object.entries(looks)) {
    const rgba = Buffer.alloc(W * H * 4);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = y * W + x;
        // The pool fades in from the left so the type sits on calm water, and calms again
        // under the caption in the corner.
        const m = smooth(560, 1180, x + 0.25 * (H - y)) * (1 - 0.8 * smooth(740, 860, x) * smooth(H - 120, H - 66, y));
        let px = [0, 1, 2].map((c) => look.plain[c] * (1 - m) + srgb(look.shade(floor[c][p], c)) * m);
        for (const [key, cover] of Object.entries(layers)) {
          const a = Math.min(1, cover[p]) * (key === "note" ? 0.75 : 1);
          if (a > 0) px = px.map((v, c) => v * (1 - a) + look[key][c] * a);
        }
        const cx = x < R ? R : x > W - R ? W - R : x + 0.5, cy = y < R ? R : y > H - R ? H - R : y + 0.5;
        const corner = Math.min(1, Math.max(0, R - Math.hypot(x + 0.5 - cx, y + 0.5 - cy) + 0.5));
        rgba.set([...px.map((v) => Math.round(Math.min(255, Math.max(0, v)))), Math.round(255 * corner)], p * 4);
      }
    }
    write(`header-${name}.png`, encodePng(rgba, W, H));
  }
}

// ---------------------------------------------------------------- Sora

const SORA_ROWS = [
  ["Engines", "sing-box, Xray and mihomo, picked per connection"],
  ["Protocols", "VLESS, VMess, Trojan, Shadowsocks, Hysteria2, TUIC, WireGuard, AmneziaWG"],
  ["Transports", "REALITY, XHTTP"],
  ["Kill switch", "nftables or WFP, and a strict mode that holds through a crash"],
  ["Sync", "LAN pairing by QR code over Noise_XX, no accounts, no cloud"],
];

function sora(t, mark) {
  const W = 1600, P = 72;
  const LEFT = 784, VX = P + 196, VW = LEFT - VX;
  let b = "";
  b += `<path fill="${t.title}" fill-rule="evenodd" d="${markPath(mark, P, P - 4, 76)}"/>`;
  b += text(FONTS.monoMedium, "MAIN PROJECT", P + 104, P + 28, 20, t.accent, { tracking: 0.14 });
  b += text(FONTS.mono, "github.com/levvs-one/sora", P + 104, P + 62, 20, t.muted);
  b += text(FONTS.serif, "Sora", P - 8, 318, 176, t.title);

  let y = 392;
  const lead = ["Open VPN client for Windows and Linux.", "Paste a subscription, pick a server, connect."];
  for (const line of lead.flatMap((l) => wrap(FONTS.sans, l, 33, LEFT - P))) {
    b += text(FONTS.sans, line, P, y, 33, t.body);
    y += 46;
  }
  y += 34;
  for (const [label, value] of SORA_ROWS) {
    b += `<line x1="${P}" y1="${y}" x2="${LEFT}" y2="${y}" stroke="${t.rule}" stroke-width="2"/>`;
    b += text(FONTS.monoMedium, label.toUpperCase(), P, y + 42, 18, t.muted, { tracking: 0.1 });
    const lines = wrap(FONTS.sans, value, 26, VW);
    lines.forEach((l, i) => { b += text(FONTS.sans, l, VX, y + 43 + i * 36, 26, t.title); });
    y += 43 + (lines.length - 1) * 36 + 30;
  }
  const bottom = y;

  // How the pieces fit, after docs/architecture.md in the Sora repository.
  const X0 = 868, DW = W - P - X0, half = (DW - 48) / 2, eng = (DW - 2 * 32) / 3;
  b += text(FONTS.monoMedium, "HOW IT FITS", X0, P + 28, 20, t.muted, { tracking: 0.14 });
  const top = 150, boxH = 100, engH = 80, tunH = 80;
  const gap = Math.max(64, (bottom - top - 2 * boxH - engH - tunH) / 3);
  const r1 = top, r2 = r1 + boxH + gap, r3 = r2 + boxH + gap, r4 = r3 + engH + gap;
  const box = (x, y, w, h, name, sub, hot) => {
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${t.node}" stroke="${hot ? t.accent : t.stroke}" stroke-width="2"/>`;
    if (sub) {
      s += text(FONTS.sansMedium, name, x + 24, y + 44, 27, t.title);
      s += text(FONTS.mono, sub, x + 24, y + 76, 18, t.muted);
    } else {
      s += text(FONTS.sansMedium, name, x + w / 2, y + h / 2 + 10, 27, t.title, { anchor: "middle" });
    }
    return s;
  };

  const ax = X0 + half / 2, bus = r3 - gap / 2;
  const engX = [0, 1, 2].map((i) => X0 + i * (eng + 32) + eng / 2);
  const flows = [
    `M${ax} ${r1 + boxH}V${r2}`,
    ...engX.map((x) => `M${ax} ${r2 + boxH}V${bus}H${x}V${r3}`),
    ...engX.map((x) => `M${x} ${r3 + engH}V${r4}`),
  ];
  const links = [
    `M${X0 + half} ${r1 + boxH / 2}H${X0 + half + 48}`,
    `M${X0 + half} ${r2 + boxH / 2}H${X0 + half + 48}`,
  ];
  for (const d of [...flows, ...links]) b += `<path d="${d}" fill="none" stroke="${t.stroke}" stroke-width="2"/>`;
  for (const d of flows) b += `<path class="flow" d="${d}" fill="none" stroke="${t.accent}" stroke-width="4" stroke-linecap="round" stroke-dasharray="0.1 22"/>`;
  b += arrow(ax, r2, t) + engX.map((x) => arrow(x, r3, t) + arrow(x, r4, t)).join("");
  b += text(FONTS.mono, "gRPC", ax + 16, (r1 + boxH + r2) / 2 + 6, 18, t.muted);

  b += box(X0, r1, half, boxH, "Sora app", "Flutter");
  b += box(X0 + half + 48, r1, half, boxH, "sora-sync", "Noise_XX on the LAN");
  b += box(X0, r2, half, boxH, "sora-core", "Go service", true);
  b += box(X0 + half + 48, r2, half, boxH, "Kill switch", "nftables or WFP");
  ["sing-box", "Xray", "mihomo"].forEach((n, i) => { b += box(X0 + i * (eng + 32), r3, eng, engH, n); });
  b += box(X0, r4, DW, tunH, "TUN adapter or system proxy");

  const H = Math.max(bottom, r4 + tunH) + P - 8;
  const frame = `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="28" fill="${t.card}" stroke="${t.stroke}" stroke-width="2"/>`;
  const style = ".flow{animation:flow 1.6s linear infinite}@keyframes flow{to{stroke-dashoffset:-22.1}}@media (prefers-reduced-motion:reduce){.flow{animation:none}}";
  return svg(W, H, "Sora: open VPN client for Windows and Linux. The Flutter app talks gRPC to sora-core, a Go service that runs sing-box, Xray or mihomo behind a TUN adapter or system proxy and keeps the kill switch on nftables or WFP.", frame + b, style);
}

// ---------------------------------------------------------------- project cards

const PROJECTS = [
  { id: "traverce", name: "Traverce", label: "Windows 10 and 11", stack: "Flutter, zapret2, WinDivert",
    text: "Reach the services you need without a system VPN: zapret2 for YouTube and Discord, Smart DNS for AI services, a local proxy for Telegram." },
  { id: "sora-legacy", name: "Sora Legacy", label: "Windows 7 SP1 to 11", stack: "C#, .NET Framework 4.8, Go",
    text: "Sora for older Windows on x86. Installs per user, without admin rights, and checks its own prerequisites." },
  { id: "caustikon", name: "Caustikon", label: ".NET 8 and 10", stack: "C#, Blazor, WebGL",
    text: "Real optical glass: 1646 catalog glasses and nine liquids with dispersion, absorption and colour. Every number cited." },
  { id: "undine", name: "Undine", label: "GPU, Unity, Unreal, Godot", stack: "C#, GLSL, HLSL",
    text: "Liquids that move and are lit like the real thing: viscous waves on the GPU, light per colour channel, caustics from refracted rays." },
  { id: "carryall", name: "Carryall", label: "Windows, CLI", stack: "C#, WPF",
    text: "Prepare, verify and hand over files. Copies with a readable manifest and SHA-256 for each, originals untouched." },
  { id: "diptych", name: "Diptych", label: "Windows 11", stack: "C#, WPF, PDFium",
    text: "Before and after photo reports for site visits, with a PDF that is checked byte for byte before handover." },
  { id: "humanizer", name: "Humanizer", label: "Alpha, desktop and CLI", stack: "TypeScript, Tauri, Rust",
    text: "Describe how an assistant should think and write once, then compile it for ChatGPT, Claude, Gemini and their APIs." },
  { id: "llms-txt-snapshots", name: "llms.txt snapshots", label: "Dataset", stack: "Python, CC0 data",
    text: "A reproducible field study of /llms.txt, robots.txt and the signals AI agents use to discover a site." },
];

// Small line drawings, each in a 104×104 box.
const ART = {
  traverce: (t) =>
    `<path d="M4 52H34C52 52 54 18 72 18H96M34 52H96" fill="none" stroke="${t.accent}" stroke-width="2.5" stroke-linecap="round"/>` +
    `<path d="M34 52C52 52 54 86 72 86H96" fill="none" stroke="${t.muted}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="2 7"/>` +
    `<circle cx="98" cy="18" r="5" fill="${t.accent}"/><circle cx="98" cy="52" r="5" fill="${t.accent}"/><circle cx="98" cy="86" r="5" fill="${t.muted}"/>`,
  "sora-legacy": (t) =>
    [[4, 14, t.muted], [18, 30, t.muted], [32, 46, t.accent]].map(([x, y, c]) =>
      `<rect x="${x}" y="${y}" width="68" height="50" rx="6" fill="${t.card}" stroke="${c}" stroke-width="2.5"/><line x1="${x}" y1="${y + 13}" x2="${x + 68}" y2="${y + 13}" stroke="${c}" stroke-width="2.5"/>`).join(""),
  caustikon: (t) =>
    `<path d="M14 92L52 14L90 92Z" fill="none" stroke="${t.muted}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<path d="M0 66L33 52L66 60" fill="none" stroke="${t.title}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` +
    t.rays.map((c, i) => `<path d="M66 ${60 + i}L104 ${64 + i * 10}" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>`).join(""),
  undine: (t) =>
    [48, 32, 16].map((rx, i) => `<ellipse cx="52" cy="76" rx="${rx}" ry="${rx / 3}" fill="none" stroke="${t.accent}" stroke-width="2.5" opacity="${0.4 + i * 0.3}"/>`).join("") +
    `<path d="M52 8C60 22 64 30 64 37A12 12 0 0 1 40 37C40 30 44 22 52 8Z" fill="${t.accent}"/>`,
  carryall: (t) =>
    `<path d="M10 28H40L48 38H94V92H10Z" fill="none" stroke="${t.muted}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<path d="M34 64L47 77L72 52" fill="none" stroke="${t.accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
  diptych: (t) =>
    `<rect x="4" y="22" width="44" height="60" rx="5" fill="none" stroke="${t.muted}" stroke-width="2.5" stroke-dasharray="5 5"/>` +
    `<rect x="56" y="22" width="44" height="60" rx="5" fill="none" stroke="${t.accent}" stroke-width="2.5"/>` +
    `<path d="M10 72L22 56L30 64L42 48M62 72L74 56L82 64L94 48" fill="none" stroke="${t.muted}" stroke-width="2" stroke-linejoin="round"/>`,
  humanizer: (t) =>
    `<path d="M26 12C14 12 18 44 6 52C18 60 14 92 26 92M78 12C90 12 86 44 98 52C86 60 90 92 78 92" fill="none" stroke="${t.muted}" stroke-width="2.5" stroke-linecap="round"/>` +
    [[36, 72, t.accent], [36, 58, t.body], [36, 66, t.body]].map(([x, x2, c], i) => `<line x1="${x}" y1="${38 + i * 14}" x2="${x2}" y2="${38 + i * 14}" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>`).join(""),
  "llms-txt-snapshots": (t) =>
    `<path d="M20 6H64L86 28V98H20Z" fill="none" stroke="${t.muted}" stroke-width="2.5" stroke-linejoin="round"/><path d="M64 6V28H86" fill="none" stroke="${t.muted}" stroke-width="2.5" stroke-linejoin="round"/>` +
    [[32, 74, t.accent], [32, 66, t.body], [32, 70, t.body], [32, 56, t.body]].map(([x, x2, c], i) => `<line x1="${x}" y1="${44 + i * 13}" x2="${x2}" y2="${44 + i * 13}" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>`).join(""),
};

function card(p, t) {
  const W = 720, H = 400, P = 44;
  const lines = wrap(FONTS.sans, p.text, 27, W - 2 * P);
  if (lines.length > 3) throw new Error(`${p.id}: description needs ${lines.length} lines`);
  let b = `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="22" fill="${t.card}" stroke="${t.stroke}" stroke-width="2"/>`;
  b += text(FONTS.monoMedium, p.label.toUpperCase(), P, 76, 19, t.muted, { tracking: 0.1 });
  b += text(FONTS.serif, p.name, P - 2, 158, 66, t.title);
  lines.forEach((l, i) => { b += text(FONTS.sans, l, P, 216 + i * 38, 27, t.body); });
  b += `<line x1="${P}" y1="${H - 86}" x2="${W - P}" y2="${H - 86}" stroke="${t.rule}" stroke-width="2"/>`;
  b += text(FONTS.mono, p.stack, P, H - 40, 20, t.muted);
  b += `<path d="M${W - P - 16} ${H - 40}L${W - P} ${H - 56}M${W - P - 13} ${H - 56}H${W - P}V${H - 43}" fill="none" stroke="${t.accent}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  b += `<g transform="translate(${W - P - 104} ${P})">${ART[p.id](t)}</g>`;
  return svg(W, H, `${p.name}: ${p.text}`, b);
}

// ---------------------------------------------------------------- section labels

const LABELS = { network: "Network", light: "Light and liquids", tools: "Tools", ship: "How I ship" };

function label(name, t) {
  const W = 1600, H = 80, s = name.toUpperCase();
  const w = measure(FONTS.monoMedium, s, 22, 0.16);
  const b = text(FONTS.monoMedium, s, 2, 50, 22, t.muted, { tracking: 0.16 }) +
    `<line x1="${w + 30}" y1="42" x2="${W}" y2="42" stroke="${t.rule}" stroke-width="2"/>`;
  return svg(W, H, name, b);
}

// ---------------------------------------------------------------- screenshot

// Sora's own screenshot, given the same corners and outline as the cards.
async function screenshot(name, t) {
  const url = `https://raw.githubusercontent.com/levvs-one/sora/main/docs/images/home-1440x900-${name}.png`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const { width: W, height: H, rgba } = decodePng(Buffer.from(await res.arrayBuffer()));
  const R = 26, line = [1, 3, 5].map((i) => parseInt(t.stroke.slice(i, i + 2), 16));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cx = x < R ? R : x > W - R ? W - R : x + 0.5, cy = y < R ? R : y > H - R ? H - R : y + 0.5;
      const d = R - Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const inner = Math.min(x + 0.5, y + 0.5, W - x - 0.5, H - y - 0.5);
      const edge = Math.max(0, Math.min(1, 2.5 - Math.min(d, inner)));
      const p = (y * W + x) * 4;
      for (let c = 0; c < 3; c++) rgba[p + c] = Math.round(rgba[p + c] * (1 - edge) + line[c] * edge);
      rgba[p + 3] = Math.round(rgba[p + 3] * Math.min(1, Math.max(0, d + 0.5)));
    }
  }
  write(`sora-screen-${name}.png`, encodePng(rgba, W, H));
}

// ----------------------------------------------------------------

const mark = traceMark(new URL("./sora-mark.png", import.meta.url));
for (const [name, t] of Object.entries(THEMES)) {
  write(`sora-${name}.svg`, sora(t, mark));
  for (const p of PROJECTS) write(`card-${p.id}-${name}.svg`, card(p, t));
  for (const [id, s] of Object.entries(LABELS)) write(`label-${id}-${name}.svg`, label(s, t));
  await screenshot(name, t);
}
header();
