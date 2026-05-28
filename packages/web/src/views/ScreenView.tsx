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

/** Chilkey caps GIFs at 60 frames; extra frames are dropped. */
const MAX_GIF_FRAMES = 60;

/** Cover-fit a drawable onto the 135x240 frame, centered, black letterbox. */
function coverFit(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  srcW: number,
  srcH: number
): void {
  const scale = Math.max(SCREEN.width / srcW, SCREEN.height / srcH);
  const dw = srcW * scale;
  const dh = srcH * scale;
  const dx = (SCREEN.width - dw) / 2;
  const dy = (SCREEN.height - dh) / 2;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, SCREEN.width, SCREEN.height);
  ctx.drawImage(source, dx, dy, dw, dh);
}

function frameToRgb565(ctx: CanvasRenderingContext2D): Uint8Array {
  const imageData = ctx.getImageData(0, 0, SCREEN.width, SCREEN.height);
  return rgbaToRgb565(new Uint8Array(imageData.data.buffer));
}

/**
 * Decode an animated GIF into concatenated RGB565 frames + per-frame delays
 * using the browser's WebCodecs ImageDecoder (Chrome-only, same as WebHID).
 * Each frame is cover-fitted to the LCD; delays are clamped to a single byte.
 */
async function decodeAnimatedFrames(
  file: File,
  ctx: CanvasRenderingContext2D,
  onProgress?: (frame: number, total: number) => void
): Promise<{ pixels: Uint8Array; delaysMs: number[] }> {
  const decoder = new ImageDecoder({ data: await file.arrayBuffer(), type: file.type });
  await decoder.completed;
  const track = decoder.tracks.selectedTrack;
  const total = Math.min(track?.frameCount ?? 1, MAX_GIF_FRAMES);

  const frames: Uint8Array[] = [];
  const delaysMs: number[] = [];
  for (let i = 0; i < total; i++) {
    const { image } = await decoder.decode({ frameIndex: i });
    coverFit(ctx, image, image.displayWidth, image.displayHeight);
    frames.push(frameToRgb565(ctx));
    const durationUs = image.duration ?? 0;
    delaysMs.push(Math.min(255, Math.max(0, Math.round(durationUs / 1000))));
    image.close();
    onProgress?.(i + 1, total);
  }
  decoder.close();

  const totalBytes = frames.reduce((n, f) => n + f.length, 0);
  const pixels = new Uint8Array(totalBytes);
  let offset = 0;
  for (const f of frames) {
    pixels.set(f, offset);
    offset += f.length;
  }
  return { pixels, delaysMs };
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

      const canvas = canvasRef.current!;
      canvas.width = SCREEN.width;
      canvas.height = SCREEN.height;
      const ctx = canvas.getContext('2d')!;

      const animated =
        file.type === 'image/gif' &&
        typeof ImageDecoder !== 'undefined' &&
        (await ImageDecoder.isTypeSupported('image/gif'));

      let pixels: Uint8Array;
      let delaysMs: number[];

      if (animated) {
        const decoded = await decodeAnimatedFrames(file, ctx, (i, total) =>
          setUpload({ status: 'processing', message: `Decoding frame ${i}/${total}` })
        );
        pixels = decoded.pixels;
        delaysMs = decoded.delaysMs;
      } else {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = url;
        });
        coverFit(ctx, img, img.naturalWidth || img.width, img.naturalHeight || img.height);
        pixels = frameToRgb565(ctx);
        delaysMs = [0];
      }

      setUpload({ status: 'uploading' });
      const start = performance.now();
      await device.uploadImage(pixels, delaysMs);
      const elapsed = Math.round(performance.now() - start);

      const frameNote = delaysMs.length > 1 ? `${delaysMs.length} frames · ` : '';
      setUpload({
        status: 'ok',
        message: `Uploaded ${frameNote}${formatBytes(pixels.length)} in ${elapsed}ms`,
      });
    } catch (err) {
      setUpload({
        status: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <SectionHeader
        index="04"
        label="SCREEN"
        subtitle={`The ND75 has a ${SCREEN.width}×${SCREEN.height} TFT display. Pick a widget to push, or upload a still image or an animated GIF.`}
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
                ? 'Ready'
                : upload.status === 'processing'
                  ? 'Processing'
                  : upload.status === 'uploading'
                    ? 'Uploading'
                    : upload.status === 'ok'
                      ? 'OK'
                      : 'Fault'
            }
            blink={upload.status === 'uploading' || upload.status === 'processing'}
          />
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[360px,1fr] gap-6">
        <div className="space-y-6">
          <Panel padding="lg">
            <div className="text-xs font-medium text-text-muted mb-3">
              Preview · {SCREEN.width}×{SCREEN.height}
            </div>
            <div
              className="mx-auto bg-black rounded-md overflow-hidden ring-1 ring-ink-500"
              style={{ width: 240, height: 426 }}
            >
              <canvas
                ref={canvasRef}
                width={SCREEN.width}
                height={SCREEN.height}
                className="w-full h-full"
                style={{ imageRendering: 'pixelated' }}
              />
              {!preview && (
                <div className="-mt-[426px] w-full h-[426px] flex items-center justify-center text-xs text-white/40 font-mono">
                  No image
                </div>
              )}
            </div>
            <div className="mt-4 text-xs text-text-faint text-center font-mono">
              {FRAME_BYTES.toLocaleString()} bytes / frame · RGB565
            </div>
          </Panel>

          <Panel padding="lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs font-medium text-text-muted">Widget preview</div>
                <div className="text-xs text-text-faint mt-0.5">Mirrors what's being pushed</div>
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
                    ? 'Preview'
                    : widgetState.status === 'rendering'
                      ? 'Render'
                      : widgetState.status === 'uploading'
                        ? 'Uploading'
                        : widgetState.status === 'live'
                          ? widgetActive
                            ? 'Live'
                            : 'Pushed'
                          : 'Fault'
                }
                blink={widgetState.status === 'uploading' || widgetState.status === 'rendering'}
              />
            </div>
            <div className="flex justify-center">
              <div
                className="bg-black rounded-md overflow-hidden ring-1 ring-ink-500"
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
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel padding="lg">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-base font-semibold text-text-primary">Live widgets</h3>
                <p className="text-sm text-text-secondary mt-0.5">
                  Pick a widget. Push once, or go live to refresh on a cadence.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {WIDGETS.map((w) => (
                <WidgetRow
                  key={w.id}
                  widget={w}
                  active={w.id === widgetId}
                  onSelect={() => setWidgetId(w.id)}
                />
              ))}
            </div>

            {widgetId === 'text' && (
              <div className="mt-5">
                <label className="text-xs font-medium text-text-muted">
                  Custom message
                  <span className="text-text-faint font-normal ml-2">(12 char max)</span>
                </label>
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value.slice(0, 12))}
                  className="mt-1.5 w-full h-10 bg-white border border-ink-500 rounded-md px-3 text-sm text-text-primary outline-none focus:border-phosphor focus:shadow-ring"
                  maxLength={12}
                />
              </div>
            )}

            <div className="mt-6 pt-5 border-t border-ink-600 flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                onClick={renderAndPush}
                disabled={!widget || widgetState.status === 'uploading'}
              >
                Push once
              </Button>
              <Button
                variant={widgetActive ? 'primary' : 'secondary'}
                onClick={() => setWidgetActive((a) => !a)}
                disabled={!widget || (widget && widget.intervalSec === 0)}
              >
                {widgetActive ? '● Live' : '○ Go live'}
              </Button>
              {widget && widget.intervalSec === 0 && (
                <span className="text-xs text-text-faint">Static · no live loop</span>
              )}
              {widgetState.status === 'live' && widgetState.nextPushAt && widgetActive && (
                <span className="text-xs text-text-muted font-mono ml-auto">
                  next in {Math.max(0, Math.round((widgetState.nextPushAt - Date.now()) / 1000))}s
                </span>
              )}
            </div>

            {widgetState.status === 'error' && (
              <p className="text-xs text-danger mt-3 font-medium">
                {widgetState.message}
              </p>
            )}
          </Panel>

          <Panel padding="lg">
            <h3 className="text-base font-semibold text-text-primary">Upload an image or GIF</h3>
            <p className="text-sm text-text-secondary mt-0.5">
              Cover-fitted to {SCREEN.width}×{SCREEN.height}, converted to RGB565. Animated GIFs
              play on the LCD (up to {MAX_GIF_FRAMES} frames).
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
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={() => fileInput.current?.click()}>
                Choose file
              </Button>
              {upload.message && (
                <span
                  className={cn(
                    'text-xs font-medium',
                    upload.status === 'ok' ? 'text-phosphor-dim' : 'text-danger'
                  )}
                >
                  {upload.message}
                </span>
              )}
            </div>
          </Panel>

          <WidgetSettings />
        </div>
      </div>
    </div>
  );
}

interface WidgetRowProps {
  widget: Widget;
  active: boolean;
  onSelect: () => void;
}

function WidgetRow({ widget, active, onSelect }: WidgetRowProps) {
  return (
    <div
      className={cn(
        'rounded-md border transition-all',
        active
          ? 'border-phosphor bg-phosphor/5 shadow-card'
          : 'border-ink-500 bg-white hover:border-ink-300 hover:bg-ink-800'
      )}
    >
      <button
        onClick={onSelect}
        className="w-full text-left px-4 py-3.5 flex items-center gap-3"
      >
        <div
          className={cn(
            'h-5 w-5 rounded-full border-2 shrink-0 transition-colors',
            active ? 'border-phosphor bg-phosphor' : 'border-ink-500 bg-white'
          )}
        >
          {active && (
            <svg viewBox="0 0 20 20" className="text-white">
              <path
                d="M6 10l3 3 5-5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">{widget.name}</span>
            {widget.intervalSec > 0 && (
              <span className="text-xs text-text-faint font-mono">
                · {widget.intervalSec}s
              </span>
            )}
          </div>
          <div className="text-xs text-text-muted mt-0.5">{widget.description}</div>
        </div>
      </button>
    </div>
  );
}
