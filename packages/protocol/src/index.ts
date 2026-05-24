/**
 * @control-room/protocol
 *
 * HID protocol implementation for the Chilkey ND75 mechanical keyboard.
 *
 * Reverse-engineered from Chilkey's official web configurator. See
 * docs/ND75_PROTOCOL_SPEC.md in the repo root for the byte-level reference.
 *
 * Quick start:
 *
 *   import { ND75Device, USB } from '@control-room/protocol';
 *   import { WebHIDAdapter } from './your-webhid-adapter';
 *
 *   const [controlDevice, screenDevice] = await navigator.hid.requestDevice({
 *     filters: [{ vendorId: USB.vendorId, productId: USB.productId }],
 *   });
 *   const device = new ND75Device(
 *     new WebHIDAdapter(controlDevice),
 *     new WebHIDAdapter(screenDevice)
 *   );
 *   await device.open();
 *   const info = await device.getFirmwareVersion();
 *   console.log(info.version);
 */

// Commands and identifiers
export {
  USB,
  CATEGORY,
  PACKET_SIZE,
  TERMINATOR_HI,
  TERMINATOR_LO,
  OP,
  KEYMAP_PACKET_COUNT,
  KEY_ENTRY_SIZE,
  MAX_KEY_SLOTS,
  LAYER,
  readKeymapOp,
  writeKeymapOp,
  type Layer,
} from './commands.js';

// Adapter interface
export { MockHIDAdapter, type HIDAdapter } from './adapter.js';

// Packet helpers
export {
  emptyPacket,
  commandPacket,
  beginTxPacket,
  beginTxRgbPacket,
  endPacket,
  applyTerminator,
  isAck,
  toHex,
  sleep,
} from './packet.js';

// Keycodes
export {
  KEY,
  CONSUMER,
  SYSTEM,
  MOUSE,
  KeyPage,
  Modifier,
  key,
  consumer,
  system,
  mouse,
  unbound,
  type KeyBinding,
} from './keycodes.js';

// Keymap encoding
export {
  encodeKeymap,
  decodeKeymap,
  blankKeymap,
  type Keymap,
} from './keymap.js';

// RGB lighting
export {
  LightingMode,
  LIGHTING_MODE_NAMES,
  LIGHTING_MODE_LEGACY_NAMES,
  DEFAULT_RGB_STATE,
  encodeRGBState,
  encodePerKeyRGB,
  type Color,
  type RGBState,
} from './rgb.js';

// TFT screen
export {
  SCREEN,
  FRAME_BYTES,
  tftBeginPacket,
  chunkImage,
  rgbaToRgb565,
} from './tft.js';

// Config payloads
export {
  SystemMode,
  timeSyncPayload,
  timeSyncPayloadBCD,
  sleepTimerPayload,
  systemModePayload,
  winLockPayload,
} from './config.js';

// Main device class
export { ND75Device, type FirmwareInfo, type KnobEvent } from './device.js';
