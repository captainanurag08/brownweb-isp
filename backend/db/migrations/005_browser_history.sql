CREATE TABLE browser_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES browser_sessions(id) ON DELETE SET NULL,
  tab_id UUID REFERENCES browser_tabs(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  title TEXT,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_browser_history_user_id ON browser_history (user_id);
CREATE INDEX idx_browser_history_visited_at ON browser_history (visited_at DESC);
