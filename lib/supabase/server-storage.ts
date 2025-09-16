import { createServerClient } from '@/lib/supabase/server'

export type DocumentType = 'license' | 'carter_cert' | 'insurance'

// Mapping of document types to bucket names
const BUCKET_MAP: Record<DocumentType, string> = {
  license: 'carter-licenses',
  carter_cert: 'carter-certificates',
  insurance: 'carter-insurance'
}

// Generate file path for carter documents
function generateFilePath(carterId: string, docType: DocumentType, fileName: string): string {
  const timestamp = Date.now()
  const extension = fileName.split('.').pop()
  return `${carterId}/${docType}_${timestamp}.${extension}`
}

export async function uploadCarterDocumentServer(
  file: File,
  carterId: string,
  docType: DocumentType
): Promise<string> {
  const supabase = await createServerClient()
  const bucket = BUCKET_MAP[docType]
  const filePath = generateFilePath(carterId, docType, file.name)

  // Convert File to ArrayBuffer for server upload
  const fileBuffer = await file.arrayBuffer()

  // Upload file to storage
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, fileBuffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    })

  if (error) {
    console.error('Error uploading file:', error)
    throw new Error(`Failed to upload ${docType} document: ${error.message}`)
  }

  return data.path
}

export async function updateCarterDocumentServer(
  file: File,
  carterId: string,
  docType: DocumentType,
  oldFilePath?: string
): Promise<string> {
  const supabase = await createServerClient()
  const bucket = BUCKET_MAP[docType]

  // Delete old file if it exists
  if (oldFilePath) {
    const { error: deleteError } = await supabase.storage
      .from(bucket)
      .remove([oldFilePath])

    if (deleteError) {
      console.warn('Failed to delete old file:', deleteError)
      // Continue with upload even if delete fails
    }
  }

  // Upload new file
  return uploadCarterDocumentServer(file, carterId, docType)
}

export async function deleteCarterDocumentServer(
  filePath: string,
  docType: DocumentType
): Promise<void> {
  const supabase = await createServerClient()
  const bucket = BUCKET_MAP[docType]

  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath])

  if (error) {
    console.error('Error deleting file:', error)
    throw new Error(`Failed to delete ${docType} document: ${error.message}`)
  }
}

export async function getDocumentUrlServer(
  filePath: string,
  docType: DocumentType,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  const supabase = await createServerClient()
  const bucket = BUCKET_MAP[docType]

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresIn)

  if (error) {
    console.error('Error creating signed URL:', error)
    throw new Error(`Failed to get ${docType} document URL: ${error.message}`)
  }

  return data.signedUrl
}

export async function getDocumentPublicUrlServer(
  filePath: string,
  docType: DocumentType
): Promise<string> {
  const supabase = await createServerClient()
  const bucket = BUCKET_MAP[docType]

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath)

  return data.publicUrl
}

// Check if file exists in storage
export async function fileExistsServer(
  filePath: string,
  docType: DocumentType
): Promise<boolean> {
  const supabase = await createServerClient()
  const bucket = BUCKET_MAP[docType]

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(filePath.split('/').slice(0, -1).join('/'))

  if (error) {
    return false
  }

  const fileName = filePath.split('/').pop()
  return data.some(file => file.name === fileName)
}

// Get file metadata
export async function getFileMetadataServer(
  filePath: string,
  docType: DocumentType
) {
  const supabase = await createServerClient()
  const bucket = BUCKET_MAP[docType]

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(filePath.split('/').slice(0, -1).join('/'))

  if (error) {
    throw new Error(`Failed to get file metadata: ${error.message}`)
  }

  const fileName = filePath.split('/').pop()
  const fileData = data.find(file => file.name === fileName)

  if (!fileData) {
    throw new Error('File not found')
  }

  return {
    name: fileData.name,
    size: fileData.metadata?.size,
    lastModified: fileData.metadata?.lastModified,
    contentType: fileData.metadata?.mimetype
  }
}

// Validate file type and size - server-side compatible
export function validateFileServer(file: File): { isValid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024 // 5MB
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ]

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File size must be less than 5MB'
    }
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'File must be a PDF or image (JPEG, PNG, WebP)'
    }
  }

  return { isValid: true }
}