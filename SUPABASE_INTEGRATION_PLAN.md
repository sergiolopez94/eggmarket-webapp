# Supabase Integration Plan: Carters Management

## Overview
This document outlines the step-by-step integration of the Carters Management feature with Supabase database and storage buckets. Currently, the UI is complete but uses mock data. This plan will connect it to a real backend.

## Current State
- ✅ **UI Components**: Complete carters list, profile forms, file upload UI
- ✅ **Form Validation**: React Hook Form + Zod schema validation
- ✅ **Routing**: Dynamic routes for individual carter profiles
- ❌ **Database Integration**: Currently using mock data arrays
- ❌ **File Storage**: Files stored in component state only
- ❌ **Real Data Persistence**: No actual save/update operations

## Phase 1: Database Schema Setup

### 1.1 Create Carters Table
```sql
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
```

### 1.2 Create RLS Policies
```sql
-- Enable RLS
ALTER TABLE carters ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (internal app)
CREATE POLICY "Allow full access for authenticated users" ON carters
FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### 1.3 Create Updated At Trigger
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_carters_updated_at
    BEFORE UPDATE ON carters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 1.4 Insert Sample Data
```sql
INSERT INTO carters (name, last_name, phone, email, license_expiry, carter_cert_expiry, insurance_expiry, status) VALUES
('John', 'Smith', '+1 (555) 123-4567', 'john.smith@example.com', '2024-12-15', '2025-03-20', '2024-11-30', 'active'),
('Maria', 'Garcia', '+1 (555) 987-6543', 'maria.garcia@example.com', '2025-06-10', '2025-08-15', '2025-01-22', 'active'),
('David', 'Johnson', '+1 (555) 456-7890', 'david.johnson@example.com', '2024-10-05', '2024-09-30', '2024-12-08', 'inactive');
```

## Phase 2: Storage Buckets Setup

### 2.1 Create Storage Buckets
```sql
-- Create buckets for document storage
INSERT INTO storage.buckets (id, name, public) VALUES
('carter-licenses', 'carter-licenses', false),
('carter-certificates', 'carter-certificates', false),
('carter-insurance', 'carter-insurance', false);
```

### 2.2 Storage RLS Policies
```sql
-- Allow authenticated users to upload/view their carter documents
CREATE POLICY "Allow authenticated users to upload carter licenses" ON storage.objects
FOR ALL TO authenticated USING (bucket_id = 'carter-licenses');

CREATE POLICY "Allow authenticated users to upload carter certificates" ON storage.objects
FOR ALL TO authenticated USING (bucket_id = 'carter-certificates');

CREATE POLICY "Allow authenticated users to upload carter insurance" ON storage.objects
FOR ALL TO authenticated USING (bucket_id = 'carter-insurance');
```

## Phase 3: API Layer Implementation

### 3.1 Create Supabase Service Functions
**File**: `lib/supabase/carters.ts`
- `getAllCarters()` - Fetch all carters with computed fields
- `getCarterById(id)` - Fetch single carter by ID
- `createCarter(data)` - Create new carter record
- `updateCarter(id, data)` - Update existing carter
- `deleteCarter(id)` - Soft delete carter (set status to inactive)

### 3.2 Create File Storage Service
**File**: `lib/supabase/storage.ts`
- `uploadCarterDocument(file, bucket, carterId, docType)` - Upload document
- `deleteCarterDocument(path, bucket)` - Delete document
- `getDocumentUrl(path, bucket)` - Get signed URL for document

### 3.3 Add TypeScript Types
**File**: `lib/supabase/types.ts`
- Update Database types to include `carters` table
- Create Carter interface matching database schema
- Add file upload types

## Phase 4: Frontend Integration

### 4.1 Replace Mock Data
- Update `app/dashboard/carters/page.tsx` to use `getAllCarters()`
- Update `app/dashboard/carters/[id]/page.tsx` to use `getCarterById()`
- Update `app/dashboard/carters/new/page.tsx` to use `createCarter()`

### 4.2 Add Loading & Error States
- Implement proper loading spinners
- Add error boundaries and error handling
- Show toast notifications for success/error states

### 4.3 File Upload Integration
- Connect `FileUpload` component to Supabase Storage
- Handle upload progress and errors
- Update database with file paths after successful upload
- Implement file deletion when replacing documents

## Phase 5: Advanced Features (Optional)

### 5.1 Real-time Updates
- Add real-time subscriptions to carter data changes
- Implement optimistic updates for better UX
- Add live document status indicators

### 5.2 Document Expiry Notifications
- Create function to check for expiring documents
- Add email notifications (using Resend)
- Create dashboard alerts for expiring documents

### 5.3 Audit Trail
- Create `carter_audit_log` table for tracking changes
- Log all create/update/delete operations
- Add "Last modified by" information

## Implementation Order

1. **Phase 1**: Database schema (can be done via Supabase Dashboard SQL Editor)
2. **Phase 3.1**: Create service functions first
3. **Phase 3.3**: Update TypeScript types
4. **Phase 4.1**: Replace mock data in components
5. **Phase 2**: Storage buckets setup
6. **Phase 3.2**: File storage service
7. **Phase 4.3**: File upload integration
8. **Phase 4.2**: Polish UX with loading states
9. **Phase 5**: Advanced features (optional)

## Migration Strategy

1. **Backward Compatible**: Keep mock data as fallback during development
2. **Feature Flags**: Use environment variables to toggle between mock/real data
3. **Gradual Rollout**: Implement one operation at a time (read → create → update → delete)
4. **Testing**: Thoroughly test each phase before proceeding to the next

## Files to Modify/Create

### New Files:
- `lib/supabase/carters.ts` - Carter service functions
- `lib/supabase/storage.ts` - File storage service
- `supabase/migrations/create_carters_table.sql` - Database migration

### Modified Files:
- `lib/supabase/types.ts` - Add Carter types
- `app/dashboard/carters/page.tsx` - Connect to real data
- `app/dashboard/carters/[id]/page.tsx` - Connect to real data
- `app/dashboard/carters/new/page.tsx` - Connect to real data
- `components/ui/file-upload.tsx` - Add Supabase upload

This plan ensures a systematic, testable approach to integrating the Carters Management system with Supabase while maintaining the existing UI and user experience.