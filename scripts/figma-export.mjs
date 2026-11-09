// Exports the client's Figma design reference into reference/figma/ (gitignored, confidential):
//   structure.json  pages and top-level frames (ids, names, sizes)
//   styles.json     published color / text / effect styles with resolved values
//   variables.json  local variables (only on plans that allow the Variables API)
//   frames/*.png    a 2x render of top-level frames (screens, design-system pages)
//
// The token is read from the root .env (FIGMA_TOKEN) and never printed.
// Create it in Figma: Settings > Security > Personal access tokens (scope: file_content:read).
// Run: npm run figma:export
//   FIGMA_PAGES="sprint 1 home,explore"  render only pages whose name contains one of these (default: all but icons)
//   FIGMA_REFRESH=1                      re-download structure/styles and re-render existing PNGs
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const FILE_KEY = process.env.FIGMA_FILE_KEY || 'CtMVRpd9MZSD7UxzOELPXC'
const TOKEN = process.env.FIGMA_TOKEN
const OUT = join(process.cwd(), 'reference', 'figma')
const MAX_FRAMES = Number(process.env.FIGMA_MAX_FRAMES ?? 80)
const REFRESH = process.env.FIGMA_REFRESH === '1'
const PAGE_FILTER = (process.env.FIGMA_PAGES ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)

if (!TOKEN) {
  console.error('Missing FIGMA_TOKEN in .env (Figma > Settings > Security > Personal access tokens).')
  process.exit(1)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function figma(path, attempt = 0) {
  const res = await fetch(`https://api.figma.com/v1${path}`, { headers: { 'X-Figma-Token': TOKEN } })
  if (res.status === 429 && attempt < 6) {
    const wait = Math.min(Math.max(Number(res.headers.get('retry-after')) || 30, 5), 180)
    console.log(`  rate limited, retrying in ${wait}s`)
    await sleep(wait * 1000)
    return figma(path, attempt + 1)
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const error = new Error(`Figma API ${res.status} on ${path.split('?')[0]}: ${body.slice(0, 200)}`)
    error.status = res.status
    throw error
  }
  return res.json()
}

const toHex = ({ r, g, b }) =>
  '#' +
  [r, g, b]
    .map((v) =>
      Math.round(v * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
    .toUpperCase()

const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 60)

await mkdir(join(OUT, 'frames'), { recursive: true })
const structurePath = join(OUT, 'structure.json')

// 1. Structure: pages + top-level frames (cached between runs).
let structure
if (!REFRESH && existsSync(structurePath)) {
  structure = JSON.parse(await readFile(structurePath, 'utf8'))
  console.log(`File "${structure.name}": ${structure.pages.length} pages (cached structure)`)
} else {
  const file = await figma(`/files/${FILE_KEY}?depth=2`)
  const pages = file.document.children.map((page) => ({
    id: page.id,
    name: page.name,
    frames: (page.children ?? [])
      .filter((n) => ['FRAME', 'COMPONENT', 'COMPONENT_SET', 'SECTION'].includes(n.type))
      .map((n) => ({
        id: n.id,
        name: n.name,
        type: n.type,
        width: n.absoluteBoundingBox?.width,
        height: n.absoluteBoundingBox?.height,
      })),
  }))
  structure = { name: file.name, lastModified: file.lastModified, pages, styles: file.styles ?? {} }
  await writeFile(structurePath, JSON.stringify(structure, null, 2))
  console.log(`File "${file.name}": ${pages.length} pages`)

  // 2. Styles with resolved values.
  const styleMeta = Object.entries(structure.styles)
  const resolved = []
  for (let i = 0; i < styleMeta.length; i += 100) {
    const chunk = styleMeta.slice(i, i + 100)
    const nodes = await figma(
      `/files/${FILE_KEY}/nodes?ids=${encodeURIComponent(chunk.map(([id]) => id).join(','))}`,
    )
    for (const [id, meta] of chunk) {
      const doc = nodes.nodes?.[id]?.document
      const entry = { id, name: meta.name, type: meta.styleType, description: meta.description }
      if (doc?.fills?.length) {
        entry.fills = doc.fills.map((f) =>
          f.type === 'SOLID'
            ? { type: 'SOLID', hex: toHex(f.color), opacity: f.opacity ?? f.color.a ?? 1 }
            : {
                type: f.type,
                stops: f.gradientStops?.map((s) => ({ hex: toHex(s.color), a: s.color.a, pos: s.position })),
              },
        )
      }
      if (doc?.style) {
        const s = doc.style
        entry.text = {
          fontFamily: s.fontFamily,
          fontWeight: s.fontWeight,
          fontSize: s.fontSize,
          lineHeightPx: s.lineHeightPx,
          letterSpacing: s.letterSpacing,
        }
      }
      if (doc?.effects?.length) {
        entry.effects = doc.effects.map((e) => ({
          type: e.type,
          radius: e.radius,
          offset: e.offset,
          spread: e.spread,
          color: e.color ? { hex: toHex(e.color), a: e.color.a } : undefined,
        }))
      }
      resolved.push(entry)
    }
  }
  await writeFile(join(OUT, 'styles.json'), JSON.stringify(resolved, null, 2))
  console.log(`Styles: ${resolved.length}`)

  // 3. Variables (design tokens). Requires a plan with Variables API access; skip otherwise.
  try {
    const vars = await figma(`/files/${FILE_KEY}/variables/local`)
    const { variables = {}, variableCollections = {} } = vars.meta ?? {}
    const out = Object.values(variables).map((v) => ({
      name: v.name,
      collection: variableCollections[v.variableCollectionId]?.name,
      type: v.resolvedType,
      values: Object.fromEntries(
        Object.entries(v.valuesByMode).map(([mode, val]) => [
          variableCollections[v.variableCollectionId]?.modes?.find((m) => m.modeId === mode)?.name ?? mode,
          val && typeof val === 'object' && 'r' in val ? { hex: toHex(val), a: val.a } : val,
        ]),
      ),
    }))
    await writeFile(join(OUT, 'variables.json'), JSON.stringify(out, null, 2))
    console.log(`Variables: ${out.length}`)
  } catch (e) {
    console.log(`Variables: not available (${e.status ?? 'error'}); styles + renders are enough.`)
  }
}

// 4. PNG renders of top-level frames (skips frames already exported unless FIGMA_REFRESH=1).
const wantPage = (name) =>
  PAGE_FILTER.length ? PAGE_FILTER.some((f) => name.toLowerCase().includes(f)) : !/icons/i.test(name)
const frameFile = (f) => `${slug(f.page)}__${slug(f.name)}__${f.id.replace(/[^0-9a-z]/gi, '-')}.png`
const frames = structure.pages
  .filter((p) => wantPage(p.name))
  .flatMap((p) => p.frames.map((f) => ({ ...f, page: p.name })))
  .filter((f) => REFRESH || !existsSync(join(OUT, 'frames', frameFile(f))))
  .slice(0, MAX_FRAMES)
console.log(`Rendering ${frames.length} frames`)

for (let i = 0; i < frames.length; i += 5) {
  const chunk = frames.slice(i, i + 5)
  const { images = {} } = await figma(
    `/images/${FILE_KEY}?ids=${encodeURIComponent(chunk.map((f) => f.id).join(','))}&format=png&scale=2`,
  )
  for (const f of chunk) {
    const url = images[f.id]
    if (!url) {
      console.log(`  skipped ${f.page} / ${f.name} (no render)`)
      continue
    }
    const png = Buffer.from(await (await fetch(url)).arrayBuffer())
    await writeFile(join(OUT, 'frames', frameFile(f)), png)
    console.log(`  rendered ${f.page} / ${f.name}`)
  }
  await sleep(2000)
}
console.log('Done. Output in reference/figma/ (gitignored; do not share).')
