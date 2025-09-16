import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { JobProcessor } from '@/lib/services/document-extraction/queue/JobProcessor'

// GET /api/admin/extraction-queue - Get queue statistics
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const processor = new JobProcessor()

    // Get queue statistics
    const stats = await processor.getQueueStats()

    // Get recent jobs
    const { data: recentJobs, error: jobsError } = await supabase
      .from('extraction_jobs')
      .select(`
        id,
        document_type,
        status,
        retry_count,
        error_message,
        created_at,
        started_at,
        completed_at,
        profiles:user_id (name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    if (jobsError) {
      console.error('Error fetching recent jobs:', jobsError)
    }

    return NextResponse.json({
      success: true,
      data: {
        stats,
        recentJobs: recentJobs || []
      }
    })

  } catch (error) {
    console.error('Admin queue endpoint error:', error)
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

// POST /api/admin/extraction-queue - Trigger actions
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { action } = await request.json()

    const processor = new JobProcessor()

    switch (action) {
      case 'trigger_processing': {
        const triggerResult = await processor.triggerProcessing()
        return NextResponse.json({
          success: triggerResult.success,
          message: triggerResult.message
        })
      }

      case 'check_and_process': {
        const checkResult = await processor.checkAndProcessJobs()
        return NextResponse.json({
          success: checkResult.success,
          message: checkResult.message,
          jobsFound: checkResult.jobsFound
        })
      }

      case 'retry_failed': {
        const retryResult = await processor.retryFailedJobs()
        return NextResponse.json({
          success: true,
          message: retryResult.message,
          retriedCount: retryResult.retriedCount
        })
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Admin queue action error:', error)
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