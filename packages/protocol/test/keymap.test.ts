import { describe, it, expect } from 'vitest';
import {
  encodeKeymap,
  decodeKeymap,
  blankKeymap,
  key,
  consumer,
  mouse,
  unbound,
  CONSUMER,
  KEY,
  Modifier,
  TERMINATOR_HI,
  TERMINATOR_LO,
  KEYMAP_PACKET_COUNT,
  PACKET_SIZE,
  KeyPage,
  type KeyBinding,
} from '../src/index.js';

describe('encodeKeymap', () => {
  it('produces 9 packets of 64 bytes each', () => {
    const map = blankKeymap();
    const packets = encodeKeymap(map);
    expect(packets.length).toBe(KEYMAP_PACKET_COUNT);
    for (const p of packets) {
      expect(p.length).toBe(PACKET_SIZE);
    }
  });

  it('places terminator 0xAA 0x55 on the last packet only', () => {
    const packets = encodeKeymap(blankKeymap());
    const last = packets[KEYMAP_PACKET_COUNT - 1]!;
    expect(last[62]).toBe(TERMINATOR_HI);
    expect(last[63]).toBe(TERMINATOR_LO);

    for (let i = 0; i < KEYMAP_PACKET_COUNT - 1; i++) {
      expect(packets[i]![62]).toBe(0);
      expect(packets[i]![63]).toBe(0);
    }
  });

  it('encodes a plain keyboard binding in slot 0', () => {
    const map: KeyBinding[] = [key(KEY.A), ...blankKeymap().slice(1)];
    const packets = encodeKeymap(map);
    const first = packets[0]!;
    expect(first[0]).toBe(KeyPage.Keyboard);
    expect(first[1]).toBe(KEY.A);
    expect(first[2]).toBe(0);
    expect(first[3]).toBe(0);
  });

  it('encodes a binding with modifiers (Ctrl+Shift+C)', () => {
    const binding = key(KEY.C, Modifier.CtrlL | Modifier.ShiftL);
    const map: KeyBinding[] = [binding, ...blankKeymap().slice(1)];
    const packets = encodeKeymap(map);
    expect(packets[0]![0]).toBe(KeyPage.Keyboard);
    expect(packets[0]![1]).toBe(KEY.C);
    expect(packets[0]![2]).toBe(Modifier.CtrlL | Modifier.ShiftL); // 0x03
  });

  it('encodes a consumer-control binding (Volume Up)', () => {
    const map: KeyBinding[] = [consumer(CONSUMER.VolumeUp), ...blankKeymap().slice(1)];
    const packets = encodeKeymap(map);
    expect(packets[0]![0]).toBe(KeyPage.Consumer);
    expect(packets[0]![1]).toBe(0xe9);
    expect(packets[0]![2]).toBe(0x00);
  });

  it('encodes a mouse-button binding', () => {
    const map: KeyBinding[] = [mouse(0x04), ...blankKeymap().slice(1)];
    const packets = encodeKeymap(map);
    expect(packets[0]![0]).toBe(KeyPage.Mouse);
    expect(packets[0]![1]).toBe(0x04);
  });

  it('packs 16 keys into the first packet', () => {
    const map: KeyBinding[] = [
      key(KEY.A), key(KEY.B), key(KEY.C), key(KEY.D),
      key(KEY.E), key(KEY.F), key(KEY.G), key(KEY.H),
      key(KEY.I), key(KEY.J), key(KEY.K), key(KEY.L),
      key(KEY.M), key(KEY.N), key(KEY.O), key(KEY.P),
      ...blankKeymap().slice(16),
    ];
    const packets = encodeKeymap(map);
    const first = packets[0]!;
    // Each key takes 4 bytes; verify all 16 in the first packet
    expect(first[1]).toBe(KEY.A);
    expect(first[5]).toBe(KEY.B);
    expect(first[9]).toBe(KEY.C);
    expect(first[61]).toBe(KEY.P);
  });

  it('overflows into the second packet at slot 16', () => {
    const map: KeyBinding[] = [...blankKeymap().slice(0, 16), key(KEY.Q), ...blankKeymap().slice(17)];
    const packets = encodeKeymap(map);
    expect(packets[1]![1]).toBe(KEY.Q);
  });

  it('rejects keymaps larger than MAX_KEY_SLOTS', () => {
    const tooMany: KeyBinding[] = Array(200).fill(unbound());
    expect(() => encodeKeymap(tooMany)).toThrow(/at most/);
  });
});

describe('decodeKeymap', () => {
  it('round-trips through encode/decode', () => {
    const original: KeyBinding[] = [
      key(KEY.A),
      key(KEY.B, Modifier.CtrlL),
      consumer(CONSUMER.VolumeUp),
      mouse(0x04),
      ...blankKeymap().slice(4),
    ];
    const packets = encodeKeymap(original);
    const decoded = decodeKeymap(packets);

    expect(decoded[0]!.page).toBe(KeyPage.Keyboard);
    expect(decoded[0]!.usageLow).toBe(KEY.A);

    expect(decoded[1]!.page).toBe(KeyPage.Keyboard);
    expect(decoded[1]!.usageLow).toBe(KEY.B);
    expect(decoded[1]!.modifiers).toBe(Modifier.CtrlL);

    expect(decoded[2]!.page).toBe(KeyPage.Consumer);
    expect(decoded[2]!.usageLow).toBe(0xe9);

    expect(decoded[3]!.page).toBe(KeyPage.Mouse);
    expect(decoded[3]!.usageLow).toBe(0x04);
  });

  it('throws on wrong packet count', () => {
    expect(() => decodeKeymap([new Uint8Array(64)])).toThrow(/9 packets/);
  });
});

describe('blankKeymap', () => {
  it('produces 144 unbound entries', () => {
    const map = blankKeymap();
    expect(map.length).toBe(144);
    expect(map.every((b) => b.usageLow === 0 && b.page === KeyPage.Keyboard)).toBe(true);
  });
});
