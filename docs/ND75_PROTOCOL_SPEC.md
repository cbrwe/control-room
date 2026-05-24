# Chilkey ND75 — Reverse-Engineered HID Protocol Spec

Source: extracted from `https://nd75.ndnhkey.com/assets/index-B9pz2FVL.js` (the official web configurator).

The Chilkey-supplied console left Chinese debug log strings in the production bundle, which translate cleanly and gave us a complete map of every command. Nothing is encrypted.

---

## 1. Device identification

| Field | Value |
|---|---|
| USB Vendor ID | `0x36B5` |
| USB Product ID | `0x2BA7` |
| HID Usage Page | `0xFF13` (vendor-defined) |
| HID Usage | `0x01` |

The keyboard exposes multiple HID interfaces. The configurator opens two:

- `device` — control/config channel (commands begin with `0x04`)
- `device3` — TFT raw pixel stream channel (no command prefix, used after the screen has been put into stream mode via `0x04 0x72`)

Both must be `open()`'d. Connection only works over USB-C wired; Bluetooth and 2.4G dongle do not expose this interface.

---

## 2. Wire format

All control packets are **64-byte HID Feature Reports** with Report ID `0`.

Use `sendFeatureReport(0, Uint8Array(64))` to write, `receiveFeatureReport(0)` to read responses.

Standard layout:

| Byte | Field | Notes |
|---|---|---|
| 0 | Category | Always `0x04` for ND75 commands |
| 1 | Command code | See command table below |
| 2 | Sub/flag byte | Used by some commands (e.g. `0x04 0x72` puts `0x02` here) |
| 8 | Param / packet count | For multi-packet commands, this is the packet count (typically `9`) |
| 9 | Param (high byte) | Used by `0x04 0x72` for image length high byte |
| 10–61 | Payload | Per-command |
| 62 | Last-packet magic | `0xAA` (170) on the final packet of a multi-packet sequence |
| 63 | Last-packet magic | `0x55` (85) on the final packet of a multi-packet sequence |

Every interaction follows this dance:

1. Send `0x04 0x18` (or `0x04 0x19` for RGB modes) — "begin transaction"
2. Receive ACK
3. Send the actual command (e.g. `0x04 0x11` to write keymap layer 0)
4. Receive ACK
5. Stream N payload packets (typically 9 for keymap)
6. Send `0x04 0x02` — "end transaction"
7. Receive final ACK

Sleep ~5–50 ms between packets. The bundle uses `setTimeout(... 5)` for most steps and `setTimeout(... 50)` between keymap data packets.

---

## 3. Complete command table

All commands start with byte `0x04`. The second byte is the opcode.

| Opcode | Direction | Name | Function |
|---|---|---|---|
| `0x01` | tx | (unknown init) | Found in sweep, purpose unconfirmed |
| `0x02` | tx + rx | END | End transaction / handshake close. ACK byte `[3] == 0x01` on success. |
| `0x05` | tx + rx | DEVICE_INFO | Read firmware version. Response: `VType = "V" + r[9]*10 + r[8]`. Also chained with `0x04 0xF0` (serial). |
| `0x10` | tx + rx | READ_KEYMAP_L0 | Read base layer keymap. Response is 9 × 64-byte packets streamed back. |
| `0x11` | tx | WRITE_KEYMAP_L0 | Write base layer keymap. Send 9 × 64-byte payload packets after the opcode packet. |
| `0x12` | tx + rx | READ_RGB_STATE | Read current global RGB state (mode/brightness/speed/dir/color). |
| `0x13` | tx | WRITE_RGB_STATE | Write global RGB state. Payload (in a single 64-byte packet): `r, g, b, …, colorFull@[8], brightness@[9], speed@[10], dir@[11]`. |
| `0x15` | tx | WRITE_RGB_PERKEY | Write per-key RGB lighting. Variable packet count, terminator `[62]=0xAA, [63]=0x55`. |
| `0x18` | tx + rx | BEGIN_TX | Standard transaction-begin handshake for most writes. |
| `0x19` | tx + rx | BEGIN_TX_RGB | Alternate transaction-begin used by `WRITE_RGB_PERKEY`. |
| `0x26` | tx + rx | READ_KEYMAP_L1 | Read FN layer keymap. 9 packets. |
| `0x27` | tx | WRITE_KEYMAP_L1 | Write FN layer keymap. 9 packets. |
| `0x28` | tx | WRITE_CONFIG | Write misc settings byte-packet (sleep timer, system-mode, etc). Single 64-byte payload, last bytes `[62]=0xAA, [63]=0x55`. Used for the "Time Correction" feature among others. |
| `0x72` | tx | TFT_BEGIN | Begin TFT image transmission. `[2]=0x02`. `[8]` = image byte length low byte, `[9]` = length high byte (little-endian 16-bit). After this, pixel data streams via `device3.sendReport(0, …)`. |
| `0xF0` | tx | SERIAL | Companion query to `DEVICE_INFO`, returns the device serial / extended ID. |

### Function ↔ opcode map (from the bundle's function names)

```
hid0402(e)        → 0x04 0x02            END
get0405(e)        → 0x04 0x05 + 0xF0     DEVICE_INFO + SERIAL
get0410(e)        → 0x04 0x18 → 0x04 0x10  READ_KEYMAP_L0
get0410_2(e)      → variant of above (with byte-level parsing)
get0412(e)        → 0x04 0x12            READ_RGB_STATE
get0413(e)        → 0x04 0x13            READ_RGB (legacy)
get0426(e)        → 0x04 0x18 → 0x04 0x26  READ_KEYMAP_L1
set0411(e)        → 0x04 0x18 → 0x04 0x11 → 9 packets → 0x04 0x02  WRITE_KEYMAP_L0
set0411_2(e,t)    → same, takes data as argument
set0413(e, data)  → 0x04 0x18 → 0x04 0x13 → data → 0x04 0x02  WRITE_RGB_STATE
set0415(e, packets) → 0x04 0x19 → 0x04 0x15 → packets → 0x04 0x02  WRITE_RGB_PERKEY
set0427(e)        → 0x04 0x18 → 0x04 0x27 → 9 packets → 0x04 0x02  WRITE_KEYMAP_L1
set0427_2(e,t)    → same, data-arg variant
set0428(e, data)  → 0x04 0x18 → 0x04 0x28 → data → 0x04 0x02  WRITE_CONFIG
set0472(e, chunks) → 0x04 0x18 → 0x04 0x72 (with length) → chunks via device3
```

### Layer structure

| Layer | Read opcode | Write opcode | Notes |
|---|---|---|---|
| 0 (base) | `0x10` | `0x11` | What keys do when pressed without FN |
| 1 (FN) | `0x26` | `0x27` | What keys do when FN is held |

Both layers are 9 packets × 64 bytes = **576 bytes** of key data each. The last packet has the `0xAA 0x55` terminator at bytes 62–63.

### Key encoding (within keymap payload)

Each key occupies **4 bytes** in the packet stream. From `setKeyToHid(e,t,n,o,r,i,a)`:

```js
arrBag[t][4*n]   = o   // byte 0: usage page indicator (0x02 = consumer/media, others = standard keyboard)
arrBag[t][4*n+1] = r   // byte 1: HID modifier/usage low byte
arrBag[t][4*n+2] = i   // byte 2: HID modifier/usage high byte
arrBag[t][4*n+3] = a   // byte 3: extra flag
```

Where `t` = packet index (0–8), `n` = key slot within packet (0–15, since 64 bytes / 4 bytes per key = 16).

So the layout addresses **up to 144 key slots per layer** (9 × 16). The actual physical 75% layout uses 6 rows of varying widths (this is what `this.rowList` and `this.rowList0` encode).

Knob events come back as input reports with `r[0] == 20` (0x14): `knob[r[1]][r[3]] = (r[4] << 8) | r[5]`.

---

## 4. Full HID keycode table

Extracted directly from the bundle's `tE` object (170 entries). The ND75 uses **standard USB HID Keyboard/Keypad Usage codes** for the main keys, plus split `_l` / `_h` (low byte / high byte) pairs for Consumer Control and System Control usages.

### Modifier bitfields (byte 1 of a key entry)

| Symbol | Bit | Hex |
|---|---|---|
| `h_key_ctrl_l` | 0 | `0x01` |
| `h_key_shift_l` | 1 | `0x02` |
| `h_key_alt_l` | 2 | `0x04` |
| `h_key_win_l` | 3 | `0x08` |
| `h_key_ctrl_r` | 4 | `0x10` |
| `h_key_shift_r` | 5 | `0x20` |
| `h_key_alt_r` | 6 | `0x40` |
| `h_key_win_r` | 7 | `0x80` |

### Standalone modifier usage codes (when remapping a key to a single modifier)

| Symbol | Code |
|---|---|
| `M_key_ctrl_l` | `0xE0` |
| `M_key_shift_l` | `0xE1` |
| `M_key_alt_l` | `0xE2` |
| `M_key_win_l` | `0xE03` (3-byte) |
| `M_key_ctrl_r` | `0xE4` |
| `M_key_shift_r` | `0xE5` |
| `M_key_alt_r` | `0xE6` |
| `M_key_win_r` | `0xE7` |

### Alphanumerics (USB HID standard)

```
key_a=0x04 .. key_z=0x1D
key_1=0x1E .. key_0=0x27
key_enter=0x28  key_esc=0x29  key_backspace=0x2A  key_tab=0x2B  key_space=0x2C
key_mis (- _) =0x2D  key_equ (= +)=0x2E  key_oqo ([ {)=0x2F  key_eqo (] })=0x30
key_bsl (\ |)=0x31  key_col (; :)=0x33  key_cc (' ")=0x34  key_gat (` ~)=0x35
key_cma (, <)=0x36  key_dot (. >)=0x37  key_SL (/ ?)=0x38  key_cap (CapsLock)=0x39
key_f1=0x3A .. key_f12=0x45
```

### Mouse buttons (when remapping a key to a mouse button)

```
mouse_key_left=0x01   mouse_key_right=0x02   mouse_key_middle=0x04
mouse_key_4=0x08      mouse_key_5=0x10
mouse_rock_left=0xFF  mouse_rock_right=0x01   // joystick-style entries
```

### Consumer Control / System (split _l / _h pairs)

These are USB Consumer Page (`0x0C`) and System Control usages. Each gets stored as two bytes (low, high) in the key entry. The high byte effectively selects the HID page.

```
key_vol_inc_l=0xE9  key_vol_inc_h=0x00
key_vol_dec_l=0xEA  key_vol_dec_h=0x00
key_mute_l=0xE2     key_mute_h=0x00
key_stop_l=0xB7     key_stop_h=0x00
key_prev_l=0xB6     key_prev_h=0x00
key_next_l=0xB5     key_next_h=0x00
key_favorite_l=0x2A key_favorite_h=0x02  // browser favorites
key_forward_l=0x25  key_forward_h=0x02   // browser forward
key_back_l=0x24     key_back_h=0x02      // browser back
key_refresh_l=0x27  key_refresh_h=0x02   // browser refresh
key_computer_l=0x94 key_computer_h=0x01  // launch "My Computer"
key_media_l=0x83    key_media_h=0x01     // launch default media player
key_power_l=0x01    key_power_h=0x00     // System Power
key_sleep_l=0x02    key_sleep_h=0x00     // System Sleep
key_wakeup_l=0x04   key_wakeup_h=0x00    // System Wake
```

**Key implication:** the firmware supports remapping ANY physical key to ANY of: a regular key, a modified key, a modifier, a mouse button or stick direction, a media key, a browser shortcut, a launcher, or a power command. This is way more flexible than the manual exposes.

---

## 5. RGB lighting

### Global state — single 64-byte packet via `0x13`

| Byte | Meaning |
|---|---|
| 0 | Red |
| 1 | Green (assumed from contiguous layout) |
| 2 | Blue (assumed) |
| 8 | `colorFull` — boolean: use single-color mode |
| 9 | `brightness` — 0–6 (six levels per manual) |
| 10 | `speed` — 0–6 (six levels) |
| 11 | `dir` — animation direction |
| ... | (mode index lives in this region too — needs live capture to confirm exact byte) |

19 lighting modes confirmed from the manual:

```
0  go with the flow (default)
1  twists and turns
2  on the verge of triggering
3  kill two birds with one stone
4  ripples spread
5  continuous flow
6  mountains and mountains
7  slanting wind and drizzle
8  shuttle back and forth
9  static constant light
10 single button to light up
11 single button to turn off
12 dotted stars
13 snow falling in the sky
14 flowers blooming
15 dynamic breathing
16 spectrum cycle
17 colorful spring surging
18 colorful vertical and horizontal
19 backlight turned off
```

(These names are Chinese → English machine translations Chilkey shipped. We should preserve the originals but offer cleaner alternates in the UI: "Wave", "Ripple", "Reactive Off", "Twinkle", "Snow", "Breathe", "Spectrum", etc.)

### Per-key RGB — multi-packet via `0x15`

After `0x19` (begin) → `0x15` (with `[8]` = number of payload packets), stream N payload packets where each packet has 8-byte RGB entries per key (likely `r,g,b,_,r,g,b,_` or similar — needs live capture to confirm exact stride). Terminator packet has `[62]=0xAA, [63]=0x55`.

---

## 6. TFT screen — opcode `0x72` + `device3` stream

### Specs (from cropper config)

- **Resolution: 135 × 240 pixels, portrait orientation** (`minCropBoxWidth = 135`, `minCropBoxHeight = 240`, aspectRatio ≈ 9:16)
- Supports static images and GIFs
- GIFs: < 60 frames per Chilkey's own guidance, 135×240 each frame

### Upload sequence

1. Send `0x04 0x18` (BEGIN_TX)
2. Send `0x04 0x72`, with `[2]=0x02`, `[8] = length & 0xFF`, `[9] = (length >> 8) & 0xFF` — total payload byte count
3. Receive ACK
4. Stream chunks via `device3.sendReport(0, chunk)` — pixel data, no `0x04` prefix on these
5. UI tracks progress as `tftIndex / tftArr.length`
6. On last chunk, fire `hid0402` (end transaction) on the control device

The bundle's chunking: it splits the image into 64-byte chunks of a `Uint8Array` and pushes them sequentially with no per-chunk header. The keyboard already knows how many bytes to expect from the `[8][9]` length field.

### Image format

Most likely **RGB565** (2 bytes per pixel × 135 × 240 = 64,800 bytes) or **RGB888** (3 bytes per pixel = 97,200 bytes). The bundle uses cropper.js → canvas → some color conversion. We need to capture one real upload to confirm; standard TFT controllers on cheap modules are almost always RGB565.

**Open question:** GIF frame timing — is the firmware doing frame timing autonomously, or does the host stream frames at the correct rate? From the `tftArr` pattern (one big array of all frames) it looks like firmware-side timing, but needs confirmation.

---

## 7. Known broken / quirky behavior in the official driver

These are bugs in Chilkey's own configurator we should fix:

1. **"Time Correction" silently fails.** Confirmed in the Gadgetoid review (June 2025) via dev tools inspection — the button issues the command but the clock never updates. The command is presumably `0x04 0x28` (WRITE_CONFIG) with a time-bytes payload. We need to capture the actual packet format the keyboard expects (or experiment) and fix it.
2. **macOS users report the web driver doesn't work** despite being marketed as cross-platform. Cause is unclear without live testing but likely either an HID permission issue or a timing issue on macOS's HID stack. We'll test directly.
3. **Cycling RGB modes via `Fn+PgUp` flashes 3× at "max" but no software-side mode-set feedback** — we can show the named mode and a preview directly.
4. **Mode-switch shortcuts (BT 1/2/3, 2.4G, USB) all require physical key combos held for 3s.** Per the review, the on-board software CAN switch modes — but the keys hide which mode you're in. We can show this in our UI with a single tap.

---

## 8. Things still TODO (require live capture)

To make the implementation rock-solid, we need to do a live USB HID capture (Wireshark on Windows or `usbmon` on Linux) during these flows:

- Exact payload layout for `0x13` (global RGB) — confirm byte positions of mode index
- Exact stride/format for `0x15` (per-key RGB)
- Exact bytes the `0x28` config command expects for: time-sync, sleep timer, system mode (Win/Mac), Win-lock, screen language
- TFT pixel format (RGB565 vs RGB888)
- Whether `0x05` response includes battery percentage, and if so which byte
- The unknown `0x04 0x01` command

Everything else is solid enough to implement against.

---

## 9. Safety notes

- **DO NOT touch firmware update commands** if they exist. Chilkey's own console page warns: *"If everything works fine with your keyboard. Please don't flash the firmware. There is a chance it can damage your keyboard."* We bypass any firmware-write opcodes entirely.
- 64-byte feature reports — keep payload size strict, off-by-one will silently corrupt keyboard config.
- Always close the transaction with `0x04 0x02` even on error paths, or the keyboard may need to be unplugged to recover.
- Settings are persistent — a bad keymap write needs to be undone with a known-good write, not "wait it out".
