import { createClient } from '@supabase/supabase-js'

// Remove BOM (U+FEFF = 65279) que pode ser inserido por ferramentas ao salvar env vars
function cleanEnv(value: string | undefined): string {
  if (!value) return ''
  let s = value
  // Remove BOM unicode (charCode 65279) do inicio
  while (s.charCodeAt(0) === 0xFEFF) {
    s = s.slice(1)
  }
  return s.trim()
}

export function createAdminClient() {
  return createClient(
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
    cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY),
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
