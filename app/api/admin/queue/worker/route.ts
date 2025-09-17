import { NextRequest, NextResponse } from 'next/server'

interface WorkerResponse {
  success: boolean
  message: string
  isRunning?: boolean
  stats?: {
    intervalMs: number
    lastRun?: string
    nextRun?: string
    totalRuns: number
    totalProcessed: number
  }
  error?: string
}

// Global worker state (in production, this would be handled differently)
let workerInterval: ReturnType<typeof setInterval> | null = null
let workerStats = {
  intervalMs: 30000, // 30 seconds
  lastRun: null as string | null,
  nextRun: null as string | null,
  totalRuns: 0,
  totalProcessed: 0
}

export async function POST(request: NextRequest): Promise<NextResponse<WorkerResponse>> {
  try {
    const body = await request.json()
    const { action, intervalMs } = body

    if (!action) {
      return NextResponse.json(
        {
          success: false,
          message: 'Action is required (start, stop, status)'
        },
        { status: 400 }
      )
    }

    switch (action) {
      case 'start':
        return startWorker(intervalMs)

      case 'stop':
        return stopWorker()

      case 'status':
        return getWorkerStatus()

      default:
        return NextResponse.json(
          {
            success: false,
            message: 'Unknown action. Use: start, stop, or status'
          },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Worker management error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(_request: NextRequest): Promise<NextResponse<WorkerResponse>> {
  return getWorkerStatus()
}

function startWorker(intervalMs?: number): NextResponse<WorkerResponse> {
  if (workerInterval) {
    return NextResponse.json({
      success: false,
      message: 'Background worker is already running',
      isRunning: true,
      stats: workerStats
    })
  }

  // Update interval if provided
  if (intervalMs && intervalMs >= 5000 && intervalMs <= 300000) {
    workerStats.intervalMs = intervalMs
  }

  console.log(`🚀 Starting background job worker with ${workerStats.intervalMs}ms interval`)

  // Start the worker
  workerInterval = setInterval(async () => {
    try {
      console.log('🔄 Background worker: Processing queued jobs...')
      workerStats.totalRuns++
      workerStats.lastRun = new Date().toISOString()
      workerStats.nextRun = new Date(Date.now() + workerStats.intervalMs).toISOString()

      // Call the queue processor
      const response = await fetch(`http://localhost:3000/api/admin/queue/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'BackgroundWorker/1.0'
        }
      })

      if (response.ok) {
        const result = await response.json()
        workerStats.totalProcessed += result.processedJobs || 0

        if (result.processedJobs > 0) {
          console.log(`✅ Background worker: Processed ${result.processedJobs} jobs`)
        } else {
          console.log('📭 Background worker: No jobs in queue')
        }
      } else {
        console.error('❌ Background worker: Queue processing failed:', response.status)
      }

    } catch (error) {
      console.error('💥 Background worker error:', error)
    }
  }, workerStats.intervalMs)

  workerStats.nextRun = new Date(Date.now() + workerStats.intervalMs).toISOString()

  return NextResponse.json({
    success: true,
    message: `Background worker started with ${workerStats.intervalMs}ms interval`,
    isRunning: true,
    stats: workerStats
  })
}

function stopWorker(): NextResponse<WorkerResponse> {
  if (!workerInterval) {
    return NextResponse.json({
      success: false,
      message: 'Background worker is not running',
      isRunning: false,
      stats: workerStats
    })
  }

  console.log('🛑 Stopping background job worker')

  clearInterval(workerInterval)
  workerInterval = null
  workerStats.nextRun = null

  return NextResponse.json({
    success: true,
    message: 'Background worker stopped',
    isRunning: false,
    stats: workerStats
  })
}

function getWorkerStatus(): NextResponse<WorkerResponse> {
  const isRunning = workerInterval !== null

  return NextResponse.json({
    success: true,
    message: isRunning ? 'Background worker is running' : 'Background worker is stopped',
    isRunning,
    stats: workerStats
  })
}

// Auto-start worker in development mode to handle server restarts
if (process.env.NODE_ENV === 'development') {
  console.log('🔄 Auto-starting background worker in development mode')
  setTimeout(() => {
    if (!workerInterval) { // Only start if not already running
      const result = startWorker()
      console.log('🚀 Auto-start result:', result)
    }
  }, 3000) // Wait 3 seconds after startup to allow server to stabilize
}