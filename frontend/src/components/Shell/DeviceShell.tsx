import { useEffect, useRef } from 'react';
import { useStore } from '../../state/store';
import { StatusBar } from './StatusBar';
import { Dock } from './Dock';
import { LockScreen } from './LockScreen';
import { NotificationsToaster } from './NotificationsToaster';
import { AppLauncher } from './AppLauncher';
import { BrowserApp } from '../Browser/BrowserApp';
import { FilesApp } from '../Files/FilesApp';
import { HistoryApp } from '../History/HistoryApp';
import { BookmarksApp } from '../Bookmarks/BookmarksApp';
import { NotesApp } from '../Notes/NotesApp';
import { SettingsApp } from '../Settings/SettingsApp';

export function DeviceShell() {
  const { currentApp, locked, lock, device, deviceSettings } = useStore();
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const minutes = deviceSettings?.auto_lock_minutes ?? 15;
    if (!device?.pin_hash || minutes <= 0) return;

    function reset() {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(lock, minutes * 60_000);
    }
    reset();
    const events = ['mousemove', 'keydown', 'pointerdown', 'wheel'];
    events.forEach((e) => window.addEventListener(e, reset));
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [device?.pin_hash, deviceSettings?.auto_lock_minutes, lock]);

  useEffect(() => {
    if (device?.theme && device.theme !== 'system') {
      document.documentElement.dataset.theme = device.theme;
    }
  }, [device?.theme]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <StatusBar />
      <div className="shell-body">
        <div className="shell-content">
          {currentApp === 'home' && <AppLauncher />}
          {currentApp === 'browser' && <BrowserApp />}
          {currentApp === 'files' && <FilesApp />}
          {currentApp === 'history' && <HistoryApp />}
          {currentApp === 'bookmarks' && <BookmarksApp />}
          {currentApp === 'notes' && <NotesApp />}
          {currentApp === 'settings' && <SettingsApp />}
        </div>
        <Dock />
      </div>
      <NotificationsToaster />
      {locked && <LockScreen />}
    </div>
  );
}
