-- ============================================================================
-- Setup Supabase Storage for Athlete Photos
-- ============================================================================

-- Create storage bucket for athlete photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('athlete-photos', 'athlete-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload athlete photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'athlete-photos');

-- Allow authenticated users to update photos
CREATE POLICY "Authenticated users can update athlete photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'athlete-photos');

-- Allow authenticated users to delete photos
CREATE POLICY "Authenticated users can delete athlete photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'athlete-photos');

-- Allow public read access to photos
CREATE POLICY "Public read access to athlete photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'athlete-photos');

-- Verification
SELECT 'Athlete photos storage bucket created successfully!' as status;
