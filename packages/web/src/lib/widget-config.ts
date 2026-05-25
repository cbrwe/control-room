/**
 * Persistent per-widget configuration. Backed by localStorage so settings
 * survive across sessions. Keys are namespaced under `cr.widget.<id>` so
 * different widgets can't stomp each other.
 */

const PREFIX = 'cr.widget.';

export function loadConfig<T = unknown>(widgetId: string): T | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(PREFIX + widgetId);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveConfig<T = unknown>(widgetId: string, value: T): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(PREFIX + widgetId, JSON.stringify(value));
}

export function clearConfig(widgetId: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(PREFIX + widgetId);
}
