# Product Requirements Document: Egg Market Webapp

## 1. Executive Summary

Simple webapp for egg market operations: document management, sales orders, route planning, and PDF processing. Built with ShipFa.st + Supabase for fast development.

## 2. Tech Stack

- **Framework**: Next.js (ShipFa.st boilerplate)
- **UI**: ShadCN components
- **Database**: Supabase
- **Auth**: NextAuth
- **PDF Processing**: Unstract (later phase)

## 3. Core Features

### 3.1 Document Management
- Upload documents with expiration dates
- Email notifications before expiration
- Simple search and categories

### 3.2 Sales Orders
- Create orders with product selection
- User knows which company they're working for
- Order status tracking
- Role-based permissions (salespeople can create, managers can edit all)

### 3.5 User & Team Management
- Admin dashboard for managing team members
- Invite users via email with specific roles
- Sync with Inflow team member IDs
- Deactivate/reactivate users
- Role-based access control throughout app

### 3.3 Route Planning
- Drag orders to trucks
- LIFO loading order (first delivery loaded last)
- Generate picking lists for warehouse

### 3.4 PDF Processing (Phase 2)
- Upload PDFs, extract order data via Unstract
- Review extracted data, create orders

## 4. Database Schema

### Core Tables
```sql
-- Users (with role management)
users: id, email, name, role, company_id, inflow_teammember_id, is_active

-- Companies
companies: id, name, inflow_api_key, inflow_api_url

-- Documents
documents: id, company_id, name, file_url, expiration_date, uploaded_by

-- Products (synced from Inflow)
products: id, company_id, inflow_product_id, name, sku, price, stock_quantity

-- Orders
orders: id, company_id, customer_name, status, total_amount, created_by

-- Order Items
order_items: id, order_id, product_id, quantity, unit_price

-- Routes (simple)
routes: id, company_id, route_date, zone_name, created_by

-- Route Orders
route_orders: id, route_id, order_id, truck_number, sequence
```

### User Role System
**Admin**: Full system access, user management, company settings
**Manager**: All operations except user management
**Salesperson**: Create/edit orders, view products, basic route planning
**Viewer**: Read-only access to orders and documents

## 5. Implementation Plan

### Phase 1: Setup (Weeks 1-2)
- ShipFa.st installation + GitHub setup
- Supabase database + auth
- Basic UI with ShadCN

### Phase 2: Core Features (Weeks 3-6)
- User management and role system
- Document upload/management
- Sales order forms with role permissions
- Inflow API integration (products + team members)
- Basic route planning (drag/drop)

### Phase 3: Polish (Weeks 7-8)
- Picking list PDF generation
- Email notifications
- Testing + deployment

### Phase 4: PDF Processing (Weeks 9-10)
- Unstract webhook integration
- PDF upload and processing
- Data extraction to orders

## 6. Key Simplifications Made

**Removed Overengineering**:
- Complex zone/subzone management → Simple zone names
- Elaborate truck specifications → Simple truck numbers
- Advanced analytics → Basic order tracking
- Complex user roles → Company-based access
- Detailed audit trails → Basic timestamps
- Performance monitoring → Standard Next.js metrics

**Streamlined Database**:
- 8 core tables instead of 15+
- Removed unnecessary relationships
- Simplified route management
- Basic user/company structure

**Focused Features**:
- Core document management only
- Essential sales order functionality
- Simple route planning with drag/drop
- PDF processing as separate phase

**Reduced Timeline**:
- 10 weeks instead of 24 weeks
- MVP-focused approach
- Unstract integration as Phase 4 (optional)
- No premature optimization

## 7. Success Criteria

- User management with role-based permissions ✓
- Upload documents with expiration tracking ✓
- Create sales orders with Inflow products ✓
- Plan routes with drag/drop interface ✓
- Generate warehouse picking lists ✓
- Process PDFs to extract orders (Phase 4) ✓

## 8. Internal App Focus

**Removed for Internal Use:**
- Stripe payments (not needed for internal tool)
- Public marketing pages
- Customer-facing features

**Enhanced for Internal Use:**
- Advanced user role management
- Inflow team member synchronization
- Company-specific workflows
- Admin controls and oversight