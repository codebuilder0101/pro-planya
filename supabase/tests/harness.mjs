// Test harness: boots PGlite with PostGIS, applies the Supabase stub, every
// migration in order and the seed, then exposes helpers to run SQL as a given
// user inside a transaction that is always rolled back.
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { unaccent } from '@electric-sql/pglite/contrib/unaccent'
import { postgis } from '@electric-sql/pglite-postgis'

const here = dirname(fileURLToPath(import.meta.url))
const supabaseDir = join(here, '..')

export const IDS = {
  hostCamila: 'a0000000-0000-4000-8000-000000000001',
  hostMatias: 'a0000000-0000-4000-8000-000000000002',
  hostValentina: 'a0000000-0000-4000-8000-000000000003',
  hostDiego: 'a0000000-0000-4000-8000-000000000004',
  // Test users created by the harness (not part of the seed).
  explorerA: 'b0000000-0000-4000-8000-00000000000a',
  explorerB: 'b0000000-0000-4000-8000-00000000000b',
  host: 'b0000000-0000-4000-8000-00000000000c',
  admin: 'b0000000-0000-4000-8000-00000000000d',
  // Seed experiences
  nielolSunrise: 'e0000000-0000-4000-8000-000000000001', // Temuco, day +2, free, cap 15, Camila
  ceramics: 'e0000000-0000-4000-8000-000000000003', // Temuco, cap 8, Valentina
  rafting: 'e0000000-0000-4000-8000-000000000011', // Pucón, Matías
  kayakSunset: 'e0000000-0000-4000-8000-000000000013', // Pucón, day +2, Diego
  pastNielol: 'e0000000-0000-4000-8000-000000000021', // past, Camila
  pastKayak: 'e0000000-0000-4000-8000-000000000022', // past, Diego
  hiddenWorkshop: 'e0000000-0000-4000-8000-000000000023', // hidden, Valentina
  catNature: 'c0000000-0000-4000-8000-000000000002',
  catAdventure: 'c0000000-0000-4000-8000-000000000001',
}

export const TEMUCO = { lat: -38.7359, lng: -72.5904 } // Plaza Aníbal Pinto
export const PUCON = { lat: -39.282, lng: -71.9545 }

export async function createDb() {
  const db = await PGlite.create({ extensions: { postgis, unaccent } })
  await db.exec(readFileSync(join(here, 'supabase-stub.sql'), 'utf8'))

  const migrationsDir = join(supabaseDir, 'migrations')
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
  for (const f of files) {
    try {
      await db.exec(readFileSync(join(migrationsDir, f), 'utf8'))
    } catch (e) {
      throw new Error(`Migration ${f} failed: ${e.message}`)
    }
  }
  try {
    await db.exec(readFileSync(join(supabaseDir, 'seed.sql'), 'utf8'))
  } catch (e) {
    throw new Error(`Seed failed: ${e.message}`)
  }

  // Harness users: two explorers, one host, one admin.
  const users = [
    [IDS.explorerA, 'explorer.a@test.local', 'explorer', 'Ana Explorer'],
    [IDS.explorerB, 'explorer.b@test.local', 'explorer', 'Bruno Explorer'],
    [IDS.host, 'host@test.local', 'host', 'Hugo Host'],
    [IDS.admin, 'admin@test.local', 'explorer', 'Ada Admin'],
  ]
  for (const [id, email, role, name] of users) {
    await db.query(
      `insert into auth.users (id, email, aud, role, raw_user_meta_data, created_at, updated_at)
       values ($1, $2, 'authenticated', 'authenticated', $3::jsonb, now(), now())`,
      [id, email, JSON.stringify({ role, full_name: name })],
    )
  }
  await db.query(`update public.profiles set role = 'admin' where id = $1`, [IDS.admin])
  return db
}

/**
 * Runs `fn` inside a transaction that is always rolled back, so tests are isolated.
 * The context exposes:
 *   as(userId | null)       switch to `authenticated` with that JWT sub (null = superuser)
 *   asAnon()                switch to `anon`
 *   q(sql, params)          run a query, returns rows
 *   one(sql, params)        run a query, returns the first row
 *   fails(sql, params, m)   assert the query fails; m = { code?, message? }
 */
export async function tx(db, fn) {
  await db.exec('begin')
  const ctx = {
    async as(userId) {
      await db.exec('reset role')
      if (userId === null) {
        await db.query(`select set_config('request.jwt.claims', '', true)`)
        return
      }
      await db.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: userId, role: 'authenticated' }),
      ])
      await db.exec('set local role authenticated')
    },
    async asAnon() {
      await db.exec('reset role')
      await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ role: 'anon' })])
      await db.exec('set local role anon')
    },
    async q(sql, params = []) {
      return (await db.query(sql, params)).rows
    },
    async one(sql, params = []) {
      return (await db.query(sql, params)).rows[0]
    },
    async fails(sql, params = [], match = {}) {
      await db.exec('savepoint expect_fail')
      let err
      try {
        await db.query(sql, params)
      } catch (e) {
        err = e
      }
      await db.exec('rollback to savepoint expect_fail')
      assert.ok(err, `Expected query to fail: ${sql}`)
      if (match.code) assert.equal(err.code, match.code, `wrong error code: ${err.message}`)
      if (match.message) assert.match(err.message, match.message)
      return err
    },
  }
  try {
    await fn(ctx)
  } finally {
    // ROLLBACK works even if the transaction is in an aborted state.
    await db.exec('rollback')
    await db.exec('reset role')
  }
}
