import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing environment variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkSession() {
  const { data, error } = await supabase.auth.getSession()
  console.log("Current Session Data:", JSON.stringify(data, null, 2))
  if (error) {
    console.error("Session Error:", error)
  }
}

checkSession()
