# File Data Extraction Service - PRD

## 1. Executive Summary

Intelligent document data extraction service to automatically extract structured information from images and PDFs using OCR/text extraction combined with OpenAI parsing. This replaces the overengineered Unstract solution with a lightweight, modular approach that auto-populates document fields like expiration dates, license numbers, and other key information.

## 2. Problem Statement

### Current State
- Users manually enter document expiration dates and other metadata when uploading carter documents
- No automatic data extraction from uploaded license images, certificates, or insurance documents
- Prone to human error in data entry
- Time-consuming manual process
- Previous Unstract integration was overengineered and CPU-intensive

### Target State
- Automatic extraction of key data points from uploaded documents
- Auto-population of expiration dates, license numbers, and other structured data
- Configurable templates for different document types
- Seamless integration with existing carter document upload flow
- Lightweight, fast, and cost-effective solution

## 3. Tech Stack & Architecture

### Core Technologies
- **OCR Engine**: Google Cloud Vision API for superior accuracy and reliability
- **PDF Text Extraction**: PDF.js or pdf-parse npm package
- **AI Parsing**: OpenAI GPT-4o-mini for structured data extraction
- **File Processing**: Server-side API routes in Next.js
- **Async Processing**: Supabase Edge Functions for background processing
- **Real-time Updates**: WebSocket/Server-Sent Events for instant UI feedback
- **Job Queue**: Supabase database for extraction job management
- **Storage**: Existing Supabase Storage buckets

### Architecture Components
```
Frontend File Upload → API Route → Extraction Queue → Background Processor → Database Update
        ↓                 ↓             ↓                     ↓
   Immediate UI      Queue Job     Google Cloud Vision    WebSocket Push
    Response        (Supabase)        + OpenAI           to Frontend
                                    (Edge Function)
```

### Async Processing Flow
```
1. User uploads file → Immediate response with extractionId
2. File queued for processing → UI shows "Processing..." state
3. Background service processes → Real-time updates via WebSocket
4. OCR extraction complete → UI updates with progress
5. AI parsing complete → Form fields auto-populate
6. Final validation → User confirms extracted data

Total time: 3-7 seconds (feels instant with real-time feedback)
```

## 4. Document Type Templates

### 4.1 Driver's License Template
```json
{
  "documentType": "license",
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
}
```

### 4.2 Carter Certificate Template
```json
{
  "documentType": "carter_cert",
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
}
```

### 4.3 Insurance Document Template
```json
{
  "documentType": "insurance",
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
}
```

## 5. Implementation Phases

### 🚀 **Phase 1: Core Infrastructure (Week 1)**
**Goal**: Set up basic file processing and OpenAI integration

#### Week 1 Tasks:
- Create API routes for document processing (`/api/extract-data`)
- Set up extraction job queue system in Supabase
- Set up Google Cloud Vision API client with authentication
- Set up OpenAI client with proper error handling
- Create Supabase Edge Function for background processing
- Implement WebSocket/SSE for real-time updates
- Create base document processor class
- Implement file type detection (image vs PDF)
- Create basic text extraction for PDFs using pdf-parse
- Create template system for different document types

**Deliverables**:
- Working async API endpoint with immediate response
- Background processing pipeline with real-time updates
- Google Cloud Vision API integration for high-accuracy OCR
- OpenAI integration for structured data parsing
- Template configuration system
- Job queue management system

### 🎯 **Phase 2: License Processing (Week 2)**
**Goal**: Complete auto-extraction for driver's licenses

#### Week 2 Tasks:
- Implement license template processing with async workflow
- Create OpenAI prompts for license data extraction
- Add validation for extracted dates and license numbers
- Update carter creation flow to use real-time auto-extraction
- Implement progressive field population as data becomes available
- Add fallback to manual entry if extraction fails
- Implement confidence scoring for extracted data
- Add user confirmation UI with processing indicators
- Create retry mechanisms for failed background jobs

**Deliverables**:
- Real-time auto-population of license expiration dates
- Progressive UI updates during extraction process
- Manual override capability with confidence indicators
- Error handling and user feedback
- Reliable background processing with retries

### 🎯 **Phase 3: Multi-Document Support (Week 3)**
**Goal**: Extend to carter certificates and insurance documents

#### Week 3 Tasks:
- Implement carter certificate template processing with async workflow
- Implement insurance document template processing with async workflow
- Create unified extraction workflow for all document types
- Add parallel processing capability for multiple documents
- Implement extraction result storage and audit trail
- Add analytics for extraction accuracy and processing times
- Performance optimization for large files and high volume
- Create admin dashboard for monitoring extraction queue

**Deliverables**:
- Complete async auto-extraction for all three document types
- Parallel processing of multiple document types
- Extraction history and audit trail
- Performance metrics and monitoring dashboard
- Queue health monitoring and alerting

### 🎯 **Phase 4: Advanced Features (Week 4)**
**Goal**: Enhanced capabilities and integration

#### Week 4 Tasks:
- Add real-time extraction feedback in upload UI
- Implement extraction confidence indicators
- Add manual correction workflow
- Create extraction analytics dashboard
- Add document validation against extracted data
- Implement retry mechanisms for failed extractions
- Add support for additional document types (future expansion)

**Deliverables**:
- Production-ready extraction service
- Admin analytics dashboard
- Robust error handling and recovery

## 6. Database Schema Updates

### 6.1 New Tables

```sql
-- Extraction job queue
CREATE TABLE extraction_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carter_id uuid REFERENCES carters(id),
  document_type text NOT NULL,
  file_path text NOT NULL,
  user_id uuid REFERENCES profiles(id),
  status text DEFAULT 'queued', -- queued, processing, completed, failed, retrying
  priority integer DEFAULT 1,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  scheduled_at timestamp DEFAULT now(),
  started_at timestamp,
  completed_at timestamp,
  error_message text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Document extraction results
CREATE TABLE document_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES extraction_jobs(id),
  carter_id uuid REFERENCES carters(id),
  document_type text NOT NULL,
  file_path text NOT NULL,
  extracted_data jsonb,
  confidence_score numeric(3,2),
  extraction_status text DEFAULT 'processing',
  processing_time_ms integer,
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
  extraction_id uuid REFERENCES document_extractions(id),
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  user_id uuid REFERENCES profiles(id),
  created_at timestamp DEFAULT now()
);
```

### 6.2 Carter Table Updates

```sql
-- Add extraction metadata to carters table
ALTER TABLE carters ADD COLUMN license_extraction_id uuid REFERENCES document_extractions(id);
ALTER TABLE carters ADD COLUMN cert_extraction_id uuid REFERENCES document_extractions(id);
ALTER TABLE carters ADD COLUMN insurance_extraction_id uuid REFERENCES document_extractions(id);

-- Add auto-extracted flags
ALTER TABLE carters ADD COLUMN license_auto_extracted boolean DEFAULT false;
ALTER TABLE carters ADD COLUMN cert_auto_extracted boolean DEFAULT false;
ALTER TABLE carters ADD COLUMN insurance_auto_extracted boolean DEFAULT false;
```

## 7. API Design

### 7.1 Async Document Processing Endpoints

```typescript
// POST /api/extract-data (Immediate response)
interface ExtractionRequest {
  file: File;
  documentType: 'license' | 'carter_cert' | 'insurance';
  carterId?: string;
}

interface ExtractionResponse {
  success: boolean;
  jobId: string;
  extractionId: string;
  status: 'queued';
  estimatedTime: string; // "3-7 seconds"
  websocketUrl?: string;
}

// GET /api/extractions/:jobId (Polling endpoint)
interface ExtractionStatus {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: {
    step: 'ocr' | 'parsing' | 'validation';
    message: string;
  };
  extractedData?: {
    [key: string]: any;
  };
  confidenceScore?: number;
  error?: string;
}

// WebSocket: /api/extractions/stream
interface WebSocketUpdate {
  jobId: string;
  type: 'status_update' | 'progress' | 'completed' | 'error';
  data: {
    status?: string;
    progress?: number;
    extractedData?: any;
    error?: string;
  };
}
```

### 7.2 Template Management

```typescript
// GET /api/extraction-templates/:documentType
// POST /api/extraction-templates
// PUT /api/extraction-templates/:id
```

## 8. Service Architecture

### 8.1 Core Service Classes

```typescript
// lib/services/document-extraction/
├── ExtractionOrchestrator.ts     // Main async coordinator
├── queue/
│   ├── JobQueue.ts              // Job management and scheduling
│   ├── JobProcessor.ts          // Background job processing
│   └── RetryHandler.ts          // Failed job retry logic
├── extractors/
│   ├── GoogleVisionExtractor.ts // Google Cloud Vision OCR
│   ├── PDFExtractor.ts          // Text extraction from PDFs
│   └── BaseExtractor.ts         // Base extractor interface
├── parsers/
│   ├── OpenAIParser.ts          // AI-powered parsing
│   └── TemplateParser.ts        // Template-based parsing
├── templates/
│   ├── LicenseTemplate.ts       // License-specific logic
│   ├── CertificateTemplate.ts   // Certificate-specific logic
│   └── InsuranceTemplate.ts     // Insurance-specific logic
├── realtime/
│   ├── WebSocketManager.ts      // Real-time update management
│   └── ProgressTracker.ts       // Extraction progress tracking
└── utils/
    ├── DateParser.ts            // Date normalization
    ├── ValidationUtils.ts       // Data validation
    └── ConfidenceCalculator.ts  // Confidence scoring
```

### 8.2 Integration Points

1. **File Upload Integration**
   - Extend existing FileUpload component with async extraction capability
   - Add real-time extraction status indicators
   - Show progressive field population as data becomes available
   - WebSocket connection for instant updates

2. **Carter Form Integration**
   - Real-time pre-population of fields as extraction completes
   - Progressive confidence indicators for each field
   - Allow manual override of auto-extracted values
   - Seamless fallback to manual entry on extraction failure

3. **Background Processing Integration**
   - Supabase Edge Functions for scalable processing
   - Job queue management for reliable extraction
   - Automatic retry mechanisms for failed jobs
   - Dead letter queue for persistently failed extractions

4. **Storage Integration**
   - Use existing Supabase storage structure
   - Store extraction results alongside original files
   - Maintain audit trail of all processing attempts
   - Queue persistence for reliability

## 9. OpenAI Integration

### 9.1 Prompt Engineering

```typescript
const LICENSE_EXTRACTION_PROMPT = `
You are a document data extraction specialist. Extract the following information from this driver's license text:

1. License Number
2. Expiration Date (format as YYYY-MM-DD)
3. First Name
4. Last Name
5. Date of Birth (format as YYYY-MM-DD)

Text to analyze:
{extractedText}

Return only a JSON object with the extracted data. If a field cannot be found, use null:
{
  "licenseNumber": "string or null",
  "expirationDate": "YYYY-MM-DD or null",
  "firstName": "string or null",
  "lastName": "string or null",
  "dateOfBirth": "YYYY-MM-DD or null"
}
`;
```

### 9.2 Error Handling & Retries

- Implement exponential backoff for Google Cloud Vision API calls
- Handle API quotas and rate limiting gracefully
- Fallback to manual entry on repeated failures
- Store failed extractions for retry processing
- Monitor API costs and usage patterns

## 10. User Experience Flow

### 10.1 Enhanced Async Upload Flow

1. **File Upload**: User uploads document via FileUpload component
2. **Immediate Response**: UI shows "Processing..." with estimated time (3-7 seconds)
3. **Real-time Updates**: WebSocket provides live progress updates
   - "Extracting text from document..." (1-3 seconds)
   - "Analyzing document structure..." (2-4 seconds)
   - "Populating form fields..." (instant)
4. **Progressive Population**: Form fields populate as data becomes available
5. **Confidence Indicators**: Show confidence scores for each auto-filled field
6. **Review & Confirm**: User reviews and can modify extracted data
7. **Save**: Submit form with extracted/confirmed data

**User Experience Timeline:**
- 0s: Upload complete, "Processing..." appears
- 1-3s: "Text extracted, analyzing..."
- 3-7s: Fields start populating with extracted data
- User feels like it happened "almost instantly"

### 10.2 Error Scenarios

- **Extraction Failed**: Show error message with retry option, seamless fallback to manual entry
- **Processing Timeout**: Automatic retry in background, user can continue manually
- **Low Confidence**: Highlight fields requiring review with confidence indicators
- **Missing Data**: Show which fields couldn't be extracted, pre-fill what was found
- **Invalid Dates**: Validate and request correction with suggestions
- **Queue Overload**: Show longer estimated time, prioritize user's jobs
- **API Failures**: Automatic retry with exponential backoff, transparent error handling

## 11. Success Criteria

### Phase 1 Success Metrics:
- ✅ Async API endpoint with immediate response and job queuing
- ✅ Background processing with Supabase Edge Functions
- ✅ Real-time updates via WebSocket/SSE working reliably
- ✅ Google Cloud Vision API integration for high-accuracy OCR
- ✅ OpenAI integration extracts structured data
- ✅ Template system configurable for different document types
- ✅ Job queue management with retry mechanisms
- ✅ Basic error handling and fallback mechanisms

### Phase 2 Success Metrics:
- ✅ License expiration dates auto-extracted with >95% accuracy
- ✅ Real-time progressive field population working smoothly
- ✅ Processing completes within 3-7 seconds consistently
- ✅ Manual override capability with confidence indicators
- ✅ User-friendly async confirmation flow implemented
- ✅ Extraction failures handled gracefully with automatic retries

### Phase 3 Success Metrics:
- ✅ All three document types (license, certificate, insurance) supported
- ✅ Parallel processing capability for multiple documents simultaneously
- ✅ Queue health monitoring and admin dashboard
- ✅ Audit trail and extraction history with processing times
- ✅ Performance acceptable for high-volume processing

### Phase 4 Success Metrics:
- ✅ Real-time extraction feedback with progress indicators
- ✅ Analytics dashboard for extraction accuracy and queue performance
- ✅ Production-ready with comprehensive monitoring and alerts
- ✅ Dead letter queue handling for failed extractions
- ✅ Extensible architecture for future document types

## 12. Technical Considerations

### 12.1 Performance
- **Async Processing**: All extraction happens in background, UI never blocks
- **Real-time Updates**: WebSocket provides instant feedback, feels immediate to users
- **Parallel Processing**: Handle multiple documents simultaneously
- **Caching**: Implement caching for repeated extractions to reduce API costs
- **Google Cloud Vision**: Consistent 1-3 second OCR performance
- **Edge Functions**: Supabase Edge Functions handle scaling automatically
- **No Local Processing**: Zero CPU-intensive operations on main server
- **Queue Optimization**: Intelligent job scheduling and priority handling

### 12.2 Security
- Validate file types and sizes before processing
- Secure Google Cloud Vision API credentials using environment variables
- Sanitize extracted text before sending to OpenAI
- Store sensitive data securely in Supabase
- Implement rate limiting on extraction endpoints

### 12.3 Cost Management
- Monitor Google Cloud Vision API usage (~$1.50/1000 documents)
- Monitor OpenAI token usage
- Implement smart text preprocessing to reduce tokens
- Cache extraction results to avoid reprocessing
- Set up cost alerts and usage monitoring for both APIs

### 12.4 Scalability
- **Async Architecture**: Designed from ground up for massive scalability
- **Queue System**: Handle thousands of concurrent extraction jobs
- **Edge Functions**: Supabase handles auto-scaling of processing workers
- **Parallel Processing**: Process multiple documents per user simultaneously
- **Google Cloud Vision**: API handles unlimited concurrent requests
- **Database Queue**: Persistent job storage survives server restarts
- **Horizontal Scaling**: Add more Edge Function workers as needed
- **Load Balancing**: Distribute processing across multiple regions

## 13. Migration Strategy

### 13.1 Existing Data
- Current carter documents remain unchanged
- New extractions only apply to newly uploaded documents
- Option to reprocess existing documents (Phase 4)

### 13.2 Rollout Plan
1. **Development**: Build and test on file-data-extraction branch
2. **Staging**: Deploy to staging environment for testing
3. **Beta**: Enable for admin users only
4. **Gradual Rollout**: Enable for all users with feature flag
5. **Full Production**: Remove feature flags after successful testing

## 14. Monitoring & Analytics

### 14.1 Key Metrics
- **Extraction Performance**:
  - Success rate by document type (target: >95%)
  - Average confidence scores from Google Cloud Vision
  - End-to-end processing time (target: 3-7 seconds)
  - Queue processing latency and throughput
- **User Experience**:
  - User override frequency (lower is better)
  - Time to first field population
  - WebSocket connection reliability
  - User satisfaction with "instant" feel
- **System Health**:
  - Queue depth and processing rate
  - Failed job retry success rate
  - Edge Function performance and scaling
- **Cost Management**:
  - Google Cloud Vision API usage and costs
  - OpenAI token usage and costs
  - Cost per successful extraction

### 14.2 Alerting
- **Queue Health**:
  - Queue depth exceeding capacity (>100 pending jobs)
  - Processing time exceeding SLA (>10 seconds)
  - Dead letter queue accumulating failed jobs
- **API Health**:
  - High Google Cloud Vision API error rates (>5%)
  - High OpenAI API error rates (>5%)
  - WebSocket connection failures affecting real-time updates
- **Cost Management**:
  - Daily API costs exceeding budget thresholds
  - Unusual spike in extraction volume
- **System Performance**:
  - Edge Function cold starts affecting performance
  - Database connection issues with job queue

## 15. Future Enhancements

### Phase 5+ Considerations:
- Support for additional document types (permits, registrations)
- Multi-language document support (Google Cloud Vision supports 50+ languages)
- Advanced document layout analysis using Google Cloud Vision Document AI
- Integration with government databases for validation
- Mobile app camera integration for document capture
- Custom model training for domain-specific documents

---

This PRD provides a comprehensive roadmap for implementing a modular, efficient file data extraction service using Google Cloud Vision API for superior OCR accuracy. This solution replaces the overengineered Unstract approach while integrating seamlessly with the existing egg market webapp architecture at minimal cost (~$1.50/1000 documents).