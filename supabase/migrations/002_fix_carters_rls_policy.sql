-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON carters;

-- Create a more permissive policy for development
-- In production, you would want to restrict this to authenticated users
CREATE POLICY "Allow full access for development" ON carters
FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);