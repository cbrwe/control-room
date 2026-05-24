/**
 * Platform-agnostic HID interface.
 *
 * The protocol layer talks to HID through this interface. Each platform
 * provides its own implementation:
 *
 * - browser:  WebHIDAdapter wrapping `navigator.hid`
 * - desktop:  TauriHIDAdapter wrapping `hidapi-rs` via Tauri commands
 * - tests:    MockHIDAdapter that records sent packets and replays canned responses
 *
 * The ND75 exposes two HID interfaces. The "control" interface receives all
 * the 0x04-prefixed commands. The "screen" interface receives raw TFT pixel
 * data after a TFT_BEGIN command on the control interface. Most operations
 * only need the control adapter.
 */
export interface HIDAdapter {
  /** Open the device. Idempotent. */
  open(): Promise<void>;

  /** Close the device. Idempotent. */
  close(): Promise<void>;

  /** Whether the device is currently open. */
  readonly isOpen: boolean;

  /**
   * Send a 64-byte Feature Report (Set_Report HID command).
   * Used for all control commands. Report ID is always 0 on the ND75.
   */
  sendFeatureReport(reportId: number, data: Uint8Array): Promise<void>;

  /**
   * Read a 64-byte Feature Report (Get_Report HID command).
   * Used to receive ACKs and read-command responses.
   */
  receiveFeatureReport(reportId: number): Promise<Uint8Array>;

  /**
   * Send a regular Output Report (no GET equivalent needed).
   * Only used on the screen interface for streaming pixel data.
   */
  sendOutputReport(reportId: number, data: Uint8Array): Promise<void>;

  /**
   * Register a handler for unsolicited Input Reports.
   * Used to receive knob rotation events and other async device events.
   */
  onInputReport(handler: (data: Uint8Array) => void): void;
}

/**
 * MockHIDAdapter records every send and lets you queue canned responses.
 * Used for unit tests so we can verify the exact packet bytes we send to a
 * real keyboard without needing one connected.
 */
export class MockHIDAdapter implements HIDAdapter {
  /** Every packet sent via sendFeatureReport, in order. */
  public readonly sentFeatureReports: { reportId: number; data: Uint8Array }[] = [];
  /** Every packet sent via sendOutputReport, in order. */
  public readonly sentOutputReports: { reportId: number; data: Uint8Array }[] = [];

  private responses: Uint8Array[] = [];
  private inputHandler?: (data: Uint8Array) => void;
  private _isOpen = false;

  get isOpen(): boolean {
    return this._isOpen;
  }

  async open(): Promise<void> {
    this._isOpen = true;
  }

  async close(): Promise<void> {
    this._isOpen = false;
  }

  async sendFeatureReport(reportId: number, data: Uint8Array): Promise<void> {
    // Copy so the caller can mutate their buffer without affecting our record.
    this.sentFeatureReports.push({ reportId, data: new Uint8Array(data) });
  }

  async receiveFeatureReport(_reportId: number): Promise<Uint8Array> {
    const next = this.responses.shift();
    if (!next) {
      // Default ACK: 64 bytes, byte [3] = 0x01 means success.
      const ack = new Uint8Array(64);
      ack[3] = 0x01;
      return ack;
    }
    return next;
  }

  async sendOutputReport(reportId: number, data: Uint8Array): Promise<void> {
    this.sentOutputReports.push({ reportId, data: new Uint8Array(data) });
  }

  onInputReport(handler: (data: Uint8Array) => void): void {
    this.inputHandler = handler;
  }

  /** Queue a canned response that will be returned on the next receiveFeatureReport call. */
  queueResponse(data: Uint8Array): void {
    this.responses.push(data);
  }

  /** Simulate an unsolicited input report (e.g. knob turn). */
  emitInputReport(data: Uint8Array): void {
    this.inputHandler?.(data);
  }

  /** Clear all recorded sends and queued responses. */
  reset(): void {
    this.sentFeatureReports.length = 0;
    this.sentOutputReports.length = 0;
    this.responses.length = 0;
  }
}
