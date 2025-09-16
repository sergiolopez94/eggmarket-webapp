export interface ExtractionResult {
  text: string
  confidence: number
  metadata?: {
    [key: string]: any
  }
}

export interface ExtractionOptions {
  language?: string
  timeout?: number
  preprocessImage?: boolean
}

export abstract class BaseExtractor {
  abstract extractText(
    fileBuffer: Buffer,
    mimeType: string,
    options?: ExtractionOptions
  ): Promise<ExtractionResult>

  protected isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/')
  }

  protected isPdf(mimeType: string): boolean {
    return mimeType === 'application/pdf'
  }

  protected validateInput(fileBuffer: Buffer, mimeType: string): void {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('File buffer is empty')
    }

    const supportedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf'
    ]

    if (!supportedTypes.includes(mimeType)) {
      throw new Error(`Unsupported file type: ${mimeType}`)
    }

    // Check file size (max 10MB for processing)
    const maxSize = 10 * 1024 * 1024
    if (fileBuffer.length > maxSize) {
      throw new Error('File too large for processing')
    }
  }
}