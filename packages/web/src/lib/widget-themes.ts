/**
 * Color themes for the canvas widgets (clock, static text, weather). A theme is
 * just a set of ThemeColors plus optional animation. Static themes are flat
 * brand/retro palettes; animated themes vary their colors over a phase t in
 * [0,1) and are pushed to the LCD as a looping multi-frame animation (the same
 * path GIF uploads use).
 *
 * Invert swaps background and primary ink, keeping the accent legible. No color
 * wheel by design — these are curated pre-selections.
 */

import type { ThemeColors } from './active-theme';

export type ThemeGroup = 'Classic' | 'Brand' | 'Neon' | 'Animated';

export interface WidgetTheme {
  id: string;
  name: string;
  group: ThemeGroup;
  /** Flat colors, and the swatch/representative frame for animated themes. */
  colors: ThemeColors;
  /** Animated themes return colors for a phase t in [0,1). */
  animate?: (t: number) => ThemeColors;
  /** Frames pushed to the LCD for the animation loop. */
  frames?: number;
  /** Per-frame delay on the LCD, in ms (0-255). */
  frameDelayMs?: number;
}

const TWO_PI = Math.PI * 2;

/** HSL string helper for animated themes. */
function hsl(h: number, s: number, l: number): string {
  return `hsl(${Math.round(((h % 360) + 360) % 360)}, ${s}%, ${l}%)`;
}

/** 0..1 ramp that eases up and back down (no hard seam at the loop point). */
function pingPong(t: number): number {
  return (Math.sin(t * TWO_PI - Math.PI / 2) + 1) / 2;
}

const STATIC: WidgetTheme[] = [
  // --- Classic / retro instrument looks -----------------------------------
  { id: 'phosphor', name: 'Phosphor', group: 'Classic', colors: { bg: '#000000', fg: '#00ff66', accent: '#ffffff' } },
  { id: 'amber', name: 'Amber CRT', group: 'Classic', colors: { bg: '#000000', fg: '#ffb000', accent: '#ffd27f' } },
  { id: 'gameboy', name: 'Game Boy', group: 'Classic', colors: { bg: '#0f380f', fg: '#9bbc0f', accent: '#8bac0f' } },
  { id: 'gold', name: 'Gold', group: 'Classic', colors: { bg: '#000000', fg: '#d4af37', accent: '#ffffff' } },
  { id: 'paper', name: 'Paper', group: 'Classic', colors: { bg: '#ffffff', fg: '#000000', accent: '#555555' } },

  // --- Brand palettes ------------------------------------------------------
  { id: 'nike', name: 'Nike Volt', group: 'Brand', colors: { bg: '#000000', fg: '#e6ff00', accent: '#ffffff' } },
  { id: 'hermes', name: 'Hermès', group: 'Brand', colors: { bg: '#000000', fg: '#f37021', accent: '#ffffff' } },
  { id: 'tiffany', name: 'Tiffany', group: 'Brand', colors: { bg: '#000000', fg: '#0abab5', accent: '#ffffff' } },
  { id: 'ferrari', name: 'Ferrari', group: 'Brand', colors: { bg: '#000000', fg: '#ff2800', accent: '#ffd700' } },
  { id: 'barbie', name: 'Barbie', group: 'Brand', colors: { bg: '#000000', fg: '#e0218a', accent: '#ffffff' } },
  { id: 'lakers', name: 'Lakers', group: 'Brand', colors: { bg: '#1d1160', fg: '#fdb927', accent: '#ffffff' } },

  // --- Neon / synth --------------------------------------------------------
  { id: 'cyber', name: 'Cyber', group: 'Neon', colors: { bg: '#0d0221', fg: '#00f0ff', accent: '#ff003c' } },
  { id: 'vice', name: 'Vice', group: 'Neon', colors: { bg: '#2a0a3a', fg: '#ff6ec7', accent: '#00e5ff' } },
  { id: 'ice', name: 'Ice', group: 'Neon', colors: { bg: '#001018', fg: '#7fdbff', accent: '#ffffff' } },
  { id: 'mint', name: 'Mint', group: 'Neon', colors: { bg: '#001a12', fg: '#3ef0a0', accent: '#ffffff' } },
  { id: 'crimson', name: 'Crimson', group: 'Neon', colors: { bg: '#0a0000', fg: '#ff1e1e', accent: '#ffffff' } },
];

const ANIMATED: WidgetTheme[] = [
  {
    id: 'rainbow',
    name: 'Rainbow',
    group: 'Animated',
    colors: { bg: '#000000', fg: '#00ff66', accent: '#ffffff' },
    frames: 18,
    frameDelayMs: 60,
    animate: (t) => ({ bg: '#000000', fg: hsl(t * 360, 100, 55), accent: '#ffffff' }),
  },
  {
    id: 'neon-pulse',
    name: 'Neon Pulse',
    group: 'Animated',
    colors: { bg: '#000000', fg: '#e6ff00', accent: '#ffffff' },
    frames: 16,
    frameDelayMs: 60,
    animate: (t) => ({ bg: '#000000', fg: hsl(75, 100, 35 + pingPong(t) * 30), accent: '#ffffff' }),
  },
  {
    id: 'aurora',
    name: 'Aurora',
    group: 'Animated',
    colors: { bg: '#00140f', fg: '#3ef0a0', accent: '#cdebff' },
    frames: 20,
    frameDelayMs: 70,
    animate: (t) => ({ bg: '#00140f', fg: hsl(150 + pingPong(t) * 130, 90, 60), accent: '#cdebff' }),
  },
  {
    id: 'fire',
    name: 'Fire',
    group: 'Animated',
    colors: { bg: '#0a0000', fg: '#ff6a00', accent: '#ffd27f' },
    frames: 16,
    frameDelayMs: 60,
    animate: (t) => ({ bg: '#0a0000', fg: hsl(pingPong(t) * 45, 100, 50), accent: '#ffd27f' }),
  },
  {
    id: 'ocean',
    name: 'Ocean',
    group: 'Animated',
    colors: { bg: '#001020', fg: '#33c6ff', accent: '#aeefff' },
    frames: 18,
    frameDelayMs: 70,
    animate: (t) => ({ bg: '#001020', fg: hsl(185 + pingPong(t) * 45, 95, 58), accent: '#aeefff' }),
  },
];

export const WIDGET_THEMES: readonly WidgetTheme[] = [...STATIC, ...ANIMATED];

export const THEME_GROUPS: readonly ThemeGroup[] = ['Classic', 'Brand', 'Neon', 'Animated'];

export const DEFAULT_THEME_ID = 'phosphor';

export function findTheme(id: string | undefined): WidgetTheme {
  return WIDGET_THEMES.find((t) => t.id === id) ?? WIDGET_THEMES[0]!;
}

function invertColors(c: ThemeColors): ThemeColors {
  const bg = c.fg;
  const fg = c.bg;
  // Keep the accent unless the swap collided it with the new background.
  const accent = c.accent.toLowerCase() === bg.toLowerCase() ? fg : c.accent;
  return { bg, fg, accent };
}

/** Swap background and ink; animation (if any) is inverted per frame. */
export function invertTheme(theme: WidgetTheme): WidgetTheme {
  const animate = theme.animate;
  const inverted: WidgetTheme = { ...theme, colors: invertColors(theme.colors) };
  if (animate) inverted.animate = (t: number) => invertColors(animate(t));
  return inverted;
}

export function resolveTheme(theme: WidgetTheme, inverted: boolean): WidgetTheme {
  return inverted ? invertTheme(theme) : theme;
}
