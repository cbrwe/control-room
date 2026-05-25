/**
 * Build full 144-slot ND75 keymaps from the layout defaults, with optional
 * single-slot overrides. The Quick Actions view uses this to ship one-shot
 * key remaps without having to read the current keymap from the device first.
 */

import { unbound, type KeyBinding } from '@control-room/protocol';
import { ND75_LAYOUT } from './nd75-layout';

const MAX_SLOTS = 144;

/**
 * Build the default base-layer keymap matching the bundle's `Jg` layout.
 * Slots that aren't part of the Norm variant are filled with `unbound()`.
 */
export function defaultBaseKeymap(): KeyBinding[] {
  const map: KeyBinding[] = Array.from({ length: MAX_SLOTS }, () => unbound());
  for (const k of ND75_LAYOUT) {
    map[k.slot] = k.defaultBase;
  }
  return map;
}

/**
 * Build a keymap that starts from the defaults but applies a set of
 * slot-to-binding overrides on top.
 */
export function keymapWithOverrides(
  overrides: ReadonlyMap<number, KeyBinding>
): KeyBinding[] {
  const map = defaultBaseKeymap();
  for (const [slot, binding] of overrides) {
    map[slot] = binding;
  }
  return map;
}
