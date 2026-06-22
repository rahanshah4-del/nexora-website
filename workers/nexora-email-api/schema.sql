CREATE TABLE IF NOT EXISTS email_state (
  email_id TEXT PRIMARY KEY,
  is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
  is_starred INTEGER NOT NULL DEFAULT 0 CHECK (is_starred IN (0, 1)),
  folder TEXT NOT NULL DEFAULT 'inbox' CHECK (folder IN ('inbox', 'archive', 'trash')),
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_state_folder ON email_state(folder);
CREATE INDEX IF NOT EXISTS idx_email_state_starred ON email_state(is_starred);

CREATE TABLE IF NOT EXISTS email_replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inbound_email_id TEXT NOT NULL,
  sent_email_id TEXT,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_replies_inbound ON email_replies(inbound_email_id, sent_at DESC);
