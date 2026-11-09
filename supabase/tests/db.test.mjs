// Database tests: RLS policies, guards and RPC functions, run against the real
// migrations + seed in PGlite. Run with `npm test` in supabase/tests.
//
// What PGlite cannot test (single connection): true concurrency. The
// two-phones-last-seat race is covered by supabase/scripts/last-seat-race.mjs
// against a real Supabase project, and by the device acceptance test.
import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { createDb, IDS, PUCON, TEMUCO, tx } from './harness.mjs'

let db

before(async () => {
  db = await createDb()
})

after(async () => {
  await db?.close()
})

const RLS_VIOLATION = { code: '42501', message: /row-level security/ }
const PERMISSION_DENIED = { code: '42501', message: /permission denied/ }
const biz = (code) => ({ code: 'P0001', message: new RegExp(`^${code}$`) })

const newPlanSql = `
  insert into public.experiences
    (host_id, title, description, category_id, location, comuna, starts_at, ends_at, capacity, is_free, price_clp)
  values ($1, 'Plan de prueba', 'Descripción de prueba', '${IDS.catNature}',
          'SRID=4326;POINT(-72.5904 -38.7359)', 'Temuco', $2::timestamptz, $2::timestamptz + interval '2 hours',
          $3, true, null)
  returning *`

const seatsMatchBookings = async (t, experienceId) => {
  await t.as(null)
  const row = await t.one(
    `select e.seats_taken,
            coalesce((select sum(b.seats) from public.bookings b
                      where b.experience_id = e.id and b.status = 'confirmed'), 0)::int as booked
     from public.experiences e where e.id = $1`,
    [experienceId],
  )
  assert.equal(row.seats_taken, row.booked, 'seats_taken must equal confirmed booked seats')
  return row.seats_taken
}

const searchIds = async (t, args = '') =>
  (await t.q(`select id from public.search_experiences(${args})`)).map((r) => r.id)

// ---------------------------------------------------------------------------
describe('security structure', () => {
  test('RLS is enabled on every public table', async () => {
    await tx(db, async (t) => {
      const rows = await t.q(`
        select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`)
      assert.deepEqual(rows, [])
    })
  })

  test('anon has no table privileges and cannot execute public functions', async () => {
    await tx(db, async (t) => {
      const tables = await t.q(`
        select table_name, privilege_type from information_schema.role_table_grants
        where grantee = 'anon' and table_schema = 'public'`)
      assert.deepEqual(tables, [])
      const fns = await t.q(`
        select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('public', 'private') and has_function_privilege('anon', p.oid, 'execute')`)
      assert.deepEqual(fns, [])
    })
  })

  test('anon cannot read plans or call search', async () => {
    await tx(db, async (t) => {
      await t.asAnon()
      await t.fails(`select * from public.experiences`, [], PERMISSION_DENIED)
      await t.fails(`select * from public.search_experiences()`, [], PERMISSION_DENIED)
    })
  })

  test('every SECURITY DEFINER function pins search_path', async () => {
    await tx(db, async (t) => {
      const rows = await t.q(`
        select n.nspname, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('public', 'private') and p.prosecdef
          and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')`)
      assert.deepEqual(rows, [])
    })
  })

  test('nearby search has a GiST index on experiences.location', async () => {
    await tx(db, async (t) => {
      const row = await t.one(
        `select indexdef from pg_indexes where tablename = 'experiences' and indexname = 'experiences_location_gix'`,
      )
      assert.match(row.indexdef, /USING gist \(location\)/)
    })
  })
})

// ---------------------------------------------------------------------------
describe('profiles', () => {
  test('signup creates a profile with the chosen role; admin cannot be self-selected', async () => {
    await tx(db, async (t) => {
      const host = await t.one(`select role, full_name from public.profiles where id = $1`, [IDS.host])
      assert.deepEqual(host, { role: 'host', full_name: 'Hugo Host' })
      await t.q(
        `insert into auth.users (id, email, raw_user_meta_data) values
         ('b0000000-0000-4000-8000-0000000000ff', 'sneaky@test.local', '{"role":"admin","full_name":"X"}')`,
      )
      const sneaky = await t.one(
        `select role from public.profiles where id = 'b0000000-0000-4000-8000-0000000000ff'`,
      )
      assert.equal(sneaky.role, 'explorer')
    })
  })

  test('owner edits own profile, cannot edit others', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      const own = await t.q(
        `update public.profiles set full_name = 'Ana Nueva', bio = 'Hola', city = 'Temuco' where id = $1 returning id`,
        [IDS.explorerA],
      )
      assert.equal(own.length, 1)
      const other = await t.q(`update public.profiles set full_name = 'hack' where id = $1 returning id`, [
        IDS.explorerB,
      ])
      assert.equal(other.length, 0)
    })
  })

  test('users cannot change their own role or suspension; admin can', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      await t.fails(
        `update public.profiles set role = 'admin' where id = $1`,
        [IDS.explorerA],
        biz('forbidden'),
      )
      await t.fails(
        `update public.profiles set role = 'host' where id = $1`,
        [IDS.explorerA],
        biz('forbidden'),
      )
      await t.fails(
        `update public.profiles set is_suspended = true where id = $1`,
        [IDS.explorerA],
        biz('forbidden'),
      )
      await t.as(IDS.admin)
      const rows = await t.q(
        `update public.profiles set is_suspended = true where id = $1 returning is_suspended`,
        [IDS.explorerA],
      )
      assert.deepEqual(rows, [{ is_suspended: true }])
    })
  })
})

// ---------------------------------------------------------------------------
describe('experiences', () => {
  test('explorers cannot publish; hosts can, and the plan is visible to others', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      await t.fails(newPlanSql, [IDS.explorerA, '2099-01-10T15:00:00Z', 10], RLS_VIOLATION)

      await t.as(IDS.host)
      const plan = await t.one(newPlanSql, [IDS.host, '2099-01-10T15:00:00Z', 10])
      assert.equal(plan.seats_taken, 0)
      assert.equal(plan.status, 'published')
      assert.equal(plan.is_featured, false)

      await t.as(IDS.explorerB)
      const ids = await searchIds(t, 'p_limit => 100')
      assert.ok(ids.includes(plan.id))
    })
  })

  test('hosts cannot publish for someone else, in the past, or set system columns', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.host)
      await t.fails(newPlanSql, [IDS.hostCamila, '2099-01-10T15:00:00Z', 10], RLS_VIOLATION)
      await t.fails(newPlanSql, [IDS.host, '2001-01-10T15:00:00Z', 10], biz('starts_in_past'))
      await t.fails(
        `insert into public.experiences (host_id, title, description, category_id, location, comuna,
           starts_at, ends_at, capacity, is_featured)
         values ($1, 'Plan', 'Desc', $2, 'SRID=4326;POINT(-72.59 -38.73)', 'Temuco',
           now() + interval '1 day', now() + interval '1 day 1 hour', 5, true)`,
        [IDS.host, IDS.catNature],
        PERMISSION_DENIED,
      )
      await t.fails(
        `insert into public.experiences (host_id, title, description, category_id, location, comuna,
           starts_at, ends_at, capacity, seats_taken)
         values ($1, 'Plan', 'Desc', $2, 'SRID=4326;POINT(-72.59 -38.73)', 'Temuco',
           now() + interval '1 day', now() + interval '1 day 1 hour', 5, 3)`,
        [IDS.host, IDS.catNature],
        PERMISSION_DENIED,
      )
    })
  })

  test('data constraints: paid needs a price, end after start, capacity range', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.host)
      const base = `insert into public.experiences (host_id, title, description, category_id, location, comuna,
          starts_at, ends_at, capacity, is_free, price_clp)
        values ($1, 'Plan', 'Desc', '${IDS.catNature}', 'SRID=4326;POINT(-72.59 -38.73)', 'Temuco',`
      await t.fails(
        `${base} now() + interval '1 day', now() + interval '1 day 1 hour', 5, false, null)`,
        [IDS.host],
        { code: '23514' },
      )
      await t.fails(
        `${base} now() + interval '1 day', now() + interval '1 day 1 hour', 5, true, 5000)`,
        [IDS.host],
        { code: '23514' },
      )
      await t.fails(
        `${base} now() + interval '2 day', now() + interval '1 day', 5, true, null)`,
        [IDS.host],
        {
          code: '23514',
        },
      )
      await t.fails(
        `${base} now() + interval '1 day', now() + interval '1 day 1 hour', 0, true, null)`,
        [IDS.host],
        {
          code: '23514',
        },
      )
    })
  })

  test('host edits own plan; cannot touch seats_taken; is_featured stays unchanged', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.hostCamila)
      const rows = await t.q(
        `update public.experiences set title = 'Caminata editada', is_featured = false where id = $1
         returning title, is_featured`,
        [IDS.nielolSunrise],
      )
      assert.deepEqual(rows, [{ title: 'Caminata editada', is_featured: true }])
      await t.fails(
        `update public.experiences set seats_taken = 0 where id = $1`,
        [IDS.nielolSunrise],
        PERMISSION_DENIED,
      )
      await t.as(IDS.hostMatias)
      const others = await t.q(`update public.experiences set title = 'hack' where id = $1 returning id`, [
        IDS.nielolSunrise,
      ])
      assert.equal(others.length, 0)
    })
  })

  test('hidden plans are visible only to their host and admins', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      assert.equal(
        (await t.q(`select id from public.experiences where id = $1`, [IDS.hiddenWorkshop])).length,
        0,
      )
      await t.as(IDS.hostValentina)
      assert.equal(
        (await t.q(`select id from public.experiences where id = $1`, [IDS.hiddenWorkshop])).length,
        1,
      )
      await t.as(IDS.admin)
      assert.equal(
        (await t.q(`select id from public.experiences where id = $1`, [IDS.hiddenWorkshop])).length,
        1,
      )
    })
  })

  test('host hides a plan and it disappears from discovery; publishing again restores it', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.hostCamila)
      await t.q(`update public.experiences set status = 'hidden' where id = $1`, [IDS.nielolSunrise])
      await t.as(IDS.explorerA)
      assert.ok(!(await searchIds(t, 'p_limit => 100')).includes(IDS.nielolSunrise))
      await t.as(IDS.hostCamila)
      await t.q(`update public.experiences set status = 'published' where id = $1`, [IDS.nielolSunrise])
      await t.as(IDS.explorerA)
      assert.ok((await searchIds(t, 'p_limit => 100')).includes(IDS.nielolSunrise))
    })
  })

  test('only admins can remove a plan; host cannot undo or edit a removed plan', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.hostValentina)
      await t.fails(
        `update public.experiences set status = 'removed' where id = $1`,
        [IDS.ceramics],
        biz('experience_removed'),
      )
      await t.as(IDS.admin)
      await t.q(`update public.experiences set status = 'removed' where id = $1`, [IDS.ceramics])
      await t.as(IDS.explorerA)
      assert.ok(!(await searchIds(t, 'p_limit => 100')).includes(IDS.ceramics))
      await t.as(IDS.hostValentina)
      await t.fails(
        `update public.experiences set status = 'published' where id = $1`,
        [IDS.ceramics],
        biz('experience_removed'),
      )
    })
  })

  test('cancelled is terminal for the host', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.hostCamila)
      await t.q(`update public.experiences set status = 'cancelled' where id = $1`, [IDS.nielolSunrise])
      await t.fails(
        `update public.experiences set status = 'published' where id = $1`,
        [IDS.nielolSunrise],
        biz('experience_cancelled'),
      )
    })
  })

  test('admin can feature a plan; host cannot', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.hostValentina)
      const r1 = await t.one(
        `update public.experiences set is_featured = true where id = $1 returning is_featured`,
        [IDS.ceramics],
      )
      assert.equal(r1.is_featured, false)
      await t.as(IDS.admin)
      const r2 = await t.one(
        `update public.experiences set is_featured = true where id = $1 returning is_featured`,
        [IDS.ceramics],
      )
      assert.equal(r2.is_featured, true)
      await t.as(IDS.explorerA)
      assert.ok((await searchIds(t, 'p_featured_only => true')).includes(IDS.ceramics))
    })
  })

  test('host cannot lower capacity below booked seats', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      await t.q(`select public.join_experience($1, 3)`, [IDS.rafting])
      await t.as(IDS.hostMatias)
      await t.fails(
        `update public.experiences set capacity = 2 where id = $1`,
        [IDS.rafting],
        biz('capacity_below_bookings'),
      )
      await t.q(`update public.experiences set capacity = 3 where id = $1`, [IDS.rafting])
    })
  })
})

// ---------------------------------------------------------------------------
describe('join_experience / cancel_booking', () => {
  test('joining updates seats; full, own, duplicate and invalid joins are rejected', async () => {
    await tx(db, async (t) => {
      // ceramics: capacity 8
      await t.as(IDS.explorerA)
      const b = await t.one(`select * from public.join_experience($1, 3)`, [IDS.ceramics])
      assert.equal(b.status, 'confirmed')
      assert.equal(b.seats, 3)
      assert.equal(await seatsMatchBookings(t, IDS.ceramics), 3)

      await t.as(IDS.explorerA)
      await t.fails(`select public.join_experience($1, 1)`, [IDS.ceramics], biz('already_joined'))
      await t.fails(`select public.join_experience($1, 0)`, [IDS.ceramics], biz('invalid_seats'))
      await t.fails(`select public.join_experience($1, 11)`, [IDS.ceramics], biz('invalid_seats'))

      await t.as(IDS.explorerB)
      await t.fails(`select public.join_experience($1, 6)`, [IDS.ceramics], biz('not_enough_seats'))
      await t.q(`select public.join_experience($1, 5)`, [IDS.ceramics])
      assert.equal(await seatsMatchBookings(t, IDS.ceramics), 8)

      // Last seat already gone: the next user is rejected.
      await t.as(IDS.host)
      await t.fails(`select public.join_experience($1, 1)`, [IDS.ceramics], biz('not_enough_seats'))

      await t.as(IDS.hostValentina)
      await t.fails(`select public.join_experience($1, 1)`, [IDS.ceramics], biz('own_experience'))
    })
  })

  test('cannot join past, hidden or unknown plans', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      await t.fails(`select public.join_experience($1, 1)`, [IDS.pastNielol], biz('experience_started'))
      await t.fails(`select public.join_experience($1, 1)`, [IDS.hiddenWorkshop], biz('experience_not_found'))
      await t.fails(
        `select public.join_experience($1, 1)`,
        ['e0000000-0000-4000-8000-0000000000ff'],
        biz('experience_not_found'),
      )
    })
  })

  test('the app can never write bookings or seats directly', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      await t.fails(
        `insert into public.bookings (experience_id, user_id, seats) values ($1, $2, 1)`,
        [IDS.ceramics, IDS.explorerA],
        PERMISSION_DENIED,
      )
      await t.q(`select public.join_experience($1, 1)`, [IDS.ceramics])
      await t.fails(
        `update public.bookings set seats = 10 where user_id = $1`,
        [IDS.explorerA],
        PERMISSION_DENIED,
      )
      await t.fails(`delete from public.bookings where user_id = $1`, [IDS.explorerA], PERMISSION_DENIED)
    })
  })

  test('cancel returns the seats; cannot cancel twice or cancel someone else; can join again', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      const b = await t.one(`select id from public.join_experience($1, 4)`, [IDS.ceramics])
      await t.as(IDS.explorerB)
      await t.fails(`select public.cancel_booking($1)`, [b.id], biz('booking_not_found'))
      await t.as(IDS.explorerA)
      const c = await t.one(`select * from public.cancel_booking($1)`, [b.id])
      assert.equal(c.status, 'cancelled')
      assert.ok(c.cancelled_at)
      assert.equal(await seatsMatchBookings(t, IDS.ceramics), 0)
      await t.as(IDS.explorerA)
      await t.fails(`select public.cancel_booking($1)`, [b.id], biz('booking_not_active'))
      await t.q(`select public.join_experience($1, 2)`, [IDS.ceramics])
      assert.equal(await seatsMatchBookings(t, IDS.ceramics), 2)
    })
  })

  test('bookings are visible to the booker, the host and admins only', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      await t.q(`select public.join_experience($1, 1)`, [IDS.ceramics])
      const count = async (uid) => {
        await t.as(uid)
        return (await t.q(`select id from public.bookings where experience_id = $1`, [IDS.ceramics])).length
      }
      assert.equal(await count(IDS.explorerA), 1)
      assert.equal(await count(IDS.hostValentina), 1)
      assert.equal(await count(IDS.admin), 1)
      assert.equal(await count(IDS.explorerB), 0)
      assert.equal(await count(IDS.hostCamila), 0)
    })
  })

  test('participants are public (name/avatar/seats) but hide blocked users', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      await t.q(`select public.join_experience($1, 2)`, [IDS.ceramics])
      await t.as(IDS.explorerB)
      const rows = await t.q(`select full_name, seats from public.experience_participants($1)`, [
        IDS.ceramics,
      ])
      assert.deepEqual(rows, [{ full_name: 'Ana Explorer', seats: 2 }])
      await t.q(`insert into public.blocks (blocker_id, blocked_id) values ($1, $2)`, [
        IDS.explorerB,
        IDS.explorerA,
      ])
      assert.equal((await t.q(`select * from public.experience_participants($1)`, [IDS.ceramics])).length, 0)
      // Not visible plan -> empty, no leak.
      assert.equal(
        (await t.q(`select * from public.experience_participants($1)`, [IDS.hiddenWorkshop])).length,
        0,
      )
    })
  })

  test('a participant keeps seeing a plan they booked after the host hides it', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      await t.q(`select public.join_experience($1, 1)`, [IDS.ceramics])
      await t.as(IDS.hostValentina)
      await t.q(`update public.experiences set status = 'hidden' where id = $1`, [IDS.ceramics])
      await t.as(IDS.explorerA)
      assert.equal((await t.q(`select id from public.experiences where id = $1`, [IDS.ceramics])).length, 1)
      await t.as(IDS.explorerB)
      assert.equal((await t.q(`select id from public.experiences where id = $1`, [IDS.ceramics])).length, 0)
    })
  })
})

// ---------------------------------------------------------------------------
describe('search_experiences / nearby_experiences', () => {
  test('only future published plans are returned (20 seeded)', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      const ids = await searchIds(t, 'p_limit => 100')
      assert.equal(ids.length, 20)
      for (const id of [IDS.pastNielol, IDS.pastKayak, IDS.hiddenWorkshop]) assert.ok(!ids.includes(id))
    })
  })

  test('pagination is stable and complete', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      const p1 = await searchIds(t, 'p_limit => 8, p_offset => 0')
      const p2 = await searchIds(t, 'p_limit => 8, p_offset => 8')
      const p3 = await searchIds(t, 'p_limit => 8, p_offset => 16')
      const all = [...p1, ...p2, ...p3]
      assert.equal(all.length, 20)
      assert.equal(new Set(all).size, 20)
    })
  })

  test('radius filter: 10 km around Temuco returns only nearby plans, with distance_km', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      const rows = await t.q(
        `select id, distance_km from public.search_experiences(p_lat => $1, p_lng => $2, p_radius_km => 10,
           p_sort => 'distance', p_limit => 100)`,
        [TEMUCO.lat, TEMUCO.lng],
      )
      const expected = [1, 2, 3, 4, 5, 6, 7, 8].map(
        (n) => `e0000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
      )
      assert.deepEqual(rows.map((r) => r.id).sort(), expected.sort())
      for (const r of rows) assert.ok(r.distance_km <= 10)
      const sorted = [...rows].sort((a, b) => a.distance_km - b.distance_km)
      assert.deepEqual(rows, sorted, 'sorted by distance')
      const nielol = rows.find((r) => r.id === IDS.nielolSunrise)
      // Plaza Aníbal Pinto -> Cerro Ñielol trailhead is ~1.4 km in a straight line.
      assert.ok(nielol.distance_km > 1.2 && nielol.distance_km < 1.6, `got ${nielol.distance_km}`)
    })
  })

  test('"Menos de 10 km" + a specific local date returns only matching plans', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      const rows = await t.q(
        `select id from public.search_experiences(p_lat => $1, p_lng => $2, p_radius_km => 10,
           p_date_from => (now() at time zone 'America/Santiago')::date + 2,
           p_date_to   => (now() at time zone 'America/Santiago')::date + 2)`,
        [TEMUCO.lat, TEMUCO.lng],
      )
      assert.deepEqual(
        rows.map((r) => r.id),
        [IDS.nielolSunrise],
      )
      // Same date without radius also includes the Pucón kayak.
      const all = await t.q(
        `select id from public.search_experiences(
           p_date_from => (now() at time zone 'America/Santiago')::date + 2,
           p_date_to   => (now() at time zone 'America/Santiago')::date + 2)`,
      )
      assert.deepEqual(all.map((r) => r.id).sort(), [IDS.nielolSunrise, IDS.kayakSunset].sort())
    })
  })

  test('date filter uses America/Santiago day boundaries, not UTC', async () => {
    await tx(db, async (t) => {
      // 23:30 local on day +20 is already the next day in UTC.
      await t.as(IDS.host)
      const plan = await t.one(
        `insert into public.experiences (host_id, title, description, category_id, location, comuna,
           starts_at, ends_at, capacity)
         values ($1, 'Plan nocturno', 'Desc', $2, 'SRID=4326;POINT(-72.59 -38.73)', 'Temuco',
           ((now() at time zone 'America/Santiago')::date + 20 + time '23:30') at time zone 'America/Santiago',
           ((now() at time zone 'America/Santiago')::date + 21 + time '01:00') at time zone 'America/Santiago', 5)
         returning id`,
        [IDS.host, IDS.catNature],
      )
      const day = (n) => `(now() at time zone 'America/Santiago')::date + ${n}`
      const on20 = await searchIds(t, `p_date_from => ${day(20)}, p_date_to => ${day(20)}`)
      const on21 = await searchIds(t, `p_date_from => ${day(21)}, p_date_to => ${day(21)}`)
      assert.ok(on20.includes(plan.id))
      assert.ok(!on21.includes(plan.id))
    })
  })

  test('text search is case- and accent-insensitive and escapes wildcards', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      const nielol = await searchIds(t, `p_query => 'nielol'`)
      assert.deepEqual(nielol.sort(), [IDS.nielolSunrise, 'e0000000-0000-4000-8000-000000000006'].sort())
      assert.equal((await searchIds(t, `p_query => 'PUCON', p_limit => 100`)).length, 8)
      assert.equal((await searchIds(t, `p_query => '%'`)).length, 0)
      assert.equal((await searchIds(t, `p_query => '_'`)).length, 0)
      assert.equal((await searchIds(t, `p_query => '   ', p_limit => 100`)).length, 20)
    })
  })

  test('free-only and category filters', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      assert.equal((await searchIds(t, 'p_free_only => true, p_limit => 100')).length, 7)
      assert.equal((await searchIds(t, `p_category_ids => array['${IDS.catNature}']::uuid[]`)).length, 4)
      assert.equal((await searchIds(t, `p_category_ids => '{}'::uuid[], p_limit => 100`)).length, 20)
    })
  })

  test('invalid arguments raise friendly codes', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      await t.fails(
        `select * from public.search_experiences(p_radius_km => 10)`,
        [],
        biz('location_required'),
      )
      await t.fails(`select * from public.search_experiences(p_sort => 'random')`, [], biz('invalid_sort'))
      await t.fails(
        `select * from public.search_experiences(p_lat => 100, p_lng => 0)`,
        [],
        biz('invalid_location'),
      )
    })
  })

  test('nearby_experiences and count_nearby_experiences agree', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      const rows = await t.q(`select id, distance_km from public.nearby_experiences($1, $2, 15, 100)`, [
        PUCON.lat,
        PUCON.lng,
      ])
      const count = await t.one(`select public.count_nearby_experiences($1, $2, 15) as n`, [
        PUCON.lat,
        PUCON.lng,
      ])
      assert.equal(rows.length, count.n)
      assert.ok(rows.length > 0)
      for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].distance_km <= rows[i].distance_km)
    })
  })
})

// ---------------------------------------------------------------------------
describe('get_experience / list_places', () => {
  test('detail returns host, coordinates, distance and the caller own booking/favorite state', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      const plain = await t.one(`select * from public.get_experience($1)`, [IDS.nielolSunrise])
      assert.equal(plain.host_id, IDS.hostCamila)
      assert.ok(plain.host_full_name.length > 0)
      assert.ok(Math.abs(plain.lat - TEMUCO.lat) < 0.1 && Math.abs(plain.lng - TEMUCO.lng) < 0.1)
      assert.equal(plain.distance_km, null)
      assert.equal(plain.my_booking_id, null)
      assert.equal(plain.is_favorite, false)

      await t.q(`select public.join_experience($1, 2)`, [IDS.nielolSunrise])
      await t.q(`insert into public.favorites (user_id, experience_id) values ($1, $2)`, [
        IDS.explorerA,
        IDS.nielolSunrise,
      ])
      const mine = await t.one(`select * from public.get_experience($1, $2, $3)`, [
        IDS.nielolSunrise,
        PUCON.lat,
        PUCON.lng,
      ])
      assert.ok(mine.my_booking_id)
      assert.equal(mine.my_booking_seats, 2)
      assert.equal(mine.is_favorite, true)
      assert.ok(mine.distance_km > 50 && mine.distance_km < 120, `Temuco-Pucón distance ${mine.distance_km}`)

      // Another explorer does not see A's booking or favorite.
      await t.as(IDS.explorerB)
      const other = await t.one(`select * from public.get_experience($1)`, [IDS.nielolSunrise])
      assert.equal(other.my_booking_id, null)
      assert.equal(other.is_favorite, false)
    })
  })

  test('detail follows visibility rules: hidden, blocked and unknown plans return no row', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      assert.equal((await t.q(`select * from public.get_experience($1)`, [IDS.hiddenWorkshop])).length, 0)
      assert.equal(
        (await t.q(`select * from public.get_experience('00000000-0000-4000-8000-000000000000')`)).length,
        0,
      )
      await t.as(IDS.hostValentina)
      assert.equal((await t.q(`select * from public.get_experience($1)`, [IDS.hiddenWorkshop])).length, 1)

      await t.as(IDS.explorerA)
      await t.q(`insert into public.blocks (blocker_id, blocked_id) values ($1, $2)`, [
        IDS.explorerA,
        IDS.hostCamila,
      ])
      assert.equal((await t.q(`select * from public.get_experience($1)`, [IDS.nielolSunrise])).length, 0)
      await t.fails(
        `select * from public.get_experience($1, 100, 0)`,
        [IDS.ceramics],
        biz('invalid_location'),
      )
    })
  })

  test('places come with coordinates, nearest first, and filter by category', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      const all = await t.q(`select * from public.list_places()`)
      assert.equal(all.length, 8)
      assert.ok(all.every((p) => p.distance_km === null && typeof p.lat === 'number'))

      const fromPucon = await t.q(`select * from public.list_places($1, $2)`, [PUCON.lat, PUCON.lng])
      const distances = fromPucon.map((p) => p.distance_km)
      assert.deepEqual(
        distances,
        [...distances].sort((a, b) => a - b),
      )
      assert.ok(distances[0] < 30)

      const page1 = await t.q(`select id from public.list_places(null, null, null, 5, 0)`)
      const page2 = await t.q(`select id from public.list_places(null, null, null, 5, 5)`)
      assert.equal(page1.length + page2.length, 8)
      assert.equal(new Set([...page1, ...page2].map((r) => r.id)).size, 8)

      const nature = await t.q(`select category_id from public.list_places(null, null, $1::uuid[])`, [
        [IDS.catNature],
      ])
      assert.ok(nature.length > 0 && nature.every((p) => p.category_id === IDS.catNature))
      await t.fails(`select * from public.list_places(-100, 0)`, [], biz('invalid_location'))
    })
  })
})

// ---------------------------------------------------------------------------
describe('blocks', () => {
  test("blocked users don't see each other's plans and cannot join them (both directions)", async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      await t.q(`insert into public.blocks (blocker_id, blocked_id) values ($1, $2)`, [
        IDS.explorerA,
        IDS.hostCamila,
      ])
      const ids = await searchIds(t, 'p_limit => 100')
      assert.equal(ids.length, 15) // Camila has 5 upcoming published plans
      assert.ok(!ids.includes(IDS.nielolSunrise))
      await t.fails(`select public.join_experience($1, 1)`, [IDS.nielolSunrise], biz('experience_not_found'))

      // The blocked side doesn't see the blocker's plans either.
      await t.as(IDS.host)
      const plan = await t.one(newPlanSql, [IDS.host, '2099-01-10T15:00:00Z', 10])
      await t.q(`insert into public.blocks (blocker_id, blocked_id) values ($1, $2)`, [
        IDS.host,
        IDS.explorerB,
      ])
      await t.as(IDS.explorerB)
      assert.ok(!(await searchIds(t, 'p_limit => 100')).includes(plan.id))
    })
  })

  test('blocks are private to the blocker; cannot block yourself', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      await t.q(`insert into public.blocks (blocker_id, blocked_id) values ($1, $2)`, [
        IDS.explorerA,
        IDS.explorerB,
      ])
      await t.fails(`insert into public.blocks (blocker_id, blocked_id) values ($1, $1)`, [IDS.explorerA], {
        code: '23514',
      })
      await t.fails(
        `insert into public.blocks (blocker_id, blocked_id) values ($1, $2)`,
        [IDS.explorerB, IDS.explorerA],
        RLS_VIOLATION,
      )
      await t.as(IDS.explorerB)
      assert.equal((await t.q(`select * from public.blocks`)).length, 0)
    })
  })
})

// ---------------------------------------------------------------------------
describe('chat', () => {
  const openConversation = async (t) => {
    await t.as(IDS.explorerA)
    return t.one(`select * from public.get_or_create_conversation($1)`, [IDS.nielolSunrise])
  }

  test('explorer opens one conversation per plan with its host; host cannot chat with self', async () => {
    await tx(db, async (t) => {
      const c1 = await openConversation(t)
      const c2 = await openConversation(t)
      assert.equal(c1.id, c2.id)
      assert.equal(c1.host_id, IDS.hostCamila)
      assert.equal(c1.explorer_id, IDS.explorerA)
      await t.as(IDS.hostCamila)
      await t.fails(
        `select public.get_or_create_conversation($1)`,
        [IDS.nielolSunrise],
        biz('own_experience'),
      )
      await t.as(IDS.explorerA)
      await t.fails(
        `insert into public.conversations (experience_id, explorer_id, host_id) values ($1, $2, $3)`,
        [IDS.ceramics, IDS.explorerA, IDS.hostValentina],
        PERMISSION_DENIED,
      )
    })
  })

  test('only the two participants read and write messages; sender cannot be forged', async () => {
    await tx(db, async (t) => {
      const conv = await openConversation(t)
      await t.as(IDS.explorerA)
      await t.q(
        `insert into public.messages (conversation_id, sender_id, body) values ($1, $2, '  Hola!  ')`,
        [conv.id, IDS.explorerA],
      )
      await t.fails(
        `insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'fake')`,
        [conv.id, IDS.hostCamila],
        RLS_VIOLATION,
      )
      await t.fails(
        `insert into public.messages (conversation_id, sender_id, body) values ($1, $2, '   ')`,
        [conv.id, IDS.explorerA],
        { code: '23514' },
      )

      await t.as(IDS.hostCamila)
      const msgs = await t.q(`select body from public.messages where conversation_id = $1`, [conv.id])
      assert.deepEqual(msgs, [{ body: 'Hola!' }])
      await t.q(
        `insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'Bienvenida')`,
        [conv.id, IDS.hostCamila],
      )

      await t.as(IDS.explorerB)
      assert.equal(
        (await t.q(`select * from public.messages where conversation_id = $1`, [conv.id])).length,
        0,
      )
      assert.equal((await t.q(`select * from public.conversations where id = $1`, [conv.id])).length, 0)
      await t.fails(
        `insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'intruso')`,
        [conv.id, IDS.explorerB],
        RLS_VIOLATION,
      )
      await t.fails(`select public.mark_conversation_read($1)`, [conv.id], biz('conversation_not_found'))

      await t.as(IDS.explorerA)
      await t.fails(
        `update public.messages set body = 'editado' where conversation_id = $1`,
        [conv.id],
        PERMISSION_DENIED,
      )
    })
  })

  test('conversation list shows the other user, last message and unread count; mark as read', async () => {
    await tx(db, async (t) => {
      const conv = await openConversation(t)
      await t.as(IDS.explorerA)
      await t.q(`insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'Uno')`, [
        conv.id,
        IDS.explorerA,
      ])
      await t.q(`insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'Dos')`, [
        conv.id,
        IDS.explorerA,
      ])
      await t.as(IDS.hostCamila)
      let list = await t.q(`select * from public.list_my_conversations()`)
      assert.equal(list.length, 1)
      assert.equal(list[0].other_user_id, IDS.explorerA)
      assert.equal(list[0].other_full_name, 'Ana Explorer')
      assert.equal(list[0].unread_count, 2)
      assert.ok(['Uno', 'Dos'].includes(list[0].last_message_body))
      await t.q(`select public.mark_conversation_read($1)`, [conv.id])
      list = await t.q(`select * from public.list_my_conversations()`)
      assert.equal(list[0].unread_count, 0)

      await t.as(IDS.explorerA)
      list = await t.q(`select * from public.list_my_conversations()`)
      assert.equal(list[0].other_user_id, IDS.hostCamila)
      assert.equal(list[0].unread_count, 0)

      await t.as(null)
      const c = await t.one(`select last_message_at from public.conversations where id = $1`, [conv.id])
      assert.ok(c.last_message_at)
    })
  })

  test('a block hides the conversation and stops messages in both directions', async () => {
    await tx(db, async (t) => {
      const conv = await openConversation(t)
      await t.as(IDS.hostCamila)
      await t.q(`insert into public.blocks (blocker_id, blocked_id) values ($1, $2)`, [
        IDS.hostCamila,
        IDS.explorerA,
      ])
      await t.as(IDS.explorerA)
      assert.equal((await t.q(`select * from public.conversations where id = $1`, [conv.id])).length, 0)
      await t.fails(
        `insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'hola?')`,
        [conv.id, IDS.explorerA],
        RLS_VIOLATION,
      )
      await t.fails(`select public.get_or_create_conversation($1)`, [IDS.nielolSunrise], {
        code: 'P0001',
        message: /^(experience_not_found|blocked)$/,
      })
      await t.as(IDS.hostCamila)
      await t.fails(
        `insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'hola')`,
        [conv.id, IDS.hostCamila],
        RLS_VIOLATION,
      )
    })
  })
})

// ---------------------------------------------------------------------------
describe('favorites', () => {
  test('owner only; cannot favorite plans you cannot see; no duplicates', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      await t.q(`insert into public.favorites (user_id, experience_id) values ($1, $2)`, [
        IDS.explorerA,
        IDS.nielolSunrise,
      ])
      await t.fails(
        `insert into public.favorites (user_id, experience_id) values ($1, $2)`,
        [IDS.explorerA, IDS.nielolSunrise],
        { code: '23505' },
      )
      await t.fails(
        `insert into public.favorites (user_id, experience_id) values ($1, $2)`,
        [IDS.explorerA, IDS.hiddenWorkshop],
        RLS_VIOLATION,
      )
      await t.fails(
        `insert into public.favorites (user_id, experience_id) values ($1, $2)`,
        [IDS.explorerB, IDS.ceramics],
        RLS_VIOLATION,
      )
      await t.as(IDS.explorerB)
      assert.equal((await t.q(`select * from public.favorites`)).length, 0)
    })
  })
})

// ---------------------------------------------------------------------------
describe('reviews', () => {
  const bookPast = async (t, userId, experienceId) => {
    // Bookings on past plans can only exist from before the plan happened, so
    // create the fixture as the database owner.
    await t.as(null)
    await t.q(`insert into public.bookings (experience_id, user_id, seats) values ($1, $2, 1)`, [
      experienceId,
      userId,
    ])
    await t.q(`update public.experiences set seats_taken = seats_taken + 1 where id = $1`, [experienceId])
  }

  test('participants of a past plan can review once; average and count update', async () => {
    await tx(db, async (t) => {
      await bookPast(t, IDS.explorerA, IDS.pastNielol)
      await bookPast(t, IDS.explorerB, IDS.pastNielol)
      await t.as(IDS.explorerA)
      await t.q(
        `insert into public.reviews (experience_id, author_id, rating, comment) values ($1, $2, 5, 'Genial')`,
        [IDS.pastNielol, IDS.explorerA],
      )
      await t.fails(
        `insert into public.reviews (experience_id, author_id, rating) values ($1, $2, 4)`,
        [IDS.pastNielol, IDS.explorerA],
        { code: '23505' },
      )
      await t.as(IDS.explorerB)
      await t.q(`insert into public.reviews (experience_id, author_id, rating) values ($1, $2, 4)`, [
        IDS.pastNielol,
        IDS.explorerB,
      ])
      await t.as(null)
      const e = await t.one(`select rating_avg, rating_count from public.experiences where id = $1`, [
        IDS.pastNielol,
      ])
      assert.equal(Number(e.rating_avg), 4.5)
      assert.equal(e.rating_count, 2)
    })
  })

  test('no review without a booking, before the plan ends, or out of range', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      await t.fails(
        `insert into public.reviews (experience_id, author_id, rating) values ($1, $2, 5)`,
        [IDS.pastKayak, IDS.explorerA],
        RLS_VIOLATION,
      )
      await t.q(`select public.join_experience($1, 1)`, [IDS.nielolSunrise])
      await t.fails(
        `insert into public.reviews (experience_id, author_id, rating) values ($1, $2, 5)`,
        [IDS.nielolSunrise, IDS.explorerA],
        RLS_VIOLATION,
      )
      await bookPast(t, IDS.explorerA, IDS.pastKayak)
      await t.as(IDS.explorerA)
      await t.fails(
        `insert into public.reviews (experience_id, author_id, rating) values ($1, $2, 6)`,
        [IDS.pastKayak, IDS.explorerA],
        { code: '23514' },
      )
      await t.fails(
        `insert into public.reviews (experience_id, author_id, rating) values ($1, $2, 5)`,
        [IDS.pastKayak, IDS.explorerB],
        RLS_VIOLATION,
      )
    })
  })
})

// ---------------------------------------------------------------------------
describe('reports', () => {
  test('users create reports; only admins read and resolve them', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      await t.q(
        `insert into public.reports (reporter_id, target_type, target_id, reason, comment, status)
         values ($1, 'experience', $2, 'fraud', 'Precio engañoso', 'resolved')`,
        [IDS.explorerA, IDS.rafting],
      )
      await t.q(
        `insert into public.reports (reporter_id, target_type, target_id, reason) values ($1, 'profile', $2, 'spam')`,
        [IDS.explorerA, IDS.hostCamila],
      )
      assert.equal((await t.q(`select * from public.reports`)).length, 0)
      const upd = await t.q(`update public.reports set status = 'dismissed' returning id`)
      assert.equal(upd.length, 0)

      await t.as(IDS.admin)
      const rows = await t.q(
        `select target_type, reported_user_id, status from public.reports order by target_type`,
      )
      assert.deepEqual(rows, [
        { target_type: 'experience', reported_user_id: IDS.hostMatias, status: 'open' },
        { target_type: 'profile', reported_user_id: IDS.hostCamila, status: 'open' },
      ])
      const resolved = await t.q(
        `update public.reports set status = 'resolved', resolved_at = now(), resolved_by = $1 returning id`,
        [IDS.admin],
      )
      assert.equal(resolved.length, 2)
    })
  })

  test('conversation reports resolve the other participant; bad targets are rejected', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      const conv = await t.one(`select id from public.get_or_create_conversation($1)`, [IDS.nielolSunrise])
      await t.q(
        `insert into public.reports (reporter_id, target_type, target_id, reason) values ($1, 'conversation', $2, 'offensive')`,
        [IDS.explorerA, conv.id],
      )
      await t.fails(
        `insert into public.reports (reporter_id, target_type, target_id, reason) values ($1, 'profile', $1, 'spam')`,
        [IDS.explorerA],
        biz('cannot_report_self'),
      )
      await t.fails(
        `insert into public.reports (reporter_id, target_type, target_id, reason) values ($1, 'experience', $2, 'spam')`,
        [IDS.explorerA, 'e0000000-0000-4000-8000-0000000000ff'],
        biz('report_target_not_found'),
      )
      await t.as(IDS.explorerB)
      await t.fails(
        `insert into public.reports (reporter_id, target_type, target_id, reason) values ($1, 'conversation', $2, 'spam')`,
        [IDS.explorerB, conv.id],
        biz('report_target_not_found'),
      )
      await t.fails(
        `insert into public.reports (reporter_id, target_type, target_id, reason) values ($1, 'profile', $2, 'spam')`,
        [IDS.explorerA, IDS.hostCamila],
        RLS_VIOLATION,
      )
      await t.as(IDS.admin)
      const r = await t.one(`select reported_user_id from public.reports where target_type = 'conversation'`)
      assert.equal(r.reported_user_id, IDS.hostCamila)
    })
  })
})

// ---------------------------------------------------------------------------
describe('categories and places', () => {
  test('everyone reads active categories; only admins write and see inactive ones', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      assert.equal((await t.q(`select * from public.categories`)).length, 10)
      await t.fails(
        `insert into public.categories (name, icon, color) values ('Nueva', 'star-outline', '#112233')`,
        [],
        RLS_VIOLATION,
      )
      await t.as(IDS.admin)
      await t.q(
        `insert into public.categories (name, icon, color, sort_order) values ('Nueva', 'star-outline', '#112233', 11)`,
      )
      await t.q(`update public.categories set is_active = false where name = 'Aventura'`)
      assert.equal((await t.q(`select * from public.categories`)).length, 11)
      await t.as(IDS.explorerA)
      const names = (await t.q(`select name from public.categories order by sort_order`)).map((r) => r.name)
      assert.ok(names.includes('Nueva'))
      assert.ok(!names.includes('Aventura'))
    })
  })

  test('places are readable by all and writable by admins', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      assert.equal((await t.q(`select * from public.places`)).length, 8)
      await t.fails(
        `insert into public.places (name, location, comuna) values ('X', 'SRID=4326;POINT(-72.59 -38.73)', 'Temuco')`,
        [],
        RLS_VIOLATION,
      )
      await t.as(IDS.admin)
      await t.q(
        `insert into public.places (name, location, comuna, tags) values ('Laguna', 'SRID=4326;POINT(-72.59 -38.73)', 'Temuco', '{Lago}')`,
      )
    })
  })
})

// ---------------------------------------------------------------------------
describe('photos and storage', () => {
  test('max 8 photos per plan; the first by sort order is the cover', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.hostValentina)
      for (let i = 7; i >= 0; i--) {
        await t.q(
          `insert into public.experience_photos (experience_id, url, sort_order) values ($1, $2, $3)`,
          [IDS.ceramics, `https://cdn.test/p${i}.jpg`, i],
        )
      }
      await t.fails(
        `insert into public.experience_photos (experience_id, url, sort_order) values ($1, 'https://cdn.test/p9.jpg', 7)`,
        [IDS.ceramics],
        biz('too_many_photos'),
      )
      let e = await t.one(`select cover_url from public.experiences where id = $1`, [IDS.ceramics])
      assert.equal(e.cover_url, 'https://cdn.test/p0.jpg')
      await t.q(`delete from public.experience_photos where experience_id = $1 and sort_order = 0`, [
        IDS.ceramics,
      ])
      e = await t.one(`select cover_url from public.experiences where id = $1`, [IDS.ceramics])
      assert.equal(e.cover_url, 'https://cdn.test/p1.jpg')

      await t.as(IDS.explorerA)
      await t.fails(
        `insert into public.experience_photos (experience_id, url) values ($1, 'https://cdn.test/x.jpg')`,
        [IDS.nielolSunrise],
        RLS_VIOLATION,
      )
    })
  })

  test('storage: avatars in own folder; plan photos only for hosts; places only for admins', async () => {
    await tx(db, async (t) => {
      const put = (bucket, name) =>
        t.q(`insert into storage.objects (bucket_id, name) values ($1, $2)`, [bucket, name])
      const putFails = (bucket, name) =>
        t.fails(
          `insert into storage.objects (bucket_id, name) values ($1, $2)`,
          [bucket, name],
          RLS_VIOLATION,
        )

      await t.as(IDS.explorerA)
      await put('avatars', `${IDS.explorerA}/avatar.jpg`)
      await putFails('avatars', `${IDS.explorerB}/avatar.jpg`)
      await putFails('avatars', `avatar.jpg`)
      await putFails('experience-photos', `${IDS.explorerA}/plan/1.jpg`)
      await putFails('places', `place.jpg`)

      await t.as(IDS.host)
      await put('experience-photos', `${IDS.host}/plan/1.jpg`)
      await putFails('experience-photos', `${IDS.hostCamila}/plan/1.jpg`)

      await t.as(IDS.admin)
      await put('places', `place.jpg`)
    })
  })
})

// ---------------------------------------------------------------------------
describe('push tokens', () => {
  test('a device token moves to the last user who registered it', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      await t.q(`select public.register_push_token('ExponentPushToken[abc]', 'ios')`)
      assert.equal((await t.q(`select * from public.push_tokens`)).length, 1)
      await t.fails(
        `insert into public.push_tokens (user_id, token, platform) values ($1, 'x', 'ios')`,
        [IDS.explorerA],
        PERMISSION_DENIED,
      )
      await t.as(IDS.explorerB)
      await t.q(`select public.register_push_token('ExponentPushToken[abc]', 'android')`)
      assert.deepEqual(await t.q(`select user_id, platform from public.push_tokens`), [
        { user_id: IDS.explorerB, platform: 'android' },
      ])
      await t.as(IDS.explorerA)
      assert.equal((await t.q(`select * from public.push_tokens`)).length, 0)
    })
  })
})

// ---------------------------------------------------------------------------
describe('admin', () => {
  test('admin_list_users is admin-only and searches name and email', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      await t.fails(`select * from public.admin_list_users()`, [], biz('forbidden'))
      await t.as(IDS.admin)
      const byEmail = await t.q(`select id from public.admin_list_users('explorer.b@')`)
      assert.deepEqual(byEmail, [{ id: IDS.explorerB }])
      const byName = await t.q(`select id from public.admin_list_users('MATIAS')`)
      assert.deepEqual(byName, [{ id: IDS.hostMatias }])
    })
  })

  test('a suspended admin loses admin rights', async () => {
    await tx(db, async (t) => {
      await t.as(null)
      await t.q(`update public.profiles set is_suspended = true where id = $1`, [IDS.admin])
      await t.as(IDS.admin)
      await t.fails(`select * from public.admin_list_users()`, [], biz('forbidden'))
    })
  })
})

// ---------------------------------------------------------------------------
describe('suspension', () => {
  test('a suspended user cannot join, chat, publish, review or report', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      const conv = await t.one(`select id from public.get_or_create_conversation($1)`, [IDS.nielolSunrise])
      await t.as(null)
      await t.q(`update public.profiles set is_suspended = true where id in ($1, $2)`, [
        IDS.explorerA,
        IDS.host,
      ])

      await t.as(IDS.explorerA)
      await t.fails(`select public.join_experience($1, 1)`, [IDS.ceramics], biz('account_suspended'))
      await t.fails(`select public.get_or_create_conversation($1)`, [IDS.ceramics], biz('account_suspended'))
      await t.fails(
        `insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'hola')`,
        [conv.id, IDS.explorerA],
        RLS_VIOLATION,
      )
      await t.fails(
        `insert into public.reports (reporter_id, target_type, target_id, reason) values ($1, 'profile', $2, 'spam')`,
        [IDS.explorerA, IDS.hostCamila],
        RLS_VIOLATION,
      )
      await t.as(IDS.host)
      await t.fails(newPlanSql, [IDS.host, '2099-01-10T15:00:00Z', 10], RLS_VIOLATION)
    })
  })
})

// ---------------------------------------------------------------------------
describe('account deletion', () => {
  test('deleting an auth user cascades cleanly and releases booked seats', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.explorerA)
      await t.q(`select public.join_experience($1, 3)`, [IDS.ceramics])
      await t.q(`select public.get_or_create_conversation($1)`, [IDS.nielolSunrise])
      await t.q(`insert into public.favorites (user_id, experience_id) values ($1, $2)`, [
        IDS.explorerA,
        IDS.rafting,
      ])
      await t.q(
        `insert into public.reports (reporter_id, target_type, target_id, reason) values ($1, 'profile', $2, 'spam')`,
        [IDS.explorerA, IDS.hostCamila],
      )
      await t.as(null)
      await t.q(`delete from auth.users where id = $1`, [IDS.explorerA])
      assert.equal(await seatsMatchBookings(t, IDS.ceramics), 0)
      const leftovers = await t.one(
        `select (select count(*) from public.profiles where id = $1)::int as profiles,
                (select count(*) from public.bookings where user_id = $1)::int as bookings,
                (select count(*) from public.conversations where explorer_id = $1)::int as conversations,
                (select count(*) from public.favorites where user_id = $1)::int as favorites,
                (select count(*) from public.reports where reporter_id is null)::int as anonymised_reports`,
        [IDS.explorerA],
      )
      assert.deepEqual(leftovers, {
        profiles: 0,
        bookings: 0,
        conversations: 0,
        favorites: 0,
        anonymised_reports: 1,
      })

      // Deleting a host removes their plans (and those plans' bookings).
      await t.q(`delete from auth.users where id = $1`, [IDS.hostValentina])
      const plans = await t.one(`select count(*)::int as n from public.experiences where host_id = $1`, [
        IDS.hostValentina,
      ])
      assert.equal(plans.n, 0)
    })
  })
})

// ---------------------------------------------------------------------------
describe('list_my_experiences', () => {
  test('returns only the caller own plans, in any status, upcoming first then past', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.hostValentina)
      const rows = await t.q(`select * from public.list_my_experiences()`)
      assert.ok(rows.length > 0)
      assert.ok(rows.every((r) => r.host_id === IDS.hostValentina))
      // Hidden plans are listed for their host (but not for others).
      assert.ok(rows.some((r) => r.id === IDS.hiddenWorkshop && r.status === 'hidden'))
      assert.ok(rows.every((r) => typeof r.lat === 'number' && typeof r.lng === 'number'))

      const now = Date.now()
      const isPast = (r) => new Date(r.ends_at).getTime() < now
      const firstPast = rows.findIndex(isPast)
      if (firstPast !== -1) assert.ok(rows.slice(firstPast).every(isPast), 'past plans come last')
      const upcoming = rows.filter((r) => !isPast(r)).map((r) => new Date(r.starts_at).getTime())
      assert.deepEqual(
        upcoming,
        [...upcoming].sort((a, b) => a - b),
        'upcoming soonest first',
      )

      await t.as(IDS.explorerA)
      assert.equal((await t.q(`select * from public.list_my_experiences()`)).length, 0)
    })
  })

  test('requires a session and a valid page', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.hostCamila)
      await t.fails(`select * from public.list_my_experiences(0)`, [], biz('invalid_page'))
      await t.fails(`select * from public.list_my_experiences(10, -1)`, [], biz('invalid_page'))
      // as(null) = no auth.uid() (anon has no EXECUTE at all; see the security structure tests).
      await t.as(null)
      await t.fails(`select * from public.list_my_experiences()`, [], biz('not_authenticated'))
    })
  })

  test('a host can publish, edit, hide and cancel their own plan through the app columns', async () => {
    await tx(db, async (t) => {
      await t.as(IDS.host)
      const plan = await t.one(newPlanSql, [IDS.host, '2099-02-10T15:00:00Z', 10])
      await t.q(
        `insert into public.experience_photos (experience_id, url, sort_order) values ($1, 'https://x/a.jpg', 0), ($1, 'https://x/b.jpg', 1)`,
        [plan.id],
      )
      const edited = await t.one(
        `update public.experiences set title = 'Plan editado', capacity = 12, is_free = false, price_clp = 5000,
           location = 'SRID=4326;POINT(-71.95 -39.28)', comuna = 'Pucón'
         where id = $1 returning *`,
        [plan.id],
      )
      assert.equal(edited.title, 'Plan editado')
      const mine = await t.one(`select * from public.list_my_experiences() where id = $1`, [plan.id])
      assert.equal(mine.cover_url, 'https://x/a.jpg')
      assert.ok(Math.abs(mine.lat - PUCON.lat) < 0.05)

      await t.q(`update public.experiences set status = 'hidden' where id = $1`, [plan.id])
      await t.as(IDS.explorerA)
      assert.equal((await t.q(`select * from public.get_experience($1)`, [plan.id])).length, 0)

      await t.as(IDS.host)
      await t.q(`update public.experiences set status = 'cancelled' where id = $1`, [plan.id])
      await t.fails(
        `update public.experiences set status = 'published' where id = $1`,
        [plan.id],
        biz('experience_cancelled'),
      )
    })
  })
})
