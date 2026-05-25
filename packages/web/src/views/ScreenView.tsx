import { useRef, useState } from 'react';
import { type ND75Device, SCREEN, FRAME_BYTES, rgbaToRgb565 } from '@control-room/protocol';
import { Panel } from '../components/Panel';
import { Button } from '../components/Button';
import { SectionHeader } from '../components/SectionHeader';
import { StatusPill } from '../components/StatusPill';
import { formatBytes, cn } from '../lib/utils';
import { WIDGETS, type Widget } from '../lib/widgets';
import { useLcdWidget } from '../hooks/useLcdWidget';
import { WidgetSettings } from '../components/WidgetSettings';

interface ScreenViewProps {
  device: ND75Device;
}

interface UploadState {
  status: 'idle' | 'processing' | 'uploading' | 'ok' | 'error';
  message?: string;
  progress?: number;
}

export function ScreenView({ device }: ScreenViewProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' });
  const fileInput = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [widgetId, setWidgetId] = useState<string | null>('clock');
  const [widgetActive, setWidgetActive] = useState(false);
  const [customText, setCustomText] = useState('HELLO');
  const widget: Widget | null = widgetId
    ? WIDGETS.find((w) => w.id === widgetId) ?? null
    : null;
  // Stash custom text on window so the text widget can read it without prop drilling.
  if (typeof window !== 'undefined') {
    (window as Window & { __crCustomText?: string }).__crCustomText = customText;
  }
  const { canvasRef: widgetPreviewRef, state: widgetState, renderAndPush } = useLcdWidget({
    device,
    widget,
    active: widgetActive,
  });

  const handleFile = async (file: File) => {
    setUpload({ status: 'processing' });
    try {
      const url = URL.createObjectURL(file);
      setPreview(url);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = url;
      });

      const canvas = canvasRef.current!;
      canvas.width = SCREEN.width;
      canvas.height = SCREEN.height;
      const ctx = canvas.getContext('2d')!;
      // Cover fit
      const scale = Math.max(SCREEN.width / img.width, SCREEN.height / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = (SCREEN.width - dw) / 2;
      const dy = (SCREEN.height - dh) / 2;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, SCREEN.width, SCREEN.height);
      ctx.drawImage(img, dx, dy, dw, dh);

      const imageData = ctx.getImageData(0, 0, SCREEN.width, SCREEN.height);
      const rgb565 = rgbaToRgb565(new Uint8Array(imageData.data.buffer));

      setUpload({ status: 'uploading' });
      const start = performance.now();
      await device.uploadImage(rgb565);
      const elapsed = Math.round(performance.now() - start);

      setUpload({
        status: 'ok',
        message: `UPLOADED ${formatBytes(rgb565.length)} IN ${elapsed}MS`,
      });
    } catch (err) {
      setUpload({
        status: 'error',
        message: err instanceof Error ? err.message : 'unknown error',
      });
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <SectionHeader
        index="04"
        label="SCREEN"
        subtitle={`The ND75 has a ${SCREEN.width}×${SCREEN.height} TFT display you can push images to or run live widgets on. Toggle WIDGET LIVE to start pushing on a timer.`}
        action={
          <StatusPill
            variant={
              upload.status === 'uploading' || upload.status === 'processing'
                ? 'warn'
                : upload.status === 'ok'
                  ? 'live'
                  : upload.status === 'error'
                    ? 'error'
                    : 'idle'
            }
            label={
              upload.status === 'idle'
                ? 'READY'
                : upload.status === 'processing'
                  ? 'PROCESSING'
                  : upload.status === 'uploading'
                    ? 'UPLOADING'
                    : upload.status === 'ok'
                      ? 'OK'
                      : 'FAULT'
            }
            blink={upload.status === 'uploading' || upload.status === 'processing'}
          />
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[420px,1fr] gap-6">
        {/* Phone-shaped TFT preview */}
        <Panel padding="lg">
          <div className="text-2xs tracking-widest uppercase text-text-muted mb-3">
            PREVIEW // {SCREEN.width}×{SCREEN.height}
          </div>
          <div
            className="mx-auto bg-black border border-ink-400 overflow-hidden"
            style={{
              width: 270,
              height: 480,
            }}
          >
            <canvas
              ref={canvasRef}
              width={SCREEN.width}
              height={SCREEN.height}
              className="w-full h-full"
              style={{ imageRendering: 'pixelated' }}
            />
            {!preview && (
              <div className="-mt-[480px] w-full h-[480px] flex items-center justify-center text-2xs tracking-widest uppercase text-text-muted">
                NO IMAGE
              </div>
            )}
          </div>
          <div className="mt-4 text-2xs tracking-widest uppercase text-text-faint text-center">
            {FRAME_BYTES.toLocaleString()} BYTES / FRAME @ RGB565
          </div>
        </Panel>

        {/* Controls */}
        <div className="space-y-4">
          <Panel padding="lg">
            <div className="text-2xs tracking-widest uppercase text-text-muted mb-2">
              UPLOAD AN IMAGE
            </div>
            <p className="text-sm text-text-secondary mb-4">
              Drop an image or browse to one. We'll cover-fit it to the screen and
              convert to RGB565 automatically. GIF support is coming with the live
              widget system.
            </p>
            <input
              type="file"
              ref={fileInput}
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
              className="hidden"
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => fileInput.current?.click()}>
                CHOOSE FILE
              </Button>
              {upload.message && (
                <span
                  className={
                    upload.status === 'ok'
                      ? 'text-2xs tracking-widest uppercase text-phosphor'
                      : 'text-2xs tracking-widest uppercase text-danger'
                  }
                >
                  {upload.message}
                </span>
              )}
            </div>
          </Panel>

          <Panel padding="lg">
            <div className="flex items-center justify-between mb-3">
              <div className="text-2xs tracking-widest uppercase text-text-muted">
                LIVE WIDGETS
              </div>
              <StatusPill
                variant={
                  widgetState.status === 'uploading' || widgetState.status === 'rendering'
                    ? 'warn'
                    : widgetState.status === 'live'
                      ? 'live'
                      : widgetState.status === 'error'
                        ? 'error'
                        : 'idle'
                }
                label={
                  widgetState.status === 'idle'
                    ? 'PREVIEW'
                    : widgetState.status === 'rendering'
                      ? 'RENDER'
                      : widgetState.status === 'uploading'
                        ? 'UPLOADING'
                        : widgetState.status === 'live'
                          ? widgetActive
                            ? 'LIVE'
                            : 'PUSHED'
                          : 'FAULT'
                }
                blink={widgetState.status === 'uploading' || widgetState.status === 'rendering'}
              />
            </div>
            <p className="text-sm text-text-secondary mb-4 leading-relaxed">
              Pick a widget. Hit PUSH ONCE to send a single frame or toggle
              LIVE to push on the widget's natural cadence (clock = 60s).
            </p>

            <div className="grid grid-cols-1 gap-2 mb-4">
              {WIDGETS.map((w) => {
                const active = w.id === widgetId;
                return (
                  <button
                    key={w.id}
                    onClick={() => setWidgetId(w.id)}
                    className={cn(
                      'text-left border px-3 py-2.5 transition-colors',
                      active
                        ? 'border-phosphor bg-phosphor/5'
                        : 'border-ink-400 hover:border-text-muted'
                    )}
                  >
                    <div className={cn(
                      'text-2xs tracking-widest uppercase',
                      active ? 'text-phosphor' : 'text-text-primary'
                    )}>
                      {w.name}
                      {w.intervalSec > 0 && (
                        <span className="text-text-faint ml-2">
                          // {w.intervalSec}S CADENCE
                        </span>
                      )}
                    </div>
                    <div className="text-2xs text-text-faint mt-0.5">{w.description}</div>
                  </button>
                );
              })}
            </div>

            {widgetId === 'text' && (
              <div className="mb-4">
                <div className="text-2xs tracking-widest uppercase text-text-muted mb-2">
                  CUSTOM MESSAGE (12 CHAR MAX)
                </div>
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value.slice(0, 12))}
                  className="w-full h-10 bg-ink-900 border border-ink-400 px-3 text-text-primary font-mono text-sm outline-none focus:border-phosphor"
                  maxLength={12}
                />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                onClick={renderAndPush}
                disabled={!widget || widgetState.status === 'uploading'}
              >
                PUSH ONCE
              </Button>
              <button
                onClick={() => setWidgetActive((a) => !a)}
                disabled={!widget || (widget && widget.intervalSec === 0)}
                className={cn(
                  'h-10 px-5 border text-xs tracking-widest uppercase font-mono transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                  widgetActive
                    ? 'border-phosphor bg-phosphor text-ink-950 hover:bg-phosphor-bright'
                    : 'border-phosphor/40 text-phosphor hover:border-phosphor hover:bg-phosphor/5'
                )}
              >
                {widgetActive ? '◉ LIVE' : '○ GO LIVE'}
              </button>
              {widget && widget.intervalSec === 0 && (
                <span className="text-2xs tracking-widest uppercase text-text-faint">
                  STATIC // NO LIVE LOOP
                </span>
              )}
            </div>

            {widgetState.status === 'live' && widgetState.nextPushAt && widgetActive && (
              <p className="text-2xs tracking-widest uppercase text-text-faint mt-3">
                NEXT PUSH IN {Math.max(0, Math.round((widgetState.nextPushAt - Date.now()) / 1000))}S
              </p>
            )}
            {widgetState.status === 'error' && (
              <p className="text-2xs tracking-widest uppercase text-danger mt-3">
                {widgetState.message.toUpperCase()}
              </p>
            )}

            {/* Hidden preview canvas mirrors what's being pushed */}
            <div className="mt-5 flex justify-center">
              <div
                className="bg-black border border-ink-400 overflow-hidden"
                style={{ width: 135, height: 240 }}
              >
                <canvas
                  ref={widgetPreviewRef}
                  width={SCREEN.width}
                  height={SCREEN.height}
                  className="w-full h-full"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
            </div>
            <p className="text-2xs tracking-widest uppercase text-text-faint text-center mt-2">
              WIDGET PREVIEW // {SCREEN.width}×{SCREEN.height}
            </p>
          </Panel>

          <WidgetSettings />
        </div>
      </div>
    </div>
  );
}
