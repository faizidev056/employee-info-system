import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Debug environment variables
if (!supabaseUrl) {
  console.error('❌ VITE_SUPABASE_URL is not set in environment variables')
}
if (!supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY is not set in environment variables')
}

// Log connection info (without exposing sensitive data)
if (supabaseUrl && supabaseAnonKey) {
  console.log('🔗 Supabase client initialized:', {
    url: supabaseUrl,
    keyPreview: `${supabaseAnonKey.substring(0, 10)}...${supabaseAnonKey.substring(supabaseAnonKey.length - 4)}`
  })
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
