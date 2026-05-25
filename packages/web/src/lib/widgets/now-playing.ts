import type { Widget } from '../widgets';
import {
  PALETTE,
  clearFrame,
  drawErrorState,
  drawLoadingState,
  drawTag,
} from '../widgets';
import { drawNote } from '../widget-icons';
import { isConnected, spotifyFetch } from './spotify-oauth';

interface NowPlayingData {
  playing: boolean;
  track?: string;
  artist?: string;
  album?: string;
  progressMs?: number;
  durationMs?: number;
  artUrl?: string;
  /** Pre-loaded HTMLImageElement so render is sync. */
  art?: HTMLImageElement;
}

interface SpotifyTrack {
  name: string;
  duration_ms: number;
  artists: { name: string }[];
  album: { name: string; images: { url: string; width: number; height: number }[] };
}

interface SpotifyNowPlaying {
  is_playing: boolean;
  progress_ms?: number;
  item?: SpotifyTrack;
}

/** Cache loaded art across renders so we don't re-fetch each frame. */
const artCache = new Map<string, HTMLImageElement>();

async function loadImage(url: string): Promise<HTMLImageElement> {
  const cached = artCache.get(url);
  if (cached && cached.complete && cached.naturalWidth > 0) return cached;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('art load failed'));
    img.src = url;
  });
  artCache.set(url, img);
  return img;
}

export const NOW_PLAYING_WIDGET: Widget<NowPlayingData> = {
  id: 'now-playing',
  name: 'Now Playing',
  description: 'Current Spotify track with album art. Refreshes every 10 sec.',
  intervalSec: 10,

  async fetchData(): Promise<NowPlayingData> {
    if (!isConnected()) throw new Error('NOT CONNECTED — SETTINGS');
    const np = await spotifyFetch<SpotifyNowPlaying>('/me/player/currently-playing');
    if (!np || !np.item) {
      return { playing: false };
    }
    const item = np.item;
    // Pick the smallest image larger than 135px, or fall back to the smallest.
    const images = item.album.images.slice().sort((a, b) => a.width - b.width);
    const art = images.find((i) => i.width >= 135) ?? images[0];
    const result: NowPlayingData = {
      playing: np.is_playing,
      track: item.name,
      artist: item.artists.map((a) => a.name).join(', '),
      album: item.album.name,
    };
    if (np.progress_ms !== undefined) result.progressMs = np.progress_ms;
    if (item.duration_ms !== undefined) result.durationMs = item.duration_ms;
    if (art?.url) {
      result.artUrl = art.url;
      try {
        result.art = await loadImage(art.url);
      } catch {
        // Continue without art if image load fails.
      }
    }
    return result;
  },

  render(ctx, w, h, state) {
    if (state.status === 'loading' || state.status === 'idle') {
      drawLoadingState(ctx, w, h, 'NOW PLAYING…');
      return;
    }
    if (state.status === 'error') {
      drawErrorState(ctx, w, h, 'SPOTIFY', state.message);
      return;
    }
    const d = state.data;
    clearFrame(ctx, w, h);

    if (!d.playing || !d.track) {
      drawTag(ctx, 'NOW PLAYING', 10, 8);
      drawNote(ctx, w / 2, h * 0.35, 30, PALETTE.phosphorDim);
      ctx.fillStyle = PALETTE.dim;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('NOTHING PLAYING', w / 2, h * 0.65);
      ctx.fillStyle = PALETTE.faint;
      ctx.font = '10px monospace';
      ctx.fillText('hit play in spotify', w / 2, h * 0.65 + 18);
      return;
    }

    // Album art fills the top square area
    const artSize = w; // 135 — square art
    if (d.art) {
      ctx.drawImage(d.art, 0, 0, artSize, artSize);
    } else {
      ctx.fillStyle = PALETTE.faint;
      ctx.fillRect(0, 0, artSize, artSize);
      drawNote(ctx, artSize / 2, artSize / 2, artSize * 0.25, PALETTE.dim);
    }

    // Phosphor edge under the art
    ctx.fillStyle = PALETTE.phosphor;
    ctx.fillRect(0, artSize, w, 2);

    // Progress bar
    const progressY = artSize + 6;
    ctx.fillStyle = PALETTE.faint;
    ctx.fillRect(10, progressY, w - 20, 3);
    if (d.progressMs && d.durationMs) {
      const pct = Math.max(0, Math.min(1, d.progressMs / d.durationMs));
      ctx.fillStyle = PALETTE.phosphor;
      ctx.fillRect(10, progressY, Math.round((w - 20) * pct), 3);
    }

    // Track name
    ctx.fillStyle = PALETTE.phosphor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 14px monospace';
    drawClippedText(ctx, d.track.toUpperCase(), w / 2, progressY + 12, w - 16);

    // Artist
    ctx.fillStyle = PALETTE.white;
    ctx.font = 'bold 11px monospace';
    drawClippedText(ctx, (d.artist ?? '').toUpperCase(), w / 2, progressY + 32, w - 16);

    // Album (dim, smaller)
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '10px monospace';
    drawClippedText(ctx, (d.album ?? '').toUpperCase(), w / 2, progressY + 50, w - 16);

    // Tiny "PLAYING" indicator
    ctx.fillStyle = PALETTE.phosphor;
    ctx.beginPath();
    ctx.arc(8, h - 10, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.phosphorDim;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('PLAYING', 16, h - 10);
  },
};

/** Truncate text with an ellipsis if it overflows maxWidth. */
function drawClippedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number
): void {
  let t = text;
  while (t.length > 0 && ctx.measureText(t).width > maxWidth) {
    t = t.slice(0, -1);
  }
  if (t.length < text.length && t.length > 1) {
    t = t.slice(0, -1) + '…';
  }
  ctx.fillText(t, x, y);
}
