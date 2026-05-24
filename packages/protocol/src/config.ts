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
 * The bundle's caller for time sync passes individual hex-string bytes into
 * slots [3]..[10] then applies the terminator. The most likely format,
 * matching how the firmware probably parses RTC writes, is:
 *
 *   [3]  year (offset from 2000)
 *   [4]  month (1-12)
 *   [5]  day of month (1-31)
 *   [6]  day of week (0-6, Sunday = 0)
 *   [7]  hour (0-23)
 *   [8]  minute (0-59)
 *   [9]  second (0-59)
 *   [10] reserved / 0
 *
 * If the keyboard ignores this, try BCD encoding (each digit pair packed into
 * one byte — common on RTC chips).
 */
export function timeSyncPayload(date: Date = new Date()): Uint8Array {
  const packet = emptyPacket();
  packet[3] = date.getFullYear() - 2000;
  packet[4] = date.getMonth() + 1;
  packet[5] = date.getDate();
  packet[6] = date.getDay();
  packet[7] = date.getHours();
  packet[8] = date.getMinutes();
  packet[9] = date.getSeconds();
  packet[10] = 0;
  applyTerminator(packet);
  return packet;
}

/**
 * Alternative BCD-encoded time-sync payload. If the byte-encoded version fails
 * against real hardware, fall back to this. RTC chips commonly take BCD.
 */
export function timeSyncPayloadBCD(date: Date = new Date()): Uint8Array {
  const toBCD = (n: number): number => ((Math.floor(n / 10) << 4) | (n % 10)) & 0xff;
  const packet = emptyPacket();
  packet[3] = toBCD(date.getFullYear() - 2000);
  packet[4] = toBCD(date.getMonth() + 1);
  packet[5] = toBCD(date.getDate());
  packet[6] = toBCD(date.getDay());
  packet[7] = toBCD(date.getHours());
  packet[8] = toBCD(date.getMinutes());
  packet[9] = toBCD(date.getSeconds());
  packet[10] = 0;
  applyTerminator(packet);
  return packet;
}

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

function clampMinutes(v: number): number {
  return Math.max(0, Math.min(255, Math.floor(v)));
}
