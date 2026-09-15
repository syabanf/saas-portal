import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { AppAction, AppState } from '../packages/fixtures/src/index'

// Both Vite processes use one atomic, locked store. This endpoint is for local demos only.
const file = fileURLToPath(new URL('../.demo-state.json', import.meta.url))
const lock = `${file}.lock`
/** Longer than any single read-modify-write, short enough that a crash self-heals. */
const STALE_LOCK_MS = 5_000
type Snapshot = { revision: number; state: AppState; requests: string[] }
async function withStore(
  engine: {
    loadFixtures: () => AppState
    reducer: (state: AppState, action: AppAction) => AppState
  },
  update?: { id: string; action: AppAction },
): Promise<Snapshot> {
  const { loadFixtures, reducer } = engine
  let acquired = false
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      await mkdir(lock)
      acquired = true
      break
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      // A request killed mid-write leaves the lock behind, which would wedge the store for good.
      const held = await stat(lock).catch(() => null)
      if (held && Date.now() - held.mtimeMs > STALE_LOCK_MS) {
        await rm(lock, { recursive: true, force: true })
        continue
      }
      await new Promise((resolve) => setTimeout(resolve, 30))
    }
  }
  if (!acquired) throw new Error('Demo store busy. Retry your changes.')
  try {
    let snapshot: Snapshot
    try {
      snapshot = JSON.parse(await readFile(file, 'utf8'))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      snapshot = { revision: 0, state: loadFixtures(), requests: [] }
    }
    const advanced = reducer(snapshot.state, { type: 'store/tick' })
    if (advanced !== snapshot.state)
      snapshot = { ...snapshot, state: advanced, revision: snapshot.revision + 1 }
    if (update && !snapshot.requests.includes(update.id)) {
      snapshot = {
        revision: snapshot.revision + 1,
        state: reducer(snapshot.state, update.action),
        requests: [...snapshot.requests, update.id].slice(-5000),
      }
    }
    await writeFile(`${file}.tmp`, JSON.stringify(snapshot))
    await rename(`${file}.tmp`, file)
    return snapshot
  } finally {
    await rm(lock, { recursive: true, force: true })
  }
}
export function demoStatePlugin() {
  return {
    name: 'shared-demo-state',
    configureServer(server: {
      ssrLoadModule: (path: string) => Promise<any>
      middlewares: { use: (path: string, handler: (req: any, res: any) => void) => void }
    }) {
      server.middlewares.use('/__demo/state', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')
        try {
          if (req.method !== 'GET' && req.method !== 'POST') {
            res.statusCode = 405
            res.end('{}')
            return
          }
          if (
            req.method === 'POST' &&
            req.headers.origin &&
            req.headers.origin !== `http://${req.headers.host}` &&
            req.headers.origin !== `https://${req.headers.host}`
          ) {
            res.statusCode = 403
            res.end('{}')
            return
          }
          let update: { id: string; action: AppAction } | undefined
          if (req.method === 'POST') {
            let body = ''
            for await (const chunk of req) {
              body += chunk
              if (body.length > 10_000_000) throw new Error('Request too large')
            }
            update = JSON.parse(body)
            if (!update?.id || !update.action?.type) throw new Error('Invalid action')
          }
          const { state, revision } = await withStore(
            await server.ssrLoadModule(
              fileURLToPath(new URL('../packages/fixtures/src/index.ts', import.meta.url)),
            ),
            update,
          )
          res.end(JSON.stringify({ state, revision }))
        } catch (error) {
          res.statusCode = 503
          res.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : 'Demo store unavailable',
            }),
          )
        }
      })
    },
  }
}
