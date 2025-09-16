import { ImageAnnotatorClient } from '@google-cloud/vision'
import { BaseExtractor, ExtractionResult, ExtractionOptions } from './BaseExtractor'

export class GoogleVisionExtractor extends BaseExtractor {
  private client: ImageAnnotatorClient

  constructor() {
    super()

    // Initialize Google Cloud Vision client
    // Credentials should be set via environment variables:
    // GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_PROJECT_ID + GOOGLE_CLOUD_PRIVATE_KEY
    this.client = new ImageAnnotatorClient({
      // If running in production, credentials will be loaded automatically
      // from environment variables or service account key file
    })
  }

  async extractText(
    fileBuffer: Buffer,
    mimeType: string,
    options: ExtractionOptions = {}
  ): Promise<ExtractionResult> {
    this.validateInput(fileBuffer, mimeType)

    try {
      // For images, use OCR directly
      if (this.isImage(mimeType)) {
        return await this.extractFromImage(fileBuffer, options)
      }

      // For PDFs, we need to convert to images first or use document AI
      if (this.isPdf(mimeType)) {
        return await this.extractFromPdf(fileBuffer, options)
      }

      throw new Error(`Unsupported file type for Google Vision: ${mimeType}`)

    } catch (error) {
      console.error('Google Vision extraction error:', error)
      throw new Error(`Google Vision API failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async extractFromImage(
    imageBuffer: Buffer,
    options: ExtractionOptions
  ): Promise<ExtractionResult> {
    const request = {
      image: {
        content: imageBuffer.toString('base64')
      },
      features: [
        {
          type: 'TEXT_DETECTION' as const,
          maxResults: 1
        }
      ],
      imageContext: {
        languageHints: options.language ? [options.language] : ['en']
      }
    }

    const [result] = await this.client.annotateImage(request)

    if (result.error) {
      throw new Error(`Google Vision API error: ${result.error.message}`)
    }

    const detections = result.textAnnotations || []

    if (detections.length === 0) {
      return {
        text: '',
        confidence: 0,
        metadata: {
          message: 'No text detected in image'
        }
      }
    }

    // First annotation contains the full text
    const fullText = detections[0].description || ''

    // Calculate average confidence from individual word detections
    const wordDetections = detections.slice(1) // Skip the full text annotation
    let totalConfidence = 0
    let confidenceCount = 0

    for (const detection of wordDetections) {
      if (detection.confidence !== undefined) {
        totalConfidence += detection.confidence
        confidenceCount++
      }
    }

    const averageConfidence = confidenceCount > 0
      ? totalConfidence / confidenceCount
      : 0.5 // Default confidence if not available

    return {
      text: fullText,
      confidence: averageConfidence,
      metadata: {
        totalDetections: detections.length,
        hasConfidenceScores: confidenceCount > 0,
        imageSize: imageBuffer.length
      }
    }
  }

  private async extractFromPdf(
    pdfBuffer: Buffer,
    options: ExtractionOptions
  ): Promise<ExtractionResult> {
    // For now, we'll use basic document text detection
    // In Phase 2, we can upgrade to Document AI for better PDF parsing

    const request = {
      inputConfig: {
        gcsSource: {
          // For now, we'll need to upload to GCS or use inline content
          // This is a simplified implementation
        },
        mimeType: 'application/pdf'
      },
      features: [
        {
          type: 'DOCUMENT_TEXT_DETECTION' as const
        }
      ],
      // For inline PDF processing, we need to use the async batch annotation
      // or convert PDF to images first
    }

    // Simplified approach: throw error for now, implement in Phase 2
    throw new Error('PDF processing via Google Vision will be implemented in Phase 2. Please use images for now.')
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      // Create a simple 1x1 pixel test image
      const testImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

      const result = await this.extractFromImage(testImage, {})
      return true
    } catch (error) {
      console.error('Google Vision health check failed:', error)
      return false
    }
  }
}