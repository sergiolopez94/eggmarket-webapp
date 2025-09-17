import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

interface ManageJobRequest {
  action: 'retry' | 'cancel' | 'reset_stuck' | 'clear_failed'
  jobId?: string
  jobIds?: string[]
}

interface ManageJobResponse {
  success: boolean
  action: string
  affected: number
  results?: Array<{
    jobId: string
    success: boolean
    error?: string
  }>
  message: string
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<ManageJobResponse>> {
  try {
    const { action, jobId, jobIds } = await request.json() as ManageJobRequest

    if (!action) {
      return NextResponse.json(
        {
          success: false,
          action: '',
          affected: 0,
          message: 'Action is required'
        },
        { status: 400 }
      )
    }

    console.log(`🔧 Queue management action: ${action}`)

    const supabase = await createServerClient()

    switch (action) {
      case 'retry':
        return await retryJobs(supabase, jobId, jobIds)

      case 'cancel':
        return await cancelJobs(supabase, jobId, jobIds)

      case 'reset_stuck':
        return await resetStuckJobs(supabase)

      case 'clear_failed':
        return await clearFailedJobs(supabase)

      default:
        return NextResponse.json(
          {
            success: false,
            action,
            affected: 0,
            message: 'Unknown action'
          },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Queue management error:', error)
    return NextResponse.json(
      {
        success: false,
        action: 'unknown',
        affected: 0,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function retryJobs(
  supabase: any,
  jobId?: string,
  jobIds?: string[]
): Promise<NextResponse<ManageJobResponse>> {
  try {
    let targetJobIds: string[] = []

    if (jobId) {
      targetJobIds = [jobId]
    } else if (jobIds && jobIds.length > 0) {
      targetJobIds = jobIds
    } else {
      // Retry all failed jobs that haven't exceeded retry limit
      const { data: failedJobs, error } = await supabase
        .from('extraction_jobs')
        .select('id, retry_count, max_retries')
        .eq('status', 'failed')
        .lt('retry_count', 'max_retries')
        .limit(50) // Safety limit

      if (error) {
        throw new Error(`Failed to get retryable jobs: ${error.message}`)
      }

      targetJobIds = (failedJobs || []).map(job => job.id)
    }

    if (targetJobIds.length === 0) {
      return NextResponse.json({
        success: true,
        action: 'retry',
        affected: 0,
        message: 'No jobs eligible for retry'
      })
    }

    console.log(`🔄 Retrying ${targetJobIds.length} jobs`)

    const results = []
    let successCount = 0

    for (const id of targetJobIds) {
      try {
        // Reset job to queued status and increment retry count
        const { data: currentJob, error: fetchError } = await supabase
          .from('extraction_jobs')
          .select('retry_count, max_retries')
          .eq('id', id)
          .single()

        if (fetchError || !currentJob) {
          results.push({
            jobId: id,
            success: false,
            error: 'Job not found'
          })
          continue
        }

        if (currentJob.retry_count >= currentJob.max_retries) {
          results.push({
            jobId: id,
            success: false,
            error: 'Max retries exceeded'
          })
          continue
        }

        const { error: updateError } = await supabase
          .from('extraction_jobs')
          .update({
            status: 'queued',
            error_message: null,
            completed_at: null,
            retry_count: currentJob.retry_count + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('status', 'failed') // Only update if still failed

        if (updateError) {
          results.push({
            jobId: id,
            success: false,
            error: updateError.message
          })
        } else {
          successCount++
          results.push({
            jobId: id,
            success: true
          })
        }

      } catch (error) {
        results.push({
          jobId: id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      action: 'retry',
      affected: successCount,
      results,
      message: `Successfully retried ${successCount} out of ${targetJobIds.length} jobs`
    })

  } catch (error) {
    console.error('Retry jobs error:', error)
    return NextResponse.json(
      {
        success: false,
        action: 'retry',
        affected: 0,
        message: 'Failed to retry jobs',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function cancelJobs(
  supabase: any,
  jobId?: string,
  jobIds?: string[]
): Promise<NextResponse<ManageJobResponse>> {
  try {
    let targetJobIds: string[] = []

    if (jobId) {
      targetJobIds = [jobId]
    } else if (jobIds && jobIds.length > 0) {
      targetJobIds = jobIds
    } else {
      return NextResponse.json(
        {
          success: false,
          action: 'cancel',
          affected: 0,
          message: 'Job ID(s) required for cancel action'
        },
        { status: 400 }
      )
    }

    console.log(`❌ Canceling ${targetJobIds.length} jobs`)

    const results = []
    let successCount = 0

    for (const id of targetJobIds) {
      try {
        const { error: updateError } = await supabase
          .from('extraction_jobs')
          .update({
            status: 'failed',
            error_message: 'Canceled by administrator',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .in('status', ['queued', 'processing']) // Only cancel active jobs

        if (updateError) {
          results.push({
            jobId: id,
            success: false,
            error: updateError.message
          })
        } else {
          successCount++
          results.push({
            jobId: id,
            success: true
          })
        }

      } catch (error) {
        results.push({
          jobId: id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      action: 'cancel',
      affected: successCount,
      results,
      message: `Successfully canceled ${successCount} out of ${targetJobIds.length} jobs`
    })

  } catch (error) {
    console.error('Cancel jobs error:', error)
    return NextResponse.json(
      {
        success: false,
        action: 'cancel',
        affected: 0,
        message: 'Failed to cancel jobs',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function resetStuckJobs(supabase: any): Promise<NextResponse<ManageJobResponse>> {
  try {
    // Find jobs that have been processing for more than 15 minutes
    const cutoffTime = new Date(Date.now() - 15 * 60 * 1000).toISOString()

    const { data: stuckJobs, error: fetchError } = await supabase
      .from('extraction_jobs')
      .select('id')
      .eq('status', 'processing')
      .lt('updated_at', cutoffTime)

    if (fetchError) {
      throw new Error(`Failed to find stuck jobs: ${fetchError.message}`)
    }

    if (!stuckJobs || stuckJobs.length === 0) {
      return NextResponse.json({
        success: true,
        action: 'reset_stuck',
        affected: 0,
        message: 'No stuck jobs found'
      })
    }

    console.log(`🔄 Resetting ${stuckJobs.length} stuck jobs`)

    const { error: updateError } = await supabase
      .from('extraction_jobs')
      .update({
        status: 'queued',
        updated_at: new Date().toISOString()
      })
      .eq('status', 'processing')
      .lt('updated_at', cutoffTime)

    if (updateError) {
      throw new Error(`Failed to reset stuck jobs: ${updateError.message}`)
    }

    return NextResponse.json({
      success: true,
      action: 'reset_stuck',
      affected: stuckJobs.length,
      message: `Reset ${stuckJobs.length} stuck jobs back to queued status`
    })

  } catch (error) {
    console.error('Reset stuck jobs error:', error)
    return NextResponse.json(
      {
        success: false,
        action: 'reset_stuck',
        affected: 0,
        message: 'Failed to reset stuck jobs',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function clearFailedJobs(supabase: any): Promise<NextResponse<ManageJobResponse>> {
  try {
    // Only clear failed jobs older than 7 days
    const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: oldFailedJobs, error: fetchError } = await supabase
      .from('extraction_jobs')
      .select('id')
      .eq('status', 'failed')
      .lt('completed_at', cutoffTime)

    if (fetchError) {
      throw new Error(`Failed to find old failed jobs: ${fetchError.message}`)
    }

    if (!oldFailedJobs || oldFailedJobs.length === 0) {
      return NextResponse.json({
        success: true,
        action: 'clear_failed',
        affected: 0,
        message: 'No old failed jobs to clear'
      })
    }

    console.log(`🗑️  Clearing ${oldFailedJobs.length} old failed jobs`)

    // Delete associated extraction records first
    const { error: extractionDeleteError } = await supabase
      .from('document_extractions')
      .delete()
      .in('job_id', oldFailedJobs.map(job => job.id))

    if (extractionDeleteError) {
      console.warn('Warning: Failed to delete some extraction records:', extractionDeleteError)
    }

    // Delete the jobs
    const { error: deleteError } = await supabase
      .from('extraction_jobs')
      .delete()
      .eq('status', 'failed')
      .lt('completed_at', cutoffTime)

    if (deleteError) {
      throw new Error(`Failed to delete old failed jobs: ${deleteError.message}`)
    }

    return NextResponse.json({
      success: true,
      action: 'clear_failed',
      affected: oldFailedJobs.length,
      message: `Cleared ${oldFailedJobs.length} old failed jobs (older than 7 days)`
    })

  } catch (error) {
    console.error('Clear failed jobs error:', error)
    return NextResponse.json(
      {
        success: false,
        action: 'clear_failed',
        affected: 0,
        message: 'Failed to clear old failed jobs',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}