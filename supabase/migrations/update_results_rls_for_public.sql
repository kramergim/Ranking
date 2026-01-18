-- =====================================================
-- UPDATE RESULTS RLS POLICY
-- =====================================================
-- Allow public to view results for published events
-- =====================================================

-- Drop existing results_select policy
DROP POLICY IF EXISTS results_select ON results;

-- Create new policy: PUBLIC can see results for published events only
-- admin/selector see all results
CREATE POLICY results_select ON results FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = results.event_id
    AND e.is_published = true
  )
  OR get_user_role() IN ('admin', 'selector')
);

-- Comment for documentation
COMMENT ON POLICY results_select ON results IS 'Public can view results for published events. Admin/selector can view all results.';
