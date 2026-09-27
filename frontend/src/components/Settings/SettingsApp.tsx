import { useEffect, useState } from 'react';
import { useStore } from '../../state/store';
import { api } from '../../services/api';
import { Icon } from '../icons/Icon';

interface SecurityStatus {
  browserIsolation: { active: boolean; detail: string };
  https: { active: boolean; detail: string };
  secureSessionCookie: { active: boolean; detail: string };
  privateProfile: { active: boolean; detail: string };
  passwordProtection: { active: boolean; detail: string };
  devicePinSet: { active: boolean; detail: string };
  activeSessionCount: number;
}
interface ActiveSession {
  id: string;
  isCurrent: boolean;
  meta: { userAgent: string; ip: string; lastSeenAt: string };
}

export function SettingsApp() {
  const { device, updateDevice, logout } = useStore();
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [pin, setPin] = useState('');

  async function loadSecurity() {
    const [s, sess] = await Promise.all([
      api.get<SecurityStatus>('/security/status'),
      api.get<{ sessions: ActiveSession[] }>('/security/sessions'),
    ]);
    setStatus(s);
    setSessions(sess.sessions);
  }
  useEffect(() => {
    loadSecurity();
  }, []);

  async function destroySession() {
    if (!confirm('Destroy this virtual browser? This permanently removes history, cookies, cache, and profile data for the current session. This cannot be undone.')) return;
    await api.delete('/browser/session').catch(() => undefined);
    location.reload();
  }

  async function setDevicePin() {
    if (pin.length < 4) return;
    await api.post('/device/lock/set-pin', { pin });
    setPin('');
    loadSecurity();
  }

  async function revoke(id: string) {
    await api.delete(`/security/sessions/${id}`);
    loadSecurity();
  }

  if (!device) return null;

  return (
    <div style={{ padding: 24, height: '100%', overflowY: 'auto', maxWidth: 640 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Settings</div>

      <Section title="Device">
        <Field label="Name">
          <input className="field" defaultValue={device.name} onBlur={(e) => updateDevice({ name: e.target.value })} />
        </Field>
        <Field label="Device ID">
          <span className="mono" style={{ fontSize: 13, color: 'var(--text-muted)' }}>{device.device_code}</span>
        </Field>
      </Section>

      <Section title="Browser">
        <Field label="Homepage">
          <input className="field" defaultValue={device.homepage} onBlur={(e) => updateDevice({ homepage: e.target.value })} />
        </Field>
        <Field label="Search engine">
          <select
            className="field"
            defaultValue={device.search_engine}
            onChange={(e) => updateDevice({ searchEngine: e.target.value as 'google' | 'bing' | 'duckduckgo' })}
          >
            <option value="google">Google</option>
            <option value="bing">Bing</option>
            <option value="duckduckgo">DuckDuckGo</option>
          </select>
        </Field>
      </Section>

      <Section title="Appearance">
        <Field label="Theme">
          <select
            className="field"
            defaultValue={device.theme}
            onChange={(e) => {
              const theme = e.target.value as 'system' | 'light' | 'dark';
              updateDevice({ theme });
              document.documentElement.dataset.theme = theme === 'system' ? '' : theme;
            }}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </Field>
      </Section>

      <Section title="Privacy">
        <Field label="Session mode">
          <select
            className="field"
            defaultValue={device.session_mode}
            onChange={(e) => updateDevice({ sessionMode: e.target.value as 'persistent' | 'private' })}
          >
            <option value="persistent">Persistent — profile and tabs survive logout</option>
            <option value="private">Private — everything is wiped when the session ends</option>
          </select>
        </Field>
        <div className="empty-state" style={{ padding: 0, marginTop: 8 }}>
          <span style={{ fontSize: 12 }}>
            This clears the browsing history ANURAG VIRTUAL COMPUTER keeps for you. It does not remove any
            record that Google, YouTube, or other sites keep on their own servers.
          </span>
        </div>
      </Section>

      <Section title="Security">
        {status && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            <StatusRow label="Browser isolation" ok={status.browserIsolation.active} detail={status.browserIsolation.detail} />
            <StatusRow label="HTTPS" ok={status.https.active} detail={status.https.detail} />
            <StatusRow label="Secure session cookie" ok={status.secureSessionCookie.active} detail={status.secureSessionCookie.detail} />
            <StatusRow label="Private profile" ok={status.privateProfile.active} detail={status.privateProfile.detail} />
            <StatusRow label="Password protection" ok={status.passwordProtection.active} detail={status.passwordProtection.detail} />
            <StatusRow label="Device PIN" ok={status.devicePinSet.active} detail={status.devicePinSet.detail} />
          </div>
        )}

        <Field label="Set device PIN">
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="field" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="4–12 digits" inputMode="numeric" />
            <button className="btn btn-secondary" onClick={setDevicePin}>Save</button>
          </div>
        </Field>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Active sessions ({sessions.length})</div>
          {sessions.map((s) => (
            <div key={s.id} className="panel" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ flex: 1, fontSize: 12.5 }}>
                {s.meta.userAgent.slice(0, 48)} {s.isCurrent && <span style={{ color: 'var(--status-online)' }}>· this device</span>}
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Last seen {new Date(s.meta.lastSeenAt).toLocaleString()}</div>
              </div>
              {!s.isCurrent && (
                <button className="btn btn-secondary" style={{ padding: '5px 10px' }} onClick={() => revoke(s.id)}>
                  Log out
                </button>
              )}
            </div>
          ))}
        </div>

        <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={logout}>
          Log out this session
        </button>
      </Section>

      <Section title="Danger zone">
        <button className="btn btn-danger" onClick={destroySession}>
          <Icon name="trash" size={14} /> Destroy virtual browser
        </button>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
          Permanently removes history, cookies, cache, localStorage, IndexedDB, and the browser profile for the
          current session. This cannot be undone.
        </div>
      </Section>

      <Section title="About">
        <Field label="Version">
          <span style={{ fontSize: 13 }}>1.0.0</span>
        </Field>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel" style={{ padding: 18, marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
      <span style={{ color: ok ? 'var(--status-online)' : 'var(--status-danger)', width: 14 }}>{ok ? '✓' : '!'}</span>
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{detail}</span>
    </div>
  );
}
