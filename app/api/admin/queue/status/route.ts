import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

interface QueueStatusResponse {
  success: boolean
  stats: {
    queued: number
    processing: number
    completed: number
    failed: number
    totalToday: number
    avgProcessingTimeMs?: number
    lastProcessedAt?: string
  }
  recentJobs: Array<{
    id: string
    status: string
    documentType: string
    createdAt: string
    completedAt?: string
    errorMessage?: string
    processingTimeMs?: number
  }>
  health: {
    isHealthy: boolean
    issues: string[]
    recommendations: string[]
  }
  error?: string
}

export async function GET(request: NextRequest): Promise<NextResponse<QueueStatusResponse>> {
  try {
    const supabase = await createServerClient()

    // Get queue statistics
    const [
      queuedResult,
      processingResult,
      completedResult,
      failedResult,
      todayResult,
      recentJobsResult,
      avgProcessingResult
    ] = await Promise.all([
      // Queued jobs
      supabase
        .from('extraction_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'queued'),

      // Processing jobs
      supabase
        .from('extraction_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'processing'),

      // Completed jobs (all time)
      supabase
        .from('extraction_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed'),

      // Failed jobs (all time)
      supabase
        .from('extraction_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed'),

      // Today's jobs
      supabase
        .from('extraction_jobs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date().toISOString().split('T')[0]),

      // Recent jobs (last 10)
      supabase
        .from('extraction_jobs')
        .select('id, status, document_type, created_at, completed_at, error_message')
        .order('created_at', { ascending: false })
        .limit(10),

      // Average processing time for completed jobs
      supabase
        .from('document_extractions')
        .select('processing_time_ms')
        .not('processing_time_ms', 'is', null)
        .gte('processed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .limit(100)
    ])

    const stats = {
      queued: queuedResult.count || 0,
      processing: processingResult.count || 0,
      completed: completedResult.count || 0,
      failed: failedResult.count || 0,
      totalToday: todayResult.count || 0
    }

    // Calculate average processing time
    if (avgProcessingResult.data && avgProcessingResult.data.length > 0) {
      const times = avgProcessingResult.data
        .map(item => item.processing_time_ms)
        .filter(time => time != null && time > 0)

      if (times.length > 0) {
        stats.avgProcessingTimeMs = Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      }
    }

    // Find last processed job
    const lastProcessed = recentJobsResult.data?.find(job =>
      job.status === 'completed' || job.status === 'failed'
    )
    if (lastProcessed?.completed_at) {
      stats.lastProcessedAt = lastProcessed.completed_at
    }

    // Format recent jobs
    const recentJobs = (recentJobsResult.data || []).map(job => ({
      id: job.id,
      status: job.status,
      documentType: job.document_type,
      createdAt: job.created_at,
      completedAt: job.completed_at || undefined,
      errorMessage: job.error_message || undefined
    }))

    // Health assessment
    const health = assessQueueHealth(stats, recentJobs)

    return NextResponse.json({
      success: true,
      stats,
      recentJobs,
      health
    })

  } catch (error) {
    console.error('Error getting queue status:', error)
    return NextResponse.json(
      {
        success: false,
        stats: {
          queued: 0,
          processing: 0,
          completed: 0,
          failed: 0,
          totalToday: 0
        },
        recentJobs: [],
        health: {
          isHealthy: false,
          issues: ['Failed to fetch queue status'],
          recommendations: ['Check database connectivity']
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function assessQueueHealth(
  stats: any,
  recentJobs: any[]
): { isHealthy: boolean; issues: string[]; recommendations: string[] } {
  const issues: string[] = []
  const recommendations: string[] = []

  // Check for stuck processing jobs
  if (stats.processing > 5) {
    issues.push(`${stats.processing} jobs stuck in processing state`)
    recommendations.push('Check for hung processes or restart job processing')
  }

  // Check for excessive queue backlog
  if (stats.queued > 20) {
    issues.push(`Large queue backlog: ${stats.queued} jobs waiting`)
    recommendations.push('Consider running manual job processing or scaling up')
  }

  // Check failure rate
  const totalProcessed = stats.completed + stats.failed
  if (totalProcessed > 0) {
    const failureRate = stats.failed / totalProcessed
    if (failureRate > 0.3) {
      issues.push(`High failure rate: ${Math.round(failureRate * 100)}%`)
      recommendations.push('Review recent error logs and fix common issues')
    }
  }

  // Check for stuck jobs (processing for too long)
  const now = new Date()
  const stuckJobs = recentJobs.filter(job => {
    if (job.status !== 'processing') return false
    const createdAt = new Date(job.createdAt)
    const ageMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60)
    return ageMinutes > 10 // Jobs processing for more than 10 minutes
  })

  if (stuckJobs.length > 0) {
    issues.push(`${stuckJobs.length} jobs processing for more than 10 minutes`)
    recommendations.push('Reset stuck jobs to queued status')
  }

  // Check if no jobs processed recently
  if (stats.lastProcessedAt) {
    const lastProcessed = new Date(stats.lastProcessedAt)
    const minutesSinceLastJob = (now.getTime() - lastProcessed.getTime()) / (1000 * 60)
    if (minutesSinceLastJob > 30 && stats.queued > 0) {
      issues.push('No jobs processed in the last 30 minutes despite queue backlog')
      recommendations.push('Check if background job processing is running')
    }
  }

  const isHealthy = issues.length === 0

  // Add general recommendations if healthy
  if (isHealthy && stats.queued === 0 && stats.processing === 0) {
    recommendations.push('Queue is healthy and empty')
  }

  return {
    isHealthy,
    issues,
    recommendations
  }
}