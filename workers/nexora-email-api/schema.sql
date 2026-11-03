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

-- Mail delivered by Email Routing (created automatically by workers/shared/inboundMail.js; kept here for reference).
CREATE TABLE IF NOT EXISTS inbound_emails (
  id TEXT PRIMARY KEY,
  received_at TEXT NOT NULL,
  from_addr TEXT NOT NULL DEFAULT '',
  to_addr TEXT NOT NULL DEFAULT '',
  to_list TEXT NOT NULL DEFAULT '[]',
  cc_list TEXT NOT NULL DEFAULT '[]',
  reply_to TEXT NOT NULL DEFAULT '[]',
  subject TEXT NOT NULL DEFAULT '',
  text_body TEXT NOT NULL DEFAULT '',
  html_body TEXT NOT NULL DEFAULT '',
  message_id TEXT NOT NULL DEFAULT '',
  refs TEXT NOT NULL DEFAULT '',
  attachments TEXT NOT NULL DEFAULT '[]',
  size INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_inbound_received ON inbound_emails(received_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_inbound_msgid ON inbound_emails(message_id, to_addr) WHERE message_id != '';

-- Support tickets (created automatically by workers/shared/tickets.js; kept here for reference).
CREATE TABLE IF NOT EXISTS email_tickets (
  ticket_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  assignee TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_activity_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS email_ticket_map (
  email_id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL
);

-- Created automatically by workers/shared/mailbox.js (kept here for reference): sent_emails, ticket_events,
-- blocked_senders (kind, created_at), spam_mail (email_id, reported_at).
