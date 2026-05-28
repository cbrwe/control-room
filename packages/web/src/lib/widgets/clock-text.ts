import type { Widget } from '../widgets';
import { clearFrame, withAlpha } from '../widgets';
import { getActiveColors } from '../active-theme';

export const CLOCK_WIDGET: Widget<void> = {
  id: 'clock',
  name: 'Clock',
  description: 'Big phosphor time. Refreshes every minute.',
  intervalSec: 60,
  render(ctx, w, h) {
    clearFrame(ctx, w, h);
    const c = getActiveColors();

    const now = new Date();
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    const weekday = now.toLocaleString(undefined, { weekday: 'short' }).toUpperCase();
    const day = now.getDate();
    const month = now.toLocaleString(undefined, { month: 'short' }).toUpperCase();

    ctx.fillStyle = c.fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 64px monospace';
    ctx.fillText(hh, w / 2, h * 0.32);
    ctx.fillText(mm, w / 2, h * 0.58);

    ctx.fillStyle = c.fg;
    ctx.fillRect(20, Math.round(h * 0.45) - 1, w - 40, 2);

    ctx.fillStyle = c.accent;
    ctx.font = 'bold 26px monospace';
    ctx.fillText(`${day} ${month}`, w / 2, h - 42);

    ctx.fillStyle = c.accent;
    ctx.font = 'bold 18px monospace';
    withAlpha(ctx, 0.5, () => ctx.fillText(weekday, w / 2, h - 18));
  },
};

export const TEXT_WIDGET: Widget<void> = {
  id: 'text',
  name: 'Static Text',
  description: 'A custom message in big phosphor type. Edit and push once.',
  intervalSec: 0,
  render(ctx, w, h) {
    clearFrame(ctx, w, h);
    const c = getActiveColors();
    const raw = (window as Window & { __crCustomText?: string }).__crCustomText ?? 'HELLO';
    const msg = raw.slice(0, 12).toUpperCase();

    ctx.fillStyle = c.fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fontSize = msg.length <= 4 ? 56 : msg.length <= 8 ? 38 : 26;
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.fillText(msg, w / 2, h / 2);
  },
};
