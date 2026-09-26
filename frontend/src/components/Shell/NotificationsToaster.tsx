import { useStore } from '../../state/store';
import { Icon } from '../icons/Icon';

export function NotificationsToaster() {
  const { toasts, dismissToast } = useStore();

  return (
    <div style={{ position: 'absolute', top: 56, right: 16, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 60, width: 300 }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className="panel"
          style={{
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            borderColor: t.tone === 'danger' ? 'var(--status-danger)' : 'var(--border)',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</div>
            {t.body && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{t.body}</div>}
          </div>
          <button onClick={() => dismissToast(t.id)} style={{ color: 'var(--text-muted)' }}>
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
