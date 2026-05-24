# @control-room/protocol

Reverse-engineered HID protocol for the Chilkey ND75 mechanical keyboard. Pure TypeScript, zero runtime dependencies, swappable HID adapter so it works in the browser (WebHID), on the desktop (Tauri + hidapi), or against a mock in tests.

## Install

```bash
pnpm add @control-room/protocol
```

## Quick start

In a browser (Chrome / Edge / Arc / Brave) with WebHID:

```ts
import { ND75Device, USB } from '@control-room/protocol';

class WebHIDAdapter {
  constructor(private device: HIDDevice) {}
  get isOpen() { return this.device.opened; }
  async open() { if (!this.device.opened) await this.device.open(); }
  async close() { if (this.device.opened) await this.device.close(); }
  async sendFeatureReport(id: number, data: Uint8Array) {
    await this.device.sendFeatureReport(id, data);
  }
  async receiveFeatureReport(id: number) {
    const view = await this.device.receiveFeatureReport(id);
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  }
  async sendOutputReport(id: number, data: Uint8Array) {
    await this.device.sendReport(id, data);
  }
  onInputReport(handler: (data: Uint8Array) => void) {
    this.device.addEventListener('inputreport', (e: any) => {
      const view = e.data as DataView;
      handler(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
    });
  }
}

const [control, screen] = await navigator.hid.requestDevice({
  filters: [{ vendorId: USB.vendorId, productId: USB.productId }],
});

const kbd = new ND75Device(new WebHIDAdapter(control), new WebHIDAdapter(screen));
await kbd.open();

const info = await kbd.getFirmwareVersion();
console.log(info.version);
```

## What the API exposes

```ts
class ND75Device {
  open(): Promise<void>
  close(): Promise<void>
  getFirmwareVersion(): Promise<FirmwareInfo>
  readKeymap(layer: Layer): Promise<Keymap>
  writeKeymap(layer: Layer, keymap: Keymap): Promise<void>
  setRGBState(state: RGBState): Promise<void>
  setPerKeyRGB(colors: Color[]): Promise<void>
  uploadImage(pixelData: Uint8Array): Promise<void>
  writeConfig(payload: Uint8Array): Promise<void>
  onKnob(handler: (event: KnobEvent) => void): () => void
}
```

Helpers exported from the package:

- `key(code, modifiers?)`, `consumer(usage)`, `system(usage)`, `mouse(button)`, `unbound()` for building key bindings
- `KEY.*`, `CONSUMER.*`, `SYSTEM.*`, `MOUSE.*` constants for every supported HID code
- `LAYER.BASE`, `LAYER.FN`
- `LightingMode.*` enum (19 modes plus Off) with curated names in `LIGHTING_MODE_NAMES`
- `timeSyncPayload(date)`, `sleepTimerPayload(...)`, `systemModePayload(...)`, `winLockPayload(...)` for the `writeConfig` op
- `rgbaToRgb565(rgba)` and `chunkImage(pixels)` for image uploads

## Protocol reference

The complete byte-level protocol is documented in `docs/ND75_PROTOCOL_SPEC.md` at the repo root.

## Testing

The package ships a `MockHIDAdapter` that records every packet sent and lets you queue canned responses. Tests verify that every command builds byte-for-byte identical packets to what Chilkey's official web bundle sends.

```bash
pnpm test
```

## Status

Most commands are confirmed against the official bundle's source. Five items need live USB capture to lock down 100%:

1. Exact byte slot of the mode index in `setRGBState` (currently using `[4]` based on convention)
2. Per-key RGB stride within `setPerKeyRGB` packets
3. The exact `writeConfig` payload format for time sync (we ship both byte-encoded and BCD variants to try)
4. TFT pixel format (RGB565 assumed; could be RGB888)
5. The unknown `0x04 0x01` command's purpose

None of these are blockers for shipping a working app, but they will need confirmation before the protocol package is called "1.0".

## License

MIT
