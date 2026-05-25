/**
 * High-level ND75 device controller.
 *
 * Wraps the two HID interfaces (control and screen) and exposes friendly
 * methods for everything the protocol supports. Each method does the full
 * begin/op/payload/end transaction sequence; callers don't have to think
 * about handshakes.
 *
 * Usage:
 *
 *   const device = new ND75Device(controlAdapter, screenAdapter);
 *   await device.open();
 *   const version = await device.getFirmwareVersion();
 *   const map = await device.readKeymap(LAYER.BASE);
 *   await device.writeKeymap(LAYER.BASE, modifiedMap);
 *   await device.close();
 */

import type { HIDAdapter } from './adapter.js';
import {
  OP,
  KEYMAP_PACKET_COUNT,
  LAYER,
  readKeymapOp,
  writeKeymapOp,
  type Layer,
} from './commands.js';
import {
  applyTerminator,
  beginTxPacket,
  beginTxRgbPacket,
  commandPacket,
  endPacket,
  isAck,
  sleep,
} from './packet.js';
import { encodeKeymap, decodeKeymap, type Keymap } from './keymap.js';
import {
  encodePerKeyRGB,
  encodeRGBState,
  type RGBState,
  type Color,
} from './rgb.js';
import { chunkImage, tftBeginPacket } from './tft.js';

/** Timing knobs. Mirrors the official bundle's setTimeout values. */
const DELAY = {
  /** Standard inter-step delay between packets in a transaction. */
  STEP_MS: 5,
  /** Longer wait used after some opcodes to let firmware catch up. */
  LONG_MS: 20,
  /** Used between keymap payload packets specifically. */
  KEYMAP_PACKET_MS: 50,
} as const;

export interface FirmwareInfo {
  /** Version string in the form "Vmajor.minor", e.g. "V12". */
  version: string;
  /** Raw bytes from the DEVICE_INFO response, in case the caller wants them. */
  raw: Uint8Array;
}

/** Knob rotation event. Fires when the user turns the keyboard's encoder. */
export interface KnobEvent {
  /** Which knob (the ND75 has one but the protocol supports multiple). */
  knob: number;
  /** Direction or position component. */
  axis: number;
  /** Combined 16-bit value from the input report. */
  value: number;
}

export class ND75Device {
  private inputHandlers: ((event: KnobEvent) => void)[] = [];

  /**
   * @param control HID interface for control commands (the 0x04-prefixed ones)
   * @param screen Optional HID interface for streaming TFT pixel data. If
   *   omitted, image upload is unavailable but everything else works.
   */
  constructor(
    private readonly control: HIDAdapter,
    private readonly screen?: HIDAdapter
  ) {}

  /** Open both HID interfaces and start listening for knob events. */
  async open(): Promise<void> {
    await this.control.open();
    if (this.screen) await this.screen.open();
    this.control.onInputReport((data) => this.handleInputReport(data));
  }

  /** Close both HID interfaces. */
  async close(): Promise<void> {
    await this.control.close();
    if (this.screen) await this.screen.close();
  }

  /** Subscribe to knob rotation events. Returns an unsubscribe function. */
  onKnob(handler: (event: KnobEvent) => void): () => void {
    this.inputHandlers.push(handler);
    return () => {
      const idx = this.inputHandlers.indexOf(handler);
      if (idx >= 0) this.inputHandlers.splice(idx, 1);
    };
  }

  private handleInputReport(data: Uint8Array): void {
    // The official bundle parses: r[0]===20 (0x14) means knob event,
    // knob[r[1]][r[3]] = r[4] << 8 | r[5]
    if (data[0] !== 0x14) return;
    const knob = data[1] ?? 0;
    const axis = data[3] ?? 0;
    const value = ((data[4] ?? 0) << 8) | (data[5] ?? 0);
    const event: KnobEvent = { knob, axis, value };
    for (const handler of this.inputHandlers) handler(event);
  }

  // -------------------------------------------------------------------------
  // Device info
  // -------------------------------------------------------------------------

  /**
   * Read firmware version. Sends DEVICE_INFO (0x05) and parses the response.
   * Format from the bundle: version = "V" + r[9]*10 + r[8].
   */
  async getFirmwareVersion(): Promise<FirmwareInfo> {
    // BEGIN_TX is not used for DEVICE_INFO in the official bundle.
    const cmd = commandPacket(OP.DEVICE_INFO, { param: 0x02 });
    await this.control.sendFeatureReport(0, cmd);
    await sleep(DELAY.STEP_MS * 2);

    // First receive is the command ACK, second is the payload.
    await this.control.receiveFeatureReport(0); // ACK
    await sleep(DELAY.STEP_MS * 2);
    const payload = await this.control.receiveFeatureReport(0);

    const major = payload[9] ?? 0;
    const minor = payload[8] ?? 0;
    const version = `V${major * 10 + minor}`;

    await this.endTransaction();
    return { version, raw: payload };
  }

  // -------------------------------------------------------------------------
  // Keymap (base layer + FN layer)
  // -------------------------------------------------------------------------

  /** Read a full keymap layer (base or FN) from the keyboard. */
  async readKeymap(layer: Layer): Promise<Keymap> {
    await this.beginTransaction();

    const opcode = readKeymapOp(layer);
    const cmd = commandPacket(opcode, { param: KEYMAP_PACKET_COUNT });
    await this.control.sendFeatureReport(0, cmd);
    await sleep(DELAY.LONG_MS / 2);

    const ack = await this.control.receiveFeatureReport(0);
    if (!isAck(ack)) {
      throw new Error(
        `Keymap read for layer ${layer} was not acknowledged. ACK byte: ${ack[3]}`
      );
    }

    const packets: Uint8Array[] = [];
    for (let i = 0; i < KEYMAP_PACKET_COUNT; i++) {
      await sleep(DELAY.KEYMAP_PACKET_MS);
      packets.push(await this.control.receiveFeatureReport(0));
    }

    await this.endTransaction();
    return decodeKeymap(packets);
  }

  /** Write a complete keymap layer back to the keyboard. */
  async writeKeymap(layer: Layer, keymap: Keymap): Promise<void> {
    await this.beginTransaction();

    const opcode = writeKeymapOp(layer);
    const cmd = commandPacket(opcode, { param: KEYMAP_PACKET_COUNT });
    await sleep(DELAY.STEP_MS);
    await this.control.sendFeatureReport(0, cmd);
    await sleep(DELAY.STEP_MS);

    const ack = await this.control.receiveFeatureReport(0);
    if (!isAck(ack)) {
      throw new Error(`Keymap write command for layer ${layer} was rejected.`);
    }

    const packets = encodeKeymap(keymap);
    for (const packet of packets) {
      await this.control.sendFeatureReport(0, packet);
      await sleep(DELAY.KEYMAP_PACKET_MS);
    }

    // Keymap write END takes [8]=1, with a 20ms warm-up. Matches the bundle's
    // set0411 / set0427 final block byte-for-byte.
    await sleep(DELAY.LONG_MS);
    await this.control.sendFeatureReport(0, endPacket({ param: 1 }));
    await sleep(30);
    await this.control.receiveFeatureReport(0);
  }

  // -------------------------------------------------------------------------
  // RGB lighting
  // -------------------------------------------------------------------------

  /** Set the global RGB state (one of the 19 modes, plus color and brightness). */
  async setRGBState(state: RGBState): Promise<void> {
    await this.beginTransaction();

    const cmd = commandPacket(OP.WRITE_RGB_STATE, { param: 1 });
    await sleep(DELAY.STEP_MS);
    await this.control.sendFeatureReport(0, cmd);
    await sleep(DELAY.STEP_MS);

    const ack = await this.control.receiveFeatureReport(0);
    if (!isAck(ack)) {
      throw new Error('RGB state write command was rejected.');
    }

    const payload = encodeRGBState(state);
    await sleep(DELAY.STEP_MS);
    await this.control.sendFeatureReport(0, payload);
    await sleep(DELAY.STEP_MS);

    await this.endTransaction();
  }

  /**
   * Set per-key RGB colors. Provide one Color per physical key, in the same
   * order the keymap uses.
   *
   * NOTE: The exact per-key packet stride is provisional. Verify against
   * captured reference packets before relying on this in production.
   */
  async setPerKeyRGB(colors: readonly Color[]): Promise<void> {
    // BEGIN_TX_RGB instead of the regular BEGIN_TX for this operation.
    await this.control.sendFeatureReport(0, beginTxRgbPacket());
    await sleep(DELAY.STEP_MS);
    await this.control.receiveFeatureReport(0);
    await sleep(DELAY.STEP_MS);

    const packets = encodePerKeyRGB(colors);
    const cmd = commandPacket(OP.WRITE_RGB_PERKEY, { param: packets.length });
    await this.control.sendFeatureReport(0, cmd);
    await sleep(DELAY.STEP_MS);
    await this.control.receiveFeatureReport(0);
    await sleep(DELAY.STEP_MS);

    for (const packet of packets) {
      await this.control.sendFeatureReport(0, packet);
      await sleep(DELAY.LONG_MS);
    }

    await this.endTransaction();
  }

  // -------------------------------------------------------------------------
  // TFT screen
  // -------------------------------------------------------------------------

  /**
   * Upload an image (or a frame of a GIF) to the LCD screen. Pixel data must
   * be in the format the firmware expects, typically RGB565 at 135x240.
   *
   * Flow control matches the bundle's set0472: we send the FIRST chunk after
   * TFT_BEGIN, then the keyboard sends an input report on the screen interface
   * each time it's ready for the next chunk. After the final ack we send END.
   * Blasting all chunks back-to-back without waiting drops frames and the
   * keyboard rejects subsequent feature reports.
   *
   * If only a single HID interface was provided, throws.
   */
  async uploadImage(pixelData: Uint8Array): Promise<void> {
    if (!this.screen) {
      throw new Error(
        'Screen interface not provided to ND75Device. Pass a second HIDAdapter to the constructor to enable image upload.'
      );
    }

    const screen = this.screen;
    const chunks = chunkImage(pixelData);
    if (chunks.length === 0) return;

    await this.beginTransaction();

    const begin = tftBeginPacket(chunks.length);
    await sleep(DELAY.STEP_MS);
    await this.control.sendFeatureReport(0, begin);
    await sleep(DELAY.STEP_MS);

    const ack = await this.control.receiveFeatureReport(0);
    if (!isAck(ack)) {
      throw new Error('TFT_BEGIN was not acknowledged.');
    }

    // Drive the chunk pump from the screen interface's input reports.
    let chunkIndex = 0;
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`TFT upload timed out at chunk ${chunkIndex}/${chunks.length}.`));
      }, 30000);

      screen.onInputReport(() => {
        if (chunkIndex >= chunks.length - 1) {
          clearTimeout(timeout);
          resolve();
          return;
        }
        chunkIndex++;
        screen.sendOutputReport(0, chunks[chunkIndex]!).catch((err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      // Kick off the pump with the first chunk; the keyboard's reply on
      // the screen interface triggers each subsequent send.
      screen.sendOutputReport(0, chunks[0]!).catch((err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    await this.endTransaction();
  }

  // -------------------------------------------------------------------------
  // Config (time sync, sleep timer, system mode, etc.)
  // -------------------------------------------------------------------------

  /**
   * Write an arbitrary config payload via WRITE_CONFIG (0x28). Used for time
   * sync, sleep timers, and system mode switching. The payload format depends
   * on the specific setting; build it with the helpers in config.ts.
   */
  async writeConfig(payload: Uint8Array): Promise<void> {
    if (payload.length !== 64) {
      throw new Error(`Config payload must be 64 bytes, got ${payload.length}.`);
    }

    await this.beginTransaction();

    const cmd = commandPacket(OP.WRITE_CONFIG, { param: 1 });
    await sleep(DELAY.STEP_MS);
    await this.control.sendFeatureReport(0, cmd);
    await sleep(DELAY.STEP_MS);

    const ack = await this.control.receiveFeatureReport(0);
    if (!isAck(ack)) {
      throw new Error('Config write command was rejected.');
    }

    // Ensure the terminator is on the payload (the bundle always sets it).
    applyTerminator(payload);
    await sleep(DELAY.STEP_MS);
    await this.control.sendFeatureReport(0, payload);
    await sleep(DELAY.LONG_MS);

    await this.endTransaction();
  }

  // -------------------------------------------------------------------------
  // Transaction primitives
  // -------------------------------------------------------------------------

  private async beginTransaction(): Promise<void> {
    await this.control.sendFeatureReport(0, beginTxPacket());
    await sleep(DELAY.STEP_MS);
    await this.control.receiveFeatureReport(0);
  }

  private async endTransaction(): Promise<void> {
    await this.control.sendFeatureReport(0, endPacket());
    await sleep(DELAY.STEP_MS);
    await this.control.receiveFeatureReport(0);
  }
}

export { LAYER, type Layer };
