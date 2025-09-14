# Product Requirements Document: Egg Market Custom Solutions Webapp

## 1. Executive Summary

The Egg Market Custom Solutions Webapp is a comprehensive business management platform designed to streamline operations for egg market businesses. The system will provide document management, sales order processing, inventory synchronization, multi-company support for teams using Inflow inventory management, intelligent PDF processing via Unstract, and advanced route optimization for delivery logistics.

## 2. Tech Stack

- **Framework**: Next.js (ShipFa.st boilerplate)
- **UI Components**: ShadCN
- **Database**: Supabase
- **Authentication**: NextAuth with multi-company role-based access
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **PDF Processing**: Self-hosted Unstract instance
- **Drag & Drop**: @dnd-kit/core for route management

## 3. Core Features

### 3.1 Carter Database & Document Management
**Purpose**: Centralized document storage with expiration tracking and notifications

**Features**:
- Document upload and categorization
- Expiration date tracking
- Automated email notifications (30, 14, 7, and 1 day before expiration)
- Document versioning and history
- Search and filter capabilities
- Bulk document operations
- Role-based access control

**User Stories**:
- As a manager, I want to upload and categorize important documents
- As a team member, I want to receive notifications when documents are expiring
- As an admin, I want to see all expired documents across companies

### 3.2 Sales Order Management
**Purpose**: Streamlined sales order creation with user context awareness

**Features**:
- User-aware form pre-population
- Product selection from synchronized inventory
- Customer management integration
- Order status tracking
- Automated order numbering
- PDF generation and email delivery
- Order history and search

**User Stories**:
- As a salesperson, I want to quickly create orders knowing which company I'm working for
- As a customer service rep, I want to track order status in real-time
- As a manager, I want to see sales analytics by company and user

### 3.3 Inventory Synchronization
**Purpose**: Real-time product data sync with Inflow inventory system

**Features**:
- Bi-directional Inflow API integration
- Product catalog with stock levels, pricing, and dimensions
- Automated sync scheduling
- Sync status monitoring and error handling
- Product search and filtering
- Price history tracking
- Low stock alerts

**User Stories**:
- As a salesperson, I want to see current stock levels when creating orders
- As an inventory manager, I want to ensure product data is always current
- As a user, I want to be notified when products are out of stock

### 3.4 Multi-Company Management
**Purpose**: Modular system supporting multiple companies with context switching

**Features**:
- Company selection dashboard
- Role-based permissions per company
- Company-specific branding and settings
- Data isolation and security
- Company switching without re-authentication
- Audit trails per company

**User Stories**:
- As a multi-company user, I want to easily switch between companies
- As an admin, I want to manage permissions for each company separately
- As a user, I want to see only relevant data for my selected company

### 3.5 PDF Processing & Data Extraction
**Purpose**: Automated extraction of order data from PDF documents using Unstract

**Features**:
- PDF upload and processing via Unstract API
- Automated data extraction from sales orders, receipts, and invoices
- Structured data output for order creation
- Error handling and manual review workflow
- Processing status tracking
- Batch PDF processing capabilities

**User Stories**:
- As a data entry clerk, I want to upload PDFs and automatically extract order information
- As a manager, I want to review extracted data before order creation
- As a project manager, I want to process multiple PDFs efficiently for route planning

### 3.6 Route Designer & Logistics Management
**Purpose**: Intelligent route planning and truck loading optimization

**Features**:
- Zone and subzone management interface
- Daily route assignment (one zone per day)
- Drag-and-drop order organization by truck
- Truck specification management (capacity, dimensions, carrier assignment)
- Reverse loading order calculation (LIFO - Last In, First Out)
- Automated picking list generation
- PDF generation for warehouse teams
- Route optimization suggestions
- Real-time capacity tracking

**User Stories**:
- As a project manager, I want to create and manage delivery zones
- As a project manager, I want to drag orders between trucks while seeing capacity limits
- As a project manager, I want to generate optimized picking lists for the warehouse
- As a warehouse worker, I want clear picking instructions with proper loading order
- As a carrier, I want to see my truck specifications and daily route assignments

## 4. Database Schema Requirements

### 4.1 Core Tables

#### Users
```sql
- id (uuid, primary key)
- email (varchar, unique)
- name (varchar)
- avatar_url (varchar, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

#### Companies
```sql
- id (uuid, primary key)
- name (varchar)
- logo_url (varchar, nullable)
- inflow_api_key (varchar, encrypted)
- inflow_api_url (varchar)
- settings (jsonb)
- created_at (timestamp)
- updated_at (timestamp)
```

#### User_Company_Roles
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- company_id (uuid, foreign key)
- role (enum: admin, manager, salesperson, viewer)
- is_active (boolean)
- created_at (timestamp)
```

#### Documents
```sql
- id (uuid, primary key)
- company_id (uuid, foreign key)
- name (varchar)
- file_url (varchar)
- category (varchar)
- expiration_date (date, nullable)
- uploaded_by (uuid, foreign key)
- file_size (bigint)
- mime_type (varchar)
- created_at (timestamp)
- updated_at (timestamp)
```

#### Products
```sql
- id (uuid, primary key)
- company_id (uuid, foreign key)
- inflow_product_id (varchar)
- name (varchar)
- sku (varchar)
- description (text, nullable)
- price (decimal)
- stock_quantity (integer)
- dimensions (jsonb, nullable)
- last_synced (timestamp)
- is_active (boolean)
```

#### Sales_Orders
```sql
- id (uuid, primary key)
- company_id (uuid, foreign key)
- order_number (varchar, unique)
- customer_name (varchar)
- customer_email (varchar)
- customer_phone (varchar, nullable)
- created_by (uuid, foreign key)
- status (enum: draft, pending, confirmed, shipped, delivered, cancelled)
- total_amount (decimal)
- notes (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

#### Order_Items
```sql
- id (uuid, primary key)
- order_id (uuid, foreign key)
- product_id (uuid, foreign key)
- quantity (integer)
- unit_price (decimal)
- line_total (decimal)
```

### 4.2 Route Management Tables

#### Zones
```sql
- id (uuid, primary key)
- company_id (uuid, foreign key)
- name (varchar)
- description (text, nullable)
- is_active (boolean)
- created_at (timestamp)
- updated_at (timestamp)
```

#### Subzones
```sql
- id (uuid, primary key)
- zone_id (uuid, foreign key)
- name (varchar)
- postal_codes (text[], nullable)
- coordinates (jsonb, nullable)
- is_active (boolean)
- created_at (timestamp)
```

#### Trucks
```sql
- id (uuid, primary key)
- company_id (uuid, foreign key)
- truck_number (varchar)
- carrier_id (uuid, foreign key to users)
- max_weight (decimal, nullable)
- max_volume (decimal, nullable)
- dimensions (jsonb, nullable)
- license_plate (varchar, nullable)
- is_active (boolean)
- created_at (timestamp)
- updated_at (timestamp)
```

#### Routes
```sql
- id (uuid, primary key)
- company_id (uuid, foreign key)
- route_date (date)
- zone_id (uuid, foreign key)
- status (enum: planning, assigned, in_progress, completed, cancelled)
- created_by (uuid, foreign key)
- created_at (timestamp)
- updated_at (timestamp)
```

#### Route_Assignments
```sql
- id (uuid, primary key)
- route_id (uuid, foreign key)
- truck_id (uuid, foreign key)
- order_id (uuid, foreign key)
- delivery_sequence (integer)
- loading_sequence (integer)
- estimated_delivery_time (timestamp, nullable)
- actual_delivery_time (timestamp, nullable)
- status (enum: assigned, loaded, in_transit, delivered, failed)
```

### 4.3 PDF Processing Tables

#### PDF_Processing_Jobs
```sql
- id (uuid, primary key)
- company_id (uuid, foreign key)
- uploaded_by (uuid, foreign key)
- file_name (varchar)
- file_url (varchar)
- unstract_job_id (varchar, nullable)
- status (enum: uploaded, processing, completed, failed, review_needed)
- extracted_data (jsonb, nullable)
- error_message (text, nullable)
- created_at (timestamp)
- processed_at (timestamp, nullable)
```

#### Extracted_Orders
```sql
- id (uuid, primary key)
- pdf_job_id (uuid, foreign key)
- extracted_data (jsonb)
- confidence_score (decimal, nullable)
- review_status (enum: pending, approved, rejected, modified)
- reviewed_by (uuid, foreign key, nullable)
- sales_order_id (uuid, foreign key, nullable)
- created_at (timestamp)
- reviewed_at (timestamp, nullable)
```

## 5. User Authentication & Authorization

### 5.1 Authentication Flow
1. NextAuth with Google OAuth
2. User registration with email verification
3. Company invitation system
4. Multi-factor authentication (optional)

### 5.2 Authorization Levels
- **Super Admin**: Platform-wide access
- **Company Admin**: Full company access, user management
- **Manager**: Company data access, limited user management
- **Salesperson**: Sales orders, customer data, products (read-only)
- **Viewer**: Read-only access to assigned data

### 5.3 Session Management
- JWT tokens with company context
- Automatic company switching
- Session timeout handling
- Device management

## 6. API Integration Requirements

### 6.1 Inflow Integration
- **Endpoint**: Inflow REST API
- **Authentication**: API Key per company
- **Sync Frequency**: Every 15 minutes for critical data
- **Data Points**:
  - Product catalog
  - Stock levels
  - Pricing
  - Product dimensions
  - Categories

### 6.2 Inflow API Integration
- **Endpoint**: Inflow REST API
- **Authentication**: API Key per company (stored encrypted in companies table)
- **Available Endpoints**:
  - GET /products - Product catalog with stock levels
  - GET /products/{id} - Individual product details
  - GET /inventory - Real-time inventory levels
  - GET /categories - Product categories
  - POST /orders - Create new sales orders (if supported)
- **Sync Frequency**: Every 15 minutes for critical data
- **Data Points**:
  - Product catalog (SKU, name, description, price)
  - Stock levels and availability
  - Product dimensions and specifications
  - Categories and classifications
  - Pricing tiers and currency
- **Error Handling**: Exponential backoff retry, fallback to cached data

### 6.3 Unstract Integration (Future Phase)
> **Implementation Note**: Webhooks will be provided after Unstract instance setup
- **Endpoint**: Self-hosted Unstract instance
- **Authentication**: API Key authentication
- **Processing Types**:
  - Sales order PDFs
  - Receipt processing
  - Invoice data extraction
  - Custom document templates
- **Webhook Integration**: Real-time processing notifications
- **Output Format**: Structured JSON with confidence scores
- **Error Handling**: Retry logic and manual review workflow

### 6.4 Notification System
- **Email Provider**: Resend (via ShipFa.st)
- **Triggers**:
  - Document expiration warnings
  - Order status updates
  - Low stock alerts
  - PDF processing completion
  - Route assignment notifications
  - System notifications

## 7. User Experience Requirements

### 7.1 Dashboard
- Company selection with visual indicators
- Quick access to recent orders and documents
- Key metrics and alerts
- Activity feed
- Daily route overview
- PDF processing queue status
- Truck utilization metrics

### 7.2 Route Designer Interface
- Interactive zone/subzone map view
- Drag-and-drop order assignment
- Real-time truck capacity indicators
- Visual loading sequence display
- Automated conflict detection
- Mobile-responsive for field use

### 7.3 Responsive Design
- Mobile-first approach
- Tablet optimization for sales teams
- Desktop power-user features
- Progressive Web App capabilities

### 7.4 Performance
- Page load times < 2 seconds
- Real-time updates via WebSockets
- Optimistic UI updates
- Offline capability for critical functions

## 8. Warehouse Integration Workflow

### 8.1 PDF Processing to Route Assignment Flow
1. **PDF Upload**: Project manager uploads PDFs containing sales orders
2. **Unstract Processing**: PDFs sent to self-hosted Unstract instance for data extraction
3. **Data Validation**: Extracted order data reviewed and validated
4. **Order Creation**: Approved data automatically creates sales orders in system
5. **Route Planning**: Orders appear in route designer for daily assignment
6. **Truck Assignment**: Project manager drags orders to appropriate trucks
7. **Loading Optimization**: System calculates reverse loading order (LIFO)
8. **Picking List Generation**: Automated PDF creation for warehouse teams
9. **Warehouse Distribution**: Picking lists printed and distributed to fulfillment teams

### 8.2 Picking List PDF Structure
- **Header**: Route date, truck number, carrier name, total orders
- **Loading Instructions**: Reverse order sequence (last delivery loaded first)
- **Order Details**:
  - Customer name and delivery address
  - Product list with quantities and SKUs
  - Special handling instructions
  - Delivery sequence number
- **Cross-Reference**: Order number for warehouse verification
- **Footer**: Total weight, volume, and piece count

### 8.3 Warehouse Workflow Integration
- **Pre-picking**: Warehouse receives picking lists 24 hours in advance
- **Staging**: Products organized by loading sequence
- **Quality Control**: Physical products matched against printed orders
- **Loading**: Truck loaded according to delivery sequence (reverse order)
- **Verification**: Each order cross-referenced with picking list before loading
- **Documentation**: Picking lists attached to orders for driver reference

## 9. Security Requirements

- Row-level security (RLS) in Supabase
- Data encryption at rest and in transit
- API rate limiting
- Input validation and sanitization
- CORS configuration
- Regular security audits
- Unstract instance security hardening
- PDF processing sandboxing

## 10. Deployment & Monitoring

### 10.1 Deployment
- Vercel for frontend hosting
- Supabase for database and backend services
- CDN for static assets
- Environment-based configurations

### 10.2 Monitoring
- Error tracking (Sentry)
- Performance monitoring
- Database query optimization
- User activity analytics
- API usage monitoring

## 11. Success Metrics

- **Adoption**: 90% of team members actively using the system
- **Efficiency**: 50% reduction in order processing time
- **Compliance**: 100% document expiration tracking
- **Accuracy**: 95% inventory sync accuracy
- **Performance**: < 2 second average page load time

## 12. Implementation Phases

### Phase 0: Project Setup (Week 1)
- **ShipFa.st Installation**:
  - Purchase and download ShipFa.st boilerplate
  - Initial project setup and configuration
  - Environment variable configuration (.env.local)
  - Basic Next.js app structure verification
- **GitHub Repository Setup**:
  - Create GitHub repository for version control
  - Initialize git repository with proper .gitignore
  - Setup branch protection rules (main branch)
  - Configure GitHub Actions for CI/CD (optional)
- **Webapp Folder Structure**:
  ```
  eggmarket-webapp/
  ├── app/                    # Next.js App Router pages
  ├── components/             # Reusable React components
  ├── lib/                    # Utility functions and configurations
  ├── models/                 # Database models and types
  ├── hooks/                  # Custom React hooks
  ├── styles/                 # Global styles and Tailwind config
  ├── public/                 # Static assets
  ├── supabase/              # Database migrations and types
  ├── docs/                  # Project documentation
  └── tests/                 # Test files
  ```
- **Development Environment**:
  - Node.js 18.17+ installation verification
  - Package manager setup (npm/yarn)
  - IDE configuration and extensions
  - Local development server setup

### Phase 1: Foundation (Weeks 2-4)
- **Supabase Integration**:
  - Supabase project creation and configuration
  - Database schema implementation
  - Row-level security (RLS) policies setup
  - Authentication integration with NextAuth
- **Core Authentication**:
  - Google OAuth setup
  - User registration and login flows
  - Company management system
  - Role-based access control implementation
- **Basic UI Framework**:
  - ShadCN component library integration
  - Tailwind CSS configuration
  - Basic layout and navigation components
  - Responsive design foundation

### Phase 2: Core Features (Weeks 5-8)
- **Document Management System**:
  - File upload functionality
  - Document categorization and metadata
  - Expiration tracking system
  - Search and filter capabilities
- **Sales Order Management**:
  - Order creation forms with user context
  - Customer management integration
  - Order status tracking
  - Basic order history and search
- **Product Catalog**:
  - Product display and search interface
  - Stock level indicators
  - Price and dimension display
  - Basic inventory management UI

### Phase 3: API Integrations (Weeks 9-12)
- **Inflow API Integration**:
  - API client setup and authentication
  - Product synchronization implementation
  - Real-time stock level updates
  - Error handling and retry logic
  - Sync status monitoring dashboard
- **Notification System**:
  - Email notification setup (Resend)
  - Document expiration alerts
  - Order status notifications
  - System alert framework
- **Advanced Order Features**:
  - Product selection from Inflow inventory
  - Real-time availability checking
  - Order validation and processing
  - PDF generation for orders

### Phase 4: Route Designer (Weeks 13-16)
- **Zone Management**:
  - Zone and subzone creation interface
  - Geographic mapping integration (optional)
  - Zone assignment and management
- **Truck Management**:
  - Truck specification database
  - Carrier assignment system
  - Capacity and dimension tracking
- **Route Planning Interface**:
  - Drag-and-drop order assignment
  - Real-time capacity calculations
  - Visual truck loading interface
  - Conflict detection and warnings
- **Picking List Generation**:
  - LIFO loading calculation
  - PDF generation for warehouse
  - Print-friendly formatting
  - Batch processing capabilities

### Phase 5: Unstract Integration (Weeks 17-20)
> **Note**: This phase begins after Unstract instance is configured and webhooks are provided
- **PDF Processing Workflow**:
  - Webhook endpoint setup for Unstract
  - PDF upload and processing interface
  - Data extraction validation system
  - Error handling and manual review process
- **Order Import Automation**:
  - Extracted data to order conversion
  - Duplicate detection and handling
  - Batch processing capabilities
  - Processing status tracking

### Phase 6: Optimization & Launch (Weeks 21-24)
- **Performance Optimization**:
  - Database query optimization
  - Frontend performance tuning
  - Caching implementation
  - Load testing and optimization
- **Security & Testing**:
  - Security audit and hardening
  - Comprehensive testing suite
  - User acceptance testing
  - Bug fixes and refinements
- **Production Deployment**:
  - Production environment setup
  - Deployment pipeline configuration
  - Monitoring and logging setup
  - Go-live and user training

## 13. Risk Assessment

- **High Risk**: Inflow API reliability and rate limits, Unstract self-hosting complexity
- **Medium Risk**: Data migration complexity, Route optimization algorithm accuracy
- **Low Risk**: User adoption (with proper training), PDF processing accuracy

## 14. Future Enhancements

- Advanced analytics and reporting
- Mobile app development
- Integration with accounting systems
- AI-powered route optimization
- Real-time GPS tracking integration
- Customer delivery notifications
- Automated capacity planning
- Machine learning for delivery time prediction
- Customer portal
- Multi-language support
- Integration with warehouse management systems
- Barcode scanning for order verification