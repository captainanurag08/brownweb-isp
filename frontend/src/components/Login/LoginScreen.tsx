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
    <>
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
          <div className="bw-server-wrapper">
            <a
              href="https://YOUR-SERVER-SITE.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bw-start-server"
            >
              <span className="bw-server-icon">
                <span className="bw-server-orbit bw-orbit-one"></span>
                <span className="bw-server-orbit bw-orbit-two"></span>
                <span className="bw-server-core"></span>
              </span>

              <span className="bw-server-content">
                <span className="bw-server-title">
                  START SERVER
                </span>

                <span className="bw-server-subtitle">
                  <span className="bw-server-dot"></span>
                  Launch Virtual Server
                </span>
              </span>

              <span className="bw-server-arrow">↗</span>
            </a>
          </div>
        </div>
      </div>

      <style>{`
        .bw-server-wrapper {
          width: 100%;
          margin-top: 24px;
          display: flex;
          justify-content: center;
        }

        .bw-start-server {
          --server-accent: #6ee7ff;
          --server-purple: #8b5cf6;

          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;

          width: 100%;
          min-width: 0;
          box-sizing: border-box;

          padding: 13px 15px;

          color: var(--text, #ffffff);
          text-decoration: none;
          font-family: inherit;

          background:
            linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.09),
              rgba(255, 255, 255, 0.025)
            );

          border: 1px solid rgba(110, 231, 255, 0.25);
          border-radius: 14px;

          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            0 8px 24px rgba(0, 0, 0, 0.2);

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

          background:
            linear-gradient(
              110deg,
              transparent 35%,
              rgba(110, 231, 255, 0.1) 48%,
              rgba(139, 92, 246, 0.1) 52%,
              transparent 65%
            );

          transform: translateX(-30%);
          transition: transform 0.7s ease;

          z-index: -1;
        }

        .bw-start-server:hover::before {
          transform: translateX(30%);
        }

        .bw-start-server:hover {
          transform:
            perspective(700px)
            translateY(-3px)
            rotateX(2deg);

          border-color: rgba(110, 231, 255, 0.6);

          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.15),
            0 14px 32px rgba(0, 0, 0, 0.3),
            0 0 24px rgba(110, 231, 255, 0.12);
        }

        .bw-start-server:active {
          transform:
            perspective(700px)
            translateY(1px)
            scale(0.98);
        }

        .bw-server-icon {
          position: relative;

          width: 40px;
          height: 40px;

          flex: 0 0 40px;

          display: grid;
          place-items: center;

          border-radius: 12px;

          background:
            radial-gradient(
              circle at 35% 30%,
              rgba(110, 231, 255, 0.28),
              rgba(139, 92, 246, 0.1) 45%,
              rgba(0, 0, 0, 0.2)
            );

          border: 1px solid rgba(110, 231, 255, 0.28);

          box-shadow:
            inset 0 1px 2px rgba(255, 255, 255, 0.1),
            0 0 16px rgba(110, 231, 255, 0.08);

          transform: translateZ(12px);

          transition: transform 0.3s ease;
        }

        .bw-start-server:hover .bw-server-icon {
          transform:
            translateZ(20px)
            rotateY(-8deg)
            rotateX(5deg);
        }

        .bw-server-core {
          width: 11px;
          height: 11px;

          border-radius: 50%;

          background: var(--server-accent);

          box-shadow:
            0 0 5px var(--server-accent),
            0 0 12px rgba(110, 231, 255, 0.8),
            0 0 22px rgba(110, 231, 255, 0.45);

          animation:
            bw-server-pulse 2s ease-in-out infinite;
        }

        .bw-server-orbit {
          position: absolute;

          width: 32px;
          height: 14px;

          border: 1px solid rgba(110, 231, 255, 0.25);

          border-radius: 50%;
          pointer-events: none;
        }

        .bw-orbit-one {
          transform: rotate(55deg);

          animation:
            bw-orbit-one 4s linear infinite;
        }

        .bw-orbit-two {
          transform: rotate(-55deg);

          border-color: rgba(139, 92, 246, 0.25);

          animation:
            bw-orbit-two 5s linear infinite reverse;
        }

        .bw-server-content {
          display: flex;
          flex-direction: column;
          gap: 4px;

          min-width: 0;
          flex: 1;
        }

        .bw-server-title {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.11em;
          line-height: 1;
        }

        .bw-server-subtitle {
          display: flex;
          align-items: center;
          gap: 6px;

          font-size: 10px;
          font-weight: 500;

          color:
            var(--text-muted, rgba(255, 255, 255, 0.5));

          white-space: nowrap;
        }

        .bw-server-dot {
          width: 5px;
          height: 5px;

          flex: 0 0 5px;

          border-radius: 50%;

          background: var(--server-accent);

          box-shadow:
            0 0 6px var(--server-accent);
        }

        .bw-server-arrow {
          width: 29px;
          height: 29px;

          flex: 0 0 29px;

          display: grid;
          place-items: center;

          border-radius: 8px;

          color:
            var(--text-muted, rgba(255, 255, 255, 0.5));

          background: rgba(255, 255, 255, 0.04);

          border: 1px solid rgba(255, 255, 255, 0.07);

          font-size: 16px;

          transition:
            transform 0.25s ease,
            color 0.25s ease;
        }

        .bw-start-server:hover .bw-server-arrow {
          color: var(--server-accent);

          transform:
            translate(2px, -2px);
        }

        @keyframes bw-server-pulse {
          0%,
          100% {
            transform: scale(0.85);
            opacity: 0.75;
          }

          50% {
            transform: scale(1.15);
            opacity: 1;
          }
        }

        @keyframes bw-orbit-one {
          from {
            transform: rotate(55deg);
          }

          to {
            transform: rotate(415deg);
          }
        }

        @keyframes bw-orbit-two {
          from {
            transform: rotate(-55deg);
          }

          to {
            transform: rotate(-415deg);
          }
        }

        @media (max-width: 600px) {
          .bw-start-server {
            padding: 12px;
          }

          .bw-server-icon {
            width: 37px;
            height: 37px;
            flex-basis: 37px;
          }

          .bw-server-title {
            font-size: 11px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .bw-server-core,
          .bw-server-orbit {
            animation: none;
          }

          .bw-start-server,
          .bw-server-icon,
          .bw-server-arrow {
            transition: none;
          }
        }
      `}</style>
    </>
  );
}
