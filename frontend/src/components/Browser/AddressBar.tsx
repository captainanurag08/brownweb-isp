import { useEffect, useState } from 'react';
import { useStore } from '../../state/store';
import { browserSocket } from '../../services/websocket';
import { Icon } from '../icons/Icon';

export function AddressBar() {
  const { tabs, activeTabId, navigate } = useStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const [value, setValue] = useState(activeTab?.url ?? '');

  useEffect(() => {
    setValue(activeTab?.url ?? '');
  }, [activeTab?.url]);

  const isHttps = value.startsWith('https://');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
      <IconButton icon="back" onClick={() => activeTabId && browserSocket.send({ type: 'tab.back', tabId: activeTabId })} />
      <IconButton icon="forward" onClick={() => activeTabId && browserSocket.send({ type: 'tab.forward', tabId: activeTabId })} />
      <IconButton icon="reload" onClick={() => activeTabId && browserSocket.send({ type: 'tab.reload', tabId: activeTabId })} />

      <form
        style={{ flex: 1, display: 'flex' }}
        onSubmit={(e) => {
          e.preventDefault();
          if (activeTabId) navigate(activeTabId, value);
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 10px' }}>
          <span style={{ color: isHttps ? 'var(--status-online)' : 'var(--text-muted)' }}>
            <Icon name="shield" size={13} />
          </span>
          <input
            className="mono"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{ flex: 1, background: 'transparent', border: 'none', padding: '9px 0', fontSize: 13 }}
            placeholder="Search or enter URL"
          />
        </div>
      </form>
    </div>
  );
}

function IconButton({ icon, onClick }: { icon: 'back' | 'forward' | 'reload'; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: 8, color: 'var(--text-muted)', display: 'flex', borderRadius: 6 }}>
      <Icon name={icon} size={16} />
    </button>
  );
}
