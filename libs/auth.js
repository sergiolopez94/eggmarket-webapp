// Supabase-only authentication for Egg Market webapp
// This replaces NextAuth with pure Supabase authentication
import { createClient } from '@/lib/supabase/server'
import config from "@/config"

// Simple auth helpers for compatibility with existing ShipFast components
export const auth = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch user profile from our custom profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return {
    user: {
      id: user.id,
      email: user.email,
      name: profile?.name || user.user_metadata?.name,
      image: user.user_metadata?.avatar_url,
      role: profile?.role,
      company_id: profile?.company_id
    }
  }
}

// Compatibility exports for ShipFast components that expect NextAuth
export const signIn = () => {
  console.warn('signIn called - use Supabase auth methods instead')
}

export const signOut = () => {
  console.warn('signOut called - use Supabase auth methods instead')
}

// No handlers needed since we're using Supabase
export const handlers = {} 