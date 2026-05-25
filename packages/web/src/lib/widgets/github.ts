import type { Widget } from '../widgets';
import {
  PALETTE,
  clearFrame,
  drawErrorState,
  drawLoadingState,
  drawTag,
  wrapText,
} from '../widgets';
import { drawOctocat } from '../widget-icons';
import { loadConfig } from '../widget-config';

interface GithubConfig {
  token?: string;
}

interface GithubData {
  totalUnread: number;
  reasons: Record<string, number>;
  newest?: {
    title: string;
    repo: string;
    reason: string;
  };
  fetchedAt: number;
  hasToken: boolean;
}

const CONFIG_ID = 'github';

interface GithubNotification {
  reason?: string;
  unread?: boolean;
  subject?: { title?: string };
  repository?: { full_name?: string };
}

export const GITHUB_WIDGET: Widget<GithubData> = {
  id: 'github',
  name: 'GitHub Notifs',
  description: 'Your unread GitHub notifications. Refreshes every 5 min.',
  intervalSec: 60 * 5,

  async fetchData(): Promise<GithubData> {
    const cfg = loadConfig<GithubConfig>(CONFIG_ID);
    const token = cfg?.token;
    if (!token) {
      throw new Error('NO TOKEN — ADD IN SETTINGS');
    }
    const r = await fetch('https://api.github.com/notifications?all=false&per_page=50', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (r.status === 401) throw new Error('TOKEN REJECTED — CHECK SETTINGS');
    if (!r.ok) throw new Error(`GITHUB ${r.status}`);
    const list = (await r.json()) as GithubNotification[];
    const reasons: Record<string, number> = {};
    let total = 0;
    for (const n of list) {
      if (n.unread === false) continue;
      total++;
      const reason = (n.reason ?? 'other').toUpperCase();
      reasons[reason] = (reasons[reason] ?? 0) + 1;
    }
    const newestNotif = list.find((n) => n.unread !== false);
    let newest: GithubData['newest'];
    if (newestNotif) {
      newest = {
        title: newestNotif.subject?.title ?? '—',
        repo: newestNotif.repository?.full_name ?? '',
        reason: (newestNotif.reason ?? 'other').toUpperCase(),
      };
    }
    const result: GithubData = {
      totalUnread: total,
      reasons,
      fetchedAt: Date.now(),
      hasToken: true,
    };
    if (newest !== undefined) result.newest = newest;
    return result;
  },

  render(ctx, w, h, state) {
    if (state.status === 'loading' || state.status === 'idle') {
      drawLoadingState(ctx, w, h, 'GITHUB…');
      return;
    }
    if (state.status === 'error') {
      drawErrorState(ctx, w, h, 'GITHUB', state.message);
      return;
    }
    const d = state.data;
    clearFrame(ctx, w, h);

    drawTag(ctx, 'GITHUB', 10, 8);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('NOTIFS', w - 10, 8);

    // Octocat silhouette + unread count, side-by-side
    drawOctocat(ctx, 32, 60, 22, PALETTE.phosphor);

    ctx.fillStyle = PALETTE.phosphor;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${d.totalUnread >= 100 ? 56 : 72}px monospace`;
    ctx.fillText(String(d.totalUnread), w - 14, 60);

    ctx.fillStyle = PALETTE.dim;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(d.totalUnread === 1 ? 'UNREAD' : 'UNREAD', w - 14, 100);

    // Reason breakdown
    let y = 124;
    const sorted = Object.entries(d.reasons)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    ctx.fillStyle = PALETTE.phosphorDim;
    ctx.fillRect(10, y - 4, w - 20, 1);
    ctx.fillStyle = PALETTE.white;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    for (const [reason, count] of sorted) {
      ctx.fillStyle = PALETTE.dim;
      ctx.fillText(reason.slice(0, 10), 14, y);
      ctx.fillStyle = PALETTE.phosphor;
      ctx.textAlign = 'right';
      ctx.fillText(String(count), w - 14, y);
      ctx.textAlign = 'left';
      y += 16;
    }

    // Newest notification at bottom
    if (d.newest) {
      ctx.fillStyle = PALETTE.phosphorDim;
      ctx.fillRect(10, h - 56, w - 20, 1);
      ctx.fillStyle = PALETTE.dim;
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(d.newest.reason.slice(0, 14), 14, h - 50);
      ctx.fillStyle = PALETTE.white;
      ctx.font = 'bold 11px monospace';
      const lines = wrapText(ctx, d.newest.title, w - 24).slice(0, 3);
      let ly = h - 38;
      for (const line of lines) {
        ctx.fillText(line, 14, ly);
        ly += 13;
      }
    }
  },
};

export type { GithubConfig };
export { CONFIG_ID as GITHUB_CONFIG_ID };
