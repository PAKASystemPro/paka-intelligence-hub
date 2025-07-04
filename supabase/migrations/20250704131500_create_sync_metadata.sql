CREATE TABLE IF NOT EXISTS sync_metadata (
  id INT PRIMARY KEY DEFAULT 1,
  last_sync_timestamp TIMESTAMPTZ
);

-- Insert the initial record if it doesn't exist
INSERT INTO sync_metadata (id, last_sync_timestamp)
SELECT 1, '2025-01-01T00:00:00Z'
WHERE NOT EXISTS (SELECT 1 FROM sync_metadata WHERE id = 1);
