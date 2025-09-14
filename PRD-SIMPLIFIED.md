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
-- Users
users: id, email, name, company_id

-- Companies
companies: id, name, inflow_api_key

-- Documents
documents: id, company_id, name, file_url, expiration_date

-- Products (synced from Inflow)
products: id, company_id, name, sku, price, stock_quantity

-- Orders
orders: id, company_id, customer_name, status, total_amount

-- Order Items
order_items: id, order_id, product_id, quantity, unit_price

-- Routes (simple)
routes: id, company_id, route_date, zone_name

-- Route Orders
route_orders: id, route_id, order_id, truck_number, sequence
```

## 5. Implementation Plan

### Phase 1: Setup (Weeks 1-2)
- ShipFa.st installation + GitHub setup
- Supabase database + auth
- Basic UI with ShadCN

### Phase 2: Core Features (Weeks 3-6)
- Document upload/management
- Sales order forms
- Inflow API integration for products
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

- Upload documents with expiration tracking ✓
- Create sales orders with Inflow products ✓
- Plan routes with drag/drop interface ✓
- Generate warehouse picking lists ✓
- Process PDFs to extract orders (Phase 4) ✓

This simplified PRD focuses on delivering core functionality quickly while maintaining the option to expand later.