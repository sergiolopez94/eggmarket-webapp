import { fileTypeFromBuffer } from 'file-type'

export interface FileTypeResult {
  detectedType: 'image' | 'pdf' | 'unknown'
  mimeType: string
  extension: string
  isValid: boolean
  error?: string
}

export interface PDFAnalysisResult {
  hasText: boolean
  pageCount: number
  textLength: number
  processingStrategy: 'text-extraction' | 'ocr-fallback'
  confidence: number
}

export class FileTypeDetectionService {
  /**
   * Enhanced file type detection using magic bytes
   * More reliable than relying on browser-provided MIME types
   */
  static async detectFileType(file: File): Promise<FileTypeResult> {
    try {
      // Convert File to buffer for magic byte detection
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Use file-type library for magic byte detection
      const detectedType = await fileTypeFromBuffer(buffer)

      if (!detectedType) {
        return {
          detectedType: 'unknown',
          mimeType: file.type || 'unknown',
          extension: 'unknown',
          isValid: false,
          error: 'Could not determine file type from content'
        }
      }

      // Validate against our supported types
      const supportedImageTypes = ['jpg', 'jpeg', 'png', 'webp']
      const supportedPdfTypes = ['pdf']

      let detectedCategory: 'image' | 'pdf' | 'unknown'
      let isValid = false

      if (supportedImageTypes.includes(detectedType.ext)) {
        detectedCategory = 'image'
        isValid = true
      } else if (supportedPdfTypes.includes(detectedType.ext)) {
        detectedCategory = 'pdf'
        isValid = true
      } else {
        detectedCategory = 'unknown'
        isValid = false
      }

      // Additional validation - check if browser MIME type matches detected type
      const browserMimeType = file.type.toLowerCase()
      const detectedMimeType = detectedType.mime.toLowerCase()

      // Warn if there's a mismatch but don't fail (browser types can be unreliable)
      if (browserMimeType && browserMimeType !== detectedMimeType) {
        console.warn(`MIME type mismatch: browser=${browserMimeType}, detected=${detectedMimeType}`)
      }

      return {
        detectedType: detectedCategory,
        mimeType: detectedType.mime,
        extension: detectedType.ext,
        isValid,
        error: isValid ? undefined : `Unsupported file type: ${detectedType.ext}`
      }

    } catch (error) {
      console.error('File type detection error:', error)
      return {
        detectedType: 'unknown',
        mimeType: file.type || 'unknown',
        extension: 'unknown',
        isValid: false,
        error: `File type detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Analyze PDF to determine if it has text content or needs OCR
   * This is a lightweight wrapper that delegates to PDFProcessingService
   */
  static async analyzePDF(file: File): Promise<PDFAnalysisResult> {
    // Use dynamic import to avoid loading pdf-parse at module level
    try {
      const { PDFProcessingService } = await import('./pdf-processing')
      const analysis = await PDFProcessingService.analyzePDFContent(file)
      return analysis
    } catch (error) {
      console.error('PDF analysis error:', error)

      // If PDF parsing fails, assume it's a scanned document
      return {
        hasText: false,
        pageCount: 1,
        textLength: 0,
        processingStrategy: 'ocr-fallback',
        confidence: 0.8 // High confidence that we need OCR if parsing failed
      }
    }
  }

  /**
   * Get recommended processing strategy for a file
   */
  static async getProcessingStrategy(file: File): Promise<{
    strategy: 'google-vision-ocr' | 'pdf-text-extraction' | 'pdf-ocr-fallback'
    fileType: FileTypeResult
    pdfAnalysis?: PDFAnalysisResult
    estimatedTime: string
    estimatedCost: 'low' | 'medium' | 'high'
  }> {
    const fileType = await this.detectFileType(file)

    if (!fileType.isValid) {
      throw new Error(fileType.error || 'Invalid file type')
    }

    if (fileType.detectedType === 'image') {
      return {
        strategy: 'google-vision-ocr',
        fileType,
        estimatedTime: '3-7 seconds',
        estimatedCost: 'medium'
      }
    }

    if (fileType.detectedType === 'pdf') {
      const pdfAnalysis = await this.analyzePDF(file)

      if (pdfAnalysis.processingStrategy === 'text-extraction') {
        return {
          strategy: 'pdf-text-extraction',
          fileType,
          pdfAnalysis,
          estimatedTime: '1-2 seconds',
          estimatedCost: 'low'
        }
      } else {
        return {
          strategy: 'pdf-ocr-fallback',
          fileType,
          pdfAnalysis,
          estimatedTime: `${Math.max(5, pdfAnalysis.pageCount * 2)}-${Math.max(10, pdfAnalysis.pageCount * 4)} seconds`,
          estimatedCost: pdfAnalysis.pageCount > 3 ? 'high' : 'medium'
        }
      }
    }

    throw new Error(`Unsupported file type: ${fileType.detectedType}`)
  }
}