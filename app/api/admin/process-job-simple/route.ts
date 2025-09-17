import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json()

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      )
    }

    console.log(`Processing job simply: ${jobId}`)

    const supabase = await createServerClient()

    // Get the job details
    const { data: job, error: jobError } = await supabase
      .from('extraction_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('status', 'queued')
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { success: false, error: 'Job not found or not in queued status' },
        { status: 404 }
      )
    }

    // Update job status to processing
    await supabase
      .from('extraction_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', jobId)

    // For testing: Create a simple mock extraction result
    const mockResult = {
      success: true,
      extractedText: 'Mock extracted text for testing',
      parsedData: {
        expiry: '2025-12-31',
        firstName: 'Test',
        lastName: 'User',
        license_number: 'TEST123456'
      },
      confidence: 85,
      fieldsFound: ['expiry', 'firstName', 'lastName', 'license_number'],
      fieldsMissing: [],
      processingTimeMs: 1500,
      errors: []
    }

    // Update job as completed
    await supabase
      .from('extraction_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId)

    // Create extraction record
    await supabase
      .from('document_extractions')
      .upsert({
        job_id: jobId,
        carter_id: job.carter_id,
        document_type: job.document_type,
        file_path: job.file_path,
        extraction_status: 'completed',
        ocr_text: mockResult.extractedText,
        extracted_data: mockResult.parsedData,
        confidence_score: mockResult.confidence,
        fields_found: mockResult.fieldsFound,
        fields_missing: mockResult.fieldsMissing,
        processing_time_ms: mockResult.processingTimeMs,
        errors: mockResult.errors
      })

    return NextResponse.json({
      success: true,
      message: 'Job processed successfully (MOCK)',
      result: {
        extractedData: mockResult.parsedData,
        confidence: mockResult.confidence,
        fieldsFound: mockResult.fieldsFound
      }
    })

  } catch (error) {
    console.error('Simple job processing error:', error)
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