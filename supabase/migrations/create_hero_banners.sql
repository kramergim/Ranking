-- Create hero_banners table for editable homepage banner
CREATE TABLE IF NOT EXISTS hero_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,                        -- Optional headline override (null = use default)
  description TEXT,                  -- Optional description override (null = use default)
  image_url TEXT,                    -- Background image URL from Supabase Storage
  is_active BOOLEAN DEFAULT false,   -- Only ONE banner can be active at a time
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster active banner lookups
CREATE INDEX IF NOT EXISTS idx_hero_banners_active ON hero_banners(is_active) WHERE is_active = true;

-- Comments for documentation
COMMENT ON TABLE hero_banners IS 'Hero section banners with background images and text overlays';
COMMENT ON COLUMN hero_banners.title IS 'Optional headline override. NULL = use default "Performance tracking for athlete selection"';
COMMENT ON COLUMN hero_banners.description IS 'Optional description override. NULL = use default description';
COMMENT ON COLUMN hero_banners.is_active IS 'Only ONE banner can be active. Enforced by trigger';

-- Trigger function to ensure only ONE active banner at a time
CREATE OR REPLACE FUNCTION ensure_single_active_banner()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    -- Deactivate all other banners
    UPDATE hero_banners
    SET is_active = false
    WHERE id != NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_single_active_banner ON hero_banners;
CREATE TRIGGER trigger_single_active_banner
  BEFORE INSERT OR UPDATE ON hero_banners
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_active_banner();

-- Create storage bucket for hero banner images
INSERT INTO storage.buckets (id, name, public)
VALUES ('hero-banners', 'hero-banners', true)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket policies (RLS)
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload hero banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update hero banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete hero banners" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to hero banners" ON storage.objects;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload hero banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'hero-banners');

-- Allow authenticated users to update
CREATE POLICY "Authenticated users can update hero banners"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'hero-banners');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete hero banners"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'hero-banners');

-- Allow public read access
CREATE POLICY "Public read access to hero banners"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'hero-banners');
