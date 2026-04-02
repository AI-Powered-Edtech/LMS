import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const envVars = Object.fromEntries(
  env
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('='))
)

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY)

async function test() {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      `
      id, first_name, last_name, email,
      assignment_submissions(assignment_id, status, score, feedback),
      quiz_attempts_v2(quiz_id, score, status)
    `
    )
    .eq('quiz_attempts_v2.status', 'GRADED')
    .limit(1)

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Success:', JSON.stringify(data, null, 2))
  }
}
test()
