import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Note: In a real implementation, you would need to:
// 1. Set up Google Cloud Vision API credentials in Deno
// 2. Set up OpenAI API credentials
// 3. Import the actual processing logic

interface ExtractionJob {
  id: string
  carter_id: string | null
  document_type: 'license' | 'carter_cert' | 'insurance'
  file_path: string
  file_size: number
  mime_type: string
  user_id: string
  status: string
  retry_count: number
  max_retries: number
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get the next job from the queue
    const { data: job, error: jobError } = await supabase
      .rpc('get_next_extraction_job')

    if (jobError) {
      console.error('Error getting next job:', jobError)
      return new Response(
        JSON.stringify({ error: 'Failed to get next job' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!job) {
      return new Response(
        JSON.stringify({ message: 'No jobs in queue' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Processing job ${job.id} for document type ${job.document_type}`)

    try {
      // Step 1: Download file from Supabase Storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(getStorageBucket(job.document_type))
        .download(job.file_path)

      if (downloadError || !fileData) {
        throw new Error(`Failed to download file: ${downloadError?.message}`)
      }

      // Convert file to buffer
      const fileBuffer = await fileData.arrayBuffer()
      const buffer = new Uint8Array(fileBuffer)

      // Step 2: Process the document
      // Note: This is a placeholder - you would implement the actual processing here
      const processingResult = await simulateDocumentProcessing(
        buffer,
        job.mime_type,
        job.document_type,
        job.id
      )

      if (processingResult.success) {
        // Step 3: Update job and create extraction record
        await Promise.all([
          // Update job status
          supabase
            .from('extraction_jobs')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', job.id),

          // Create or update extraction record
          supabase
            .from('document_extractions')
            .upsert({
              job_id: job.id,
              carter_id: job.carter_id,
              document_type: job.document_type,
              file_path: job.file_path,
              extracted_data: processingResult.extractedData,
              confidence_score: processingResult.confidence,
              extraction_status: 'completed',
              processing_time_ms: processingResult.processingTimeMs,
              ocr_text: processingResult.ocrText,
              processed_at: new Date().toISOString()
            })
        ])

        console.log(`Job ${job.id} completed successfully`)

        // TODO: Send WebSocket notification for real-time updates
        // This would be implemented in the next phase

        return new Response(
          JSON.stringify({
            success: true,
            jobId: job.id,
            message: 'Document processed successfully'
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )

      } else {
        // Processing failed - handle retry or mark as failed
        const shouldRetry = job.retry_count < job.max_retries

        if (shouldRetry) {
          // Retry the job
          const { error: retryError } = await supabase
            .rpc('retry_failed_job', { job_id: job.id })

          console.log(`Job ${job.id} scheduled for retry (attempt ${job.retry_count + 1})`)
        } else {
          // Mark as permanently failed
          await supabase
            .from('extraction_jobs')
            .update({
              status: 'failed',
              error_message: processingResult.error,
              completed_at: new Date().toISOString()
            })
            .eq('id', job.id)

          console.log(`Job ${job.id} permanently failed after ${job.retry_count} retries`)
        }

        return new Response(
          JSON.stringify({
            success: false,
            jobId: job.id,
            error: processingResult.error,
            willRetry: shouldRetry
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

    } catch (processingError) {
      console.error(`Processing error for job ${job.id}:`, processingError)

      // Update job with error
      await supabase
        .from('extraction_jobs')
        .update({
          status: 'failed',
          error_message: processingError instanceof Error ? processingError.message : 'Unknown processing error',
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id)

      return new Response(
        JSON.stringify({
          success: false,
          jobId: job.id,
          error: 'Processing failed'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

function getStorageBucket(documentType: string): string {
  const bucketMap: Record<string, string> = {
    license: 'carter-licenses',
    carter_cert: 'carter-certificates',
    insurance: 'carter-insurance'
  }
  return bucketMap[documentType] || 'carter-licenses'
}

// Simulation function - replace with actual processing logic
async function simulateDocumentProcessing(
  fileBuffer: Uint8Array,
  mimeType: string,
  documentType: string,
  jobId: string
): Promise<{
  success: boolean
  extractedData?: any
  confidence?: number
  processingTimeMs: number
  ocrText?: string
  error?: string
}> {
  const startTime = Date.now()

  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))

  // Simulate success/failure (90% success rate)
  const success = Math.random() > 0.1

  if (success) {
    // Simulate extracted data based on document type
    let extractedData: any = {}

    switch (documentType) {
      case 'license':
        extractedData = {
          licenseNumber: `DL${Math.random().toString().slice(2, 8)}`,
          expirationDate: '2026-12-31',
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1985-06-15'
        }
        break

      case 'carter_cert':
        extractedData = {
          certificateNumber: `CC${Math.random().toString().slice(2, 8)}`,
          expirationDate: '2025-12-31',
          issueDate: '2023-01-15',
          authority: 'Department of Transportation'
        }
        break

      case 'insurance':
        extractedData = {
          policyNumber: `INS${Math.random().toString().slice(2, 8)}`,
          expirationDate: '2025-06-30',
          effectiveDate: '2024-07-01',
          insuranceCompany: 'ABC Insurance Co.',
          coverageAmount: '$1,000,000'
        }
        break
    }

    return {
      success: true,
      extractedData,
      confidence: 0.85 + Math.random() * 0.15, // 85-100% confidence
      processingTimeMs: Date.now() - startTime,
      ocrText: `Simulated OCR text for ${documentType} document...`
    }
  } else {
    return {
      success: false,
      error: 'Simulated processing failure',
      processingTimeMs: Date.now() - startTime
    }
  }
}

/* To deploy this function:
1. Make sure you have the Supabase CLI installed
2. Run: supabase functions deploy process-extraction
3. Set up environment variables in Supabase dashboard:
   - GOOGLE_APPLICATION_CREDENTIALS (for Google Cloud Vision)
   - OPENAI_API_KEY
4. Set up a cron job or manual trigger to call this function periodically
*/