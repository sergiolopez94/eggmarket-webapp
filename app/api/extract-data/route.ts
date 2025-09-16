import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { uploadCarterDocumentServer, validateFileServer } from '@/lib/supabase/server-storage'

interface ExtractionRequest {
  documentType: 'license' | 'carter_cert' | 'insurance'
  carterId?: string
}

interface ExtractionResponse {
  success: boolean
  jobId: string
  extractionId: string
  status: 'queued'
  estimatedTime: string
  websocketUrl?: string
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('Extract-data API called')

    const supabase = await createServerClient()

    // For testing purposes, use NULL user_id (will be allowed by RLS)
    // TODO: Restore proper authentication in production
    let userId = null

    // Try to get authenticated user, but don't fail if not authenticated
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (!authError && user) {
        userId = user.id
      }
    } catch (authError) {
      console.log('No authenticated user, using NULL user ID for testing')
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const documentType = formData.get('documentType') as string
    const carterId = formData.get('carterId') as string | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!documentType || !['license', 'carter_cert', 'insurance'].includes(documentType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid document type' },
        { status: 400 }
      )
    }

    // Validate file using server-compatible function
    const validation = validateFileServer(file)
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    console.log('File validation passed, uploading to storage')

    // Upload file to storage using server-compatible function
    let filePath: string
    try {
      // If carterId is provided, use it; otherwise generate a temp ID
      const uploadCarterId = carterId || `temp_${Date.now()}`
      filePath = await uploadCarterDocumentServer(file, uploadCarterId, documentType as any)
      console.log('File uploaded successfully to:', filePath)
    } catch (uploadError) {
      console.error('File upload error:', uploadError)
      return NextResponse.json(
        { success: false, error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    console.log('Creating extraction job in database')

    // Create extraction job
    const { data: job, error: jobError } = await supabase
      .from('extraction_jobs')
      .insert({
        carter_id: carterId,
        document_type: documentType,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        user_id: userId,
        status: 'queued',
        priority: 1,
        metadata: {
          originalFileName: file.name,
          uploadedAt: new Date().toISOString()
        }
      })
      .select()
      .single()

    if (jobError) {
      console.error('Job creation error:', jobError)
      return NextResponse.json(
        { success: false, error: 'Failed to create extraction job' },
        { status: 500 }
      )
    }

    console.log('Job created successfully:', job.id)

    // Create initial extraction record
    const { data: extraction, error: extractionError } = await supabase
      .from('document_extractions')
      .insert({
        job_id: job.id,
        carter_id: carterId,
        document_type: documentType,
        file_path: filePath,
        extraction_status: 'processing'
      })
      .select()
      .single()

    if (extractionError) {
      console.error('Extraction record creation error:', extractionError)
      // Don't fail the request, the job will create its own extraction record
    }

    console.log('Extraction record created, preparing response')

    const response: ExtractionResponse = {
      success: true,
      jobId: job.id,
      extractionId: extraction?.id || job.id,
      status: 'queued',
      estimatedTime: '3-7 seconds',
      websocketUrl: `/api/extractions/stream?jobId=${job.id}`
    }

    console.log('Returning successful response')
    return NextResponse.json(response)

  } catch (error) {
    console.error('Extract data API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: 'Document extraction API',
      endpoints: {
        'POST /api/extract-data': 'Submit document for extraction',
        'GET /api/extractions/:jobId': 'Get extraction status',
        'GET /api/extractions/stream': 'WebSocket stream for real-time updates'
      }
    }
  )
}