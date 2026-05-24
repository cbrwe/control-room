/**
 * RGB lighting encoding.
 *
 * Two operations are supported by the firmware:
 *
 *   1. Global state — single 64-byte packet via WRITE_RGB_STATE (0x13).
 *      Sets one mode, one color (when colorFull is on), one brightness, etc.
 *
 *   2. Per-key state — multi-packet via WRITE_RGB_PERKEY (0x15). Sets a
 *      specific color for every key independently. Exact stride within the
 *      per-key packets needs a live capture to confirm; this module ships the
 *      single-packet global encoder and will be extended once we capture
 *      reference packets from a real device.
 */

import { applyTerminator, emptyPacket } from './packet.js';

/** RGB color in 0-255 channels. */
export interface Color {
  r: number;
  g: number;
  b: number;
}

/**
 * One of the 19 built-in lighting modes. Names are sanitized from Chilkey's
 * machine-translated Chinese originals; index matches the cycle order from
 * the manual (FN+PgUp cycles through them).
 */
export const LightingMode = {
  Wave: 0,             // "go with the flow"        (default)
  TwistTurn: 1,        // "twists and turns"
  ReactiveOn: 2,       // "on the verge of triggering"
  KillTwoBirds: 3,     // "kill two birds with one stone"
  Ripple: 4,           // "ripples spread"
  Flow: 5,             // "continuous flow"
  Mountains: 6,        // "mountains and mountains"
  Drizzle: 7,          // "slanting wind and drizzle"
  Shuttle: 8,          // "shuttle back and forth"
  Static: 9,           // "static constant light"
  SingleLight: 10,     // "single button to light up"
  SingleOff: 11,       // "single button to turn off"
  Stars: 12,           // "dotted stars"
  Snow: 13,            // "snow falling in the sky"
  Bloom: 14,           // "flowers blooming"
  Breathe: 15,         // "dynamic breathing"
  Spectrum: 16,        // "spectrum cycle"
  ColorSpring: 17,     // "colorful spring surging"
  ColorAxes: 18,       // "colorful vertical and horizontal"
  Off: 19,             // "backlight turned off"
} as const;

export type LightingMode = (typeof LightingMode)[keyof typeof LightingMode];

/** Original Chinese-translated names from the manual, in cycle order. */
export const LIGHTING_MODE_LEGACY_NAMES: readonly string[] = [
  'go with the flow',
  'twists and turns',
  'on the verge of triggering',
  'kill two birds with one stone',
  'ripples spread',
  'continuous flow',
  'mountains and mountains',
  'slanting wind and drizzle',
  'shuttle back and forth',
  'static constant light',
  'single button to light up',
  'single button to turn off',
  'dotted stars',
  'snow falling in the sky',
  'flowers blooming',
  'dynamic breathing',
  'spectrum cycle',
  'colorful spring surging',
  'colorful vertical and horizontal',
  'backlight turned off',
];

/** Cleaner display names for the UI. Indexed the same as LightingMode. */
export const LIGHTING_MODE_NAMES: readonly string[] = [
  'Wave',
  'Twist & Turn',
  'Reactive On',
  'Double Strike',
  'Ripple',
  'Flow',
  'Mountains',
  'Drizzle',
  'Shuttle',
  'Static',
  'Reactive Light',
  'Reactive Off',
  'Stars',
  'Snow',
  'Bloom',
  'Breathe',
  'Spectrum',
  'Color Spring',
  'Color Axes',
  'Off',
];

/** Global RGB state — what gets sent in a single WRITE_RGB_STATE packet. */
export interface RGBState {
  /** Lighting mode (0-19). */
  mode: LightingMode;
  /** Color used when in single-color modes. */
  color: Color;
  /** True = use the chosen color, false = use rainbow/dynamic. Stored in byte [8]. */
  singleColor: boolean;
  /** 0-6, six levels per the manual. */
  brightness: number;
  /** 0-6, animation speed. */
  speed: number;
  /** Animation direction. 0 or 1 for most modes. */
  direction: number;
}

export const DEFAULT_RGB_STATE: RGBState = {
  mode: LightingMode.Wave,
  color: { r: 255, g: 255, b: 255 },
  singleColor: false,
  brightness: 6,
  speed: 3,
  direction: 0,
};

/**
 * Encode a global RGB state as the single 64-byte payload that follows the
 * WRITE_RGB_STATE (0x13) opcode packet.
 *
 * Byte layout (from official bundle, function set0413):
 *
 *   [0]  R
 *   [1]  G
 *   [2]  B
 *   [8]  colorFull (single-color flag)
 *   [9]  brightness
 *   [10] speed
 *   [11] direction
 *
 * The mode index is also packed into this payload; the exact byte slot needs
 * a live USB capture to lock down. We use byte [4] based on common firmware
 * conventions and will adjust once we have reference traffic.
 */
export function encodeRGBState(state: RGBState): Uint8Array {
  const packet = emptyPacket();
  packet[0] = clampByte(state.color.r);
  packet[1] = clampByte(state.color.g);
  packet[2] = clampByte(state.color.b);
  packet[4] = state.mode;
  packet[8] = state.singleColor ? 1 : 0;
  packet[9] = clampLevel(state.brightness);
  packet[10] = clampLevel(state.speed);
  packet[11] = state.direction & 0x01;
  return packet;
}

/**
 * Encode per-key RGB colors. Stride within the packet is provisional and will
 * be confirmed via live capture. Current best guess: 4 bytes per key
 * (R, G, B, padding), 16 keys per packet, terminator on the final packet.
 */
export function encodePerKeyRGB(colors: readonly Color[]): Uint8Array[] {
  const KEYS_PER_PACKET = 16;
  const BYTES_PER_KEY = 4;
  const totalPackets = Math.ceil(colors.length / KEYS_PER_PACKET);
  const packets: Uint8Array[] = [];

  for (let p = 0; p < totalPackets; p++) {
    const packet = emptyPacket();
    for (let k = 0; k < KEYS_PER_PACKET; k++) {
      const colorIndex = p * KEYS_PER_PACKET + k;
      if (colorIndex >= colors.length) break;
      const color = colors[colorIndex]!;
      const offset = k * BYTES_PER_KEY;
      packet[offset] = clampByte(color.r);
      packet[offset + 1] = clampByte(color.g);
      packet[offset + 2] = clampByte(color.b);
      packet[offset + 3] = 0;
    }
    packets.push(packet);
  }

  if (packets.length > 0) {
    applyTerminator(packets[packets.length - 1]!);
  }

  return packets;
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.floor(v)));
}

function clampLevel(v: number): number {
  return Math.max(0, Math.min(6, Math.floor(v)));
}
