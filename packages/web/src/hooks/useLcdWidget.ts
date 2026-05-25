/**
 * Drives a single LCD widget: maintains a hidden canvas, renders the active
 * widget into it on a timer, converts the result to RGB565, and uploads to the
 * keyboard. Stops cleanly on unmount or when the widget is swapped out.
 */

import { useEffect, useRef, useState } from 'react';
import { type ND75Device, rgbaToRgb565 } from '@control-room/protocol';
import { LCD_HEIGHT, LCD_WIDTH, type WidgetRenderer } from '../lib/widgets';

export type WidgetState =
  | { status: 'idle' }
  | { status: 'rendering' }
  | { status: 'uploading'; progress?: number }
  | { status: 'live'; lastPushedAt: number; nextPushAt?: number }
  | { status: 'error'; message: string };

interface UseLcdWidgetOptions {
  device: ND75Device;
  widget: WidgetRenderer | null;
  /** When false, the widget is shown in the preview only and not pushed to the device. */
  active: boolean;
}

export function useLcdWidget({ device, widget, active }: UseLcdWidgetOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const [state, setState] = useState<WidgetState>({ status: 'idle' });
  const inFlightRef = useRef(false);

  // Set up the offscreen canvas we use for the actual pixel buffer.
  useEffect(() => {
    if (!offscreenRef.current) {
      const c = document.createElement('canvas');
      c.width = LCD_WIDTH;
      c.height = LCD_HEIGHT;
      offscreenRef.current = c;
    }
  }, []);

  // Render + push once.
  const renderAndPush = async () => {
    if (!widget) return;
    const off = offscreenRef.current;
    if (!off) return;
    const ctx = off.getContext('2d');
    if (!ctx) return;

    // Render to offscreen.
    widget.render(ctx, LCD_WIDTH, LCD_HEIGHT);

    // Copy to visible preview canvas if provided.
    if (canvasRef.current) {
      const pctx = canvasRef.current.getContext('2d');
      if (pctx) pctx.drawImage(off, 0, 0);
    }

    if (!active) {
      setState({ status: 'idle' });
      return;
    }
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      setState({ status: 'uploading' });
      const imageData = ctx.getImageData(0, 0, LCD_WIDTH, LCD_HEIGHT);
      const rgb565 = rgbaToRgb565(new Uint8Array(imageData.data.buffer));
      await device.uploadImage(rgb565);
      const now = Date.now();
      const next: WidgetState =
        widget.intervalSec > 0
          ? { status: 'live', lastPushedAt: now, nextPushAt: now + widget.intervalSec * 1000 }
          : { status: 'live', lastPushedAt: now };
      setState(next);
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'unknown error',
      });
    } finally {
      inFlightRef.current = false;
    }
  };

  // Interval loop. Re-runs whenever widget or active flag changes.
  useEffect(() => {
    if (!widget) {
      setState({ status: 'idle' });
      return;
    }

    // Initial render + push.
    renderAndPush();

    if (!active || widget.intervalSec <= 0) {
      return;
    }
    const handle = window.setInterval(() => {
      renderAndPush();
    }, widget.intervalSec * 1000);
    return () => window.clearInterval(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget, active]);

  return { canvasRef, state, renderAndPush };
}
