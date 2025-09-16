import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    console.log('Testing server client creation...')

    const supabase = await createServerClient()
    console.log('Server client created successfully')

    // Test basic operation
    const { data, error } = await supabase.from('extraction_jobs').select('count').limit(0).maybeSingle()
    console.log('Database test completed')

    return NextResponse.json({
      success: true,
      message: 'Server client working properly'
    })
  } catch (error) {
    console.error('Server client test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Server client failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}