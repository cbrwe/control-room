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
    <div className="min-h-screen bg-ink-950 flex items-center justify-center p-6 lg:p-10">
      <div className="w-full max-w-3xl">
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-phosphor flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path
                  d="M5 7h12M5 11h12M5 15h8"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <div className="text-base font-semibold text-text-primary tracking-tight">
                Control Room
              </div>
              <div className="text-xs text-text-muted">
                Chilkey ND75 keyboard
              </div>
            </div>
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
                ? 'Browser unsupported'
                : errored
                  ? 'Connection fault'
                  : connecting
                    ? 'Handshake'
                    : 'Awaiting device'
            }
            blink={connecting}
          />
        </div>

        <div className="mb-10 animate-boot">
          <h1 className="text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight text-text-primary">
            Take control of
            <br />
            your ND75.
          </h1>
          <p className="mt-5 text-lg text-text-secondary max-w-xl leading-relaxed">
            A modern cross-platform control surface for the Chilkey ND75. Remap
            every key, drive the RGB, push live data to the screen. Open source,
            no install.
          </p>
        </div>

        <Panel padding="lg" elevation="elevated" className="animate-boot">
          <div className="text-xs font-medium text-text-muted mb-5">
            Connection sequence
          </div>

          <ol className="space-y-5">
            <Step
              index="1"
              title="Plug in USB-C"
              body="Wired only. Bluetooth and the 2.4G dongle don't expose the config channel."
            />
            <Step
              index="2"
              title="Press Fn + T"
              body="Toggles the keyboard into USB mode. The LCD will switch to show USB as the active connection."
            />
            <Step
              index="3"
              title="Click Connect"
              body="The ND75 shows up as multiple rows in the picker (one per HID interface). Cmd/Ctrl-click to select ALL of them, then click Connect. Picking only one row breaks the screen and key-bind features."
              action={
                <Button
                  variant="primary"
                  size="lg"
                  onClick={onConnect}
                  loading={connecting}
                  disabled={!supported}
                >
                  {connecting ? 'Connecting' : 'Connect'}
                </Button>
              }
            />
          </ol>

          {errored && (
            <div className="mt-8 pt-6 border-t border-ink-600">
              <div className="text-xs font-semibold text-danger mb-2">Fault</div>
              <p className="text-sm text-text-secondary font-mono">
                {status.state === 'error' && status.message}
              </p>
            </div>
          )}

          {!supported && (
            <div className="mt-8 pt-6 border-t border-ink-600">
              <div className="text-xs font-semibold text-amber mb-2">
                Browser not supported
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                WebHID isn't available in this browser. Use Chrome, Edge, Arc,
                Brave, or Opera. Safari and Firefox don't support it yet.
              </p>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-ink-600">
            <div className="text-xs font-medium text-text-muted mb-3">
              Device not in picker?
            </div>
            <ul className="space-y-2 text-sm text-text-secondary leading-relaxed">
              <Diagnostic>
                Check the cable. Some USB-C cables are charge-only and don't
                pass data. Try a known-good cable.
              </Diagnostic>
              <Diagnostic>
                Confirm the keyboard's LCD shows <span className="text-phosphor-dim font-mono font-medium">USB</span> as
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
                Unplug, wait 3 seconds, plug back in. Click Connect again.
              </Diagnostic>
            </ul>
          </div>
        </Panel>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <SpecCell label="Vendor" value="0x36B5" />
          <SpecCell label="Product" value="0x2BA7" />
          <SpecCell label="Protocol" value="HID/2.0" />
          <SpecCell label="License" value="MIT" />
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
      <div className="h-8 w-8 rounded-full flex items-center justify-center bg-phosphor text-white text-sm font-semibold">
        {index}
      </div>
      <div className="min-w-0">
        <div className="text-base font-semibold text-text-primary">{title}</div>
        <p className="text-sm text-text-secondary mt-1 leading-relaxed">{body}</p>
      </div>
      {action && <div className="self-center">{action}</div>}
    </li>
  );
}

function Diagnostic({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="text-phosphor-dim mt-0.5 shrink-0">·</span>
      <span>{children}</span>
    </li>
  );
}

function SpecCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-ink-600 rounded-md p-3">
      <div className="text-2xs uppercase tracking-widest text-text-muted font-mono">
        {label}
      </div>
      <div className="text-sm text-text-primary font-mono mt-1">{value}</div>
    </div>
  );
}
