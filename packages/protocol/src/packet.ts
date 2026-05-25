/**
 * Low-level packet building helpers.
 *
 * All ND75 control packets are 64 bytes. These helpers construct the packets
 * in a way that mirrors what the official bundle does, byte for byte. Tests
 * verify equivalence.
 */

import { PACKET_SIZE, CATEGORY, OP, TERMINATOR_HI, TERMINATOR_LO } from './commands.js';

/** Create a zero-filled 64-byte packet. */
export function emptyPacket(): Uint8Array {
  return new Uint8Array(PACKET_SIZE);
}

/**
 * Build a basic command packet: [0]=0x04 (category), [1]=opcode, [8]=param, [9]=paramHigh.
 * All other bytes are zero unless overrides are passed.
 */
export function commandPacket(
  opcode: number,
  options: {
    /** Sub-byte at [2]. Used by TFT_BEGIN. */
    sub?: number;
    /** Param byte at [8]. Most common slot for command parameters. */
    param?: number;
    /** Param byte at [9]. Used by multi-byte length fields. */
    paramHigh?: number;
    /** Raw overrides for arbitrary byte positions. */
    overrides?: Record<number, number>;
  } = {}
): Uint8Array {
  const packet = emptyPacket();
  packet[0] = CATEGORY;
  packet[1] = opcode;
  if (options.sub !== undefined) packet[2] = options.sub;
  if (options.param !== undefined) packet[8] = options.param;
  if (options.paramHigh !== undefined) packet[9] = options.paramHigh;
  if (options.overrides) {
    for (const [idx, value] of Object.entries(options.overrides)) {
      packet[Number(idx)] = value;
    }
  }
  return packet;
}

/** Build a BEGIN_TX (0x18) handshake packet. */
export function beginTxPacket(): Uint8Array {
  return commandPacket(OP.BEGIN_TX);
}

/** Build a BEGIN_TX_RGB (0x19) handshake packet used for per-key RGB writes. */
export function beginTxRgbPacket(): Uint8Array {
  return commandPacket(OP.BEGIN_TX_RGB);
}

/**
 * Build an END (0x02) end-of-transaction packet.
 *
 * The bundle's set0413 (RGB) and set0428 (config) end with `[8]=0`. But the
 * keymap-write transactions (set0411, set0427) end with `[8]=1`. Pass that
 * via the optional param.
 */
export function endPacket(options: { param?: number } = {}): Uint8Array {
  const opts: Parameters<typeof commandPacket>[1] = {};
  if (options.param !== undefined) opts.param = options.param;
  return commandPacket(OP.END, opts);
}

/**
 * Apply the multi-packet terminator (bytes 62=0xAA, 63=0x55) to the last
 * packet of a multi-packet payload. The keyboard uses this to detect the
 * end of streamed data.
 */
export function applyTerminator(packet: Uint8Array): Uint8Array {
  packet[62] = TERMINATOR_HI;
  packet[63] = TERMINATOR_LO;
  return packet;
}

/** Check whether a 64-byte ACK indicates success (byte [3] === 0x01). */
export function isAck(response: Uint8Array): boolean {
  return response.length >= 4 && response[3] === 0x01;
}

/**
 * Format a packet as a hex string for logging. Mirrors the `ct()` helper in
 * the official bundle.
 */
export function toHex(data: Uint8Array | ArrayBuffer): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ');
}

/** Sleep helper. The official bundle peppers `await new Promise(r => setTimeout(r, N))` everywhere. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
