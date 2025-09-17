import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { ExtractionOrchestrator } from '@/lib/services/document-extraction/ExtractionOrchestrator'

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json()

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      )
    }

    console.log(`Processing job directly: ${jobId}`)

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

    // Process the job using the ExtractionOrchestrator
    const orchestrator = new ExtractionOrchestrator()

    const result = await orchestrator.processExtractionJob({
      jobId: job.id,
      carterId: job.carter_id,
      documentType: job.document_type as 'license' | 'carter_cert' | 'insurance',
      filePath: job.file_path,
      fileSize: job.file_size,
      mimeType: job.mime_type,
      metadata: job.metadata
    })

    if (result.success) {
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
          ocr_text: result.extractedText,
          extracted_data: result.parsedData,
          confidence_score: result.confidence,
          fields_found: result.fieldsFound,
          fields_missing: result.fieldsMissing,
          processing_time_ms: result.processingTimeMs,
          errors: result.errors
        })

      return NextResponse.json({
        success: true,
        message: 'Job processed successfully',
        result: {
          extractedData: result.parsedData,
          confidence: result.confidence,
          fieldsFound: result.fieldsFound
        }
      })

    } else {
      // Update job as failed
      await supabase
        .from('extraction_jobs')
        .update({
          status: 'failed',
          error_message: result.error,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)

      return NextResponse.json({
        success: false,
        error: result.error || 'Job processing failed'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Direct job processing error:', error)
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