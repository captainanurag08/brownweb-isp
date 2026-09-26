import { useEffect, useState } from 'react';
import { useStore } from '../../state/store';
import { Icon } from '../icons/Icon';

export function StatusBar() {
  const { device, wsStatus, lock } = useStore();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);

  const statusColor = wsStatus === 'open' ? 'var(--status-online)' : wsStatus === 'connecting' ? 'var(--accent)' : 'var(--status-danger)';
  const statusLabel = wsStatus === 'open' ? 'Connected' : wsStatus === 'connecting' ? 'Connecting…' : 'Disconnected';

  return (
    <div
      style={{
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
        <span className="mono" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
          {device?.device_code}
        </span>
        <span>{device?.name}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }} title={statusLabel}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: statusColor }} />
          {statusLabel}
        </div>
        <span className="mono" style={{ fontSize: 13 }}>
          {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
        </span>
        <button onClick={lock} title="Lock device" style={{ color: 'var(--text-muted)', display: 'flex' }}>
          <Icon name="lock" size={16} />
        </button>
      </div>
    </div>
  );
}
