import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

interface ExtractionStatus {
  jobId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress?: {
    step: 'ocr' | 'parsing' | 'validation'
    message: string
  }
  extractedData?: {
    [key: string]: any
  }
  confidenceScore?: number
  error?: string
  processingTimeMs?: number
  createdAt?: string
  completedAt?: string
  extraction?: {
    id: string
    extracted_data: any
    confidence_score: number
    fields_found?: string[]
    fields_missing?: string[]
    errors?: string[]
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const supabase = await createServerClient()

    // For testing purposes, allow NULL user_id (will be allowed by RLS)
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

    const { jobId } = await params

    // Get the extraction job
    let query = supabase
      .from('extraction_jobs')
      .select('*')
      .eq('id', jobId)

    // If we have a user, filter by user_id, otherwise allow any job with NULL user_id
    if (userId) {
      query = query.eq('user_id', userId)
    } else {
      query = query.is('user_id', null)
    }

    const { data: job, error: jobError } = await query.single()

    if (jobError || !job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      )
    }

    // Get the latest extraction result if available (there might be multiple records)
    const { data: extractions } = await supabase
      .from('document_extractions')
      .select('*')
      .eq('job_id', jobId)
      .order('processed_at', { ascending: false, nullsLast: true })

    // Get the most recent extraction (completed ones first, then by processed_at)
    const extraction = extractions?.find(e => e.extraction_status === 'completed') || extractions?.[0]

    // Build response based on job status
    const response: ExtractionStatus = {
      jobId: job.id,
      status: job.status,
      createdAt: job.created_at,
      completedAt: job.completed_at
    }

    // Add progress information based on status
    switch (job.status) {
      case 'queued':
        response.progress = {
          step: 'ocr',
          message: 'Waiting in queue...'
        }
        break

      case 'processing':
        // Determine step based on extraction data
        if (!extraction?.ocr_text) {
          response.progress = {
            step: 'ocr',
            message: 'Extracting text from document...'
          }
        } else if (!extraction?.extracted_data) {
          response.progress = {
            step: 'parsing',
            message: 'Analyzing document structure...'
          }
        } else {
          response.progress = {
            step: 'validation',
            message: 'Validating extracted data...'
          }
        }
        break

      case 'completed':
        if (extraction) {
          response.extractedData = extraction.extracted_data
          response.confidenceScore = extraction.confidence_score
          response.processingTimeMs = extraction.processing_time_ms

          // Also include extraction object for frontend compatibility
          response.extraction = {
            id: extraction.id,
            extracted_data: extraction.extracted_data,
            confidence_score: extraction.confidence_score,
            fields_found: extraction.fields_found,
            fields_missing: extraction.fields_missing,
            errors: extraction.errors
          }
        }
        response.progress = {
          step: 'validation',
          message: 'Extraction completed successfully'
        }
        break

      case 'failed':
        response.error = job.error_message || 'Extraction failed'
        response.progress = {
          step: 'ocr',
          message: 'Extraction failed - ' + (job.error_message || 'Unknown error')
        }
        break
    }

    return NextResponse.json({
      success: true,
      data: response
    })

  } catch (error) {
    console.error('Get extraction status error:', error)
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

// DELETE endpoint to cancel a job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const supabase = await createServerClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { jobId } = await params

    // Update job status to failed (effectively canceling it)
    const { data: job, error: updateError } = await supabase
      .from('extraction_jobs')
      .update({
        status: 'failed',
        error_message: 'Canceled by user',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId)
      .eq('user_id', user.id) // Ensure user owns this job
      .eq('status', 'queued') // Only cancel queued jobs
      .select()
      .single()

    if (updateError || !job) {
      return NextResponse.json(
        { success: false, error: 'Job not found or cannot be canceled' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Job canceled successfully'
    })

  } catch (error) {
    console.error('Cancel extraction job error:', error)
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