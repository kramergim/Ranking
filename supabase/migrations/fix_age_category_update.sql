-- =====================================================
-- FIX AGE CATEGORY UPDATE
-- Fixes the generated column issue
-- =====================================================

-- Step 1: Ensure compute function exists
CREATE OR REPLACE FUNCTION compute_age_category(p_birth_year INT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_birth_year >= 2012 AND p_birth_year <= 2014 THEN
    RETURN 'Cadet';
  ELSIF p_birth_year >= 2009 AND p_birth_year <= 2011 THEN
    RETURN 'Junior';
  ELSIF p_birth_year <= 2008 THEN
    RETURN 'Senior';
  ELSE
    RETURN 'Unknown';
  END IF;
END;
$$;

-- Step 2: Drop birth_year if it's a generated column and recreate as regular column
DO $$
BEGIN
  -- Drop the generated column
  ALTER TABLE athletes DROP COLUMN IF EXISTS birth_year CASCADE;

  -- Add as regular column
  ALTER TABLE athletes ADD COLUMN birth_year INT;

  -- Populate it
  UPDATE athletes
  SET birth_year = EXTRACT(YEAR FROM date_of_birth)::INT
  WHERE date_of_birth IS NOT NULL;

  -- Create index
  CREATE INDEX IF NOT EXISTS idx_athletes_birth_year ON athletes(birth_year);
END $$;

-- Step 3: Force update ALL age categories
UPDATE athletes
SET age_category = compute_age_category(EXTRACT(YEAR FROM date_of_birth)::INT)
WHERE date_of_birth IS NOT NULL;

-- Step 4: Create or replace trigger function
CREATE OR REPLACE FUNCTION update_age_category()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.date_of_birth IS NOT NULL THEN
    -- Update birth_year
    NEW.birth_year := EXTRACT(YEAR FROM NEW.date_of_birth)::INT;
    -- Update age_category
    NEW.age_category := compute_age_category(NEW.birth_year);
  END IF;
  RETURN NEW;
END;
$$;

-- Step 5: Drop old trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_update_age_category ON athletes;

CREATE TRIGGER trigger_update_age_category
  BEFORE INSERT OR UPDATE ON athletes
  FOR EACH ROW
  EXECUTE FUNCTION update_age_category();

-- Step 6: Verification
SELECT
  id,
  first_name,
  last_name,
  date_of_birth,
  birth_year,
  age_category,
  compute_age_category(EXTRACT(YEAR FROM date_of_birth)::INT) as should_be
FROM athletes
WHERE date_of_birth IS NOT NULL
ORDER BY birth_year DESC
LIMIT 20;
