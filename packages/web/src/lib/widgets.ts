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

// High-contrast palette. The 135x240 TFT is small, low-DPI, and viewed under
// varied light; subtle phosphor-on-near-black hides at this size. Pure black
// background + pure phosphor (or white) foreground reads at a glance.
const PHOSPHOR = '#00ff66';
const INK = '#000000';
const DIM = '#888888';

function clearFrame(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);
}

const CLOCK: WidgetRenderer = {
  id: 'clock',
  name: 'Clock',
  description: 'Big phosphor time. Refreshes every minute.',
  intervalSec: 60,
  render(ctx, w, h) {
    clearFrame(ctx, w, h);

    const now = new Date();
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    const weekday = now.toLocaleString(undefined, { weekday: 'short' }).toUpperCase();
    const day = now.getDate();
    const month = now.toLocaleString(undefined, { month: 'short' }).toUpperCase();

    // Big block time, hours over minutes, full width
    ctx.fillStyle = PHOSPHOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 64px monospace';
    ctx.fillText(hh, w / 2, h * 0.32);
    ctx.fillText(mm, w / 2, h * 0.58);

    // Solid phosphor separator between hh and mm
    ctx.fillStyle = PHOSPHOR;
    ctx.fillRect(20, Math.round(h * 0.45) - 1, w - 40, 2);

    // Date block at the bottom in pure white
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px monospace';
    ctx.fillText(`${day} ${month}`, w / 2, h - 42);

    // Weekday tag, slightly dim
    ctx.fillStyle = DIM;
    ctx.font = 'bold 18px monospace';
    ctx.fillText(weekday, w / 2, h - 18);
  },
};

const TEXT: WidgetRenderer = {
  id: 'text',
  name: 'Static Text',
  description: 'A custom message in big phosphor type. Edit and push once.',
  intervalSec: 0,
  render(ctx, w, h) {
    clearFrame(ctx, w, h);
    const raw = (window as Window & { __crCustomText?: string }).__crCustomText ?? 'HELLO';
    const msg = raw.slice(0, 12).toUpperCase();

    ctx.fillStyle = PHOSPHOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Auto-size: bigger text for shorter messages
    const fontSize = msg.length <= 4 ? 56 : msg.length <= 8 ? 38 : 26;
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.fillText(msg, w / 2, h / 2);
  },
};

export const WIDGETS: readonly WidgetRenderer[] = [CLOCK, TEXT];

export const LCD_WIDTH = SCREEN.width;
export const LCD_HEIGHT = SCREEN.height;
