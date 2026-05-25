/**
 * Keymap encode/decode.
 *
 * Each layer is 576 bytes (9 packets × 64 bytes). Each key occupies 4 bytes.
 * Layout decoded from the bundle's catalog `keymap` strings (e.g. Vol+ ships
 * as `0-1-03-e9-00-00` meaning wire bytes [0x03, 0xE9, 0x00, 0x00]):
 *
 *   KEYBOARD          [0]=0x02  [1]=modifier  [2]=HID usage  [3]=0
 *   CONSUMER / MEDIA  [0]=0x03  [1]=low       [2]=high       [3]=0
 *   MOUSE             [0]=0x01  [1]=0x01      [2]=button     [3]=0
 *   UNBOUND           [0]=0     [1]=0         [2]=0          [3]=0
 *
 * A layer holds up to 144 key slots (9 × 16). The physical 75% layout uses
 * sparse slots (page*16 + pageNumber); empty slots stay at [0,0,0,0].
 */

import {
  PACKET_SIZE,
  KEY_ENTRY_SIZE,
  KEYMAP_PACKET_COUNT,
  MAX_KEY_SLOTS,
} from './commands.js';
import { applyTerminator, emptyPacket } from './packet.js';
import { KeyPage, type KeyBinding } from './keycodes.js';

/** A complete layer of key bindings, indexed by slot (0 to 143). */
export type Keymap = readonly KeyBinding[];

/** Number of key slots per packet (64 bytes / 4 bytes per key = 16). */
const KEYS_PER_PACKET = PACKET_SIZE / KEY_ENTRY_SIZE;

/**
 * Encode a layer of key bindings into 9 packets of 64 bytes each.
 *
 * The result is the exact byte sequence that streams to the keyboard after a
 * WRITE_KEYMAP_L0 (0x11) or WRITE_KEYMAP_L1 (0x27) opcode.
 *
 * The last packet gets the 0xAA 0x55 terminator at bytes [62] and [63].
 */
export function encodeKeymap(keymap: Keymap): Uint8Array[] {
  if (keymap.length > MAX_KEY_SLOTS) {
    throw new Error(
      `Keymap has ${keymap.length} entries but the ND75 supports at most ${MAX_KEY_SLOTS}.`
    );
  }

  const packets: Uint8Array[] = [];
  for (let p = 0; p < KEYMAP_PACKET_COUNT; p++) {
    packets.push(emptyPacket());
  }

  for (let slot = 0; slot < keymap.length; slot++) {
    const binding = keymap[slot]!;
    const packetIndex = Math.floor(slot / KEYS_PER_PACKET);
    const slotInPacket = slot % KEYS_PER_PACKET;
    const byteOffset = slotInPacket * KEY_ENTRY_SIZE;

    const packet = packets[packetIndex]!;
    const wire = encodeBindingWire(binding);
    packet[byteOffset] = wire[0];
    packet[byteOffset + 1] = wire[1];
    packet[byteOffset + 2] = wire[2];
    packet[byteOffset + 3] = wire[3];
  }

  // Last packet gets the terminator.
  applyTerminator(packets[KEYMAP_PACKET_COUNT - 1]!);

  return packets;
}

/**
 * Decode 9 received packets back into a keymap.
 *
 * Stops at the first key slot whose page byte is zero AND usage bytes are
 * zero, treating that as the end of the meaningful map. (This mirrors how the
 * official bundle parses the response.)
 */
export function decodeKeymap(packets: readonly Uint8Array[]): KeyBinding[] {
  if (packets.length !== KEYMAP_PACKET_COUNT) {
    throw new Error(
      `Expected ${KEYMAP_PACKET_COUNT} packets, got ${packets.length}.`
    );
  }

  const bindings: KeyBinding[] = [];
  for (let p = 0; p < KEYMAP_PACKET_COUNT; p++) {
    const packet = packets[p]!;
    for (let s = 0; s < KEYS_PER_PACKET; s++) {
      const offset = s * KEY_ENTRY_SIZE;
      bindings.push(decodeBindingWire(
        packet[offset] ?? 0,
        packet[offset + 1] ?? 0,
        packet[offset + 2] ?? 0,
        packet[offset + 3] ?? 0,
      ));
    }
  }

  return bindings;
}

/** Inverse of encodeBindingWire — read 4 bytes back into a KeyBinding. */
function decodeBindingWire(b0: number, b1: number, b2: number, _b3: number): KeyBinding {
  if (b0 === 0 && b1 === 0 && b2 === 0) {
    return { page: KeyPage.Keyboard, usageLow: 0, usageHigh: 0 };
  }
  switch (b0) {
    case 0x02: {
      // Keyboard: byte [1] = modifier, byte [2] = HID usage
      const binding: KeyBinding = {
        page: KeyPage.Keyboard,
        usageLow: b2,
        usageHigh: 0,
      };
      if (b1 !== 0) binding.modifiers = b1;
      return binding;
    }
    case 0x03:
      // Consumer / system: byte [1] = low, byte [2] = high
      return { page: KeyPage.Consumer, usageLow: b1, usageHigh: b2 };
    case 0x01:
      // Mouse: byte [2] = button code
      return { page: KeyPage.Mouse, usageLow: b2, usageHigh: 0 };
    default:
      return { page: KeyPage.Keyboard, usageLow: 0, usageHigh: 0 };
  }
}

/**
 * Build an "empty" keymap with all slots unbound. Useful as a starting point
 * for tests and "reset to blank" operations.
 */
export function blankKeymap(): KeyBinding[] {
  const bindings: KeyBinding[] = [];
  for (let i = 0; i < MAX_KEY_SLOTS; i++) {
    bindings.push({ page: KeyPage.Keyboard, usageLow: 0, usageHigh: 0 });
  }
  return bindings;
}

/**
 * Translate a logical KeyBinding into the four wire bytes the firmware
 * actually wants. Source: the bundle's catalog `keymap` fields, e.g. Vol+ is
 * stored as "0-1-03-e9-00-00" meaning wire bytes [0x03, 0xE9, 0x00, 0x00].
 *
 * Type byte at [0]:
 *   0x00 = empty/unbound (everything else zero)
 *   0x01 = mouse
 *   0x02 = keyboard (with optional modifier in byte [1])
 *   0x03 = consumer / system (uses the consumer wire slot in the bundle's catalog)
 */
function encodeBindingWire(b: KeyBinding): [number, number, number, number] {
  // Treat any binding with no usage as unbound.
  if (b.usageLow === 0 && b.usageHigh === 0 && (b.modifiers ?? 0) === 0) {
    return [0, 0, 0, 0];
  }
  switch (b.page) {
    case KeyPage.Keyboard:
      return [0x02, b.modifiers ?? 0, b.usageLow & 0xff, 0];
    case KeyPage.Consumer:
    case KeyPage.System:
      return [0x03, b.usageLow & 0xff, b.usageHigh & 0xff, 0];
    case KeyPage.Mouse:
      return [0x01, 0x01, b.usageLow & 0xff, 0];
    default:
      return [0, 0, 0, 0];
  }
}
