-- Remove NOT NULL constraint from ranking_position column
-- This allows the column to be NULL temporarily during insertion

ALTER TABLE ranking_snapshot_data
ALTER COLUMN ranking_position DROP NOT NULL;

-- Verify the change
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'ranking_snapshot_data'
  AND column_name = 'ranking_position';
