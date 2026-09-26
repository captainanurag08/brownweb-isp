import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useStore } from '../../state/store';
import { Icon } from '../icons/Icon';

interface Bookmark {
  id: string;
  title: string;
  url: string;
}

export function BookmarksApp() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const { setCurrentApp, newTab } = useStore();

  async function load() {
    const data = await api.get<{ bookmarks: Bookmark[] }>('/bookmarks');
    setBookmarks(data.bookmarks);
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !url) return;
    await api.post('/bookmarks', { title, url });
    setTitle('');
    setUrl('');
    load();
  }

  async function remove(id: string) {
    await api.delete(`/bookmarks/${id}`);
    load();
  }

  function open(u: string) {
    setCurrentApp('browser');
    newTab(u);
  }

  return (
    <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>Bookmarks</div>

      <form onSubmit={add} style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <input className="field" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="field" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button className="btn btn-primary" type="submit">
          <Icon name="plus" size={14} />
        </button>
      </form>

      {bookmarks.length === 0 ? (
        <div className="empty-state">
          <strong>No bookmarks yet</strong>
          <span>Save pages here so you can get back to them quickly.</span>
        </div>
      ) : (
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {bookmarks.map((b) => (
            <div key={b.id} className="panel" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="star" size={15} />
              <button onClick={() => open(b.url)} style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.url}
                </div>
              </button>
              <button onClick={() => remove(b.id)} style={{ color: 'var(--text-muted)' }}>
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
