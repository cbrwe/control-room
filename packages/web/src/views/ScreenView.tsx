import { useRef, useState } from 'react';
import { type ND75Device, SCREEN, FRAME_BYTES, rgbaToRgb565 } from '@control-room/protocol';
import { Panel } from '../components/Panel';
import { Button } from '../components/Button';
import { SectionHeader } from '../components/SectionHeader';
import { StatusPill } from '../components/StatusPill';
import { formatBytes } from '../lib/utils';

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
        index="03"
        label="SCREEN"
        subtitle={`The ND75 has a ${SCREEN.width}×${SCREEN.height} TFT display you can push images to. Live widgets (clock, weather, Now Playing, calendar) are coming in v1.1.`}
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

          <Panel padding="lg" className="relative overflow-hidden">
            {/* Diagonal hatch fill to read as non-interactive */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none opacity-[0.04]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(135deg, #5dd674 0 1px, transparent 1px 8px)',
              }}
            />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="text-2xs tracking-widest uppercase text-text-muted">
                  ROADMAP // V1.1
                </div>
                <span className="px-2 py-0.5 border border-text-faint text-2xs tracking-widest uppercase text-text-muted">
                  NOT BUILT
                </span>
              </div>
              <h3 className="text-lg text-text-muted mb-3">Live widget system</h3>
              <p className="text-sm text-text-faint mb-4 leading-relaxed">
                Turn the screen into a live data surface that pushes new content
                on a timer. None of the cards below are wired up yet. Listed
                here so you can see what's planned.
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  'Real clock',
                  'Weather',
                  'Now Playing',
                  'Calendar next-up',
                  'CPU/RAM/Net',
                  'Pomodoro timer',
                  'GitHub notifs',
                  'Stocks ticker',
                  'Custom text',
                  'Discord status',
                  'RSS headline',
                  'Theme pack',
                ].map((w) => (
                  <div
                    key={w}
                    aria-disabled
                    className="px-3 py-2 border border-dashed border-ink-400 text-2xs tracking-widest uppercase text-text-faint select-none cursor-not-allowed"
                  >
                    {w}
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
