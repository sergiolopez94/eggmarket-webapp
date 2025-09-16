import { OpenAIParser, DocumentTemplate, ParsingResult, ParsedData } from '../document-extraction/parsers/OpenAIParser'
import { createServerClient } from '@/lib/supabase/server'

export interface TemplateParsingResult {
  success: boolean
  extractedData: ParsedData
  confidence: number
  fieldsFound: string[]
  fieldsMissing: string[]
  templateUsed: string
  processingTimeMs: number
  errors?: string[]
  warnings?: string[]
}

export interface TemplateInfo {
  documentType: string
  version: string
  lastUpdated: string
  fieldCount: number
  requiredFields: string[]
  optionalFields: string[]
}

export class TemplateParsingService {
  private openaiParser: OpenAIParser
  private templateCache: Map<string, DocumentTemplate> = new Map()

  constructor() {
    this.openaiParser = new OpenAIParser()
  }

  /**
   * Main entry point for template-based parsing
   * Takes raw text and document type, returns structured data
   */
  async parseDocument(
    rawText: string,
    documentType: 'license' | 'carter_cert' | 'insurance'
  ): Promise<TemplateParsingResult> {
    const startTime = Date.now()

    try {
      if (!rawText || rawText.trim().length === 0) {
        return {
          success: false,
          extractedData: {},
          confidence: 0,
          fieldsFound: [],
          fieldsMissing: [],
          templateUsed: documentType,
          processingTimeMs: Date.now() - startTime,
          errors: ['No text provided for parsing']
        }
      }

      console.log(`Starting template parsing for document type: ${documentType}`)
      console.log(`Raw text length: ${rawText.length} characters`)

      // Step 1: Get the appropriate template
      const template = await this.getTemplate(documentType)
      if (!template) {
        return {
          success: false,
          extractedData: {},
          confidence: 0,
          fieldsFound: [],
          fieldsMissing: [],
          templateUsed: documentType,
          processingTimeMs: Date.now() - startTime,
          errors: [`No template found for document type: ${documentType}`]
        }
      }

      // Step 2: Parse using OpenAI with the template
      console.log(`Using template with ${Object.keys(template.extractionFields).length} fields`)
      const parseResult = await this.openaiParser.parseDocument(rawText, template)

      // Step 3: Post-process and validate the results
      const processedResult = await this.postProcessResults(parseResult, template, rawText)

      const processingTime = Date.now() - startTime
      console.log(`Template parsing completed in ${processingTime}ms with confidence: ${processedResult.confidence}`)

      return {
        success: true,
        extractedData: processedResult.data,
        confidence: processedResult.confidence,
        fieldsFound: processedResult.fieldsFound,
        fieldsMissing: processedResult.fieldsMissing,
        templateUsed: documentType,
        processingTimeMs: processingTime,
        errors: processedResult.errors,
        warnings: this.generateWarnings(processedResult, template)
      }

    } catch (error) {
      console.error('Template parsing failed:', error)

      return {
        success: false,
        extractedData: {},
        confidence: 0,
        fieldsFound: [],
        fieldsMissing: [],
        templateUsed: documentType,
        processingTimeMs: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Unknown parsing error']
      }
    }
  }

  /**
   * Get template configuration from database with caching
   */
  private async getTemplate(documentType: string): Promise<DocumentTemplate | null> {
    try {
      // Check cache first
      const cacheKey = documentType
      if (this.templateCache.has(cacheKey)) {
        console.log(`Using cached template for ${documentType}`)
        return this.templateCache.get(cacheKey)!
      }

      console.log(`Fetching template for ${documentType} from database`)

      const supabase = await createServerClient()

      const { data: template, error } = await supabase
        .from('extraction_templates')
        .select('template_config')
        .eq('document_type', documentType)
        .eq('is_active', true)
        .single()

      if (error || !template) {
        console.error(`Template not found for ${documentType}:`, error)
        return null
      }

      const documentTemplate: DocumentTemplate = {
        documentType,
        extractionFields: template.template_config.extractionFields
      }

      // Cache the template
      this.templateCache.set(cacheKey, documentTemplate)
      console.log(`Cached template for ${documentType}`)

      return documentTemplate

    } catch (error) {
      console.error('Error fetching template:', error)
      return null
    }
  }

  /**
   * Post-process parsing results with additional validation and cleaning
   */
  private async postProcessResults(
    parseResult: ParsingResult,
    template: DocumentTemplate,
    originalText: string
  ): Promise<ParsingResult> {
    // Clean and normalize the extracted data
    const cleanedData = this.cleanExtractedData(parseResult.data, template)

    // Perform additional validation
    const additionalErrors: string[] = []

    // Check for suspicious results
    Object.entries(cleanedData).forEach(([fieldName, value]) => {
      if (value && typeof value === 'string') {
        // Check if the value actually appears in the original text
        if (!this.isValueInText(value, originalText)) {
          additionalErrors.push(`Extracted value for ${fieldName} may be hallucinated: ${value}`)
        }
      }
    })

    return {
      data: cleanedData,
      confidence: parseResult.confidence,
      fieldsFound: parseResult.fieldsFound,
      fieldsMissing: parseResult.fieldsMissing,
      errors: [...(parseResult.errors || []), ...additionalErrors]
    }
  }

  /**
   * Clean and normalize extracted data based on field types
   */
  private cleanExtractedData(data: ParsedData, template: DocumentTemplate): ParsedData {
    const cleaned: ParsedData = {}

    Object.entries(template.extractionFields).forEach(([fieldName, config]) => {
      const value = data[fieldName]

      if (value === null || value === undefined || value === '') {
        cleaned[fieldName] = null
        return
      }

      // Clean based on data type
      switch (config.type) {
        case 'date':
          cleaned[fieldName] = this.cleanDate(value)
          break

        case 'number':
          cleaned[fieldName] = this.cleanNumber(value)
          break

        case 'string':
          cleaned[fieldName] = this.cleanString(value)
          break

        default:
          cleaned[fieldName] = value
      }
    })

    return cleaned
  }

  /**
   * Clean and validate date fields
   */
  private cleanDate(value: any): string | null {
    if (typeof value !== 'string') {
      return null
    }

    // If already in YYYY-MM-DD format, validate and return
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const date = new Date(value)
      if (date instanceof Date && !isNaN(date.getTime())) {
        return value
      }
    }

    // Try to parse various date formats
    const dateFormats = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
      /(\d{1,2})-(\d{1,2})-(\d{4})/, // MM-DD-YYYY
      /(\d{4})\/(\d{1,2})\/(\d{1,2})/, // YYYY/MM/DD
      /(\d{4})-(\d{1,2})-(\d{1,2})/ // YYYY-MM-DD
    ]

    for (const format of dateFormats) {
      const match = value.match(format)
      if (match) {
        let year, month, day

        if (format.source.startsWith('(\\d{4})')) {
          [, year, month, day] = match
        } else {
          [, month, day, year] = match
        }

        const monthNum = parseInt(month, 10)
        const dayNum = parseInt(day, 10)
        const yearNum = parseInt(year, 10)

        if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
          const formattedDate = `${yearNum}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`
          const date = new Date(formattedDate)

          if (date instanceof Date && !isNaN(date.getTime())) {
            return formattedDate
          }
        }
      }
    }

    return null
  }

  /**
   * Clean and validate number fields
   */
  private cleanNumber(value: any): number | null {
    if (typeof value === 'number') {
      return value
    }

    if (typeof value === 'string') {
      // Remove common non-numeric characters
      const cleaned = value.replace(/[,$\s]/g, '')
      const num = parseFloat(cleaned)

      if (!isNaN(num)) {
        return num
      }
    }

    return null
  }

  /**
   * Clean and normalize string fields
   */
  private cleanString(value: any): string | null {
    if (typeof value !== 'string') {
      return null
    }

    return value.trim() || null
  }

  /**
   * Check if an extracted value appears in the original text
   */
  private isValueInText(value: string, text: string): boolean {
    if (!value || !text) return false

    // Normalize both strings for comparison
    const normalizedValue = value.toLowerCase().replace(/\s+/g, ' ').trim()
    const normalizedText = text.toLowerCase().replace(/\s+/g, ' ')

    // Direct substring match
    if (normalizedText.includes(normalizedValue)) {
      return true
    }

    // For dates, check if the components appear
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-')
      const hasYear = normalizedText.includes(year)
      const hasMonth = normalizedText.includes(month.replace(/^0/, ''))
      const hasDay = normalizedText.includes(day.replace(/^0/, ''))

      return hasYear && hasMonth && hasDay
    }

    // For numbers, check if the number appears anywhere
    if (/^\d+(\.\d+)?$/.test(normalizedValue)) {
      return normalizedText.includes(normalizedValue)
    }

    return false
  }

  /**
   * Generate warnings for the parsing results
   */
  private generateWarnings(
    parseResult: ParsingResult,
    template: DocumentTemplate
  ): string[] {
    const warnings: string[] = []

    // Low confidence warning
    if (parseResult.confidence < 0.6) {
      warnings.push(`Low parsing confidence: ${Math.round(parseResult.confidence * 100)}%`)
    }

    // Missing required fields warning
    const requiredFields = Object.entries(template.extractionFields)
      .filter(([_, config]) => config.required)
      .map(([fieldName]) => fieldName)

    const missingRequired = requiredFields.filter(field =>
      parseResult.fieldsMissing.includes(field)
    )

    if (missingRequired.length > 0) {
      warnings.push(`Missing required fields: ${missingRequired.join(', ')}`)
    }

    return warnings
  }

  /**
   * Get information about available templates
   */
  async getAvailableTemplates(): Promise<TemplateInfo[]> {
    try {
      const supabase = await createServerClient()

      const { data: templates, error } = await supabase
        .from('extraction_templates')
        .select('document_type, version, updated_at, template_config')
        .eq('is_active', true)

      if (error) {
        console.error('Error fetching templates:', error)
        return []
      }

      return templates.map(template => {
        const fields = Object.entries(template.template_config.extractionFields || {})
        const requiredFields = fields
          .filter(([_, config]: [string, any]) => config.required)
          .map(([fieldName]) => fieldName)
        const optionalFields = fields
          .filter(([_, config]: [string, any]) => !config.required)
          .map(([fieldName]) => fieldName)

        return {
          documentType: template.document_type,
          version: template.version || '1.0',
          lastUpdated: template.updated_at,
          fieldCount: fields.length,
          requiredFields,
          optionalFields
        }
      })

    } catch (error) {
      console.error('Error getting available templates:', error)
      return []
    }
  }

  /**
   * Clear template cache (useful for development or template updates)
   */
  clearCache(): void {
    this.templateCache.clear()
    console.log('Template cache cleared')
  }

  /**
   * Health check for the template parsing service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Check if OpenAI parser is healthy
      const openaiHealthy = await this.openaiParser.healthCheck()

      // Check if we can fetch templates
      const templates = await this.getAvailableTemplates()
      const templatesHealthy = templates.length > 0

      return openaiHealthy && templatesHealthy
    } catch (error) {
      console.error('TemplateParsingService health check failed:', error)
      return false
    }
  }
}