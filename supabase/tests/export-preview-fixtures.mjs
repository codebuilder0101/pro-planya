// Generates app/src/dev/preview-fixtures.json from the REAL migrations + seed (in PGlite),
// for the app's design-preview mode (EXPO_PUBLIC_DESIGN_PREVIEW=1, development only).
// Run: npm run preview:fixtures (root). No network, no Supabase project needed.
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDb, IDS, tx } from './harness.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, '..', '..', 'app', 'src', 'dev', 'preview-fixtures.json')

const db = await createDb()
let fixtures
await tx(db, async (t) => {
  await t.as(IDS.explorerA)
  const categories = await t.q(
    `select id, name, icon, color, sort_order from public.categories where is_active order by sort_order`,
  )
  const cards = await t.q(`select id from public.search_experiences(p_limit => 100)`)
  const experiences = []
  for (const { id } of cards) {
    experiences.push(await t.one(`select * from public.get_experience($1)`, [id]))
  }
  const places = await t.q(`select * from public.list_places(p_limit => 100)`)
  fixtures = { generatedAt: new Date().toISOString(), categories, experiences, places }
})
await db.close()

writeFileSync(out, JSON.stringify(fixtures, null, 2) + '\n')
console.log(
  `Wrote ${fixtures.experiences.length} plans, ${fixtures.places.length} places, ` +
    `${fixtures.categories.length} categories to ${out}`,
)
