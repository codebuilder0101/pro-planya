// Real concurrency test for the "two phones tap the last seat" acceptance test.
// Against a REAL Supabase project (not production!): creates a temporary plan
// with 1 seat, has two explorers call join_experience at the same instant,
// and checks that exactly one succeeds and seats_taken never exceeds capacity.
// Run: npm run db:race   (needs the test accounts from npm run db:test-users)
import { createClient } from '@supabase/supabase-js'

const ROUNDS = Number(process.env.RACE_ROUNDS ?? 10)

const env = (name) => {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing ${name} in .env`)
    process.exit(1)
  }
  return value
}

const url = env('SUPABASE_URL')
const anonKey = env('SUPABASE_ANON_KEY')
const admin = createClient(url, env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function signedInClient(email, password) {
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`)
  return client
}

const explorer1 = await signedInClient(env('TEST_EXPLORER_EMAIL'), env('TEST_EXPLORER_PASSWORD'))
const explorer2 = await signedInClient(env('TEST_EXPLORER2_EMAIL'), env('TEST_EXPLORER2_PASSWORD'))

const { data: hostUser } = await admin
  .from('profiles')
  .select('id')
  .eq('role', 'host')
  .neq('id', (await explorer1.auth.getUser()).data.user.id)
  .limit(1)
  .single()
const { data: category } = await admin.from('categories').select('id').limit(1).single()

let failures = 0
for (let round = 1; round <= ROUNDS; round++) {
  const startsAt = new Date(Date.now() + 7 * 24 * 3600 * 1000)
  const { data: plan, error: planError } = await admin
    .from('experiences')
    .insert({
      host_id: hostUser.id,
      title: `Prueba de carrera ${round}`,
      description: 'Plan temporal para la prueba del último cupo.',
      category_id: category.id,
      location: 'SRID=4326;POINT(-72.5904 -38.7359)',
      comuna: 'Temuco',
      starts_at: startsAt.toISOString(),
      ends_at: new Date(startsAt.getTime() + 3600 * 1000).toISOString(),
      capacity: 1,
      status: 'hidden', // never visible to real users
    })
    .select('id')
    .single()
  if (planError) throw planError
  // Publish only for the duration of the race.
  await admin.from('experiences').update({ status: 'published' }).eq('id', plan.id)

  const results = await Promise.all([
    explorer1.rpc('join_experience', { p_experience_id: plan.id, p_seats: 1 }),
    explorer2.rpc('join_experience', { p_experience_id: plan.id, p_seats: 1 }),
  ])
  const ok = results.filter((r) => !r.error).length
  const errors = results.filter((r) => r.error).map((r) => r.error.message)
  const { data: after } = await admin.from('experiences').select('seats_taken, capacity').eq('id', plan.id).single()

  const pass = ok === 1 && errors[0] === 'not_enough_seats' && after.seats_taken === 1
  if (!pass) failures++
  console.log(
    `Round ${round}: ${pass ? 'PASS' : 'FAIL'} (successes=${ok}, errors=${JSON.stringify(errors)}, seats_taken=${after.seats_taken}/${after.capacity})`,
  )

  await admin.from('experiences').delete().eq('id', plan.id) // cascades bookings
}

if (failures > 0) {
  console.error(`${failures} of ${ROUNDS} rounds failed`)
  process.exit(1)
}
console.log(`All ${ROUNDS} rounds passed: exactly one explorer got the last seat every time.`)
