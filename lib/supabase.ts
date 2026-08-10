import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iotngphqftzssrrftmad.supabase.co'
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvdG5ncGhxZnR6c3NycmZ0bWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0Njk2OTUsImV4cCI6MjEwMTA0NTY5NX0.jv8goJWZP7-Xz5vEeOaUEb52PfGLHNFqGCGExs-qgqI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

