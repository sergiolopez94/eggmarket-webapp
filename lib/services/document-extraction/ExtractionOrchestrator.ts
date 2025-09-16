import { TextExtractionService, TextExtractionResult } from '../text-extraction/TextExtractionService'
import { TemplateParsingService, TemplateParsingResult } from '../template-parsing/TemplateParsingService'

export interface ProcessingResult {
  success: boolean
  extractedData?: any
  confidence?: number
  processingTimeMs: number
  rawText?: string
  processingMethod?: string
  estimatedCost?: number
  fieldsFound?: string[]
  fieldsMissing?: string[]
  errors?: string[]
  warnings?: string[]
  metadata?: {
    textExtractionResult?: TextExtractionResult
    templateParsingResult?: TemplateParsingResult
  }
}

export class ExtractionOrchestrator {
  private textExtractor: TextExtractionService
  private templateParser: TemplateParsingService

  constructor() {
    this.textExtractor = new TextExtractionService()
    this.templateParser = new TemplateParsingService()
  }

  async processDocument(
    fileBuffer: Buffer,
    mimeType: string,
    documentType: 'license' | 'carter_cert' | 'insurance',
    jobId: string
  ): Promise<ProcessingResult>

  /**
   * Modern method using modular services - preferred approach
   */
  async processDocument(
    file: File,
    documentType: 'license' | 'carter_cert' | 'insurance',
    jobId: string
  ): Promise<ProcessingResult>

  async processDocument(
    fileOrBuffer: File | Buffer,
    documentTypeOrMimeType: 'license' | 'carter_cert' | 'insurance' | string,
    documentTypeOrJobId?: 'license' | 'carter_cert' | 'insurance' | string,
    jobId?: string
  ): Promise<ProcessingResult> {
    const startTime = Date.now()

    try {
      // Handle both old and new method signatures
      let file: File
      let documentType: 'license' | 'carter_cert' | 'insurance'
      let actualJobId: string

      if (fileOrBuffer instanceof File) {
        // New signature: processDocument(file, documentType, jobId)
        file = fileOrBuffer
        documentType = documentTypeOrMimeType as 'license' | 'carter_cert' | 'insurance'
        actualJobId = documentTypeOrJobId as string
      } else {
        // Old signature: processDocument(fileBuffer, mimeType, documentType, jobId)
        const buffer = fileOrBuffer as Buffer
        const mimeType = documentTypeOrMimeType as string
        documentType = documentTypeOrJobId as 'license' | 'carter_cert' | 'insurance'
        actualJobId = jobId as string

        // Convert Buffer to File for new services
        file = new File([buffer], 'document', { type: mimeType })
      }

      console.log(`Starting modular document processing for job ${actualJobId}`)
      console.log(`Document type: ${documentType}, File size: ${file.size} bytes`)

      // Step 1: Extract text using the unified text extraction service
      console.log(`Step 1: Text extraction for job ${actualJobId}`)
      const textResult = await this.textExtractor.extractText(file)

      if (!textResult.success || !textResult.text.trim()) {
        return {
          success: false,
          error: textResult.error || 'No text could be extracted from the document',
          processingTimeMs: Date.now() - startTime,
          processingMethod: textResult.processingMethod,
          estimatedCost: textResult.estimatedCost,
          metadata: {
            textExtractionResult: textResult
          }
        }
      }

      console.log(`Text extraction completed for job ${actualJobId}:`)
      console.log(`- Method: ${textResult.processingMethod}`)
      console.log(`- Text length: ${textResult.text.length} characters`)
      console.log(`- Confidence: ${textResult.confidence}`)
      console.log(`- Cost estimate: $${textResult.estimatedCost.toFixed(4)}`)

      // Step 2: Parse structured data using template service
      console.log(`Step 2: Template parsing for job ${actualJobId}`)
      const parseResult = await this.templateParser.parseDocument(textResult.text, documentType)

      if (!parseResult.success) {
        return {
          success: false,
          error: parseResult.errors?.[0] || 'Template parsing failed',
          processingTimeMs: Date.now() - startTime,
          rawText: textResult.text,
          processingMethod: textResult.processingMethod,
          estimatedCost: textResult.estimatedCost,
          errors: parseResult.errors,
          metadata: {
            textExtractionResult: textResult,
            templateParsingResult: parseResult
          }
        }
      }

      console.log(`Template parsing completed for job ${actualJobId}:`)
      console.log(`- Confidence: ${parseResult.confidence}`)
      console.log(`- Fields found: ${parseResult.fieldsFound.length}`)
      console.log(`- Fields missing: ${parseResult.fieldsMissing.length}`)

      // Step 3: Combine results and calculate overall confidence
      const overallConfidence = this.calculateOverallConfidence(textResult, parseResult)
      const totalProcessingTime = Date.now() - startTime

      console.log(`Document processing completed for job ${actualJobId} in ${totalProcessingTime}ms`)
      console.log(`Overall confidence: ${overallConfidence}`)

      return {
        success: true,
        extractedData: parseResult.extractedData,
        confidence: overallConfidence,
        processingTimeMs: totalProcessingTime,
        rawText: textResult.text,
        processingMethod: textResult.processingMethod,
        estimatedCost: textResult.estimatedCost,
        fieldsFound: parseResult.fieldsFound,
        fieldsMissing: parseResult.fieldsMissing,
        errors: parseResult.errors,
        warnings: parseResult.warnings,
        metadata: {
          textExtractionResult: textResult,
          templateParsingResult: parseResult
        }
      }

    } catch (error) {
      console.error(`Document processing failed for job ${actualJobId || 'unknown'}:`, error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown processing error',
        processingTimeMs: Date.now() - startTime
      }
    }
  }

  /**
   * Calculate overall confidence from text extraction and template parsing results
   */
  private calculateOverallConfidence(
    textResult: TextExtractionResult,
    parseResult: TemplateParsingResult
  ): number {
    // Weight text extraction confidence (40%) and parsing confidence (60%)
    // Parsing confidence is more important for final data quality
    const textWeight = 0.4
    const parseWeight = 0.6

    let overallConfidence = (textResult.confidence * textWeight) + (parseResult.confidence * parseWeight)

    // Bonus for high-quality text extraction methods
    if (textResult.processingMethod === 'pdf-text-extraction') {
      overallConfidence = Math.min(1.0, overallConfidence + 0.05) // Small bonus for text-based PDFs
    }

    // Penalty for low OCR confidence
    if (textResult.processingMethod.includes('ocr') && textResult.confidence < 0.8) {
      overallConfidence = Math.max(0.1, overallConfidence - 0.1)
    }

    return Math.round(overallConfidence * 100) / 100 // Round to 2 decimal places
  }

  /**
   * Health check method - verifies all modular services are functioning
   */
  async healthCheck(): Promise<boolean> {
    try {
      console.log('Running ExtractionOrchestrator health check...')

      const textExtractionHealthy = await this.textExtractor.healthCheck()
      const templateParsingHealthy = await this.templateParser.healthCheck()

      const isHealthy = textExtractionHealthy && templateParsingHealthy

      console.log('Health check results:', {
        textExtraction: textExtractionHealthy,
        templateParsing: templateParsingHealthy,
        overall: isHealthy
      })

      return isHealthy
    } catch (error) {
      console.error('Orchestrator health check failed:', error)
      return false
    }
  }

  /**
   * Get information about the orchestrator and its capabilities
   */
  getInfo() {
    return {
      version: '2.0.0',
      architecture: 'modular',
      services: {
        textExtraction: {
          supportedFileTypes: this.textExtractor.getSupportedFileTypes(),
          methods: ['pdf-text-extraction', 'pdf-ocr-fallback', 'image-ocr', 'hybrid']
        },
        templateParsing: {
          supportedDocumentTypes: ['license', 'carter_cert', 'insurance']
        }
      },
      features: [
        'Intelligent file type detection',
        'Cost-optimized processing',
        'Modular service architecture',
        'Detailed confidence scoring',
        'Comprehensive error handling'
      ]
    }
  }
}