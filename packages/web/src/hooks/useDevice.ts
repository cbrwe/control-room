import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LAYER,
  ND75Device,
  USB,
  type FirmwareInfo,
} from '@control-room/protocol';
import { WebHIDAdapter, isWebHIDSupported } from '../adapters/webhid';

export type ConnectionStatus =
  | { state: 'unsupported' }
  | { state: 'initializing' }
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

async function openFromPool(pool: HIDDevice[]): Promise<{
  device: ND75Device;
  firmware: FirmwareInfo;
}> {
  const findByCollection = (page: number, usage: number) =>
    pool.find((d) =>
      d.collections.some((c) => c.usagePage === page && c.usage === usage)
    );
  const findByPage = (page: number) =>
    pool.find((d) => d.collections.some((c) => c.usagePage === page));

  const controlDevice =
    findByCollection(USB.control.usagePage, USB.control.usage) ??
    findByPage(USB.control.usagePage);

  const screenDevice =
    findByCollection(USB.screen.usagePage, USB.screen.usage) ??
    findByPage(USB.screen.usagePage);

  if (!controlDevice) {
    throw new Error(
      'ND75 control interface not found. Re-click Connect and Cmd/Ctrl-click each Chilkey ND75 row in the device picker, then click Connect.'
    );
  }
  if (!screenDevice) {
    throw new Error(
      'ND75 screen interface (usagePage 0xFF68) not found. Click Connect again and select EVERY Chilkey ND75 row in the device picker (Cmd-click on macOS).'
    );
  }

  const control = new WebHIDAdapter(controlDevice);
  const screen = new WebHIDAdapter(screenDevice);
  const device = new ND75Device(control, screen);
  await device.open();

  pool.forEach((d) => {
    if (d !== controlDevice && d !== screenDevice && !d.opened) {
      d.open().catch(() => {});
    }
  });

  try {
    await device.readKeymap(LAYER.BASE);
    await new Promise((r) => setTimeout(r, 100));
    await device.readKeymap(LAYER.FN);
    await new Promise((r) => setTimeout(r, 100));
  } catch {
    // Non-fatal
  }
  const firmware = await device.getFirmwareVersion();
  await new Promise((r) => setTimeout(r, 500));

  return { device, firmware };
}

export function useDevice(): UseDeviceReturn {
  const [status, setStatus] = useState<ConnectionStatus>(() =>
    isWebHIDSupported() ? { state: 'initializing' } : { state: 'unsupported' }
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
        filters: [{ vendorId: USB.vendorId, productId: USB.productId }],
      });

      if (!requested || requested.length === 0) {
        setStatus({ state: 'disconnected' });
        return;
      }

      const allAuthorized = await navigator.hid.getDevices();
      const ours = allAuthorized.filter(
        (d) => d.vendorId === USB.vendorId && d.productId === USB.productId
      );
      const pool = ours.length >= requested.length ? ours : requested;

      const { device, firmware } = await openFromPool(pool);
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

  // Auto-reconnect on mount: if the browser has previously authorized ND75
  // devices, open them silently (no requestDevice() so no user gesture
  // needed). A page refresh lands you straight back on the app instead of the
  // Connect screen.
  useEffect(() => {
    let cancelled = false;
    if (!isWebHIDSupported()) return;

    (async () => {
      try {
        const authorized = await navigator.hid.getDevices();
        const ours = authorized.filter(
          (d) => d.vendorId === USB.vendorId && d.productId === USB.productId
        );
        if (cancelled) return;
        if (ours.length === 0) {
          setStatus({ state: 'disconnected' });
          return;
        }
        setStatus({ state: 'connecting' });
        const { device, firmware } = await openFromPool(ours);
        if (cancelled) {
          device.close().catch(() => {});
          return;
        }
        deviceRef.current = device;
        setStatus({ state: 'connected', firmware });
      } catch (err) {
        if (cancelled) return;
        console.warn('Auto-reconnect failed, falling back to manual:', err);
        setStatus({ state: 'disconnected' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (deviceRef.current) {
        deviceRef.current.close().catch(console.error);
      }
    };
  }, []);

  return { status, device: deviceRef.current, connect, disconnect };
}
