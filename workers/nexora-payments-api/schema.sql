CREATE TABLE IF NOT EXISTS upgrade_requests (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  uid TEXT NOT NULL,
  email TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  workspace_name TEXT NOT NULL DEFAULT '',
  module TEXT NOT NULL DEFAULT '',
  business_type TEXT NOT NULL DEFAULT '',
  plan_id TEXT NOT NULL DEFAULT '',
  plan TEXT NOT NULL DEFAULT '',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  amount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'PKR',
  payment_method TEXT NOT NULL DEFAULT '',
  transaction_id TEXT NOT NULL DEFAULT '',
  sender_name TEXT NOT NULL DEFAULT '',
  sender_number TEXT NOT NULL DEFAULT '',
  payment_date TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  screenshot_key TEXT NOT NULL DEFAULT '',
  screenshot_url TEXT NOT NULL DEFAULT '',
  screenshot_name TEXT NOT NULL DEFAULT '',
  screenshot_type TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  raw_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_upgrade_requests_created_at ON upgrade_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_upgrade_requests_status ON upgrade_requests(status);
CREATE INDEX IF NOT EXISTS idx_upgrade_requests_client_id ON upgrade_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_upgrade_requests_workspace_id ON upgrade_requests(workspace_id);
