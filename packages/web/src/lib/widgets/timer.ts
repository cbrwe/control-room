/**
 * Countdown timer widget. A module-level store holds the timer state so the
 * LCD render() and the ScreenView controls share one source of truth. The
 * store exposes start/pause/reset/setDuration plus a subscribe() so the UI can
 * re-render the live readout. The LCD frame is painted by render() on the
 * widget runner's 1s cadence.
 */

import type { Widget } from '../widgets';
import { PALETTE, clearFrame, drawTag } from '../widgets';

export interface TimerSnapshot {
  running: boolean;
  remainingMs: number;
  durationMs: number;
  done: boolean;
}

interface TimerState {
  durationMs: number;
  /** Remaining time captured while paused/stopped. Ignored while running. */
  remainingMs: number;
  /** Wall-clock time the countdown hits zero while running; null when paused. */
  endsAt: number | null;
}

const DEFAULT_MS = 25 * 60_000;

let state: TimerState = {
  durationMs: DEFAULT_MS,
  remainingMs: DEFAULT_MS,
  endsAt: null,
};

const listeners = new Set<() => void>();

function emit(): void {
  for (const fn of listeners) fn();
}

export function subscribeTimer(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getTimerSnapshot(): TimerSnapshot {
  const running = state.endsAt !== null;
  const remainingMs = running
    ? Math.max(0, state.endsAt! - Date.now())
    : state.remainingMs;
  return { running, remainingMs, durationMs: state.durationMs, done: remainingMs <= 0 };
}

export function setTimerDuration(ms: number): void {
  const clamped = Math.max(1000, Math.round(ms));
  state = { durationMs: clamped, remainingMs: clamped, endsAt: null };
  emit();
}

export function startTimer(): void {
  if (state.endsAt !== null) return;
  const remaining = state.remainingMs > 0 ? state.remainingMs : state.durationMs;
  state = { ...state, remainingMs: remaining, endsAt: Date.now() + remaining };
  emit();
}

export function pauseTimer(): void {
  if (state.endsAt === null) return;
  state = { ...state, remainingMs: Math.max(0, state.endsAt - Date.now()), endsAt: null };
  emit();
}

export function resetTimer(): void {
  state = { ...state, remainingMs: state.durationMs, endsAt: null };
  emit();
}

function fmt(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export const TIMER_WIDGET: Widget<void> = {
  id: 'timer',
  name: 'Timer',
  description: 'Countdown timer. Set a duration, go live to watch it tick.',
  intervalSec: 1,
  render(ctx, w, h) {
    clearFrame(ctx, w, h);
    const { running, remainingMs, durationMs, done } = getTimerSnapshot();

    const accent = done ? PALETTE.danger : PALETTE.phosphor;
    const label = done ? 'DONE' : running ? 'RUNNING' : 'PAUSED';
    drawTag(ctx, label, 14, 16, done ? PALETTE.danger : PALETTE.phosphorDim);

    // Big MM:SS readout, shrunk to fit the 135px width if needed.
    const text = fmt(remainingMs);
    ctx.fillStyle = accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let size = 52;
    ctx.font = `bold ${size}px monospace`;
    while (ctx.measureText(text).width > w - 16 && size > 20) {
      size -= 2;
      ctx.font = `bold ${size}px monospace`;
    }
    ctx.fillText(text, w / 2, h * 0.42);

    // Remaining-fraction progress bar.
    const frac = durationMs > 0 ? Math.max(0, Math.min(1, remainingMs / durationMs)) : 0;
    const barX = 16;
    const barW = w - 32;
    const barY = Math.round(h * 0.62);
    const barH = 10;
    ctx.fillStyle = PALETTE.faint;
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = accent;
    ctx.fillRect(barX, barY, Math.round(barW * frac), barH);

    ctx.fillStyle = PALETTE.dim;
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`OF ${fmt(durationMs)}`, w / 2, h - 28);
  },
};
