import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { JobProcessor } from '@/lib/services/document-extraction/queue/JobProcessor'

interface QueueProcessResult {
  success: boolean
  processedJobs: number
  skippedJobs: number
  failedJobs: number
  results: Array<{
    jobId: string
    status: 'completed' | 'failed' | 'skipped'
    confidence?: number
    error?: string
    processingTimeMs?: number
  }>
  message: string
}

export async function POST(request: NextRequest): Promise<NextResponse<QueueProcessResult>> {
  try {
    console.log('🔄 Starting job queue processing via Edge Function...')

    const jobProcessor = new JobProcessor()

    // Check for jobs and trigger Edge Function processing
    const result = await jobProcessor.checkAndProcessJobs()

    if (result.success) {
      return NextResponse.json({
        success: true,
        processedJobs: result.jobsFound,
        skippedJobs: 0,
        failedJobs: 0,
        results: [],
        message: result.message
      })
    } else {
      return NextResponse.json({
        success: false,
        processedJobs: 0,
        skippedJobs: 0,
        failedJobs: 0,
        results: [],
        message: result.message
      }, { status: 500 })
    }

  } catch (error) {
    console.error('💥 Queue processing error:', error)
    return NextResponse.json(
      {
        success: false,
        processedJobs: 0,
        skippedJobs: 0,
        failedJobs: 0,
        results: [],
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check queue status without processing
export async function GET(request: NextRequest) {
  try {
    const jobProcessor = new JobProcessor()
    const stats = await jobProcessor.getQueueStats()

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error('Error getting queue status:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get queue status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}