import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ND75Device,
  USB,
  type FirmwareInfo,
} from '@control-room/protocol';
import { WebHIDAdapter, isWebHIDSupported } from '../adapters/webhid';

export type ConnectionStatus =
  | { state: 'unsupported' }
  | { state: 'disconnected' }
  | { state: 'connecting' }
  | { state: 'connected'; firmware: FirmwareInfo }
  | { state: 'error'; message: string };

interface UseDeviceReturn {
  status: ConnectionStatus;
  device: ND75Device | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

/**
 * React hook that owns the ND75 device connection. Triggers the WebHID device
 * picker on connect(), opens both HID interfaces, reads firmware info, and
 * exposes the live ND75Device instance.
 */
export function useDevice(): UseDeviceReturn {
  const [status, setStatus] = useState<ConnectionStatus>(() =>
    isWebHIDSupported() ? { state: 'disconnected' } : { state: 'unsupported' }
  );
  const deviceRef = useRef<ND75Device | null>(null);

  const disconnect = useCallback(async () => {
    if (deviceRef.current) {
      try {
        await deviceRef.current.close();
      } catch (err) {
        console.error('Error closing device:', err);
      }
      deviceRef.current = null;
    }
    setStatus({ state: 'disconnected' });
  }, []);

  const connect = useCallback(async () => {
    if (!isWebHIDSupported()) {
      setStatus({ state: 'unsupported' });
      return;
    }

    setStatus({ state: 'connecting' });

    try {
      const requested = await navigator.hid.requestDevice({
        filters: [
          { vendorId: USB.vendorId, productId: USB.productId },
        ],
      });

      if (!requested || requested.length === 0) {
        setStatus({ state: 'disconnected' });
        return;
      }

      // The ND75 exposes several HID interfaces (regular keyboard, consumer,
      // control 0xFF13, and screen 0xFFA0). On Chrome's picker each interface
      // shows as a separate row. If the user only selects one row we don't get
      // all interfaces and uploads/writes silently fail.
      //
      // Strategy: pull ALL authorized matching devices that the browser knows
      // about (not just what was just picked), then route by collection. This
      // recovers cases where the user picked one interface here but had
      // already authorized the others previously.
      const allAuthorized = await navigator.hid.getDevices();
      const ours = allAuthorized.filter(
        (d) => d.vendorId === USB.vendorId && d.productId === USB.productId
      );
      const pool = ours.length >= requested.length ? ours : requested;

      console.log('[CR] HID devices in pool:', pool.length);
      pool.forEach((d, i) => {
        console.log(
          `[CR]   device[${i}] productName=${JSON.stringify(d.productName)} collections=${d.collections.length}`
        );
        d.collections.forEach((c, ci) => {
          console.log(
            `[CR]     collection[${ci}] usagePage=0x${c.usagePage?.toString(16)} usage=0x${c.usage?.toString(16)}`
          );
        });
      });

      const findByCollection = (page: number, usage: number) =>
        pool.find((d) =>
          d.collections.some((c) => c.usagePage === page && c.usage === usage)
        );
      const findByPage = (page: number) =>
        pool.find((d) => d.collections.some((c) => c.usagePage === page));

      const controlDevice =
        findByCollection(USB.control.usagePage, USB.control.usage) ??
        findByPage(USB.control.usagePage);

      // Screen: prefer exact match, fall back to any collection with the
      // screen usagePage (some firmware revisions report different usage IDs).
      const screenDevice =
        findByCollection(USB.screen.usagePage, USB.screen.usage) ??
        findByPage(USB.screen.usagePage);

      console.log('[CR] picked control:', controlDevice?.productName, 'screen:', screenDevice?.productName);

      if (!controlDevice) {
        throw new Error(
          'ND75 control interface not found. The picker probably did not include all of the keyboard’s HID rows. Re-click CONNECT and Cmd/Ctrl-click each Chilkey ND75 row in the device picker, then click Connect.'
        );
      }
      if (!screenDevice) {
        throw new Error(
          'ND75 screen interface (usagePage 0xFF68) not found. The picker likely only authorized the control row. Click CONNECT again and select EVERY Chilkey ND75 row in the device picker (Cmd-click on macOS).'
        );
      }

      const control = new WebHIDAdapter(controlDevice);
      const screen = screenDevice ? new WebHIDAdapter(screenDevice) : undefined;
      const device = new ND75Device(control, screen);
      await device.open();

      const firmware = await device.getFirmwareVersion();
      deviceRef.current = device;
      setStatus({ state: 'connected', firmware });
    } catch (err) {
      console.error('Connection failed:', err);
      const message =
        err instanceof Error ? err.message : 'Unknown connection error';
      setStatus({ state: 'error', message });
      deviceRef.current = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (deviceRef.current) {
        deviceRef.current.close().catch(console.error);
      }
    };
  }, []);

  return { status, device: deviceRef.current, connect, disconnect };
}
