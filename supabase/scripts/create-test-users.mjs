// Creates (or resets the password of) the stage-delivery test accounts:
// explorer, second explorer, host and admin. Credentials come from the root
// .env (never committed). Run: npm run db:test-users
import { createClient } from '@supabase/supabase-js'

const required = (name) => {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing ${name} in .env`)
    process.exit(1)
  }
  return value
}

const supabase = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { autoRefreshToken: false, persistSession: false },
})

const accounts = [
  { prefix: 'TEST_EXPLORER', role: 'explorer', fullName: 'Explorador de prueba' },
  { prefix: 'TEST_EXPLORER2', role: 'explorer', fullName: 'Exploradora de prueba 2' },
  { prefix: 'TEST_HOST', role: 'host', fullName: 'Anfitrión de prueba' },
  { prefix: 'TEST_ADMIN', role: 'admin', fullName: 'Admin de prueba' },
]

async function findUserByEmail(email) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (user) return user
    if (data.users.length < 200) return null
  }
  return null
}

for (const account of accounts) {
  const email = required(`${account.prefix}_EMAIL`)
  const password = required(`${account.prefix}_PASSWORD`)
  // Self-signup can only choose explorer/host; admin is promoted below.
  const signupRole = account.role === 'admin' ? 'explorer' : account.role

  let user = await findUserByEmail(email)
  if (user) {
    const { error } = await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true })
    if (error) throw error
    console.log(`Updated password: ${email}`)
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: signupRole, full_name: account.fullName },
    })
    if (error) throw error
    user = data.user
    console.log(`Created: ${email}`)
  }

  // Service role bypasses RLS and the profile guard.
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: account.role, full_name: account.fullName, city: 'Temuco', is_suspended: false })
    .eq('id', user.id)
  if (profileError) throw profileError
}

console.log('Test accounts ready.')
