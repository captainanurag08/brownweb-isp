import { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';
import { Icon } from '../icons/Icon';

interface FileRow {
  id: string;
  name: string;
  size_bytes: number;
  mime_type: string | null;
  source: string;
  created_at: string;
}
interface FolderRow {
  id: string;
  name: string;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function FilesApp() {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [usage, setUsage] = useState({ usedBytes: 0, quotaBytes: 1 });
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<{ files: FileRow[]; folders: FolderRow[]; storage: typeof usage }>('/files');
      setFiles(data.files);
      setFolders(data.folders);
      setUsage(data.storage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function upload(fileList: FileList | null) {
    if (!fileList?.length) return;
    const form = new FormData();
    form.append('file', fileList[0]);
    await api.upload('/files/upload', form);
    load();
  }

  async function remove(id: string) {
    await api.delete(`/files/${id}`);
    load();
  }

  const pct = Math.min(100, (usage.usedBytes / usage.quotaBytes) * 100);

  return (
    <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>Files</div>
        <button className="btn btn-primary" onClick={() => inputRef.current?.click()}>
          <Icon name="plus" size={14} /> Upload
        </button>
        <input ref={inputRef} type="file" hidden onChange={(e) => upload(e.target.files)} />
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
        {formatBytes(usage.usedBytes)} of {formatBytes(usage.quotaBytes)} used
      </div>
      <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, marginTop: 6, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)' }} />
      </div>

      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : files.length === 0 && folders.length === 0 ? (
        <div className="empty-state">
          <strong>Nothing here yet</strong>
          <span>Files you upload, or that you download inside the browser, show up here.</span>
        </div>
      ) : (
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {folders.map((f) => (
            <div key={f.id} className="panel" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="folder" size={16} />
              <span style={{ fontSize: 13 }}>{f.name}</span>
            </div>
          ))}
          {files.map((f) => (
            <div key={f.id} className="panel" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name={f.source === 'download' ? 'download' : 'files'} size={16} />
              <span style={{ fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatBytes(f.size_bytes)}</span>
              <a href={`/api/files/${f.id}/download`} className="btn btn-secondary" style={{ padding: '6px 10px' }}>
                <Icon name="download" size={13} />
              </a>
              <button onClick={() => remove(f.id)} style={{ color: 'var(--status-danger)' }}>
                <Icon name="trash" size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
