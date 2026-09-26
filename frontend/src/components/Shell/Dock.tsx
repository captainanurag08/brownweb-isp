import { useStore } from '../../state/store';
import { Icon, type IconName } from '../icons/Icon';
import type { AppId } from '../../types';

const items: { id: AppId; icon: IconName; label: string }[] = [
  { id: 'home', icon: 'home', label: 'Home' },
  { id: 'browser', icon: 'browser', label: 'Browser' },
  { id: 'files', icon: 'files', label: 'Files' },
  { id: 'history', icon: 'history', label: 'History' },
  { id: 'bookmarks', icon: 'bookmarks', label: 'Bookmarks' },
  { id: 'notes', icon: 'notes', label: 'Notes' },
  { id: 'settings', icon: 'settings', label: 'Settings' },
];

export function Dock() {
  const { currentApp, setCurrentApp } = useStore();

  return (
    <nav className="dock">
      {items.map((item) => {
        const active = currentApp === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setCurrentApp(item.id)}
            title={item.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '10px 6px',
              borderRadius: 10,
              color: active ? 'var(--accent)' : 'var(--text-muted)',
              background: active ? 'rgba(232,163,61,0.12)' : 'transparent',
              flex: '1 1 0',
            }}
          >
            <Icon name={item.icon} size={20} />
            <span style={{ fontSize: 10, fontWeight: 600 }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
