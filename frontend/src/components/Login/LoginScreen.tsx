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
      if (mode === 'login') await login(email, password);
      else await register(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="panel" style={{ width: 380, padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent)', display: 'grid', placeItems: 'center', color: 'var(--accent-contrast)' }}>
            <Icon name="browser" size={20} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15 }}>ANURAG VIRTUAL COMPUTER</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Your machine, running elsewhere</div>
          </div>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={mode === 'register' ? 10 : undefined}
            required
          />
          {error && <div style={{ color: 'var(--status-danger)', fontSize: 13 }}>{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={busy} style={{ justifyContent: 'center', marginTop: 4 }}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          style={{ marginTop: 18, fontSize: 13, color: 'var(--text-muted)', width: '100%', textAlign: 'center' }}
        >
          {mode === 'login' ? "Don't have an account? Create one" : 'Already have an account? Log in'}
        </button>
        {mode === 'login' && (
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            Forgot password isn't wired up in this build yet.
          </div>



      ```tsx
<a
  href="https://YOUR-SERVER-SITE.com"
  target="_blank"
  rel="noopener noreferrer"
  className="bw-start-server"
>
  <style>
    {`
      .bw-start-server {
        --accent: #6ee7ff;
        --accent2: #8b5cf6;

        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 14px;

        min-width: 225px;
        padding: 13px 16px;

        color: #fff;
        text-decoration: none;
        font-family: inherit;

        background:
          linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.11),
            rgba(255, 255, 255, 0.035)
          );

        border: 1px solid rgba(110, 231, 255, 0.3);
        border-radius: 16px;

        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.12),
          0 10px 30px rgba(0,0,0,.25),
          0 0 0 rgba(110,231,255,0);

        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);

        overflow: hidden;
        isolation: isolate;

        transform: perspective(700px) translateZ(0);

        transition:
          transform .25s ease,
          border-color .25s ease,
          box-shadow .25s ease;
      }

      .bw-start-server::before {
        content: "";
        position: absolute;
        inset: -100%;

        background: linear-gradient(
          110deg,
          transparent 35%,
          rgba(110,231,255,.13) 48%,
          rgba(139,92,246,.13) 52%,
          transparent 65%
        );

        transform: translateX(-30%);
        transition: transform .7s ease;

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

        border-color: rgba(110,231,255,.7);

        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.16),
          0 15px 35px rgba(0,0,0,.35),
          0 0 30px rgba(110,231,255,.18);
      }

      .bw-start-server:active {
        transform:
          perspective(700px)
          translateY(1px)
          scale(.98);
      }

      /* 3D server icon */
      .bw-server-icon {
        position: relative;

        width: 42px;
        height: 42px;
        flex: 0 0 42px;

        display: grid;
        place-items: center;

        border-radius: 13px;

        background:
          radial-gradient(
            circle at 35% 30%,
            rgba(110,231,255,.32),
            rgba(139,92,246,.13) 45%,
            rgba(0,0,0,.28)
          );

        border: 1px solid rgba(110,231,255,.32);

        box-shadow:
          inset 0 1px 2px rgba(255,255,255,.12),
          0 0 18px rgba(110,231,255,.1);

        transform: translateZ(15px);

        transition: transform .3s ease;
      }

      .bw-start-server:hover .bw-server-icon {
        transform:
          translateZ(22px)
          rotateY(-8deg)
          rotateX(5deg);
      }

      /* glowing server core */
      .bw-server-core {
        width: 12px;
        height: 12px;

        border-radius: 50%;

        background: var(--accent);

        box-shadow:
          0 0 5px var(--accent),
          0 0 12px rgba(110,231,255,.9),
          0 0 25px rgba(110,231,255,.55);

        animation: bwServerPulse 2s ease-in-out infinite;
      }

      /* orbit rings */
      .bw-server-orbit {
        position: absolute;

        width: 34px;
        height: 15px;

        border: 1px solid rgba(110,231,255,.28);
        border-radius: 50%;

        pointer-events: none;
      }

      .bw-server-orbit.one {
        left: 21px;
        top: 14px;

        transform: rotate(55deg);

        animation: bwOrbitOne 4s linear infinite;
      }

      .bw-server-orbit.two {
        left: 21px;
        top: 14px;

        transform: rotate(-55deg);

        border-color: rgba(139,92,246,.28);

        animation: bwOrbitTwo 5s linear infinite reverse;
      }

      /* text */
      .bw-server-content {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
      }

      .bw-server-title {
        font-size: 13px;
        font-weight: 800;
        letter-spacing: .12em;
        line-height: 1;
      }

      .bw-server-subtitle {
        display: flex;
        align-items: center;
        gap: 6px;

        font-size: 10px;
        font-weight: 500;

        color: rgba(255,255,255,.52);
        letter-spacing: .03em;
      }

      .bw-server-dot {
        width: 5px;
        height: 5px;

        border-radius: 50%;

        background: var(--accent);

        box-shadow:
          0 0 6px var(--accent),
          0 0 12px rgba(110,231,255,.7);
      }

      /* arrow */
      .bw-server-arrow {
        display: grid;
        place-items: center;

        width: 30px;
        height: 30px;

        border-radius: 9px;

        color: rgba(255,255,255,.55);

        background: rgba(255,255,255,.045);
        border: 1px solid rgba(255,255,255,.08);

        font-size: 17px;

        transition:
          transform .25s ease,
          color .25s ease,
          background .25s ease;
      }

      .bw-start-server:hover .bw-server-arrow {
        color: var(--accent);

        background: rgba(110,231,255,.08);

        transform: translate(2px,-2px);
      }

      @keyframes bwServerPulse {
        0%, 100% {
          transform: scale(.85);
          opacity: .75;
        }

        50% {
          transform: scale(1.15);
          opacity: 1;
        }
      }

      @keyframes bwOrbitOne {
        from {
          transform: rotate(55deg);
        }

        to {
          transform: rotate(415deg);
        }
      }

      @keyframes bwOrbitTwo {
        from {
          transform: rotate(-55deg);
        }

        to {
          transform: rotate(-415deg);
        }
      }

      @media (max-width: 600px) {
        .bw-start-server {
          min-width: 205px;
          padding: 12px 14px;
        }

        .bw-server-icon {
          width: 38px;
          height: 38px;
          flex-basis: 38px;
        }

        .bw-server-title {
          font-size: 12px;
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
    `}
  </style>

  <span className="bw-server-icon">
    <span className="bw-server-orbit one"></span>
    <span className="bw-server-orbit two"></span>
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

  <span className="bw-server-arrow">
    ↗
  </span>
</a>
```

        )}
      </div>
    </div>
  );
}
