-- =====================================================
-- Add URL fields for Competition Information and Draws
-- =====================================================

ALTER TABLE events
ADD COLUMN IF NOT EXISTS info_url TEXT,
ADD COLUMN IF NOT EXISTS draws_url TEXT;

COMMENT ON COLUMN events.info_url IS 'URL for competition information';
COMMENT ON COLUMN events.draws_url IS 'URL for competition draws';

SELECT 'Event URL fields added successfully!' as status;
