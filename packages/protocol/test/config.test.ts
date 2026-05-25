import { describe, it, expect } from 'vitest';
import {
  Language,
  SystemMode,
  TERMINATOR_HI,
  TERMINATOR_LO,
  languagePayload,
  sleepTimerPayload,
  systemModePayload,
  timeSyncPayload,
  timeSyncPayloadBCD,
  winLockPayload,
} from '../src/index.js';

describe('writeConfig payload builders', () => {
  it('time-sync byte-encoded payload places fields in expected slots', () => {
    const date = new Date(2026, 4, 24, 13, 5, 30); // May 24 2026 13:05:30, Sunday
    const p = timeSyncPayload(date);
    expect(p.length).toBe(64);
    expect(p[3]).toBe(26); // year offset
    expect(p[4]).toBe(5); // month 1-12
    expect(p[5]).toBe(24); // day of month
    expect(p[6]).toBe(0); // Sunday
    expect(p[7]).toBe(13);
    expect(p[8]).toBe(5);
    expect(p[9]).toBe(30);
    expect(p[62]).toBe(TERMINATOR_HI);
    expect(p[63]).toBe(TERMINATOR_LO);
  });

  it('time-sync BCD payload packs each field as packed BCD', () => {
    const date = new Date(2026, 4, 24, 13, 5, 30);
    const p = timeSyncPayloadBCD(date);
    expect(p[3]).toBe(0x26); // year offset 26 -> 0x26
    expect(p[4]).toBe(0x05);
    expect(p[5]).toBe(0x24);
    expect(p[7]).toBe(0x13);
    expect(p[8]).toBe(0x05);
    expect(p[9]).toBe(0x30);
    expect(p[62]).toBe(TERMINATOR_HI);
    expect(p[63]).toBe(TERMINATOR_LO);
  });

  it('system-mode payload writes the mode enum at byte [4] with discriminator [3]=0x20', () => {
    const mac = systemModePayload(SystemMode.Mac);
    expect(mac[3]).toBe(0x20);
    expect(mac[4]).toBe(1);
    const win = systemModePayload(SystemMode.Windows);
    expect(win[3]).toBe(0x20);
    expect(win[4]).toBe(0);
  });

  it('sleep-timer payload clamps to 0..255 and uses discriminator [3]=0x10', () => {
    const p = sleepTimerPayload(5, 300);
    expect(p[3]).toBe(0x10);
    expect(p[4]).toBe(5);
    expect(p[5]).toBe(255);
  });

  it('win-lock payload toggles byte [4] with discriminator [3]=0x30', () => {
    const off = winLockPayload(false);
    expect(off[3]).toBe(0x30);
    expect(off[4]).toBe(0);
    const on = winLockPayload(true);
    expect(on[4]).toBe(1);
  });

  it('language payload uses discriminator [3]=0x40 and lang value at [4]', () => {
    const cn = languagePayload(Language.Chinese);
    expect(cn[3]).toBe(0x40);
    expect(cn[4]).toBe(0);
    expect(cn[62]).toBe(TERMINATOR_HI);
    expect(cn[63]).toBe(TERMINATOR_LO);
    const en = languagePayload(Language.English);
    expect(en[3]).toBe(0x40);
    expect(en[4]).toBe(1);
  });
});
