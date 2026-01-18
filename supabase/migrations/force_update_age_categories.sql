-- =====================================================
-- FORCE UPDATE AGE CATEGORIES
-- Updates all existing athletes and ensures trigger works
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

-- Step 2: Add birth_year computed column if not exists
ALTER TABLE athletes
ADD COLUMN IF NOT EXISTS birth_year INT;

-- Step 3: Update birth_year for all athletes
UPDATE athletes
SET birth_year = EXTRACT(YEAR FROM date_of_birth)::INT
WHERE date_of_birth IS NOT NULL;

-- Step 4: Force update ALL age categories based on birth year
UPDATE athletes
SET age_category = compute_age_category(EXTRACT(YEAR FROM date_of_birth)::INT)
WHERE date_of_birth IS NOT NULL;

-- Step 5: Create or replace trigger function
CREATE OR REPLACE FUNCTION update_age_category()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Auto-update birth_year when date_of_birth changes
  IF NEW.date_of_birth IS NOT NULL THEN
    NEW.birth_year := EXTRACT(YEAR FROM NEW.date_of_birth)::INT;
    NEW.age_category := compute_age_category(NEW.birth_year);
  END IF;
  RETURN NEW;
END;
$$;

-- Step 6: Drop old trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_update_age_category ON athletes;

CREATE TRIGGER trigger_update_age_category
  BEFORE INSERT OR UPDATE ON athletes
  FOR EACH ROW
  EXECUTE FUNCTION update_age_category();

-- Step 7: Verification - show updated athletes
SELECT
  id,
  first_name,
  last_name,
  date_of_birth,
  birth_year,
  age_category,
  compute_age_category(birth_year) as should_be
FROM athletes
WHERE date_of_birth IS NOT NULL
ORDER BY birth_year DESC
LIMIT 20;
