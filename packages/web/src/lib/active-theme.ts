/**
 * The colors a widget paints with, set by the runner just before each render
 * call. Kept in its own dependency-free module so both the widget framework
 * (clearFrame) and the theme catalog can share it without a circular import.
 *
 * Three roles, mapped onto the LCD's mostly-monochrome layout:
 *   bg     — the screen background
 *   fg     — primary ink (the big numbers / temperature)
 *   accent — secondary highlights (date line, condition word, divider)
 *
 * Dimmed/tertiary text is drawn by painting fg or accent at reduced alpha, so
 * it adapts to any theme automatically.
 */

export interface ThemeColors {
  bg: string;
  fg: string;
  accent: string;
}

/** The original phosphor-green look; also the default when nothing is set. */
export const DEFAULT_COLORS: ThemeColors = {
  bg: '#000000',
  fg: '#00ff66',
  accent: '#ffffff',
};

let active: ThemeColors = DEFAULT_COLORS;

export function setActiveColors(colors: ThemeColors): void {
  active = colors;
}

export function getActiveColors(): ThemeColors {
  return active;
}
