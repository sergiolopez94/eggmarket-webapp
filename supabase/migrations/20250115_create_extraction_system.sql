-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extraction job queue
CREATE TABLE extraction_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carter_id uuid REFERENCES carters(id),
  document_type text NOT NULL CHECK (document_type IN ('license', 'carter_cert', 'insurance')),
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  user_id uuid REFERENCES profiles(id),
  status text DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'retrying')),
  priority integer DEFAULT 1,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  scheduled_at timestamp DEFAULT now(),
  started_at timestamp,
  completed_at timestamp,
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Document extraction results
CREATE TABLE document_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES extraction_jobs(id) ON DELETE CASCADE,
  carter_id uuid REFERENCES carters(id),
  document_type text NOT NULL,
  file_path text NOT NULL,
  extracted_data jsonb,
  confidence_score numeric(3,2),
  extraction_status text DEFAULT 'processing' CHECK (extraction_status IN ('processing', 'completed', 'failed')),
  processing_time_ms integer,
  ocr_text text,
  error_message text,
  processed_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Extraction templates
CREATE TABLE extraction_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL UNIQUE,
  template_config jsonb NOT NULL,
  version integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Extraction audit log
CREATE TABLE extraction_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extraction_id uuid REFERENCES document_extractions(id) ON DELETE CASCADE,
  job_id uuid REFERENCES extraction_jobs(id) ON DELETE CASCADE,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  user_id uuid REFERENCES profiles(id),
  created_at timestamp DEFAULT now()
);

-- Add extraction metadata to carters table
ALTER TABLE carters ADD COLUMN IF NOT EXISTS license_extraction_id uuid REFERENCES document_extractions(id);
ALTER TABLE carters ADD COLUMN IF NOT EXISTS cert_extraction_id uuid REFERENCES document_extractions(id);
ALTER TABLE carters ADD COLUMN IF NOT EXISTS insurance_extraction_id uuid REFERENCES document_extractions(id);

-- Add auto-extracted flags
ALTER TABLE carters ADD COLUMN IF NOT EXISTS license_auto_extracted boolean DEFAULT false;
ALTER TABLE carters ADD COLUMN IF NOT EXISTS cert_auto_extracted boolean DEFAULT false;
ALTER TABLE carters ADD COLUMN IF NOT EXISTS insurance_auto_extracted boolean DEFAULT false;

-- Indexes for performance
CREATE INDEX idx_extraction_jobs_status ON extraction_jobs(status);
CREATE INDEX idx_extraction_jobs_scheduled_at ON extraction_jobs(scheduled_at);
CREATE INDEX idx_extraction_jobs_carter_id ON extraction_jobs(carter_id);
CREATE INDEX idx_extraction_jobs_user_id ON extraction_jobs(user_id);

CREATE INDEX idx_document_extractions_job_id ON document_extractions(job_id);
CREATE INDEX idx_document_extractions_carter_id ON document_extractions(carter_id);
CREATE INDEX idx_document_extractions_document_type ON document_extractions(document_type);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_extraction_jobs_updated_at BEFORE UPDATE ON extraction_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_extractions_updated_at BEFORE UPDATE ON document_extractions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_extraction_templates_updated_at BEFORE UPDATE ON extraction_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE extraction_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only see their own extraction jobs
CREATE POLICY "Users can view own extraction jobs" ON extraction_jobs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own extraction jobs" ON extraction_jobs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own extraction jobs" ON extraction_jobs
  FOR UPDATE USING (user_id = auth.uid());

-- Users can only see extractions from their company
CREATE POLICY "Users can view company extractions" ON document_extractions
  FOR SELECT USING (
    carter_id IN (
      SELECT c.id FROM carters c
      JOIN profiles p ON p.company_id = (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Extraction templates are readable by all authenticated users
CREATE POLICY "Authenticated users can view templates" ON extraction_templates
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can modify templates
CREATE POLICY "Admins can manage templates" ON extraction_templates
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Audit log is viewable by admins and users for their own extractions
CREATE POLICY "Users can view own audit logs" ON extraction_audit_log
  FOR SELECT USING (
    user_id = auth.uid() OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Insert default extraction templates
INSERT INTO extraction_templates (document_type, template_config) VALUES
(
  'license',
  '{
    "extractionFields": {
      "licenseNumber": {
        "type": "string",
        "patterns": ["license", "dl", "number", "#"],
        "required": true
      },
      "expirationDate": {
        "type": "date",
        "patterns": ["exp", "expires", "expiration", "valid until"],
        "required": true,
        "format": ["MM/DD/YYYY", "MM-DD-YYYY", "YYYY-MM-DD"]
      },
      "firstName": {
        "type": "string",
        "patterns": ["first name", "given name"],
        "required": false
      },
      "lastName": {
        "type": "string",
        "patterns": ["last name", "surname", "family name"],
        "required": false
      },
      "dateOfBirth": {
        "type": "date",
        "patterns": ["dob", "date of birth", "born"],
        "required": false
      }
    }
  }'::jsonb
),
(
  'carter_cert',
  '{
    "extractionFields": {
      "certificateNumber": {
        "type": "string",
        "patterns": ["cert", "certificate", "number", "#"],
        "required": true
      },
      "expirationDate": {
        "type": "date",
        "patterns": ["exp", "expires", "expiration", "valid until"],
        "required": true,
        "format": ["MM/DD/YYYY", "MM-DD-YYYY", "YYYY-MM-DD"]
      },
      "issueDate": {
        "type": "date",
        "patterns": ["issued", "issue date", "date issued"],
        "required": false
      },
      "authority": {
        "type": "string",
        "patterns": ["issued by", "authority", "department"],
        "required": false
      }
    }
  }'::jsonb
),
(
  'insurance',
  '{
    "extractionFields": {
      "policyNumber": {
        "type": "string",
        "patterns": ["policy", "number", "#"],
        "required": true
      },
      "expirationDate": {
        "type": "date",
        "patterns": ["exp", "expires", "expiration", "valid until", "policy period"],
        "required": true,
        "format": ["MM/DD/YYYY", "MM-DD-YYYY", "YYYY-MM-DD"]
      },
      "effectiveDate": {
        "type": "date",
        "patterns": ["effective", "start", "from"],
        "required": false
      },
      "insuranceCompany": {
        "type": "string",
        "patterns": ["insurer", "company", "carrier"],
        "required": false
      },
      "coverageAmount": {
        "type": "string",
        "patterns": ["coverage", "limit", "amount"],
        "required": false
      }
    }
  }'::jsonb
);

-- Function to get next queued job
CREATE OR REPLACE FUNCTION get_next_extraction_job()
RETURNS extraction_jobs AS $$
DECLARE
  job_record extraction_jobs;
BEGIN
  SELECT * INTO job_record
  FROM extraction_jobs
  WHERE status = 'queued'
    AND scheduled_at <= NOW()
  ORDER BY priority DESC, scheduled_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF FOUND THEN
    UPDATE extraction_jobs
    SET status = 'processing', started_at = NOW()
    WHERE id = job_record.id;
  END IF;

  RETURN job_record;
END;
$$ LANGUAGE plpgsql;

-- Function to retry failed jobs
CREATE OR REPLACE FUNCTION retry_failed_job(job_id uuid)
RETURNS boolean AS $$
DECLARE
  job_record extraction_jobs;
BEGIN
  SELECT * INTO job_record
  FROM extraction_jobs
  WHERE id = job_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF job_record.retry_count >= job_record.max_retries THEN
    RETURN false;
  END IF;

  UPDATE extraction_jobs
  SET
    status = 'queued',
    retry_count = retry_count + 1,
    scheduled_at = NOW() + INTERVAL '1 minute' * POWER(2, retry_count), -- Exponential backoff
    error_message = NULL
  WHERE id = job_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;