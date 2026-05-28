/**
 * Drives a single LCD widget: maintains a hidden canvas, fetches widget data
 * (for async widgets), renders the active widget into the canvas on a timer,
 * converts the result to RGB565, and uploads to the keyboard. Stops cleanly
 * on unmount or when the widget is swapped out.
 *
 * Theming: the runner sets the active theme colors before every render call.
 * Animated themes get a smooth preview loop (requestAnimationFrame) and, when
 * pushed, are streamed to the LCD as a looping multi-frame animation reusing
 * the firmware's GIF playback path.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { type ND75Device, FRAME_BYTES, rgbaToRgb565 } from '@control-room/protocol';
import {
  LCD_HEIGHT,
  LCD_WIDTH,
  type Widget,
  type WidgetDataState,
} from '../lib/widgets';
import { setActiveColors } from '../lib/active-theme';
import { type WidgetTheme, resolveTheme } from '../lib/widget-themes';

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
  theme: WidgetTheme;
  inverted: boolean;
}

export function useLcdWidget({ device, widget, active, theme, inverted }: UseLcdWidgetOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const [state, setState] = useState<WidgetState>({ status: 'idle' });
  const inFlightRef = useRef(false);
  const dataStateRef = useRef<WidgetDataState<unknown>>({ status: 'idle' });
  const phaseRef = useRef(0);

  const effective = useMemo(() => resolveTheme(theme, inverted), [theme, inverted]);
  const effectiveRef = useRef(effective);
  effectiveRef.current = effective;

  useEffect(() => {
    if (!offscreenRef.current) {
      const c = document.createElement('canvas');
      c.width = LCD_WIDTH;
      c.height = LCD_HEIGHT;
      offscreenRef.current = c;
    }
  }, []);

  function copyPreview(): void {
    const off = offscreenRef.current;
    if (off && canvasRef.current) {
      const pctx = canvasRef.current.getContext('2d');
      if (pctx) pctx.drawImage(off, 0, 0);
    }
  }

  function paint(ctx: CanvasRenderingContext2D): void | Promise<void> {
    if (!widget) return;
    return (widget.render as Widget['render'])(ctx, LCD_WIDTH, LCD_HEIGHT, dataStateRef.current);
  }

  /** Render the widget once at the given phase and return its RGB565 bytes. */
  function renderFrame(ctx: CanvasRenderingContext2D, phase: number): Uint8Array {
    const eff = effectiveRef.current;
    setActiveColors(eff.animate ? eff.animate(phase) : eff.colors);
    void paint(ctx);
    const imageData = ctx.getImageData(0, 0, LCD_WIDTH, LCD_HEIGHT);
    return rgbaToRgb565(new Uint8Array(imageData.data.buffer));
  }

  const fetchAndRender = async (forcePush = false) => {
    if (!widget) return;
    const off = offscreenRef.current;
    if (!off) return;
    const ctx = off.getContext('2d');
    if (!ctx) return;
    const eff = effectiveRef.current;

    setActiveColors(eff.animate ? eff.animate(phaseRef.current) : eff.colors);

    // If this widget has a fetcher, refresh data first.
    if (widget.fetchData) {
      dataStateRef.current = { status: 'loading' };
      try {
        await Promise.resolve(paint(ctx));
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

    // Final preview render with whatever data state we ended up with.
    setActiveColors(eff.animate ? eff.animate(phaseRef.current) : eff.colors);
    await Promise.resolve(paint(ctx));
    copyPreview();

    if (!active && !forcePush) {
      setState({ status: 'idle' });
      return;
    }
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      setState({ status: 'uploading' });
      if (eff.animate) {
        const frames = eff.frames ?? 16;
        const delay = eff.frameDelayMs ?? 60;
        const pixels = new Uint8Array(frames * FRAME_BYTES);
        const delays: number[] = [];
        for (let i = 0; i < frames; i++) {
          pixels.set(renderFrame(ctx, i / frames), i * FRAME_BYTES);
          delays.push(delay);
        }
        copyPreview();
        await device.uploadImage(pixels, delays);
      } else {
        const imageData = ctx.getImageData(0, 0, LCD_WIDTH, LCD_HEIGHT);
        const rgb565 = rgbaToRgb565(new Uint8Array(imageData.data.buffer));
        await device.uploadImage(rgb565);
      }
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

  // Data fetch + live push loop. Re-runs when the widget or live state changes.
  useEffect(() => {
    if (!widget) {
      setState({ status: 'idle' });
      return;
    }
    dataStateRef.current = { status: 'idle' };
    fetchAndRender();
    if (!active || widget.intervalSec <= 0) return;
    const handle = window.setInterval(() => {
      fetchAndRender();
    }, widget.intervalSec * 1000);
    return () => window.clearInterval(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget, active]);

  // Re-render the preview when the theme changes (no refetch). Animated themes
  // are handled by the rAF loop below instead.
  useEffect(() => {
    if (!widget || effective.animate) return;
    const off = offscreenRef.current;
    if (!off) return;
    const ctx = off.getContext('2d');
    if (!ctx) return;
    setActiveColors(effective.colors);
    void paint(ctx);
    copyPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effective]);

  // Smooth animated preview for animated themes (preview only, never pushes).
  useEffect(() => {
    if (!widget || !effective.animate) return;
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 50) return; // ~20fps is plenty for a 135x240 panel
      last = t;
      if (inFlightRef.current) return;
      const off = offscreenRef.current;
      if (!off) return;
      const ctx = off.getContext('2d');
      if (!ctx) return;
      phaseRef.current = (phaseRef.current + 0.012) % 1;
      setActiveColors(effective.animate!(phaseRef.current));
      void paint(ctx);
      copyPreview();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget, effective]);

  return { canvasRef, state, renderAndPush: () => fetchAndRender(true) };
}
