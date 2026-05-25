import { cn } from '../lib/utils';
import { ND75_LAYOUT, LAYOUT_WIDTH, LAYOUT_HEIGHT, KNOB, type PhysicalKey } from '../lib/nd75-layout';

interface KeyboardLayoutProps {
  /** Currently selected slot index. */
  selectedSlot?: number | null;
  /** Per-slot color overrides (e.g. for the lighting view to preview RGB). */
  keyColors?: Record<number, string>;
  /** Per-slot label overrides (used when keymap is remapped). */
  labelOverrides?: Record<number, string>;
  /** Whether to highlight the FN layer styling. */
  fnLayerActive?: boolean;
  /** Click handler when a key is selected. */
  onKeySelect?: (key: PhysicalKey) => void;
  className?: string;
}

const SCALE = 14; // pixels per 0.25u unit
const GAP = 2;
const RADIUS = 3;

/**
 * SVG render of the physical ND75 75% layout. Every key is a clickable region.
 * Hover and selected states use bracket-style accents.
 */
export function KeyboardLayout({
  selectedSlot,
  keyColors,
  labelOverrides,
  fnLayerActive = false,
  onKeySelect,
  className,
}: KeyboardLayoutProps) {
  const widthPx = LAYOUT_WIDTH * SCALE + 24;
  const heightPx = LAYOUT_HEIGHT * SCALE + 24;

  return (
    <div className={cn('relative w-full', className)}>
      <svg
        viewBox={`0 0 ${widthPx} ${heightPx}`}
        className="w-full h-auto"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="ND75 keyboard layout"
      >
        <defs>
          <linearGradient id="keyFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1f2530" />
            <stop offset="100%" stopColor="#161b22" />
          </linearGradient>
          <linearGradient id="keyFillHover" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#252b38" />
            <stop offset="100%" stopColor="#1c2230" />
          </linearGradient>
          <linearGradient id="keyFillFn" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a2a22" />
            <stop offset="100%" stopColor="#0f1a14" />
          </linearGradient>
          <filter id="keyShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.5" />
            <feOffset dy="1" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.4" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform="translate(12, 12)">
          {ND75_LAYOUT.map((k) => {
            const x = k.col * SCALE + GAP / 2;
            const y = k.row * (4 * SCALE) + GAP / 2;
            const w = k.width * SCALE - GAP;
            const h = 4 * SCALE - GAP;
            const isSelected = selectedSlot === k.slot;
            const colorOverride = keyColors?.[k.slot];
            const label = labelOverrides?.[k.slot] ?? k.label;

            return (
              <g
                key={k.slot}
                transform={`translate(${x}, ${y})`}
                style={{ cursor: onKeySelect ? 'pointer' : 'default' }}
                onClick={() => onKeySelect?.(k)}
                className="group"
              >
                {/* Key cap body */}
                <rect
                  width={w}
                  height={h}
                  rx={RADIUS}
                  ry={RADIUS}
                  fill={
                    colorOverride
                      ? colorOverride
                      : fnLayerActive
                        ? 'url(#keyFillFn)'
                        : 'url(#keyFill)'
                  }
                  stroke={isSelected ? '#5dd674' : colorOverride ? 'transparent' : '#2a3038'}
                  strokeWidth={isSelected ? 1.5 : 1}
                  filter="url(#keyShadow)"
                  className={cn(
                    'transition-colors duration-150',
                    !colorOverride && !isSelected && 'group-hover:fill-[url(#keyFillHover)]'
                  )}
                />

                {/* Selected viewfinder brackets */}
                {isSelected && (
                  <>
                    <SelectionBracket x={0} y={0} w={4} h={4} />
                    <SelectionBracket x={w} y={0} w={-4} h={4} />
                    <SelectionBracket x={0} y={h} w={4} h={-4} />
                    <SelectionBracket x={w} y={h} w={-4} h={-4} />
                  </>
                )}

                {/* Sub-label (top right) */}
                {k.sublabel && (
                  <text
                    x={w - 4}
                    y={9}
                    fontSize={6}
                    textAnchor="end"
                    fill="#5b626d"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {k.sublabel}
                  </text>
                )}
                {/* Main label */}
                <text
                  x={4}
                  y={h - 4}
                  fontSize={label.length > 3 ? 6 : 9}
                  textAnchor="start"
                  fill={isSelected ? '#5dd674' : colorOverride ? '#06080b' : '#9aa1ac'}
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight={500}
                  className="select-none"
                  style={{ pointerEvents: 'none' }}
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Rotary knob — physical hardware, separate from the keymap. */}
          <g transform={`translate(${KNOB.col * SCALE + GAP / 2}, ${KNOB.row * 4 * SCALE + GAP / 2})`}>
            <circle
              cx={(KNOB.diameter * SCALE - GAP) / 2}
              cy={(KNOB.diameter * SCALE - GAP) / 2}
              r={(KNOB.diameter * SCALE - GAP) / 2 - 1}
              fill="#10141a"
              stroke="#363c47"
              strokeWidth="1"
            />
            <circle
              cx={(KNOB.diameter * SCALE - GAP) / 2}
              cy={(KNOB.diameter * SCALE - GAP) / 2}
              r={(KNOB.diameter * SCALE - GAP) / 2 - 4}
              fill="none"
              stroke="#5dd674"
              strokeWidth="1"
              strokeDasharray="2 3"
              opacity="0.4"
            />
            <text
              x={(KNOB.diameter * SCALE - GAP) / 2}
              y={(KNOB.diameter * SCALE - GAP) / 2 + 3}
              fontSize={6}
              textAnchor="middle"
              fill="#5b626d"
              fontFamily="JetBrains Mono, monospace"
            >
              KNOB
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}

/** Small viewfinder bracket at the corner of a selected key. */
function SelectionBracket({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <line x1={0} y1={0} x2={w} y2={0} stroke="#5dd674" strokeWidth="1.5" />
      <line x1={0} y1={0} x2={0} y2={h} stroke="#5dd674" strokeWidth="1.5" />
    </g>
  );
}
