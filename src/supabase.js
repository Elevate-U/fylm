import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://symlpvgdqnmccllwwejt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5bWxwdmdkcW5tY2NsbHd3ZWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMzI4MjMsImV4cCI6MjA2NzcwODgyM30.O6gqcY6Mzl1XAtn9blKGx4m142p3vJynmr18kNDA9T8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 