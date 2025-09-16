-- Fix storage RLS policies to allow testing with anonymous users
-- This enables the document extraction system to work during development

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow authenticated users to manage carter licenses" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to manage carter certificates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to manage carter insurance" ON storage.objects;

-- Create more permissive policies for development
-- In production, these should be restricted to authenticated users only
CREATE POLICY "Allow upload access for carter licenses" ON storage.objects
FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'carter-licenses');

CREATE POLICY "Allow read access for carter licenses" ON storage.objects
FOR SELECT TO anon, authenticated USING (bucket_id = 'carter-licenses');

CREATE POLICY "Allow delete access for carter licenses" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'carter-licenses');

CREATE POLICY "Allow upload access for carter certificates" ON storage.objects
FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'carter-certificates');

CREATE POLICY "Allow read access for carter certificates" ON storage.objects
FOR SELECT TO anon, authenticated USING (bucket_id = 'carter-certificates');

CREATE POLICY "Allow delete access for carter certificates" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'carter-certificates');

CREATE POLICY "Allow upload access for carter insurance" ON storage.objects
FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'carter-insurance');

CREATE POLICY "Allow read access for carter insurance" ON storage.objects
FOR SELECT TO anon, authenticated USING (bucket_id = 'carter-insurance');

CREATE POLICY "Allow delete access for carter insurance" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'carter-insurance');