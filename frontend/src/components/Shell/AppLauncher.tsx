import { useStore } from '../../state/store';
import { Icon, type IconName } from '../icons/Icon';

export function AppLauncher() {
  const { setCurrentApp, newTab, device } = useStore();

  function openBrowser(url?: string) {
    setCurrentApp('browser');
    if (url) newTab(url);
  }

  return (
    <div
      style={{
        padding: 24,
        overflowY: 'auto',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Greeting */}
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20,
          fontWeight: 600,
        }}
      >
        {greeting()}, {device?.name ?? 'ANURAG-PC'}
      </div>

      <div
        style={{
          color: 'var(--text-muted)',
          fontSize: 13,
          marginTop: 4,
        }}
      >
        {device?.session_mode === 'private'
          ? 'Private session — nothing here survives shutdown.'
          : 'Persistent session — your tabs and profile carry over.'}
      </div>

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

          <span className="bw-server-arrow">
            ↗
          </span>
        </a>
      </div>

      {/* Main tiles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: 14,
          marginTop: 24,
        }}
      >
        <PrimaryTile
          icon="browser"
          title="Browser"
          subtitle="Open a new tab on your remote Chromium"
          onClick={() => openBrowser()}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <SecondaryTile
            icon="files"
            title="Files"
            onClick={() => setCurrentApp('files')}
          />

          <SecondaryTile
            icon="history"
            title="History"
            onClick={() => setCurrentApp('history')}
          />
        </div>
      </div>

      {/* Quick sites */}
      <div style={{ marginTop: 24 }}>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            marginBottom: 10,
            fontWeight: 600,
          }}
        >
          Quick sites
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <QuickSite
            label="Google"
            url="https://www.google.com/"
            onClick={openBrowser}
          />

          <QuickSite
            label="YouTube"
            url="https://www.youtube.com/"
            onClick={openBrowser}
          />

          <QuickSite
            label="Gmail"
            url="https://mail.google.com/"
            onClick={openBrowser}
          />

          <QuickSite
            label="Drive"
            url="https://drive.google.com/"
            onClick={openBrowser}
          />
        </div>
      </div>

      {/* Bottom navigation */}
      <div
        style={{
          marginTop: 24,
          display: 'flex',
          gap: 10,
        }}
      >
        <ListRow
          icon="bookmarks"
          label="Bookmarks"
          onClick={() => setCurrentApp('bookmarks')}
        />

        <ListRow
          icon="notes"
          label="Notes"
          onClick={() => setCurrentApp('notes')}
        />

        <ListRow
          icon="settings"
          label="Settings"
          onClick={() => setCurrentApp('settings')}
        />
      </div>

      {/* Embedded START SERVER CSS */}
      <style>{`
        .bw-server-wrapper {
          width: 100%;
          margin-top: 20px;
          display: flex;
          justify-content: center;
        }

        .bw-start-server {
          --server-accent: #6ee7ff;
          --server-purple: #8b5cf6;

          position: relative;

          display: flex;
          align-items: center;
          gap: 14px;

          width: 100%;
          min-height: 66px;
          padding: 12px 15px;

          box-sizing: border-box;

          color: var(--text, #ffffff);
          text-decoration: none;
          font-family: inherit;

          background:
            linear-gradient(
              135deg,
              rgba(110, 231, 255, 0.09),
              rgba(139, 92, 246, 0.06),
              rgba(255, 255, 255, 0.025)
            );

          border: 1px solid
            rgba(110, 231, 255, 0.28);

          border-radius: 16px;

          box-shadow:
            inset 0 1px 0
              rgba(255, 255, 255, 0.11),
            0 10px 30px
              rgba(0, 0, 0, 0.2);

          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);

          overflow: hidden;
          isolation: isolate;

          transform:
            perspective(800px)
            translateZ(0);

          transition:
            transform 0.25s ease,
            border-color 0.25s ease,
            box-shadow 0.25s ease;
        }

        .bw-start-server::before {
          content: "";

          position: absolute;
          inset: -150%;

          background:
            linear-gradient(
              110deg,
              transparent 35%,
              rgba(110, 231, 255, 0.08) 47%,
              rgba(139, 92, 246, 0.16) 50%,
              rgba(110, 231, 255, 0.08) 53%,
              transparent 65%
            );

          transform: translateX(-35%);
          transition: transform 0.8s ease;

          z-index: -1;
        }

        .bw-start-server:hover::before {
          transform: translateX(35%);
        }

        .bw-start-server:hover {
          transform:
            perspective(800px)
            translateY(-3px)
            rotateX(2deg);

          border-color:
            rgba(110, 231, 255, 0.65);

          box-shadow:
            inset 0 1px 0
              rgba(255, 255, 255, 0.16),
            0 16px 38px
              rgba(0, 0, 0, 0.28),
            0 0 30px
              rgba(110, 231, 255, 0.14);
        }

        .bw-start-server:active {
          transform:
            perspective(800px)
            translateY(1px)
            scale(0.985);
        }

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
              rgba(110, 231, 255, 0.3),
              rgba(139, 92, 246, 0.12) 45%,
              rgba(0, 0, 0, 0.25)
            );

          border: 1px solid
            rgba(110, 231, 255, 0.3);

          box-shadow:
            inset 0 1px 2px
              rgba(255, 255, 255, 0.12),
            0 0 18px
              rgba(110, 231, 255, 0.09);

          transform: translateZ(12px);

          transition:
            transform 0.3s ease;
        }

        .bw-start-server:hover
          .bw-server-icon {
          transform:
            translateZ(22px)
            rotateY(-8deg)
            rotateX(5deg);
        }

        .bw-server-core {
          width: 12px;
          height: 12px;

          border-radius: 50%;

          background:
            var(--server-accent);

          box-shadow:
            0 0 5px
              var(--server-accent),
            0 0 13px
              rgba(110, 231, 255, 0.85),
            0 0 25px
              rgba(110, 231, 255, 0.5);

          animation:
            bw-server-pulse 2s
            ease-in-out infinite;
        }

        .bw-server-orbit {
          position: absolute;

          width: 34px;
          height: 15px;

          border: 1px solid
            rgba(110, 231, 255, 0.27);

          border-radius: 50%;

          pointer-events: none;
        }

        .bw-orbit-one {
          transform: rotate(55deg);

          animation:
            bw-orbit-one 4s
            linear infinite;
        }

        .bw-orbit-two {
          transform: rotate(-55deg);

          border-color:
            rgba(139, 92, 246, 0.3);

          animation:
            bw-orbit-two 5s
            linear infinite reverse;
        }

        .bw-server-content {
          display: flex;
          flex-direction: column;
          gap: 5px;

          min-width: 0;
          flex: 1;
        }

        .bw-server-title {
          font-size: 13px;
          font-weight: 800;

          letter-spacing: 0.12em;
          line-height: 1;
        }

        .bw-server-subtitle {
          display: flex;
          align-items: center;
          gap: 7px;

          font-size: 10px;
          font-weight: 500;

          color:
            var(
              --text-muted,
              rgba(255, 255, 255, 0.5)
            );

          white-space: nowrap;
        }

        .bw-server-dot {
          width: 5px;
          height: 5px;

          flex: 0 0 5px;

          border-radius: 50%;

          background:
            var(--server-accent);

          box-shadow:
            0 0 7px
              var(--server-accent);

          animation:
            bw-dot-pulse 1.6s
            ease-in-out infinite;
        }

        .bw-server-arrow {
          width: 31px;
          height: 31px;

          flex: 0 0 31px;

          display: grid;
          place-items: center;

          border-radius: 9px;

          color:
            var(
              --text-muted,
              rgba(255, 255, 255, 0.5)
            );

          background:
            rgba(255, 255, 255, 0.045);

          border: 1px solid
            rgba(255, 255, 255, 0.08);

          font-size: 17px;

          transition:
            transform 0.25s ease,
            color 0.25s ease,
            background 0.25s ease;
        }

        .bw-start-server:hover
          .bw-server-arrow {
          color:
            var(--server-accent);

          background:
            rgba(110, 231, 255, 0.08);

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

        @keyframes bw-dot-pulse {
          0%,
          100% {
            opacity: 0.5;
          }

          50% {
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

        @media (max-width: 700px) {
          .bw-start-server {
            min-height: 62px;
            padding: 11px 12px;
          }

          .bw-server-icon {
            width: 38px;
            height: 38px;
            flex-basis: 38px;
          }

          .bw-server-title {
            font-size: 11px;
          }

          .bw-server-subtitle {
            font-size: 9px;
          }

          .bw-server-arrow {
            width: 28px;
            height: 28px;
            flex-basis: 28px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .bw-server-core,
          .bw-server-dot,
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
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();

  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';

  return 'Good evening';
}

function PrimaryTile({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      className="panel"
      onClick={onClick}
      style={{
        padding: 22,
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minHeight: 140,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: 'var(--accent)',
          color: 'var(--accent-contrast)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Icon name={icon} size={22} />
      </div>

      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: 16,
          marginTop: 4,
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: 'var(--text-muted)',
          fontSize: 13,
        }}
      >
        {subtitle}
      </div>
    </button>
  );
}

function SecondaryTile({
  icon,
  title,
  onClick,
}: {
  icon: IconName;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      className="panel"
      onClick={onClick}
      style={{
        padding: 16,
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flex: 1,
      }}
    >
      <Icon name={icon} size={18} />

      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {title}
      </span>
    </button>
  );
}

function QuickSite({
  label,
  url,
  onClick,
}: {
  label: string;
  url: string;
  onClick: (url: string) => void;
}) {
  return (
    <button
      className="btn btn-secondary"
      onClick={() => onClick(url)}
    >
      {label}
    </button>
  );
}

function ListRow({
  icon,
  label,
  onClick,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="panel"
      onClick={onClick}
      style={{
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flex: 1,
      }}
    >
      <Icon name={icon} size={16} />

      <span style={{ fontSize: 13 }}>
        {label}
      </span>
    </button>
  );
}
