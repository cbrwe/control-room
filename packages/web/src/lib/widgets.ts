/**
 * LCD widgets: render functions that paint a 135x240 frame to a canvas. The
 * widget runner takes the rendered RGBA pixels, converts them to RGB565, and
 * pushes them to the keyboard's TFT screen via opcode 0x72.
 *
 * Adding a widget: implement `WidgetRenderer.render`, register it in
 * `WIDGETS` below. The runner handles canvas allocation, intervals, and
 * encoding.
 */

import { SCREEN } from '@control-room/protocol';

export interface WidgetRenderer {
  id: string;
  name: string;
  description: string;
  /** Refresh cadence in seconds. 60 for a clock, 1 for a stopwatch, etc. */
  intervalSec: number;
  render(ctx: CanvasRenderingContext2D, width: number, height: number): void;
}

const PHOSPHOR = '#5dd674';
const PHOSPHOR_DIM = '#3da856';
const INK = '#06080b';
const TEXT_FAINT = '#5b626d';

function clearFrame(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);
}

function drawBracketFrame(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = PHOSPHOR_DIM;
  ctx.lineWidth = 1;
  const inset = 6;
  const armLen = 18;
  ctx.beginPath();
  // Top-left
  ctx.moveTo(inset, inset + armLen);
  ctx.lineTo(inset, inset);
  ctx.lineTo(inset + armLen, inset);
  // Top-right
  ctx.moveTo(w - inset - armLen, inset);
  ctx.lineTo(w - inset, inset);
  ctx.lineTo(w - inset, inset + armLen);
  // Bottom-left
  ctx.moveTo(inset, h - inset - armLen);
  ctx.lineTo(inset, h - inset);
  ctx.lineTo(inset + armLen, h - inset);
  // Bottom-right
  ctx.moveTo(w - inset - armLen, h - inset);
  ctx.lineTo(w - inset, h - inset);
  ctx.lineTo(w - inset, h - inset - armLen);
  ctx.stroke();
}

const CLOCK: WidgetRenderer = {
  id: 'clock',
  name: 'Clock',
  description: 'Big time, date, and weekday. Refreshes every minute.',
  intervalSec: 60,
  render(ctx, w, h) {
    clearFrame(ctx, w, h);
    drawBracketFrame(ctx, w, h);

    const now = new Date();
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    const weekday = now.toLocaleString(undefined, { weekday: 'short' }).toUpperCase();
    const day = now.getDate();
    const month = now.toLocaleString(undefined, { month: 'short' }).toUpperCase();

    // Header strip
    ctx.fillStyle = TEXT_FAINT;
    ctx.font = '8px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('CONTROL ROOM // CLOCK', 14, 24);

    // Time block — hours over minutes, big
    ctx.fillStyle = PHOSPHOR;
    ctx.textAlign = 'center';
    ctx.font = 'bold 52px JetBrains Mono, monospace';
    ctx.fillText(hh, w / 2, h / 2 - 8);
    ctx.fillText(mm, w / 2, h / 2 + 42);

    // Separator
    ctx.strokeStyle = PHOSPHOR_DIM;
    ctx.beginPath();
    ctx.moveTo(20, h / 2 - 28);
    ctx.lineTo(w - 20, h / 2 - 28);
    ctx.moveTo(20, h / 2 + 60);
    ctx.lineTo(w - 20, h / 2 + 60);
    ctx.stroke();

    // Date block
    ctx.fillStyle = '#9aa1ac';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText(weekday, w / 2, h - 56);
    ctx.fillStyle = PHOSPHOR;
    ctx.font = 'bold 18px JetBrains Mono, monospace';
    ctx.fillText(`${day} ${month}`, w / 2, h - 36);

    // Footer
    ctx.fillStyle = TEXT_FAINT;
    ctx.font = '7px JetBrains Mono, monospace';
    ctx.fillText('LIVE // SYNC ' + now.toLocaleTimeString().slice(0, 5), w / 2, h - 14);
  },
};

const TEXT: WidgetRenderer = {
  id: 'text',
  name: 'Static Text',
  description: 'A custom message. Edit and push once. Doesn\'t auto-refresh.',
  intervalSec: 0,
  render(ctx, w, h) {
    clearFrame(ctx, w, h);
    drawBracketFrame(ctx, w, h);
    const msg = (window as Window & { __crCustomText?: string }).__crCustomText ?? 'HELLO';
    ctx.fillStyle = PHOSPHOR;
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px JetBrains Mono, monospace';
    ctx.fillText(msg.slice(0, 12).toUpperCase(), w / 2, h / 2 + 10);
    ctx.fillStyle = TEXT_FAINT;
    ctx.font = '7px JetBrains Mono, monospace';
    ctx.fillText('CONTROL ROOM // TEXT', w / 2, h - 14);
  },
};

/**
 * Diagnostic test pattern. Renders four horizontal bands of pure colors so we
 * can see which color channels are intact and whether the byte order matches
 * the firmware's expectation. From top: RED, GREEN, BLUE, WHITE.
 *
 * Expected on a correctly-mapped RGB565 little-endian display: red band at top,
 * green below it, blue below that, white at the bottom. Any other mapping tells
 * us how to fix the encoder.
 */
const TEST_PATTERN: WidgetRenderer = {
  id: 'test-pattern',
  name: 'Test Pattern (debug)',
  description: 'Solid bands of R / G / B / W to verify pixel format end-to-end.',
  intervalSec: 0,
  render(ctx, w, h) {
    const bandHeight = h / 4;
    ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0 * bandHeight, w, bandHeight);
    ctx.fillStyle = '#00ff00'; ctx.fillRect(0, 1 * bandHeight, w, bandHeight);
    ctx.fillStyle = '#0000ff'; ctx.fillRect(0, 2 * bandHeight, w, bandHeight);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 3 * bandHeight, w, bandHeight);
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('R', w / 2, 0 * bandHeight + 30);
    ctx.fillText('G', w / 2, 1 * bandHeight + 30);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('B', w / 2, 2 * bandHeight + 30);
    ctx.fillStyle = '#000000';
    ctx.fillText('W', w / 2, 3 * bandHeight + 30);
  },
};

export const WIDGETS: readonly WidgetRenderer[] = [CLOCK, TEXT, TEST_PATTERN];

export const LCD_WIDTH = SCREEN.width;
export const LCD_HEIGHT = SCREEN.height;
