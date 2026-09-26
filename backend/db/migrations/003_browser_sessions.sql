CREATE TABLE browser_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'persistent', -- persistent | private
  status TEXT NOT NULL DEFAULT 'starting', -- starting | running | idle | stopped | crashed | destroyed
  profile_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  stopped_at TIMESTAMPTZ,
  destroyed_at TIMESTAMPTZ
);

CREATE INDEX idx_browser_sessions_user_id ON browser_sessions (user_id);
CREATE INDEX idx_browser_sessions_status ON browser_sessions (status);
