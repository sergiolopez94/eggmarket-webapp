/**
 * PDF Parser wrapper to avoid pdf-parse debug mode issues
 *
 * The pdf-parse module has debug code that runs when module.parent is falsy,
 * which can happen in Next.js environments and cause file system errors.
 * This wrapper ensures we import it safely.
 */

export async function parsePDF(buffer: Buffer): Promise<{
  text: string
  numpages: number
  info?: any
  metadata?: any
}> {
  // Dynamic import to avoid module initialization issues
  const pdf = await import('pdf-parse')

  // Use default export
  const pdfParse = pdf.default || pdf

  return await pdfParse(buffer)
}