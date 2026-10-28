<pre>
Independent Submission                                             levvs
Request for Comments: 1                                     October 2026
Category: Informational


<b>                     What I Build and How I Ship It</b>

<b>Abstract</b>

   I build Sora, an open VPN client for Windows and Linux, and smaller
   things around networks, optics and files.  This memo lists the
   public ones and the rules every release follows.

<b>Status of This Memo</b>

   This memo is the profile of one developer.  It is not an Internet
   Standard, and it is revised whenever something ships.

<b>Table of Contents</b>

   1.  Sora . . . . . . . . . . . . . . . . . . . . . . . . . . . .    2
   2.  Network  . . . . . . . . . . . . . . . . . . . . . . . . . .    3
   3.  Light and Liquids  . . . . . . . . . . . . . . . . . . . . .    3
   4.  Tools  . . . . . . . . . . . . . . . . . . . . . . . . . . .    3
   5.  Security Considerations  . . . . . . . . . . . . . . . . . .    4
   6.  References . . . . . . . . . . . . . . . . . . . . . . . . .    4
   Author's Address . . . . . . . . . . . . . . . . . . . . . . . .    4


levvs                        Informational                      [Page 1]

RFC 1                    What I Build and Ship              October 2026


<b>1.  Sora</b>

   Sora [<a href="https://github.com/levvs-one/sora">SORA</a>] is an open VPN client for Windows and Linux: paste a
   subscription link, pick a server, connect.  It is my main project.

   The app never touches the network itself.  Everything that needs
   privileges runs in sora-core, a Go service that the app drives
   over gRPC.

      +-----------+   HTTP, localhost   +-----------+   Noise_XX
      | Sora app  |--------------------&gt;| sora-sync |---&gt; your other
      | Flutter   |                     +-----------+     computers
      +-----+-----+
            |
            | gRPC, local socket or named pipe
            v
      +-----------+                     +--------------+
      | sora-core |--------------------&gt;| kill switch  |
      | Go        |                     | nftables/WFP |
      +-----+-----+                     +--------------+
            |
      +-----+--------------+--------------------+
      |                    |                    |
  +---v------+        +----v-----+        +-----v----+
  | sing-box |        |   Xray   |        |  mihomo  |
  +---+------+        +----+-----+        +-----+----+
      |                    |                    |
      +--------------------+--------------------+
                           |
                           v
               TUN adapter or system proxy

                  Figure 1: How the parts of Sora fit

   Engines      sing-box, Xray and mihomo, picked per connection.

   Protocols    VLESS, VMess, Trojan, Shadowsocks, Hysteria2, TUIC,
                WireGuard, AmneziaWG.  Transports REALITY and XHTTP.

   Kill switch  nftables on Linux, WFP on Windows.  Strict mode keeps
                traffic blocked after a crash, until you disconnect.

   Sync         Between your computers on the LAN, paired by QR code
                over Noise_XX.  No accounts, no cloud.

   Extensions   A catalog of signed extensions.  Permissions are
                confirmed when you install one.

   Systems      Windows 10 1809 and later, Debian, Ubuntu, Fedora,
                openSUSE, Arch.  Windows 7 SP1 to 11 on x86 run
                Sora Legacy [<a href="https://github.com/levvs-one/sora-legacy">SORA-LEGACY</a>].


levvs                        Informational                      [Page 2]

RFC 1                    What I Build and Ship              October 2026


<b>2.  Network</b>

   Traverce [<a href="https://github.com/levvs-one/traverce">TRAVERCE</a>] reaches the services you need on Windows 10
   and 11 without a system VPN.  Each service gets one mechanism, and
   all other traffic goes direct:

   o  zapret2 over WinDivert, for YouTube and Discord;

   o  Smart DNS through NRPT rules, for ChatGPT, Gemini, Claude,
      Copilot and Spotify;

   o  a local MTProto-over-WebSocket proxy, for Telegram Desktop.

<b>3.  Light and Liquids</b>

   Caustikon [<a href="https://github.com/levvs-one/caustikon">CAUSTIKON</a>] is real optical glass for .NET: 1646 catalog
   glasses and nine liquids with dispersion, absorption and colour,
   every number cited.  It runs in the browser at <a href="https://caustikon.levvs.cc">caustikon.levvs.cc</a>.

   Undine [<a href="https://github.com/levvs-one/undine">UNDINE</a>] is liquids on the GPU: a surface with the liquid's
   own viscosity, light refracted per colour channel, and caustics
   from refracted rays rather than a texture.  Shaders for WebGL,
   Unity, Unreal and Godot.  The pool is live at <a href="https://undine.levvs.cc">undine.levvs.cc</a>.

<b>4.  Tools</b>

   Carryall [<a href="https://github.com/levvs-one/carryall">CARRYALL</a>]
      Prepare, verify and hand over files: copies with a readable
      manifest and SHA-256 for each, originals untouched.

   Diptych [<a href="https://github.com/levvs-one/diptych">DIPTYCH</a>]
      Before and after photo reports for site visits, with a PDF
      checked byte for byte before handover.

   Humanizer [<a href="https://github.com/levvs-one/humanizer">HUMANIZER</a>]
      Describe once how an assistant should think and write, then
      compile it for ChatGPT, Claude, Gemini and their APIs.  Alpha.

   llms.txt snapshots [<a href="https://github.com/levvs-one/llms-txt-snapshots">LLMS-TXT</a>]
      A reproducible field study of /llms.txt, robots.txt and the
      signals AI agents use to discover a site.


levvs                        Informational                      [Page 3]

RFC 1                    What I Build and Ship              October 2026


<b>5.  Security Considerations</b>

   Release builds ship with SHA-256 sums.  Sora's install scripts and
   its updater refuse any file whose sum does not match.

   Nothing is code-signed yet.  Until it is, the checksums and the
   build steps in each repository are the proof of what was built.

   Sora and Traverce send no telemetry.  Carryall and Diptych work
   offline and never modify the files they are given.

   Every public repository runs CI on push and on pull requests.

<b>6.  References</b>

   [<a href="https://github.com/levvs-one/sora">SORA</a>]         levvs, "Sora", &lt;<a href="https://github.com/levvs-one/sora">https://github.com/levvs-one/sora</a>&gt;.

   [<a href="https://github.com/levvs-one/sora-legacy">SORA-LEGACY</a>]  levvs, "Sora Legacy",
                  &lt;<a href="https://github.com/levvs-one/sora-legacy">https://github.com/levvs-one/sora-legacy</a>&gt;.

   [<a href="https://github.com/levvs-one/traverce">TRAVERCE</a>]     levvs, "Traverce",
                  &lt;<a href="https://github.com/levvs-one/traverce">https://github.com/levvs-one/traverce</a>&gt;.

   [<a href="https://github.com/levvs-one/caustikon">CAUSTIKON</a>]    levvs, "Caustikon",
                  &lt;<a href="https://github.com/levvs-one/caustikon">https://github.com/levvs-one/caustikon</a>&gt;.

   [<a href="https://github.com/levvs-one/undine">UNDINE</a>]       levvs, "Undine",
                  &lt;<a href="https://github.com/levvs-one/undine">https://github.com/levvs-one/undine</a>&gt;.

   [<a href="https://github.com/levvs-one/carryall">CARRYALL</a>]     levvs, "Carryall",
                  &lt;<a href="https://github.com/levvs-one/carryall">https://github.com/levvs-one/carryall</a>&gt;.

   [<a href="https://github.com/levvs-one/diptych">DIPTYCH</a>]      levvs, "Diptych",
                  &lt;<a href="https://github.com/levvs-one/diptych">https://github.com/levvs-one/diptych</a>&gt;.

   [<a href="https://github.com/levvs-one/humanizer">HUMANIZER</a>]    levvs, "Humanizer",
                  &lt;<a href="https://github.com/levvs-one/humanizer">https://github.com/levvs-one/humanizer</a>&gt;.

   [<a href="https://github.com/levvs-one/llms-txt-snapshots">LLMS-TXT</a>]     levvs, "llms.txt snapshots",
                  &lt;<a href="https://github.com/levvs-one/llms-txt-snapshots">https://github.com/levvs-one/llms-txt-snapshots</a>&gt;.

<b>Author's Address</b>

   levvs

   Telegram:  <a href="https://t.me/levvs_one">@levvs_one</a>
   Sora news: <a href="https://t.me/sora_client">@sora_client</a>


levvs                        Informational                      [Page 4]
</pre>
