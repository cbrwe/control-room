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

      // The ND75 exposes several HID interfaces. Both control AND screen must
      // be matched on usagePage + usage exactly — picking "any other device"
      // for the screen ends up grabbing the regular keyboard interface, and
      // every subsequent feature report there gets rejected.
      const findByCollection = (page: number, usage: number) =>
        requested.find((d) =>
          d.collections.some((c) => c.usagePage === page && c.usage === usage)
        );

      const controlDevice = findByCollection(USB.control.usagePage, USB.control.usage);
      const screenDevice = findByCollection(USB.screen.usagePage, USB.screen.usage);

      if (!controlDevice) {
        throw new Error(
          'ND75 control interface (usagePage 0xFF13) not found. Did the picker include the right device?'
        );
      }
      if (!screenDevice) {
        console.warn(
          'ND75 screen interface (usagePage 0xFFA0) not found. Image and widget uploads will be unavailable.'
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
