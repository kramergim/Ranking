-- Force remove NOT NULL constraint on rank_position

-- Method 1: Direct ALTER
ALTER TABLE ranking_snapshot_data
ALTER COLUMN rank_position DROP NOT NULL;

-- Verify the change
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'ranking_snapshot_data'
  AND column_name = 'rank_position';

-- Show message
SELECT 'NOT NULL constraint removed from rank_position' AS status;
