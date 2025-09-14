-- Migration: Create carters table and related functions
-- This creates the database schema for the Carter Management system

-- Create carters table
CREATE TABLE carters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),

  -- Document expiry dates
  license_expiry DATE NOT NULL,
  carter_cert_expiry DATE NOT NULL,
  insurance_expiry DATE NOT NULL,

  -- File storage paths
  license_file_path TEXT,
  carter_cert_file_path TEXT,
  insurance_file_path TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger function (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_carters_updated_at
    BEFORE UPDATE ON carters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE carters ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for authenticated users (internal app)
CREATE POLICY "Allow full access for authenticated users" ON carters
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create storage buckets for documents
INSERT INTO storage.buckets (id, name, public) VALUES
('carter-licenses', 'carter-licenses', false),
('carter-certificates', 'carter-certificates', false),
('carter-insurance', 'carter-insurance', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Allow authenticated users to manage carter licenses" ON storage.objects
FOR ALL TO authenticated USING (bucket_id = 'carter-licenses');

CREATE POLICY "Allow authenticated users to manage carter certificates" ON storage.objects
FOR ALL TO authenticated USING (bucket_id = 'carter-certificates');

CREATE POLICY "Allow authenticated users to manage carter insurance" ON storage.objects
FOR ALL TO authenticated USING (bucket_id = 'carter-insurance');

-- Insert sample data
INSERT INTO carters (name, last_name, phone, email, license_expiry, carter_cert_expiry, insurance_expiry, status) VALUES
('John', 'Smith', '+1 (555) 123-4567', 'john.smith@example.com', '2024-12-15', '2025-03-20', '2024-11-30', 'active'),
('Maria', 'Garcia', '+1 (555) 987-6543', 'maria.garcia@example.com', '2025-06-10', '2025-08-15', '2025-01-22', 'active'),
('David', 'Johnson', '+1 (555) 456-7890', 'david.johnson@example.com', '2024-10-05', '2024-09-30', '2024-12-08', 'inactive')
ON CONFLICT (email) DO NOTHING;