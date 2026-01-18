-- =====================================================
-- FIX: Allow cascade delete for athletes
-- =====================================================
-- Problem: Cannot delete athlete because of foreign key constraints
-- Solution: Add ON DELETE CASCADE to all athlete references
-- =====================================================

-- 1. Fix ranking_snapshot_data constraint
ALTER TABLE ranking_snapshot_data
DROP CONSTRAINT IF EXISTS ranking_snapshot_data_athlete_id_fkey;

ALTER TABLE ranking_snapshot_data
ADD CONSTRAINT ranking_snapshot_data_athlete_id_fkey
FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE;

-- 2. Fix ranking_calculation_audit constraints (if exists)
ALTER TABLE ranking_calculation_audit
DROP CONSTRAINT IF EXISTS ranking_calculation_audit_athlete_id_fkey;

ALTER TABLE ranking_calculation_audit
ADD CONSTRAINT ranking_calculation_audit_athlete_id_fkey
FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE;

ALTER TABLE ranking_calculation_audit
DROP CONSTRAINT IF EXISTS ranking_calculation_audit_snapshot_id_fkey;

ALTER TABLE ranking_calculation_audit
ADD CONSTRAINT ranking_calculation_audit_snapshot_id_fkey
FOREIGN KEY (snapshot_id) REFERENCES ranking_snapshots(id) ON DELETE CASCADE;

-- 3. Fix results constraint (if not already cascading)
ALTER TABLE results
DROP CONSTRAINT IF EXISTS results_athlete_id_fkey;

ALTER TABLE results
ADD CONSTRAINT results_athlete_id_fkey
FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE;

-- Verification
SELECT 'Cascade delete constraints applied successfully!' as status;
