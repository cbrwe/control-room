import { Panel } from '../components/Panel';
import { Button } from '../components/Button';
import { StatusPill } from '../components/StatusPill';
import type { ConnectionStatus } from '../hooks/useDevice';
import { isWebHIDSupported } from '../adapters/webhid';
import { cn } from '../lib/utils';

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
        <div className="mb-12 animate-boot">
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

        {/* Connect card with 3-step checklist */}
        <Panel brackets padding="lg" className="animate-boot" style={{ animationDelay: '120ms' }}>
          <div className="text-2xs tracking-widest uppercase text-text-muted mb-6">
            CONNECTION SEQUENCE
          </div>

          <ol className="space-y-4">
            <Step
              index="01"
              title="PLUG IN USB-C"
              body="Wired only. Bluetooth and the 2.4G dongle don't expose the config channel."
            />
            <Step
              index="02"
              title="PRESS FN + T"
              body="Toggles the keyboard into USB mode. The LCD will switch to show USB as the active connection."
            />
            <Step
              index="03"
              title="CLICK CONNECT"
              body="Authorizes this browser to talk to the keyboard. The ND75 shows up as MULTIPLE rows in the picker (one per HID interface). Cmd/Ctrl-click to select ALL of them, then click Connect. Picking just one row breaks the screen and key-bind features."
              action={
                <Button
                  variant="primary"
                  size="lg"
                  onClick={onConnect}
                  loading={connecting}
                  disabled={!supported}
                >
                  {connecting ? 'CONNECTING' : 'CONNECT'}
                </Button>
              }
            />
          </ol>

          {errored && (
            <div className="mt-8 pt-6 border-t border-ink-400">
              <div className="text-2xs tracking-widest uppercase text-danger mb-2">
                FAULT
              </div>
              <p className="text-sm text-text-secondary font-mono">
                {status.state === 'error' && status.message}
              </p>
            </div>
          )}

          {!supported && (
            <div className="mt-8 pt-6 border-t border-ink-400">
              <div className="text-2xs tracking-widest uppercase text-amber mb-2">
                BROWSER NOT SUPPORTED
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                WebHID isn't available in this browser. Use Chrome, Edge, Arc,
                Brave, or Opera. Safari and Firefox don't support it yet.
              </p>
            </div>
          )}

          {/* Inline troubleshooter, always visible */}
          <div className="mt-8 pt-6 border-t border-ink-400">
            <div className="text-2xs tracking-widest uppercase text-text-muted mb-3">
              TROUBLESHOOT // DEVICE NOT IN PICKER
            </div>
            <ul className="space-y-2 text-sm text-text-secondary leading-relaxed">
              <Diagnostic>
                Check the cable. Some USB-C cables are charge-only and don't
                pass data. Try a known-good cable.
              </Diagnostic>
              <Diagnostic>
                Confirm the keyboard's LCD is showing <span className="text-phosphor font-mono">USB</span> as
                active. If it shows BT or 2.4G, press Fn + T again to cycle.
              </Diagnostic>
              <Diagnostic>
                Try a different USB port. Hubs and dongles sometimes drop HID
                devices. Plug straight into the machine.
              </Diagnostic>
              <Diagnostic>
                Quit any other app that might be holding the HID interface
                (the official Chilkey driver, VIA, QMK Toolbox).
              </Diagnostic>
              <Diagnostic>
                Unplug, wait 3 seconds, plug back in. Click CONNECT again.
              </Diagnostic>
            </ul>
          </div>
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

interface StepProps {
  index: string;
  title: string;
  body: string;
  action?: React.ReactNode;
}

function Step({ index, title, body, action }: StepProps) {
  return (
    <li className="grid grid-cols-[auto,1fr,auto] gap-4 sm:gap-6 items-start">
      <div
        className={cn(
          'h-10 w-10 flex items-center justify-center border border-ink-400',
          'text-2xs tracking-widest uppercase text-phosphor font-mono'
        )}
      >
        {index}
      </div>
      <div className="min-w-0">
        <div className="text-sm tracking-widest uppercase text-text-primary">
          {title}
        </div>
        <p className="text-sm text-text-secondary mt-1 leading-relaxed">{body}</p>
      </div>
      {action && <div className="self-center">{action}</div>}
    </li>
  );
}

function Diagnostic({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="text-text-faint mt-px shrink-0">{'>'}</span>
      <span>{children}</span>
    </li>
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
