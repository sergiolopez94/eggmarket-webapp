import pdf from 'pdf-parse'
import { fromBuffer } from 'pdf2pic'
import { FileTypeDetectionService, PDFAnalysisResult } from './file-type-detection'

export interface PDFTextExtractionResult {
  success: boolean
  text: string
  pageCount: number
  processingTimeMs: number
  method: 'text-extraction'
  error?: string
}

export interface PDFToImageResult {
  success: boolean
  images: Buffer[]
  pageCount: number
  processingTimeMs: number
  method: 'pdf-to-image'
  error?: string
}

export class PDFProcessingService {
  /**
   * Extract text directly from PDF (fast, cheap method)
   */
  static async extractTextFromPDF(file: File): Promise<PDFTextExtractionResult> {
    const startTime = Date.now()

    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Extract text using pdf-parse
      const pdfData = await pdf(buffer)

      const processingTimeMs = Date.now() - startTime

      // Clean and normalize extracted text
      const cleanText = this.cleanExtractedText(pdfData.text || '')

      return {
        success: true,
        text: cleanText,
        pageCount: pdfData.numpages || 1,
        processingTimeMs,
        method: 'text-extraction'
      }

    } catch (error) {
      const processingTimeMs = Date.now() - startTime

      return {
        success: false,
        text: '',
        pageCount: 0,
        processingTimeMs,
        method: 'text-extraction',
        error: error instanceof Error ? error.message : 'Unknown error during text extraction'
      }
    }
  }

  /**
   * Convert PDF pages to images for OCR processing
   */
  static async convertPDFToImages(file: File): Promise<PDFToImageResult> {
    const startTime = Date.now()

    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Configure pdf2pic for optimal OCR quality
      const convertOptions = {
        density: 200, // DPI - higher for better OCR accuracy
        saveFilename: 'page',
        savePath: './temp', // Will be ignored since we're getting buffers
        format: 'png',
        width: 2000, // Max width for good OCR quality
        height: 3000, // Max height
        quality: 90 // High quality for better text recognition
      }

      // Convert PDF to images
      const conversion = fromBuffer(buffer, convertOptions)

      // Get all pages as buffers
      const images: Buffer[] = []
      let pageCount = 0

      // pdf2pic doesn't give us page count upfront, so we'll try pages until we fail
      for (let i = 1; i <= 50; i++) { // Reasonable limit to prevent infinite loop
        try {
          const result = await conversion(i, { responseType: 'buffer' })
          if (result && result.buffer) {
            images.push(result.buffer)
            pageCount = i
          } else {
            break
          }
        } catch (pageError) {
          // No more pages
          break
        }
      }

      const processingTimeMs = Date.now() - startTime

      if (images.length === 0) {
        return {
          success: false,
          images: [],
          pageCount: 0,
          processingTimeMs,
          method: 'pdf-to-image',
          error: 'No pages could be converted to images'
        }
      }

      return {
        success: true,
        images,
        pageCount,
        processingTimeMs,
        method: 'pdf-to-image'
      }

    } catch (error) {
      const processingTimeMs = Date.now() - startTime

      return {
        success: false,
        images: [],
        pageCount: 0,
        processingTimeMs,
        method: 'pdf-to-image',
        error: error instanceof Error ? error.message : 'Unknown error during PDF to image conversion'
      }
    }
  }

  /**
   * Process PDF images through Google Cloud Vision OCR
   */
  static async processImagesWithOCR(images: Buffer[]): Promise<{
    success: boolean
    combinedText: string
    confidence: number
    pageResults: Array<{ text: string; confidence: number }>
    error?: string
  }> {
    try {
      const { GoogleVisionExtractor } = await import('./document-extraction/extractors/GoogleVisionExtractor')
      const extractor = new GoogleVisionExtractor()

      const pageResults: Array<{ text: string; confidence: number }> = []
      let totalConfidence = 0
      let allText: string[] = []

      for (let i = 0; i < images.length; i++) {
        try {
          const result = await extractor.extractText(images[i], 'image/png')
          pageResults.push({
            text: result.text,
            confidence: result.confidence
          })

          if (result.text.trim()) {
            allText.push(`--- Page ${i + 1} ---\n${result.text.trim()}`)
            totalConfidence += result.confidence
          }
        } catch (pageError) {
          console.error(`OCR failed for page ${i + 1}:`, pageError)
          pageResults.push({
            text: '',
            confidence: 0
          })
        }
      }

      const averageConfidence = pageResults.length > 0
        ? totalConfidence / pageResults.length
        : 0

      return {
        success: allText.length > 0,
        combinedText: allText.join('\n\n'),
        confidence: averageConfidence,
        pageResults,
        error: allText.length === 0 ? 'No text extracted from any pages' : undefined
      }

    } catch (error) {
      return {
        success: false,
        combinedText: '',
        confidence: 0,
        pageResults: [],
        error: error instanceof Error ? error.message : 'OCR processing failed'
      }
    }
  }

  /**
   * Intelligent PDF processing that chooses the best method
   */
  static async processPDF(file: File): Promise<{
    textResult?: PDFTextExtractionResult
    imageResult?: PDFToImageResult
    ocrResult?: { success: boolean; combinedText: string; confidence: number }
    recommendedText: string
    analysis: PDFAnalysisResult
    processingMethod: 'text-extraction' | 'ocr-fallback' | 'hybrid'
    totalProcessingTimeMs: number
  }> {
    const overallStartTime = Date.now()

    // First analyze the PDF to determine strategy
    const analysis = await FileTypeDetectionService.analyzePDF(file)

    let textResult: PDFTextExtractionResult | undefined
    let imageResult: PDFToImageResult | undefined
    let ocrResult: { success: boolean; combinedText: string; confidence: number } | undefined
    let recommendedText = ''
    let processingMethod: 'text-extraction' | 'ocr-fallback' | 'hybrid' = 'text-extraction'

    if (analysis.processingStrategy === 'text-extraction') {
      // Try text extraction first
      textResult = await this.extractTextFromPDF(file)

      if (textResult.success && textResult.text.length > 50) {
        // Text extraction successful with meaningful content
        recommendedText = textResult.text
        processingMethod = 'text-extraction'
      } else {
        // Text extraction failed or insufficient text, fall back to OCR
        console.log('Text extraction insufficient, falling back to OCR')
        imageResult = await this.convertPDFToImages(file)

        if (imageResult.success && imageResult.images.length > 0) {
          ocrResult = await this.processImagesWithOCR(imageResult.images)

          if (ocrResult.success) {
            recommendedText = ocrResult.combinedText
            processingMethod = textResult && textResult.text.length > 0 ? 'hybrid' : 'ocr-fallback'
          }
        }
      }
    } else {
      // Analysis suggests OCR is needed
      imageResult = await this.convertPDFToImages(file)
      processingMethod = 'ocr-fallback'

      if (imageResult.success && imageResult.images.length > 0) {
        ocrResult = await this.processImagesWithOCR(imageResult.images)

        if (ocrResult.success) {
          recommendedText = ocrResult.combinedText
        }
      }
    }

    const totalProcessingTimeMs = Date.now() - overallStartTime

    return {
      textResult,
      imageResult,
      ocrResult,
      recommendedText,
      analysis,
      processingMethod,
      totalProcessingTimeMs
    }
  }

  /**
   * Clean and normalize text extracted from PDFs
   */
  private static cleanExtractedText(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove control characters but keep newlines
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Normalize line breaks
      .replace(/\r\n|\r/g, '\n')
      // Remove multiple consecutive newlines
      .replace(/\n{3,}/g, '\n\n')
      // Trim whitespace
      .trim()
  }

  /**
   * Analyze PDF content for file type detection service
   * Similar to analyzePDF from FileTypeDetectionService but moved here to avoid import issues
   */
  static async analyzePDFContent(file: File): Promise<{
    hasText: boolean
    pageCount: number
    textLength: number
    processingStrategy: 'text-extraction' | 'ocr-fallback'
    confidence: number
  }> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Parse PDF to extract text
      const pdfData = await pdf(buffer)

      const textLength = pdfData.text?.length || 0
      const pageCount = pdfData.numpages || 1

      // Determine if PDF has meaningful text content
      const hasText = textLength > 50 // Threshold for meaningful text

      // Calculate confidence based on text density
      const textDensity = textLength / pageCount
      let confidence = 0

      if (textLength === 0) {
        // No text at all - definitely scanned
        confidence = 0.9
      } else if (textDensity < 20) {
        // Very little text per page - likely scanned with some OCR artifacts
        confidence = 0.3
      } else if (textDensity < 100) {
        // Moderate text - could be either
        confidence = 0.6
      } else {
        // Good amount of text - likely text-based PDF
        confidence = 0.9
      }

      // Determine processing strategy
      const processingStrategy: 'text-extraction' | 'ocr-fallback' =
        hasText && confidence > 0.5 ? 'text-extraction' : 'ocr-fallback'

      return {
        hasText,
        pageCount,
        textLength,
        processingStrategy,
        confidence: Math.round(confidence * 100) / 100
      }

    } catch (error) {
      console.error('PDF content analysis error:', error)

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
   * Validate PDF file before processing
   */
  static async validatePDF(file: File): Promise<{ isValid: boolean; error?: string }> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Check if it starts with PDF magic bytes
      const pdfHeader = buffer.slice(0, 4).toString()
      if (pdfHeader !== '%PDF') {
        return {
          isValid: false,
          error: 'File does not appear to be a valid PDF'
        }
      }

      // Try to parse basic PDF structure
      await pdf(buffer, { max: 1 }) // Just parse first page for validation

      return { isValid: true }

    } catch (error) {
      return {
        isValid: false,
        error: `PDF validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}