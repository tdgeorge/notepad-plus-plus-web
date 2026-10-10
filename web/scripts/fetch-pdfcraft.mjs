// Builds the PdfCraft WebAssembly app from its upstream repo into public/pdfcraft/
// so the (large) build output is not committed here. Runs from `prebuild`.
//
// Env:
//   PDFCRAFT_REF   git tag/branch/commit to build (default: v0.4.0)
//   SKIP_PDFCRAFT  set to 1 to skip (the "Open PdfCraft Tab" menu item will 404)
import { execSync } from 'node:child_process'
import { existsSync, mkdtempSync, mkdirSync, cpSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir, homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = 'https://github.com/storytold/pdfcraft'
const REF = process.env.PDFCRAFT_REF || 'v0.4.0'
const TRUNK_VERSION = 'v0.21.14'
// musl build: Vercel's build image has an older glibc than the gnu release needs

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'pdfcraft')

if (process.env.SKIP_PDFCRAFT === '1') {
  console.log('[pdfcraft] SKIP_PDFCRAFT=1, skipping')
  process.exit(0)
}
if (existsSync(join(out, 'index.html'))) {
  console.log('[pdfcraft] public/pdfcraft already present, skipping')
  process.exit(0)
}

const cargoBin = join(homedir(), '.cargo', 'bin')
const env = { ...process.env, PATH: `${cargoBin}:${process.env.PATH}` }
const run = (cmd, cwd) => execSync(cmd, { stdio: 'inherit', cwd, env })
const has = (cmd) => { try { execSync(`command -v ${cmd}`, { stdio: 'ignore', env }); return true } catch { return false } }

const work = mkdtempSync(join(tmpdir(), 'pdfcraft-'))
try {
  if (!has('rustup')) {
    run('curl -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal')
  }
  // The build image may ship an older preinstalled rustc than PdfCraft's
  // dependencies need, so always install/update stable and force it.
  run('rustup toolchain install stable --profile minimal --target wasm32-unknown-unknown')
  env.RUSTUP_TOOLCHAIN = 'stable'
  run('rustc --version')
  if (!has('trunk')) {
    const bin = join(work, 'bin')
    mkdirSync(bin)
    run(`curl -sSfL https://github.com/trunk-rs/trunk/releases/download/${TRUNK_VERSION}/trunk-x86_64-unknown-linux-musl.tar.gz | tar -xz -C ${bin}`)
    env.PATH = `${bin}:${env.PATH}`
  }

  const src = join(work, 'src')
  mkdirSync(src)
  run('git init -q', src)
  run(`git fetch --depth 1 ${REPO} ${REF}`, src)
  run('git checkout -q FETCH_HEAD', src)

  const app = join(src, 'apps', 'pdfcraft-web')
  run('trunk build --release', app)

  const dist = join(src, 'dist', 'web')
  if (!readdirSync(dist).includes('index.html')) throw new Error('trunk produced no index.html')
  mkdirSync(out, { recursive: true })
  cpSync(dist, out, { recursive: true })
  for (const f of ['LICENSE-MIT', 'LICENSE-APACHE']) cpSync(join(src, f), join(out, f))
  console.log(`[pdfcraft] built ${REF} into public/pdfcraft`)
} finally {
  rmSync(work, { recursive: true, force: true })
}
