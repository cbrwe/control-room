# ND75 Control App — Project Plan

## The thesis

The ND75 has fantastic hardware crippled by terrible software. The official "web driver" is unmaintained, broken in places (the Time Sync button literally does nothing), Windows-only for the native app, and doesn't work on Mac for many users. Every feature requires memorizing arcane key combos. The LCD screen is a hardware standout but the software treats it like a battery indicator.

We build the controller that should have shipped with this keyboard, push it to all three platforms, and open-source the protocol work so the keyboard community has a real tool for this hardware.

---

## Architecture: one codebase, three shells

```
┌─────────────────────────────────────────────────────────────────┐
│  React + TypeScript UI                                          │
│  (same code runs in browser, Tauri Mac, Tauri Windows)          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                ┌──────────┴──────────┐
                │  HIDAdapter interface │  ← single TS interface, swappable
                └──────────┬──────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   WebHIDAdapter       TauriAdapter        TauriAdapter
   (browser)           (Mac, Rust hidapi)  (Windows, Rust hidapi)
```

**Why this stack:**

- **Single React + TS frontend** means we ship UI improvements to all three platforms simultaneously. One bug fix, three patched apps.
- **Tauri 2** for desktop because we need menu bar / tray, native window chrome, OS notifications, and persistent background connection. Electron would balloon installer size to 150+ MB; Tauri is ~15 MB. Tauri also gets us a real Rust HID layer via `hidapi-rs`, which is rock-solid on all OSes.
- **`hidapi-rs`** for the desktop HID layer because it handles macOS HID quirks correctly (the part the official driver fumbles). Exposed to the JS frontend via Tauri commands: `hid_list_devices`, `hid_open`, `hid_send_feature_report`, `hid_read_feature_report`.
- **WebHID** for the browser version. Same TS protocol code; the only difference is `navigator.hid.requestDevice(...)` vs the Tauri bridge.
- **Vercel** deployment for the web build, under HVW8 Labs / G2 Holdings (matches existing infrastructure).

### Repo layout

```
nd75-control/
├── packages/
│   ├── protocol/          # Pure TS — protocol primitives, no UI, no platform
│   │   ├── src/
│   │   │   ├── commands.ts    # All 0x04 0xXX opcodes
│   │   │   ├── keycodes.ts    # The 170-entry keycode table
│   │   │   ├── keymap.ts      # Layer encode/decode
│   │   │   ├── rgb.ts         # Lighting state encoder
│   │   │   ├── tft.ts         # Image → 64-byte chunks
│   │   │   ├── device.ts      # ND75Device class
│   │   │   └── adapter.ts     # HIDAdapter interface
│   │   └── test/              # Unit tests against captured packets
│   ├── ui/                # Shared React components
│   │   └── src/
│   │       ├── views/         # KeyMapper, LightingStudio, ScreenStudio…
│   │       ├── components/    # primitives
│   │       └── hooks/         # useDevice, useLayer…
│   ├── web/               # Vite app — deploys to Vercel
│   │   └── src/
│   │       ├── adapter-webhid.ts
│   │       └── main.tsx
│   └── desktop/           # Tauri 2 app — Mac + Windows
│       ├── src/           # React entry with adapter-tauri.ts
│       └── src-tauri/     # Rust crate with hidapi commands
└── docs/
    └── ND75_PROTOCOL_SPEC.md
```

This is the standard monorepo shape Cody is already running on the Brandbook and Sublurk projects, so it slots into existing tooling (pnpm workspaces, GitHub Actions, Vercel for web).

---

## What we solve that the official driver doesn't

| Problem | Source | Our fix |
|---|---|---|
| Time sync is broken | Gadgetoid review confirmed via dev tools | Reverse the actual config-write packet and ship a working sync. Auto-sync on connect. |
| Mac users get nothing | Reddit + Chilkey product page comments | First-class native Mac app. |
| Mode switch needs 3-second key combo | Manual | One tap in the menu bar. |
| 19 RGB modes have machine-translated Chinese names | Manual | Curated cleaner names, originals preserved as subtitles. |
| No way to remap `Fn+F12` → `F12` | Manual layer system | Visual layer 0 / layer 1 editor; remap anything to anything. |
| LCD screen is "kind of janky" | Gadgetoid review | Live widget system — clock that's actually right, weather, Now Playing, calendar, system stats, custom text/scroll. |
| No profile system | N/A | Multiple named profiles, switch with a hotkey or auto by app. |
| No community sharing | N/A | Export/import JSON profiles, optional public gallery. |
| `Fn+= / Fn+-` for LCD nav obscures the screen | Gadgetoid review | Eliminate the need entirely — control LCD from the app. |
| You don't know which mode is active | Manual | Show in tray icon + menu bar. |
| 9 colors, 6 brightness levels — no fine control | Manual | Full color picker, fine sliders, per-key painting. |
| Macros not exposed in web driver | Bundle inspection | Macro recorder with playback timing. |
| Sleep timer can't be set in UI | Manual says "the software can adjust the sleep time" but the UI doesn't expose it | Real slider. |
| Browser/media/launcher remaps are possible but hidden | Bundle has all the consumer-page codes | Full picker, organized: Keyboard / Mouse / Media / Browser / System / Macro. |

---

## Feature scope — by phase

### Phase 1: Foundation (week 1–2)

Goal: a connected, beautiful, working app that does everything the official driver does — but correctly, on all three platforms.

- Device detect + connect (USB only — Bluetooth/2.4G has no config channel)
- Read both layers, display visual 75% layout
- Click any key → keycode picker (full 170-entry catalog organized by category)
- Modifier combos (Ctrl+C, Shift+Win+S, etc.)
- Per-key RGB color picker + global mode selector with live preview
- Brightness, speed, direction sliders
- Read firmware version, serial, battery
- Push/save profile to keyboard
- Beautiful empty/connect state with the keyboard rendered in 3D-ish illustration

### Phase 2: Make the LCD useful (week 3–4)

This is the wow-factor phase. The LCD becomes a programmable widget surface.

- **Image/GIF uploader** with built-in cropper, palette tuning, dithering options
- **Live widgets** — push a new image to the LCD on a timer:
  - Real clock (and date) — fixes the broken official sync
  - Weather (current temp + icon, location auto-detected)
  - Now Playing — macOS `MediaRemote.framework` and Windows `SMTC` API, track + artist + album art crop
  - Calendar next event — via macOS EventKit / Windows AppointmentStore
  - System stats — CPU, RAM, network, battery
  - Custom text — typed message, optional scrolling marquee
  - Stocks/crypto ticker
  - Pomodoro timer with live countdown
  - Discord status / GitHub notif count (with auth)
  - RSS headline ticker
- **Widget composer** — drag-and-drop, layer text over images, choose fonts (we ship a small set of pixel-friendly fonts)
- **Theme library** — pre-made aesthetic packs (Minimal, Y2K, Cyberpunk, Coffee, Nature)

### Phase 3: Power user (week 5–6)

- **Macro recorder** — record key sequences with timing, edit, assign to any key
- **Profile manager** — multiple named profiles, switch with a hotkey
- **Per-app profiles** — auto-switch when Slack focuses vs. VSCode vs. Photoshop
- **Sleep timer + battery thresholds**
- **Win lock toggle** in app
- **Win/Mac system mode toggle** (instead of `Fn+A` / `Fn+S`)
- **Diagnostic panel** — packet log, firmware info, raw HID console for hackers
- **Backup/restore** — full keyboard state to JSON

### Phase 4: Community (week 7+)

- **Profile gallery** — share/download public profiles
- **Widget marketplace** — community-built LCD widgets with sandboxed runtime
- **Theme gallery**
- **One-click "install"** — click a link, app opens, profile loaded
- **GitHub: open-source the protocol library** under MIT, ship spec docs, grow contributors

---

## Distribution

| Platform | How |
|---|---|
| Web | Deploy `packages/web` to Vercel under HVW8 Labs. Subdomain on existing G2 Holdings domain. WebHID works in Chrome/Edge/Arc/Brave; gracefully tell Safari/Firefox users to use a Chromium browser. |
| macOS | Tauri 2 build → `.dmg` → notarized via existing G2 Holdings LLC Apple Developer enrollment. Auto-update via Tauri updater. |
| Windows | Tauri 2 build → `.msi` and `.exe`. Code signing optional (SmartScreen warns without it; we can either get a cert or ship unsigned for v1). |
| Source | GitHub repo, MIT licensed protocol package + GPL-compatible app code. |

---

## Naming options

His brand DNA is single-word, declarative, generic-noun-with-charge (CURRENT, BATCH, STOCK, ARTICLE, D2COPY). Same shape for this:

1. **GLYPH** — every key is a glyph; the LCD displays glyphs. Domain-friendly (`glyph.app`, `glyph.dev`). Pairs with a typographic logo. Cleanest fit.
2. **MARQUEE** — directly evokes the LCD ticker, has retro charm, longer.
3. **STAGE** — you stage your keyboard. Plays on "production" and "performance" both.

GLYPH is my pick. Specific to the product category without being literal, monosyllabic, works as a verb ("glyph it"), and pairs visually with monospace/pixel fonts that fit the keyboard aesthetic.

---

## What I build first

Once you pick a name, the first commit is the protocol package (`packages/protocol/`) — pure TypeScript, zero UI, zero platform code. We can validate every command against the bundle's reference implementation. Once that's solid we layer the React UI on top.

Concrete first deliverables:

1. `pnpm` workspace scaffold with the three packages
2. `ND75Device` class with `connect()`, `readKeymap(layer)`, `writeKeymap(layer, map)`, `setRGB(state)`, `setPerKeyRGB(colors)`, `uploadImage(buffer)`, `setConfig(...)`, `endTransaction()`
3. Full keycode catalog as a typed enum + category groupings for the UI picker
4. Unit tests that produce byte-for-byte identical packets to the official bundle for known operations
5. WebHID adapter so we can test against the actual keyboard in a browser before touching Tauri
