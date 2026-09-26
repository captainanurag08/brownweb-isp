import { useState } from 'react';
import { useStore } from '../../state/store';

export function FirstRunScreen() {
  const { device, completeFirstRun } = useStore();
  const [busy, setBusy] = useState(false);

  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="panel" style={{ width: 420, padding: 40, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--text-muted)', letterSpacing: 0.3 }}>
          Welcome to
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginTop: 4 }}>
          ANURAG VIRTUAL COMPUTER
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 16 }}>
          Your private virtual computer is ready.
        </p>

        <div className="panel" style={{ textAlign: 'left', padding: 16, marginTop: 20, background: 'var(--surface-raised)' }}>
          <Row label="Device" value={device?.name ?? 'ANURAG-PC'} mono />
          <Row label="Browser" value="Chromium (remote)" />
          <Row label="Storage" value="0 MB used" />
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', marginTop: 24 }}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await completeFirstRun();
          }}
        >
          {busy ? 'Starting…' : 'Start computer'}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className={mono ? 'mono' : undefined}>{value}</span>
    </div>
  );
}
