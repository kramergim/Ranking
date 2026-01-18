-- ============================================================================
-- COMPLETE SETUP FOR ATHLETE PHOTOS
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/ejkrizotwajhqvnieznd/sql
-- ============================================================================

-- Step 1: Create storage bucket for athlete photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('athlete-photos', 'athlete-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Set up storage policies
-- Allow authenticated users to upload photos
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Authenticated users can upload athlete photos'
  ) THEN
    CREATE POLICY "Authenticated users can upload athlete photos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'athlete-photos');
  END IF;
END $$;

-- Allow authenticated users to update photos
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Authenticated users can update athlete photos'
  ) THEN
    CREATE POLICY "Authenticated users can update athlete photos"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'athlete-photos');
  END IF;
END $$;

-- Allow authenticated users to delete photos
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Authenticated users can delete athlete photos'
  ) THEN
    CREATE POLICY "Authenticated users can delete athlete photos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'athlete-photos');
  END IF;
END $$;

-- Allow public read access to photos
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Public read access to athlete photos'
  ) THEN
    CREATE POLICY "Public read access to athlete photos"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'athlete-photos');
  END IF;
END $$;

-- Verification
SELECT 'Storage bucket setup complete! You can now upload athlete photos.' as status;
SELECT * FROM storage.buckets WHERE id = 'athlete-photos';
