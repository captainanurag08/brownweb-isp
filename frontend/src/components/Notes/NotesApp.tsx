import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Icon } from '../icons/Icon';

interface Note {
  id: string;
  title: string;
  content: string;
  updated_at: string;
}

export function NotesApp() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<Note | null>(null);

  async function load() {
    const data = await api.get<{ notes: Note[] }>('/notes');
    setNotes(data.notes);
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    const { note } = await api.post<{ note: Note }>('/notes', {});
    await load();
    setSelected(note);
  }

  async function save(note: Note) {
    const { note: updated } = await api.patch<{ note: Note }>(`/notes/${note.id}`, { title: note.title, content: note.content });
    setSelected(updated);
    setNotes((n) => n.map((x) => (x.id === updated.id ? updated : x)));
  }

  async function remove(id: string) {
    await api.delete(`/notes/${id}`);
    if (selected?.id === id) setSelected(null);
    load();
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ width: 220, borderRight: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0 }}>
        <div style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Notes</span>
          <button onClick={create} className="btn btn-secondary" style={{ padding: '5px 8px' }}>
            <Icon name="plus" size={13} />
          </button>
        </div>
        {notes.map((n) => (
          <button
            key={n.id}
            onClick={() => setSelected(n)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '10px 14px',
              background: selected?.id === n.id ? 'var(--surface-raised)' : 'transparent',
              fontSize: 13,
            }}
          >
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title || 'Untitled note'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(n.updated_at).toLocaleDateString()}</div>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, padding: 20 }}>
        {selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="field"
                value={selected.title}
                onChange={(e) => setSelected({ ...selected, title: e.target.value })}
                onBlur={() => save(selected)}
              />
              <button className="btn btn-danger" onClick={() => remove(selected.id)}>
                <Icon name="trash" size={14} />
              </button>
            </div>
            <textarea
              className="field"
              style={{ flex: 1, resize: 'none', fontFamily: 'var(--font-body)' }}
              value={selected.content}
              onChange={(e) => setSelected({ ...selected, content: e.target.value })}
              onBlur={() => save(selected)}
            />
          </div>
        ) : (
          <div className="empty-state">
            <strong>No note selected</strong>
            <span>Create a note or pick one from the list.</span>
          </div>
        )}
      </div>
    </div>
  );
}
