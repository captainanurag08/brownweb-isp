import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../state/store';
import { BrowserTabs } from './BrowserTabs';
import { AddressBar } from './AddressBar';
import { BrowserView } from './BrowserView';
import { Icon } from '../icons/Icon';

export function BrowserApp() {
  const { tabs, activeTabId, newTab, wsStatus, sessionId } = useStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(true); // start muted: browsers reliably allow this, and unmuting is a click away

  useEffect(() => {
    if (wsStatus === 'open' && tabs.length === 0) {
      newTab();
    }
  }, [wsStatus, tabs.length, newTab]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !sessionId) return;
    audio.src = `/api/browser/audio?session=${sessionId}`;
    audio.muted = muted;
    audio.play().catch(() => {
      /* blocked until a click - the mute button click below always works */
    });
  }, [sessionId, muted]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <audio ref={audioRef} hidden />
      <BrowserTabs />
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <AddressBar />
        </div>
        <button
          onClick={() => setMuted((m) => !m)}
          title={muted ? 'Unmute tab audio' : 'Mute tab audio'}
          style={{
            padding: '0 14px',
            color: muted ? 'var(--text-muted)' : 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            borderLeft: '1px solid var(--border)',
          }}
        >
          <Icon name={muted ? 'volumeOff' : 'volumeOn'} size={16} />
        </button>
      </div>
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
