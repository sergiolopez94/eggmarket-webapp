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

    console.log(`Processing specific job: ${jobId}`)

    const supabase = await createServerClient()

    // Get the specific job
    const { data: job, error: jobError } = await supabase
      .from('extraction_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      )
    }

    // Use the simple processing endpoint instead of Edge Function
    // This creates mock data and updates the job to completed
    const mockExtractedData = {
      licenseNumber: `DL${Math.random().toString().slice(2, 8)}`,
      expirationDate: '2026-12-31',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1985-06-15'
    }

    // Update job to completed with mock data
    const { error: updateError } = await supabase
      .from('extraction_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (updateError) {
      throw new Error(`Failed to update job: ${updateError.message}`)
    }

    // Create extraction record
    const { error: extractionError } = await supabase
      .from('document_extractions')
      .upsert({
        job_id: jobId,
        carter_id: job.carter_id,
        document_type: job.document_type,
        file_path: job.file_path,
        extracted_data: mockExtractedData,
        confidence_score: 0.95,
        extraction_status: 'completed',
        processing_time_ms: 2500,
        ocr_text: 'Mock OCR text for testing purposes',
        processed_at: new Date().toISOString()
      })

    if (extractionError) {
      throw new Error(`Failed to create extraction record: ${extractionError.message}`)
    }

    console.log(`Job ${jobId} processed successfully with mock data`)

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Job processed successfully with mock data',
      extractedData: mockExtractedData
    })

  } catch (error) {
    console.error('Error processing specific job:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}