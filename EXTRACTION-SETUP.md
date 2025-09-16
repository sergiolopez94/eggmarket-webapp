# File Data Extraction System - Setup Guide

## Phase 1 Implementation Complete ✅

This guide will help you set up the file data extraction system that was just implemented.

## What's Been Built

### 🏗️ **Infrastructure**
- ✅ Database schema with job queue system
- ✅ API routes for async document processing
- ✅ Google Cloud Vision OCR integration
- ✅ OpenAI parsing service
- ✅ Supabase Edge Function for background processing
- ✅ Server-Sent Events for real-time updates
- ✅ Admin queue management endpoints

### 📁 **File Structure Created**
```
app/api/
├── extract-data/route.ts              # Main extraction endpoint
├── extractions/
│   ├── [jobId]/route.ts              # Job status endpoint
│   └── stream/route.ts               # Real-time updates
└── admin/extraction-queue/route.ts   # Admin queue management

lib/services/document-extraction/
├── ExtractionOrchestrator.ts         # Main coordinator
├── extractors/
│   ├── BaseExtractor.ts              # Base interface
│   └── GoogleVisionExtractor.ts      # Google Vision OCR
├── parsers/
│   └── OpenAIParser.ts               # AI-powered parsing
└── queue/
    └── JobProcessor.ts               # Queue management

supabase/
├── migrations/
│   └── 20250115_create_extraction_system.sql
└── functions/
    └── process-extraction/index.ts   # Background processor
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install @google-cloud/vision openai pdf-parse
```

### 2. Run Database Migration

Apply the database schema:

```bash
# If using Supabase CLI
supabase db push

# Or run the migration file directly in Supabase SQL Editor:
# Copy contents of supabase/migrations/20250115_create_extraction_system.sql
```

### 3. Set Up Google Cloud Vision API

#### Option A: Development (Service Account File)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Cloud Vision API
3. Create a service account with Vision API permissions
4. Download the JSON key file
5. Set environment variable:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
```

#### Option B: Production (Environment Variables)
```bash
export GOOGLE_CLOUD_PROJECT_ID="your-project-id"
export GOOGLE_CLOUD_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
export GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

### 4. Set Up OpenAI API

1. Get an API key from [OpenAI Platform](https://platform.openai.com/)
2. Set environment variable:
```bash
export OPENAI_API_KEY="your-openai-api-key"
```

### 5. Deploy Supabase Edge Function

```bash
# Install Supabase CLI if not already installed
npm install -g @supabase/cli

# Deploy the function
supabase functions deploy process-extraction

# Set environment variables in Supabase Dashboard:
# - OPENAI_API_KEY
# - GOOGLE_CLOUD_PROJECT_ID (if using option B)
# - GOOGLE_CLOUD_CLIENT_EMAIL
# - GOOGLE_CLOUD_PRIVATE_KEY
```

### 6. Update Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Google Cloud Vision (choose one option)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
# OR
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_CLIENT_EMAIL=your_service_account_email
GOOGLE_CLOUD_PRIVATE_KEY="your_private_key"
```

## Testing the System

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Test Document Extraction

#### Upload a Document:
```bash
curl -X POST http://localhost:3000/api/extract-data \
  -F "file=@/path/to/license.jpg" \
  -F "documentType=license" \
  -F "carterId=some-carter-id"
```

Expected response:
```json
{
  "success": true,
  "jobId": "uuid-here",
  "extractionId": "uuid-here",
  "status": "queued",
  "estimatedTime": "3-7 seconds",
  "websocketUrl": "/api/extractions/stream?jobId=uuid-here"
}
```

#### Check Job Status:
```bash
curl http://localhost:3000/api/extractions/{jobId}
```

#### Real-time Updates:
```bash
curl -N http://localhost:3000/api/extractions/stream?jobId={jobId}
```

### 3. Admin Dashboard

Access queue statistics (admin users only):
```bash
curl http://localhost:3000/api/admin/extraction-queue
```

Trigger processing:
```bash
curl -X POST http://localhost:3000/api/admin/extraction-queue \
  -H "Content-Type: application/json" \
  -d '{"action": "check_and_process"}'
```

## Architecture Overview

### Processing Flow:
1. **Upload** → File uploaded via `/api/extract-data`
2. **Queue** → Job created in `extraction_jobs` table
3. **Trigger** → Edge Function called to process job
4. **Extract** → Google Cloud Vision extracts text
5. **Parse** → OpenAI structures the data
6. **Store** → Results saved to `document_extractions`
7. **Notify** → Real-time updates via Server-Sent Events

### Real-time Updates:
- Server-Sent Events provide live progress updates
- WebSocket URL: `/api/extractions/stream?jobId={id}`
- Updates include: queued → processing → completed/failed

### Error Handling:
- Automatic retry with exponential backoff
- Maximum 3 retry attempts per job
- Failed jobs stored for analysis
- Graceful fallback to manual entry

## Next Steps (Phase 2)

- [ ] Integrate with existing carter upload form
- [ ] Add progress indicators in UI
- [ ] Implement confidence scoring UI
- [ ] Add manual override capabilities
- [ ] Create admin dashboard for monitoring
- [ ] Add PDF processing support
- [ ] Implement batch processing

## Troubleshooting

### Common Issues:

1. **Google Vision API Errors**
   - Check credentials are properly set
   - Verify API is enabled in Google Cloud Console
   - Check service account permissions

2. **OpenAI API Errors**
   - Verify API key is valid
   - Check rate limits and quotas
   - Monitor token usage

3. **Edge Function Issues**
   - Check Supabase function logs
   - Verify environment variables are set
   - Test function deployment

4. **Database Issues**
   - Ensure migration was applied successfully
   - Check RLS policies are working
   - Verify user permissions

### Useful Commands:

```bash
# Check Supabase functions
supabase functions list

# View function logs
supabase functions logs process-extraction

# Test Edge Function directly
curl -X POST https://your-project.supabase.co/functions/v1/process-extraction \
  -H "Authorization: Bearer your-anon-key"

# Check queue status
psql -c "SELECT status, COUNT(*) FROM extraction_jobs GROUP BY status;"
```

## Cost Monitoring

### Expected Costs:
- **Google Cloud Vision**: ~$1.50 per 1,000 documents
- **OpenAI API**: ~$0.10-0.30 per 1,000 documents (depending on text length)
- **Total**: ~$1.60-1.80 per 1,000 documents

### Monitoring:
- Check Supabase analytics for API usage
- Monitor Google Cloud billing
- Track OpenAI token usage in dashboard

The Phase 1 foundation is now complete and ready for testing! 🚀