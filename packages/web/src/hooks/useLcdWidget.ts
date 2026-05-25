/**
 * Drives a single LCD widget: maintains a hidden canvas, fetches widget data
 * (for async widgets), renders the active widget into the canvas on a timer,
 * converts the result to RGB565, and uploads to the keyboard. Stops cleanly
 * on unmount or when the widget is swapped out.
 */

import { useEffect, useRef, useState } from 'react';
import { type ND75Device, rgbaToRgb565 } from '@control-room/protocol';
import {
  LCD_HEIGHT,
  LCD_WIDTH,
  type Widget,
  type WidgetDataState,
} from '../lib/widgets';

export type WidgetState =
  | { status: 'idle' }
  | { status: 'rendering' }
  | { status: 'uploading' }
  | { status: 'live'; lastPushedAt: number; nextPushAt?: number }
  | { status: 'error'; message: string };

interface UseLcdWidgetOptions {
  device: ND75Device;
  widget: Widget | null;
  /** When false, the widget renders to preview only and isn't pushed. */
  active: boolean;
}

export function useLcdWidget({ device, widget, active }: UseLcdWidgetOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const [state, setState] = useState<WidgetState>({ status: 'idle' });
  const inFlightRef = useRef(false);
  const dataStateRef = useRef<WidgetDataState<unknown>>({ status: 'idle' });

  useEffect(() => {
    if (!offscreenRef.current) {
      const c = document.createElement('canvas');
      c.width = LCD_WIDTH;
      c.height = LCD_HEIGHT;
      offscreenRef.current = c;
    }
  }, []);

  const fetchAndRender = async () => {
    if (!widget) return;
    const off = offscreenRef.current;
    if (!off) return;
    const ctx = off.getContext('2d');
    if (!ctx) return;

    // If this widget has a fetcher, refresh data first.
    if (widget.fetchData) {
      dataStateRef.current = { status: 'loading' };
      // Show the loading frame while we wait.
      try {
        await Promise.resolve(
          (widget.render as Widget['render'])(ctx, LCD_WIDTH, LCD_HEIGHT, dataStateRef.current)
        );
        copyPreview();
      } catch {
        // best-effort, fall through to fetch
      }
      try {
        const data = await widget.fetchData();
        dataStateRef.current = { status: 'ok', data };
      } catch (err) {
        dataStateRef.current = {
          status: 'error',
          message: err instanceof Error ? err.message : 'unknown error',
        };
      }
    }

    // Final render with whatever data state we ended up with.
    await Promise.resolve(
      (widget.render as Widget['render'])(ctx, LCD_WIDTH, LCD_HEIGHT, dataStateRef.current)
    );
    copyPreview();

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

  function copyPreview(): void {
    const off = offscreenRef.current;
    if (off && canvasRef.current) {
      const pctx = canvasRef.current.getContext('2d');
      if (pctx) pctx.drawImage(off, 0, 0);
    }
  }

  useEffect(() => {
    if (!widget) {
      setState({ status: 'idle' });
      return;
    }
    // Reset data state when widget changes.
    dataStateRef.current = { status: 'idle' };
    fetchAndRender();
    if (!active || widget.intervalSec <= 0) return;
    const handle = window.setInterval(() => {
      fetchAndRender();
    }, widget.intervalSec * 1000);
    return () => window.clearInterval(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget, active]);

  return { canvasRef, state, renderAndPush: fetchAndRender };
}
