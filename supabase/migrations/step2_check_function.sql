-- Step 2a: Find existing function signatures
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'generate_ranking_snapshot'
  AND n.nspname = 'public';
