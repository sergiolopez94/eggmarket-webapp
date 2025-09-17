-- Migration: Make carter expiry dates nullable
-- This allows progressive form completion with just basic info + license file

-- Make expiry date fields nullable to support progressive form completion
ALTER TABLE carters
ALTER COLUMN license_expiry DROP NOT NULL,
ALTER COLUMN carter_cert_expiry DROP NOT NULL,
ALTER COLUMN insurance_expiry DROP NOT NULL;

-- Update the default status to 'inactive' to match form logic
-- (Carters should be inactive until all required info is complete)
ALTER TABLE carters
ALTER COLUMN status SET DEFAULT 'inactive';