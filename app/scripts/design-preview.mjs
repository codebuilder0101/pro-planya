// Starts the app in DESIGN PREVIEW mode (fake signed-in user + seed-based data, no Supabase needed).
// Usage: npm run preview            -> Expo dev server (open on web with "w", or in a dev build)
//        npm run preview -- --web   -> straight to the browser (390 pt wide window recommended)
//        npm run preview -- --host  -> signed in as a demo host ("Mis planes", publish and edit)
// See src/dev/design-preview.ts. Development only; never used by EAS builds.
import { spawn } from 'node:child_process'

const args = process.argv.slice(2)
const asHost = args.includes('--host')
const child = spawn('npx', ['expo', 'start', ...args.filter((a) => a !== '--host')], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    EXPO_PUBLIC_DESIGN_PREVIEW: '1',
    EXPO_PUBLIC_DESIGN_PREVIEW_ROLE: asHost ? 'host' : 'explorer',
  },
})
child.on('exit', (code) => process.exit(code ?? 0))
