export interface HistoryEntry {
  id: string;
  url: string;
  title: string | null;
  visited_at: string | Date;
}

export interface HistoryGroup {
  label: string;
  entries: HistoryEntry[];
}

function dayLabel(date: Date, now: Date): string {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return date.toLocaleDateString(undefined, { weekday: 'long' });
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

/** Groups already-sorted-descending history entries into day buckets, newest first. */
export function groupByDay(entries: HistoryEntry[], now: Date = new Date()): HistoryGroup[] {
  const groups: HistoryGroup[] = [];
  let currentLabel: string | null = null;
  let currentGroup: HistoryGroup | null = null;

  for (const entry of entries) {
    const visitedAt = entry.visited_at instanceof Date ? entry.visited_at : new Date(entry.visited_at);
    const label = dayLabel(visitedAt, now);
    if (label !== currentLabel) {
      currentLabel = label;
      currentGroup = { label, entries: [] };
      groups.push(currentGroup);
    }
    currentGroup!.entries.push(entry);
  }
  return groups;
}

/** Case-insensitive filter over URL and title, used by the history search box. */
export function searchHistory(entries: HistoryEntry[], query: string): HistoryEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter((e) => e.url.toLowerCase().includes(q) || (e.title ?? '').toLowerCase().includes(q));
}
