import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// Support both the conventional anon key name and the user's publishable default key
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

// Debug environment variables
if (!supabaseUrl) {
  console.error('❌ VITE_SUPABASE_URL is not set in environment variables')
}
if (!supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY) is not set in environment variables')
}

// Log connection info (without exposing sensitive data)
if (supabaseUrl && supabaseAnonKey) {
  const preview = supabaseAnonKey.length >= 14
    ? `${supabaseAnonKey.substring(0, 10)}...${supabaseAnonKey.substring(supabaseAnonKey.length - 4)}`
    : '(<key too short to preview>)'
  console.log('🔗 Supabase client initialized:', {
    url: supabaseUrl,
    keyPreview: preview
  })
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
