import { useStore } from '../../state/store';
import { Icon, type IconName } from '../icons/Icon';
import type { AppId } from '../../types';

export function AppLauncher() {
  const { setCurrentApp, newTab, device } = useStore();

  function openBrowser(url?: string) {
    setCurrentApp('browser');
    if (url) newTab(url);
  }

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>
        {greeting()}, {device?.name ?? 'ANURAG-PC'}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
        {device?.session_mode === 'private' ? 'Private session — nothing here survives shutdown.' : 'Persistent session — your tabs and profile carry over.'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginTop: 24 }}>
        <PrimaryTile icon="browser" title="Browser" subtitle="Open a new tab on your remote Chromium" onClick={() => openBrowser()} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SecondaryTile icon="files" title="Files" onClick={() => setCurrentApp('files')} />
          <SecondaryTile icon="history" title="History" onClick={() => setCurrentApp('history')} />
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600 }}>Quick sites</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <QuickSite label="Google" url="https://www.google.com/" onClick={openBrowser} />
          <QuickSite label="YouTube" url="https://www.youtube.com/" onClick={openBrowser} />
          <QuickSite label="Gmail" url="https://mail.google.com/" onClick={openBrowser} />
          <QuickSite label="Drive" url="https://drive.google.com/" onClick={openBrowser} />
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
        <ListRow icon="bookmarks" label="Bookmarks" onClick={() => setCurrentApp('bookmarks')} />
        <ListRow icon="notes" label="Notes" onClick={() => setCurrentApp('notes')} />
        <ListRow icon="settings" label="Settings" onClick={() => setCurrentApp('settings')} />
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function PrimaryTile({ icon, title, subtitle, onClick }: { icon: IconName; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button className="panel" onClick={onClick} style={{ padding: 22, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 140 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent)', color: 'var(--accent-contrast)', display: 'grid', placeItems: 'center' }}>
        <Icon name={icon} size={22} />
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, marginTop: 4 }}>{title}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{subtitle}</div>
    </button>
  );
}

function SecondaryTile({ icon, title, onClick }: { icon: IconName; title: string; onClick: () => void }) {
  return (
    <button className="panel" onClick={onClick} style={{ padding: 16, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
      <Icon name={icon} size={18} />
      <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
    </button>
  );
}

function QuickSite({ label, url, onClick }: { label: string; url: string; onClick: (url: string) => void }) {
  return (
    <button className="btn btn-secondary" onClick={() => onClick(url)}>
      {label}
    </button>
  );
}

function ListRow({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button className="panel" onClick={onClick} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
      <Icon name={icon} size={16} />
      <span style={{ fontSize: 13 }}>{label}</span>
    </button>
  );
}
