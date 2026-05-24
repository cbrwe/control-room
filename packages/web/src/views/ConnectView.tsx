import { Panel } from '../components/Panel';
import { Button } from '../components/Button';
import { StatusPill } from '../components/StatusPill';
import type { ConnectionStatus } from '../hooks/useDevice';
import { isWebHIDSupported } from '../adapters/webhid';

interface ConnectViewProps {
  status: ConnectionStatus;
  onConnect: () => void;
}

export function ConnectView({ status, onConnect }: ConnectViewProps) {
  const supported = isWebHIDSupported();
  const connecting = status.state === 'connecting';
  const errored = status.state === 'error';

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-3xl">
        {/* Top telemetry row */}
        <div className="mb-12 flex items-center justify-between text-2xs tracking-widest uppercase text-text-muted">
          <div className="flex items-center gap-3">
            <span className="text-phosphor-dim">SYS</span>
            <span className="text-text-faint">//</span>
            <span>BOOT/0.0.1</span>
          </div>
          <StatusPill
            variant={
              !supported
                ? 'error'
                : errored
                  ? 'error'
                  : connecting
                    ? 'warn'
                    : 'idle'
            }
            label={
              !supported
                ? 'BROWSER UNSUPPORTED'
                : errored
                  ? 'CONNECTION FAULT'
                  : connecting
                    ? 'HANDSHAKE'
                    : 'AWAITING DEVICE'
            }
            blink={connecting}
          />
        </div>

        {/* Hero */}
        <div className="mb-16 animate-boot">
          <div className="text-2xs tracking-widest uppercase text-text-muted mb-3">
            <span className="text-phosphor">CR</span>
            <span className="text-text-faint mx-3">//</span>
            <span>CHILKEY ND75 CONTROL</span>
          </div>
          <h1 className="text-[clamp(3rem,8vw,7rem)] font-bold leading-[0.95] tracking-tight">
            <span className="text-text-primary">CONTROL</span>
            <br />
            <span className="text-text-primary">ROOM</span>
            <span className="text-phosphor animate-blink">_</span>
          </h1>
          <p className="mt-6 text-base text-text-secondary max-w-xl leading-relaxed">
            A proper cross-platform control surface for the Chilkey ND75. Remap
            every key. Drive the RGB. Push live data to the screen. Replaces
            Chilkey's broken official driver.
          </p>
        </div>

        {/* Connect card */}
        <Panel brackets padding="lg" className="animate-boot" style={{ animationDelay: '120ms' }}>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto] gap-8 items-center">
            <div>
              <div className="text-2xs tracking-widest uppercase text-text-muted mb-2">
                STEP 01 // CONNECT
              </div>
              <p className="text-text-primary text-lg leading-snug">
                Plug your ND75 into USB-C and authorize the browser to talk to it.
              </p>
              <p className="text-text-secondary text-sm mt-3 leading-relaxed">
                Bluetooth and 2.4G dongle don't expose the configuration channel.
                Switch the keyboard to USB mode via the on-board LCD before connecting.
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={onConnect}
              loading={connecting}
              disabled={!supported}
            >
              {connecting ? 'CONNECTING' : 'CONNECT'}
            </Button>
          </div>

          {errored && (
            <div className="mt-6 pt-6 border-t border-ink-400">
              <div className="text-2xs tracking-widest uppercase text-danger mb-2">
                FAULT
              </div>
              <p className="text-sm text-text-secondary font-mono">
                {status.state === 'error' && status.message}
              </p>
            </div>
          )}

          {!supported && (
            <div className="mt-6 pt-6 border-t border-ink-400">
              <div className="text-2xs tracking-widest uppercase text-amber mb-2">
                BROWSER NOT SUPPORTED
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                WebHID is not available in this browser. Use Chrome, Edge, Arc,
                Brave, or Opera. Safari and Firefox don't support it yet.
              </p>
            </div>
          )}
        </Panel>

        {/* Spec footer */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-px bg-ink-400">
          <SpecCell label="VENDOR" value="0x36B5" />
          <SpecCell label="PRODUCT" value="0x2BA7" />
          <SpecCell label="PROTOCOL" value="HID/2.0" />
          <SpecCell label="LICENSE" value="MIT" />
        </div>
      </div>
    </div>
  );
}

function SpecCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-900 p-3">
      <div className="text-2xs tracking-widest uppercase text-text-muted mb-1">
        {label}
      </div>
      <div className="text-sm text-text-primary font-mono">{value}</div>
    </div>
  );
}
