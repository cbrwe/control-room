import { describe, it, expect, beforeEach } from 'vitest';
import {
  ND75Device,
  MockHIDAdapter,
  LAYER,
  KEY,
  key,
  blankKeymap,
  encodeKeymap,
  DEFAULT_RGB_STATE,
  LightingMode,
  OP,
  CATEGORY,
  KEYMAP_PACKET_COUNT,
} from '../src/index.js';

describe('ND75Device', () => {
  let control: MockHIDAdapter;
  let screen: MockHIDAdapter;
  let device: ND75Device;

  beforeEach(async () => {
    control = new MockHIDAdapter();
    screen = new MockHIDAdapter();
    device = new ND75Device(control, screen);
    await device.open();
  });

  describe('open/close', () => {
    it('opens both adapters', () => {
      expect(control.isOpen).toBe(true);
      expect(screen.isOpen).toBe(true);
    });

    it('closes both adapters', async () => {
      await device.close();
      expect(control.isOpen).toBe(false);
      expect(screen.isOpen).toBe(false);
    });
  });

  describe('getFirmwareVersion', () => {
    it('sends DEVICE_INFO and parses the version', async () => {
      // First receive is ACK (default success), second is the payload with version bytes
      const payload = new Uint8Array(64);
      payload[3] = 0x01;
      payload[8] = 5; // minor = 5
      payload[9] = 1; // major = 1 → version = "V" + (1*10 + 5) = "V15"
      // Skip the ACK (use default), provide the payload as the second response
      const defaultAck = new Uint8Array(64);
      defaultAck[3] = 0x01;
      control.queueResponse(defaultAck); // ACK
      control.queueResponse(payload);    // payload
      control.queueResponse(defaultAck); // END ack

      const info = await device.getFirmwareVersion();
      expect(info.version).toBe('V15');

      // Verify the DEVICE_INFO packet was sent
      const first = control.sentFeatureReports[0]!;
      expect(first.data[0]).toBe(CATEGORY);
      expect(first.data[1]).toBe(OP.DEVICE_INFO);
      expect(first.data[8]).toBe(0x02);
    });
  });

  describe('writeKeymap', () => {
    it('sends the full handshake + 9 payload packets + END for base layer', async () => {
      const map = blankKeymap();
      map[0] = key(KEY.A);
      await device.writeKeymap(LAYER.BASE, map);

      // Expected sequence:
      //   1. BEGIN_TX (0x18)
      //   2. WRITE_KEYMAP_L0 (0x11) with param=9
      //   3-11. 9 payload packets
      //   12. END (0x02)
      const sent = control.sentFeatureReports;
      expect(sent.length).toBe(1 + 1 + KEYMAP_PACKET_COUNT + 1);

      expect(sent[0]!.data[1]).toBe(OP.BEGIN_TX);
      expect(sent[1]!.data[1]).toBe(OP.WRITE_KEYMAP_L0);
      expect(sent[1]!.data[8]).toBe(KEYMAP_PACKET_COUNT);

      // First payload packet, slot 0: [0x02, modifier=0, KEY.A, 0]
      expect(sent[2]!.data[0]).toBe(0x02);
      expect(sent[2]!.data[2]).toBe(KEY.A);

      // Last command should be END
      expect(sent[sent.length - 1]!.data[1]).toBe(OP.END);
    });

    it('uses WRITE_KEYMAP_L1 (0x27) for the FN layer', async () => {
      await device.writeKeymap(LAYER.FN, blankKeymap());
      const writeCmd = control.sentFeatureReports[1]!;
      expect(writeCmd.data[1]).toBe(OP.WRITE_KEYMAP_L1);
      expect(writeCmd.data[1]).toBe(0x27);
    });

    it('throws if the command is not acknowledged', async () => {
      // Queue a NACK as the response to the write command
      const ack1 = new Uint8Array(64);
      ack1[3] = 0x01; // BEGIN_TX ack ok
      const ack2 = new Uint8Array(64);
      ack2[3] = 0x00; // WRITE_KEYMAP_L0 NACK
      control.queueResponse(ack1);
      control.queueResponse(ack2);

      await expect(device.writeKeymap(LAYER.BASE, blankKeymap())).rejects.toThrow(/rejected/);
    });
  });

  describe('readKeymap', () => {
    it('issues READ_KEYMAP_L0 (0x10) for base layer', async () => {
      // Queue: BEGIN_TX ack, READ cmd ack, then 9 data packets, then END ack
      const ack = new Uint8Array(64);
      ack[3] = 0x01;
      control.queueResponse(ack); // BEGIN_TX
      control.queueResponse(ack); // READ cmd ack
      for (let i = 0; i < 9; i++) {
        control.queueResponse(new Uint8Array(64));
      }
      control.queueResponse(ack); // END

      await device.readKeymap(LAYER.BASE);

      // The actual READ command should be the second packet sent
      const readCmd = control.sentFeatureReports[1]!;
      expect(readCmd.data[1]).toBe(OP.READ_KEYMAP_L0);
      expect(readCmd.data[1]).toBe(0x10);
    });

    it('issues READ_KEYMAP_L1 (0x26) for FN layer', async () => {
      const ack = new Uint8Array(64);
      ack[3] = 0x01;
      control.queueResponse(ack);
      control.queueResponse(ack);
      for (let i = 0; i < 9; i++) {
        control.queueResponse(new Uint8Array(64));
      }
      control.queueResponse(ack);

      await device.readKeymap(LAYER.FN);
      expect(control.sentFeatureReports[1]!.data[1]).toBe(OP.READ_KEYMAP_L1);
    });
  });

  describe('setRGBState', () => {
    it('sends BEGIN_TX, WRITE_RGB_STATE, payload, END', async () => {
      await device.setRGBState({
        ...DEFAULT_RGB_STATE,
        mode: LightingMode.Static,
        color: { r: 255, g: 128, b: 0 },
        singleColor: true,
        brightness: 4,
        speed: 2,
      });

      const sent = control.sentFeatureReports;
      expect(sent[0]!.data[1]).toBe(OP.BEGIN_TX);
      expect(sent[1]!.data[1]).toBe(OP.WRITE_RGB_STATE);

      const payload = sent[2]!.data;
      expect(payload[0]).toBe(LightingMode.Static + 1); // mode index, 1-based
      expect(payload[1]).toBe(255); // R
      expect(payload[2]).toBe(128); // G
      expect(payload[3]).toBe(0);   // B
      expect(payload[8]).toBe(1);   // singleColor
      expect(payload[9]).toBe(4);   // brightness
      expect(payload[10]).toBe(2);  // speed
      expect(payload[14]).toBe(0xaa); // terminator HI at [14], not [62]
      expect(payload[15]).toBe(0x55); // terminator LO at [15]

      expect(sent[3]!.data[1]).toBe(OP.END);
    });
  });

  describe('uploadImage', () => {
    it('sends TFT_BEGIN with chunk-count length and pumps chunks per input report', async () => {
      const pixels = new Uint8Array(200);
      for (let i = 0; i < pixels.length; i++) pixels[i] = i % 256;
      // 200 bytes / 64 per chunk = ceil(3.125) = 4 chunks
      const expectedChunks = 4;

      const ack = new Uint8Array(64);
      ack[3] = 0x01;
      control.queueResponse(ack); // BEGIN_TX ack
      control.queueResponse(ack); // TFT_BEGIN ack

      const uploadPromise = device.uploadImage(pixels);

      // Wait for uploadImage to walk through beginTransaction + TFT_BEGIN
      // before the input-report handler is registered. ~30ms covers all the
      // 5ms sleep waits in the upload path.
      await new Promise((r) => setTimeout(r, 50));

      // Pump the chunks. The keyboard sends an input report on the screen
      // interface after receiving each chunk. The final report ends the loop.
      for (let i = 0; i < expectedChunks; i++) {
        screen.emitInputReport(new Uint8Array(64));
        await new Promise((r) => setTimeout(r, 5));
      }
      await uploadPromise;

      const tftCmd = control.sentFeatureReports[1]!;
      expect(tftCmd.data[1]).toBe(OP.TFT_BEGIN);
      expect(tftCmd.data[2]).toBe(0x02);
      expect(tftCmd.data[8]).toBe(expectedChunks & 0xff);
      expect(tftCmd.data[9]).toBe((expectedChunks >> 8) & 0xff);
      expect(screen.sentOutputReports.length).toBe(expectedChunks);
      expect(screen.sentOutputReports[0]!.data.length).toBe(64);
    });

    it('throws if no screen adapter was provided', async () => {
      const lonelyDevice = new ND75Device(new MockHIDAdapter());
      await lonelyDevice.open();
      await expect(lonelyDevice.uploadImage(new Uint8Array(100))).rejects.toThrow(/Screen interface/);
    });
  });

  describe('knob events', () => {
    it('parses input report 0x14 as a knob event', async () => {
      const events: Array<{ knob: number; axis: number; value: number }> = [];
      device.onKnob((e) => events.push(e));

      // Build a knob event: r[0]=0x14, r[1]=knob, r[3]=axis, r[4]=valueHi, r[5]=valueLo
      const report = new Uint8Array(64);
      report[0] = 0x14;
      report[1] = 0; // knob 0
      report[3] = 1; // axis 1
      report[4] = 0x01;
      report[5] = 0x23;
      control.emitInputReport(report);

      expect(events.length).toBe(1);
      expect(events[0]!.knob).toBe(0);
      expect(events[0]!.axis).toBe(1);
      expect(events[0]!.value).toBe(0x0123);
    });

    it('ignores non-knob input reports', () => {
      const events: unknown[] = [];
      device.onKnob((e) => events.push(e));
      const other = new Uint8Array(64);
      other[0] = 0x99;
      control.emitInputReport(other);
      expect(events.length).toBe(0);
    });
  });
});
