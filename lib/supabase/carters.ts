import { createClient } from '@/lib/supabase/client'
import { Database } from './types'

type Carter = Database['public']['Tables']['carters']['Row']
type CarterInsert = Database['public']['Tables']['carters']['Insert']
type CarterUpdate = Database['public']['Tables']['carters']['Update']

export interface CarterWithStats extends Carter {
  documentsComplete: boolean
  isExpiringSoon: boolean
  expiredDocuments: string[]
  expiringSoonDocuments: string[]
}

// Helper function to check if a date is expiring soon (within 30 days)
function isExpiringSoon(dateStr: string): boolean {
  const date = new Date(dateStr)
  const today = new Date()
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
  return date <= thirtyDaysFromNow && date >= today
}

// Helper function to check if a date is expired
function isExpired(dateStr: string): boolean {
  const date = new Date(dateStr)
  const today = new Date()
  return date < today
}

// Helper function to add computed fields
function addComputedFields(carter: Carter): CarterWithStats {
  const expiredDocuments: string[] = []
  const expiringSoonDocuments: string[] = []

  // Check license expiry
  if (carter.license_expiry && isExpired(carter.license_expiry)) {
    expiredDocuments.push('license')
  } else if (carter.license_expiry && isExpiringSoon(carter.license_expiry)) {
    expiringSoonDocuments.push('license')
  }

  // Check carter cert expiry
  if (carter.carter_cert_expiry && isExpired(carter.carter_cert_expiry)) {
    expiredDocuments.push('carter_cert')
  } else if (carter.carter_cert_expiry && isExpiringSoon(carter.carter_cert_expiry)) {
    expiringSoonDocuments.push('carter_cert')
  }

  // Check insurance expiry
  if (carter.insurance_expiry && isExpired(carter.insurance_expiry)) {
    expiredDocuments.push('insurance')
  } else if (carter.insurance_expiry && isExpiringSoon(carter.insurance_expiry)) {
    expiringSoonDocuments.push('insurance')
  }

  // Check if all documents are uploaded
  const documentsComplete = !!(
    carter.license_file_path &&
    carter.carter_cert_file_path &&
    carter.insurance_file_path
  )

  return {
    ...carter,
    documentsComplete,
    isExpiringSoon: expiringSoonDocuments.length > 0,
    expiredDocuments,
    expiringSoonDocuments
  }
}

export async function getAllCarters(): Promise<CarterWithStats[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('carters')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching carters:', error)
    throw new Error('Failed to fetch carters')
  }

  return data.map(addComputedFields)
}

export async function getCarterById(id: string): Promise<CarterWithStats | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('carters')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Carter not found
    }
    console.error('Error fetching carter:', error)
    throw new Error('Failed to fetch carter')
  }

  return addComputedFields(data)
}

export async function createCarter(carterData: CarterInsert): Promise<Carter> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('carters')
    .insert(carterData)
    .select()
    .single()

  if (error) {
    console.error('Error creating carter:', error)
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    })
    if (error.code === '23505') {
      throw new Error('A carter with this email already exists')
    }
    throw new Error(`Failed to create carter: ${error.message}`)
  }

  return data
}

export async function updateCarter(id: string, carterData: CarterUpdate): Promise<Carter> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('carters')
    .update(carterData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating carter:', error)
    if (error.code === '23505') {
      throw new Error('A carter with this email already exists')
    }
    throw new Error('Failed to update carter')
  }

  return data
}

export async function deleteCarter(id: string): Promise<void> {
  const supabase = createClient()

  // Soft delete by setting status to inactive
  const { error } = await supabase
    .from('carters')
    .update({ status: 'inactive' })
    .eq('id', id)

  if (error) {
    console.error('Error deleting carter:', error)
    throw new Error('Failed to delete carter')
  }
}

export async function getCarterStats() {
  const carters = await getAllCarters()

  const totalCarters = carters.length
  const activeCarters = carters.filter(c => c.status === 'active').length
  const completeProfiles = carters.filter(c => c.documentsComplete).length

  // Count all expiring documents across all carters
  const expiringDocuments = carters.reduce((count, carter) => {
    return count + carter.expiringSoonDocuments.length + carter.expiredDocuments.length
  }, 0)

  return {
    totalCarters,
    activeCarters,
    completeProfiles,
    expiringDocuments
  }
}

// Type exports for use in components
export type { Carter, CarterInsert, CarterUpdate, CarterWithStats }