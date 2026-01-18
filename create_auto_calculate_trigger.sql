-- Create a trigger to automatically calculate points when a result is inserted or updated

-- First, create a trigger function
CREATE OR REPLACE FUNCTION trigger_calculate_result_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate points for the new/updated result
  PERFORM calculate_result_points(NEW.id);

  -- Reload the result to get the updated points
  SELECT points_earned, calculation_explanation
  INTO NEW.points_earned, NEW.calculation_explanation
  FROM results
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS auto_calculate_points ON results;

-- Create the trigger on INSERT and UPDATE
CREATE TRIGGER auto_calculate_points
AFTER INSERT OR UPDATE OF final_rank, matches_won, event_id
ON results
FOR EACH ROW
EXECUTE FUNCTION trigger_calculate_result_points();

-- Note: This trigger will automatically calculate points for all future results
-- For existing results, you need to run the recalculate script
