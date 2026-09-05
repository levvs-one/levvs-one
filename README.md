# levvs

Local-first Windows tools and networking software, mostly in C#. Most of my work is client projects that are not public; the repositories below are the part I can show.

Every release here ships with `SHA256SUMS.txt`, a pinned SDK in `global.json`, and build steps you can rerun yourself.

## Projects

| Project | What it does | Stack |
|---|---|---|
| [**Sora**](https://github.com/levvs-one/sora-client) | Proxy and VPN client for Windows 7 SP1 through 11, built on v2rayN 5.39. Per-subscription management, system proxy, latency checks, one codebase with per-version installer profiles. | C# · WPF · Inno Setup · GPL-3.0 |
| [**Caustikon**](https://github.com/levvs-one/caustikon) | Allocation-free geometric optics for .NET: vector refraction, exact Fresnel reflectance, Cauchy and Sellmeier dispersion. Scalar and span APIs over caller-owned memory, .NET 8 and 10, no runtime dependencies. | C# · MIT |
| [**Diptych**](https://github.com/levvs-one/diptych) | Before/after photo reports for site visits. Originals stay untouched, PDF images are re-encoded without EXIF/GPS, and the output bytes are hash-verified before handover. | C# · WPF · PDFium · MIT |
| [**Carryall**](https://github.com/levvs-one/carryall) | File handover workbench: inventory, renamed copies, a folder or ZIP with a human-readable manifest, and SHA-256 verification of every written copy. | C# · WPF · MIT |
| [**llms.txt snapshots**](https://github.com/levvs-one/llms-txt-snapshots) | Reproducible field study of `/llms.txt`, `robots.txt` and AI-agent discovery signals across 30 public origins. Dated runs, derived metadata, no republished response bodies. | Python · CC0 data · MIT code |

## How I ship

- CI runs on every push in every repository above.
- Builds are not code-signed yet, so each release carries checksums and the exact commands that produced it.
- Compatibility is a feature, not a legacy burden: Sora still targets Windows 7 SP1 on x86.
- Originals are never modified by tools that touch user files.

## Elsewhere

[levvs.cc](https://levvs.cc) · [Telegram](https://t.me/levvs_one)
