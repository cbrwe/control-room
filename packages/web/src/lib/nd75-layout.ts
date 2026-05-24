/**
 * Physical layout of the Chilkey ND75 ANSI 75% keyboard.
 *
 * The slot index is the position in the protocol's keymap array (0-indexed,
 * up to 143). Width/height are in "key units" (1u = standard letter key width).
 *
 * Row layout reference (left to right):
 *   Row 0:  Esc | F1 F2 F3 F4 | F5 F6 F7 F8 | F9 F10 F11 F12 | Del | Knob
 *   Row 1:  ` 1 2 3 4 5 6 7 8 9 0 - = Backspace | PgUp
 *   Row 2:  Tab Q W E R T Y U I O P [ ] \ | PgDn
 *   Row 3:  Caps A S D F G H J K L ; ' Enter | Home
 *   Row 4:  LShift Z X C V B N M , . / RShift | Up | End
 *   Row 5:  LCtrl LWin LAlt Space RAlt Fn Menu RCtrl | Left Down Right
 *
 * Slot indices are sequential as you read across rows, top to bottom. The
 * actual hardware slot indexing needs confirmation against a real read; this
 * is our best inference from a standard 75% ANSI map.
 */

import { KEY, CONSUMER, key, consumer, type KeyBinding } from '@control-room/protocol';

export interface PhysicalKey {
  /** Position in the keymap array. */
  slot: number;
  /** Display label (the printed legend). */
  label: string;
  /** Optional sublabel (secondary printed text, e.g. shifted symbol). */
  sublabel?: string;
  /** Grid row, 0-5. */
  row: number;
  /** Grid column position in 0.25u units (so 1u = 4). */
  col: number;
  /** Width in 0.25u units. */
  width: number;
  /** Height in 0.25u units (default 4). */
  height?: number;
  /** Default binding on the base layer. */
  defaultBase: KeyBinding;
  /** Default binding on the FN layer (some keys have function on FN). */
  defaultFn?: KeyBinding;
  /** Whether this is the rotary knob. */
  isKnob?: boolean;
}

// 0.25u units. A standard key is 4 wide. 1u row height is also 4 tall.
const U = 4;

/**
 * Helper that lays out a sequence of keys in a row.
 * Returns the keys with col positions filled in, starting at startCol.
 */
function row(
  rowIndex: number,
  startCol: number,
  startSlot: number,
  keys: Omit<PhysicalKey, 'row' | 'col' | 'slot'>[]
): PhysicalKey[] {
  let col = startCol;
  let slot = startSlot;
  const out: PhysicalKey[] = [];
  for (const k of keys) {
    out.push({ ...k, row: rowIndex, col, slot });
    col += k.width;
    slot += 1;
  }
  return out;
}

const k = (label: string, width = U, defaultBase: KeyBinding = key(0)): Omit<PhysicalKey, 'row' | 'col' | 'slot'> => ({
  label,
  width,
  defaultBase,
});

// Function row: Esc, F1-F12, Del, Knob (rotary)
const ROW_0: PhysicalKey[] = [
  ...row(0, 0, 0, [
    k('ESC', U, key(KEY.Escape)),
    k('F1', U, key(KEY.F1)),
    k('F2', U, key(KEY.F2)),
    k('F3', U, key(KEY.F3)),
    k('F4', U, key(KEY.F4)),
    k('F5', U, key(KEY.F5)),
    k('F6', U, key(KEY.F6)),
    k('F7', U, key(KEY.F7)),
    k('F8', U, key(KEY.F8)),
    k('F9', U, key(KEY.F9)),
    k('F10', U, key(KEY.F10)),
    k('F11', U, key(KEY.F11)),
    k('F12', U, key(KEY.F12)),
    k('DEL', U, key(KEY.Delete)),
  ]),
  // Knob at column 56 (after 14 × 4)
  { slot: 14, label: 'KNOB', row: 0, col: 56, width: U, isKnob: true, defaultBase: consumer(CONSUMER.VolumeUp) },
];

// Number row: ` 1 2 ... 0 - = Backspace(2u) | PgUp
const ROW_1: PhysicalKey[] = [
  ...row(1, 0, 15, [
    { label: '`', sublabel: '~', width: U, defaultBase: key(KEY.Grave) },
    { label: '1', sublabel: '!', width: U, defaultBase: key(KEY.Num1) },
    { label: '2', sublabel: '@', width: U, defaultBase: key(KEY.Num2) },
    { label: '3', sublabel: '#', width: U, defaultBase: key(KEY.Num3) },
    { label: '4', sublabel: '$', width: U, defaultBase: key(KEY.Num4) },
    { label: '5', sublabel: '%', width: U, defaultBase: key(KEY.Num5) },
    { label: '6', sublabel: '^', width: U, defaultBase: key(KEY.Num6) },
    { label: '7', sublabel: '&', width: U, defaultBase: key(KEY.Num7) },
    { label: '8', sublabel: '*', width: U, defaultBase: key(KEY.Num8) },
    { label: '9', sublabel: '(', width: U, defaultBase: key(KEY.Num9) },
    { label: '0', sublabel: ')', width: U, defaultBase: key(KEY.Num0) },
    { label: '-', sublabel: '_', width: U, defaultBase: key(KEY.Minus) },
    { label: '=', sublabel: '+', width: U, defaultBase: key(KEY.Equal) },
    { label: 'BACKSPACE', width: U * 2, defaultBase: key(KEY.Backspace) },
    { label: 'PGUP', width: U, defaultBase: key(KEY.PageUp) },
  ]),
];

// Tab row: Tab(1.5u) Q W E R T Y U I O P [ ] \(1.5u) | PgDn
const ROW_2: PhysicalKey[] = [
  ...row(2, 0, 30, [
    { label: 'TAB', width: U * 1.5, defaultBase: key(KEY.Tab) },
    { label: 'Q', width: U, defaultBase: key(KEY.Q) },
    { label: 'W', width: U, defaultBase: key(KEY.W) },
    { label: 'E', width: U, defaultBase: key(KEY.E) },
    { label: 'R', width: U, defaultBase: key(KEY.R) },
    { label: 'T', width: U, defaultBase: key(KEY.T) },
    { label: 'Y', width: U, defaultBase: key(KEY.Y) },
    { label: 'U', width: U, defaultBase: key(KEY.U) },
    { label: 'I', width: U, defaultBase: key(KEY.I) },
    { label: 'O', width: U, defaultBase: key(KEY.O) },
    { label: 'P', width: U, defaultBase: key(KEY.P) },
    { label: '[', sublabel: '{', width: U, defaultBase: key(KEY.LeftBracket) },
    { label: ']', sublabel: '}', width: U, defaultBase: key(KEY.RightBracket) },
    { label: '\\', sublabel: '|', width: U * 1.5, defaultBase: key(KEY.Backslash) },
    { label: 'PGDN', width: U, defaultBase: key(KEY.PageDown) },
  ]),
];

// Caps row: Caps(1.75u) A S D F G H J K L ; ' Enter(2.25u) | Home
const ROW_3: PhysicalKey[] = [
  ...row(3, 0, 45, [
    { label: 'CAPS', width: U * 1.75, defaultBase: key(KEY.CapsLock) },
    { label: 'A', width: U, defaultBase: key(KEY.A) },
    { label: 'S', width: U, defaultBase: key(KEY.S) },
    { label: 'D', width: U, defaultBase: key(KEY.D) },
    { label: 'F', width: U, defaultBase: key(KEY.F) },
    { label: 'G', width: U, defaultBase: key(KEY.G) },
    { label: 'H', width: U, defaultBase: key(KEY.H) },
    { label: 'J', width: U, defaultBase: key(KEY.J) },
    { label: 'K', width: U, defaultBase: key(KEY.K) },
    { label: 'L', width: U, defaultBase: key(KEY.L) },
    { label: ';', sublabel: ':', width: U, defaultBase: key(KEY.Semicolon) },
    { label: "'", sublabel: '"', width: U, defaultBase: key(KEY.Quote) },
    { label: 'ENTER', width: U * 2.25, defaultBase: key(KEY.Enter) },
    { label: 'HOME', width: U, defaultBase: key(KEY.Home) },
  ]),
];

// Shift row: LShift(2.25u) Z X C V B N M , . / RShift(1.75u) | Up | End
const ROW_4: PhysicalKey[] = [
  ...row(4, 0, 59, [
    { label: 'SHIFT', width: U * 2.25, defaultBase: key(KEY.LeftShift) },
    { label: 'Z', width: U, defaultBase: key(KEY.Z) },
    { label: 'X', width: U, defaultBase: key(KEY.X) },
    { label: 'C', width: U, defaultBase: key(KEY.C) },
    { label: 'V', width: U, defaultBase: key(KEY.V) },
    { label: 'B', width: U, defaultBase: key(KEY.B) },
    { label: 'N', width: U, defaultBase: key(KEY.N) },
    { label: 'M', width: U, defaultBase: key(KEY.M) },
    { label: ',', sublabel: '<', width: U, defaultBase: key(KEY.Comma) },
    { label: '.', sublabel: '>', width: U, defaultBase: key(KEY.Period) },
    { label: '/', sublabel: '?', width: U, defaultBase: key(KEY.Slash) },
    { label: 'SHIFT', width: U * 1.75, defaultBase: key(KEY.RightShift) },
    { label: '↑', width: U, defaultBase: key(KEY.Up) },
    { label: 'END', width: U, defaultBase: key(KEY.End) },
  ]),
];

// Bottom row: LCtrl(1.25u) LWin(1.25u) LAlt(1.25u) Space(6.25u) RAlt(1u) Fn(1u) RCtrl(1u) | Left Down Right
const ROW_5: PhysicalKey[] = [
  ...row(5, 0, 73, [
    { label: 'CTRL', width: U * 1.25, defaultBase: key(KEY.LeftCtrl) },
    { label: 'CMD', width: U * 1.25, defaultBase: key(KEY.LeftWin) },
    { label: 'ALT', width: U * 1.25, defaultBase: key(KEY.LeftAlt) },
    { label: 'SPACE', width: U * 6.25, defaultBase: key(KEY.Space) },
    { label: 'ALT', width: U, defaultBase: key(KEY.RightAlt) },
    { label: 'FN', width: U, defaultBase: key(0) }, // FN itself is hardware-handled
    { label: 'CTRL', width: U, defaultBase: key(KEY.RightCtrl) },
    { label: '←', width: U, defaultBase: key(KEY.Left) },
    { label: '↓', width: U, defaultBase: key(KEY.Down) },
    { label: '→', width: U, defaultBase: key(KEY.Right) },
  ]),
];

export const ND75_LAYOUT: PhysicalKey[] = [
  ...ROW_0,
  ...ROW_1,
  ...ROW_2,
  ...ROW_3,
  ...ROW_4,
  ...ROW_5,
];

/** Total layout width in 0.25u units. */
export const LAYOUT_WIDTH = 60; // 15u
/** Total layout height in 0.25u units. */
export const LAYOUT_HEIGHT = 24; // 6 rows × 4 quarter-units
