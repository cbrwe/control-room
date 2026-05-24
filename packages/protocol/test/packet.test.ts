import { describe, it, expect } from 'vitest';
import {
  CATEGORY,
  OP,
  PACKET_SIZE,
  TERMINATOR_HI,
  TERMINATOR_LO,
  beginTxPacket,
  beginTxRgbPacket,
  commandPacket,
  emptyPacket,
  endPacket,
  applyTerminator,
  isAck,
  toHex,
} from '../src/index.js';

describe('packet primitives', () => {
  it('builds 64-byte zero-filled packets', () => {
    const p = emptyPacket();
    expect(p.length).toBe(PACKET_SIZE);
    expect(p.every((b) => b === 0)).toBe(true);
  });

  it('builds a BEGIN_TX packet matching the official bundle', () => {
    // The official bundle: t[0]=4, t[1]=24 (which is 0x18)
    const p = beginTxPacket();
    expect(p[0]).toBe(CATEGORY);
    expect(p[1]).toBe(0x18);
    expect(p[1]).toBe(OP.BEGIN_TX);
    // All other bytes zero
    for (let i = 2; i < PACKET_SIZE; i++) {
      expect(p[i]).toBe(0);
    }
  });

  it('builds a BEGIN_TX_RGB packet (alternate handshake for per-key RGB)', () => {
    // The official bundle: n[0]=4, n[1]=25 (which is 0x19)
    const p = beginTxRgbPacket();
    expect(p[0]).toBe(CATEGORY);
    expect(p[1]).toBe(0x19);
    expect(p[1]).toBe(OP.BEGIN_TX_RGB);
  });

  it('builds an END packet matching the official bundle', () => {
    // The official bundle: t[0]=4, t[1]=2
    const p = endPacket();
    expect(p[0]).toBe(CATEGORY);
    expect(p[1]).toBe(OP.END);
    expect(p[1]).toBe(0x02);
  });
});

describe('commandPacket', () => {
  it('matches the bundle for READ_KEYMAP_L0 (get0410)', () => {
    // Bundle: o[0]=4, o[1]=16, o[8]=9
    const p = commandPacket(OP.READ_KEYMAP_L0, { param: 9 });
    expect(p[0]).toBe(0x04);
    expect(p[1]).toBe(0x10);
    expect(p[8]).toBe(0x09);
    expect(p[2]).toBe(0);
    expect(p[9]).toBe(0);
  });

  it('matches the bundle for READ_KEYMAP_L1 (get0426)', () => {
    // Bundle: o[0]=4, o[1]=38, o[8]=9  (38 = 0x26)
    const p = commandPacket(OP.READ_KEYMAP_L1, { param: 9 });
    expect(p[0]).toBe(0x04);
    expect(p[1]).toBe(0x26);
    expect(p[8]).toBe(0x09);
  });

  it('matches the bundle for WRITE_KEYMAP_L0 (set0411)', () => {
    // Bundle: o[0]=4, o[1]=17, o[8]=9  (17 = 0x11)
    const p = commandPacket(OP.WRITE_KEYMAP_L0, { param: 9 });
    expect(p[0]).toBe(0x04);
    expect(p[1]).toBe(0x11);
    expect(p[8]).toBe(0x09);
  });

  it('matches the bundle for WRITE_KEYMAP_L1 (set0427)', () => {
    // Bundle: o[0]=4, o[1]=39, o[8]=9  (39 = 0x27)
    const p = commandPacket(OP.WRITE_KEYMAP_L1, { param: 9 });
    expect(p[0]).toBe(0x04);
    expect(p[1]).toBe(0x27);
    expect(p[8]).toBe(0x09);
  });

  it('matches the bundle for DEVICE_INFO (get0405)', () => {
    // Bundle: t[0]=4, t[1]=5, t[8]=2
    const p = commandPacket(OP.DEVICE_INFO, { param: 0x02 });
    expect(p[0]).toBe(0x04);
    expect(p[1]).toBe(0x05);
    expect(p[8]).toBe(0x02);
  });

  it('matches the bundle for READ_RGB_STATE (get0412)', () => {
    // Bundle: t[0]=4, t[1]=18, t[8]=2  (18 = 0x12)
    const p = commandPacket(OP.READ_RGB_STATE, { param: 0x02 });
    expect(p[0]).toBe(0x04);
    expect(p[1]).toBe(0x12);
    expect(p[8]).toBe(0x02);
  });

  it('matches the bundle for WRITE_RGB_STATE (set0413)', () => {
    // Bundle: r[0]=4, r[1]=19, r[8]=1  (19 = 0x13)
    const p = commandPacket(OP.WRITE_RGB_STATE, { param: 0x01 });
    expect(p[0]).toBe(0x04);
    expect(p[1]).toBe(0x13);
    expect(p[8]).toBe(0x01);
  });

  it('matches the bundle for WRITE_CONFIG (set0428)', () => {
    // Bundle: r[0]=4, r[1]=40, r[8]=1  (40 = 0x28)
    const p = commandPacket(OP.WRITE_CONFIG, { param: 0x01 });
    expect(p[0]).toBe(0x04);
    expect(p[1]).toBe(0x28);
    expect(p[8]).toBe(0x01);
  });

  it('matches the bundle for TFT_BEGIN with little-endian length (set0472)', () => {
    // Bundle: r[0]=4, r[1]=114, r[2]=2, r[8] = length low, r[9] = length high
    const length = 64800; // 0xFD20 = 0xFD high, 0x20 low
    const p = commandPacket(OP.TFT_BEGIN, {
      sub: 0x02,
      param: length & 0xff,
      paramHigh: (length >> 8) & 0xff,
    });
    expect(p[0]).toBe(0x04);
    expect(p[1]).toBe(0x72);
    expect(p[2]).toBe(0x02);
    expect(p[8]).toBe(0x20);
    expect(p[9]).toBe(0xfd);
  });

  it('supports raw byte overrides', () => {
    const p = commandPacket(OP.WRITE_CONFIG, {
      param: 1,
      overrides: { 3: 0x42, 4: 0x07, 5: 0x18 },
    });
    expect(p[3]).toBe(0x42);
    expect(p[4]).toBe(0x07);
    expect(p[5]).toBe(0x18);
  });
});

describe('terminator', () => {
  it('places 0xAA 0x55 at bytes 62, 63', () => {
    const p = emptyPacket();
    applyTerminator(p);
    expect(p[62]).toBe(TERMINATOR_HI);
    expect(p[63]).toBe(TERMINATOR_LO);
    expect(p[62]).toBe(0xaa);
    expect(p[63]).toBe(0x55);
  });
});

describe('isAck', () => {
  it('returns true when byte [3] is 0x01', () => {
    const ack = new Uint8Array(64);
    ack[3] = 0x01;
    expect(isAck(ack)).toBe(true);
  });

  it('returns false when byte [3] is anything else', () => {
    const nack = new Uint8Array(64);
    nack[3] = 0x00;
    expect(isAck(nack)).toBe(false);
    nack[3] = 0xff;
    expect(isAck(nack)).toBe(false);
  });

  it('returns false for short buffers', () => {
    expect(isAck(new Uint8Array(2))).toBe(false);
  });
});

describe('toHex', () => {
  it('formats bytes as space-separated hex pairs', () => {
    const data = new Uint8Array([0x04, 0x18, 0x00, 0xaa, 0x55]);
    expect(toHex(data)).toBe('04 18 00 aa 55');
  });

  it('zero-pads single-digit hex', () => {
    const data = new Uint8Array([0x00, 0x0f, 0xa0]);
    expect(toHex(data)).toBe('00 0f a0');
  });
});
