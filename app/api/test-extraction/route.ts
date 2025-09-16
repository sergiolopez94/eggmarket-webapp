import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    console.log('Test extraction API called')

    // Simple test without complex operations
    const formData = await request.formData()
    const file = formData.get('file') as File
    const documentType = formData.get('documentType') as string

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 })
    }

    // Just return basic file info without storing or processing
    return NextResponse.json({
      success: true,
      message: 'File received successfully',
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type,
        documentType
      }
    })

  } catch (error) {
    console.error('Test extraction API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test extraction API endpoint',
    status: 'working'
  })
}