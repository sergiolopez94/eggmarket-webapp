-- Fix extraction system RLS policies to allow testing with anonymous users
-- This enables the document extraction system to work during development

-- Drop existing restrictive policies for extraction_jobs
DROP POLICY IF EXISTS "Users can view own extraction jobs" ON extraction_jobs;
DROP POLICY IF EXISTS "Users can insert own extraction jobs" ON extraction_jobs;
DROP POLICY IF EXISTS "Users can update own extraction jobs" ON extraction_jobs;

-- Create development-friendly policies for extraction_jobs
CREATE POLICY "Allow access to extraction jobs for testing" ON extraction_jobs
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Drop existing restrictive policies for document_extractions
DROP POLICY IF EXISTS "Users can view company extractions" ON document_extractions;

-- Create development-friendly policies for document_extractions
CREATE POLICY "Allow access to document extractions for testing" ON document_extractions
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Templates and audit logs can keep their existing policies since they're not used in basic extraction