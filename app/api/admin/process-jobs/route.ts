import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('📞 Legacy job processing endpoint called - redirecting to new queue processor')

    // Redirect to the new queue processing endpoint
    const response = await fetch(`${getBaseUrl(request)}/api/admin/queue/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward any authentication headers
        ...(request.headers.get('authorization') && {
          'authorization': request.headers.get('authorization')!
        })
      }
    })

    const result = await response.json()

    if (response.ok) {
      console.log(`✅ Queue processing completed: ${result.message}`)
      return NextResponse.json({
        success: result.success,
        message: result.message,
        jobsFound: result.processedJobs + result.skippedJobs + result.failedJobs,
        processedJobs: result.processedJobs,
        skippedJobs: result.skippedJobs,
        failedJobs: result.failedJobs
      })
    } else {
      console.error('❌ Queue processing failed:', result)
      return NextResponse.json(
        {
          success: false,
          error: 'Queue processing failed',
          details: result.message || 'Unknown error'
        },
        { status: response.status }
      )
    }

  } catch (error) {
    console.error('💥 Error in legacy job processing endpoint:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process jobs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Legacy stats endpoint called - redirecting to new queue status')

    // Redirect to the new queue status endpoint
    const response = await fetch(`${getBaseUrl(request)}/api/admin/queue/status`, {
      method: 'GET',
      headers: {
        // Forward any authentication headers
        ...(request.headers.get('authorization') && {
          'authorization': request.headers.get('authorization')!
        })
      }
    })

    const result = await response.json()

    if (response.ok) {
      // Transform the response to match the old format
      return NextResponse.json({
        success: true,
        stats: {
          queued: result.stats.queued,
          processing: result.stats.processing,
          completed: result.stats.completed,
          failed: result.stats.failed,
          totalToday: result.stats.totalToday
        }
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to get queue stats',
          details: result.error || 'Unknown error'
        },
        { status: response.status }
      )
    }

  } catch (error) {
    console.error('💥 Error getting queue stats:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get queue stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function getBaseUrl(request: NextRequest): string {
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  const host = request.headers.get('host') || 'localhost:3000'
  return `${protocol}://${host}`
}