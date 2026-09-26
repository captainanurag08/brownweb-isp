import { useEffect } from 'react';
import { useStore } from '../../state/store';
import { BrowserTabs } from './BrowserTabs';
import { AddressBar } from './AddressBar';
import { BrowserView } from './BrowserView';

export function BrowserApp() {
  const { tabs, activeTabId, newTab, wsStatus } = useStore();

  useEffect(() => {
    if (wsStatus === 'open' && tabs.length === 0) {
      newTab();
    }
  }, [wsStatus, tabs.length, newTab]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <BrowserTabs />
      <AddressBar />
      <div style={{ flex: 1, minHeight: 0 }}>
        {activeTabId ? (
          <BrowserView tabId={activeTabId} />
        ) : (
          <div className="empty-state">
            <strong>{wsStatus === 'open' ? 'Opening a tab…' : 'Connecting to your remote browser…'}</strong>
            <span>The remote Chromium instance runs on the server, not on this device.</span>
          </div>
        )}
      </div>
    </div>
  );
}
