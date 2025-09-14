'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface FileUploadProps {
  onFilesChange?: (files: File[]) => void
  maxFiles?: number
  accept?: Record<string, string[]>
  maxSize?: number
  className?: string
  label?: string
  description?: string
  existingFile?: string
  disabled?: boolean
}

export function FileUpload({
  onFilesChange,
  maxFiles = 1,
  accept = {
    'application/pdf': ['.pdf'],
    'image/*': ['.png', '.jpg', '.jpeg']
  },
  maxSize = 5 * 1024 * 1024, // 5MB
  className,
  label,
  description,
  existingFile,
  disabled = false
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string>('')

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError('')

    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      if (rejection.errors?.[0]?.code === 'file-too-large') {
        setError(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB`)
      } else if (rejection.errors?.[0]?.code === 'file-invalid-type') {
        setError('Invalid file type. Please upload PDF or image files only.')
      } else {
        setError('File rejected. Please try again.')
      }
      return
    }

    const newFiles = [...files, ...acceptedFiles].slice(0, maxFiles)
    setFiles(newFiles)
    onFilesChange?.(newFiles)
  }, [files, maxFiles, maxSize, onFilesChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles,
    disabled
  })

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
    onFilesChange?.(newFiles)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          disabled && 'cursor-not-allowed opacity-50',
          error && 'border-red-500 bg-red-50/50'
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center space-y-2">
          <Upload className="h-8 w-8 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-sm text-muted-foreground">Drop the files here...</p>
          ) : (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Click to upload</span> or drag and drop
              </p>
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center space-x-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {existingFile && files.length === 0 && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center space-x-2">
            <File className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{existingFile}</span>
            <span className="text-xs text-muted-foreground">(current file)</span>
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-2">
                <File className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
              </div>
              {!disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(index)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}