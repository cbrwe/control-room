/**
 * LCD widgets: render functions that paint a 135x240 frame to a canvas. The
 * widget runner takes the rendered RGBA pixels, converts them to RGB565, and
 * pushes them to the keyboard's TFT screen via opcode 0x72.
 *
 * Widget framework supports two flavors:
 *
 *   STATIC  — pure render, no external data (Clock, Static Text)
 *   ASYNC   — has fetchData() called on interval, render gets data + status
 *             (Weather, GitHub, Now Playing)
 *
 * Adding a widget: implement Widget<T>, register it in WIDGETS below. The
 * runner handles canvas allocation, intervals, data fetching, and encoding.
 */

import { SCREEN } from '@control-room/protocol';
import { CLOCK_WIDGET, TEXT_WIDGET } from './widgets/clock-text';
import { WEATHER_WIDGET } from './widgets/weather';
import { GITHUB_WIDGET } from './widgets/github';
import { NOW_PLAYING_WIDGET } from './widgets/now-playing';

/** State passed to render() so widgets can adapt to loading/error conditions. */
export type WidgetDataState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; message: string };

export interface Widget<T = unknown> {
  id: string;
  name: string;
  description: string;
  /** Refresh cadence in seconds. 0 = single-shot (PUSH ONCE only, no LIVE loop). */
  intervalSec: number;
  /**
   * Optional async data fetcher. If present, the runner calls it on every
   * interval tick and passes the resulting state into render().
   */
  fetchData?(): Promise<T>;
  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    state: WidgetDataState<T>
  ): void | Promise<void>;
}

export const WIDGETS: readonly Widget[] = [
  CLOCK_WIDGET,
  TEXT_WIDGET,
  WEATHER_WIDGET,
  GITHUB_WIDGET,
  NOW_PLAYING_WIDGET,
];

export const LCD_WIDTH = SCREEN.width;
export const LCD_HEIGHT = SCREEN.height;

/** Shared palette so every widget feels like part of the same instrument. */
export const PALETTE = {
  ink: '#000000',
  phosphor: '#00ff66',
  phosphorDim: '#00aa44',
  white: '#ffffff',
  dim: '#888888',
  faint: '#555555',
  danger: '#ff4444',
} as const;

/** Fill the canvas with ink black. Every widget should call this first. */
export function clearFrame(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(0, 0, w, h);
}

/** Draw a small phosphor tag (used as a header label across widgets). */
export function drawTag(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string = PALETTE.phosphorDim
): void {
  ctx.fillStyle = color;
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);
}

/** Draw the standard error / disconnected state used by data widgets. */
export function drawErrorState(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  title: string,
  detail?: string
): void {
  clearFrame(ctx, w, h);
  ctx.fillStyle = PALETTE.danger;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(title, w / 2, h / 2 - 8);
  if (detail) {
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '10px monospace';
    const lines = wrapText(ctx, detail, w - 24);
    let y = h / 2 + 16;
    for (const line of lines.slice(0, 3)) {
      ctx.fillText(line, w / 2, y);
      y += 14;
    }
  }
}

/** Draw the standard loading state used by data widgets. */
export function drawLoadingState(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  label: string
): void {
  clearFrame(ctx, w, h);
  ctx.fillStyle = PALETTE.dim;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(label, w / 2, h / 2);
}

/** Greedy text wrapper for max-width canvas text. */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? line + ' ' + word : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}
