import OpenAI from 'openai'

export interface ParsedData {
  [key: string]: any
}

export interface ParsingResult {
  data: ParsedData
  confidence: number
  fieldsFound: string[]
  fieldsMissing: string[]
  errors?: string[]
}

export interface DocumentTemplate {
  documentType: string
  extractionFields: {
    [fieldName: string]: {
      type: 'string' | 'date' | 'number'
      patterns: string[]
      required: boolean
      format?: string[]
    }
  }
}

export class OpenAIParser {
  private client: OpenAI
  private model: string

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }

    this.client = new OpenAI({
      apiKey: apiKey
    })

    this.model = 'gpt-4o-mini' // Cost-effective model for document parsing
  }

  async parseDocument(
    extractedText: string,
    template: DocumentTemplate
  ): Promise<ParsingResult> {
    if (!extractedText.trim()) {
      throw new Error('No text provided for parsing')
    }

    try {
      const prompt = this.buildPrompt(extractedText, template)

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a document data extraction specialist. Extract information from documents accurately and return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Low temperature for consistent results
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      })

      const responseText = response.choices[0]?.message?.content

      if (!responseText) {
        throw new Error('No response from OpenAI')
      }

      // Parse the JSON response
      const parsedData = JSON.parse(responseText)

      // Validate and score the results
      return this.validateAndScore(parsedData, template)

    } catch (error) {
      console.error('OpenAI parsing error:', error)
      throw new Error(`Failed to parse document: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private buildPrompt(text: string, template: DocumentTemplate): string {
    const fields = Object.entries(template.extractionFields)
    const requiredFields = fields.filter(([_, config]) => config.required)
    const optionalFields = fields.filter(([_, config]) => !config.required)

    let prompt = `Extract the following information from this ${template.documentType} document text:\n\n`

    // Required fields
    if (requiredFields.length > 0) {
      prompt += 'REQUIRED FIELDS:\n'
      requiredFields.forEach(([fieldName, config]) => {
        prompt += `- ${fieldName} (${config.type}): Look for patterns like ${config.patterns.join(', ')}\n`
        if (config.format) {
          prompt += `  Expected format: ${config.format.join(' or ')}\n`
        }
      })
      prompt += '\n'
    }

    // Optional fields
    if (optionalFields.length > 0) {
      prompt += 'OPTIONAL FIELDS (extract if available):\n'
      optionalFields.forEach(([fieldName, config]) => {
        prompt += `- ${fieldName} (${config.type}): Look for patterns like ${config.patterns.join(', ')}\n`
        if (config.format) {
          prompt += `  Expected format: ${config.format.join(' or ')}\n`
        }
      })
      prompt += '\n'
    }

    prompt += `Document text to analyze:\n${text}\n\n`

    prompt += 'IMPORTANT INSTRUCTIONS:\n'
    prompt += '- Return ONLY a JSON object with the extracted data\n'
    prompt += '- Use null for fields that cannot be found\n'
    prompt += '- For dates, always format as YYYY-MM-DD\n'
    prompt += '- Be conservative - only extract data you are confident about\n'
    prompt += '- Do not guess or make up information\n\n'

    // Build the expected JSON structure
    const exampleJson: any = {}
    fields.forEach(([fieldName, config]) => {
      if (config.type === 'date') {
        exampleJson[fieldName] = 'YYYY-MM-DD or null'
      } else {
        exampleJson[fieldName] = `${config.type} or null`
      }
    })

    prompt += `Expected JSON format:\n${JSON.stringify(exampleJson, null, 2)}`

    return prompt
  }

  private validateAndScore(
    parsedData: any,
    template: DocumentTemplate
  ): ParsingResult {
    const fieldsFound: string[] = []
    const fieldsMissing: string[] = []
    const errors: string[] = []
    let totalFields = 0
    let foundFields = 0

    // Validate each field
    Object.entries(template.extractionFields).forEach(([fieldName, config]) => {
      totalFields++
      const value = parsedData[fieldName]

      if (value === null || value === undefined || value === '') {
        fieldsMissing.push(fieldName)
        if (config.required) {
          errors.push(`Required field missing: ${fieldName}`)
        }
      } else {
        fieldsFound.push(fieldName)
        foundFields++

        // Validate data type
        if (config.type === 'date') {
          if (!this.isValidDate(value)) {
            errors.push(`Invalid date format for ${fieldName}: ${value}`)
          }
        } else if (config.type === 'number') {
          if (isNaN(Number(value))) {
            errors.push(`Invalid number format for ${fieldName}: ${value}`)
          }
        }
      }
    })

    // Calculate confidence score
    let confidence = foundFields / totalFields

    // Reduce confidence for errors
    if (errors.length > 0) {
      confidence *= Math.max(0.1, 1 - (errors.length * 0.2))
    }

    // Boost confidence if all required fields are found
    const requiredFields = Object.entries(template.extractionFields)
      .filter(([_, config]) => config.required)

    const requiredFieldsFound = requiredFields.every(([fieldName]) =>
      fieldsFound.includes(fieldName)
    )

    if (requiredFieldsFound && requiredFields.length > 0) {
      confidence = Math.min(1.0, confidence + 0.1)
    }

    return {
      data: parsedData,
      confidence: Math.round(confidence * 100) / 100, // Round to 2 decimal places
      fieldsFound,
      fieldsMissing,
      errors: errors.length > 0 ? errors : undefined
    }
  }

  private isValidDate(dateString: string): boolean {
    // Check if it's in YYYY-MM-DD format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(dateString)) {
      return false
    }

    // Check if it's a valid date
    const date = new Date(dateString)
    return date instanceof Date && !isNaN(date.getTime())
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: 'Respond with: {"status": "healthy"}'
          }
        ],
        max_tokens: 50,
        response_format: { type: 'json_object' }
      })

      const result = JSON.parse(response.choices[0]?.message?.content || '{}')
      return result.status === 'healthy'
    } catch (error) {
      console.error('OpenAI health check failed:', error)
      return false
    }
  }
}