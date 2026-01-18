-- Add new columns to ranking_snapshot_data table
ALTER TABLE ranking_snapshot_data
ADD COLUMN IF NOT EXISTS current_year_points DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_year_pts DECIMAL DEFAULT 0;

-- Update existing records to calculate current_year_points from total_points
-- (assuming existing total_points was only current year before this change)
UPDATE ranking_snapshot_data
SET current_year_points = total_points,
    last_year_pts = 0
WHERE current_year_points IS NULL;
