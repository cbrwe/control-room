/**
 * Canvas glyph helpers shared across widgets. Drawn from primitives so they
 * scale crisp at the 135x240 LCD and avoid font-dependency surprises.
 */

export function drawSun(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string
): void {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, r * 0.16);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  const rayLen = r * 0.4;
  const rayInner = r * 0.75;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * rayInner, cy + Math.sin(a) * rayInner);
    ctx.lineTo(cx + Math.cos(a) * (rayInner + rayLen), cy + Math.sin(a) * (rayInner + rayLen));
    ctx.stroke();
  }
}

export function drawCloud(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx - r * 0.5, cy + r * 0.1, r * 0.55, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.1, cy - r * 0.3, r * 0.7, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.65, cy + r * 0.05, r * 0.55, 0, Math.PI * 2);
  ctx.arc(cx, cy + r * 0.4, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

export function drawRain(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string
): void {
  drawCloud(ctx, cx, cy - r * 0.3, r * 0.9, color);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, r * 0.1);
  const lineLen = r * 0.4;
  for (let i = -1; i <= 1; i++) {
    const x = cx + i * r * 0.45;
    const y = cy + r * 0.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - lineLen * 0.4, y + lineLen);
    ctx.stroke();
  }
}

export function drawSnow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string
): void {
  drawCloud(ctx, cx, cy - r * 0.3, r * 0.9, color);
  ctx.fillStyle = color;
  for (let i = -1; i <= 1; i++) {
    const x = cx + i * r * 0.45;
    const y = cy + r * 0.55;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawBolt(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string
): void {
  drawCloud(ctx, cx, cy - r * 0.3, r * 0.9, color);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.1, cy + r * 0.15);
  ctx.lineTo(cx - r * 0.25, cy + r * 0.55);
  ctx.lineTo(cx, cy + r * 0.55);
  ctx.lineTo(cx - r * 0.1, cy + r * 0.95);
  ctx.lineTo(cx + r * 0.35, cy + r * 0.4);
  ctx.lineTo(cx + r * 0.1, cy + r * 0.4);
  ctx.closePath();
  ctx.fill();
}
