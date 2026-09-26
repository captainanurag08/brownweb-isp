import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Icon } from '../icons/Icon';

interface HistoryEntry {
  id: string;
  url: string;
  title: string | null;
  visited_at: string;
}
interface HistoryGroup {
  label: string;
  entries: HistoryEntry[];
}

export function HistoryApp() {
  const [groups, setGroups] = useState<HistoryGroup[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  async function load(query = '') {
    setLoading(true);
    try {
      const data = await api.get<{ groups: HistoryGroup[] }>(`/history${query ? `?q=${encodeURIComponent(query)}` : ''}`);
      setGroups(data.groups);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function removeOne(id: string) {
    await api.delete(`/history/${id}`);
    load(q);
  }

  async function clearAll() {
    if (!confirm('Clear all browsing history? This only affects the history ANURAG VIRTUAL COMPUTER keeps for you.')) return;
    await api.delete('/history');
    load(q);
  }

  return (
    <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>History</div>
        <button className="btn btn-danger" onClick={clearAll}>
          Clear all
        </button>
      </div>
      <input
        className="field"
        style={{ marginTop: 14 }}
        placeholder="Search history"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          load(e.target.value);
        }}
      />

      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : groups.length === 0 ? (
        <div className="empty-state">
          <strong>No history yet</strong>
          <span>Pages you visit in the remote browser will show up here, grouped by day.</span>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.label} style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>{group.label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {group.entries.map((entry) => (
                <div key={entry.id} className="panel" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', width: 42, flexShrink: 0 }}>
                    {new Date(entry.visited_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.title || entry.url}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.url}
                    </div>
                  </div>
                  <button onClick={() => removeOne(entry.id)} style={{ color: 'var(--text-muted)' }}>
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
