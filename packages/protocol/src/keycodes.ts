/**
 * Complete USB HID keycode catalog for the ND75.
 *
 * Extracted directly from Chilkey's official web configurator bundle (the `tE`
 * object). Values are standard USB HID Keyboard/Keypad Usage codes for the
 * main keys, plus split low/high byte pairs for Consumer Control and System
 * Control usages.
 *
 * Reference: USB HID Usage Tables 1.5, sections 10 (Keyboard) and 15 (Consumer).
 */

/** A single key binding: what gets sent when the physical key is pressed. */
export interface KeyBinding {
  /** Page indicator. 0x00 = Keyboard/Keypad. 0x02 = Consumer Control. 0x01 = System Control. */
  page: KeyPage;
  /** Low byte of the usage code. */
  usageLow: number;
  /** High byte of the usage code (for multi-byte consumer codes). */
  usageHigh: number;
  /** Optional modifier bitmask applied with the key (Ctrl, Shift, Alt, Win). */
  modifiers?: number;
}

export const KeyPage = {
  Keyboard: 0x00,
  System: 0x01,
  Consumer: 0x02,
  Mouse: 0x03,
} as const;
export type KeyPage = (typeof KeyPage)[keyof typeof KeyPage];

/** Modifier bitfield. Combine with bitwise OR. */
export const Modifier = {
  None: 0x00,
  CtrlL: 0x01,
  ShiftL: 0x02,
  AltL: 0x04,
  WinL: 0x08,
  CtrlR: 0x10,
  ShiftR: 0x20,
  AltR: 0x40,
  WinR: 0x80,
} as const;

/**
 * Standard HID Keyboard/Keypad usage codes (page 0x07 in spec, page 0x00 in our binding).
 * These are the codes the keyboard sends, identical across all USB HID keyboards.
 */
export const KEY = {
  None: 0x00,

  // Letters
  A: 0x04, B: 0x05, C: 0x06, D: 0x07, E: 0x08, F: 0x09, G: 0x0a, H: 0x0b,
  I: 0x0c, J: 0x0d, K: 0x0e, L: 0x0f, M: 0x10, N: 0x11, O: 0x12, P: 0x13,
  Q: 0x14, R: 0x15, S: 0x16, T: 0x17, U: 0x18, V: 0x19, W: 0x1a, X: 0x1b,
  Y: 0x1c, Z: 0x1d,

  // Number row
  Num1: 0x1e, Num2: 0x1f, Num3: 0x20, Num4: 0x21, Num5: 0x22,
  Num6: 0x23, Num7: 0x24, Num8: 0x25, Num9: 0x26, Num0: 0x27,

  // Control keys
  Enter: 0x28,
  Escape: 0x29,
  Backspace: 0x2a,
  Tab: 0x2b,
  Space: 0x2c,
  Minus: 0x2d,        // - _
  Equal: 0x2e,        // = +
  LeftBracket: 0x2f,  // [ {
  RightBracket: 0x30, // ] }
  Backslash: 0x31,    // \ |
  Semicolon: 0x33,    // ; :
  Quote: 0x34,        // ' "
  Grave: 0x35,        // ` ~
  Comma: 0x36,        // , <
  Period: 0x37,       // . >
  Slash: 0x38,        // / ?
  CapsLock: 0x39,

  // Function row
  F1: 0x3a, F2: 0x3b, F3: 0x3c, F4: 0x3d, F5: 0x3e, F6: 0x3f,
  F7: 0x40, F8: 0x41, F9: 0x42, F10: 0x43, F11: 0x44, F12: 0x45,

  // Navigation cluster
  PrintScreen: 0x46,
  ScrollLock: 0x47,
  Pause: 0x48,
  Insert: 0x49,
  Home: 0x4a,
  PageUp: 0x4b,
  Delete: 0x4c,
  End: 0x4d,
  PageDown: 0x4e,
  Right: 0x4f,
  Left: 0x50,
  Down: 0x51,
  Up: 0x52,

  // Numpad
  NumLock: 0x53,
  NumpadDivide: 0x54,
  NumpadMultiply: 0x55,
  NumpadMinus: 0x56,
  NumpadPlus: 0x57,
  NumpadEnter: 0x58,
  Numpad1: 0x59, Numpad2: 0x5a, Numpad3: 0x5b, Numpad4: 0x5c, Numpad5: 0x5d,
  Numpad6: 0x5e, Numpad7: 0x5f, Numpad8: 0x60, Numpad9: 0x61, Numpad0: 0x62,
  NumpadDot: 0x63,

  // Modifiers as standalone (when remapping a key to BE the modifier)
  LeftCtrl: 0xe0,
  LeftShift: 0xe1,
  LeftAlt: 0xe2,
  LeftWin: 0xe3,
  RightCtrl: 0xe4,
  RightShift: 0xe5,
  RightAlt: 0xe6,
  RightWin: 0xe7,
} as const;

/**
 * Consumer Control usages (USB HID page 0x0C). These need both low and high
 * byte set when binding because the firmware addresses HID pages by the high byte.
 */
export const CONSUMER = {
  /** Volume up. HID code 0xE9. */
  VolumeUp: { low: 0xe9, high: 0x00 },
  /** Volume down. HID code 0xEA. */
  VolumeDown: { low: 0xea, high: 0x00 },
  /** Mute. HID code 0xE2 on consumer page. (Note: same number as LeftAlt on keyboard page.) */
  Mute: { low: 0xe2, high: 0x00 },
  /** Stop playback. HID code 0xB7. */
  Stop: { low: 0xb7, high: 0x00 },
  /** Previous track. HID code 0xB6. */
  PreviousTrack: { low: 0xb6, high: 0x00 },
  /** Next track. HID code 0xB5. */
  NextTrack: { low: 0xb5, high: 0x00 },

  // Browser shortcuts (high byte 0x02 in ND75 encoding)
  Favorites: { low: 0x2a, high: 0x02 },
  Forward: { low: 0x25, high: 0x02 },
  Back: { low: 0x24, high: 0x02 },
  Refresh: { low: 0x27, high: 0x02 },

  // Launchers (high byte 0x01 in ND75 encoding)
  /** Launch "My Computer" / Finder. */
  LaunchComputer: { low: 0x94, high: 0x01 },
  /** Launch default media player. */
  LaunchMediaPlayer: { low: 0x83, high: 0x01 },
} as const;

/**
 * System Control usages (USB HID page 0x01).
 */
export const SYSTEM = {
  Power: { low: 0x01, high: 0x00 },
  Sleep: { low: 0x02, high: 0x00 },
  Wake: { low: 0x04, high: 0x00 },
} as const;

/**
 * Mouse button bindings. The ND75 lets you remap any key to a mouse action.
 */
export const MOUSE = {
  Left: 0x01,
  Right: 0x02,
  Middle: 0x04,
  Button4: 0x08,
  Button5: 0x10,
  RockLeft: 0xff,
  RockRight: 0x01,
} as const;

// ---------------------------------------------------------------------------
// Convenience builders
// ---------------------------------------------------------------------------

/** Build a plain keyboard binding (page 0x00). */
export function key(code: number, modifiers = 0): KeyBinding {
  return { page: KeyPage.Keyboard, usageLow: code, usageHigh: 0, modifiers };
}

/** Build a consumer-control binding (page 0x02). */
export function consumer(usage: { low: number; high: number }): KeyBinding {
  return { page: KeyPage.Consumer, usageLow: usage.low, usageHigh: usage.high };
}

/** Build a system-control binding (page 0x01). */
export function system(usage: { low: number; high: number }): KeyBinding {
  return { page: KeyPage.System, usageLow: usage.low, usageHigh: usage.high };
}

/** Build a mouse-button binding (page 0x03). */
export function mouse(button: number): KeyBinding {
  return { page: KeyPage.Mouse, usageLow: button, usageHigh: 0 };
}

/** Build an empty binding (nothing happens when key is pressed). */
export function unbound(): KeyBinding {
  return { page: KeyPage.Keyboard, usageLow: 0, usageHigh: 0 };
}
