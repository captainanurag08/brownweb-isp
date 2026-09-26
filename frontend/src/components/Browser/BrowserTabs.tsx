import { useStore } from '../../state/store';
import { Icon } from '../icons/Icon';

export function BrowserTabs() {
  const { tabs, activeTabId, switchTab, closeTab, newTab } = useStore();

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', background: 'var(--surface)', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
      {tabs.map((tab) => {
        const active = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              minWidth: 140,
              maxWidth: 200,
              borderRight: '1px solid var(--border)',
              background: active ? 'var(--bg)' : 'transparent',
              borderTop: active ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {tab.favicon ? (
              <img src={tab.favicon} width={14} height={14} alt="" />
            ) : (
              <Icon name="browser" size={14} />
            )}
            <span style={{ fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
              {tab.title || 'New Tab'}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              style={{ color: 'var(--text-muted)', display: 'flex' }}
            >
              <Icon name="close" size={12} />
            </button>
          </div>
        );
      })}
      <button onClick={() => newTab()} title="New tab" style={{ padding: '0 14px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}
