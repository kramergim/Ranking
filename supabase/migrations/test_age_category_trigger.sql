-- =====================================================
-- TEST AGE CATEGORY TRIGGER
-- Verify trigger works on INSERT
-- =====================================================

-- Step 1: Verify trigger exists
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_age_category';

-- Step 2: Test INSERT with age category auto-calculation
DO $$
DECLARE
  test_athlete_id UUID;
BEGIN
  -- Insert test athlete (born 2014 = Cadet)
  INSERT INTO athletes (
    first_name,
    last_name,
    date_of_birth,
    gender,
    club,
    is_active
    -- NOTE: We do NOT specify age_category or birth_year
  ) VALUES (
    'Test',
    'Athlete2014',
    '2014-05-15'::DATE,
    'M',
    'Test Club',
    true
  ) RETURNING id INTO test_athlete_id;

  -- Show what was inserted
  RAISE NOTICE 'Test athlete created with ID: %', test_athlete_id;

  -- Display result
  RAISE NOTICE 'Checking auto-calculated values...';
END $$;

-- Step 3: Verify the test athlete has correct values
SELECT
  first_name,
  last_name,
  date_of_birth,
  birth_year,
  age_category,
  'Cadet' as expected_category
FROM athletes
WHERE last_name = 'Athlete2014';

-- Step 4: Clean up test data
DELETE FROM athletes WHERE last_name = 'Athlete2014';

-- Step 5: Show current trigger definition
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'update_age_category';
