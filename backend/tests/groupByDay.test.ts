import { describe, it, expect } from 'vitest';
import { groupByDay, searchHistory, type HistoryEntry } from '../src/history/groupByDay';

const now = new Date('2026-06-15T12:00:00');

function entry(id: string, isoDate: string, url = 'https://example.com', title = 'Example'): HistoryEntry {
  return { id, url, title, visited_at: isoDate };
}

describe('groupByDay', () => {
  it('groups today, yesterday, and older entries into separate buckets', () => {
    const entries = [
      entry('1', '2026-06-15T10:00:00'),
      entry('2', '2026-06-15T09:00:00'),
      entry('3', '2026-06-14T22:00:00'),
      entry('4', '2026-06-01T08:00:00'),
    ];
    const groups = groupByDay(entries, now);
    expect(groups.map((g) => g.label)).toEqual(['Today', 'Yesterday', expect.any(String)]);
    expect(groups[0].entries).toHaveLength(2);
  });

  it('returns an empty array for no entries', () => {
    expect(groupByDay([], now)).toEqual([]);
  });
});

describe('searchHistory', () => {
  const entries = [
    entry('1', '2026-06-15T10:00:00', 'https://youtube.com/watch?v=1', 'Cats compilation'),
    entry('2', '2026-06-15T09:00:00', 'https://github.com/foo/bar', 'foo/bar: A project'),
  ];

  it('matches by title case-insensitively', () => {
    expect(searchHistory(entries, 'CATS')).toHaveLength(1);
  });

  it('matches by url', () => {
    expect(searchHistory(entries, 'github')).toHaveLength(1);
  });

  it('returns everything for an empty query', () => {
    expect(searchHistory(entries, '')).toHaveLength(2);
  });
});
