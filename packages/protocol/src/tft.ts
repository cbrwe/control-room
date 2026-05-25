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
 * Build the TFT_BEGIN command packet. The bundle's set0472 stores the chunk
 * COUNT in bytes [8] (low) and [9] (high), little-endian — NOT the byte length.
 * `set0472(e, t)` uses `t.length.toString(16)` where `t` is the chunk array.
 * The 0x02 sub-byte at [2] is hard-coded as it appears constant in the bundle.
 */
export function tftBeginPacket(chunkCount: number): Uint8Array {
  if (chunkCount < 0 || chunkCount > 0xffff) {
    throw new Error(`TFT chunk count ${chunkCount} is out of the 16-bit range.`);
  }
  return commandPacket(OP.TFT_BEGIN, {
    sub: 0x02,
    param: chunkCount & 0xff,
    paramHigh: (chunkCount >> 8) & 0xff,
  });
}

/**
 * Size of each TFT output chunk. The screen interface's HID report descriptor
 * uses 4096-byte output reports, NOT the usual 64-byte feature-report size.
 * Decoded from the bundle's set0472 caller, which allocates
 * `new Uint8Array(4096)` per chunk and references `me === 4096` as the wrap
 * threshold.
 */
export const TFT_CHUNK_BYTES = 4096;

/** Size of the metadata header on chunk 0 (frame count + delays + padding). */
export const TFT_HEADER_BYTES = 256;

/**
 * Build the chunk array that gets streamed to the screen interface.
 *
 * Chunk format (from bundle's image-upload component):
 *
 *   chunk[0][0]        = frame count G (1 for a still image)
 *   chunk[0][1..G]     = per-frame delay (ms) — for GIFs; ignored for stills
 *   chunk[0][G+1..255] = 0xFF padding
 *   chunk[0][256..]    = pixel data starts here
 *   chunk[N][0..4095]  = continuing pixel data
 *   last chunk         = padded with 0xFF if pixel data runs out
 *
 * Total chunks = ceil((pixelBytes + 256) / 4096).
 *
 * @param pixelData  Concatenated RGB565 pixel bytes for all frames (already
 *                   little-endian; build with rgbaToRgb565()).
 * @param frameDelays Per-frame delay in ms. Length 1 for a still image; up to
 *                   60 for a GIF.
 */
export function chunkImage(
  pixelData: Uint8Array,
  frameDelays: readonly number[] = [0]
): Uint8Array[] {
  const frameCount = Math.max(1, frameDelays.length);
  const chunkCount = Math.ceil((pixelData.length + TFT_HEADER_BYTES) / TFT_CHUNK_BYTES);

  const chunks: Uint8Array[] = [];
  for (let i = 0; i < chunkCount; i++) {
    const c = new Uint8Array(TFT_CHUNK_BYTES);
    c.fill(0xff);
    chunks.push(c);
  }

  // Header at the start of chunk 0.
  chunks[0]![0] = frameCount & 0xff;
  for (let i = 0; i < frameCount; i++) {
    chunks[0]![1 + i] = (frameDelays[i] ?? 0) & 0xff;
  }

  // Pixel data starts at offset 256 of chunk 0.
  let chunkIndex = 0;
  let offsetInChunk = TFT_HEADER_BYTES;
  for (let i = 0; i < pixelData.length; i++) {
    chunks[chunkIndex]![offsetInChunk] = pixelData[i]!;
    offsetInChunk++;
    if (offsetInChunk === TFT_CHUNK_BYTES) {
      offsetInChunk = 0;
      chunkIndex++;
      if (chunkIndex >= chunks.length) break;
    }
  }

  return chunks;
}

/**
 * Convert an RGBA pixel buffer (4 bytes per pixel, common from Canvas
 * `getImageData()`) to RGB565 (2 bytes per pixel) for upload.
 *
 *   R5 G6 B5  packed as: 0bRRRRRGGGGGGBBBBB
 *
 * Byte order in the output is little-endian (low byte first, high byte
 * second). Verified against the bundle's pixel converter — they assemble
 * the 16-bit value via binary-string concatenation and write
 * `J[ee] = lowHex; J[ee+1] = highHex`.
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
    out[i * 2] = packed & 0xff;             // low byte first (little-endian)
    out[i * 2 + 1] = (packed >> 8) & 0xff;  // high byte second
  }
  return out;
}
