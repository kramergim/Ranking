-- Rename the 'rank' column to 'ranking_position' to avoid SQL keyword conflict
-- This will permanently fix the issue with the rank() function conflict

-- First, check if the column 'rank' exists and rename it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ranking_snapshot_data' AND column_name = 'rank'
  ) THEN
    ALTER TABLE ranking_snapshot_data RENAME COLUMN "rank" TO ranking_position;
    RAISE NOTICE 'Column "rank" renamed to "ranking_position"';
  ELSE
    -- If 'rank' doesn't exist, check if 'ranking_position' exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'ranking_snapshot_data' AND column_name = 'ranking_position'
    ) THEN
      -- Add the column if neither exists
      ALTER TABLE ranking_snapshot_data ADD COLUMN ranking_position INTEGER;
      RAISE NOTICE 'Column "ranking_position" added';
    ELSE
      RAISE NOTICE 'Column "ranking_position" already exists';
    END IF;
  END IF;
END $$;
