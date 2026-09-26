import { useState } from 'react';
import { useStore } from '../../state/store';
import { api } from '../../services/api';
import { Icon } from '../icons/Icon';

export function LockScreen() {
  const { device, unlock } = useStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const { ok } = await api.post<{ ok: boolean }>('/device/lock/verify', { pin });
      if (ok) unlock();
      else setError(true);
    } finally {
      setBusy(false);
      setPin('');
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'var(--bg)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
      }}
    >
      <div className="mono" style={{ fontSize: 32 }}>
        {new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{device?.name}</div>
      <div style={{ width: 44, height: 44, borderRadius: 99, background: 'var(--surface-raised)', display: 'grid', placeItems: 'center' }}>
        <Icon name="lock" />
      </div>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8 }}>
        <input
          className="field"
          style={{ width: 160, textAlign: 'center', letterSpacing: 4 }}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          type="password"
          inputMode="numeric"
          placeholder="Enter PIN"
          autoFocus
        />
        <button className="btn btn-primary" type="submit" disabled={busy || !pin}>
          Unlock
        </button>
      </form>
      {error && <div style={{ color: 'var(--status-danger)', fontSize: 13 }}>Incorrect PIN.</div>}
    </div>
  );
}
