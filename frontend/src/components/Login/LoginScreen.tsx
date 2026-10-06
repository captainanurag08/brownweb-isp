```tsx
import { useState } from 'react';
import { useStore } from '../../state/store';
import { ApiError } from '../../services/api';
import { Icon } from '../icons/Icon';

export function LoginScreen() {
  const { login, register } = useStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Something went wrong. Try again.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        className="panel"
        style={{
          width: 380,
          padding: 32,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--accent)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--accent-contrast)',
            }}
          >
            <Icon name="browser" size={20} />
          </div>

          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              ANURAG VIRTUAL COMPUTER
            </div>

            <div
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
              }}
            >
              Your machine, running elsewhere
            </div>
          </div>
        </div>

        {/* Login / Register form */}
        <form
          onSubmit={submit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <input
            className="field"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />

          <input
            className="field"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={
              mode === 'login'
                ? 'current-password'
                : 'new-password'
            }
            minLength={mode === 'register' ? 10 : undefined}
            required
          />

          {error && (
            <div
              style={{
                color: 'var(--status-danger)',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={busy}
            style={{
              justifyContent: 'center',
              marginTop: 4,
            }}
          >
            {busy
              ? 'Please wait…'
              : mode === 'login'
                ? 'Log in'
                : 'Create account'}
          </button>
        </form>

        {/* Login/Register switch */}
        <button
          onClick={() =>
            setMode(mode === 'login' ? 'register' : 'login')
          }
          style={{
            marginTop: 18,
            fontSize: 13,
            color: 'var(--text-muted)',
            width: '100%',
            textAlign: 'center',
          }}
        >
          {mode === 'login'
            ? "Don't have an account? Create one"
            : 'Already have an account? Log in'}
        </button>

        {/* Forgot password message */}
        {mode === 'login' && (
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}
          >
            Forgot password isn't wired up in this build yet.
          </div>
        )}

        {/* START SERVER */}
        <div
          style={{
            marginTop: 24,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <a
            href="https://YOUR-SERVER-SITE.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bw-start-server"
          >
            <span className="bw-server-icon">
              <span className="bw-server-orbit bw-orbit-one" />
              <span className="bw-server-orbit bw-orbit-two" />
              <span className="bw-server-core" />
            </span>

            <span className="bw-server-content">
              <span className="bw-server-title">
                START SERVER
              </span>

              <span className="bw-server-subtitle">
                <span className="bw-server-dot" />
                Launch Virtual Server
              </span>
            </span>

            <span className="bw-server-arrow">
              ↗
            </span>
          </a>
        </div>

        {/* Button CSS */}
        <style>
          {`
            .bw-start-server {
              --server-accent: #6ee7ff;
              --server-purple: #8b5cf6;

              position: relative;
              display: inline-flex;
              align-items: center;
              gap: 12px;

              width: 100%;
              min-width: 0;
              padding: 13px 15px;

              box-sizing: border-box;

              color: var(--text, #fff);
              text-decoration: none;
              font-family: inherit;

              background:
                linear-gradient(
                  135deg,
                  rgba(255, 255, 255, 0.09),
                  rgba(255, 255, 255, 0.025)
                );

              border: 1px solid
                rgba(110, 231, 255, 0.25);

              border-radius: 14px;

              box-shadow:
                inset 0 1px 0
                  rgba(255, 255, 255, 0.1),
                0 8px 24px
                  rgba(0, 0, 0, 0.2);

              backdrop-filter: blur(16px);
              -webkit-backdrop-filter: blur(16px);

              overflow: hidden;
              isolation: isolate;

              transform:
                perspective(700px)
                translateZ(0);

              transition:
                transform 0.25s ease,
                border-color 0.25s ease,
                box-shadow 0.25s ease;
            }

            .bw-start-server::before {
              content: "";
              position: absolute;
              inset: -120%;

              background: linear-gradient(
                110deg,
                transparent 35%,
                rgba(110, 231, 255, 0.1) 48%,
                rgba(139, 92, 246, 0.1) 52%,
                transparent 65%
              );

              transform: translateX(-30%);
              transition: transform 0.7s ease;

              z-index: -1;
```
