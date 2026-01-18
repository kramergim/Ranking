-- First, let's check the current structure of ranking_snapshot_data
-- Run this to see what columns exist:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'ranking_snapshot_data' ORDER BY ordinal_position;

-- Add missing columns to ranking_snapshot_data if they don't exist
ALTER TABLE ranking_snapshot_data
ADD COLUMN IF NOT EXISTS age_category TEXT,
ADD COLUMN IF NOT EXISTS weight_category TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS club TEXT,
ADD COLUMN IF NOT EXISTS current_year_points DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_year_pts DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS tournaments_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_event_date DATE;

-- Update existing records to set defaults for new columns
UPDATE ranking_snapshot_data
SET
  current_year_points = COALESCE(current_year_points, total_points, 0),
  last_year_pts = COALESCE(last_year_pts, 0),
  tournaments_count = COALESCE(tournaments_count, 0)
WHERE current_year_points IS NULL OR last_year_pts IS NULL;
