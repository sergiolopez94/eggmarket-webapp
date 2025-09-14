# Egg Market Custom Solutions Webapp - Final PRD

## 1. Executive Summary

Internal business webapp for egg market operations: **dashboard**, **user management**, **document management (carters)**, sales orders, and route planning. Built with **Supabase-first** architecture for rapid development.

## 2. Tech Stack (Supabase-First)

- **Framework**: Next.js (ShipFa.st boilerplate)
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth with Google SSO
- **UI**: ShadCN components with Neutral + Blue theme
- **Storage**: Supabase Storage for documents
- **Real-time**: Supabase real-time subscriptions

## 3. Priority Features (Easiest First)

### 🎯 **Phase 1: Core Foundation (Weeks 1-3)**

#### 3.1 General Dashboard
- **Company-aware** landing page after login
- **Role-based** content (Admin sees user management, others see operations)
- **Quick stats**: Total documents, expiring soon, recent orders
- **Navigation**: Clean sidebar with role-appropriate menu items
- **Company selector** for multi-company users

#### 3.2 User Management (Admin Only)
- **User list** with roles and company assignments
- **Invite new users** via email (they sign up with Google SSO)
- **Role assignment**: Admin, Manager, Salesperson, Viewer
- **Company assignment** per user
- **Activate/deactivate** users
- **Audit trail** of role changes

#### 3.3 Carters (Document Management)
- **Upload documents** with metadata (name, category, expiration date)
- **File storage** via Supabase Storage
- **Search and filter** documents
- **Expiration tracking** with visual indicators
- **Email notifications** for documents expiring soon
- **Role-based access** (can only see company documents)

## 4. Database Schema (Supabase)

```sql
-- Auth handled by Supabase Auth + users table extension
profiles (
  id: uuid PRIMARY KEY (references auth.users),
  email: text,
  name: text,
  role: text DEFAULT 'viewer',
  company_id: uuid,
  inflow_teammember_id: text,
  is_active: boolean DEFAULT true,
  created_at: timestamp,
  updated_at: timestamp
)

-- Companies
companies (
  id: uuid PRIMARY KEY,
  name: text,
  inflow_api_key: text (encrypted),
  inflow_api_url: text,
  settings: jsonb,
  created_at: timestamp
)

-- Documents (Carters)
documents (
  id: uuid PRIMARY KEY,
  company_id: uuid REFERENCES companies(id),
  name: text,
  file_path: text, -- Supabase Storage path
  file_size: bigint,
  mime_type: text,
  category: text,
  expiration_date: date,
  uploaded_by: uuid REFERENCES profiles(id),
  created_at: timestamp,
  updated_at: timestamp
)
```

## 5. Authentication & Authorization

### Google SSO Flow (Supabase Auth)
1. User clicks "Sign in with Google"
2. Supabase Auth handles Google OAuth
3. User profile created in `profiles` table
4. **First-time users**: Get "viewer" role, no company assignment
5. **Admin notification**: New user signup
6. **Admin assigns**: Company and appropriate role
7. **User gains access**: To company-specific features

### Row Level Security (RLS)
```sql
-- Users can only see profiles from their company
CREATE POLICY "Users can view own company profiles" ON profiles
  FOR SELECT USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Users can only see documents from their company
CREATE POLICY "Users can view own company documents" ON documents
  FOR SELECT USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Admins can manage users (across companies if needed)
CREATE POLICY "Admins can manage users" ON profiles
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
```

## 6. Implementation Phases (Start Easy)

### 🚀 **Phase 1: Foundation (Weeks 1-3)**
**Goal**: Get users logging in and basic functionality working

**Week 1: Supabase Setup**
- Create Supabase project
- Setup Google SSO
- Create database schema with RLS
- Install Supabase client libraries

**Week 2: Authentication & Dashboard**
- Implement Google sign-in flow
- Create protected dashboard layout
- Build basic profile management
- Add company-aware navigation

**Week 3: User Management**
- Admin user list and management
- Role assignment interface
- User invitation flow
- Basic permissions enforcement

### 🎯 **Phase 2: Document Management (Weeks 4-5)**
**Goal**: Complete Carters (document) functionality

**Week 4: File Upload & Storage**
- Supabase Storage setup for documents
- File upload component with drag & drop
- Document metadata forms
- File preview and download

**Week 5: Document Features**
- Search and filtering interface
- Expiration date tracking
- Email notifications (via Supabase Edge Functions)
- Document categories and organization

### 🎯 **Phase 3: Orders & Routes (Weeks 6-10)**
**Goal**: Add business-specific features (later priority)

## 7. Success Criteria (Phase 1)

- ✅ Users can sign in with Google SSO
- ✅ Admins can manage users and assign roles/companies
- ✅ Users see appropriate dashboard based on role
- ✅ Users can upload, search, and manage documents
- ✅ Document expiration tracking works
- ✅ All data properly isolated by company (RLS working)

## 8. Why Start with Dashboard + Users + Carters?

### **Easiest to Build**
- **Dashboard**: Mostly UI, minimal business logic
- **User Management**: Standard CRUD operations
- **Carters**: File upload + basic metadata (well-understood patterns)

### **High Value**
- **Foundation**: Everything else builds on user/auth system
- **Immediate Use**: Teams can start managing documents right away
- **Proof of Concept**: Demonstrates the app works end-to-end

### **Low Risk**
- **No external APIs** needed yet (Inflow comes later)
- **No complex business logic** like route optimization
- **Standard patterns** that are well-documented

## 9. Technical Notes

### Supabase-Only Architecture
- **No MongoDB**: Everything in PostgreSQL
- **No NextAuth**: Use Supabase Auth exclusively
- **No custom API routes**: Use Supabase client libraries
- **Real-time updates**: Via Supabase subscriptions for live user management

### File Structure Focus
```
app/
├── (auth)/              # Auth pages
├── dashboard/           # Main dashboard
├── admin/              # User management (admin only)
├── documents/          # Carters document management
└── components/
    ├── auth/           # Auth-related components
    ├── dashboard/      # Dashboard widgets
    ├── admin/          # User management UI
    └── documents/      # Document upload/management
```

This consolidates everything into one clear PRD focused on **starting with the easiest, highest-value features first**.