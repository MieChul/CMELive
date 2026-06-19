/**
 * Skip `vite build` when dist/ is already present (e.g. Azure zip deploy with pre-built assets).
 * Otherwise run `npm run build` (requires devDependencies).
 */
import { existsSync } from 'fs'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const root = join(dirname(fileURLToPath(new URL(import.meta.url))), '..')

if (existsSync(join(root, 'dist', 'index.html'))) {
  console.log('[postinstall] dist/index.html found — skipping Vite build.')
  process.exit(0)
}

console.log('[postinstall] dist missing — running npm run build (devDependencies required).')
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const r = spawnSync(npm, ['run', 'build'], {
  stdio: 'inherit',
  cwd: root,
  env: process.env,
  shell: true,
})
process.exit(r.status === null ? 1 : r.status)
