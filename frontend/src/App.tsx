import { useEffect } from 'react';
import { useStore } from './state/store';
import { LoginScreen } from './components/Login/LoginScreen';
import { FirstRunScreen } from './components/FirstRun/FirstRunScreen';
import { DeviceShell } from './components/Shell/DeviceShell';

export default function App() {
  const { status, checkAuth } = useStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (status === 'loading') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        Starting virtual computer…
      </div>
    );
  }
  if (status === 'unauthenticated') return <LoginScreen />;
  if (status === 'first-run') return <FirstRunScreen />;
  return <DeviceShell />;
}
