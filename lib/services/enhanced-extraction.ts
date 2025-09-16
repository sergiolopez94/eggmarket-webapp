import { createServerClient } from '@/lib/supabase/server'

export interface ValidationRule {
  minLength?: number
  maxLength?: number
  format?: string
  minYear?: number
  maxYear?: number
  mustBePast?: boolean
  mustBeFuture?: boolean
  allowedChars?: string
  transform?: string
}

export interface FieldConfig {
  type: string
  required: boolean
  fieldPrompt: string
  patterns: string[]
  validationRules: ValidationRule
  examples: (string | null)[]
}

export interface ExtractionTemplate {
  documentType: string
  version: string
  description: string
  extractionFields: Record<string, FieldConfig>
  documentSpecificInstructions: string[]
  extractionStrategy: string
  confidenceThreshold: number
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  transformedValue: any
}

export interface ExtractionResult {
  success: boolean
  data: Record<string, any>
  confidence: number
  fieldValidation: Record<string, ValidationResult>
  errors: string[]
}

export class EnhancedExtractionService {
  private supabase: any

  constructor() {
    this.initializeSupabase()
  }

  private async initializeSupabase() {
    this.supabase = await createServerClient()
  }

  /**
   * Get extraction template by document type
   */
  async getTemplate(documentType: string): Promise<ExtractionTemplate | null> {
    if (!this.supabase) {
      await this.initializeSupabase()
    }

    const { data, error } = await this.supabase
      .from('extraction_templates')
      .select('template_config')
      .eq('document_type', documentType)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return null
    }

    return data.template_config as ExtractionTemplate
  }

  /**
   * Generate field-specific prompt for OpenAI
   */
  generateFieldPrompt(template: ExtractionTemplate, ocrText: string): string {
    let fieldPrompts = ''

    for (const [fieldName, fieldConfig] of Object.entries(template.extractionFields)) {
      fieldPrompts += `\n**${fieldName}** (${fieldConfig.required ? 'REQUIRED' : 'OPTIONAL'}):\n`
      fieldPrompts += `${fieldConfig.fieldPrompt}\n`

      if (fieldConfig.examples && fieldConfig.examples.length > 0) {
        const validExamples = fieldConfig.examples.filter(e => e !== null)
        if (validExamples.length > 0) {
          fieldPrompts += `Examples: ${validExamples.join(', ')}\n`
        }
      }
    }

    const enhancedPrompt = `You are a ${template.documentType} extraction expert. Extract structured data using these field-specific instructions:

DOCUMENT TYPE: ${template.documentType}
DOCUMENT INSTRUCTIONS:
${template.documentSpecificInstructions.map(inst => `- ${inst}`).join('\n')}

OCR TEXT FROM DOCUMENT:
${ocrText}

FIELD EXTRACTION INSTRUCTIONS:
${fieldPrompts}

IMPORTANT RULES:
1. Return ONLY valid JSON with the exact field names specified
2. Follow each field's specific prompt instructions carefully
3. Apply any format transformations as specified
4. Return null for optional fields if not found or unclear
5. Be precise - don't guess if information is unclear
6. Ensure all required fields have values

Return JSON with fields: ${Object.keys(template.extractionFields).join(', ')}`

    return enhancedPrompt
  }

  /**
   * Validate extracted field value
   */
  validateField(fieldName: string, value: any, config: FieldConfig): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      transformedValue: value
    }

    // Check required fields
    if (config.required && (value === null || value === undefined || value === '')) {
      result.isValid = false
      result.errors.push(`${fieldName} is required but was not found`)
      return result
    }

    // Skip validation for null optional fields
    if (!config.required && (value === null || value === undefined)) {
      result.transformedValue = null
      return result
    }

    const rules = config.validationRules

    // Transform value if needed
    if (rules.transform === 'uppercase' && typeof value === 'string') {
      result.transformedValue = value.toUpperCase()
      value = result.transformedValue
    }

    // String validations
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        result.isValid = false
        result.errors.push(`${fieldName} must be at least ${rules.minLength} characters`)
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        result.isValid = false
        result.errors.push(`${fieldName} must not exceed ${rules.maxLength} characters`)
      }

      if (rules.allowedChars === 'digits only' && !/^\d+$/.test(value)) {
        result.isValid = false
        result.errors.push(`${fieldName} must contain only digits`)
      }

      if (rules.allowedChars === 'letters and spaces' && !/^[a-zA-Z\s]+$/.test(value)) {
        result.isValid = false
        result.errors.push(`${fieldName} must contain only letters and spaces`)
      }
    }

    // Date validations
    if (config.type === 'date' && typeof value === 'string') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(value)) {
        result.isValid = false
        result.errors.push(`${fieldName} must be in YYYY-MM-DD format`)
      } else {
        const date = new Date(value)
        const year = date.getFullYear()

        if (rules.minYear && year < rules.minYear) {
          result.isValid = false
          result.errors.push(`${fieldName} year must be ${rules.minYear} or later`)
        }

        if (rules.maxYear && year > rules.maxYear) {
          result.isValid = false
          result.errors.push(`${fieldName} year must be ${rules.maxYear} or earlier`)
        }

        if (rules.mustBePast && date > new Date()) {
          result.isValid = false
          result.errors.push(`${fieldName} must be a past date`)
        }

        if (rules.mustBeFuture && date < new Date()) {
          result.isValid = false
          result.errors.push(`${fieldName} must be a future date`)
        }
      }
    }

    return result
  }

  /**
   * Validate all extracted data
   */
  validateExtraction(extractedData: Record<string, any>, template: ExtractionTemplate): Record<string, ValidationResult> {
    const validationResults: Record<string, ValidationResult> = {}

    for (const [fieldName, fieldConfig] of Object.entries(template.extractionFields)) {
      const value = extractedData[fieldName]
      validationResults[fieldName] = this.validateField(fieldName, value, fieldConfig)
    }

    return validationResults
  }

  /**
   * Calculate extraction confidence score
   */
  calculateConfidence(validationResults: Record<string, ValidationResult>, template: ExtractionTemplate): number {
    let totalFields = 0
    let validFields = 0
    let requiredFields = 0
    let validRequiredFields = 0

    for (const [fieldName, fieldConfig] of Object.entries(template.extractionFields)) {
      totalFields++
      if (fieldConfig.required) {
        requiredFields++
        if (validationResults[fieldName]?.isValid) {
          validRequiredFields++
        }
      }
      if (validationResults[fieldName]?.isValid) {
        validFields++
      }
    }

    // Heavily weight required fields
    const requiredScore = requiredFields > 0 ? (validRequiredFields / requiredFields) * 0.8 : 0.8
    const overallScore = totalFields > 0 ? (validFields / totalFields) * 0.2 : 0.2

    return Math.round((requiredScore + overallScore) * 100) / 100
  }

  /**
   * Process extraction results with validation
   */
  processExtractionResults(
    rawData: Record<string, any>,
    template: ExtractionTemplate
  ): ExtractionResult {
    const validationResults = this.validateExtraction(rawData, template)
    const confidence = this.calculateConfidence(validationResults, template)

    // Transform data based on validation results
    const transformedData: Record<string, any> = {}
    const errors: string[] = []

    for (const [fieldName, validation] of Object.entries(validationResults)) {
      transformedData[fieldName] = validation.transformedValue
      if (!validation.isValid) {
        errors.push(...validation.errors)
      }
    }

    return {
      success: errors.length === 0 && confidence >= template.confidenceThreshold,
      data: transformedData,
      confidence,
      fieldValidation: validationResults,
      errors
    }
  }
}