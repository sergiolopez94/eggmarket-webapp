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
      toast.error('Extraction already in progress')
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

      // Set up WebSocket for real-time updates
      if (extractionResponse.websocketUrl) {
        await setupWebSocket(extractionResponse.websocketUrl, extractionResponse.jobId)
      } else {
        // Fall back to polling if WebSocket URL not provided
        await pollForResults(extractionResponse.jobId)
      }

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

  const pollForResults = useCallback(async (jobId: string, maxAttempts = 30) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds

        const response = await fetch(`/api/extractions/${jobId}`)
        if (!response.ok) continue

        const result = await response.json()

        if (result.status === 'completed' || result.status === 'failed') {
          handleExtractionUpdate(result)
          return
        }

        // Update progress based on status
        const progressMap = {
          'queued': 30,
          'processing': 60,
          'analyzing': 80
        }
        const progress = progressMap[result.status as keyof typeof progressMap] || 50

        updateState({
          progress,
          status: result.status,
          estimatedTimeRemaining: result.estimatedTimeRemaining
        })

        onProgress?.(progress, `Processing: ${result.status}`)

      } catch (error) {
        console.error('Polling error:', error)
      }
    }

    // Timeout
    throw new Error('Extraction timeout - please try again')
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

      // Show success message with confidence
      const confidence = result.confidence || 0
      if (confidence >= 0.8) {
        toast.success(`Document processed successfully! (${Math.round(confidence * 100)}% confidence)`)
      } else {
        toast.success(`Document processed - please review extracted data (${Math.round(confidence * 100)}% confidence)`)
      }

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

    toast.info('Extraction cancelled')
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

    // Try common variations for expiration date
    if (fieldName === 'expirationDate' || fieldName === 'licenseExpiry') {
      return state.result.data.expirationDate ||
             state.result.data.licenseExpiry ||
             state.result.data.exp ||
             state.result.data.expiry ||
             null
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