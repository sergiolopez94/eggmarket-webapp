import { createServerClient } from '@/lib/supabase/server'

export class JobProcessor {
  private supabaseUrl: string
  private functionUrl: string

  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    this.functionUrl = `${this.supabaseUrl}/functions/v1/process-extraction`
  }

  /**
   * Trigger the Supabase Edge Function to process pending jobs
   */
  async triggerProcessing(): Promise<{ success: boolean; message: string }> {
    try {
      const supabase = createServerClient()

      // Get service role key for invoking Edge Functions
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!serviceKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')
      }

      const response = await fetch(this.functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Edge Function call failed: ${response.statusText}`)
      }

      const result = await response.json()

      return {
        success: true,
        message: result.message || 'Processing triggered successfully'
      }

    } catch (error) {
      console.error('Error triggering job processing:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Check for pending jobs and trigger processing if needed
   */
  async checkAndProcessJobs(): Promise<{ success: boolean; message: string; jobsFound: number }> {
    try {
      const supabase = createServerClient()

      // Count pending jobs
      const { count, error } = await supabase
        .from('extraction_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'queued')

      if (error) {
        throw new Error(`Failed to count pending jobs: ${error.message}`)
      }

      const jobsFound = count || 0

      if (jobsFound === 0) {
        return {
          success: true,
          message: 'No pending jobs found',
          jobsFound: 0
        }
      }

      // Trigger processing
      const result = await this.triggerProcessing()

      return {
        success: result.success,
        message: `${jobsFound} jobs found. ${result.message}`,
        jobsFound
      }

    } catch (error) {
      console.error('Error checking jobs:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        jobsFound: 0
      }
    }
  }

  /**
   * Get job queue statistics
   */
  async getQueueStats(): Promise<{
    queued: number
    processing: number
    completed: number
    failed: number
    totalToday: number
  }> {
    try {
      const supabase = createServerClient()

      // Get counts for each status
      const [queuedResult, processingResult, completedResult, failedResult, todayResult] = await Promise.all([
        supabase
          .from('extraction_jobs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'queued'),

        supabase
          .from('extraction_jobs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'processing'),

        supabase
          .from('extraction_jobs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed'),

        supabase
          .from('extraction_jobs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'failed'),

        supabase
          .from('extraction_jobs')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', new Date().toISOString().split('T')[0]) // Today's jobs
      ])

      return {
        queued: queuedResult.count || 0,
        processing: processingResult.count || 0,
        completed: completedResult.count || 0,
        failed: failedResult.count || 0,
        totalToday: todayResult.count || 0
      }

    } catch (error) {
      console.error('Error getting queue stats:', error)
      return {
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        totalToday: 0
      }
    }
  }

  /**
   * Retry failed jobs that are eligible for retry
   */
  async retryFailedJobs(): Promise<{ retriedCount: number; message: string }> {
    try {
      const supabase = createServerClient()

      // Get failed jobs that can be retried
      const { data: failedJobs, error } = await supabase
        .from('extraction_jobs')
        .select('id, retry_count, max_retries')
        .eq('status', 'failed')
        .lt('retry_count', 'max_retries')

      if (error) {
        throw new Error(`Failed to get retryable jobs: ${error.message}`)
      }

      if (!failedJobs || failedJobs.length === 0) {
        return {
          retriedCount: 0,
          message: 'No failed jobs eligible for retry'
        }
      }

      // Retry each job
      let retriedCount = 0
      for (const job of failedJobs) {
        const { error: retryError } = await supabase
          .rpc('retry_failed_job', { job_id: job.id })

        if (!retryError) {
          retriedCount++
        }
      }

      return {
        retriedCount,
        message: `Successfully retried ${retriedCount} out of ${failedJobs.length} failed jobs`
      }

    } catch (error) {
      console.error('Error retrying failed jobs:', error)
      return {
        retriedCount: 0,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}