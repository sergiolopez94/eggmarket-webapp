-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE companies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  inflow_api_key TEXT,
  inflow_api_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'salesperson', 'viewer')),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  inflow_teammember_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table (Carters)
CREATE TABLE documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Supabase Storage path
  file_size BIGINT,
  mime_type TEXT,
  category TEXT,
  expiration_date DATE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security Policies

-- Companies: Users can only see their own company
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company" ON companies
  FOR SELECT USING (
    id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Profiles: Users can see profiles from their company, admins can see all
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company profiles" ON profiles
  FOR SELECT USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Documents: Users can only see documents from their company
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company documents" ON documents
  FOR SELECT USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert documents for own company" ON documents
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own company documents" ON documents
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete own company documents" ON documents
  FOR DELETE USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Functions and Triggers

-- Function to handle user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for development

-- Sample company
INSERT INTO companies (name, settings) VALUES
  ('Demo Egg Company', '{"theme": "blue", "notifications": true}');

-- Sample admin user (will be created when first user signs up)
-- The trigger will handle profile creation