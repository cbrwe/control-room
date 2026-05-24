/**
 * TFT screen image transmission.
 *
 * Screen specs:
 *   - 135 × 240 pixels (portrait)
 *   - Likely RGB565 pixel format (needs confirmation via live capture). At
 *     RGB565 that's 2 bytes × 135 × 240 = 64,800 bytes per still frame.
 *   - GIFs supported, frames < 60 per Chilkey's own guidance
 *
 * Upload sequence:
 *   1. Send BEGIN_TX (0x18) on the control interface
 *   2. Send TFT_BEGIN (0x72) with sub-byte 0x02 and total length in [8]/[9]
 *   3. Receive ACK
 *   4. Stream chunks via the SCREEN interface (device3.sendReport with reportId 0)
 *   5. Each chunk is 64 bytes of raw pixel data, no header
 *   6. After the last chunk, send END (0x02) on the control interface
 */

import { PACKET_SIZE, OP } from './commands.js';
import { commandPacket } from './packet.js';

/** Screen dimensions in pixels. */
export const SCREEN = {
  width: 135,
  height: 240,
  /** Bytes per pixel assuming RGB565. To be confirmed via live capture. */
  bytesPerPixel: 2,
} as const;

/** Total payload bytes for a single RGB565 frame at native resolution. */
export const FRAME_BYTES = SCREEN.width * SCREEN.height * SCREEN.bytesPerPixel;

/**
 * Build the TFT_BEGIN command packet. The length goes in bytes [8] (low) and
 * [9] (high), little-endian. The 0x02 sub-byte at [2] is hard-coded as it
 * appears constant in the bundle.
 */
export function tftBeginPacket(totalLengthBytes: number): Uint8Array {
  if (totalLengthBytes < 0 || totalLengthBytes > 0xffff) {
    throw new Error(
      `TFT payload length ${totalLengthBytes} is out of the 16-bit range.`
    );
  }
  return commandPacket(OP.TFT_BEGIN, {
    sub: 0x02,
    param: totalLengthBytes & 0xff,
    paramHigh: (totalLengthBytes >> 8) & 0xff,
  });
}

/**
 * Split a pixel buffer into 64-byte chunks for streaming over the screen
 * interface. The last chunk is zero-padded to 64 bytes; the keyboard knows
 * the real length from the TFT_BEGIN header.
 */
export function chunkImage(pixelData: Uint8Array): Uint8Array[] {
  const chunks: Uint8Array[] = [];
  for (let offset = 0; offset < pixelData.length; offset += PACKET_SIZE) {
    const chunk = new Uint8Array(PACKET_SIZE);
    const end = Math.min(offset + PACKET_SIZE, pixelData.length);
    chunk.set(pixelData.subarray(offset, end));
    chunks.push(chunk);
  }
  return chunks;
}

/**
 * Convert an RGBA pixel buffer (4 bytes per pixel, common from Canvas
 * `getImageData()`) to RGB565 (2 bytes per pixel) for upload.
 *
 *   R5 G6 B5  packed as: 0bRRRRRGGGGGGBBBBB
 *
 * Big-endian byte order is most common on these small TFT controllers; if
 * the keyboard expects little-endian, swap the order in the output.
 */
export function rgbaToRgb565(rgba: Uint8Array): Uint8Array {
  if (rgba.length % 4 !== 0) {
    throw new Error('RGBA buffer length must be a multiple of 4.');
  }
  const pixelCount = rgba.length / 4;
  const out = new Uint8Array(pixelCount * 2);
  for (let i = 0; i < pixelCount; i++) {
    const r = rgba[i * 4] ?? 0;
    const g = rgba[i * 4 + 1] ?? 0;
    const b = rgba[i * 4 + 2] ?? 0;
    const r5 = (r >> 3) & 0x1f;
    const g6 = (g >> 2) & 0x3f;
    const b5 = (b >> 3) & 0x1f;
    const packed = (r5 << 11) | (g6 << 5) | b5;
    out[i * 2] = (packed >> 8) & 0xff;
    out[i * 2 + 1] = packed & 0xff;
  }
  return out;
}
