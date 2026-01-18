-- Drop existing function
DROP FUNCTION IF EXISTS calculate_result_points(UUID);

-- Create new function with coefficient-based rules
CREATE OR REPLACE FUNCTION calculate_result_points(result_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_coefficient INTEGER;
  v_final_rank INTEGER;
  v_matches_won INTEGER;
  v_base_points DECIMAL := 0;
  v_win_bonus DECIMAL := 0;
  v_total_points DECIMAL := 0;
  v_explanation TEXT := '';
BEGIN
  -- Get result details with event coefficient
  SELECT
    e.coefficient,
    r.final_rank,
    COALESCE(r.matches_won, 0)
  INTO
    v_coefficient,
    v_final_rank,
    v_matches_won
  FROM results r
  JOIN events e ON r.event_id = e.id
  WHERE r.id = result_id;

  -- Check if result exists
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Calculate base points based on coefficient and rank
  -- Only award podium points if matches_won >= 2
  IF v_final_rank IN (1, 2, 3) AND v_matches_won >= 2 THEN
    CASE v_coefficient
      WHEN 1 THEN
        CASE v_final_rank
          WHEN 1 THEN v_base_points := 5;
          WHEN 2 THEN v_base_points := 3;
          WHEN 3 THEN v_base_points := 1;
        END CASE;
      WHEN 2 THEN
        CASE v_final_rank
          WHEN 1 THEN v_base_points := 10;
          WHEN 2 THEN v_base_points := 6;
          WHEN 3 THEN v_base_points := 3;
        END CASE;
      WHEN 3 THEN
        CASE v_final_rank
          WHEN 1 THEN v_base_points := 20;
          WHEN 2 THEN v_base_points := 12;
          WHEN 3 THEN v_base_points := 6;
        END CASE;
      WHEN 4 THEN
        CASE v_final_rank
          WHEN 1 THEN v_base_points := 30;
          WHEN 2 THEN v_base_points := 18;
          WHEN 3 THEN v_base_points := 10;
        END CASE;
      WHEN 5 THEN
        CASE v_final_rank
          WHEN 1 THEN v_base_points := 40;
          WHEN 2 THEN v_base_points := 34;
          WHEN 3 THEN v_base_points := 26;
        END CASE;
    END CASE;
  END IF;

  -- Calculate win bonus based on coefficient (not for coefficient 1)
  IF v_coefficient > 1 THEN
    CASE v_coefficient
      WHEN 2 THEN v_win_bonus := v_matches_won * 1;
      WHEN 3 THEN v_win_bonus := v_matches_won * 2;
      WHEN 4 THEN v_win_bonus := v_matches_won * 3;
      WHEN 5 THEN v_win_bonus := v_matches_won * 5;
    END CASE;
  END IF;

  -- Total points
  v_total_points := v_base_points + v_win_bonus;

  -- Build explanation
  v_explanation := format('Coefficient %s: ', v_coefficient);

  IF v_final_rank IN (1, 2, 3) THEN
    IF v_matches_won < 2 THEN
      v_explanation := v_explanation || format('Place %s (0 pts - at least 2 wins required)', v_final_rank);
    ELSE
      v_explanation := v_explanation || format('Place %s (%s pts)', v_final_rank, v_base_points);
    END IF;
  ELSE
    v_explanation := v_explanation || format('Place %s (0 pts)', v_final_rank);
  END IF;

  IF v_coefficient > 1 THEN
    v_explanation := v_explanation || format(' + %s wins × %s pts',
      v_matches_won,
      CASE v_coefficient
        WHEN 2 THEN 1
        WHEN 3 THEN 2
        WHEN 4 THEN 3
        WHEN 5 THEN 5
      END);
  END IF;

  v_explanation := v_explanation || format('. Total: %s pts', v_total_points);

  -- Update the result with calculated points and explanation
  UPDATE results
  SET
    points_earned = v_total_points,
    calculation_explanation = v_explanation
  WHERE id = result_id;

  RETURN v_total_points;
END;
$$ LANGUAGE plpgsql;
