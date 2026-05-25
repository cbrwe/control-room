/**
 * Physical layout of the Chilkey ND75, Norm (non-Korea) variant.
 *
 * Slot indices, labels, and HID keycodes were extracted directly from the
 * official configurator bundle's `Jg` (base layer) and `pk` (FN layer) data
 * structures. Visual widths follow the standard 75% ANSI key spec.
 *
 * Protocol slot encoding: each key lives in packet `page` (0-8) at position
 * `pageNumber` (0-15), so `slot = page * 16 + pageNumber`. The arrangement is
 * sparse on purpose — the firmware reserves certain pageNumber positions
 * inside each packet for variant-specific keys we don't ship.
 *
 * The rotary knob is NOT part of the keymap. It comes through as separate
 * input reports (`r[0] === 0x14`) and rendered as a non-clickable disc.
 */

import { KEY, key, type KeyBinding } from '@control-room/protocol';

export interface PhysicalKey {
  /** Protocol slot = page * 16 + pageNumber. */
  slot: number;
  /** Packet index (0-8). */
  page: number;
  /** Position within packet (0-15). */
  pageNumber: number;
  /** Display label (primary printed legend). */
  label: string;
  /** Optional sublabel (shifted symbol, etc.). */
  sublabel?: string;
  /** What this key does on the FN layer (just the label, for tooltip). */
  fnLabel?: string;
  /** Grid row, 0-5. */
  row: number;
  /** Column position in 0.25u units (so 1u = 4). */
  col: number;
  /** Width in 0.25u units. */
  width: number;
  /** Default binding on the base layer. */
  defaultBase: KeyBinding;
}

const U = 4;

interface KeyDef {
  page: number;
  pageNumber: number;
  label: string;
  sublabel?: string;
  fnLabel?: string;
  width?: number;
  binding: KeyBinding;
}

function layoutRow(rowIndex: number, defs: KeyDef[]): PhysicalKey[] {
  let col = 0;
  return defs.map((d) => {
    const width = d.width ?? U;
    const k: PhysicalKey = {
      slot: d.page * 16 + d.pageNumber,
      page: d.page,
      pageNumber: d.pageNumber,
      label: d.label,
      row: rowIndex,
      col,
      width,
      defaultBase: d.binding,
    };
    if (d.sublabel !== undefined) k.sublabel = d.sublabel;
    if (d.fnLabel !== undefined) k.fnLabel = d.fnLabel;
    col += width;
    return k;
  });
}

// Row 0: Esc, F1-F12, Delete, Insert (15 keys, all 1u)
const ROW_0 = layoutRow(0, [
  { page: 0, pageNumber: 1, label: 'ESC', fnLabel: 'Reset', binding: key(KEY.Escape) },
  { page: 0, pageNumber: 2, label: 'F1', binding: key(KEY.F1) },
  { page: 0, pageNumber: 3, label: 'F2', binding: key(KEY.F2) },
  { page: 0, pageNumber: 4, label: 'F3', binding: key(KEY.F3) },
  { page: 0, pageNumber: 5, label: 'F4', binding: key(KEY.F4) },
  { page: 0, pageNumber: 6, label: 'F5', binding: key(KEY.F5) },
  { page: 0, pageNumber: 7, label: 'F6', binding: key(KEY.F6) },
  { page: 0, pageNumber: 8, label: 'F7', binding: key(KEY.F7) },
  { page: 0, pageNumber: 9, label: 'F8', binding: key(KEY.F8) },
  { page: 0, pageNumber: 10, label: 'F9', binding: key(KEY.F9) },
  { page: 0, pageNumber: 11, label: 'F10', binding: key(KEY.F10) },
  { page: 0, pageNumber: 12, label: 'F11', binding: key(KEY.F11) },
  { page: 0, pageNumber: 13, label: 'F12', binding: key(KEY.F12) },
  { page: 7, pageNumber: 7, label: 'DEL', binding: key(KEY.Delete) },
  { page: 7, pageNumber: 4, label: 'INS', binding: key(KEY.Insert) },
]);

// Row 1: ` 1-0 - = Backspace(2u) PgUp
const ROW_1 = layoutRow(1, [
  { page: 1, pageNumber: 3, label: '`', sublabel: '~', binding: key(KEY.Grave) },
  { page: 1, pageNumber: 4, label: '1', sublabel: '!', binding: key(KEY.Num1) },
  { page: 1, pageNumber: 5, label: '2', sublabel: '@', binding: key(KEY.Num2) },
  { page: 1, pageNumber: 6, label: '3', sublabel: '#', binding: key(KEY.Num3) },
  { page: 1, pageNumber: 7, label: '4', sublabel: '$', binding: key(KEY.Num4) },
  { page: 1, pageNumber: 8, label: '5', sublabel: '%', binding: key(KEY.Num5) },
  { page: 1, pageNumber: 9, label: '6', sublabel: '^', binding: key(KEY.Num6) },
  { page: 1, pageNumber: 10, label: '7', sublabel: '&', binding: key(KEY.Num7) },
  { page: 1, pageNumber: 11, label: '8', sublabel: '*', binding: key(KEY.Num8) },
  { page: 1, pageNumber: 12, label: '9', sublabel: '(', binding: key(KEY.Num9) },
  { page: 1, pageNumber: 13, label: '0', sublabel: ')', binding: key(KEY.Num0) },
  { page: 1, pageNumber: 14, label: '-', sublabel: '_', binding: key(KEY.Minus) },
  { page: 1, pageNumber: 15, label: '=', sublabel: '+', binding: key(KEY.Equal) },
  { page: 6, pageNumber: 7, label: 'BACKSPACE', width: U * 2, binding: key(KEY.Backspace) },
  { page: 7, pageNumber: 6, label: 'PGUP', binding: key(KEY.PageUp) },
]);

// Row 2: Tab(1.5u) Q-P [ ] \(1.5u) PgDn
const ROW_2 = layoutRow(2, [
  { page: 2, pageNumber: 5, label: 'TAB', width: U * 1.5, binding: key(KEY.Tab) },
  { page: 2, pageNumber: 6, label: 'Q', binding: key(KEY.Q) },
  { page: 2, pageNumber: 7, label: 'W', binding: key(KEY.W) },
  { page: 2, pageNumber: 8, label: 'E', binding: key(KEY.E) },
  { page: 2, pageNumber: 9, label: 'R', binding: key(KEY.R) },
  { page: 2, pageNumber: 10, label: 'T', binding: key(KEY.T) },
  { page: 2, pageNumber: 11, label: 'Y', binding: key(KEY.Y) },
  { page: 2, pageNumber: 12, label: 'U', binding: key(KEY.U) },
  { page: 2, pageNumber: 13, label: 'I', binding: key(KEY.I) },
  { page: 2, pageNumber: 14, label: 'O', binding: key(KEY.O) },
  { page: 2, pageNumber: 15, label: 'P', binding: key(KEY.P) },
  { page: 3, pageNumber: 0, label: '[', sublabel: '{', binding: key(KEY.LeftBracket) },
  { page: 3, pageNumber: 1, label: ']', sublabel: '}', binding: key(KEY.RightBracket) },
  { page: 4, pageNumber: 3, label: '\\', sublabel: '|', width: U * 1.5, binding: key(KEY.Backslash) },
  { page: 7, pageNumber: 9, label: 'PGDN', binding: key(KEY.PageDown) },
]);

// Row 3: Caps(1.75u) A-L ; ' Enter(2.25u)
const ROW_3 = layoutRow(3, [
  { page: 3, pageNumber: 7, label: 'CAPS', width: U * 1.75, binding: key(KEY.CapsLock) },
  { page: 3, pageNumber: 8, label: 'A', binding: key(KEY.A) },
  { page: 3, pageNumber: 9, label: 'S', binding: key(KEY.S) },
  { page: 3, pageNumber: 10, label: 'D', binding: key(KEY.D) },
  { page: 3, pageNumber: 11, label: 'F', binding: key(KEY.F) },
  { page: 3, pageNumber: 12, label: 'G', binding: key(KEY.G) },
  { page: 3, pageNumber: 13, label: 'H', binding: key(KEY.H) },
  { page: 3, pageNumber: 14, label: 'J', binding: key(KEY.J) },
  { page: 3, pageNumber: 15, label: 'K', binding: key(KEY.K) },
  { page: 4, pageNumber: 0, label: 'L', binding: key(KEY.L) },
  { page: 4, pageNumber: 1, label: ';', sublabel: ':', binding: key(KEY.Semicolon) },
  { page: 4, pageNumber: 2, label: "'", sublabel: '"', binding: key(KEY.Quote) },
  { page: 5, pageNumber: 5, label: 'ENTER', width: U * 2.25, binding: key(KEY.Enter) },
]);

// Row 4: LShift(2.25u) Z-/ RShift(1.75u) Up
const ROW_4 = layoutRow(4, [
  { page: 4, pageNumber: 9, label: 'SHIFT', width: U * 2.25, binding: key(KEY.LeftShift) },
  { page: 4, pageNumber: 10, label: 'Z', binding: key(KEY.Z) },
  { page: 4, pageNumber: 11, label: 'X', binding: key(KEY.X) },
  { page: 4, pageNumber: 12, label: 'C', binding: key(KEY.C) },
  { page: 4, pageNumber: 13, label: 'V', binding: key(KEY.V) },
  { page: 4, pageNumber: 14, label: 'B', binding: key(KEY.B) },
  { page: 4, pageNumber: 15, label: 'N', binding: key(KEY.N) },
  { page: 5, pageNumber: 0, label: 'M', binding: key(KEY.M) },
  { page: 5, pageNumber: 1, label: ',', sublabel: '<', binding: key(KEY.Comma) },
  { page: 5, pageNumber: 2, label: '.', sublabel: '>', binding: key(KEY.Period) },
  { page: 5, pageNumber: 3, label: '/', sublabel: '?', binding: key(KEY.Slash) },
  { page: 5, pageNumber: 4, label: 'SHIFT', width: U * 1.75, binding: key(KEY.RightShift) },
  { page: 6, pageNumber: 5, label: '↑', binding: key(KEY.Up) },
]);

// Row 5: LCtrl(1.25u) Win(1.25u) Alt(1.25u) Space(6.25u) Fn(1u) RCtrl(1u) Left(1u) Down(1u) Right(1u)
const ROW_5 = layoutRow(5, [
  { page: 5, pageNumber: 11, label: 'CTRL', width: U * 1.25, binding: key(KEY.LeftCtrl) },
  { page: 5, pageNumber: 12, label: 'WIN', width: U * 1.25, binding: key(KEY.LeftWin) },
  { page: 5, pageNumber: 13, label: 'ALT', width: U * 1.25, binding: key(KEY.LeftAlt) },
  { page: 5, pageNumber: 14, label: 'SPACE', width: U * 6.25, binding: key(KEY.Space) },
  { page: 6, pageNumber: 0, label: 'FN', binding: key(0) },
  { page: 6, pageNumber: 2, label: 'CTRL', binding: key(KEY.RightCtrl) },
  { page: 6, pageNumber: 3, label: '←', binding: key(KEY.Left) },
  { page: 6, pageNumber: 4, label: '↓', binding: key(KEY.Down) },
  { page: 6, pageNumber: 6, label: '→', binding: key(KEY.Right) },
]);

export const ND75_LAYOUT: PhysicalKey[] = [
  ...ROW_0,
  ...ROW_1,
  ...ROW_2,
  ...ROW_3,
  ...ROW_4,
  ...ROW_5,
];

/** Visual rotary knob (separate input device, not in the keymap). */
export const KNOB = {
  row: 0,
  col: 60, // sits just past the last key in row 0 (15u)
  diameter: 4, // 1u
};

/** Total layout width in 0.25u units. */
export const LAYOUT_WIDTH = 64; // 15u keys + 1u knob slot = 16u
/** Total layout height in 0.25u units. */
export const LAYOUT_HEIGHT = 24;
