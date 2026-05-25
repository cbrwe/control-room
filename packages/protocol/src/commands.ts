/**
 * ND75 HID command opcodes.
 *
 * Every control packet begins with category byte 0x04. The second byte is the
 * opcode. See docs/ND75_PROTOCOL_SPEC.md for the full byte-level reference.
 */

export const CATEGORY = 0x04;

/** Packet size in bytes. All ND75 feature reports are 64 bytes. */
export const PACKET_SIZE = 64;

/** Magic terminator placed at bytes 62-63 of the final packet in a multi-packet write. */
export const TERMINATOR_HI = 0xaa;
export const TERMINATOR_LO = 0x55;

/**
 * USB IDs and HID descriptors for device discovery.
 *
 * The ND75 exposes several HID interfaces. Only two matter for us:
 *
 *   - control: usagePage 0xFF13 (65299), usage 0x01. Receives all 0x04-prefixed
 *     commands (keymap, RGB, config, transaction control).
 *   - screen:  usagePage 0xFFA0 (65384), usage 0x61. Receives raw TFT pixel
 *     chunks via output reports and acknowledges each chunk via an input
 *     report so the host knows to send the next one.
 *
 * Picking the wrong interface causes silent failures: feature reports get
 * rejected ("Failed to write the report") and the chunk-pump never receives
 * acks. The picker MUST match on both usagePage AND usage.
 */
export const USB = {
  vendorId: 0x36b5,
  productId: 0x2ba7,
  control: { usagePage: 0xff13, usage: 0x01 },
  screen: { usagePage: 0xffa0, usage: 0x61 },
  // Legacy aliases kept for any callers still using the flat shape.
  usagePage: 0xff13,
  usage: 0x01,
} as const;

/**
 * Opcode constants. Each is the second byte of a packet (after CATEGORY = 0x04).
 *
 * Naming follows what each opcode does, not Chilkey's internal numbering.
 */
export const OP = {
  /** End of transaction. Sent after every write/read sequence. ACK on byte [3] = 0x01. */
  END: 0x02,

  /** Read device basic info (firmware version). Response includes version bytes at [8] and [9]. */
  DEVICE_INFO: 0x05,

  /** Read base layer (layer 0) keymap. Returns 9 packets of 64 bytes. */
  READ_KEYMAP_L0: 0x10,

  /** Write base layer keymap. Followed by 9 packets of 64 bytes. */
  WRITE_KEYMAP_L0: 0x11,

  /** Read current global RGB state. */
  READ_RGB_STATE: 0x12,

  /** Write global RGB state. Single 64-byte payload follows. */
  WRITE_RGB_STATE: 0x13,

  /** Write per-key RGB lighting. Multi-packet payload, terminator at last packet. */
  WRITE_RGB_PERKEY: 0x15,

  /** Begin a transaction. Used before most writes. */
  BEGIN_TX: 0x18,

  /** Alternate transaction-begin used by WRITE_RGB_PERKEY. */
  BEGIN_TX_RGB: 0x19,

  /** Read FN layer (layer 1) keymap. Returns 9 packets. */
  READ_KEYMAP_L1: 0x26,

  /** Write FN layer keymap. Followed by 9 packets. */
  WRITE_KEYMAP_L1: 0x27,

  /** Write config (time sync, sleep timer, system mode, etc). Single 64-byte payload. */
  WRITE_CONFIG: 0x28,

  /**
   * Begin TFT screen image transmission. Sub-byte at [2] = 0x02. Length at
   * [8] (low) and [9] (high). After this, pixel data streams over device3.
   */
  TFT_BEGIN: 0x72,

  /** Companion to DEVICE_INFO. Returns extended serial / ID. */
  SERIAL: 0xf0,
} as const;

/** Number of payload packets sent after a keymap write opcode. */
export const KEYMAP_PACKET_COUNT = 9;

/** Number of bytes per key entry in a keymap packet. 4 bytes × 16 keys = 64 bytes per packet. */
export const KEY_ENTRY_SIZE = 4;

/** Maximum number of key slots per layer (9 packets × 16 keys). */
export const MAX_KEY_SLOTS = KEYMAP_PACKET_COUNT * (PACKET_SIZE / KEY_ENTRY_SIZE);

/** Both supported layers. */
export const LAYER = {
  BASE: 0,
  FN: 1,
} as const;

export type Layer = (typeof LAYER)[keyof typeof LAYER];

/** Map a layer index to its read opcode. */
export function readKeymapOp(layer: Layer): number {
  return layer === LAYER.BASE ? OP.READ_KEYMAP_L0 : OP.READ_KEYMAP_L1;
}

/** Map a layer index to its write opcode. */
export function writeKeymapOp(layer: Layer): number {
  return layer === LAYER.BASE ? OP.WRITE_KEYMAP_L0 : OP.WRITE_KEYMAP_L1;
}
