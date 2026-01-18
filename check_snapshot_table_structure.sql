-- Check the exact structure of ranking_snapshot_data table

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'ranking_snapshot_data'
ORDER BY ordinal_position;

-- Check constraints on the table
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'ranking_snapshot_data'::regclass;
