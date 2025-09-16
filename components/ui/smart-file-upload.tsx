'use client'

import { useCallback, useState, useEffect } from 'react'
import { FileUpload } from './file-upload'
import { useDocumentExtraction } from '@/hooks/useDocumentExtraction'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  CheckCircle,
  AlertTriangle,
  Loader2,
  X,
  RefreshCw,
  Eye,
  Calendar,
  FileText
} from 'lucide-react'

interface SmartFileUploadProps {
  documentType: 'license' | 'carter_cert' | 'insurance'
  carterId?: string
  onFilesChange?: (files: File[]) => void
  onExtractionComplete?: (data: any) => void
  onFieldExtracted?: (fieldName: string, value: string, confidence?: number) => void
  className?: string
  label?: string
  description?: string
  existingFile?: string
  disabled?: boolean
  maxFiles?: number
  accept?: Record<string, string[]>
  maxSize?: number
  // Form integration
  formFieldMapping?: {
    [extractedField: string]: string // Maps extraction field to form field name
  }
  autoPopulate?: boolean
}

export function SmartFileUpload({
  documentType,
  carterId,
  onFilesChange,
  onExtractionComplete,
  onFieldExtracted,
  className,
  label,
  description,
  existingFile,
  disabled = false,
  maxFiles = 1,
  accept = {
    'application/pdf': ['.pdf'],
    'image/*': ['.png', '.jpg', '.jpeg']
  },
  maxSize = 5 * 1024 * 1024, // 5MB
  formFieldMapping = {
    expirationDate: 'licenseExpiry',
    licenseExpiry: 'licenseExpiry',
    licenseNumber: 'licenseNumber',
    firstName: 'firstName',
    lastName: 'lastName'
  },
  autoPopulate = true
}: SmartFileUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [showExtractionDetails, setShowExtractionDetails] = useState(false)

  const {
    state,
    startExtraction,
    cancelExtraction,
    reset,
    getExtractedValue
  } = useDocumentExtraction({
    documentType,
    carterId,
    onComplete: (result) => {
      onExtractionComplete?.(result.data)

      // Auto-populate form fields if enabled
      if (autoPopulate && result.data) {
        Object.entries(formFieldMapping).forEach(([extractedField, formField]) => {
          const value = result.data[extractedField]
          if (value) {
            onFieldExtracted?.(formField, value, result.confidence)
          }
        })
      }
    }
  })

  const handleFilesChange = useCallback((newFiles: File[]) => {
    setFiles(newFiles)
    onFilesChange?.(newFiles)

    // Start extraction automatically when file is added
    if (newFiles.length > 0 && !state.isExtracting) {
      const file = newFiles[0]
      startExtraction(file)
    }
  }, [onFilesChange, state.isExtracting, startExtraction])

  const handleRetryExtraction = useCallback(() => {
    if (files.length > 0) {
      reset()
      startExtraction(files[0])
    }
  }, [files, reset, startExtraction])

  const getStatusColor = (status: string, confidence?: number) => {
    if (status === 'completed') {
      if (confidence && confidence >= 0.8) return 'text-green-600 border-green-200 bg-green-50'
      if (confidence && confidence >= 0.6) return 'text-yellow-600 border-yellow-200 bg-yellow-50'
      return 'text-orange-600 border-orange-200 bg-orange-50'
    }
    if (status === 'failed') return 'text-red-600 border-red-200 bg-red-50'
    if (status === 'processing' || status === 'queued') return 'text-blue-600 border-blue-200 bg-blue-50'
    return 'text-gray-600 border-gray-200 bg-gray-50'
  }

  const getConfidenceText = (confidence?: number) => {
    if (!confidence) return 'Unknown'
    const percent = Math.round(confidence * 100)
    if (percent >= 80) return `${percent}% (High)`
    if (percent >= 60) return `${percent}% (Medium)`
    return `${percent}% (Low)`
  }

  const getStatusText = (status: string) => {
    const statusMap = {
      'idle': 'Ready to upload',
      'uploading': 'Uploading file...',
      'queued': 'Queued for processing',
      'processing': 'Extracting data...',
      'completed': 'Extraction completed',
      'failed': 'Extraction failed'
    }
    return statusMap[status as keyof typeof statusMap] || status
  }

  return (
    <div className={cn('space-y-4', className)}>
      <FileUpload
        onFilesChange={handleFilesChange}
        maxFiles={maxFiles}
        accept={accept}
        maxSize={maxSize}
        label={label}
        description={description}
        existingFile={existingFile}
        disabled={disabled || state.isExtracting}
      />

      {/* Extraction Status */}
      {(state.isExtracting || state.result || state.error) && (
        <Card className={cn('transition-all duration-200', getStatusColor(state.status, state.result?.confidence))}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                {state.isExtracting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : state.status === 'completed' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : state.status === 'failed' ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span className="font-medium text-sm">
                  {getStatusText(state.status)}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {state.result?.confidence && (
                  <Badge variant="outline" className="text-xs">
                    {getConfidenceText(state.result.confidence)}
                  </Badge>
                )}

                {state.isExtracting && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelExtraction}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}

                {state.status === 'failed' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRetryExtraction}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                )}

                {(state.result || state.error) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowExtractionDetails(!showExtractionDetails)}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {state.isExtracting && (
              <div className="space-y-2">
                <Progress value={state.progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {state.estimatedTimeRemaining && `Est. ${state.estimatedTimeRemaining} remaining`}
                </p>
              </div>
            )}

            {/* Error Message */}
            {state.error && (
              <div className="mt-2 text-sm text-red-600">
                {state.error}
              </div>
            )}

            {/* Extracted Fields Summary */}
            {state.result && state.status === 'completed' && (
              <div className="mt-3 space-y-2">
                {state.result.fieldsFound && state.result.fieldsFound.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Extracted Fields:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {state.result.fieldsFound.map((field) => (
                        <Badge key={field} variant="secondary" className="text-xs">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick preview of key extracted data */}
                {state.result.data?.expirationDate && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Expiry:</span>
                    <span className="font-medium">{state.result.data.expirationDate}</span>
                  </div>
                )}
              </div>
            )}

            {/* Detailed Extraction Results */}
            {showExtractionDetails && (state.result || state.error) && (
              <div className="mt-4 p-3 bg-background rounded-lg border">
                <div className="text-xs space-y-2">
                  <div className="font-medium">Extraction Details:</div>

                  {state.result && (
                    <>
                      <div>
                        <span className="text-muted-foreground">Job ID:</span>{' '}
                        <span className="font-mono">{state.result.jobId}</span>
                      </div>

                      {state.result.data && (
                        <div>
                          <span className="text-muted-foreground">Extracted Data:</span>
                          <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                            {JSON.stringify(state.result.data, null, 2)}
                          </pre>
                        </div>
                      )}

                      {state.result.fieldsMissing && state.result.fieldsMissing.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Missing Fields:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {state.result.fieldsMissing.map((field) => (
                              <Badge key={field} variant="outline" className="text-xs opacity-60">
                                {field}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {state.result.errors && state.result.errors.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Extraction Warnings:</span>
                          <ul className="mt-1 text-xs text-yellow-600 list-disc list-inside">
                            {state.result.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}