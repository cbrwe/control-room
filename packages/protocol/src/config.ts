/**
 * Config payload builders for the WRITE_CONFIG (0x28) opcode.
 *
 * The official Chilkey driver exposes a "Time Correction" button that's been
 * confirmed broken since at least mid-2025 (verified via dev tools by Gadgetoid).
 * This module is where we build the actual payload bytes to make time sync work.
 *
 * The exact byte layout for each config type needs live USB capture against a
 * working firmware build to lock down 100%. The structures below are our best
 * inference from the bundle's `set0428` callers; we'll iterate as we test.
 */

import { applyTerminator, emptyPacket } from './packet.js';

/** System mode: Windows vs macOS key layout. Toggled via Fn+A / Fn+S on the keyboard. */
export const SystemMode = {
  Windows: 0,
  Mac: 1,
} as const;
export type SystemMode = (typeof SystemMode)[keyof typeof SystemMode];

/**
 * Build a time-sync config payload.
 *
 * Byte layout decoded from the official bundle's only caller of `set0428`
 * (the "Time Correction" button). Each field is BCD-encoded: the bundle does
 * `date.getMonth().toString(16).padStart(2,"0")` then `parseInt(..., 16)`,
 * which packs each decimal digit pair as if it were hex (e.g. minute 47
 * becomes 0x47, hour 13 becomes 0x13).
 *
 *   [3]  year (year - 2000, BCD)
 *   [4]  month (1-12, BCD)
 *   [5]  day of month (1-31, BCD)
 *   [6]  hour (0-23, BCD)
 *   [7]  minute (0-59, BCD)
 *   [8]  second (0-59, BCD)
 *   [10] day of week (0-6, Sunday = 0, BCD)
 *   [62] 0xAA terminator
 *   [63] 0x55 terminator
 *
 * Yes, the official "Time Correction" button has been reported broken since
 * mid-2025. Whether that's a payload bug on Chilkey's side or a firmware bug
 * we can't tell without testing. This builder matches what their driver
 * actually sends.
 */
export function timeSyncPayload(date: Date = new Date()): Uint8Array {
  const toBCD = (n: number): number =>
    parseInt(Math.max(0, Math.floor(n)).toString().padStart(2, '0'), 16) & 0xff;
  const packet = emptyPacket();
  packet[3] = toBCD(date.getFullYear() - 2000);
  packet[4] = toBCD(date.getMonth() + 1);
  packet[5] = toBCD(date.getDate());
  packet[6] = toBCD(date.getHours());
  packet[7] = toBCD(date.getMinutes());
  packet[8] = toBCD(date.getSeconds());
  packet[10] = toBCD(date.getDay());
  applyTerminator(packet);
  return packet;
}

/**
 * Legacy alias kept so existing UI continues to compile. The bundle's only
 * encoding is BCD; the "byte" variant we previously shipped never had source
 * confirmation.
 */
export const timeSyncPayloadBCD = timeSyncPayload;

/**
 * Build a sleep-timer config payload. The ND75 has two sleep levels:
 *   - Level 1: backlight off (default 5 min)
 *   - Level 2: deep standby with Bluetooth disconnect (default 30 min)
 *
 * Both values in minutes. Exact byte slots are provisional pending capture.
 */
export function sleepTimerPayload(level1Min: number, level2Min: number): Uint8Array {
  const packet = emptyPacket();
  packet[3] = 0x10; // discriminator byte, guess
  packet[4] = clampMinutes(level1Min);
  packet[5] = clampMinutes(level2Min);
  applyTerminator(packet);
  return packet;
}

/** Build a system-mode (Win/Mac) config payload. */
export function systemModePayload(mode: SystemMode): Uint8Array {
  const packet = emptyPacket();
  packet[3] = 0x20; // discriminator byte, guess
  packet[4] = mode;
  applyTerminator(packet);
  return packet;
}

/** Toggle the Win-key lock. */
export function winLockPayload(locked: boolean): Uint8Array {
  const packet = emptyPacket();
  packet[3] = 0x30; // discriminator byte, guess
  packet[4] = locked ? 1 : 0;
  applyTerminator(packet);
  return packet;
}

/**
 * LCD on-screen language. Ships in Chinese. The bundle has no exposed setter
 * for this so the payload format is unknown; best guess follows the pattern of
 * the other config helpers (discriminator byte at [3], value byte at [4]). If
 * this doesn't fire, change the discriminator first (try 0x50, 0x60), then
 * try moving the value byte slot.
 */
export const Language = {
  Chinese: 0,
  English: 1,
} as const;
export type Language = (typeof Language)[keyof typeof Language];

export function languagePayload(lang: Language): Uint8Array {
  const packet = emptyPacket();
  packet[3] = 0x40; // discriminator byte, guess (next 0x10 step after 0x10/0x20/0x30)
  packet[4] = lang;
  applyTerminator(packet);
  return packet;
}

function clampMinutes(v: number): number {
  return Math.max(0, Math.min(255, Math.floor(v)));
}
