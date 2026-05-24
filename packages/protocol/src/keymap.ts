/**
 * Keymap encode/decode.
 *
 * Each layer is 576 bytes (9 packets × 64 bytes). Each key occupies 4 bytes:
 *
 *   [0] page indicator     (0x00 = keyboard, 0x02 = consumer, 0x01 = system, 0x03 = mouse)
 *   [1] usage low byte     (the actual HID usage code)
 *   [2] usage high byte    (modifier bitmask for keyboard page, page-2 marker for consumer)
 *   [3] flag byte          (extra flags, often 0)
 *
 * A layer holds up to 144 key slots (9 × 16). The physical 75% layout uses
 * 6 rows totaling roughly 82 keys; remaining slots are unused.
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
    packet[byteOffset] = binding.page;
    packet[byteOffset + 1] = binding.usageLow;
    packet[byteOffset + 2] = binding.modifiers ?? binding.usageHigh;
    packet[byteOffset + 3] = 0;
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
      const page = packet[offset] ?? 0;
      const low = packet[offset + 1] ?? 0;
      const high = packet[offset + 2] ?? 0;

      // Page 0, low 0, high 0 means empty slot (or terminator zone on packet 8).
      if (page === 0 && low === 0 && high === 0) {
        // Skip rather than return — there may be real entries after, the official
        // bundle iterates the full grid.
        bindings.push({
          page: KeyPage.Keyboard,
          usageLow: 0,
          usageHigh: 0,
        });
        continue;
      }

      const binding: KeyBinding = {
        page: page as KeyPage,
        usageLow: low,
        usageHigh: page === KeyPage.Keyboard ? 0 : high,
      };

      // On the keyboard page, byte [2] is the modifier bitmask, not a usage high byte.
      if (page === KeyPage.Keyboard && high !== 0) {
        binding.modifiers = high;
      }

      bindings.push(binding);
    }
  }

  return bindings;
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
