'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'react-hot-toast'

export interface ExtractionResult {
  success: boolean
  jobId: string
  extractionId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  estimatedTime: string
  websocketUrl?: string
  data?: {
    [key: string]: any
    licenseExpiry?: string
    expirationDate?: string
  }
  confidence?: number
  fieldsFound?: string[]
  fieldsMissing?: string[]
  errors?: string[]
}

export interface ExtractionState {
  isExtracting: boolean
  progress: number
  status: 'idle' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed'
  result: ExtractionResult | null
  error: string | null
  estimatedTimeRemaining?: string
}

export interface UseDocumentExtractionOptions {
  documentType: 'license' | 'carter_cert' | 'insurance'
  carterId?: string
  onComplete?: (result: ExtractionResult) => void
  onError?: (error: string) => void
  onProgress?: (progress: number, status: string) => void
  autoPopulateFields?: boolean
}

export function useDocumentExtraction({
  documentType,
  carterId,
  onComplete,
  onError,
  onProgress,
  autoPopulateFields = true
}: UseDocumentExtractionOptions) {
  const [state, setState] = useState<ExtractionState>({
    isExtracting: false,
    progress: 0,
    status: 'idle',
    result: null,
    error: null
  })

  const wsRef = useRef<WebSocket | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Clean up WebSocket and abort controller on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [])

  const updateState = useCallback((updates: Partial<ExtractionState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const startExtraction = useCallback(async (file: File): Promise<ExtractionResult | null> => {
    if (state.isExtracting) {
      console.log('Extraction already in progress')
      return null
    }

    // Create new abort controller for this extraction
    abortControllerRef.current = new AbortController()

    try {
      updateState({
        isExtracting: true,
        progress: 10,
        status: 'uploading',
        error: null,
        result: null
      })

      onProgress?.(10, 'Uploading file...')

      // Prepare form data
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', documentType)
      if (carterId) {
        formData.append('carterId', carterId)
      }

      // Upload and start extraction
      const response = await fetch('/api/extract-data', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const extractionResponse: ExtractionResult = await response.json()

      if (!extractionResponse.success) {
        throw new Error(extractionResponse.errors?.[0] || 'Extraction failed')
      }

      updateState({
        progress: 30,
        status: 'queued',
        result: extractionResponse
      })

      onProgress?.(30, 'Queued for processing...')

      // Use polling for status updates (WebSocket disabled)
      console.log('Using polling for job status updates')
      await pollForResults(extractionResponse.jobId)

      return state.result

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        updateState({
          isExtracting: false,
          progress: 0,
          status: 'idle',
          error: 'Extraction cancelled'
        })
        return null
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      updateState({
        isExtracting: false,
        progress: 0,
        status: 'failed',
        error: errorMessage
      })

      onError?.(errorMessage)
      toast.error(`Extraction failed: ${errorMessage}`)

      return null
    }
  }, [state.isExtracting, documentType, carterId, onProgress, onError, updateState])

  const setupWebSocket = useCallback(async (websocketUrl: string, jobId: string) => {
    return new Promise<void>((resolve, reject) => {
      try {
        // Convert HTTP URL to WebSocket URL
        const wsUrl = websocketUrl.replace(/^http/, 'ws')
        const fullWsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}${wsUrl}`

        wsRef.current = new WebSocket(fullWsUrl)

        wsRef.current.onopen = () => {
          console.log('WebSocket connected for job:', jobId)
          updateState({
            progress: 40,
            status: 'processing'
          })
          onProgress?.(40, 'Processing document...')
        }

        wsRef.current.onmessage = (event) => {
          try {
            const update = JSON.parse(event.data)

            if (update.jobId === jobId) {
              handleExtractionUpdate(update)
            }
          } catch (error) {
            console.error('WebSocket message parsing error:', error)
          }
        }

        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error)
          wsRef.current = null
          // Fall back to polling
          pollForResults(jobId).then(resolve).catch(reject)
        }

        wsRef.current.onclose = () => {
          console.log('WebSocket closed')
          wsRef.current = null
          resolve()
        }

      } catch (error) {
        reject(error)
      }
    })
  }, [updateState, onProgress])

  const pollForResults = useCallback(async (jobId: string, maxAttempts = 60) => {
    console.log(`🔄 Starting polling for job ${jobId} (max ${maxAttempts} attempts)`)

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Wait between attempts (start fast, slow down over time)
        const waitTime = attempt < 5 ? 1000 : attempt < 15 ? 2000 : 3000
        await new Promise(resolve => setTimeout(resolve, waitTime))

        console.log(`📡 Polling attempt ${attempt + 1}/${maxAttempts} for job ${jobId}`)

        const response = await fetch(`/api/extractions/${jobId}`)
        if (!response.ok) {
          console.warn(`⚠️  Polling attempt ${attempt + 1} failed with status ${response.status}`)
          continue
        }

        const result = await response.json()

        if (!result.success) {
          console.warn(`⚠️  API returned error:`, result.error)
          continue
        }

        const jobData = result.data

        console.log(`📊 Job ${jobId} status: ${jobData.status}`)

        // Check for completion or failure
        if (jobData.status === 'completed' || jobData.status === 'failed') {
          console.log(`✅ Job ${jobId} finished with status: ${jobData.status}`)
          handleExtractionUpdate(jobData)
          return
        }

        // Update progress based on status
        const progressMap = {
          'queued': 30,
          'processing': 60,
          'analyzing': 80,
          'finalizing': 90
        }
        const progress = progressMap[jobData.status as keyof typeof progressMap] || 50

        // Show more detailed progress message
        const progressMessage = jobData.progress?.message || `Processing: ${jobData.status}`

        updateState({
          progress,
          status: jobData.status,
          estimatedTimeRemaining: jobData.estimatedTimeRemaining
        })

        onProgress?.(progress, progressMessage)

      } catch (error) {
        console.error(`❌ Polling error on attempt ${attempt + 1}:`, error)

        // If we're having network issues, try to trigger job processing
        if (attempt === 10) {
          console.log(`🔧 Triggering job processing after polling issues...`)
          try {
            await fetch('/api/admin/queue/process', { method: 'POST' })
          } catch (triggerError) {
            console.warn('Failed to trigger job processing:', triggerError)
          }
        }
      }
    }

    // Timeout - but let's check one more time
    console.log(`⏰ Polling timeout for job ${jobId}, checking final status...`)
    try {
      const finalResponse = await fetch(`/api/extractions/${jobId}`)
      if (finalResponse.ok) {
        const finalResult = await finalResponse.json()
        if (finalResult.success && finalResult.data) {
          const status = finalResult.data.status
          if (status === 'completed' || status === 'failed') {
            console.log(`🎯 Final check found completed job: ${status}`)
            handleExtractionUpdate(finalResult.data)
            return
          }
        }
      }
    } catch (finalError) {
      console.error('Final status check failed:', finalError)
    }

    // True timeout
    console.error(`💥 Extraction timeout for job ${jobId} after ${maxAttempts} attempts`)
    throw new Error('Extraction timeout - the job may still be processing. Please check back later or contact support.')
  }, [updateState, onProgress])

  const handleExtractionUpdate = useCallback((update: any) => {
    if (update.status === 'completed' && update.extraction) {
      const result: ExtractionResult = {
        success: true,
        jobId: update.jobId,
        extractionId: update.extraction.id,
        status: 'completed',
        estimatedTime: '0s',
        data: update.extraction.extracted_data,
        confidence: update.extraction.confidence_score,
        fieldsFound: update.extraction.fields_found,
        fieldsMissing: update.extraction.fields_missing,
        errors: update.extraction.errors
      }

      updateState({
        isExtracting: false,
        progress: 100,
        status: 'completed',
        result,
        error: null
      })

      onComplete?.(result)
      onProgress?.(100, 'Extraction completed!')

      // Don't show toast here - let the form component handle notifications
      console.log(`Document extraction completed with ${Math.round((result.confidence || 0) * 100)}% confidence`)

      // Close WebSocket if open
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }

    } else if (update.status === 'failed') {
      const errorMessage = update.error || 'Extraction failed'

      updateState({
        isExtracting: false,
        progress: 0,
        status: 'failed',
        error: errorMessage
      })

      onError?.(errorMessage)
      toast.error(`Extraction failed: ${errorMessage}`)

      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }

    } else {
      // In-progress update
      const progressMap = {
        'queued': 30,
        'processing': 60,
        'analyzing': 80,
        'finalizing': 90
      }
      const progress = progressMap[update.status as keyof typeof progressMap] || 50

      updateState({
        progress,
        status: update.status,
        estimatedTimeRemaining: update.estimatedTimeRemaining
      })

      onProgress?.(progress, `Processing: ${update.status}`)
    }
  }, [updateState, onComplete, onError, onProgress])

  const cancelExtraction = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    updateState({
      isExtracting: false,
      progress: 0,
      status: 'idle',
      error: 'Extraction cancelled',
      result: null
    })

    console.log('Extraction cancelled')
  }, [updateState])

  const reset = useCallback(() => {
    cancelExtraction()
    updateState({
      progress: 0,
      status: 'idle',
      error: null,
      result: null,
      estimatedTimeRemaining: undefined
    })
  }, [cancelExtraction, updateState])

  // Helper to get extracted field values for form population
  const getExtractedValue = useCallback((fieldName: string): string | null => {
    if (!state.result?.data) return null

    // Try exact field name first
    if (state.result.data[fieldName]) {
      return state.result.data[fieldName]
    }

    // Field name mappings for comprehensive license data
    const fieldMappings: Record<string, string[]> = {
      // Basic info
      'name': ['firstName', 'name', 'first_name'],
      'lastName': ['lastName', 'surname', 'last_name'],

      // License fields
      'licenseNumber': ['licenseNumber', 'license_number', 'dlNumber', 'dl_number'],
      'licenseExpiry': ['expirationDate', 'licenseExpiry', 'license_expiry', 'exp', 'expiry', 'expires'],
      'expirationDate': ['expirationDate', 'licenseExpiry', 'license_expiry', 'exp', 'expiry', 'expires'],
      'dateOfBirth': ['dateOfBirth', 'date_of_birth', 'dob', 'birthDate', 'birth_date'],
      'licenseState': ['licenseState', 'license_state', 'state', 'issuingState', 'issuing_state'],
      'licenseClass': ['licenseClass', 'license_class', 'class', 'vehicleClass', 'vehicle_class'],

      // Physical characteristics
      'height': ['height', 'ht'],
      'weight': ['weight', 'wt'],
      'eyeColor': ['eyeColor', 'eye_color', 'eyes'],
      'sex': ['sex', 'gender'],

      // Address and details
      'address': ['address', 'addr', 'street_address', 'home_address'],
      'restrictions': ['restrictions', 'restriction_codes', 'codes'],
      'endorsements': ['endorsements', 'endorsement_codes']
    }

    // Try variations for this field
    const variations = fieldMappings[fieldName] || []
    for (const variation of variations) {
      if (state.result.data[variation]) {
        return state.result.data[variation]
      }
    }

    return null
  }, [state.result])

  return {
    state,
    startExtraction,
    cancelExtraction,
    reset,
    getExtractedValue,
    isExtracting: state.isExtracting,
    progress: state.progress,
    status: state.status,
    result: state.result,
    error: state.error
  }
}