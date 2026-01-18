-- Add last_year_pts column to athletes table
ALTER TABLE athletes
ADD COLUMN IF NOT EXISTS last_year_pts DECIMAL DEFAULT 0;

-- Update existing rows to have 0 if NULL
UPDATE athletes
SET last_year_pts = 0
WHERE last_year_pts IS NULL;
