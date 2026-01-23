export function sumMetrics(data: any[], metric: 'impressions' | 'clicks'): number {
  if (!Array.isArray(data) || data.length === 0) return 0;

  return data.reduce((sum, item) => {
    const value = item[metric];
    if (value === null || value === undefined) return sum;
    const numValue = typeof value === 'number' ? value : parseFloat(String(value));
    return sum + (isNaN(numValue) ? 0 : Math.round(numValue));
  }, 0);
}

export interface TrendResult {
  value: number;
  trend: 'up' | 'down' | 'neutral';
  isInfinity: boolean;
}

export function calculateTrend(current: number = 0, previous: number = 0): TrendResult {
  const curr = current || 0;
  const prev = previous || 0;

  if (prev === 0) {
    if (curr === 0) {
      return { value: 0, trend: 'neutral', isInfinity: false };
    }
    return { value: 0, trend: curr > 0 ? 'up' : 'down', isInfinity: true };
  }

  const percentChange = ((curr - prev) / prev) * 100;

  return {
    value: Math.round(Math.abs(percentChange)),
    trend: percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'neutral',
    isInfinity: false,
  };
}

export interface PageMetric {
  keys: string[];
  clicks: number;
  impressions: number;
  position?: number;
}

export interface ContentGroup {
  group: string;
  displayName: string;
  impressions: number;
  clicks: number;
  position?: number;
}

function extractFirstPath(url: string): string | null {
  try {
    let cleanUrl = url.trim();

    if (cleanUrl.startsWith('sc-domain:')) {
      cleanUrl = cleanUrl.replace('sc-domain:', '');
    }

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('/')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    if (cleanUrl.startsWith('/')) {
      if (cleanUrl === '/') return null;

      const parts = cleanUrl.split('/').filter(Boolean);
      return parts.length > 0 ? `/${parts[0]}` : null;
    }

    const urlObj = new URL(cleanUrl);
    const pathname = urlObj.pathname;

    if (pathname === '/' || pathname === '') return null;

    const parts = pathname.split('/').filter(Boolean);
    return parts.length > 0 ? `/${parts[0]}` : null;
  } catch (error) {
    return null;
  }
}

function capitalizeGroupName(path: string): string {
  const cleaned = path.replace(/^\//, '').replace(/[-_]/g, ' ');
  return cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function groupPagesByPath(pages: PageMetric[]): ContentGroup[] {
  if (!Array.isArray(pages) || pages.length === 0) return [];

  const groupMap = new Map<string, {
    group: string;
    displayName: string;
    impressions: number;
    clicks: number;
    positionSum: number;
    positionCount: number;
  }>();

  for (const page of pages) {
    const url = page.keys?.[0];
    if (!url) continue;

    const firstPath = extractFirstPath(url);
    if (!firstPath) continue;

    // Parse values safely to handle string or number inputs
    const impressions = typeof page.impressions === 'number'
      ? Math.round(page.impressions)
      : parseInt(String(page.impressions), 10) || 0;
    const clicks = typeof page.clicks === 'number'
      ? Math.round(page.clicks)
      : parseInt(String(page.clicks), 10) || 0;
    const position = typeof page.position === 'number'
      ? page.position
      : parseFloat(String(page.position)) || 0;

    const existing = groupMap.get(firstPath);

    if (existing) {
      existing.impressions += impressions;
      existing.clicks += clicks;
      if (position > 0) {
        existing.positionSum += position;
        existing.positionCount += 1;
      }
    } else {
      groupMap.set(firstPath, {
        group: firstPath,
        displayName: capitalizeGroupName(firstPath),
        impressions: impressions,
        clicks: clicks,
        positionSum: position > 0 ? position : 0,
        positionCount: position > 0 ? 1 : 0,
      });
    }
  }

  // Convert to final format with averaged position
  const results: ContentGroup[] = [];
  for (const item of groupMap.values()) {
    results.push({
      group: item.group,
      displayName: item.displayName,
      impressions: item.impressions,
      clicks: item.clicks,
      position: item.positionCount > 0
        ? Math.round((item.positionSum / item.positionCount) * 10) / 10
        : undefined,
    });
  }

  return results.sort((a, b) => b.impressions - a.impressions);
}
