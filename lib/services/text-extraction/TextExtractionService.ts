import { FileTypeDetectionService, FileTypeResult, ProcessingStrategy } from '../file-type-detection.ts'
import { PDFProcessingService, PDFProcessingResult } from '../pdf-processing.ts'
import { GoogleVisionExtractor } from '../document-extraction/extractors/GoogleVisionExtractor.ts'

export interface TextExtractionResult {
  success: boolean
  text: string
  confidence: number
  processingMethod: 'pdf-text-extraction' | 'pdf-ocr-fallback' | 'image-ocr' | 'hybrid'
  processingTimeMs: number
  fileType: string
  estimatedCost: number
  metadata?: {
    pageCount?: number
    textLength?: number
    ocrConfidence?: number
    fallbackReason?: string
  }
  error?: string
}

export class TextExtractionService {
  private visionExtractor: GoogleVisionExtractor

  constructor() {
    this.visionExtractor = new GoogleVisionExtractor()
  }

  /**
   * Main entry point for text extraction from any file type
   * Intelligently routes to the best extraction method based on file analysis
   */
  async extractText(file: File): Promise<TextExtractionResult> {
    const startTime = Date.now()

    try {
      // Step 1: Analyze file type and determine processing strategy
      console.log(`Starting text extraction for file: ${file.name} (${file.size} bytes)`)

      const strategy = await FileTypeDetectionService.getProcessingStrategy(file)
      console.log(`Processing strategy determined: ${strategy.strategy}`)

      // Step 2: Route to appropriate extraction method
      let result: TextExtractionResult

      switch (strategy.strategy) {
        case 'text-extraction':
          result = await this.extractFromTextPDF(file, strategy)
          break

        case 'pdf-ocr-fallback':
          result = await this.extractFromScannedPDF(file, strategy)
          break

        case 'image-ocr':
          result = await this.extractFromImage(file, strategy)
          break

        case 'hybrid':
          result = await this.extractUsingHybridMethod(file, strategy)
          break

        default:
          throw new Error(`Unsupported processing strategy: ${strategy.strategy}`)
      }

      // Step 3: Add timing information
      result.processingTimeMs = Date.now() - startTime
      console.log(`Text extraction completed in ${result.processingTimeMs}ms using ${result.processingMethod}`)

      return result

    } catch (error) {
      console.error('Text extraction failed:', error)

      return {
        success: false,
        text: '',
        confidence: 0,
        processingMethod: 'image-ocr',
        processingTimeMs: Date.now() - startTime,
        fileType: file.type || 'unknown',
        estimatedCost: 0,
        error: error instanceof Error ? error.message : 'Unknown extraction error'
      }
    }
  }

  /**
   * Extract text directly from text-based PDFs
   */
  private async extractFromTextPDF(file: File, strategy: ProcessingStrategy): Promise<TextExtractionResult> {
    try {
      console.log('Attempting direct PDF text extraction')

      const pdfResult = await PDFProcessingService.extractTextFromPDF(file)

      if (pdfResult.success && pdfResult.text && pdfResult.text.length > 50) {
        return {
          success: true,
          text: pdfResult.text,
          confidence: pdfResult.confidence || 0.95,
          processingMethod: 'pdf-text-extraction',
          processingTimeMs: 0, // Will be filled by caller
          fileType: strategy.fileType.detectedType,
          estimatedCost: 0.001, // Very cheap - no API calls
          metadata: {
            pageCount: pdfResult.pageCount,
            textLength: pdfResult.text.length
          }
        }
      } else {
        // Text extraction failed, fallback to OCR
        console.log('PDF text extraction insufficient, falling back to OCR')
        return await this.extractFromScannedPDF(file, strategy)
      }

    } catch (error) {
      console.error('PDF text extraction failed:', error)
      // Fallback to OCR on any PDF processing error
      return await this.extractFromScannedPDF(file, strategy)
    }
  }

  /**
   * Extract text from scanned PDFs using PDF-to-image conversion + OCR
   */
  private async extractFromScannedPDF(file: File, strategy: ProcessingStrategy): Promise<TextExtractionResult> {
    try {
      console.log('Processing PDF with OCR fallback method')

      // Full PDF processing with OCR
      const pdfResult = await PDFProcessingService.processPDF(file)

      if (pdfResult.success && pdfResult.recommendedText) {
        return {
          success: true,
          text: pdfResult.recommendedText,
          confidence: this.calculateOverallConfidence(pdfResult),
          processingMethod: 'pdf-ocr-fallback',
          processingTimeMs: pdfResult.totalProcessingTimeMs || 0,
          fileType: strategy.fileType.detectedType,
          estimatedCost: this.estimateOCRCost(pdfResult),
          metadata: {
            pageCount: pdfResult.analysis?.pageCount,
            textLength: pdfResult.recommendedText.length,
            ocrConfidence: pdfResult.ocrResult?.confidence,
            fallbackReason: pdfResult.textResult?.success ? 'Low text quality' : 'No extractable text'
          }
        }
      } else {
        throw new Error('PDF OCR processing failed')
      }

    } catch (error) {
      console.error('PDF OCR processing failed:', error)
      throw error
    }
  }

  /**
   * Extract text directly from images using OCR
   */
  private async extractFromImage(file: File, strategy: ProcessingStrategy): Promise<TextExtractionResult> {
    try {
      console.log('Processing image with direct OCR')

      // Convert File to Buffer for GoogleVisionExtractor
      const buffer = await this.fileToBuffer(file)

      const ocrResult = await this.visionExtractor.extractText(buffer, file.type)

      if (ocrResult.success) {
        return {
          success: true,
          text: ocrResult.text,
          confidence: ocrResult.confidence,
          processingMethod: 'image-ocr',
          processingTimeMs: 0, // Will be filled by caller
          fileType: strategy.fileType.detectedType,
          estimatedCost: 0.015, // Approximate Google Vision cost per image
          metadata: {
            ocrConfidence: ocrResult.confidence,
            textLength: ocrResult.text.length
          }
        }
      } else {
        throw new Error(`Image OCR failed: ${ocrResult.error}`)
      }

    } catch (error) {
      console.error('Image OCR processing failed:', error)
      throw error
    }
  }

  /**
   * Use hybrid method - try multiple approaches and return best result
   */
  private async extractUsingHybridMethod(file: File, strategy: ProcessingStrategy): Promise<TextExtractionResult> {
    try {
      console.log('Using hybrid extraction method')

      // For PDFs, try text extraction first, then OCR
      if (strategy.fileType.detectedType === 'pdf') {
        const textResult = await this.extractFromTextPDF(file, strategy)
        if (textResult.success && textResult.text.length > 100) {
          textResult.processingMethod = 'hybrid'
          return textResult
        }

        // Text extraction didn't work well, try OCR
        const ocrResult = await this.extractFromScannedPDF(file, strategy)
        ocrResult.processingMethod = 'hybrid'
        return ocrResult
      } else {
        // For images, just use direct OCR
        const result = await this.extractFromImage(file, strategy)
        result.processingMethod = 'hybrid'
        return result
      }

    } catch (error) {
      console.error('Hybrid extraction failed:', error)
      throw error
    }
  }

  /**
   * Calculate overall confidence from PDF processing result
   */
  private calculateOverallConfidence(pdfResult: PDFProcessingResult): number {
    let confidence = 0.5 // Base confidence

    // Text extraction confidence
    if (pdfResult.textResult?.success) {
      confidence = Math.max(confidence, 0.9)
    }

    // OCR confidence
    if (pdfResult.ocrResult?.confidence) {
      confidence = Math.max(confidence, pdfResult.ocrResult.confidence)
    }

    // Prefer text extraction over OCR if both available
    if (pdfResult.textResult?.success && pdfResult.ocrResult?.success) {
      confidence = Math.max(confidence, 0.95)
    }

    return Math.min(confidence, 1.0)
  }

  /**
   * Estimate OCR processing cost based on pages processed
   */
  private estimateOCRCost(pdfResult: PDFProcessingResult): number {
    const baseImageCost = 0.015 // Per Google Vision API call
    const pageCount = pdfResult.analysis?.pageCount || 1
    return pageCount * baseImageCost
  }

  /**
   * Convert File object to Buffer for legacy APIs
   */
  private async fileToBuffer(file: File): Promise<Buffer> {
    const arrayBuffer = await file.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  /**
   * Health check for the text extraction service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Check if Google Vision extractor is healthy
      const visionHealthy = await this.visionExtractor.healthCheck()

      // Could add more health checks here (PDF processing, file type detection, etc.)

      return visionHealthy
    } catch (error) {
      console.error('TextExtractionService health check failed:', error)
      return false
    }
  }

  /**
   * Get supported file types
   */
  getSupportedFileTypes(): string[] {
    return [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'image/webp'
    ]
  }

  /**
   * Validate if file type is supported
   */
  isFileTypeSupported(mimeType: string): boolean {
    return this.getSupportedFileTypes().includes(mimeType)
  }
}