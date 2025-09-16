import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('jobId')

  if (!jobId) {
    return new Response('jobId parameter is required', { status: 400 })
  }

  try {
    const supabase = createServerClient()

    // Verify user has access to this job
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { data: job, error: jobError } = await supabase
      .from('extraction_jobs')
      .select('id, status, user_id')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    if (jobError || !job) {
      return new Response('Job not found', { status: 404 })
    }

    // Create Server-Sent Events stream
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()

        // Send initial connection message
        const sendMessage = (data: any) => {
          const message = `data: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(message))
        }

        sendMessage({
          type: 'connected',
          jobId: jobId,
          timestamp: new Date().toISOString()
        })

        // Poll for job updates
        let pollCount = 0
        const maxPolls = 120 // Max 2 minutes (1 second intervals)

        const pollInterval = setInterval(async () => {
          pollCount++

          try {
            // Get current job status
            const { data: currentJob, error } = await supabase
              .from('extraction_jobs')
              .select('status, error_message, completed_at')
              .eq('id', jobId)
              .single()

            if (error) {
              sendMessage({
                type: 'error',
                error: 'Failed to fetch job status',
                timestamp: new Date().toISOString()
              })
              clearInterval(pollInterval)
              controller.close()
              return
            }

            // Send status update
            sendMessage({
              type: 'status_update',
              jobId: jobId,
              status: currentJob.status,
              timestamp: new Date().toISOString()
            })

            // If job is completed or failed, get the extraction result
            if (currentJob.status === 'completed') {
              const { data: extraction } = await supabase
                .from('document_extractions')
                .select('extracted_data, confidence_score, processing_time_ms')
                .eq('job_id', jobId)
                .single()

              sendMessage({
                type: 'completed',
                jobId: jobId,
                extractedData: extraction?.extracted_data,
                confidence: extraction?.confidence_score,
                processingTime: extraction?.processing_time_ms,
                timestamp: new Date().toISOString()
              })

              clearInterval(pollInterval)
              controller.close()
              return
            }

            if (currentJob.status === 'failed') {
              sendMessage({
                type: 'failed',
                jobId: jobId,
                error: currentJob.error_message,
                timestamp: new Date().toISOString()
              })

              clearInterval(pollInterval)
              controller.close()
              return
            }

            // Check if we've exceeded max polling time
            if (pollCount >= maxPolls) {
              sendMessage({
                type: 'timeout',
                jobId: jobId,
                message: 'Polling timeout reached',
                timestamp: new Date().toISOString()
              })

              clearInterval(pollInterval)
              controller.close()
              return
            }

          } catch (pollError) {
            console.error('Polling error:', pollError)
            sendMessage({
              type: 'error',
              error: 'Polling error occurred',
              timestamp: new Date().toISOString()
            })
          }
        }, 1000) // Poll every second

        // Clean up on client disconnect
        return () => {
          clearInterval(pollInterval)
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    })

  } catch (error) {
    console.error('SSE stream error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}