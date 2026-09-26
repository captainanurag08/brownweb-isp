CREATE TABLE browser_tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES browser_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Tab',
  url TEXT NOT NULL DEFAULT 'about:blank',
  favicon TEXT,
  position INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_browser_tabs_session_id ON browser_tabs (session_id);
