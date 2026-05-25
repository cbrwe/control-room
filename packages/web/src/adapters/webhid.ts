import type { HIDAdapter } from '@control-room/protocol';

/**
 * WebHID adapter that wraps a browser `HIDDevice` and implements the protocol
 * package's HIDAdapter interface. Used by ND75Device in the browser.
 */
export class WebHIDAdapter implements HIDAdapter {
  private inputHandler?: (data: Uint8Array) => void;
  private listenerBound = false;
  /** Optional label printed in console logs so we can tell adapters apart. */
  public label?: string;

  constructor(private readonly device: HIDDevice) {}

  get isOpen(): boolean {
    return this.device.opened;
  }

  async open(): Promise<void> {
    if (!this.device.opened) {
      await this.device.open();
    }
    if (!this.listenerBound) {
      // Use ONLY the property-handler style (matches the bundle's
      // `device.oninputreport = ...` pattern). Binding both
      // addEventListener AND oninputreport causes each input report to
      // dispatch twice, which makes the TFT chunk pump send 2 chunks per
      // ack, drift out of order, and stall mid-upload around 80-90%.
      const dispatch = (event: HIDInputReportEvent) => {
        const view = event.data;
        const out = new Uint8Array(view.byteLength);
        for (let i = 0; i < view.byteLength; i++) out[i] = view.getUint8(i);
        this.inputHandler?.(out);
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.device as unknown as { oninputreport: typeof dispatch }).oninputreport = dispatch;
      this.listenerBound = true;
    }
  }

  async close(): Promise<void> {
    if (this.device.opened) {
      await this.device.close();
    }
  }

  async sendFeatureReport(reportId: number, data: Uint8Array): Promise<void> {
    // Copy into a fresh ArrayBuffer-backed Uint8Array to satisfy BufferSource typing
    // (some Uint8Array variants may have SharedArrayBuffer-backed buffers which WebHID rejects).
    const copy = new Uint8Array(data.byteLength);
    copy.set(data);
    await this.device.sendFeatureReport(reportId, copy);
  }

  async receiveFeatureReport(reportId: number): Promise<Uint8Array> {
    const view = await this.device.receiveFeatureReport(reportId);
    const out = new Uint8Array(view.byteLength);
    for (let i = 0; i < view.byteLength; i++) out[i] = view.getUint8(i);
    return out;
  }

  async sendOutputReport(reportId: number, data: Uint8Array): Promise<void> {
    const copy = new Uint8Array(data.byteLength);
    copy.set(data);
    await this.device.sendReport(reportId, copy);
  }

  onInputReport(handler: (data: Uint8Array) => void): void {
    this.inputHandler = handler;
  }
}

/**
 * Check whether the current browser supports WebHID.
 * Safari and Firefox return false; Chrome, Edge, Arc, Brave, Opera return true.
 */
export function isWebHIDSupported(): boolean {
  return typeof navigator !== 'undefined' && 'hid' in navigator;
}
